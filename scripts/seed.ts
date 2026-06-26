// Deterministic demo state on Casper Testnet.
//
// Demo mode: validates fixtures and prints a summary (no Testnet required).
// Real mode: fund a treasury account from the faucet, create vendor-x, etc.

import { loadProposals, loadCharter, loadExpectedVerdicts } from "../src/lib/fixtures";

async function main() {
  console.log("── Conclave Seed ──\n");

  // Validate fixtures
  const { treasury, proposals } = loadProposals();
  const charter = loadCharter();
  const expectedVerdicts = loadExpectedVerdicts();

  console.log(`✓ Charter loaded (${charter.length} bytes)`);
  console.log(`✓ Treasury target: ${treasury.fundedCspr.toLocaleString()} CSPR (${treasury.fundedMotes} motes)`);
  console.log(`✓ Proposals: ${proposals.map((p) => `${p.id} [${p.spice}]`).join(", ")}`);
  console.log(`✓ Expected verdicts: ${Object.keys(expectedVerdicts).join(", ")}`);

  // Verify fixture integrity
  const errors: string[] = [];
  for (const p of proposals) {
    if (!p.id) errors.push(`Proposal missing id`);
    if (!p.title) errors.push(`${p.id}: missing title`);
    if (!p.targetRef) errors.push(`${p.id}: missing targetRef`);
    if (!p.entrypoint) errors.push(`${p.id}: missing entrypoint`);
    if (!p.expectedVerdict) errors.push(`${p.id}: missing expectedVerdict`);
    if (!(p.id in expectedVerdicts)) errors.push(`${p.id}: no expected verdict in expected_verdicts.json`);
  }

  if (!charter.includes("§1")) errors.push("Charter missing §1");
  if (!charter.includes("§5")) errors.push("Charter missing §5");
  if (!charter.includes("10,000 CSPR")) errors.push("Charter missing discretionary cap");

  if (errors.length) {
    console.error(`\n✗ ${errors.length} fixture errors:\n - ${errors.join("\n - ")}`);
    process.exit(1);
  }

  console.log("\n✓ All fixtures validated. Demo mode ready.");
  console.log("  (Real mode: set CONCLAVE_DEMO=false and configure Testnet keys)");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
