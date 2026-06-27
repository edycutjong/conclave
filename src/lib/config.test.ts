import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { config, assertServerEnv } from "./config";

describe("runtime config", () => {
  it("should have sensible default configuration values", () => {
    expect(config).toHaveProperty("csprCloudRest");
    expect(config).toHaveProperty("mcpUrl");
    expect(config).toHaveProperty("network");
    expect(config).toHaveProperty("nodeRpc");
    expect(config).toHaveProperty("chainName");
  });
});

describe("assertServerEnv", () => {
  let originalConfig: typeof config;

  beforeEach(() => {
    originalConfig = { ...config };
  });

  afterEach(() => {
    Object.assign(config, originalConfig);
  });

  it("should pass if all requested config properties exist", () => {
    config.network = "testnet";
    expect(() => assertServerEnv(["network"])).not.toThrow();
  });

  it("should throw an error if any requested config properties are missing/empty", () => {
    config.network = "";
    expect(() => assertServerEnv(["network"])).toThrow(
      "Missing required env: network"
    );
  });
});
