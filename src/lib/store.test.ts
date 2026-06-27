import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  listProposals,
  getProposal,
  getTreasuryInfo,
  runDeliberation,
  vetoProposal,
  executeProposalFromStore,
  resetStore,
} from "./store";
import { assertServerEnv } from "./config";
import * as fixtures from "./fixtures";
import * as multisig from "@/core/multisig";

describe("store", () => {
  beforeEach(() => {
    resetStore();
  });

  it("handles seed with requestedAmountMotes", () => {
    const originalProposals = fixtures.loadProposals();
    const mockProposals = {
      ...originalProposals,
      proposals: [
        {
          id: "P_TEST",
          title: "Test Motes",
          targetRef: "core-dev-multisig",
          entrypoint: "transfer",
          rationale: "motes test rationale",
          requestedAmountMotes: "1234500000000",
        },
        {
          id: "P_TEST_NULL",
          title: "Test Motes Null",
          targetRef: "core-dev-multisig",
          entrypoint: "transfer",
          rationale: "motes test rationale",
          requestedAmountMotes: null as any,
          requestedAmountCspr: 100,
        }
      ]
    };
    const spy = vi.spyOn(fixtures, "loadProposals").mockReturnValue(mockProposals as any);
    try {
      resetStore();
      const p = getProposal("P_TEST");
      expect(p).toBeDefined();
      expect(p!.proposal.requestedAmountMotes).toBe("1234500000000");

      const pNull = getProposal("P_TEST_NULL");
      expect(pNull).toBeDefined();
      expect(pNull!.proposal.requestedAmountMotes).toBe("100000000000");
    } finally {
      spy.mockRestore();
      resetStore();
    }
  });

  describe("assertServerEnv", () => {
    it("passes when keys are present", () => {
      expect(() => assertServerEnv(["arbiterModel"])).not.toThrow();
    });

    it("throws when keys are missing", () => {
      expect(() => assertServerEnv(["contractHash"])).toThrow("Missing required env: contractHash");
    });
  });

  describe("initialization", () => {
    it("listProposals returns 3 seeded proposals", () => {
      const proposals = listProposals();
      expect(proposals).toHaveLength(3);
    });

    it("all proposals start in idle phase", () => {
      const proposals = listProposals();
      for (const p of proposals) {
        expect(p.phase).toBe("idle");
      }
    });

    it("getProposal returns a specific proposal", () => {
      const p = getProposal("P1");
      expect(p).toBeDefined();
      expect(p!.proposal.id).toBe("P1");
    });

    it("getProposal returns undefined for unknown id", () => {
      expect(getProposal("NOPE")).toBeUndefined();
    });

    it("getTreasuryInfo returns fixture data", () => {
      const info = getTreasuryInfo();
      expect(info.fundedCspr).toBe(66000);
    });
  });

  describe("runDeliberation", () => {
    it("runs deliberation for P1 (clean)", async () => {
      const result = await runDeliberation("P1");
      expect(result.verdict).toBeDefined();
      expect(result.verdict!.verdict).toBe("APPROVE");
      // P1 APPROVE → goes to veto_window
      expect(result.phase).toBe("veto_window");
    });

    it("runs deliberation for P2 (headline) with cap", async () => {
      const result = await runDeliberation("P2");
      expect(result.verdict!.verdict).toBe("APPROVE_WITH_CONDITION");
      expect(result.phase).toBe("veto_window");
    });

    it("runs deliberation for P3 (attack) and stops at decided (REJECT)", async () => {
      const result = await runDeliberation("P3");
      expect(result.verdict!.verdict).toBe("REJECT");
      // REJECT → no approvals, no veto, stops at decided
      expect(result.phase).toBe("decided");
    });

    it("rejects double-deliberation", async () => {
      await runDeliberation("P1");
      await expect(runDeliberation("P1")).rejects.toThrow("already deliberated");
    });

    it("rejects unknown proposal", async () => {
      await expect(runDeliberation("NOPE")).rejects.toThrow("not found");
    });

    it("populates opinions", async () => {
      const result = await runDeliberation("P1");
      expect(result.opinions).toHaveLength(3);
    });

    it("populates transcript hash", async () => {
      const result = await runDeliberation("P1");
      expect(result.transcriptHashHex).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("sets veto window for approved proposals", async () => {
      const result = await runDeliberation("P1");
      expect(result.veto).toBeDefined();
      expect(result.veto!.vetoed).toBe(false);
    });

    it("no veto window for rejected proposals", async () => {
      const result = await runDeliberation("P3");
      expect(result.veto).toBeNull();
    });
  });

  describe("vetoProposal", () => {
    it("vetoes a proposal in veto_window phase", async () => {
      await runDeliberation("P1");
      const result = vetoProposal("P1");
      expect(result.phase).toBe("vetoed");
      expect(result.veto!.vetoed).toBe(true);
    });

    it("vetoes an idle proposal and initializes the veto state object", () => {
      const result = vetoProposal("P1");
      expect(result.phase).toBe("vetoed");
      expect(result.veto).toBeDefined();
      expect(result.veto!.vetoed).toBe(true);
    });

    it("rejects vetoing an unknown proposal", () => {
      expect(() => vetoProposal("NOPE")).toThrow("not found");
    });

    it("rejects double-veto", async () => {
      await runDeliberation("P1");
      vetoProposal("P1");
      expect(() => vetoProposal("P1")).toThrow("already vetoed");
    });

    it("rejects vetoing an already executed proposal", async () => {
      await runDeliberation("P1");
      await executeProposalFromStore("P1");
      expect(() => vetoProposal("P1")).toThrow("already executed");
    });
  });

  describe("executeProposalFromStore", () => {
    it("executes a decided, approved, non-vetoed proposal", async () => {
      await runDeliberation("P2");
      const result = await executeProposalFromStore("P2");
      expect(result.phase).toBe("executed");
      expect(result.execution).toBeDefined();
      expect(result.execution!.deployHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("rejects executing a vetoed proposal", async () => {
      await runDeliberation("P1");
      vetoProposal("P1");
      await expect(executeProposalFromStore("P1")).rejects.toThrow("vetoed");
    });

    it("rejects executing a rejected proposal", async () => {
      await runDeliberation("P3");
      await expect(executeProposalFromStore("P3")).rejects.toThrow("rejected");
    });

    it("rejects double execution", async () => {
      await runDeliberation("P1");
      await executeProposalFromStore("P1");
      await expect(executeProposalFromStore("P1")).rejects.toThrow("already executed");
    });

    it("rejects executing unknown proposal", async () => {
      await expect(executeProposalFromStore("NOPE")).rejects.toThrow("not found");
    });

    it("rejects executing a proposal with no verdict", async () => {
      await expect(executeProposalFromStore("P1")).rejects.toThrow("has no verdict");
    });

    it("rejects executing a proposal when quorum is not reached", async () => {
      const autoApproveSpy = vi.spyOn(multisig, "autoApproveToQuorum").mockResolvedValueOnce({
        onchainId: 0,
        approvals: 0,
        quorum: 2,
        reached: false,
      });

      try {
        await runDeliberation("P1");
        await expect(executeProposalFromStore("P1")).rejects.toThrow("has not reached quorum");
      } finally {
        autoApproveSpy.mockRestore();
      }
    });
  });

  describe("resetStore", () => {
    it("resets to initial state", async () => {
      await runDeliberation("P1");
      resetStore();
      const p = getProposal("P1");
      expect(p!.phase).toBe("idle");
    });
  });
});

