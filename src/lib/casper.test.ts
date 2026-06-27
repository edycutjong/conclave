import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock node:fs readFileSync
vi.mock("node:fs", () => ({
  readFileSync: vi.fn().mockReturnValue("mock-pem-data"),
}));

vi.mock("casper-js-sdk", () => {
  class MockHttpHandler {
    setCustomHeaders = vi.fn();
  }

  class MockContractCallBuilder {
    from = vi.fn().mockReturnThis();
    byHash = vi.fn().mockReturnThis();
    byPackageHash = vi.fn().mockReturnThis();
    entryPoint = vi.fn().mockReturnThis();
    runtimeArgs = vi.fn().mockReturnThis();
    chainName = vi.fn().mockReturnThis();
    payment = vi.fn().mockReturnThis();
    build = vi.fn().mockReturnValue({
      sign: vi.fn(),
    });
  }

  class MockRpcClient {
    putTransaction = vi.fn().mockResolvedValue({
      transactionHash: {
        toHex: () => "deploy-hash-hex",
      },
    });
  }

  return {
    KeyAlgorithm: {
      ED25519: "ed25519",
      SECP256K1: "secp256k1",
    },
    KeyTypeID: {
      Account: 1,
    },
    PrivateKey: {
      fromPem: vi.fn().mockReturnValue({
        publicKey: {
          toHex: () => "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f2021",
        },
      }),
    },
    PublicKey: {
      fromHex: vi.fn().mockReturnValue({
        accountHash: () => ({
          toPrefixedString: () => "account-hash-123",
        }),
      }),
    },
    CLValue: {
      newCLKey: vi.fn().mockImplementation((val) => ({ type: "key", val })),
      newCLString: vi.fn().mockImplementation((val) => ({ type: "string", val })),
      newCLUInt512: vi.fn().mockImplementation((val) => ({ type: "uint512", val })),
      newCLUint64: vi.fn().mockImplementation((val) => ({ type: "uint64", val })),
      newCLUInt32: vi.fn().mockImplementation((val) => ({ type: "uint32", val })),
    },
    Key: {
      createByType: vi.fn().mockImplementation((hash, type) => ({ hash, type })),
    },
    ContractCallBuilder: MockContractCallBuilder,
    HttpHandler: MockHttpHandler,
    RpcClient: MockRpcClient,
    Args: {
      fromMap: vi.fn().mockImplementation((map) => map),
    },
  };
});

import {
  keyAlgorithm,
  loadSignerKey,
  signerPublicKeyHex,
  makeRpcClient,
  txExplorerUrl,
  callContract,
  submitProposalOnChain,
  recordVerdictOnChain,
  approveOnChain,
  executeOnChain,
} from "./casper";
import { config } from "./config";

describe("casper chain layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the correct keyAlgorithm based on environment", () => {
    const originalAlgo = process.env.CASPER_KEY_ALGO;

    process.env.CASPER_KEY_ALGO = "secp256k1";
    expect(keyAlgorithm()).toBe("secp256k1");

    process.env.CASPER_KEY_ALGO = "ed25519";
    expect(keyAlgorithm()).toBe("ed25519");

    process.env.CASPER_KEY_ALGO = "unknown";
    expect(keyAlgorithm()).toBe("ed25519");

    delete process.env.CASPER_KEY_ALGO;
    expect(keyAlgorithm()).toBe("ed25519");

    process.env.CASPER_KEY_ALGO = originalAlgo;
  });


  it("loads signer key and gets hex", () => {
    const key = loadSignerKey();
    expect(key).toBeDefined();
    expect(signerPublicKeyHex()).toBe("0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f2021");
  });

  it("makes RPC client with CSPR.cloud API key if present", () => {
    const originalKey = config.csprCloudKey;

    (config as any).csprCloudKey = "test-key";
    let client = makeRpcClient();
    expect(client).toBeDefined();

    (config as any).csprCloudKey = "";
    client = makeRpcClient();
    expect(client).toBeDefined();

    (config as any).csprCloudKey = originalKey;
  });

  it("generates transaction explorer URL", () => {
    expect(txExplorerUrl("hash123")).toBe("https://testnet.cspr.live/transaction/hash123");
  });

  it("throws in callContract if contractHash is not set", async () => {
    const originalHash = config.contractHash;
    (config as any).contractHash = "";

    try {
      await expect(callContract("test", {} as any)).rejects.toThrow("Contract hash not set");
    } finally {
      (config as any).contractHash = originalHash;
    }
  });

  it("successfully calls a contract", async () => {
    const result = await callContract("test_entry", {} as any, { contractHash: "hash-mycontract" });
    expect(result.deployHash).toBe("deploy-hash-hex");
    expect(result.explorerUrl).toContain("deploy-hash-hex");
  });

  it("submits a proposal on chain", async () => {
    const originalHash = config.contractHash;
    (config as any).contractHash = "hash-contract";

    try {
      const result = await submitProposalOnChain({
        targetPublicKeyHex: "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f2021",
        entrypoint: "transfer",
        argsHash: "0x123",
        rationaleHash: "0x456",
        requestedAmountMotes: "1000",
      });
      expect(result.deployHash).toBe("deploy-hash-hex");
    } finally {
      (config as any).contractHash = originalHash;
    }
  });

  it("records a verdict on chain", async () => {
    const originalHash = config.contractHash;
    (config as any).contractHash = "hash-contract";

    try {
      const result = await recordVerdictOnChain({
        proposalId: 1,
        verdict: "APPROVE",
        confidenceBps: 9000,
        transcriptHash: "0xabc",
        approvedAmountMotes: "1000",
      });
      expect(result.deployHash).toBe("deploy-hash-hex");
    } finally {
      (config as any).contractHash = originalHash;
    }
  });

  it("approves on chain", async () => {
    const originalHash = config.contractHash;
    (config as any).contractHash = "hash-contract";

    try {
      const result = await approveOnChain(12);
      expect(result.deployHash).toBe("deploy-hash-hex");
    } finally {
      (config as any).contractHash = originalHash;
    }
  });

  it("executes on chain", async () => {
    const originalHash = config.contractHash;
    (config as any).contractHash = "hash-contract";

    try {
      const result = await executeOnChain(12);
      expect(result.deployHash).toBe("deploy-hash-hex");
    } finally {
      (config as any).contractHash = originalHash;
    }
  });
});
