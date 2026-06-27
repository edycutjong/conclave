import { describe, expect, it, vi } from "vitest";
import { executeProposal, isDemo } from "./execute";
import { config } from "@/lib/config";

vi.mock("@/lib/casper", () => ({
  executeOnChain: vi.fn().mockResolvedValue({
    deployHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    explorerUrl: "https://mocked-explorer.com/tx/123",
  }),
}));

describe("isDemo", () => {
  it("returns true by default (CONCLAVE_DEMO not set)", () => {
    expect(isDemo()).toBe(true);
  });
});

describe("executeProposal (demo mode)", () => {
  it("returns a valid deploy hash", async () => {
    const result = await executeProposal("P1", 0);
    expect(result.deployHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns an onchainId", async () => {
    const result = await executeProposal("P2", 1);
    expect(result.onchainId).toBe(1);
  });

  it("returns an explorer URL", async () => {
    const result = await executeProposal("P1", 0);
    expect(result.explorerUrl).toContain("testnet.cspr.live/deploy/");
  });

  it("is deterministic per proposal", async () => {
    const a = await executeProposal("P1", 0);
    const b = await executeProposal("P1", 0);
    expect(a.deployHash).toBe(b.deployHash);
  });

  it("differs per proposal", async () => {
    const a = await executeProposal("P1", 0);
    const b = await executeProposal("P2", 1);
    expect(a.deployHash).not.toBe(b.deployHash);
  });
});

describe("executeProposal (non-demo mode)", () => {
  it("throws when contractHash is not set", async () => {
    const originalDemo = process.env.CONCLAVE_DEMO;
    const originalHash = config.contractHash;
    process.env.CONCLAVE_DEMO = "false";
    (config as any).contractHash = "";

    try {
      await expect(executeProposal("P1", 123)).rejects.toThrow("CONCLAVE_CONTRACT_HASH not set");
    } finally {
      process.env.CONCLAVE_DEMO = originalDemo;
      (config as any).contractHash = originalHash;
    }
  });

  it("calls executeOnChain and returns transaction details when contractHash is set", async () => {
    const originalDemo = process.env.CONCLAVE_DEMO;
    const originalHash = config.contractHash;
    process.env.CONCLAVE_DEMO = "false";
    (config as any).contractHash = "0xcontracthash";

    try {
      const result = await executeProposal("P1", 123);
      expect(result.deployHash).toBe("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
      expect(result.explorerUrl).toBe("https://mocked-explorer.com/tx/123");
      expect(result.onchainId).toBe(123);
    } finally {
      process.env.CONCLAVE_DEMO = originalDemo;
      (config as any).contractHash = originalHash;
    }
  });
});

