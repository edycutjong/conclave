// Autonomous execution via casper-js-sdk (PEM key signing).
// The backend agent signs TransactionV1 payloads using a locally loaded Ed25519 key —
// NO browser wallet popup. This is the real tx-broadcast path that clears the hard gate.
// Calls the contract's `execute(proposal_id)` entrypoint, which performs the capped
// treasury transfer and emits the `Decided` event with the transcript hash.
//
// ⚠️ CSPR.click is an IDE skill (SKILL.md + llms.txt), NOT a runtime Node.js SDK.
//    It is used only for frontend/human-interactive flows (veto panel, manual override).
//    Backend agents must use casper-js-sdk directly with Keys.Ed25519.loadKeyPairFromPrivateFile().

import { config } from "@/lib/config";
import { demoDeployHash, demoExplorerUrl } from "./demo";
import type { ExecutionResult } from "./types";

export const isDemo = (): boolean => process.env.CONCLAVE_DEMO !== "false";

/**
 * Sign + send a `TransactionV1` calling Conclave.execute(onchainId).
 *
 * - **Demo mode** (default): returns a deterministic mock deploy hash.
 * - **Real mode**: uses the orchestrator key (config.orchestratorKeyPath) on casper-test.
 */
export async function executeProposal(proposalId: string, onchainId: number): Promise<ExecutionResult> {
  if (isDemo()) {
    // Demo placeholder — a deterministic hash, NOT broadcast on-chain. Flagged simulated so
    // the UI never renders it as a confirmed Testnet tx (no dead cspr.live link for judges).
    const deployHash = demoDeployHash(proposalId);
    return {
      deployHash,
      onchainId,
      explorerUrl: demoExplorerUrl(deployHash),
      simulated: true,
    };
  }

  // Real mode — requires contract deployed and casper-js-sdk wired
  if (!config.contractHash) {
    throw new Error("CONCLAVE_CONTRACT_HASH not set — deploy the contract first (see LIVE_TESTNET.md).");
  }

  // Sign + broadcast a real TransactionV1 calling Conclave.execute(proposal_id).
  // casper-js-sdk v5: ContractCallBuilder → sign(orchestrator key) → putTransaction.
  const { executeOnChain } = await import("@/lib/casper");
  const { deployHash, explorerUrl } = await executeOnChain(onchainId);

  return { deployHash, onchainId, explorerUrl, simulated: false };
}
