import { describe, expect, it, vi } from "vitest";
import { runLlmCouncil, proposalToWhatIf } from "./llm";
import { structuredCall } from "@/lib/anthropic";
import { csprToMotes, type Proposal } from "@/core/types";

// Mock the structuredCall utility
vi.mock("@/lib/anthropic", () => {
  return {
    structuredCall: vi.fn(),
    llmConfigured: () => true,
  };
});

// Mock evaluateProposal to trigger fallback branches
vi.mock("@/core/whatif", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/core/whatif")>();
  return {
    ...original,
    evaluateProposal: (input: any) => {
      const res = original.evaluateProposal(input);
      if (input.title === "Test Mock WhatIf") {
        return {
          ...res,
          opinions: [
            {
              role: "risk",
              stance: "APPROVE",
              summary: "mocked risk summary",
              rationale: "mocked risk rationale",
              // toolCalls is omitted
            } as any
          ]
        };
      }
      return res;
    }
  };
});

function makeProposal(id: string, requestedCspr: number, entrypoint = "transfer"): Proposal {
  return {
    id,
    title: `Test proposal ${id}`,
    target: "test-target",
    entrypoint,
    argsHash: "0xdeadbeef",
    rationale: "test",
    rationaleHash: "0xfeed",
    requestedAmountMotes: csprToMotes(requestedCspr),
    status: "pending",
    createdAt: "2026-06-11T00:00:00.000Z",
  };
}

describe("llm (live council logic runner)", () => {
  it("runLlmCouncil executes structuredCalls and derives verdict", async () => {
    const mockStructuredCall = structuredCall as any;
    
    // We expect 3 role calls then 1 arbiter call.
    mockStructuredCall.mockResolvedValueOnce({
      stance: "APPROVE",
      summary: "Risk looks fine",
      rationale: "Rationale from Risk",
      flags: [],
    });
    mockStructuredCall.mockResolvedValueOnce({
      stance: "APPROVE",
      summary: "Treasury looks fine",
      rationale: "Rationale from Treasury",
      flags: [],
    });
    mockStructuredCall.mockResolvedValueOnce({
      stance: "APPROVE",
      summary: "Legal looks fine",
      rationale: "Rationale from Legal",
      flags: [],
    });
    mockStructuredCall.mockResolvedValueOnce({
      verdict: "APPROVE",
      confidenceBps: 9800,
      reasoning: "All agents approved.",
    });

    const proposal = makeProposal("P1", 500);
    const input = proposalToWhatIf(proposal);
    const result = await runLlmCouncil(input);

    expect(result.opinions).toHaveLength(3);
    expect(result.verdict.verdict).toBe("APPROVE");
    expect(result.verdict.confidenceBps).toBe(9800);
    expect(result.verdict.approvedAmountMotes).toBe(csprToMotes(500));
    expect(result.verdict.reasoning).toBe("All agents approved.");
  });

  it("runLlmCouncil enforces §5 governance integrity reject guardrail when entrypoint is dangerous", async () => {
    const mockStructuredCall = structuredCall as any;
    
    // Role calls
    mockStructuredCall.mockResolvedValueOnce({
      stance: "REJECT",
      summary: "Risk rejects",
      rationale: "Risk rejects due to privilege escalation",
      flags: ["DANGEROUS"],
    });
    mockStructuredCall.mockResolvedValueOnce({
      stance: "REJECT",
      summary: "Treasury rejects",
      rationale: "Treasury rejects",
      flags: [],
    });
    mockStructuredCall.mockResolvedValueOnce({
      stance: "REJECT",
      summary: "Legal rejects",
      rationale: "Legal rejects",
      flags: [],
    });
    mockStructuredCall.mockResolvedValueOnce({
      verdict: "APPROVE", // Arbiter tries to approve
      confidenceBps: 7000,
      reasoning: "Arbiter tries to override reject",
    });

    // "mint" entrypoint is registered as dangerous (§5 violation)
    const proposal = makeProposal("P1", 500, "mint");
    const input = proposalToWhatIf(proposal);
    const result = await runLlmCouncil(input);

    expect(result.verdict.verdict).toBe("REJECT");
    expect(result.verdict.approvedAmountMotes).toBe("0");
    expect(result.verdict.reasoning).toContain("prohibited governance-integrity action");
  });

  it("runLlmCouncil handles APPROVE_WITH_CONDITION when stance is CAP", async () => {
    const mockStructuredCall = structuredCall as any;
    
    // Role calls
    mockStructuredCall.mockResolvedValueOnce({
      stance: "CAP",
      summary: "Risk caps",
      rationale: "Limit risk exposure",
      flags: [],
    });
    mockStructuredCall.mockResolvedValueOnce({
      stance: "APPROVE",
      summary: "Treasury approves",
      rationale: "Treasury looks fine",
      flags: [],
    });
    mockStructuredCall.mockResolvedValueOnce({
      stance: "APPROVE",
      summary: "Legal approves",
      rationale: "Legal looks fine",
      flags: [],
    });
    mockStructuredCall.mockResolvedValueOnce({
      verdict: "APPROVE_WITH_CONDITION",
      confidenceBps: 8500,
      reasoning: "Approved with condition due to risk cap",
    });

    // 15,000 CSPR is above the discretionary cap (10,000 CSPR)
    const proposal = makeProposal("P3", 15000);
    const input = proposalToWhatIf(proposal);
    const result = await runLlmCouncil(input);

    expect(result.verdict.verdict).toBe("APPROVE_WITH_CONDITION");
    expect(result.verdict.approvedAmountMotes).toBe(csprToMotes(10000));
    expect(result.verdict.confidenceBps).toBe(8500);
  });

  it("runLlmCouncil handles Arbiter REJECT override to hit bigMin true branch", async () => {
    const mockStructuredCall = structuredCall as any;
    
    // Role calls
    mockStructuredCall.mockResolvedValueOnce({
      stance: "APPROVE",
      summary: "Risk approves",
      rationale: "Risk looks fine",
      flags: [],
    });
    mockStructuredCall.mockResolvedValueOnce({
      stance: "APPROVE",
      summary: "Treasury approves",
      rationale: "Treasury looks fine",
      flags: [],
    });
    mockStructuredCall.mockResolvedValueOnce({
      stance: "APPROVE",
      summary: "Legal approves",
      rationale: "Legal looks fine",
      flags: [],
    });
    mockStructuredCall.mockResolvedValueOnce({
      verdict: "REJECT", // Arbiter rejects a proposal that baseline would approve
      confidenceBps: 9000,
      reasoning: "Arbiter overrides and rejects proposal",
    });

    const proposal = makeProposal("P4", 500);
    const input = proposalToWhatIf(proposal);
    const result = await runLlmCouncil(input);

    expect(result.verdict.verdict).toBe("REJECT");
    expect(result.verdict.approvedAmountMotes).toBe("0");
  });

  it("runLlmCouncil triggers fallback branches when whatif returns incomplete opinions and role returns invalid flags", async () => {
    const mockStructuredCall = structuredCall as any;
    
    // Role calls
    mockStructuredCall.mockResolvedValueOnce({
      stance: "APPROVE",
      summary: "Risk approves with invalid flags type",
      rationale: "Risk looks fine",
      flags: "not-an-array", // will trigger Array.isArray(r.flags) fallback
    });
    mockStructuredCall.mockResolvedValueOnce({
      stance: "APPROVE",
      summary: "Treasury approves",
      rationale: "Treasury looks fine",
      flags: [],
    });
    mockStructuredCall.mockResolvedValueOnce({
      stance: "APPROVE",
      summary: "Legal approves",
      rationale: "Legal looks fine",
      flags: [],
    });
    mockStructuredCall.mockResolvedValueOnce({
      verdict: "APPROVE",
      confidenceBps: 9000,
      reasoning: "Approved.",
    });

    const proposal = makeProposal("P5", 500);
    proposal.title = "Test Mock WhatIf"; // this matches the title filter in our whatif mock
    proposal.rationale = "";
    const input = proposalToWhatIf(proposal);
    const result = await runLlmCouncil(input);

    expect(result.opinions[0].toolCalls).toEqual([]); // from missing toolCalls fallback
    expect(result.opinions[0].flags).toEqual([]); // from non-array flags fallback
    expect(result.opinions[1].toolCalls).toEqual([]); // from missing role opinion fallback
  });

  it("proposalToWhatIf correctly maps proposal fields", () => {
    const proposal = makeProposal("P2", 1500);
    const input = proposalToWhatIf(proposal);
    expect(input.title).toBe(proposal.title);
    expect(input.target).toBe(proposal.target);
    expect(input.entrypoint).toBe(proposal.entrypoint);
    expect(input.amountCspr).toBe(1500);
    expect(input.rationale).toBe(proposal.rationale);
  });
});
