// Server-only loaders for the deterministic demo fixtures (data/fixtures/).

import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIX = join(process.cwd(), "data", "fixtures");

export interface SeedProposal {
  id: string;
  title: string;
  targetRef: string;
  entrypoint: string;
  requestedAmountCspr: number;
  requestedAmountMotes: string;
  rationale: string;
  spice: "clean" | "headline" | "attack";
  expectedVerdict: string;
  expectedCapCspr?: number;
  why?: string;
}

export interface ProposalsFixture {
  treasury: { fundedCspr: number; fundedMotes: string; note: string };
  proposals: SeedProposal[];
}

export function loadProposals(): ProposalsFixture {
  return JSON.parse(readFileSync(join(FIX, "proposals.json"), "utf8"));
}

export function loadExpectedVerdicts(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(FIX, "expected_verdicts.json"), "utf8"));
}

export function loadCharter(): string {
  return readFileSync(join(FIX, "charter.md"), "utf8");
}
