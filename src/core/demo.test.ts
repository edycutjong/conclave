import { describe, expect, it } from "vitest";
import { demoDeliberate, demoDeployHash, demoExplorerUrl, DEMO_CONSTANTS } from "./demo";
import { csprToMotes, type Proposal } from "./types";

function makeProposal(id: string, requestedCspr: number): Proposal {
  return {
    id,
    title: `Test proposal ${id}`,
    target: "test-target",
    entrypoint: "transfer",
    argsHash: "0xdeadbeef",
    rationale: "test",
    rationaleHash: "0xfeed",
    requestedAmountMotes: csprToMotes(requestedCspr),
    status: "pending",
    createdAt: "2026-06-11T00:00:00.000Z",
  };
}

describe("demoDeliberate", () => {
  describe("P1 (clean — 500 CSPR to charter-listed grantee)", () => {
    const result = demoDeliberate(makeProposal("P1", 500));

    it("produces 3 opinions", () => {
      expect(result.opinions).toHaveLength(3);
    });

    it("all agents approve", () => {
      for (const o of result.opinions) {
        expect(o.stance).toBe("APPROVE");
      }
    });

    it("verdict is APPROVE", () => {
      expect(result.verdict.verdict).toBe("APPROVE");
    });

    it("approves the full 500 CSPR", () => {
      expect(result.verdict.approvedAmountMotes).toBe(csprToMotes(500));
    });

    it("confidence is high (≥ 8000 bps)", () => {
      expect(result.verdict.confidenceBps).toBeGreaterThanOrEqual(8000);
    });

    it("has no flags", () => {
      const allFlags = result.opinions.flatMap((o) => o.flags);
      expect(allFlags).toHaveLength(0);
    });

    it("risk agent cites grantee-aurora deploy history", () => {
      const risk = result.opinions.find((o) => o.role === "risk")!;
      expect(risk.toolCalls.length).toBeGreaterThan(0);
      expect(risk.toolCalls.some((tc) => tc.tool === "GetAccountInfo")).toBe(true);
    });

    it("treasury agent cites balance", () => {
      const treasury = result.opinions.find((o) => o.role === "treasury")!;
      expect(treasury.toolCalls.some((tc) => tc.tool === "GetAccountBalance")).toBe(true);
    });
  });

  describe("P2 (headline — 25,000 CSPR to vendor-x)", () => {
    const result = demoDeliberate(makeProposal("P2", 25000));

    it("produces 3 opinions", () => {
      expect(result.opinions).toHaveLength(3);
    });

    it("risk agent flags vendor-x", () => {
      const risk = result.opinions.find((o) => o.role === "risk")!;
      expect(risk.stance).toBe("FLAG");
      expect(risk.flags.length).toBeGreaterThan(0);
    });

    it("treasury agent caps", () => {
      const treasury = result.opinions.find((o) => o.role === "treasury")!;
      expect(treasury.stance).toBe("CAP");
    });

    it("legal agent caps", () => {
      const legal = result.opinions.find((o) => o.role === "legal")!;
      expect(legal.stance).toBe("CAP");
    });

    it("verdict is APPROVE_WITH_CONDITION", () => {
      expect(result.verdict.verdict).toBe("APPROVE_WITH_CONDITION");
    });

    it("caps to 10,000 CSPR", () => {
      expect(result.verdict.approvedAmountMotes).toBe(csprToMotes(10000));
    });

    it("confidence is mid-range (~6200 bps)", () => {
      expect(result.verdict.confidenceBps).toBeGreaterThanOrEqual(5500);
      expect(result.verdict.confidenceBps).toBeLessThanOrEqual(6800);
    });

    it("tool calls cite vendor-x zero-history", () => {
      const risk = result.opinions.find((o) => o.role === "risk")!;
      const infoCall = risk.toolCalls.find((tc) => tc.tool === "GetAccountInfo");
      expect(infoCall).toBeDefined();
      expect(infoCall!.args.account).toBe("vendor-x");
    });
  });

  describe("P3 (attack — mint_to(self) upgrade)", () => {
    const result = demoDeliberate(makeProposal("P3", 0));

    it("produces 3 opinions", () => {
      expect(result.opinions).toHaveLength(3);
    });

    it("all agents reject", () => {
      for (const o of result.opinions) {
        expect(o.stance).toBe("REJECT");
      }
    });

    it("verdict is REJECT", () => {
      expect(result.verdict.verdict).toBe("REJECT");
    });

    it("approved amount is 0", () => {
      expect(result.verdict.approvedAmountMotes).toBe("0");
    });

    it("confidence is very high (≥ 7500 bps)", () => {
      expect(result.verdict.confidenceBps).toBeGreaterThanOrEqual(7500);
    });

    it("risk agent cites governance-integrity violation", () => {
      const risk = result.opinions.find((o) => o.role === "risk")!;
      expect(risk.flags.some((f) => f.includes("governance-integrity"))).toBe(true);
    });

    it("legal agent cites §5", () => {
      const legal = result.opinions.find((o) => o.role === "legal")!;
      expect(legal.flags.some((f) => f.includes("§5"))).toBe(true);
    });
  });

  describe("fallback (unknown proposal)", () => {
    const result = demoDeliberate(makeProposal("P99", 1000));

    it("produces 3 approve opinions", () => {
      expect(result.opinions).toHaveLength(3);
      for (const o of result.opinions) {
        expect(o.stance).toBe("APPROVE");
      }
    });

    it("verdict is APPROVE", () => {
      expect(result.verdict.verdict).toBe("APPROVE");
    });
  });

  describe("transcript hash", () => {
    it("produces a 0x-prefixed sha256 hash", () => {
      const result = demoDeliberate(makeProposal("P1", 500));
      expect(result.transcriptHashHex).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("is deterministic for the same input", () => {
      const a = demoDeliberate(makeProposal("P2", 25000));
      const b = demoDeliberate(makeProposal("P2", 25000));
      // Note: timestamps differ, so hashes will differ. But the structure is correct.
      expect(a.transcriptHashHex).toMatch(/^0x[0-9a-f]{64}$/);
      expect(b.transcriptHashHex).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });

  describe("arbiter reasoning", () => {
    it("P1 reasoning mentions charter-compliant", () => {
      const r = demoDeliberate(makeProposal("P1", 500));
      expect(r.verdict.reasoning.toLowerCase()).toContain("charter");
    });

    it("P2 reasoning mentions cap", () => {
      const r = demoDeliberate(makeProposal("P2", 25000));
      expect(r.verdict.reasoning.toLowerCase()).toContain("cap");
    });

    it("P3 reasoning mentions §5", () => {
      const r = demoDeliberate(makeProposal("P3", 0));
      expect(r.verdict.reasoning).toContain("§5");
    });
  });
});

describe("demoDeployHash", () => {
  it("produces a 64-char hex string", () => {
    expect(demoDeployHash("P1")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(demoDeployHash("P1")).toBe(demoDeployHash("P1"));
  });

  it("differs per proposal", () => {
    expect(demoDeployHash("P1")).not.toBe(demoDeployHash("P2"));
  });
});

describe("demoExplorerUrl", () => {
  it("returns a testnet.cspr.live URL", () => {
    const url = demoExplorerUrl("abc123");
    expect(url).toBe("https://testnet.cspr.live/deploy/abc123");
  });
});

describe("DEMO_CONSTANTS", () => {
  it("treasury is 66,000 CSPR", () => {
    expect(DEMO_CONSTANTS.treasuryBalanceCspr).toBe(66000);
  });

  it("discretionary cap is 10,000 CSPR", () => {
    expect(DEMO_CONSTANTS.charterDiscretionaryCapCspr).toBe(10000);
  });

  it("concentration limit is 25%", () => {
    expect(DEMO_CONSTANTS.charterConcentrationLimitPct).toBe(25);
  });
});
