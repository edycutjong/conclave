// Full on-chain governance lifecycle against the deployed Conclave contract, over RPC.
//   submit_proposal → record_verdict → approve   [→ execute, opt-in]
// Each step is a real TransactionV1 broadcast via casper-js-sdk; the script then POLLS the
// node RPC until the tx is processed before the next step (no SSE needed — CSPR.cloud has no
// node event stream). Prints every deploy hash + cspr.live link.
//
//   export $(grep -v '^#' .env.local | xargs) && CONCLAVE_DEMO=false pnpm lifecycle
//
// Notes:
//  - On a freshly-deployed contract the first proposal id is 0 (override: CONCLAVE_PROPOSAL_ID).
//  - The proposal `target` must be a REAL account public key (default: the signer itself).
//  - `execute` transfers from the contract treasury, which the RPC install does NOT fund
//    (attaching CSPR to a contract purse needs Odra's payable proxy). It is therefore opt-in:
//    set CONCLAVE_RUN_EXECUTE=true once the treasury is funded.

import {
  submitProposalOnChain,
  recordVerdictOnChain,
  approveOnChain,
  executeOnChain,
  signerPublicKeyHex,
} from "../src/lib/casper";
import { config } from "../src/lib/config";
import { csprToMotes } from "../src/core/types";
import { createHash } from "node:crypto";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll the node RPC until the transaction is processed; throw on on-chain failure. */
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

async function step(label: string, p: Promise<{ deployHash: string; explorerUrl: string }>): Promise<void> {
  process.stdout.write(`→ ${label} … submitting `);
  const { deployHash, explorerUrl } = await p;
  process.stdout.write(`broadcast, confirming `);
  await waitForTx(deployHash);
  console.log(`\n   ✅ ${deployHash}\n   ${explorerUrl}`);
}

async function main() {
  if (process.env.CONCLAVE_DEMO !== "false") {
    throw new Error("Set CONCLAVE_DEMO=false (and export .env.local) to broadcast real transactions.");
  }
  if (!config.contractHash) {
    throw new Error("CONCLAVE_CONTRACT_HASH not set — deploy first (pnpm deploy:rpc).");
  }

  const target = process.env.CONCLAVE_PROPOSAL_TARGET ?? signerPublicKeyHex();
  const id = Number(process.env.CONCLAVE_PROPOSAL_ID ?? 0);
  const h = (s: string) => `0x${createHash("sha256").update(s).digest("hex")}`;

  // A P2-style "oversized → capped" proposal: requested 25,000 CSPR, council approves 10,000.
  const requestedCspr = 25_000;
  const approvedCspr = 10_000;

  console.log(`Conclave on-chain lifecycle (proposal id ${id}, target ${target.slice(0, 16)}…)\n`);

  await step(
    "submit_proposal",
    submitProposalOnChain({
      targetPublicKeyHex: target,
      entrypoint: "transfer",
      argsHash: h("transfer:args"),
      rationaleHash: h("marketing partnership rationale"),
      requestedAmountMotes: csprToMotes(requestedCspr),
    }),
  );

  await step(
    "record_verdict",
    recordVerdictOnChain({
      proposalId: id,
      verdict: "APPROVE_WITH_CONDITION",
      confidenceBps: 6200,
      transcriptHash: h(`transcript:${id}`),
      approvedAmountMotes: csprToMotes(approvedCspr),
    }),
  );

  await step("approve", approveOnChain(id));

  if (process.env.CONCLAVE_RUN_EXECUTE === "true") {
    await step("execute", executeOnChain(id));
    console.log(`\n✅ Lifecycle complete — proposal ${id} executed (capped ${approvedCspr} CSPR).`);
  } else {
    console.log(`\n✅ submit_proposal → record_verdict → approve are on-chain.`);
    console.log(`   execute skipped (needs a funded treasury). Set CONCLAVE_RUN_EXECUTE=true to run it.`);
  }
}

main().catch((e) => {
  console.error(`\n✗ ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
