# Conclave — Build Plan (flagship, demo-first)

> Sequence rule (from the Vouch strategy): **ship Conclave end-to-end and submit it before touching Verity/Bastion.** ~5 focused build-days; the round runs to **June 30, 2026**.

## Priority order = demo path first
Build the exact sequence the judge will see, earliest. Nothing that isn't on the demo path is "must-have."

### Day 1 — On-chain spine (prove a real tx exists)
- `cargo odra new conclave`; write the minimal governance contract (`submit_proposal`, `record_verdict`, `execute` threshold-guarded, `veto`, views).
- Deploy to Casper **Testnet**; fund treasury from faucet (~66k CSPR) + seed a CEP-18 test token.
- Install the **CSPR.click AI Agent Skill**; prove **one** manual `TransactionV1` transfer from the treasury → real `cspr.live` deploy hash. **(Hard gate cleared on Day 1.)**

### Day 2 — Reads + grounding
- Run the **Casper MCP** server (Docker); wire its read tools (`GetAccountBalance`, `GetAccountInfo`, `GetContract`, `GetContractEntryPoints`, `GetDeploy`) as LLM tools.
- `scripts/seed.ts` — deterministic fixtures (treasury, vendor-x, charter, 3 proposals).
- `scripts/verify_grounding.ts` — re-runs cited reads and diffs.

### Day 3 — The council
- Three role agents (Risk/Treasury/Legal, Haiku 4.5) with distinct system prompts + shared retrieved context; each can re-query MCP.
- **Arbiter** (Opus 4.8) with the quorum rule → verdict + confidence.
- Off-chain approval consensus → on quorum, the Executor signs `execute` via `casper-js-sdk`; the **Odra contract enforces quorum on-chain** (`approve` + threshold-guarded `execute`). ⚠️ The hosted MCP `AwaitingDeploy` helpers are 403-gated on free-tier keys — not used.

### Day 4 — UI + the wow
- Deliberation Chamber (SSE streaming, tool-call chips, confidence dial, **veto countdown**, quorum meter, deploy-hash link).
- Proposal intake + seeded chips; transcript + on-chain hash verifier.
- End-to-end run of P1/P2/P3.

### Day 5 — Proof, polish, submit
- `scripts/bench.ts` (deliberation p50/p95), `scripts/check_submission_readiness.ts`.
- Deploy frontend to Vercel; README with test count + architecture; record the ≤3-min demo (see `DEMO.md`).
- Socials in place (X handle for Vouch). Submit on DoraHacks; post for CSPR.fans community votes.

## Must-have vs nice-to-have
| Must-have (demo path) | Nice-to-have |
|---|---|
| Real Testnet execute tx + deploy hash | x402 premium risk-data feed (stretch) |
| 3 agents + Arbiter verdict | 4th agent / configurable quorum UI |
| Live MCP grounding (no fake numbers) | Token-weighted human voting overlay |
| Human veto window | Multi-DAO templates |
| On-chain transcript hash + verifier | Slack/Discord proposal intake |

## Mandatory deliverables
- `scripts/bench.ts` — deliberation latency p50/p95.
- `scripts/verify_grounding.ts` — proves cited numbers are real reads.
- `scripts/check_submission_readiness.ts` — fails on placeholder fields / missing deploy hash.
- `DEMO.md` (done), `ARCHITECTURE.md` (done), landing page (Vercel).

## Kill-switch checkpoints
- **End of Day 1:** if no real Testnet tx, stop and fix before anything else.
- **End of Day 3:** if the council can't produce P2's capped verdict deterministically, cut to 2 agents + Arbiter and document it.
- Only start **Bastion** once Conclave is submitted.
