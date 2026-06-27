import { NextResponse } from "next/server";
import { getProposal } from "@/lib/store";

// GET /api/proposals/:id — full proposal with deliberation transcript + state.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proposal = getProposal(id);
  if (!proposal) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ proposal });
}
