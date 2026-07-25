# Conclave — "Why ONLY Casper" Defense Brief

> Every row maps to code in this repo. Where agent grounding is a deterministic
> fact layer (not a live on-chain read) we say so — Conclave's edge is a
> quorum-guarded, audited execution path on Casper driven by a multi-agent council.

| # | Casper capability | Used for | Code location | Without it you'd need |
|---|---|---|---|---|
| 1 | **Odra quorum contract** (`approve` per registered signer + threshold-guarded `execute` + on-chain transcript hash) | Turns "the council agreed" into an on-chain fact — `execute` refuses to fire below quorum | `contract/src/conclave.rs` | A custom multisig + signature store + audit ledger |
| 2 | **casper-js-sdk** (`ContractCallBuilder.byPackageHash` → `sign` → `RpcClient.putTransaction`) | The Executor signs & broadcasts `submit_proposal` / `record_verdict` / `approve` / `execute` | `src/lib/casper.ts`, `src/core/execute.ts` | A bespoke keypair / deploy / RPC-broadcast pipeline |
| 3 | **Anthropic SDK** (Claude Opus 4.8 Arbiter + Haiku 4.5 role agents, structured outputs) | The multi-agent council itself | `src/agents/llm.ts`, `src/lib/anthropic.ts` | A hand-rolled tool/schema orchestration layer |
| 4 | **Casper read surface** (MCP / CSPR.cloud schema: `GetAccountBalance`, `GetContract`, …) | The tool schema the agents' fact layer maps to | `src/agents/tools/mcp.ts` | A bespoke RPC indexer + tool schemas |

## The argument
Conclave is **agentic on-chain governance with a provable audit trail**. The council
of Claude agents (Risk, Treasury, Legal) debate a proposal and an Arbiter reconciles
them; the **Odra contract** then turns "three agents agreed" into an on-chain fact —
`approve` records each registered signer's approval and `execute` refuses to fire
below quorum — and **casper-js-sdk** is the JS-native signing path that lets the
council *execute*, not just opine, landing the transcript hash on-chain as an
immutable audit trail. The agents debate off-chain; the load-bearing steps —
quorum-guarded execution and audit — are real Casper calls backed by confirmed
Testnet transactions (see the README on-chain table).

**Take Casper out and you'd need:** a bespoke deploy/broadcast pipeline and a
hand-rolled on-chain governance/audit ledger with its own quorum logic — Odra gives
us the quorum-guarded executor *and* the audit ledger in one contract.

## Honest limitations (stated plainly)
- **Agent grounding is a deterministic fact layer, not a live read.** By default (and
  in the demo) agents cite figures from a fact layer seeded from on-chain fixtures
  (`src/core/whatif.ts` `deriveFacts`) — treasury balance, known counterparties, and
  limits. They can't invent numbers, but they also aren't reading live balances on
  every call. Wiring the Casper read surface (`agents/tools/mcp.ts` / CSPR.cloud REST)
  into the live deliberation path is **roadmap**; the MCP badge reflects the tool
  schema we map to, not a live MCP server in the default flow.
- **Execution uses casper-js-sdk directly** (a PEM-key signer on the backend). There
  is no `CSPR.click` or `casper-eip-712` dependency.
- **Silent-fallback honesty:** with no `ANTHROPIC_API_KEY`, the council falls back to
  the deterministic engine and the transcript's `model` field reads `demo-mode` — the
  fallback is detectable, not hidden.
- Odra contracts are Rust (our heaviest lift); we scope the contract to the minimum
  (proposal record + threshold-guarded execute + signer registry + transcript hash).
