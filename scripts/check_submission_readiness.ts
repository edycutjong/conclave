// Fails (exit 1) if the repo still carries submission placeholders — run before submitting.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const failures: string[] = [];

console.log("── Conclave Submission Readiness ──\n");

// 1. Check README for placeholders
const readme = readFileSync(join(ROOT, "README.md"), "utf8");
for (const ph of ["<address", "<hash>", "<N>", "filled at deploy", "filled at ship"]) {
  if (readme.includes(ph)) failures.push(`README still contains placeholder: "${ph}"`);
}

// 2. Check fixtures exist
for (const f of ["charter.md", "proposals.json", "expected_verdicts.json"]) {
  if (!existsSync(join(ROOT, "data", "fixtures", f))) failures.push(`missing fixture: data/fixtures/${f}`);
}

// 3. Check .env is not committed
if (existsSync(join(ROOT, ".env"))) {
  failures.push(".env present in repo root — confirm it is gitignored and never committed");
}

// 4. Check components exist
const componentsDir = join(ROOT, "src", "components");
if (existsSync(componentsDir)) {
  const components = readdirSync(componentsDir).filter((f) => f.endsWith(".tsx"));
  if (components.length < 5) {
    failures.push(`Only ${components.length} components found — expected ≥5 for the Deliberation Chamber`);
  }
  console.log(`✓ ${components.length} components: ${components.join(", ")}`);
} else {
  failures.push("src/components/ directory missing");
}

// 5. Check core modules exist
for (const f of ["demo.ts", "types.ts", "quorum.ts", "transcript.ts", "execute.ts", "multisig.ts"]) {
  if (!existsSync(join(ROOT, "src", "core", f))) failures.push(`missing core module: src/core/${f}`);
}

// 6. Check agent modules exist
for (const f of ["council.ts", "roles.ts"]) {
  if (!existsSync(join(ROOT, "src", "agents", f))) failures.push(`missing agent module: src/agents/${f}`);
}

// 7. Check contract exists
if (!existsSync(join(ROOT, "contract", "src", "conclave.rs"))) {
  failures.push("missing contract: contract/src/conclave.rs");
}

// 8. Check store exists
if (!existsSync(join(ROOT, "src", "lib", "store.ts"))) {
  failures.push("missing store: src/lib/store.ts");
}

// Report
if (failures.length) {
  console.error(`\n✗ Submission NOT ready (${failures.length} issues):\n - ${failures.join("\n - ")}`);
  process.exit(1);
}
console.log("\n✓ All submission readiness checks passed.");
