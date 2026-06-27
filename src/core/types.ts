// Conclave domain model — shared by the orchestrator, the API routes, and the UI.
// Mirrors the on-chain `Conclave` contract (see contract/src/conclave.rs).

export type ProposalStatus = "pending" | "decided" | "executed" | "vetoed";

/** On-chain status codes from the Odra contract (STATUS_* constants). */
export const STATUS_CODE: Record<ProposalStatus, number> = {
  pending: 0,
  decided: 1,
  executed: 2,
  vetoed: 3,
};

export type Verdict = "APPROVE" | "APPROVE_WITH_CONDITION" | "REJECT";

export type AgentRole = "risk" | "treasury" | "legal";

/** A single grounded tool call an agent made (what makes "no hallucinated numbers" verifiable). */
export interface ToolCall {
  id: string;
  /** MCP/CSPR.cloud tool name, e.g. "GetAccountBalance". */
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  /** The specific value the agent cited from this call (for the grounding verifier). */
  citedValue?: string;
}

export type Stance = "APPROVE" | "CAP" | "REJECT" | "FLAG";

/** One role-agent's grounded opinion in a deliberation. */
export interface AgentOpinion {
  role: AgentRole;
  stance: Stance;
  summary: string;
  rationale: string;
  toolCalls: ToolCall[];
  flags: string[];
}

/** The Arbiter's reconciled decision. */
export interface ArbiterVerdict {
  verdict: Verdict;
  /** Calibrated confidence in basis points (0..10000). */
  confidenceBps: number;
  /** Approved transfer in motes (U512 as a decimal string). 0 for REJECT. */
  approvedAmountMotes: string;
  reasoning: string;
}

export interface Proposal {
  /** Local uuid. */
  id: string;
  /** On-chain proposal id, once submitted. */
  onchainId?: number;
  title: string;
  /** Target account public key or contract hash. */
  target: string;
  entrypoint: string;
  argsHash: string;
  rationale: string;
  rationaleHash: string;
  /** Requested transfer in motes (U512 as a decimal string). */
  requestedAmountMotes: string;
  status: ProposalStatus;
  createdAt: string;
}

/** The full, hashable deliberation record. */
export interface Transcript {
  proposalId: string;
  opinions: AgentOpinion[];
  verdict: ArbiterVerdict;
  model: { arbiter: string; roles: string };
  createdAt: string;
}

export const CSPR_PER_MOTE = 1_000_000_000n;

export function csprToMotes(cspr: number | bigint): string {
  return (BigInt(cspr) * CSPR_PER_MOTE).toString();
}

export function motesToCspr(motes: string | bigint): number {
  return Number(BigInt(motes) / CSPR_PER_MOTE);
}

/** Lifecycle phases the Deliberation Chamber UI tracks. */
export type DeliberationPhase =
  | "idle"
  | "convening"       // role agents are running
  | "reconciling"     // arbiter is reconciling
  | "decided"         // verdict reached, awaiting approvals
  | "approving"       // quorum approval collection (off-chain) in progress
  | "veto_window"     // countdown before execution
  | "executing"       // transaction being signed + sent
  | "executed"        // deploy hash available
  | "vetoed";         // human killed it

export interface VetoState {
  /** ISO timestamp when the veto window opened. */
  windowOpensAt: string;
  /** ISO timestamp when the veto window closes (auto-execute). */
  windowClosesAt: string;
  /** Whether the human has pressed the veto button. */
  vetoed: boolean;
}

export interface ExecutionResult {
  deployHash: string;
  onchainId: number;
  /** cspr.live explorer link (resolves only when `simulated` is false). */
  explorerUrl: string;
  /**
   * True when the hash is a deterministic demo placeholder, NOT a broadcast Testnet tx.
   * The UI must never present a simulated hash as a confirmed on-chain transaction.
   */
  simulated: boolean;
}

/** Runtime wrapper: a proposal plus its live deliberation state. */
export interface ProposalWithState {
  proposal: Proposal;
  phase: DeliberationPhase;
  opinions: AgentOpinion[];
  verdict: ArbiterVerdict | null;
  transcript: Transcript | null;
  transcriptHashHex: string | null;
  approvals: { count: number; quorum: number; reached: boolean };
  veto: VetoState | null;
  execution: ExecutionResult | null;
}
