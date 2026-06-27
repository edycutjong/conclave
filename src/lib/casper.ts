// Real Casper Testnet chain layer (casper-js-sdk v5 / Condor).
// Server-only. Demo mode never imports this; it is reached only when
// CONCLAVE_DEMO === "false" and the relevant env is configured.
//
// API verified against node_modules/casper-js-sdk@5.0.12 .d.ts:
//   PrivateKey.fromPem(pem, KeyAlgorithm) · new RpcClient(new HttpHandler(url, "fetch"))
//   HttpHandler.setCustomHeaders({ Authorization }) · ContractCallBuilder(...).build()
//   tx.sign(key) · client.putTransaction(tx) → res.transactionHash.toHex()

import { readFileSync } from "node:fs";
import {
  Args,
  CLValue,
  ContractCallBuilder,
  HttpHandler,
  Key,
  KeyAlgorithm,
  KeyTypeID,
  PrivateKey,
  PublicKey,
  RpcClient,
} from "casper-js-sdk";
import { config } from "./config";

/** Default gas payment for a contract entry-point call (5 CSPR in motes). */
const DEFAULT_PAYMENT_MOTES = Number(process.env.CASPER_CALL_PAYMENT_MOTES ?? 5_000_000_000);

export function keyAlgorithm(): KeyAlgorithm {
  return (process.env.CASPER_KEY_ALGO ?? "ed25519").toLowerCase() === "secp256k1"
    ? KeyAlgorithm.SECP256K1
    : KeyAlgorithm.ED25519;
}

/** Load the orchestrator signing key from the configured PEM path. */
export function loadSignerKey(): PrivateKey {
  const pem = readFileSync(config.orchestratorKeyPath, "utf8");
  return PrivateKey.fromPem(pem, keyAlgorithm());
}

/** The orchestrator's public key (hex) — handy as a default self-target. */
export function signerPublicKeyHex(): string {
  return loadSignerKey().publicKey.toHex();
}

/** Build an RPC client pointed at the configured node, with CSPR.cloud auth if present. */
export function makeRpcClient(): RpcClient {
  const handler = new HttpHandler(config.nodeRpc, "fetch");
  if (config.csprCloudKey) handler.setCustomHeaders({ Authorization: config.csprCloudKey });
  return new RpcClient(handler);
}

/** Strip any address prefix so byHash() receives the raw 64-char contract hash. */
function bareHash(hash: string): string {
  return hash.replace(/^(hash-|contract-|entity-contract-)/, "");
}

export function txExplorerUrl(deployHash: string): string {
  return `https://testnet.cspr.live/transaction/${deployHash}`;
}

export interface ContractCallResult {
  deployHash: string;
  explorerUrl: string;
}

/**
 * Sign + broadcast a contract entry-point call against the configured contract.
 * Returns the real transaction hash once the node accepts it.
 */
export async function callContract(
  entryPoint: string,
  args: Args,
  opts: { contractHash?: string; paymentMotes?: number } = {},
): Promise<ContractCallResult> {
  const contractHash = opts.contractHash ?? config.contractHash;
  if (!contractHash) {
    throw new Error("Contract hash not set — deploy the contract and set CONCLAVE_CONTRACT_HASH.");
  }

  const key = loadSignerKey();
  // Odra deploys a contract PACKAGE; calls must target the package (latest version),
  // not an addressable-entity hash — byHash(package) is rejected as an invalid transaction.
  const tx = new ContractCallBuilder()
    .from(key.publicKey)
    .byPackageHash(bareHash(contractHash))
    .entryPoint(entryPoint)
    .runtimeArgs(args)
    .chainName(config.chainName)
    .payment(opts.paymentMotes ?? DEFAULT_PAYMENT_MOTES)
    .build();

  tx.sign(key);

  const client = makeRpcClient();
  const res = await client.putTransaction(tx);
  const deployHash = res.transactionHash.toHex();
  return { deployHash, explorerUrl: txExplorerUrl(deployHash) };
}

// ── Conclave contract lifecycle (mirrors contract/src/conclave.rs entrypoints) ──
//
// Order the contract enforces: submit_proposal → record_verdict → approve ×quorum → execute.
// Treasury funding (the payable `deposit`) is NOT here — casper-js-sdk's ContractCallBuilder
// has no attached-value method, so the treasury is funded at deploy time via the Odra
// livenet script (`with_tokens().deposit()`). See LIVE_TESTNET.md.

/** Build a CLValue Key for a target account from its public-key hex (the proposal `target`). */
function accountKey(publicKeyHex: string): Key {
  const accountHash = PublicKey.fromHex(publicKeyHex).accountHash().toPrefixedString();
  return Key.createByType(accountHash, KeyTypeID.Account);
}

/** submit_proposal(target, entrypoint, args_hash, rationale_hash, requested_amount) → u64 id. */
export async function submitProposalOnChain(input: {
  targetPublicKeyHex: string;
  entrypoint: string;
  argsHash: string;
  rationaleHash: string;
  requestedAmountMotes: string;
}): Promise<ContractCallResult> {
  return callContract(
    "submit_proposal",
    Args.fromMap({
      target: CLValue.newCLKey(accountKey(input.targetPublicKeyHex)),
      entrypoint: CLValue.newCLString(input.entrypoint),
      args_hash: CLValue.newCLString(input.argsHash),
      rationale_hash: CLValue.newCLString(input.rationaleHash),
      requested_amount: CLValue.newCLUInt512(input.requestedAmountMotes),
    }),
  );
}

/** record_verdict(proposal_id, verdict, confidence_bps, transcript_hash, approved_amount). Owner-only. */
export async function recordVerdictOnChain(input: {
  proposalId: number;
  verdict: string;
  confidenceBps: number;
  transcriptHash: string;
  approvedAmountMotes: string;
}): Promise<ContractCallResult> {
  return callContract(
    "record_verdict",
    Args.fromMap({
      proposal_id: CLValue.newCLUint64(input.proposalId),
      verdict: CLValue.newCLString(input.verdict),
      confidence_bps: CLValue.newCLUInt32(input.confidenceBps),
      transcript_hash: CLValue.newCLString(input.transcriptHash),
      approved_amount: CLValue.newCLUInt512(input.approvedAmountMotes),
    }),
  );
}

/** approve(proposal_id). One council signer's on-chain approval (idempotent per signer). */
export async function approveOnChain(proposalId: number): Promise<ContractCallResult> {
  return callContract("approve", Args.fromMap({ proposal_id: CLValue.newCLUint64(proposalId) }));
}

/** execute(proposal_id). Threshold-guarded capped transfer + Decided event. */
export async function executeOnChain(proposalId: number): Promise<ContractCallResult> {
  return callContract("execute", Args.fromMap({ proposal_id: CLValue.newCLUint64(proposalId) }));
}

// Re-export the arg builders so callers don't import casper-js-sdk directly.
export { Args, CLValue };
