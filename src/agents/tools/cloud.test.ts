import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAccountBalance, authedFetch } from "./cloud";
import { config } from "@/lib/config";

describe("CSPR.cloud REST helpers", () => {
  let originalKey: string;

  beforeEach(() => {
    originalKey = config.csprCloudKey;
  });

  afterEach(() => {
    config.csprCloudKey = originalKey;
    vi.restoreAllMocks();
  });

  it("should throw an error if CSPR_CLOUD_API_KEY is missing", async () => {
    config.csprCloudKey = "";
    await expect(getAccountBalance("01abcdef")).rejects.toThrow(
      "CSPR_CLOUD_API_KEY missing"
    );
  });

  it("should fetch account balance successfully", async () => {
    config.csprCloudKey = "test-api-key";

    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          balance: "1000000000",
        },
      }),
    };

    const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal("fetch", fetchSpy);

    const balance = await getAccountBalance("01abcdef");
    expect(balance).toBe("1000000000");

    expect(fetchSpy).toHaveBeenCalledWith(
      `${config.csprCloudRest}/accounts/01abcdef`,
      expect.objectContaining({
        headers: {
          Authorization: "test-api-key",
          Accept: "application/json",
        },
      })
    );
  });

  it("should fallback to 0 if balance is missing in JSON response", async () => {
    config.csprCloudKey = "test-api-key";

    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        data: {},
      }),
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const balance = await getAccountBalance("01abcdef");
    expect(balance).toBe("0");
  });

  it("should support absolute URLs in authedFetch path", async () => {
    config.csprCloudKey = "test-api-key";

    const mockResponse = {
      ok: true,
      status: 200,
    };

    const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal("fetch", fetchSpy);

    await authedFetch("https://custom-node.com/accounts/01abcdef");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://custom-node.com/accounts/01abcdef",
      expect.any(Object)
    );
  });

  it("should throw an error if response is not ok", async () => {
    config.csprCloudKey = "test-api-key";

    const mockResponse = {
      ok: false,
      status: 404,
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    await expect(getAccountBalance("01abcdef")).rejects.toThrow(
      "CSPR.cloud 404 for 01abcdef"
    );
  });
});
