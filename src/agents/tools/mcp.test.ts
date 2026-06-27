import { describe, expect, it, vi } from "vitest";
import { createMcpClient, verifyToolCall, MCP_READ_TOOLS, MCP_MULTISIG_TOOLS } from "./mcp";
import { config } from "@/lib/config";


describe("MCP_READ_TOOLS", () => {
  it("contains GetAccountBalance", () => {
    expect(MCP_READ_TOOLS).toContain("GetAccountBalance");
  });

  it("contains GetAccountInfo", () => {
    expect(MCP_READ_TOOLS).toContain("GetAccountInfo");
  });

  it("contains GetContractEntryPoints", () => {
    expect(MCP_READ_TOOLS).toContain("GetContractEntryPoints");
  });

  it("has 9 read tools", () => {
    expect(MCP_READ_TOOLS).toHaveLength(9);
  });
});

describe("MCP_MULTISIG_TOOLS", () => {
  it("contains CreateAwaitingDeploy", () => {
    expect(MCP_MULTISIG_TOOLS).toContain("CreateAwaitingDeploy");
  });

  it("has 3 multisig tools", () => {
    expect(MCP_MULTISIG_TOOLS).toHaveLength(3);
  });
});

describe("createMcpClient (demo mode)", () => {
  const client = createMcpClient();

  it("returns treasury balance for GetAccountBalance", async () => {
    const result = await client.call<{ balance: string }>("GetAccountBalance", { account: "treasury" });
    expect(result.balance).toBe("66000000000000");
  });

  it("returns zero for vendor-x balance", async () => {
    const result = await client.call<{ balance: string }>("GetAccountBalance", { account: "vendor-x" });
    expect(result.balance).toBe("0");
  });

  it("returns grantee-aurora account info", async () => {
    const result = await client.call<{ age_days: number; total_deploys: number }>("GetAccountInfo", { account: "grantee-aurora" });
    expect(result.age_days).toBe(730);
    expect(result.total_deploys).toBe(847);
  });

  it("returns vendor-x as fresh account", async () => {
    const result = await client.call<{ age_days: number; total_deploys: number }>("GetAccountInfo", { account: "vendor-x" });
    expect(result.age_days).toBe(3);
    expect(result.total_deploys).toBe(0);
  });

  it("returns governance entrypoints including mint_to", async () => {
    const result = await client.call<{ entrypoints: string[] }>("GetContractEntryPoints", { contract: "governance-self" });
    expect(result.entrypoints).toContain("mint_to");
  });

  it("returns generic response for unknown calls", async () => {
    const result = await client.call<{ demo: boolean }>("GetDeploy", { hash: "unknown" });
    expect(result.demo).toBe(true);
  });
});

describe("verifyToolCall", () => {
  const client = createMcpClient();

  it("returns match: true for demo data", async () => {
    const result = await verifyToolCall(client, "GetAccountBalance", { account: "treasury" }, "66000");
    expect(result.match).toBe(true);
  });
});

describe("createMcpClient (non-demo mode)", () => {
  it("throws when csprCloudKey is not set", async () => {
    const originalDemo = process.env.CONCLAVE_DEMO;
    const originalKey = config.csprCloudKey;
    process.env.CONCLAVE_DEMO = "false";
    (config as any).csprCloudKey = "";
    const client = createMcpClient();

    try {
      await expect(client.call("GetAccountBalance", { account: "test" })).rejects.toThrow("CSPR_CLOUD_API_KEY not set");
    } finally {
      process.env.CONCLAVE_DEMO = originalDemo;
      (config as any).csprCloudKey = originalKey;
    }
  });

  it("throws on unmapped tool", async () => {
    const originalDemo = process.env.CONCLAVE_DEMO;
    process.env.CONCLAVE_DEMO = "false";
    const client = createMcpClient();

    try {
      await expect(client.call("CreateAwaitingDeploy" as any, { account: "test" })).rejects.toThrow("is not mapped");
    } finally {
      process.env.CONCLAVE_DEMO = originalDemo;
    }
  });

  it("handles successful data response", async () => {
    const originalDemo = process.env.CONCLAVE_DEMO;
    const originalKey = config.csprCloudKey;
    process.env.CONCLAVE_DEMO = "false";
    (config as any).csprCloudKey = "test-key";
    const client = createMcpClient();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { balance: "100" } }),
    } as any);

    try {
      const result = await client.call<any>("GetAccountBalance", { account: "test-acc" });
      expect(result.balance).toBe("100");
      expect(fetchSpy).toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      process.env.CONCLAVE_DEMO = originalDemo;
      (config as any).csprCloudKey = originalKey;
    }
  });

  it("handles successful item_count response", async () => {
    const originalDemo = process.env.CONCLAVE_DEMO;
    const originalKey = config.csprCloudKey;
    process.env.CONCLAVE_DEMO = "false";
    (config as any).csprCloudKey = "test-key";
    const client = createMcpClient();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ item_count: 5, data: [] }),
    } as any);

    try {
      const result = await client.call<any>("GetAccountBalance", { account: "test-acc" });
      expect(result.total).toBe(5);
    } finally {
      fetchSpy.mockRestore();
      process.env.CONCLAVE_DEMO = originalDemo;
      (config as any).csprCloudKey = originalKey;
    }
  });

  it("handles HTTP error response", async () => {
    const originalDemo = process.env.CONCLAVE_DEMO;
    const originalKey = config.csprCloudKey;
    process.env.CONCLAVE_DEMO = "false";
    (config as any).csprCloudKey = "test-key";
    const client = createMcpClient();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as any);

    try {
      await expect(client.call("GetAccountBalance", { account: "test-acc" })).rejects.toThrow("CSPR.cloud REST");
    } finally {
      fetchSpy.mockRestore();
      process.env.CONCLAVE_DEMO = originalDemo;
      (config as any).csprCloudKey = originalKey;
    }
  });

  it("handles response without data wrapper", async () => {
    const originalDemo = process.env.CONCLAVE_DEMO;
    const originalKey = config.csprCloudKey;
    process.env.CONCLAVE_DEMO = "false";
    (config as any).csprCloudKey = "test-key";
    const client = createMcpClient();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balance: "150" }),
    } as any);

    try {
      const result = await client.call<any>("GetAccountBalance", { account: "test-acc" });
      expect(result.balance).toBe("150");
    } finally {
      fetchSpy.mockRestore();
      process.env.CONCLAVE_DEMO = originalDemo;
      (config as any).csprCloudKey = originalKey;
    }
  });

  it("uses publicKey as fallback for balance and deploys", async () => {
    const originalDemo = process.env.CONCLAVE_DEMO;
    const originalKey = config.csprCloudKey;
    process.env.CONCLAVE_DEMO = "false";
    (config as any).csprCloudKey = "test-key";
    const client = createMcpClient();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    } as any);

    try {
      await client.call("GetAccountBalance", { publicKey: "pub-key" });
      await client.call("GetAccountDeploys", { publicKey: "pub-key" });
      expect(fetchSpy.mock.calls[0][0]).toContain("/accounts/pub-key");
      expect(fetchSpy.mock.calls[1][0]).toContain("/accounts/pub-key/deploys");
    } finally {
      fetchSpy.mockRestore();
      process.env.CONCLAVE_DEMO = originalDemo;
      (config as any).csprCloudKey = originalKey;
    }
  });

  it("covers all REST_ROUTE mapping branches", async () => {
    const originalDemo = process.env.CONCLAVE_DEMO;
    const originalKey = config.csprCloudKey;
    process.env.CONCLAVE_DEMO = "false";
    (config as any).csprCloudKey = "test-key";
    const client = createMcpClient();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    } as any);

    try {
      // GetAccountInfo with publicKey
      await client.call("GetAccountInfo", { publicKey: "pub-key" });
      // GetAccountDeploys
      await client.call("GetAccountDeploys", { account: "acc" });
      // GetContract
      await client.call("GetContract", { contract: "ctr" });
      // GetContractEntryPoints
      await client.call("GetContractEntryPoints", { contract: "ctr" });
      // GetDeploy
      await client.call("GetDeploy", { deploy: "dep" });

      expect(fetchSpy).toHaveBeenCalledTimes(5);
    } finally {
      fetchSpy.mockRestore();
      process.env.CONCLAVE_DEMO = originalDemo;
      (config as any).csprCloudKey = originalKey;
    }
  });
});


