import { describe, expect, it, vi, afterEach } from "vitest";
import { llmConfigured, structuredCall } from "./anthropic";
import { config } from "./config";

// Mock the Anthropic SDK client as a class
const mockCreate = vi.fn().mockImplementation(async (params: any) => {
  if (params.thinking) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ verdict: "APPROVE", confidenceBps: 9500, reasoning: "thinking-verdict" }),
        },
      ],
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ stance: "APPROVE", summary: "ok", rationale: "safe", flags: [] }),
      },
    ],
  };
});

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = {
      create: mockCreate,
    };
  }
  return {
    default: MockAnthropic,
  };
});

describe("anthropic", () => {
  const originalKey = config.anthropicKey;

  afterEach(() => {
    config.anthropicKey = originalKey;
  });

  it("llmConfigured returns false when key is empty", () => {
    config.anthropicKey = "";
    expect(llmConfigured()).toBe(false);
  });

  it("llmConfigured returns true when key is present", () => {
    config.anthropicKey = "test-key";
    expect(llmConfigured()).toBe(true);
  });

  it("structuredCall creates client and parses JSON response", async () => {
    config.anthropicKey = "test-key";
    const result = await structuredCall<{ stance: string }>({
      model: "test-model",
      system: [{ text: "system-prompt", cache: true }],
      user: "user-prompt",
      schema: { type: "object" },
    });
    expect(result).toEqual({ stance: "APPROVE", summary: "ok", rationale: "safe", flags: [] });
  });

  it("structuredCall supports thinking block", async () => {
    config.anthropicKey = "test-key";
    const result = await structuredCall<{ verdict: string }>({
      model: "test-model",
      system: [{ text: "system-prompt" }],
      user: "user-prompt",
      schema: { type: "object" },
      thinking: true,
    });
    expect(result.verdict).toBe("APPROVE");
  });

  it("structuredCall throws error when response text block is missing", async () => {
    config.anthropicKey = "test-key";
    mockCreate.mockResolvedValueOnce({
      content: [],
    });

    await expect(
      structuredCall({
        model: "test-model",
        system: [{ text: "system" }],
        user: "user",
        schema: {},
      })
    ).rejects.toThrow("Anthropic response contained no text block");
  });
});
