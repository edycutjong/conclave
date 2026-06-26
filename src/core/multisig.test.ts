import { describe, expect, it, beforeEach } from "vitest";
import { openMultisig, addApproval, autoApproveToQuorum, getApprovalState, resetDemoApprovals } from "./multisig";
import { createMcpClient } from "@/agents/tools/mcp";

const mcp = createMcpClient();

describe("multisig (demo mode)", () => {
  beforeEach(() => {
    resetDemoApprovals();
  });

  it("openMultisig starts with 0 approvals", async () => {
    const state = await openMultisig(mcp, 0);
    expect(state.approvals).toBe(0);
    expect(state.reached).toBe(false);
  });

  it("addApproval increments count", async () => {
    await openMultisig(mcp, 0);
    const state = await addApproval(mcp, 0);
    expect(state.approvals).toBe(1);
    expect(state.reached).toBe(false);
  });

  it("reaches quorum at threshold", async () => {
    await openMultisig(mcp, 0);
    await addApproval(mcp, 0);
    const state = await addApproval(mcp, 0);
    expect(state.approvals).toBe(2);
    expect(state.reached).toBe(true);
  });

  it("autoApproveToQuorum sets approvals to quorum", async () => {
    const state = await autoApproveToQuorum(mcp, 0);
    expect(state.approvals).toBe(2);
    expect(state.reached).toBe(true);
  });

  it("autoApproveToQuorum respects custom quorum", async () => {
    const state = await autoApproveToQuorum(mcp, 0, 3);
    expect(state.approvals).toBe(3);
    expect(state.quorum).toBe(3);
    expect(state.reached).toBe(true);
  });

  it("getApprovalState returns current state without modifying", async () => {
    await openMultisig(mcp, 5);
    await addApproval(mcp, 5);
    const state = getApprovalState(5);
    expect(state.approvals).toBe(1);
  });

  it("different onchainIds are independent", async () => {
    await autoApproveToQuorum(mcp, 0);
    await openMultisig(mcp, 1);
    expect(getApprovalState(0).approvals).toBe(2);
    expect(getApprovalState(1).approvals).toBe(0);
  });

  it("resetDemoApprovals clears all state", async () => {
    await autoApproveToQuorum(mcp, 0);
    resetDemoApprovals();
    expect(getApprovalState(0).approvals).toBe(0);
  });

  it("addApproval fallback when not opened", async () => {
    // Calling addApproval without openMultisig sets approvals to 1 (0 + 1)
    const state = await addApproval(mcp, 999);
    expect(state.approvals).toBe(1);
  });
});


describe("multisig (non-demo mode)", () => {
  it("throws on openMultisig, addApproval, autoApproveToQuorum", async () => {
    const originalDemo = process.env.CONCLAVE_DEMO;
    process.env.CONCLAVE_DEMO = "false";

    try {
      await expect(openMultisig(mcp, 0)).rejects.toThrow("Off-chain approval collection not wired yet");
      await expect(addApproval(mcp, 0)).rejects.toThrow("Off-chain approval collection not wired yet");
      await expect(autoApproveToQuorum(mcp, 0)).rejects.toThrow("Off-chain approval collection not wired yet");
    } finally {
      process.env.CONCLAVE_DEMO = originalDemo;
    }
  });
});

