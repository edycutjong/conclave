import { describe, it, expect, vi } from "vitest";
import { evaluateProposal } from "./whatif";
import { motesToCspr } from "./types";
import * as quorum from "./quorum";


// The What-If reasoner must reproduce the seeded demo outcomes on arbitrary input:
// clean transfer → APPROVE, oversized/unknown → CAP, governance self-grant → REJECT.

describe("evaluateProposal", () => {
  it("APPROVES a small transfer to a charter-listed counterparty", () => {
    const r = evaluateProposal({
      title: "Quarterly grant",
      target: "grantee-aurora",
      entrypoint: "transfer",
      amountCspr: 500,
      rationale: "routine disbursement",
      targetDeploys: 847,
    });
    expect(r.verdict.verdict).toBe("APPROVE");
    expect(r.dangerousEntrypoint).toBe(false);
    expect(motesToCspr(r.verdict.approvedAmountMotes)).toBe(500);
    expect(r.opinions.every((o) => o.stance === "APPROVE")).toBe(true);
  });

  it("CAPS an oversized transfer to an unknown counterparty", () => {
    const r = evaluateProposal({
      title: "Marketing partnership",
      target: "vendor-x",
      entrypoint: "transfer",
      amountCspr: 25000,
      rationale: "marketing",
      targetDeploys: 0,
    });
    expect(r.verdict.verdict).toBe("APPROVE_WITH_CONDITION");
    expect(motesToCspr(r.verdict.approvedAmountMotes)).toBe(10000); // §3 cap
    expect(r.concentrationPct).toBeGreaterThan(25);
    expect(r.opinions.find((o) => o.role === "risk")!.stance).toBe("FLAG");
    expect(r.opinions.find((o) => o.role === "treasury")!.stance).toBe("CAP");
  });

  it("REJECTS a governance self-mint upgrade regardless of amount", () => {
    const r = evaluateProposal({
      title: "Routine governance upgrade",
      target: "governance-self",
      entrypoint: "mint_to",
      amountCspr: 0,
      rationale: "streamline treasury",
    });
    expect(r.verdict.verdict).toBe("REJECT");
    expect(r.dangerousEntrypoint).toBe(true);
    expect(motesToCspr(r.verdict.approvedAmountMotes)).toBe(0);
    expect(r.opinions.filter((o) => o.stance === "REJECT").length).toBeGreaterThanOrEqual(2);
  });

  it("catches dangerous entrypoints by pattern (set_threshold)", () => {
    const r = evaluateProposal({
      title: "Lower the bar",
      target: "governance-self",
      entrypoint: "set_threshold",
      amountCspr: 100,
      rationale: "convenience",
      targetDeploys: 999,
    });
    expect(r.verdict.verdict).toBe("REJECT");
  });

  it("is deterministic for identical input", () => {
    const input = {
      title: "x",
      target: "vendor-x",
      entrypoint: "transfer",
      amountCspr: 12000,
      rationale: "y",
      targetDeploys: 3,
    };
    expect(JSON.stringify(evaluateProposal(input))).toBe(JSON.stringify(evaluateProposal(input)));
  });

  it("covers overConcentration true / overDiscretionary false branches", () => {
    const originalRound = Math.round;
    Math.round = vi.fn().mockImplementation((n: number) => {
      if (n > 75 && n < 76) {
        return 3000;
      }
      return originalRound(n);
    });

    try {
      const r = evaluateProposal({
        title: "Test",
        target: "grantee-aurora",
        entrypoint: "transfer",
        amountCspr: 500,
        rationale: "test",
      });
      expect(r.concentrationPct).toBe(30);
      expect(r.verdict.verdict).toBe("APPROVE_WITH_CONDITION");
    } finally {
      Math.round = originalRound;
    }
  });

  it("covers CAP verdict with empty flags list", () => {
    const reconcileSpy = vi.spyOn(quorum, "reconcile").mockReturnValueOnce({
      verdict: "APPROVE_WITH_CONDITION",
      approvedAmountMotes: "100000000000000",
      confidenceBps: 6200,
    });

    try {
      const r = evaluateProposal({
        title: "Test small",
        target: "grantee-aurora",
        entrypoint: "transfer",
        amountCspr: 500,
        rationale: "test",
      });
      expect(r.verdict.reasoning).toContain("Flags: none.");
    } finally {
      reconcileSpy.mockRestore();
    }
  });
});

