// The REAL multi-agent council — genuine Claude calls, not fixtures.
//
// Flow (perceive → reason → reconcile):
//   1. Derive grounded facts from the data layer (treasury balance, target history,
//      concentration, §5-dangerous entrypoint) — the agents may ONLY cite these.
//   2. Three role agents (Risk / Treasury / Legal) each make a real Claude (Haiku 4.5)
//      call and return a structured grounded opinion.
//   3. The deterministic reconcile() (quorum.ts) is computed as the baseline.
//   4. The Arbiter (Claude Opus 4.8, adaptive thinking) reconciles the opinions and may
//      deviate from the baseline only with written justification.
//
// Guardrails that keep the system honest and the demo bulletproof:
//   • The approved amount is computed deterministically from the final verdict and clamped
//     to the reconcile() baseline — the LLM can never approve more than the charter allows.
//   • A §5 (governance-integrity) violation is a hard, deterministic REJECT regardless of
//     what the model says — a prohibited entrypoint (mint/self-grant) can never be approved.

import type { AgentOpinion, AgentRole, ArbiterVerdict, Stance, Verdict } from "@/core/types";
import { csprToMotes, motesToCspr } from "@/core/types";
import { reconcile } from "@/core/quorum";
import {
  evaluateProposal,
  deriveFacts,
  CONCENTRATION_LIMIT_PCT,
  DISCRETIONARY_CAP_CSPR,
  TREASURY_BALANCE_CSPR,
  type WhatIfInput,
  type WhatIfResult,
} from "@/core/whatif";
import { config } from "@/lib/config";
import { structuredCall } from "@/lib/anthropic";
import { ARBITER_SYSTEM_PROMPT, ROLE_SYSTEM_PROMPTS } from "./roles";

// The DAO charter the whole council reasons against. Stable across every call, so it is
// sent as a cached system prefix (prompt caching) ahead of each role/Arbiter prompt.
const CHARTER = `DAO TREASURY CHARTER (binding):
§1 Mandate — funds serve protocol growth and operations.
§2 Concentration — no single action may move more than ${CONCENTRATION_LIMIT_PCT}% of the ${TREASURY_BALANCE_CSPR.toLocaleString()} CSPR liquid treasury.
§3 Discretionary cap — a single action above ${DISCRETIONARY_CAP_CSPR.toLocaleString()} CSPR must be capped to ${DISCRETIONARY_CAP_CSPR.toLocaleString()} CSPR (a funded pilot) absent a second vote.
§4 Counterparty — unknown counterparties (not charter-listed, thin deploy history) carry settlement risk and warrant a capped pilot.
§5 Governance integrity — proposals that grant minting, escalate privilege, bypass the veto, or remove the threshold guard are PROHIBITED and must be REJECTED. No cap or condition can remediate a §5 violation.`;

const ROLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    stance: { type: "string", enum: ["APPROVE", "CAP", "REJECT", "FLAG"] },
    summary: { type: "string" },
    rationale: { type: "string" },
    flags: { type: "array", items: { type: "string" } },
  },
  required: ["stance", "summary", "rationale", "flags"],
} as const;

const ARBITER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["APPROVE", "APPROVE_WITH_CONDITION", "REJECT"] },
    confidenceBps: { type: "integer" },
    reasoning: { type: "string" },
  },
  required: ["verdict", "confidenceBps", "reasoning"],
} as const;

interface RoleResponse {
  stance: Stance;
  summary: string;
  rationale: string;
  flags: string[];
}

interface ArbiterResponse {
  verdict: Verdict;
  confidenceBps: number;
  reasoning: string;
}

const ROLES: AgentRole[] = ["risk", "treasury", "legal"];

function bigMin(a: string, b: string): string {
  return (BigInt(a) < BigInt(b) ? BigInt(a) : BigInt(b)).toString();
}

/** Approved transfer is derived from the final verdict, never trusted to the LLM. */
function approvedMotesForVerdict(verdict: Verdict, requestedMotes: string, capMotes: string): string {
  if (verdict === "REJECT") return "0";
  if (verdict === "APPROVE_WITH_CONDITION") return bigMin(requestedMotes, capMotes);
  return requestedMotes;
}

/**
 * Run the real multi-agent council over a proposal. Returns the grounded opinions plus
 * the Arbiter's reconciled verdict, alongside the deterministic baseline used as the guardrail.
 */
export async function runLlmCouncil(input: WhatIfInput): Promise<{
  opinions: AgentOpinion[];
  verdict: ArbiterVerdict;
  baseline: WhatIfResult;
}> {
  // Deterministic baseline: supplies the grounded tool calls (cited on-chain reads) and the
  // rules-based verdict the Arbiter must justify deviating from.
  const baseline = evaluateProposal(input);
  const facts = deriveFacts(input);

  const grounded = {
    treasuryBalanceCspr: TREASURY_BALANCE_CSPR,
    requestedCspr: facts.amount,
    concentrationPct: facts.concentrationPct,
    concentrationLimitPct: CONCENTRATION_LIMIT_PCT,
    discretionaryCapCspr: DISCRETIONARY_CAP_CSPR,
    targetLabel: input.target,
    targetDeploys: facts.deploys,
    knownCounterparty: facts.knownCounterparty,
    entrypoint: input.entrypoint,
    dangerousEntrypoint: facts.dangerous,
  };

  // ── 1–2. Role agents (parallel, real Haiku calls) ─────────────────────────
  const opinions = await Promise.all(
    ROLES.map(async (role): Promise<AgentOpinion> => {
      const base = baseline.opinions.find((o) => o.role === role);
      const toolCalls = base?.toolCalls ?? [];
      const r = await structuredCall<RoleResponse>({
        model: config.roleModel,
        maxTokens: 900,
        system: [
          { text: CHARTER, cache: true },
          { text: ROLE_SYSTEM_PROMPTS[role] },
        ],
        user: `Proposal under review:
- Title: ${input.title}
- Target account: ${input.target}
- Entrypoint: ${input.entrypoint}
- Requested amount: ${facts.amount.toLocaleString()} CSPR
- Stated rationale: ${input.rationale || "(none provided)"}

Grounded on-chain reads — you may ONLY cite these numbers; never invent balances or history:
${JSON.stringify(grounded, null, 2)}

Tool results available to you:
${JSON.stringify(toolCalls.map((t) => ({ tool: t.tool, result: t.result })), null, 2)}

Apply your lens. Return your stance (APPROVE | CAP | REJECT | FLAG), a one-line summary, a rationale citing the exact charter sections and grounded numbers, and any flags.`,
        schema: ROLE_SCHEMA,
      });

      return {
        role,
        stance: r.stance,
        summary: r.summary,
        rationale: r.rationale,
        toolCalls,
        flags: Array.isArray(r.flags) ? r.flags : [],
      };
    }),
  );

  // ── 3. Deterministic reconciliation of the LLM opinions (the Arbiter's baseline) ──
  const caps = opinions.some((o) => o.stance === "CAP") ? [facts.capMotes] : [];
  const reconciled = reconcile(opinions, facts.requestedAmountMotes, caps);

  // ── 4. Arbiter (real Opus 4.8 call, adaptive thinking) ────────────────────
  const arb = await structuredCall<ArbiterResponse>({
    model: config.arbiterModel,
    maxTokens: 6000,
    thinking: true,
    system: [
      { text: CHARTER, cache: true },
      { text: ARBITER_SYSTEM_PROMPT },
    ],
    user: `The three role agents returned these grounded opinions:
${JSON.stringify(
  opinions.map((o) => ({ role: o.role, stance: o.stance, summary: o.summary, rationale: o.rationale, flags: o.flags })),
  null,
  2,
)}

Deterministic reconciliation baseline (justify any deviation):
- verdict: ${reconciled.verdict}
- approved amount: ${motesToCspr(reconciled.approvedAmountMotes).toLocaleString()} CSPR
- rule: REJECT if any agent REJECTs; APPROVE_WITH_CONDITION (capped to the §3 limit) if any agent CAPs; otherwise APPROVE.

Produce the final verdict, a calibrated confidence in basis points (0-10000), and concise reasoning. Never approve more than the agents supported.`,
    schema: ARBITER_SCHEMA,
  });

  // ── Guardrails ────────────────────────────────────────────────────────────
  // §5 is non-negotiable: a prohibited entrypoint is a hard, deterministic REJECT.
  const finalVerdict: Verdict = facts.dangerous ? "REJECT" : arb.verdict;

  // Approved amount is derived from the verdict and clamped to the baseline — the LLM
  // can never approve more than the deterministic rules allow.
  const approvedAmountMotes = bigMin(
    approvedMotesForVerdict(finalVerdict, facts.requestedAmountMotes, facts.capMotes),
    reconciled.approvedAmountMotes,
  );

  const confidenceBps = Math.max(0, Math.min(10000, Math.round(arb.confidenceBps)));

  const reasoning = facts.dangerous
    ? `${arb.reasoning} [Charter §5 enforced deterministically: entrypoint "${input.entrypoint}" is a prohibited governance-integrity action — REJECT cannot be overridden.]`
    : arb.reasoning;

  const verdict: ArbiterVerdict = {
    verdict: finalVerdict,
    confidenceBps,
    approvedAmountMotes,
    reasoning,
  };

  return { opinions, verdict, baseline };
}

/** Map a stored Proposal into the council input shape. */
export function proposalToWhatIf(p: {
  title: string;
  target: string;
  entrypoint: string;
  requestedAmountMotes: string;
  rationale: string;
}): WhatIfInput {
  return {
    title: p.title,
    target: p.target,
    entrypoint: p.entrypoint,
    amountCspr: motesToCspr(p.requestedAmountMotes),
    rationale: p.rationale,
  };
}

// Re-exported so callers can avoid importing csprToMotes separately.
export { csprToMotes };
