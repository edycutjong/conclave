// Fund the Conclave treasury and complete the FULL governance lifecycle on-chain,
// including the final `execute` (capped treasury transfer) that run_lifecycle.ts skips.
//
//   deposit (payable, via Odra proxy_caller) → submit_proposal → record_verdict
//   → approve → execute (real CSPR moves from the contract treasury to the target)
//
// Why a proxy session: casper-js-sdk's ContractCallBuilder cannot attach CSPR to a
// contract call. Odra's own livenet env solves this with a session wasm
// (proxy_caller_with_return.wasm) that moves `amount` from the caller's main purse
// into a cargo purse and forwards it as the call's attached value. We replicate that
// exact ABI here (odra-casper-rpc-client 2.8.1, deploy_entrypoint_call_with_proxy):
//   package_hash: ByteArray32 · entry_point: String · args: Bytes (serialized
//   RuntimeArgs) · attached_value: U512 · amount: U512
// The wasm is vendored from the odra-casper-rpc-client crate resources.
//
//   export $(grep -v '^#' .env.local | xargs) && CONCLAVE_DEMO=false \
//     CASPER_CALL_PAYMENT_MOTES=20000000000 pnpm tsx scripts/fund_and_execute.ts
//
// Env knobs: CONCLAVE_DEPOSIT_CSPR (default 60), CONCLAVE_REQUEST_CSPR (default 100),
// CONCLAVE_APPROVE_CSPR (default 50), CONCLAVE_PROPOSAL_ID (default 1 — the id AFTER
// the first lifecycle's proposal 0), CONCLAVE_DEPOSIT_GAS_MOTES (default 40 CSPR).

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CLTypeUInt8, SessionBuilder } from "casper-js-sdk";
import {
  Args,
  CLValue,
  loadSignerKey,
  makeRpcClient,
  signerPublicKeyHex,
  submitProposalOnChain,
  recordVerdictOnChain,
  approveOnChain,
  executeOnChain,
  txExplorerUrl,
} from "../src/lib/casper";
import { config } from "../src/lib/config";
import { csprToMotes } from "../src/core/types";

const PROXY_WASM = "contract/wasm/proxy_caller_with_return.wasm";
const DEPOSIT_CSPR = Number(process.env.CONCLAVE_DEPOSIT_CSPR ?? 60);
const REQUEST_CSPR = Number(process.env.CONCLAVE_REQUEST_CSPR ?? 100);
const APPROVE_CSPR = Number(process.env.CONCLAVE_APPROVE_CSPR ?? 50);
const PROPOSAL_ID = Number(process.env.CONCLAVE_PROPOSAL_ID ?? 1);
const DEPOSIT_GAS = Number(process.env.CONCLAVE_DEPOSIT_GAS_MOTES ?? 40_000_000_000);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForTx(deployHash: string): Promise<void> {
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const res = await fetch(config.nodeRpc, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: config.csprCloudKey },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "info_get_transaction",
        params: { transaction_hash: { Version1: deployHash } },
      }),
    });
    const json = (await res.json()) as {
      result?: { execution_info?: { execution_result?: { Version2?: { error_message?: string | null } } } };
    };
    const er = json.result?.execution_info?.execution_result;
    if (er) {
      const err = er.Version2?.error_message;
      if (err) throw new Error(`tx ${deployHash} FAILED on-chain: ${err}`);
      return;
    }
    process.stdout.write(".");
  }
  throw new Error(`Timed out waiting for tx ${deployHash}`);
}

async function step(label: string, p: Promise<{ deployHash: string; explorerUrl: string }>): Promise<string> {
  process.stdout.write(`→ ${label} … submitting `);
  const { deployHash, explorerUrl } = await p;
  process.stdout.write(`broadcast, confirming `);
  await waitForTx(deployHash);
  console.log(`\n   ✅ ${deployHash}\n   ${explorerUrl}`);
  return deployHash;
}

/** Call the payable `deposit` entrypoint through Odra's proxy_caller session wasm. */
async function depositViaProxy(attachedMotes: string): Promise<{ deployHash: string; explorerUrl: string }> {
  const key = loadSignerKey();
  const wasm = new Uint8Array(readFileSync(PROXY_WASM));
  const pkgHex = config.contractHash.replace(/^hash-/, "");
  const pkgBytes = Uint8Array.from(Buffer.from(pkgHex, "hex"));
  if (pkgBytes.length !== 32) throw new Error(`Bad package hash: ${config.contractHash}`);

  // `args` = the serialized RuntimeArgs of the inner call. deposit() takes none,
  // and empty RuntimeArgs serialize to a lone u32 zero count → [0,0,0,0].
  const emptyRuntimeArgs = [0, 0, 0, 0].map((b) => CLValue.newCLUint8(b));

  const args = Args.fromMap({
    package_hash: CLValue.newCLByteArray(pkgBytes),
    entry_point: CLValue.newCLString("deposit"),
    args: CLValue.newCLList(CLTypeUInt8, emptyRuntimeArgs),
    attached_value: CLValue.newCLUInt512(attachedMotes),
    amount: CLValue.newCLUInt512(attachedMotes),
  });

  const tx = new SessionBuilder()
    .from(key.publicKey)
    .wasm(wasm)
    .runtimeArgs(args)
    .chainName(config.chainName)
    .payment(DEPOSIT_GAS)
    .build();
  tx.sign(key);

  const client = makeRpcClient();
  const res = await client.putTransaction(tx);
  const deployHash = res.transactionHash.toHex();
  return { deployHash, explorerUrl: txExplorerUrl(deployHash) };
}

async function main() {
  if (process.env.CONCLAVE_DEMO !== "false") {
    throw new Error("Set CONCLAVE_DEMO=false (and export .env.local) to broadcast real transactions.");
  }
  if (!config.contractHash) {
    throw new Error("CONCLAVE_CONTRACT_HASH not set — deploy first (pnpm deploy:rpc).");
  }

  const target = process.env.CONCLAVE_PROPOSAL_TARGET ?? signerPublicKeyHex();
  const h = (s: string) => `0x${createHash("sha256").update(s).digest("hex")}`;

  console.log(`Conclave treasury funding + full lifecycle (proposal id ${PROPOSAL_ID})`);
  console.log(`deposit ${DEPOSIT_CSPR} CSPR → request ${REQUEST_CSPR} → council caps at ${APPROVE_CSPR} → execute\n`);

  const hashes: Record<string, string> = {};

  hashes.deposit = await step(
    `deposit ${DEPOSIT_CSPR} CSPR into the treasury (proxy_caller)`,
    depositViaProxy(csprToMotes(DEPOSIT_CSPR)),
  );

  hashes.submit_proposal = await step(
    "submit_proposal",
    submitProposalOnChain({
      targetPublicKeyHex: target,
      entrypoint: "transfer",
      argsHash: h("ops-retainer:args"),
      rationaleHash: h("ops retainer rationale"),
      requestedAmountMotes: csprToMotes(REQUEST_CSPR),
    }),
  );

  hashes.record_verdict = await step(
    "record_verdict (council caps the amount)",
    recordVerdictOnChain({
      proposalId: PROPOSAL_ID,
      verdict: "APPROVE_WITH_CONDITION",
      confidenceBps: 7100,
      transcriptHash: h(`transcript:${PROPOSAL_ID}`),
      approvedAmountMotes: csprToMotes(APPROVE_CSPR),
    }),
  );

  hashes.approve = await step("approve", approveOnChain(PROPOSAL_ID));

  hashes.execute = await step("execute (treasury transfer)", executeOnChain(PROPOSAL_ID));

  console.log("\n──────────────────────────────────────────────");
  console.log(`✅ FULL lifecycle on-chain — proposal ${PROPOSAL_ID} executed:`);
  console.log(`   ${APPROVE_CSPR} CSPR moved from the contract treasury to ${target.slice(0, 16)}…`);
  for (const [k, v] of Object.entries(hashes)) console.log(`   ${k}: ${v}`);
  console.log("──────────────────────────────────────────────");
}

main().catch((e) => {
  console.error(`\n✗ ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
