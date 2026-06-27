# Conclave — Architecture

## Tech stack (optimized for solo speed + the verified Casper surface)
- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4. Deployed to Vercel.
- **Agent orchestrator:** Node/TypeScript service (Next.js Route Handlers + a long-running worker). LLM tool-calling via the Anthropic SDK (Claude) — `claude-opus-4-8` for the Arbiter, `claude-haiku-4-5` for the three role agents (cheap, parallel) with prompt caching.
- **Chain reads:** **Casper MCP server** (`msanlisavas/casper-mcp`, C#/.NET, run via Docker) exposed to the agents as tools; **CSPR.cloud** REST/streaming for history.
- **Signing/execution:** **casper-js-sdk** with a locally loaded PEM key (`Keys.Ed25519.loadKeyPairFromPrivateFile(ORCHESTRATOR_KEY_PATH)`). Agents sign `TransactionV1` payloads autonomously — no browser wallet popup. CSPR.click is used only for the **frontend** human veto panel.
- **On-chain:** one **Odra** (Rust) governance contract on Casper **Testnet** (`casper:casper-test`).
- **State:** in-memory server-side store (`src/lib/store.ts`, a Next.js singleton seeded from fixtures) tracking the full deliberation lifecycle; the immutable record lives on-chain (transcript hash) — no external DB.

## Why these models (domain justification)
- **Arbiter = Claude Opus 4.8** — the reconciliation step must weigh conflicting expert arguments and emit a calibrated confidence; a small model collapses nuance into a coin-flip verdict.
- **Role agents = Claude Haiku 4.5** — three of them run in parallel each turn; they're narrow (one lens each) and grounded by MCP reads, so a fast model is enough and keeps deliberation latency demoable.
- A single generic mid model for everything would either be too slow (×3 role calls) or too shallow for the Arbiter — the split is deliberate.

## System architecture (Mermaid)
```mermaid
flowchart TD
    U[DAO member] -->|submit proposal| FE[Next.js UI]
    FE --> ORC[Agent Orchestrator (TS worker)]
    subgraph Council
      RA[Risk Agent]
      TA[Treasury Agent]
      LA[Legal/Charter Agent]
      AR[Arbiter]
    end
    ORC --> RA & TA & LA
    RA & TA & LA --> AR
    RA & TA & LA -->|read state| MCP[Casper MCP Server]
    TA -->|history| CLOUD[CSPR.cloud APIs]
    MCP --> TN[(Casper Testnet)]
    AR -->|verdict + quorum| MS[Approval Consensus off-chain]
    MS --> VW{Human Veto Window}
    VW -->|not vetoed| EX[Executor casper-js-sdk]
    EX -->|TransactionV1 sign+send| GOV[Odra Governance Contract]
    GOV --> TN
    AR -->|transcript hash| GOV
    FE -->|deploy hash link| EXP[cspr.live explorer]
```

## The Odra governance contract (minimal, Rust)
Entrypoints (kept intentionally small — this is the only Rust we write):
- `submit_proposal(target, entrypoint, args_hash, rationale_hash) -> proposal_id`
- `record_verdict(proposal_id, verdict, confidence_bps, transcript_hash)` — writes the council's decision + an immutable hash of the full transcript.
- `approve(proposal_id)` — collects one council signer's approval **on-chain** (deduped per signer); emits `Approved`. This is Conclave's native multisig — the hosted MCP `AwaitingDeploy` helpers are 403-gated on free-tier keys and unused.
- `execute(proposal_id)` — **threshold-guarded**; only fires the stored target call if approvals ≥ quorum and not vetoed. Emits a `Decided` event.
- `veto(proposal_id)` — owner/guardian only; locks execution.
- Views: `get_proposal`, `get_verdict`.
- Holds a small **Testnet treasury** (CSPR + a CEP-18 test token) so `execute` produces a real transfer transaction.

## API endpoints (Next.js Route Handlers)
- `POST /api/proposals` — create a proposal, kick off deliberation.
- `GET /api/proposals/:id` — proposal + live deliberation transcript (SSE stream).
- `POST /api/proposals/:id/veto` — abort within the window.
- `POST /api/proposals/:id/execute` — finalize (called automatically when veto window closes; manual override for demo).
- `GET /api/health/airgap` — sanity/telemetry (outbound call log).

## Data flow guarantees
- **No hallucinated numbers:** every balance/entrypoint an agent cites carries the MCP tool-call id it came from; the verify script re-runs those reads and diffs.
- **Determinism for demo:** seed proposals + a fixed model temperature for the recorded run (see `SEED_DATA.md`).
- **Audit:** `transcript_hash = sha256(canonical_transcript)`; the same canonicalization is reproducible client-side to verify the on-chain hash.

## Key libraries / SDKs
`casper-js-sdk` (PEM-key signing), Casper MCP (Docker, reads), CSPR.cloud SDK/REST, CSPR.click (frontend veto panel only), Odra + `cargo-odra`, Anthropic SDK, Next.js 16, Tailwind CSS v4.

## Boilerplate
Start from `npx create-next-app` (no boilerplates.json match for Casper governance). Add the CSPR.click skill per its `SKILL.md`, and scaffold the contract with `cargo odra new`.
