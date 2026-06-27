// "What-If" council reasoner — deterministic deliberation over an *arbitrary*,
// judge-supplied proposal (not just the seeded P1/P2/P3). Each role agent applies
// the same charter rules the demo fixtures encode, then the shared `reconcile()`
// produces the verdict. Pure + synchronous so the result is reproducible and the
// existing AgentColumn / ArbiterVerdict components render it unchanged.

import type { AgentOpinion, ArbiterVerdict, Stance, ToolCall } from "./types";
import { csprToMotes, motesToCspr } from "./types";
import { reconcile } from "./quorum";

// ── Charter constants (mirror core/demo.ts) ─────────────────────────────────

export const TREASURY_BALANCE_CSPR = 66000;
export const DISCRETIONARY_CAP_CSPR = 10000; // §3
export const CONCENTRATION_LIMIT_PCT = 25; // §2

/** Charter-listed, pre-approved counterparties (trusted regardless of history). */
const KNOWN_COUNTERPARTIES = new Set(["grantee-aurora", "grantee-borealis", "core-dev-multisig"]);

/** Entrypoints that touch governance integrity (§5) — prohibited. */
const DANGEROUS_ENTRYPOINT =
  /(?:^|[_-])(mint|set_threshold|remove_veto|disable_veto|bypass|set_admin|set_owner|grant_role|self_destruct|selfdestruct)/i;

export interface WhatIfInput {
  title: string;
  /** Target account label / public key. */
  target: string;
  /** Entrypoint to call, e.g. "transfer" or "mint_to". */
  entrypoint: string;
  /** Requested transfer in CSPR. */
  amountCspr: number;
  rationale: string;
  /** Known deploy count for the target (optional — drives counterparty risk). */
  targetDeploys?: number;
}

export interface WhatIfResult {
  opinions: AgentOpinion[];
  verdict: ArbiterVerdict;
  requestedAmountMotes: string;
  concentrationPct: number;
  dangerousEntrypoint: boolean;
}

let tcCounter = 0;
function tool(toolName: string, args: Record<string, unknown>, result: unknown, citedValue?: string): ToolCall {
  return { id: `whatif-tc-${++tcCounter}`, tool: toolName, args, result, citedValue };
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Grounded facts derived deterministically from a proposal — the shared input both the
 *  rule-based engine and the live LLM council reason over (so the LLM cites real numbers,
 *  never hallucinated balances). */
export interface ProposalFacts {
  amount: number;
  requestedAmountMotes: string;
  concentrationPct: number;
  dangerous: boolean;
  deploys: number;
  knownCounterparty: boolean;
  overConcentration: boolean;
  overDiscretionary: boolean;
  capMotes: string;
}

export function deriveFacts(input: WhatIfInput): ProposalFacts {
  const amount = Math.max(0, Math.floor(input.amountCspr || 0));
  const requestedAmountMotes = csprToMotes(amount);
  const concentrationPct = round((amount / TREASURY_BALANCE_CSPR) * 100);
  const dangerous = DANGEROUS_ENTRYPOINT.test(input.entrypoint.trim());
  const deploys = input.targetDeploys ?? 0;
  const knownCounterparty = KNOWN_COUNTERPARTIES.has(input.target.trim()) || deploys >= 50;
  return {
    amount,
    requestedAmountMotes,
    concentrationPct,
    dangerous,
    deploys,
    knownCounterparty,
    overConcentration: concentrationPct > CONCENTRATION_LIMIT_PCT,
    overDiscretionary: amount > DISCRETIONARY_CAP_CSPR,
    capMotes: csprToMotes(DISCRETIONARY_CAP_CSPR),
  };
}

/**
 * Run the deterministic council over an arbitrary proposal.
 * Outcomes mirror the seeded demo: clean transfer → APPROVE, oversized/unknown
 * counterparty → APPROVE_WITH_CONDITION (capped), governance self-grant → REJECT.
 */
export function evaluateProposal(input: WhatIfInput): WhatIfResult {
  tcCounter = 0;

  const {
    amount,
    requestedAmountMotes,
    concentrationPct,
    dangerous,
    deploys,
    knownCounterparty,
    overConcentration,
    overDiscretionary,
    capMotes,
  } = deriveFacts(input);

  // ── Risk agent ────────────────────────────────────────────────────────────
  let riskStance: Stance;
  let riskSummary: string;
  let riskRationale: string;
  const riskFlags: string[] = [];
  if (dangerous) {
    riskStance = "REJECT";
    riskSummary = `CRITICAL — entrypoint "${input.entrypoint}" alters governance integrity (self-grant / privilege escalation).`;
    riskRationale = `The entrypoint "${input.entrypoint}" matches a prohibited governance-integrity pattern (mint / threshold / veto / admin). Granting this to the treasury or any agent is a textbook privilege-escalation vector. Risk assessment: CRITICAL.`;
    riskFlags.push("governance-integrity violation", input.entrypoint);
  } else if (!knownCounterparty) {
    riskStance = "FLAG";
    riskSummary = `Elevated risk — ${input.target} is not charter-listed and has ${deploys} deploys.`;
    riskRationale = `Target ${input.target} is not in the charter's pre-approved counterparties and shows ${deploys} deploy(s) of history. Unknown counterparties carry settlement risk; recommend a capped pilot rather than full commitment. Risk assessment: ELEVATED.`;
    riskFlags.push("unverified counterparty");
  } else {
    riskStance = "APPROVE";
    riskSummary = `Low risk — ${input.target} is a known counterparty with ${deploys} deploys.`;
    riskRationale = `Target ${input.target} is charter-listed or has substantial deploy history (${deploys}). Standard "${input.entrypoint}" call with no governance-integrity concern. Risk assessment: LOW.`;
  }

  // ── Treasury agent ────────────────────────────────────────────────────────
  let treasuryStance: Stance;
  let treasurySummary: string;
  let treasuryRationale: string;
  const treasuryFlags: string[] = [];
  if (overDiscretionary || overConcentration) {
    treasuryStance = "CAP";
    treasurySummary = `${amount.toLocaleString()} CSPR = ${concentrationPct}% of runway — exceeds charter limits. Cap to ${DISCRETIONARY_CAP_CSPR.toLocaleString()} CSPR.`;
    treasuryRationale = `Treasury balance: ${TREASURY_BALANCE_CSPR.toLocaleString()} CSPR. Proposed ${amount.toLocaleString()} CSPR = ${concentrationPct}% of liquid runway.${
      overConcentration ? ` Exceeds the ${CONCENTRATION_LIMIT_PCT}% concentration limit (§2).` : ""
    }${overDiscretionary ? ` Exceeds the ${DISCRETIONARY_CAP_CSPR.toLocaleString()} CSPR discretionary cap (§3).` : ""} Recommended cap: ${DISCRETIONARY_CAP_CSPR.toLocaleString()} CSPR.`;
    if (overConcentration) treasuryFlags.push("concentration > 25%");
    if (overDiscretionary) treasuryFlags.push("§3 discretionary cap exceeded");
  } else {
    treasuryStance = "APPROVE";
    treasurySummary = `${amount.toLocaleString()} CSPR = ${concentrationPct}% of runway — within all charter limits.`;
    treasuryRationale = `Treasury balance: ${TREASURY_BALANCE_CSPR.toLocaleString()} CSPR. Proposed ${amount.toLocaleString()} CSPR = ${concentrationPct}% of liquid runway, within the ${CONCENTRATION_LIMIT_PCT}% concentration limit (§2) and ${DISCRETIONARY_CAP_CSPR.toLocaleString()} CSPR discretionary cap (§3). Post-transfer runway: ${(TREASURY_BALANCE_CSPR - amount).toLocaleString()} CSPR.`;
  }

  // ── Legal agent ───────────────────────────────────────────────────────────
  let legalStance: Stance;
  let legalSummary: string;
  let legalRationale: string;
  const legalFlags: string[] = [];
  if (dangerous) {
    legalStance = "REJECT";
    legalSummary = "PROHIBITED — §5 bans self-mint grants, veto bypasses, and threshold removal.";
    legalRationale = `§5 Governance integrity: proposals that grant minting, bypass the veto, or remove the threshold guard are prohibited and must be rejected. "${input.entrypoint}" violates §5 — no cap or condition can remediate.`;
    legalFlags.push("§5 violation — prohibited");
  } else if (overDiscretionary || overConcentration) {
    legalStance = "CAP";
    legalSummary = "Charter breach — §2 concentration and/or §3 discretionary cap. Approve-with-condition.";
    legalRationale = `§2 Concentration: ${concentrationPct}% vs ${CONCENTRATION_LIMIT_PCT}% limit${overConcentration ? " ✗" : " ✓"}. §3 Discretionary cap: ${amount.toLocaleString()} vs ${DISCRETIONARY_CAP_CSPR.toLocaleString()} CSPR${overDiscretionary ? " ✗" : " ✓"}. Remediation: cap to ${DISCRETIONARY_CAP_CSPR.toLocaleString()} CSPR per §3.`;
    if (overConcentration) legalFlags.push("§2 breach");
    if (overDiscretionary) legalFlags.push("§3 breach");
  } else {
    legalStance = "APPROVE";
    legalSummary = "Compliant — within concentration, discretionary cap, and governance-integrity rules.";
    legalRationale = `§1 Mandate ✓. §2 Concentration ${concentrationPct}% < ${CONCENTRATION_LIMIT_PCT}% ✓. §3 Discretionary ${amount.toLocaleString()} < ${DISCRETIONARY_CAP_CSPR.toLocaleString()} CSPR ✓. §5 Governance integrity: standard "${input.entrypoint}", no mint/veto bypass ✓.`;
  }

  const opinions: AgentOpinion[] = [
    {
      role: "risk",
      stance: riskStance,
      summary: riskSummary,
      rationale: riskRationale,
      toolCalls: dangerous
        ? [tool("GetContractEntryPoints", { contract: input.target }, { entrypoints: [input.entrypoint] }, `${input.entrypoint} found`)]
        : [tool("GetAccountInfo", { account: input.target }, { total_deploys: deploys, active: deploys > 0 }, `${deploys} deploys`)],
      flags: riskFlags,
    },
    {
      role: "treasury",
      stance: treasuryStance,
      summary: treasurySummary,
      rationale: treasuryRationale,
      toolCalls: [tool("GetAccountBalance", { account: "treasury" }, { balance: csprToMotes(TREASURY_BALANCE_CSPR) }, `${TREASURY_BALANCE_CSPR.toLocaleString()}`)],
      flags: treasuryFlags,
    },
    {
      role: "legal",
      stance: legalStance,
      summary: legalSummary,
      rationale: legalRationale,
      toolCalls: [],
      flags: legalFlags,
    },
  ];

  const caps = opinions.filter((o) => o.stance === "CAP").length > 0 ? [capMotes] : [];
  const baseline = reconcile(opinions, requestedAmountMotes, caps);

  const verdict: ArbiterVerdict = {
    ...baseline,
    reasoning: arbiterReasoning(baseline.verdict, motesToCspr(baseline.approvedAmountMotes), opinions, input),
  };

  return { opinions, verdict, requestedAmountMotes, concentrationPct, dangerousEntrypoint: dangerous };
}

function arbiterReasoning(
  verdict: string,
  approvedCspr: number,
  opinions: AgentOpinion[],
  input: WhatIfInput,
): string {
  const flags = opinions.flatMap((o) => o.flags);
  if (verdict === "REJECT") {
    return `Unanimous rejection. "${input.entrypoint}" on ${input.target} violates charter §5 (governance integrity) — no cap or condition can remediate. Flags: ${flags.join(", ")}.`;
  }
  if (verdict === "APPROVE_WITH_CONDITION") {
    return `The ask exceeds charter limits, so the council caps execution to ${approvedCspr.toLocaleString()} CSPR — a funded pilot instead of a full commitment. Flags: ${flags.join(", ") || "none"}.`;
  }
  return `All three agents concur: a charter-compliant ${input.entrypoint} to ${input.target} within every limit. Full approval of ${approvedCspr.toLocaleString()} CSPR recommended.`;
}
