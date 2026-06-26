import { NextResponse } from "next/server";
import { config } from "@/lib/config";

// GET /api/health/airgap — telemetry: which external surfaces are configured/reachable.
export async function GET() {
  return NextResponse.json({
    network: config.network,
    configured: {
      anthropic: Boolean(config.anthropicKey),
      csprCloud: Boolean(config.csprCloudKey),
      mcpUrl: config.mcpUrl,
      contract: Boolean(config.contractHash),
    },
    quorum: config.quorum,
    vetoWindowSeconds: config.vetoWindowSeconds,
    ts: new Date().toISOString(),
  });
}
