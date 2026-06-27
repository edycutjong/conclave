import { describe, it, expect } from "vitest";
import { reachesQuorum, reconcile, DEFAULT_QUORUM } from "./quorum";
import type { AgentOpinion } from "./types";

describe("quorum & reachesQuorum", () => {
  it("should check if quorum policy is reached correctly", () => {
    expect(reachesQuorum(0)).toBe(false);
    expect(reachesQuorum(1)).toBe(false);
    expect(reachesQuorum(2)).toBe(true);
    expect(reachesQuorum(3)).toBe(true);

    const customPolicy = { threshold: 3, totalAgents: 5 };
    expect(reachesQuorum(2, customPolicy)).toBe(false);
    expect(reachesQuorum(3, customPolicy)).toBe(true);
  });

  it("should use DEFAULT_QUORUM of 2 out of 3", () => {
    expect(DEFAULT_QUORUM).toEqual({ threshold: 2, totalAgents: 3 });
  });
});

describe("reconcile opinions", () => {
  it("should return REJECT stance when any agent opinions is REJECT", () => {
    const opinions: AgentOpinion[] = [
      { role: "risk", stance: "REJECT", summary: "Too risky", rationale: "Too risky", toolCalls: [], flags: [] },
      { role: "treasury", stance: "APPROVE", summary: "Budget ok", rationale: "Budget ok", toolCalls: [], flags: [] },
    ];
    const result = reconcile(opinions, "1000", []);
    expect(result.verdict).toBe("REJECT");
    expect(result.approvedAmountMotes).toBe("0");
    expect(result.confidenceBps).toBe(7500); // 6000 + 1 * 1500
  });

  it("should return APPROVE_WITH_CONDITION when CAP stance exists", () => {
    const opinions: AgentOpinion[] = [
      { role: "legal", stance: "CAP", summary: "Over threshold", rationale: "Over threshold", toolCalls: [], flags: [] },
      { role: "treasury", stance: "APPROVE", summary: "Budget ok", rationale: "Budget ok", toolCalls: [], flags: [] },
    ];
    const result = reconcile(opinions, "1000", ["500"]);
    expect(result.verdict).toBe("APPROVE_WITH_CONDITION");
    expect(result.approvedAmountMotes).toBe("500");
    expect(result.confidenceBps).toBe(6200);
  });

  it("should return APPROVE when all agents approve", () => {
    const opinions: AgentOpinion[] = [
      { role: "legal", stance: "APPROVE", summary: "Looks good", rationale: "Looks good", toolCalls: [], flags: [] },
      { role: "treasury", stance: "APPROVE", summary: "Budget ok", rationale: "Budget ok", toolCalls: [], flags: [] },
    ];
    const result = reconcile(opinions, "1000", []);
    expect(result.verdict).toBe("APPROVE");
    expect(result.approvedAmountMotes).toBe("1000");
    expect(result.confidenceBps).toBe(8500);
  });
});
