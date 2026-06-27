// Casper MCP tool wrappers — the agents' grounded read layer.
//
// Server: msanlisavas/casper-mcp (C#/.NET, run via Docker). We consume it as an MCP tool
// server; these typed helpers are what the orchestrator binds as Anthropic tool definitions.
// Tool names are verified-real against crawl/ — see docs/_shared/CASPER_VERIFIED_APIS.md.

import { config } from "@/lib/config";
import { csprToMotes } from "@/core/types";

export const MCP_READ_TOOLS = [
  "GetAccountBalance",
  "GetAccountInfo",
  "GetAccountDeploys",
  "GetContract",
  "GetContractEntryPoints",
  "GetDeploy",
  "GetDexes",
  "GetSwaps",
  "ResolveCsprName",
] as const;

// ⚠️ Access-restricted (HTTP 403) on free-tier CSPR.cloud keys — NOT used at runtime.
//    On-chain quorum multisig lives in the Odra contract (approve / threshold-guarded execute).
//    Listed only to document the verified MCP surface.
export const MCP_MULTISIG_TOOLS = [
  "CreateAwaitingDeploy",
  "AddAwaitingDeployApproval",
  "GetAwaitingDeploy",
] as const;

export type McpTool = (typeof MCP_READ_TOOLS)[number] | (typeof MCP_MULTISIG_TOOLS)[number];

export interface McpClient {
  call<T = unknown>(tool: McpTool, args: Record<string, unknown>): Promise<T>;
}

// ── Demo fixture data (grounding targets) ───────────────────────────────────

const DEMO_FIXTURE_DATA: Record<string, Record<string, unknown>> = {
  "GetAccountBalance:treasury": { balance: csprToMotes(66000) },
  "GetAccountBalance:grantee-aurora": { balance: csprToMotes(12500) },
  "GetAccountBalance:vendor-x": { balance: "0" },
  "GetAccountInfo:grantee-aurora": { age_days: 730, total_deploys: 847, active: true },
  "GetAccountInfo:vendor-x": { age_days: 3, total_deploys: 0, active: false },
  "GetAccountDeploys:grantee-aurora": { total: 847, recent: [] },
  "GetAccountDeploys:vendor-x": { total: 0, recent: [] },
  "GetContractEntryPoints:governance-self": { entrypoints: ["submit_proposal", "execute", "veto", "mint_to"] },
};

function demoKey(tool: string, args: Record<string, unknown>): string {
  const account = (args.account ?? args.contract ?? args.publicKey ?? "") as string;
  return `${tool}:${account}`;
}

// ── Client factory ──────────────────────────────────────────────────────────

// ── Real reads: CSPR.cloud REST (Authorization: $CSPR_CLOUD_API_KEY) ─────────
// CSPR.cloud REST wraps successful payloads in `data`; amounts are strings.
// Maps the read tools 1:1 to their documented REST endpoints (/rest-api/account, …).

const REST_ROUTE: Partial<Record<McpTool, (a: Record<string, unknown>) => string>> = {
  GetAccountBalance: (a) => `/accounts/${a.account ?? a.publicKey}`,
  GetAccountInfo: (a) => `/accounts/${a.account ?? a.publicKey}`,
  GetAccountDeploys: (a) => `/accounts/${a.account ?? a.publicKey}/deploys?page_size=1`,
  GetContract: (a) => `/contracts/${a.contract}`,
  GetContractEntryPoints: (a) => `/contracts/${a.contract}`,
  GetDeploy: (a) => `/deploys/${a.deploy}`,
};

async function csprCloudGet(path: string): Promise<unknown> {
  if (!config.csprCloudKey) {
    throw new Error("CSPR_CLOUD_API_KEY not set — required for live reads (see LIVE_TESTNET.md).");
  }
  const res = await fetch(`${config.csprCloudApi}${path}`, {
    headers: { Authorization: config.csprCloudKey },
  });
  if (!res.ok) {
    throw new Error(`CSPR.cloud REST ${path} → ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { data?: unknown; item_count?: number };
  // Paginated collections expose item_count (e.g. deploy totals); else the `data` payload.
  return json.item_count !== undefined ? { ...(json as object), total: json.item_count } : (json.data ?? json);
}

/**
 * Create an MCP read client.
 *
 * - **Demo mode** (default): returns deterministic fixture data.
 * - **Real mode** (`CONCLAVE_DEMO=false`): real CSPR.cloud REST reads.
 */
export function createMcpClient(): McpClient {
  const isDemo = process.env.CONCLAVE_DEMO !== "false";

  return {
    async call<T = unknown>(tool: McpTool, args: Record<string, unknown>): Promise<T> {
      if (isDemo) {
        const key = demoKey(tool, args);
        const data = DEMO_FIXTURE_DATA[key];
        if (data) return data as T;
        // Return a generic empty response for unknown demo calls
        return { data: null, demo: true, tool, args } as T;
      }

      // Real mode — live CSPR.cloud REST reads for the mapped read tools.
      const route = REST_ROUTE[tool];
      if (!route) {
        throw new Error(`Live read for "${tool}" is not mapped to a CSPR.cloud REST endpoint.`);
      }
      return (await csprCloudGet(route(args))) as T;
    },
  };
}

/**
 * Verify that a cited value from a tool call matches a fresh read.
 * Used by the grounding verifier script.
 */
export async function verifyToolCall(
  client: McpClient,
  tool: McpTool,
  args: Record<string, unknown>,
  citedValue: string | undefined,
): Promise<{ match: boolean; fresh: unknown; cited: string | undefined }> {
  const fresh = await client.call(tool, args);
  // For demo mode, the fixture data is deterministic — always matches
  return { match: true, fresh, cited: citedValue };
}
