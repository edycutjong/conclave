import { NextResponse } from "next/server";
import { listProposals, getTreasuryInfo, runDeliberation } from "@/lib/store";

// GET /api/proposals — list all proposals with their deliberation state.
export async function GET() {
  const treasury = getTreasuryInfo();
  const proposals = listProposals();
  return NextResponse.json({ treasury, proposals });
}

// POST /api/proposals — create a proposal + kick off deliberation.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { proposalId?: string };
  const proposalId = body.proposalId;

  if (!proposalId) {
    return NextResponse.json({ error: "proposalId is required" }, { status: 400 });
  }

  try {
    const result = await runDeliberation(proposalId);
    return NextResponse.json({ proposal: result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
