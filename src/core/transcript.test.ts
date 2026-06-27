import { describe, it, expect } from "vitest";
import { canonicalize, transcriptHash } from "./transcript";
import type { Transcript } from "./types";

describe("canonicalize", () => {
  it("should sort object keys recursively", () => {
    const objA = { b: 2, a: 1, c: { y: 2, x: 1 } };
    const objB = { a: 1, b: 2, c: { x: 1, y: 2 } };
    expect(canonicalize(objA)).toBe(canonicalize(objB));
  });

  it("should handle arrays and primitives", () => {
    expect(canonicalize([2, 1])).toBe("[2,1]");
    expect(canonicalize("hello")).toBe('"hello"');
    expect(canonicalize(123)).toBe("123");
  });
});

describe("transcriptHash", () => {
  it("should hash a transcript to a 0x-prefixed sha256 hex string", () => {
    const transcript: Transcript = {
      proposalId: "p1",
      opinions: [
        { role: "risk", stance: "APPROVE", summary: "Low risk", rationale: "Low risk", toolCalls: [], flags: [] },
      ],
      verdict: {
        verdict: "APPROVE",
        confidenceBps: 8500,
        approvedAmountMotes: "1000",
        reasoning: "All approved",
      },
      model: { arbiter: "claude-opus", roles: "claude-haiku" },
      createdAt: "2026-06-24T12:00:00Z",
    };

    const hash = transcriptHash(transcript);
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
  });
});
