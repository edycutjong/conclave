// RPC-based contract installer — deploys the Conclave Odra wasm to Casper Testnet
// WITHOUT Odra's livenet backend (which requires a node SSE /events stream that CSPR.cloud
// does not expose). Build + sign + submit via casper-js-sdk; poll the result and read the
// installed package hash via raw JSON-RPC (the CSPR.cloud node RPC works fine).
//
// Replicates Odra's install ABI exactly (odra-core host.rs try_deploy_with_cfg):
//   odra_cfg_is_upgradable=false, odra_cfg_is_upgrade=false, odra_cfg_allow_key_override=true,
//   odra_cfg_package_hash_key_name="Conclave_package_hash", + init args (quorum:u32, guardian:Key).
//
// Run:  pnpm deploy:rpc      (reads .env.local via the scripts' env; export it first:
//        export $(grep -v '^#' .env.local | xargs) && pnpm deploy:rpc )

import { readFileSync } from "node:fs";
import { Key, KeyTypeID, PublicKey, SessionBuilder } from "casper-js-sdk";
import {
  Args,
  CLValue,
  loadSignerKey,
  signerPublicKeyHex,
  makeRpcClient,
  txExplorerUrl,
} from "@/lib/casper";
import { config } from "@/lib/config";

const WASM_PATH = process.env.CONCLAVE_WASM_PATH ?? "contract/wasm/Conclave.wasm";
const PACKAGE_KEY_NAME = "Conclave_package_hash"; // odra-core: format!("{}_package_hash", ident)
const QUORUM = Number(process.env.CONCLAVE_QUORUM ?? 1);
// Gas limit in motes (limited pricing → you pay consumed gas up to this). 500 CSPR default.
const PAYMENT_MOTES = Number(process.env.CONCLAVE_INSTALL_MOTES ?? 500_000_000_000);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Raw JSON-RPC against the (auth-gated) CSPR.cloud node — used for polling + state reads. */
async function rpc(method: string, params: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(config.nodeRpc, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: config.csprCloudKey },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: Record<string, unknown>; error?: unknown };
  if (json.error) throw new Error(`RPC ${method} → ${JSON.stringify(json.error)}`);
  return json.result ?? {};
}

async function main() {
  if (config.contractHash) {
    console.warn(`⚠️  CONCLAVE_CONTRACT_HASH is already set (${config.contractHash}). Installing a fresh instance anyway.`);
  }
  const key = loadSignerKey();
  const pubHex = signerPublicKeyHex();
  const wasm = new Uint8Array(readFileSync(WASM_PATH));
  console.log(`Deployer : ${pubHex}`);
  console.log(`Wasm     : ${WASM_PATH} (${wasm.length} bytes)`);
  console.log(`Gas limit: ${PAYMENT_MOTES} motes (${PAYMENT_MOTES / 1e9} CSPR) · quorum=${QUORUM}\n`);

  // guardian = the deployer's own account (Key::Account), matching env.caller() in Odra.
  const guardian = Key.createByType(
    PublicKey.fromHex(pubHex).accountHash().toPrefixedString(),
    KeyTypeID.Account,
  );

  const args = Args.fromMap({
    odra_cfg_is_upgradable: CLValue.newCLValueBool(false),
    odra_cfg_is_upgrade: CLValue.newCLValueBool(false),
    odra_cfg_allow_key_override: CLValue.newCLValueBool(true),
    odra_cfg_package_hash_key_name: CLValue.newCLString(PACKAGE_KEY_NAME),
    quorum: CLValue.newCLUInt32(QUORUM),
    guardian: CLValue.newCLKey(guardian),
  });

  const tx = new SessionBuilder()
    .from(key.publicKey)
    .wasm(wasm)
    .installOrUpgrade()
    .runtimeArgs(args)
    .chainName(config.chainName)
    .payment(PAYMENT_MOTES)
    .build();
  tx.sign(key);

  const client = makeRpcClient();
  const res = await client.putTransaction(tx);
  const hash = res.transactionHash.toHex();
  console.log(`⛓  submitted install tx: ${hash}`);
  console.log(`   ${txExplorerUrl(hash)}\n   waiting for execution`);

  // ── Poll for the execution result (raw RPC; no SSE needed) ────────────────
  let execResult: Record<string, unknown> | undefined;
  for (let i = 0; i < 72; i++) {
    await sleep(5000);
    try {
      const r = await rpc("info_get_transaction", { transaction_hash: { Version1: hash } });
      const info = r.execution_info as { execution_result?: Record<string, unknown> } | null;
      if (info && info.execution_result) {
        execResult = info.execution_result;
        break;
      }
    } catch {
      /* transient — keep polling */
    }
    process.stdout.write(".");
  }
  process.stdout.write("\n");
  if (!execResult) throw new Error("Timed out waiting for the transaction to be processed (~6 min).");

  const v2 = (execResult.Version2 ?? execResult) as {
    error_message?: string | null;
    cost?: unknown;
    consumed?: unknown;
    effects?: Array<{ key?: string; kind?: unknown }>;
  };
  if (v2.error_message) {
    throw new Error(`Install FAILED on-chain: ${v2.error_message} (tx ${hash})`);
  }
  console.log(`✅ install executed on-chain. consumed=${v2.consumed ?? "?"} cost=${v2.cost ?? "?"}\n`);

  // ── Extract the package hash from the execution effects ───────────────────
  // Casper 2.0 (Condor) moved account named keys out of the entity, so the install's
  // package hash is read from the transform whose Write stored a ContractPackage.
  const writesPackage = (kind: unknown): boolean => {
    if (typeof kind !== "object" || kind === null) return false;
    const w = (kind as { Write?: unknown }).Write;
    if (typeof w === "string") return w === "ContractPackage";
    return typeof w === "object" && w !== null && "ContractPackage" in (w as object);
  };
  const packageHash = (v2.effects ?? []).find((t) => t.key?.startsWith("hash-") && writesPackage(t.kind))?.key;

  console.log("──────────────────────────────────────────────");
  console.log(`✅ Conclave deployed to Casper Testnet`);
  console.log(`   install tx : ${txExplorerUrl(hash)}`);
  if (packageHash) {
    console.log(`   package    : ${packageHash}`);
    console.log(`\n   → set in .env.local:  CONCLAVE_CONTRACT_HASH=${packageHash}`);
  } else {
    console.log(`   ⚠️  Install succeeded but no ContractPackage write found in effects.`);
    console.log(`   Inspect: ${txExplorerUrl(hash)}`);
  }
  console.log("──────────────────────────────────────────────");
}

main().catch((e) => {
  console.error(`\n✗ ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
