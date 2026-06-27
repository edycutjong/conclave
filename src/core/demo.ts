// Deterministic demo deliberation engine. Produces the exact fixture-specified verdicts
// for each proposal without requiring Anthropic keys, MCP server, or Testnet access.
// Every cited value maps to fixture data — the grounding verifier can diff them.

import { createHash } from "node:crypto";
import type {
  AgentOpinion,
  ArbiterVerdict,
  Proposal,
  Stance,
  ToolCall,
  Transcript,
} from "./types";
import { csprToMotes, motesToCspr } from "./types";
import { reconcile } from "./quorum";
import { transcriptHash } from "./transcript";

// ── Demo fixture constants ──────────────────────────────────────────────────

const TREASURY_BALANCE_MOTES = csprToMotes(66000);
const CHARTER_DISCRETIONARY_CAP_CSPR = 10000;
const CHARTER_CONCENTRATION_LIMIT_PCT = 25;

// ── Tool call factories ─────────────────────────────────────────────────────

let toolCallCounter = 0;

function makeTool(tool: string, args: Record<string, unknown>, result: unknown, citedValue?: string): ToolCall {
  return { id: `demo-tc-${++toolCallCounter}`, tool, args, result, citedValue };
}

function balanceTool(account: string, balanceMotes: string): ToolCall {
  return makeTool("GetAccountBalance", { account }, { balance: balanceMotes }, motesToCspr(balanceMotes).toLocaleString());
}

function accountInfoTool(account: string, age: number, deploys: number): ToolCall {
  return makeTool("GetAccountInfo", { account }, { age_days: age, total_deploys: deploys, active: deploys > 0 }, `${deploys} deploys, ${age}d old`);
}

function accountDeploysTool(account: string, deploys: number): ToolCall {
  return makeTool("GetAccountDeploys", { account }, { total: deploys, recent: [] }, `${deploys} deploys`);
}

// ── Per-proposal opinion generators ─────────────────────────────────────────

function opinionsForP1(): { opinions: AgentOpinion[]; capsMotes: string[] } {
  const opinions: AgentOpinion[] = [
    {
      role: "risk",
      stance: "APPROVE",
      summary: "Low risk — grantee-aurora is a charter-listed, 2-year-old account with active deploy history.",
      rationale: "Target account grantee-aurora has 847 deploys over a 2-year history. This is a known, audited integration partner listed in the charter under pre-approved recipients. No governance-integrity concerns with a standard transfer entrypoint. Risk assessment: LOW.",
      toolCalls: [
        accountInfoTool("grantee-aurora", 730, 847),
        accountDeploysTool("grantee-aurora", 847),
      ],
      flags: [],
    },
    {
      role: "treasury",
      stance: "APPROVE",
      summary: "500 CSPR is <1% of liquid runway — well within all charter limits.",
      rationale: "Treasury balance: 66,000 CSPR. Proposed 500 CSPR = 0.76% of liquid runway, far below the 25% concentration limit (§2). Post-transfer runway: 65,500 CSPR. This is a routine quarterly disbursement within the standing grant ceiling of 1,000 CSPR (charter grantees section).",
      toolCalls: [balanceTool("treasury", TREASURY_BALANCE_MOTES)],
      flags: [],
    },
    {
      role: "legal",
      stance: "APPROVE",
      summary: "Compliant — grantee-aurora is pre-approved, amount within quarterly cap, no charter violations.",
      rationale: "§1 Mandate: protocol growth disbursement ✓. §2 Concentration: 0.76% << 25% ✓. §3 Discretionary cap: 500 << 10,000 ✓. §4 Counterparty: grantee-aurora is charter-listed with 2-year history ✓. §5 Governance integrity: standard transfer, no mint/veto bypass ✓. Charter grantees: standing quarterly grant ≤ 1,000 CSPR ✓.",
      toolCalls: [],
      flags: [],
    },
  ];
  return { opinions, capsMotes: [] };
}

function opinionsForP2(): { opinions: AgentOpinion[]; capsMotes: string[] } {
  const opinions: AgentOpinion[] = [
    {
      role: "risk",
      stance: "FLAG",
      summary: "HIGH RISK — vendor-x is a fresh account with zero deploy history.",
      rationale: "Target account vendor-x has 0 deploys and was created recently (< 30 days). No prior interaction with the DAO treasury or any known protocol. Unknown counterparty represents significant counterparty risk. The proposal's rationale ('marketing partnership') provides no verifiable deliverables. Risk assessment: HIGH.",
      toolCalls: [
        accountInfoTool("vendor-x", 3, 0),
        accountDeploysTool("vendor-x", 0),
      ],
      flags: ["zero-history counterparty", "no verifiable deliverables"],
    },
    {
      role: "treasury",
      stance: "CAP",
      summary: "25,000 CSPR = 38% of liquid runway — exceeds §2 concentration limit. Recommend cap to charter maximum.",
      rationale: "Treasury balance: 66,000 CSPR. Proposed 25,000 CSPR = 37.88% of liquid runway, exceeding the 25% concentration limit (§2). This single action would move more than a quarter of all liquid reserves to an unproven counterparty. Recommended cap: 10,000 CSPR (§3 discretionary limit), reducing concentration to 15.15%.",
      toolCalls: [balanceTool("treasury", TREASURY_BALANCE_MOTES)],
      flags: ["concentration > 25%"],
    },
    {
      role: "legal",
      stance: "CAP",
      summary: "BREACH — exceeds §3 discretionary cap (10k), §2 concentration (25%), and §4 counterparty rule (<30d, 0 deploys).",
      rationale: "§2 Concentration limit: 25,000/66,000 = 37.88% > 25% ✗ BREACH. §3 Discretionary cap: 25,000 > 10,000 CSPR without second vote ✗ BREACH → may approve-with-condition down to 10,000. §4 Counterparty rule: vendor-x is < 30 days old with no deploy history ✗ BREACH — requires explicit review. Recommendation: cap to 10,000 CSPR per §3.",
      toolCalls: [],
      flags: ["§2 breach", "§3 breach", "§4 breach"],
    },
  ];
  return { opinions, capsMotes: [csprToMotes(CHARTER_DISCRETIONARY_CAP_CSPR)] };
}

function opinionsForP3(): { opinions: AgentOpinion[]; capsMotes: string[] } {
  const opinions: AgentOpinion[] = [
    {
      role: "risk",
      stance: "REJECT",
      summary: "CRITICAL — governance upgrade adding mint_to(self) is a self-mint grant, explicitly prohibited.",
      rationale: "The proposed upgrade adds a `mint_to(self)` entrypoint to the governance contract. This would grant the treasury (or any agent with execute access) the ability to mint tokens to itself — a textbook governance attack vector. The entrypoint name and the target 'governance-self' confirm this is a self-referential privilege escalation. The stated rationale ('routine governance upgrade to streamline treasury operations') is misleading — minting is not a treasury operation. Risk assessment: CRITICAL.",
      toolCalls: [
        makeTool("GetContractEntryPoints", { contract: "governance-self" }, { entrypoints: ["submit_proposal", "execute", "veto", "mint_to"] }, "mint_to found"),
      ],
      flags: ["self-mint grant", "governance-integrity violation", "misleading rationale"],
    },
    {
      role: "treasury",
      stance: "REJECT",
      summary: "Zero-amount upgrade, but the mint_to capability would destroy treasury integrity.",
      rationale: "While the proposal requests 0 CSPR directly, adding a mint_to(self) entrypoint would allow unlimited future minting — effectively making the treasury limitless and undermining all fiscal controls. This is not a routine upgrade. Treasury Agent concurs with rejection.",
      toolCalls: [balanceTool("treasury", TREASURY_BALANCE_MOTES)],
      flags: ["mint capability destroys fiscal controls"],
    },
    {
      role: "legal",
      stance: "REJECT",
      summary: "PROHIBITED — §5 explicitly bans self-mint grants, veto bypasses, and threshold removal.",
      rationale: "§5 Governance integrity: 'Proposals that alter governance to grant the treasury or any agent the ability to mint to itself, bypass the veto, or remove the threshold guard are prohibited and must be rejected.' This proposal directly violates §5 by adding `mint_to(self)`. No condition or cap can remediate a §5 violation — the charter mandates outright rejection.",
      toolCalls: [],
      flags: ["§5 violation — prohibited"],
    },
  ];
  return { opinions, capsMotes: [] };
}

// ── Main demo deliberation ──────────────────────────────────────────────────

export interface DemoDeliberationResult {
  opinions: AgentOpinion[];
  verdict: ArbiterVerdict;
  transcript: Transcript;
  transcriptHashHex: string;
}

/**
 * Run a deterministic demo deliberation for a proposal. The opinions and
 * verdict are hard-coded to match `data/fixtures/expected_verdicts.json`.
 */
export function demoDeliberate(proposal: Proposal): DemoDeliberationResult {
  // Reset tool call counter for deterministic IDs within a deliberation
  toolCallCounter = 0;

  let opinions: AgentOpinion[];
  let capsMotes: string[];

  switch (proposal.id) {
    case "P1": {
      const r = opinionsForP1();
      opinions = r.opinions;
      capsMotes = r.capsMotes;
      break;
    }
    case "P2": {
      const r = opinionsForP2();
      opinions = r.opinions;
      capsMotes = r.capsMotes;
      break;
    }
    case "P3": {
      const r = opinionsForP3();
      opinions = r.opinions;
      capsMotes = r.capsMotes;
      break;
    }
    default: {
      // Fallback: all agents approve with no flags
      opinions = (["risk", "treasury", "legal"] as const).map((role) => ({
        role,
        stance: "APPROVE" as Stance,
        summary: `No issues found for proposal ${proposal.id}.`,
        rationale: `Standard review passed. No charter violations detected.`,
        toolCalls: [balanceTool("treasury", TREASURY_BALANCE_MOTES)],
        flags: [],
      }));
      capsMotes = [];
    }
  }

  // Deterministic reconciliation (same logic as the real Arbiter's baseline)
  const baseline = reconcile(opinions, proposal.requestedAmountMotes, capsMotes);

  // Arbiter adds reasoning
  const verdict: ArbiterVerdict = {
    ...baseline,
    reasoning: arbiterReasoning(proposal.id, baseline.verdict, opinions),
  };

  const transcript: Transcript = {
    proposalId: proposal.id,
    opinions,
    verdict,
    model: { arbiter: "demo-mode", roles: "demo-mode" },
    createdAt: new Date().toISOString(),
  };

  return {
    opinions,
    verdict,
    transcript,
    transcriptHashHex: transcriptHash(transcript),
  };
}

function arbiterReasoning(proposalId: string, verdict: string, opinions: AgentOpinion[]): string {
  const allFlags = opinions.flatMap((o) => o.flags);
  switch (proposalId) {
    case "P1":
      return "All three agents concur: the proposal is a routine, charter-compliant quarterly disbursement to a pre-approved grantee well within all limits. No deviation from the deterministic baseline required. Full approval recommended.";
    case "P2":
      return `Counterparty unproven (0 deploys, < 30 days) + charter §3 discretionary cap exceeded + §2 concentration limit breached. The council caps the transfer to 10,000 CSPR — a funded pilot instead of a full commitment. Flags: ${allFlags.join(", ")}.`;
    case "P3":
      return `Unanimous rejection. The proposal violates charter §5 (governance integrity) by adding a self-mint entrypoint. This is explicitly prohibited — no condition or cap can remediate. Flags: ${allFlags.join(", ")}.`;
    default:
      return `Verdict: ${verdict}. Standard review — no deviations from the deterministic baseline.`;
  }
}

// ── Demo deploy hash ────────────────────────────────────────────────────────

/**
 * Generate a deterministic mock deploy hash for demo mode. Uses a sha256
 * of the proposal ID + a fixed salt so it's stable across runs.
 */
export function demoDeployHash(proposalId: string): string {
  return createHash("sha256")
    .update(`conclave-demo-deploy:${proposalId}:vouch-2026`)
    .digest("hex");
}

export function demoExplorerUrl(deployHash: string): string {
  return `https://testnet.cspr.live/deploy/${deployHash}`;
}

// ── Re-exported fixture constants for test verification ─────────────────────

export const DEMO_CONSTANTS = {
  treasuryBalanceMotes: TREASURY_BALANCE_MOTES,
  treasuryBalanceCspr: 66000,
  charterDiscretionaryCapCspr: CHARTER_DISCRETIONARY_CAP_CSPR,
  charterConcentrationLimitPct: CHARTER_CONCENTRATION_LIMIT_PCT,
} as const;
