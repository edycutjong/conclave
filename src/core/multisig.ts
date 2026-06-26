// Off-chain approval collection (PRIMARY PATH). After a verdict, the orchestrator
// collects council approvals in-memory. A single Executor agent submits the final
// transaction via casper-js-sdk (PEM key signing).
//
// ⚠️ MCP AwaitingDeploy (CreateAwaitingDeploy / AddAwaitingDeployApproval) is
//    access-restricted (HTTP 403) on free-tier CSPR.cloud API keys.
//    Confirmed by IntegrationTests.cs: GetAwaitingDeploy_AccessRestricted_Throws.
//    MCP multisig helpers are NOT used; on-chain quorum multisig lives in the
//    Odra contract (approve / threshold-guarded execute).

import type { McpClient } from "@/agents/tools/mcp";
import { isDemo } from "./execute";

export interface ApprovalState {
  onchainId: number;
  approvals: number;
  quorum: number;
  reached: boolean;
}

// ── Demo-mode in-memory approval store ──────────────────────────────────────

const demoApprovals = new Map<number, number>();

function demoState(onchainId: number, quorum: number): ApprovalState {
  const approvals = demoApprovals.get(onchainId) ?? 0;
  return { onchainId, approvals, quorum, reached: approvals >= quorum };
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Create the awaiting deploy + seed the first approval. */
export async function openMultisig(_mcp: McpClient, onchainId: number, quorum: number = 2): Promise<ApprovalState> {
  if (isDemo()) {
    demoApprovals.set(onchainId, 0);
    return demoState(onchainId, quorum);
  }
  throw new Error("Off-chain approval collection not wired yet — see BUILD_PLAN Day 3.");
}

/** Add one signer's approval and return the updated state. */
export async function addApproval(_mcp: McpClient, onchainId: number, quorum: number = 2): Promise<ApprovalState> {
  if (isDemo()) {
    const current = demoApprovals.get(onchainId) ?? 0;
    demoApprovals.set(onchainId, current + 1);
    return demoState(onchainId, quorum);
  }
  throw new Error("Off-chain approval collection not wired yet — see BUILD_PLAN Day 3.");
}

/** Get current approval state without modifying it. */
export function getApprovalState(onchainId: number, quorum: number = 2): ApprovalState {
  return demoState(onchainId, quorum);
}

/** Auto-approve to quorum in demo mode (for the demo flow). */
export async function autoApproveToQuorum(_mcp: McpClient, onchainId: number, quorum: number = 2): Promise<ApprovalState> {
  if (isDemo()) {
    demoApprovals.set(onchainId, quorum);
    return demoState(onchainId, quorum);
  }
  throw new Error("Off-chain approval collection not wired yet — see BUILD_PLAN Day 3.");
}

/** Reset demo state (for testing). */
export function resetDemoApprovals(): void {
  demoApprovals.clear();
}
