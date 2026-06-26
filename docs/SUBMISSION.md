# Conclave — Submission Copy

## Project title
**Conclave — agentic governance that reads the contract before it signs** (a Vouch project)

## Emotional Hook (first line)
A DAO treasurer wakes to find a $40,000 proposal passed at 2 a.m. with 4% turnout — nobody read the contract it called, and the funds are already gone.

## Short description (≤150 chars)
A council of AI agents debates every DAO proposal, grounds it in live Casper state, and executes the approved tx on-chain — with a human veto.

## Long description (~500 words)
On-chain governance fails at the moment it matters most. Voter turnout is tiny, almost nobody reads the actual contract call a proposal executes, and there is no structured risk, treasury, or legal review before real money moves. The result is predictable: treasury drains, governance attacks, and decisions no human ever truly scrutinized.

**Conclave** convenes a council of specialized AI agents that deliberate over every proposal *before* it executes — and then carry the approved decision on-chain themselves. A **Risk Agent** models attack surface and counterparty history. A **Treasury Agent** checks live balances, runway, and concentration. A **Legal/Charter Agent** tests the proposal against the DAO's charter. An **Arbiter** reconciles the debate under a quorum rule into a verdict with a calibrated confidence score.

Crucially, the agents don't guess. They read real chain state through the **Casper MCP server** — every balance and contract entrypoint they cite is a live Testnet read, shown as a tool-call chip in the UI. When the council reaches quorum, the orchestrator assembles the agents' approvals into an off-chain consensus. Then a **human veto window** opens — a real kill-switch, always visible. If no one objects, a single **Executor** signs and broadcasts the approved `TransactionV1` via `casper-js-sdk` against our **Odra** governance contract on Casper Testnet — which enforces the quorum threshold on-chain (`approve` / threshold-guarded `execute`) — and the full deliberation transcript is hashed on-chain for an immutable audit trail. *(The hosted MCP `AwaitingDeploy` multisig helpers are 403-gated on free-tier keys and not used — the Odra contract does multisig natively.)*

In our demo, a proposal to send 25,000 CSPR to an unknown vendor doesn't get rubber-stamped — the Treasury Agent flags it as 38% of runway, the Risk Agent flags a zero-history counterparty, the Legal Agent flags a charter breach, and the Arbiter **changes the outcome** to a capped 10,000 CSPR pilot. A separate proposal that tries to add a `mint_to(self)` entrypoint is caught and **rejected**. Every number traces to a real read; every execution is a real deploy hash on `cspr.live`.

Conclave is the flagship of **Vouch**, a trust layer for the agent economy on Casper. It's agent *autonomy* with agent *accountability*: the agents do the work 24/7, the chain holds the record, and the human keeps the final no.

## Why ONLY Casper (cites specific features)
Conclave uses **4 working Casper capabilities**: Casper MCP read tools (`GetAccountBalance`, `GetContractEntryPoints`, `GetDeploy`) for grounding; `casper-js-sdk` `TransactionV1` (via the CSPR.click AI Agent Skill) for autonomous execution; an **Odra** contract for the governance object, **on-chain quorum multisig** (`approve` per signer + threshold-guarded `execute`), and the transcript hash; and CSPR.cloud for treasury history. The hosted MCP `AwaitingDeploy` multisig helpers are **403-gated on free-tier keys and unused** — the contract does multisig natively. **Take Casper out and you'd need four separate systems** — an RPC indexer, a deploy/broadcast pipeline, an archival indexer, and a hand-rolled on-chain governance/audit ledger — none of which give you the immutable audit trail for free. *Honest limitation:* the MCP server is read-mostly (it doesn't broadcast txs), and we keep native x402 optional since it's launching mid-event.

## Demo video script
See `DEMO.md` (≤3 min).

## DeFi applicability
The proposals Conclave reviews and executes are **DeFi treasury actions** — pool/LP allocations, risk-parameter changes (LTV, fee, cap), vault moves, token payouts. Agents read live DeFi state and the executed transaction is itself a DeFi action, placing Conclave in the "Agentic AI × DeFi" emphasis: autonomous risk/treasury management for on-chain capital, with governance as the control surface.

## Track / category
Casper Innovation Track — build direction **#3 Multi-Agent DAO Governance & Execution** (applied to DeFi treasury management).

## On-chain proof
Odra governance contract on Casper Testnet; every executed proposal links to a `testnet.cspr.live/deploy/<hash>`. Contract address + deploy hashes in README.

## Honest limitation
Agent reasoning is bounded by the LLM and the Arbiter can still err — which is exactly why execution is gated behind a mandatory human veto window, and why we publish confidence rather than pretending certainty.

## Sign-off
Thank you for taking the time to review Conclave. — Edy, building Vouch on Casper.
