import { describe, expect, it } from "vitest";
import { reachesQuorum, reconcile } from "./quorum";
import { canonicalize, transcriptHash } from "./transcript";
import { csprToMotes, type AgentOpinion, type Transcript } from "./types";

function opinion(role: AgentOpinion["role"], stance: AgentOpinion["stance"]): AgentOpinion {
  return { role, stance, summary: "", rationale: "", toolCalls: [], flags: [] };
}

describe("quorum", () => {
  it("reaches quorum at the threshold", () => {
    expect(reachesQuorum(1, { threshold: 2, totalAgents: 3 })).toBe(false);
    expect(reachesQuorum(2, { threshold: 2, totalAgents: 3 })).toBe(true);
    expect(reachesQuorum(3, { threshold: 2, totalAgents: 3 })).toBe(true);
  });

  it("reaches quorum with default policy parameter", () => {
    expect(reachesQuorum(1)).toBe(false);
    expect(reachesQuorum(2)).toBe(true);
    expect(reachesQuorum(3)).toBe(true);
  });
});

describe("reconcile (deterministic baseline)", () => {
  const requested = csprToMotes(25000);

  it("caps to the lowest proposed cap (P2 headline)", () => {
    const v = reconcile([opinion("treasury", "CAP"), opinion("legal", "CAP")], requested, [csprToMotes(10000)]);
    expect(v.verdict).toBe("APPROVE_WITH_CONDITION");
    expect(v.approvedAmountMotes).toBe(csprToMotes(10000));
  });

  it("rejects when any agent rejects (P3 attack)", () => {
    const v = reconcile([opinion("risk", "REJECT")], "0", []);
    expect(v.verdict).toBe("REJECT");
    expect(v.approvedAmountMotes).toBe("0");
    expect(v.confidenceBps).toBeGreaterThanOrEqual(7500);
  });

  it("approves the full amount when clean (P1)", () => {
    const clean = csprToMotes(500);
    const v = reconcile([opinion("treasury", "APPROVE"), opinion("legal", "APPROVE")], clean, []);
    expect(v.verdict).toBe("APPROVE");
    expect(v.approvedAmountMotes).toBe(clean);
  });

  it("never approves above the requested amount", () => {
    const v = reconcile([opinion("legal", "CAP")], csprToMotes(5000), [csprToMotes(10000)]);
    expect(BigInt(v.approvedAmountMotes)).toBeLessThanOrEqual(BigInt(csprToMotes(5000)));
  });
});

describe("transcript hashing", () => {
  const base: Transcript = {
    proposalId: "P2",
    opinions: [opinion("risk", "FLAG")],
    verdict: { verdict: "APPROVE_WITH_CONDITION", confidenceBps: 6200, approvedAmountMotes: csprToMotes(10000), reasoning: "x" },
    model: { arbiter: "claude-opus-4-8", roles: "claude-haiku-4-5" },
    createdAt: "2026-06-11T00:00:00.000Z",
  };

  it("is stable regardless of key order", () => {
    const reordered = { ...base, model: { roles: "claude-haiku-4-5", arbiter: "claude-opus-4-8" } } as Transcript;
    expect(canonicalize(base)).toBe(canonicalize(reordered));
    expect(transcriptHash(base)).toBe(transcriptHash(reordered));
  });

  it("produces a 0x-prefixed sha256", () => {
    expect(transcriptHash(base)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("changes when content changes", () => {
    const mutated = { ...base, proposalId: "P3" };
    expect(transcriptHash(mutated)).not.toBe(transcriptHash(base));
  });
});
