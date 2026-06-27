// POST /api/whatif — deliberate over an arbitrary, user-supplied proposal.
// Stateless: the council reasons over the request body and returns opinions + verdict
// (no store mutation, no seeded proposal required).
//
// - **Live mode** (ANTHROPIC_API_KEY set): the real Claude council (3 role agents + Arbiter),
//   grounded by the data layer and guard-railed by the deterministic baseline.
// - **Demo mode** (no key) or on live-call failure: the deterministic rules engine.

import { NextResponse } from "next/server";
import { evaluateProposal, type WhatIfInput } from "@/core/whatif";
import { llmConfigured } from "@/lib/anthropic";
import { runLlmCouncil } from "@/agents/llm";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<WhatIfInput>;

    const input: WhatIfInput = {
      title: typeof body.title === "string" ? body.title : "Untitled proposal",
      target: typeof body.target === "string" && body.target.trim() ? body.target.trim() : "unknown-account",
      entrypoint: typeof body.entrypoint === "string" && body.entrypoint.trim() ? body.entrypoint.trim() : "transfer",
      amountCspr: Number.isFinite(body.amountCspr) ? Number(body.amountCspr) : 0,
      rationale: typeof body.rationale === "string" ? body.rationale : "",
      targetDeploys: Number.isFinite(body.targetDeploys) ? Number(body.targetDeploys) : undefined,
    };

    if (llmConfigured()) {
      try {
        const { opinions, verdict, baseline } = await runLlmCouncil(input);
        return NextResponse.json({
          opinions,
          verdict,
          requestedAmountMotes: baseline.requestedAmountMotes,
          concentrationPct: baseline.concentrationPct,
          dangerousEntrypoint: baseline.dangerousEntrypoint,
          mode: "live",
        });
      } catch (err) {
        // Transient API failure — degrade to the deterministic engine rather than 500.
        console.error("Live council failed; using deterministic engine:", err);
      }
    }

    return NextResponse.json({ ...evaluateProposal(input), mode: "demo" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
