import { describe, expect, it, vi, afterEach } from "vitest";
import { deliberate } from "./council";
import { createMcpClient } from "./tools/mcp";
import { csprToMotes, type Proposal } from "@/core/types";
import { config } from "@/lib/config";
import { runLlmCouncil } from "./llm";

// Mock the llm module
vi.mock("./llm", () => {
  return {
    runLlmCouncil: vi.fn(),
    proposalToWhatIf: vi.fn((p) => p),
  };
});

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

describe("council.deliberate (demo mode)", () => {
  const mcp = createMcpClient();

  it("produces a valid deliberation result for P1", async () => {
    const result = await deliberate(makeProposal("P1", 500), { mcp });
    expect(result.opinions).toHaveLength(3);
    expect(result.verdict.verdict).toBe("APPROVE");
    expect(result.transcript).toBeDefined();
    expect(result.transcriptHashHex).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("produces APPROVE_WITH_CONDITION for P2", async () => {
    const result = await deliberate(makeProposal("P2", 25000), { mcp });
    expect(result.verdict.verdict).toBe("APPROVE_WITH_CONDITION");
    expect(result.verdict.approvedAmountMotes).toBe(csprToMotes(10000));
  });

  it("produces REJECT for P3", async () => {
    const result = await deliberate(makeProposal("P3", 0), { mcp });
    expect(result.verdict.verdict).toBe("REJECT");
    expect(result.verdict.approvedAmountMotes).toBe("0");
  });

  it("transcript contains all 3 agent roles", async () => {
    const result = await deliberate(makeProposal("P1", 500), { mcp });
    const roles = result.transcript.opinions.map((o) => o.role).sort();
    expect(roles).toEqual(["legal", "risk", "treasury"]);
  });

  it("transcript model fields indicate demo mode", async () => {
    const result = await deliberate(makeProposal("P1", 500), { mcp });
    expect(result.transcript.model.arbiter).toBe("demo-mode");
    expect(result.transcript.model.roles).toBe("demo-mode");
  });

  it("transcript proposalId matches input", async () => {
    const result = await deliberate(makeProposal("P2", 25000), { mcp });
    expect(result.transcript.proposalId).toBe("P2");
  });
});

describe("council.deliberate (no API key → deterministic fallback)", () => {
  const mcp = createMcpClient();

  it("falls back to the deterministic engine when ANTHROPIC_API_KEY is unset", async () => {
    const originalDemo = process.env.CONCLAVE_DEMO;
    const originalKey = process.env.ANTHROPIC_API_KEY;
    process.env.CONCLAVE_DEMO = "false";
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const result = await deliberate(makeProposal("P1", 500), { mcp });
      expect(result.opinions).toHaveLength(3);
      expect(result.verdict.verdict).toBe("APPROVE");
      expect(result.transcript.model.arbiter).toBe("demo-mode");
    } finally {
      process.env.CONCLAVE_DEMO = originalDemo;
      if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });
});

describe("council.deliberate (live path with configured key)", () => {
  const mcp = createMcpClient();
  const originalKey = config.anthropicKey;

  afterEach(() => {
    config.anthropicKey = originalKey;
  });

  it("runs the live council path successfully when key is set", async () => {
    config.anthropicKey = "mock-anthropic-key";
    const mockRunLlmCouncil = runLlmCouncil as any;
    
    mockRunLlmCouncil.mockResolvedValueOnce({
      opinions: [
        { role: "risk", stance: "APPROVE", summary: "ok", rationale: "safe", toolCalls: [], flags: [] },
        { role: "treasury", stance: "APPROVE", summary: "ok", rationale: "safe", toolCalls: [], flags: [] },
        { role: "legal", stance: "APPROVE", summary: "ok", rationale: "safe", toolCalls: [], flags: [] },
      ],
      verdict: {
        verdict: "APPROVE",
        confidenceBps: 9500,
        approvedAmountMotes: csprToMotes(500),
        reasoning: "clear approval",
      },
    });

    const result = await deliberate(makeProposal("P4", 500), { mcp });
    expect(result.verdict.verdict).toBe("APPROVE");
    expect(result.verdict.confidenceBps).toBe(9500);
    expect(result.transcript.model.arbiter).toBe(config.arbiterModel);
  });

  it("falls back to demo mode if the live council execution throws an error", async () => {
    config.anthropicKey = "mock-anthropic-key";
    const mockRunLlmCouncil = runLlmCouncil as any;
    
    mockRunLlmCouncil.mockRejectedValueOnce(new Error("API Timeout"));

    // Spying on console.error to avoid spamming test logs
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await deliberate(makeProposal("P1", 500), { mcp });
    
    expect(result.verdict.verdict).toBe("APPROVE"); // Demomode fallback verdict for P1
    expect(result.transcript.model.arbiter).toBe("demo-mode");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
