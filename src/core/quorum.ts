// Quorum + a deterministic verdict reconciler.
//
// The reconciler is the *sanity check* the LLM Arbiter must justify deviating from —
// it is pure and testable, so the demo verdicts are reproducible and the Arbiter can
// never silently invent an outcome the role agents didn't support.

import type { AgentOpinion, ArbiterVerdict, Verdict } from "./types";

export interface QuorumPolicy {
  /** Minimum on-chain approvals required before `execute` can fire. */
  threshold: number;
  /** Number of council signers participating. */
  totalAgents: number;
}

export const DEFAULT_QUORUM: QuorumPolicy = { threshold: 2, totalAgents: 3 };

export function reachesQuorum(approvals: number, policy: QuorumPolicy = DEFAULT_QUORUM): boolean {
  return approvals >= policy.threshold;
}

/**
 * Deterministic reconciliation of role opinions → a verdict skeleton.
 * - any REJECT stance  → REJECT (confidence scales with how many agents reject)
 * - any CAP stance     → APPROVE_WITH_CONDITION (approved = min of proposed CAP amounts)
 * - otherwise          → APPROVE
 *
 * `requestedAmountMotes` is the proposal's ask; `capAmountsMotes` are caps the agents
 * proposed (e.g. the Legal agent's charter cap). Returns the baseline the Arbiter
 * starts from; the LLM may only deviate *with a written justification*.
 */
export function reconcile(
  opinions: AgentOpinion[],
  requestedAmountMotes: string,
  capAmountsMotes: string[],
): Omit<ArbiterVerdict, "reasoning"> {
  const rejects = opinions.filter((o) => o.stance === "REJECT").length;
  const caps = opinions.filter((o) => o.stance === "CAP").length;

  let verdict: Verdict;
  let approved: bigint;
  let confidenceBps: number;

  if (rejects > 0) {
    verdict = "REJECT";
    approved = 0n;
    confidenceBps = Math.min(10000, 6000 + rejects * 1500);
  } else if (caps > 0) {
    verdict = "APPROVE_WITH_CONDITION";
    const requested = BigInt(requestedAmountMotes);
    const lowestCap = capAmountsMotes
      .map((m) => BigInt(m))
      .reduce((min, m) => (m < min ? m : min), requested);
    approved = lowestCap < requested ? lowestCap : requested;
    confidenceBps = 6200;
  } else {
    verdict = "APPROVE";
    approved = BigInt(requestedAmountMotes);
    confidenceBps = 8500;
  }

  return { verdict, confidenceBps, approvedAmountMotes: approved.toString() };
}
