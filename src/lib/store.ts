// In-memory proposal store — server-side singleton for the Next.js Route Handlers.
// Initialized from fixtures on first access. Tracks the full deliberation lifecycle.

import { deliberate } from "@/agents/council";
import { createMcpClient } from "@/agents/tools/mcp";
import { executeProposal } from "@/core/execute";
import { autoApproveToQuorum } from "@/core/multisig";
import type {
  ArbiterVerdict,
  AgentOpinion,
  DeliberationPhase,
  ExecutionResult,
  Proposal,
  ProposalWithState,
  Transcript,
  VetoState,
} from "@/core/types";
import { csprToMotes } from "@/core/types";
import { config } from "./config";
import { loadProposals, type SeedProposal } from "./fixtures";
import { createHash } from "node:crypto";

// ── Singleton store ─────────────────────────────────────────────────────────

interface StoreEntry {
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

const proposals = new Map<string, StoreEntry>();
let initialized = false;

function seedToProposal(seed: SeedProposal): Proposal {
  const rationaleHash = `0x${createHash("sha256").update(seed.rationale).digest("hex")}`;
  return {
    id: seed.id,
    title: seed.title,
    target: seed.targetRef,
    entrypoint: seed.entrypoint,
    argsHash: `0x${createHash("sha256").update(`${seed.entrypoint}:${seed.targetRef}`).digest("hex")}`,
    rationale: seed.rationale,
    rationaleHash,
    requestedAmountMotes: seed.requestedAmountMotes ?? csprToMotes(seed.requestedAmountCspr),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

function ensureInit(): void {
  if (initialized) return;
  const fixture = loadProposals();
  for (const seed of fixture.proposals) {
    const proposal = seedToProposal(seed);
    proposals.set(proposal.id, {
      proposal,
      phase: "idle",
      opinions: [],
      verdict: null,
      transcript: null,
      transcriptHashHex: null,
      approvals: { count: 0, quorum: config.quorum, reached: false },
      veto: null,
      execution: null,
    });
  }
  initialized = true;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function listProposals(): ProposalWithState[] {
  ensureInit();
  return Array.from(proposals.values());
}

export function getProposal(id: string): ProposalWithState | undefined {
  ensureInit();
  return proposals.get(id);
}

export function getTreasuryInfo(): { fundedCspr: number; fundedMotes: string } {
  const fixture = loadProposals();
  return { fundedCspr: fixture.treasury.fundedCspr, fundedMotes: fixture.treasury.fundedMotes };
}

/**
 * Run deliberation for a proposal. Advances through the full lifecycle:
 * convening → decided → approving → veto_window → (awaits veto/execute)
 */
export async function runDeliberation(id: string): Promise<ProposalWithState> {
  ensureInit();
  const entry = proposals.get(id);
  if (!entry) throw new Error(`Proposal ${id} not found`);
  if (entry.phase !== "idle") throw new Error(`Proposal ${id} already deliberated (phase: ${entry.phase})`);

  // Phase: convening
  entry.phase = "convening";

  const mcp = createMcpClient();
  const result = await deliberate(entry.proposal, { mcp });

  // Phase: decided
  entry.opinions = result.opinions;
  entry.verdict = result.verdict;
  entry.transcript = result.transcript;
  entry.transcriptHashHex = result.transcriptHashHex;
  entry.proposal.status = "decided";
  entry.phase = "decided";

  // If verdict is REJECT, stop here — no approvals, no execution
  if (result.verdict.verdict === "REJECT") {
    return entry;
  }

  // Phase: approving (auto-approve to quorum in demo mode)
  entry.phase = "approving";
  const approvalResult = await autoApproveToQuorum(mcp, Number(entry.proposal.onchainId ?? 0), config.quorum);
  entry.approvals = { count: approvalResult.approvals, quorum: approvalResult.quorum, reached: approvalResult.reached };

  // Phase: veto_window
  const now = new Date();
  const windowCloses = new Date(now.getTime() + config.vetoWindowSeconds * 1000);
  entry.veto = {
    windowOpensAt: now.toISOString(),
    windowClosesAt: windowCloses.toISOString(),
    vetoed: false,
  };
  entry.phase = "veto_window";

  return entry;
}

/**
 * Veto a proposal during the veto window.
 */
export function vetoProposal(id: string): ProposalWithState {
  ensureInit();
  const entry = proposals.get(id);
  if (!entry) throw new Error(`Proposal ${id} not found`);
  if (entry.phase === "executed") throw new Error(`Proposal ${id} already executed`);
  if (entry.phase === "vetoed") throw new Error(`Proposal ${id} already vetoed`);

  entry.phase = "vetoed";
  entry.proposal.status = "vetoed";
  if (entry.veto) {
    entry.veto.vetoed = true;
  } else {
    entry.veto = {
      windowOpensAt: new Date().toISOString(),
      windowClosesAt: new Date().toISOString(),
      vetoed: true,
    };
  }

  return entry;
}

/**
 * Execute a proposal after the veto window. Requires: decided, quorum reached, not vetoed.
 */
export async function executeProposalFromStore(id: string): Promise<ProposalWithState> {
  ensureInit();
  const entry = proposals.get(id);
  if (!entry) throw new Error(`Proposal ${id} not found`);
  if (entry.phase === "vetoed") throw new Error(`Proposal ${id} was vetoed`);
  if (entry.phase === "executed") throw new Error(`Proposal ${id} already executed`);
  if (!entry.verdict) throw new Error(`Proposal ${id} has no verdict`);
  if (entry.verdict.verdict === "REJECT") throw new Error(`Proposal ${id} was rejected — nothing to execute`);
  if (!entry.approvals.reached) throw new Error(`Proposal ${id} has not reached quorum`);

  entry.phase = "executing";

  const onchainId = Number(entry.proposal.onchainId ?? 0);
  const result = await executeProposal(entry.proposal.id, onchainId);

  entry.execution = result;
  entry.proposal.status = "executed";
  entry.phase = "executed";

  return entry;
}

/** Reset the store (for testing). */
export function resetStore(): void {
  proposals.clear();
  initialized = false;
}
