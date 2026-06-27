// Deliberation latency benchmark (p50/p95/mean) over N runs of the seed proposals.
// Runs in demo mode — benchmarks the demo engine's deterministic deliberation.

import { demoDeliberate } from "../src/core/demo";
import { csprToMotes, type Proposal } from "../src/core/types";
import { loadProposals } from "../src/lib/fixtures";

const RUNS = 50;

function makeProposal(id: string, requestedCspr: number): Proposal {
  return {
    id,
    title: `Bench ${id}`,
    target: "bench",
    entrypoint: "transfer",
    argsHash: "0x0",
    rationale: "bench",
    rationaleHash: "0x0",
    requestedAmountMotes: csprToMotes(requestedCspr),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

function percentile(sorted: number[], p: number): number {
  const i = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, i)];
}

async function main() {
  const { proposals } = loadProposals();
  console.log(`── Conclave Bench (${RUNS} runs × ${proposals.length} proposals) ──\n`);

  const latencies: number[] = [];

  for (let run = 0; run < RUNS; run++) {
    for (const p of proposals) {
      const start = performance.now();
      demoDeliberate(makeProposal(p.id, p.requestedAmountCspr));
      latencies.push(performance.now() - start);
    }
  }

  latencies.sort((a, b) => a - b);
  const mean = latencies.reduce((s, v) => s + v, 0) / latencies.length;
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);

  console.log(`Total deliberations: ${latencies.length}`);
  console.log(`  p50:  ${p50.toFixed(2)}ms`);
  console.log(`  p95:  ${p95.toFixed(2)}ms`);
  console.log(`  mean: ${mean.toFixed(2)}ms`);
  console.log(`\n✓ Benchmark complete (demo mode — deterministic engine).`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

export {};
