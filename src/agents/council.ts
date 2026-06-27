// The council orchestrator: run the three role agents (grounded by the data layer),
// then the Arbiter, into a hashable Transcript.
//
// - **Live mode** (ANTHROPIC_API_KEY set): real Claude calls — 3 role agents on Haiku 4.5
//   + an Arbiter on Opus 4.8, grounded by on-chain reads and guard-railed by the
//   deterministic reconcile() baseline. See agents/llm.ts.
// - **Demo mode** (no key): the deterministic demo engine, so keyless judges still see the
//   full consensus + veto pipeline. The live council also degrades to this if a call fails.

import type { AgentOpinion, ArbiterVerdict, Proposal, Transcript } from "@/core/types";
import { config } from "@/lib/config";
import { demoDeliberate, type DemoDeliberationResult } from "@/core/demo";
import { transcriptHash } from "@/core/transcript";
import { llmConfigured } from "@/lib/anthropic";
import { runLlmCouncil, proposalToWhatIf } from "./llm";
import type { McpClient } from "./tools/mcp";

export interface CouncilDeps {
  mcp: McpClient;
}

export interface DeliberationResult {
  opinions: AgentOpinion[];
  verdict: ArbiterVerdict;
  transcript: Transcript;
  transcriptHashHex: string;
}

function buildTranscript(
  proposalId: string,
  opinions: AgentOpinion[],
  verdict: ArbiterVerdict,
  model: { arbiter: string; roles: string },
): DeliberationResult {
  const transcript: Transcript = {
    proposalId,
    opinions,
    verdict,
    model,
    createdAt: new Date().toISOString(),
  };
  return { opinions, verdict, transcript, transcriptHashHex: transcriptHash(transcript) };
}

/**
 * Run a full deliberation for a proposal.
 *
 * - **Live mode** (ANTHROPIC_API_KEY set): the real Claude tool-calling council.
 * - **Demo mode** (no key) or on live-call failure: the deterministic demo engine.
 */
export async function deliberate(proposal: Proposal, _deps: CouncilDeps): Promise<DeliberationResult> {
  if (llmConfigured()) {
    try {
      const { opinions, verdict } = await runLlmCouncil(proposalToWhatIf(proposal));
      return buildTranscript(proposal.id, opinions, verdict, {
        arbiter: config.arbiterModel,
        roles: config.roleModel,
      });
    } catch (err) {
      // Never break the demo on a transient API error — fall back to deterministic.
      console.error("Live council failed; falling back to deterministic engine:", err);
    }
  }

  const result: DemoDeliberationResult = demoDeliberate(proposal);
  return {
    opinions: result.opinions,
    verdict: result.verdict,
    transcript: result.transcript,
    transcriptHashHex: result.transcriptHashHex,
  };
}
