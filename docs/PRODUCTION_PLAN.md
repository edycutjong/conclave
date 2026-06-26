# Conclave — Proof-of-Production Plan

## Live URL
- **Frontend:** `https://conclave-vouch.vercel.app` (Vercel).
- **Demo mode:** seeded proposals run against live Casper Testnet — anyone can reproduce the deploy hash.

## On-chain deployment (the hard gate)
- **Network:** Casper **Testnet** (`casper:casper-test`). Mainnet is out of scope for the qualification round; we deploy real Testnet transactions (the round requires Testnet + a transaction-producing component).
- **Contract:** Odra governance contract — address published in README.
- **Transactions produced per executed proposal:**
  1. `execute` → real treasury transfer (CSPR or CEP-18) — the headline deploy hash.
  2. `record_verdict` → writes the transcript hash on-chain.
- **Explorer:** every tx linked on `https://testnet.cspr.live/deploy/<hash>`.

## Published artifacts
- **npm:** `@vouch/conclave-mcp-tools` — the TS wrappers binding Casper MCP read tools + CSPR.click execution into an agent-tooling kit (reusable by Verity/Bastion → proves the shared spine).
- **GitHub:** open-source repo, MIT, with `cargo-odra` contract + setup scripts.

## Test targets
- **≥60 tests** total; counted in README ("N tests — vitest + cargo test").
  - Contract: Odra unit tests for `execute` threshold guard, veto lock, double-execute prevention.
  - Orchestrator: quorum logic, grounding (cited read == real read), veto abort.
- **Coverage:** ≥70% on orchestrator core.

## Benchmark
- `scripts/bench.ts` → deliberation latency p50/p95/mean over N runs of the seed proposals, on stated hardware. No "instant" claims.

## Verify
- `scripts/verify_grounding.ts` → re-executes every MCP read an agent cited and diffs the numbers; exits non-zero on any mismatch.
- `scripts/check_submission_readiness.ts` → fails if the published deploy hash, contract address, or test count is a placeholder.

## Long-term / impact
- Conclave ships as the first product of **Vouch** (the agent trust layer). Roadmap: configurable quorum policies, real token-vote integration, mainnet, and a reusable "council-as-a-service" SDK other Casper DAOs install.
- Socials: X/@VouchOnCasper, landing page, 6-month roadmap in README (per "Long-Term Launch Plans" criterion).
