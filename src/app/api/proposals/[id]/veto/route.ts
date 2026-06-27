import { NextResponse } from "next/server";
import { vetoProposal, getProposal } from "@/lib/store";

// POST /api/proposals/:id/veto — abort within the veto window (human kill-switch).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = getProposal(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const result = vetoProposal(id);
    return NextResponse.json({ proposal: result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
