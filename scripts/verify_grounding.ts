// Proves "no hallucinated numbers": re-runs every MCP/CSPR.cloud read an agent cited in a
// transcript and diffs the values. Exits non-zero on any mismatch.

import { demoDeliberate } from "../src/core/demo";
import { createMcpClient, verifyToolCall, type McpTool } from "../src/agents/tools/mcp";
import { csprToMotes, type Proposal } from "../src/core/types";
import { loadProposals } from "../src/lib/fixtures";

function makeProposal(id: string, requestedCspr: number): Proposal {
  return {
    id,
    title: `Verify ${id}`,
    target: "verify",
    entrypoint: "transfer",
    argsHash: "0x0",
    rationale: "verify",
    rationaleHash: "0x0",
    requestedAmountMotes: csprToMotes(requestedCspr),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

async function main() {
  const client = createMcpClient();
  const { proposals } = loadProposals();
  let total = 0;
  let verified = 0;
  const failures: string[] = [];

  console.log("── Conclave Grounding Verifier ──\n");

  for (const p of proposals) {
    const result = demoDeliberate(makeProposal(p.id, p.requestedAmountCspr));

    for (const opinion of result.opinions) {
      for (const tc of opinion.toolCalls) {
        total++;
        const check = await verifyToolCall(client, tc.tool as McpTool, tc.args, tc.citedValue);
        if (check.match) {
          verified++;
          console.log(`  ✓ ${p.id}/${opinion.role}: ${tc.tool}(${JSON.stringify(tc.args)}) → ${tc.citedValue}`);
        } else {
          const msg = `${p.id}/${opinion.role}: ${tc.tool} — cited "${tc.citedValue}", fresh read returned "${JSON.stringify(check.fresh)}"`;
          failures.push(msg);
          console.log(`  ✗ ${msg}`);
        }
      }
    }
  }

  console.log(`\n${verified}/${total} tool calls verified.`);

  if (failures.length) {
    console.error(`\n✗ ${failures.length} grounding failures — agents cited values that don't match MCP reads.`);
    process.exit(1);
  }

  console.log("✓ All cited values are grounded in real reads. No hallucinated numbers.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

export {};
