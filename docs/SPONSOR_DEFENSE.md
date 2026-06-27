# Conclave — "Why ONLY Casper" Defense Brief

> Every capability below was verified against the local `crawl/` source, not assumed from idea briefs. See `../../RESEARCH.md` and the toolkit verification notes.

| # | Casper capability | Used for | Code location | Without it you'd need |
|---|---|---|---|---|
| 1 | **Casper MCP — read tools** (`GetAccountBalance`, `GetContract`, `GetContractEntryPoints`, `GetDeploy`, `GetAccountDeploys`) | Agents ground every claim in live chain state | `agents/tools/mcp.ts` | A bespoke RPC indexer + hand-rolled LLM tool schemas |
| 2 | **Odra on-chain quorum multisig** (`approve` per signer + threshold-guarded `execute`) — *the hosted MCP `AwaitingDeploy` helpers are 403-gated on free tier and unused* | Enforce the council's approval threshold on-chain before any transfer fires | `contract/src/conclave.rs` | A custom multisig collection service + signature store |
| 3 | **CSPR.click AI Agent Skill** (`casper-js-sdk` `TransactionV1`, `sign()`, `send()`) | Autonomously sign + broadcast the approved execution | `core/execute.ts` | A custom keypair/deploy pipeline + RPC broadcast layer |
| 4 | **Odra framework** (governance + execution contract, transcript-hash storage) | The on-chain object the council acts through + audit trail | `contract/src/conclave.rs` | A raw WASM contract written by hand against the FFI |
| 5 | **CSPR.cloud APIs** (REST history / streaming) | Proposal history, treasury time-series for the Treasury Agent | `agents/tools/cloud.ts` | A self-hosted archival node + indexer |

## The argument
Conclave is **agentic on-chain governance with a provable audit trail** — and it only works because Casper ships the *exact* primitives the flow needs. The Casper MCP server is the difference between agents reasoning over real balances vs. hallucinating them; our **Odra contract** turns "three agents agreed" into an on-chain fact — `approve` records each signer's approval and `execute` refuses to fire below quorum; `casper-js-sdk` (the CSPR.click skill) is the JS-native signing path that lets the council *execute*, not just opine; and Odra is also the governance object they act through and the ledger the transcript hash lands in. The agents debate and reach consensus off-chain, but the load-bearing steps — grounding, quorum-guarded execution, and audit — are real Casper calls. *(The hosted MCP `AwaitingDeploy` helpers are 403-gated on free-tier keys and not used.)*

**Take Casper out and you'd need:** a custom RPC indexer, a bespoke deploy/broadcast pipeline, a self-hosted archival indexer, and a hand-rolled on-chain governance/audit ledger with its own quorum logic — external systems each re-implementing something Casper exposes natively (Odra gives us the quorum-guarded executor *and* the audit ledger in one contract), none of them giving you the immutable audit trail for free.

## Honest limitations of the Casper tooling
- The MCP server is **read-mostly**; it does not broadcast arbitrary transactions — execution routes through `casper-js-sdk` (the CSPR.click skill on the frontend; a PEM-key signer on the backend). We treat that split as a feature (reads vs. signing are cleanly separated), and document it rather than implying MCP "does everything."
- The MCP **multisig helpers** (`AwaitingDeploy` family) are **access-restricted — HTTP 403 on free-tier CSPR.cloud keys** (confirmed by `IntegrationTests.cs: GetAwaitingDeploy_AccessRestricted_Throws`) and are **not used**. On-chain quorum is enforced by our own Odra contract (`approve` + threshold-guarded `execute`, tested); at runtime approvals are collected off-chain and a single Executor signs. We do **not** rely on the MCP multisig helpers.
- Native x402 is **launching during the event (June 2026)** and is Go-first; Conclave therefore keeps x402 *optional* and does not make the core governance loop depend on brand-new infrastructure.
- Odra contracts are Rust — our heaviest lift; we scope the on-chain contract to the minimum (proposal record + threshold-guarded execute + transcript hash) and keep intelligence in the agent layer.
