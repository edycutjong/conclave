# Conclave — Product Requirements Document

> Part of the **Vouch** suite (Conclave · Verity · Bastion) for the Casper Agentic Buildathon 2026. **Flagship — build & ship first.**

## Emotional Hook (first line)
*A DAO treasurer wakes to find a $40,000 proposal passed at 2 a.m. with 4% turnout — nobody read the contract it called, and the funds are already gone.*

## Problem Statement
On-chain governance is broken at exactly the moment it matters. Voter apathy means most proposals pass (or die) on a handful of under-informed votes; almost no one reads the *actual* contract call a proposal executes; and there's no structured risk, treasury, or legal review before real money moves. The result is treasury drains, governance attacks, and decisions no human actually scrutinized. A single "AI summarizer" bolted onto a forum doesn't fix this — one confident opinion is as dangerous as zero.

## Solution Overview
Conclave convenes a **council of specialized AI agents** that deliberate over every DAO proposal *before* it executes, then carry the approved decision on-chain themselves:
- **Risk Agent** — models attack surface, parameter blast-radius, precedent.
- **Treasury Agent** — checks live balances, runway, and concentration via on-chain reads.
- **Legal/Charter Agent** — tests the proposal against the DAO's charter and prior rulings.
- **Arbiter** — reconciles the debate into a verdict + confidence, under a quorum rule.

The agents read real chain state through the **Casper MCP server**, assemble their approvals into an off-chain **quorum consensus**, and — after a human **veto window** — execute the approved transaction via `casper-js-sdk` (the CSPR.click AI Agent Skill) against an **Odra governance contract** on Casper Testnet, which enforces the quorum threshold on-chain (`approve` / threshold-guarded `execute`). The full transcript is hashed on-chain for an immutable audit trail. *(The hosted MCP `AwaitingDeploy` multisig helpers are 403-gated on free-tier keys and not used — the contract does multisig natively.)* The visible disagreement between agents *is* the trust mechanism — and the demo.

## DeFi / RWA framing (why this is a DeFi project, not just governance)
Conclave reviews and executes **DeFi treasury actions** — the proposals it deliberates over are concretely financial: reallocating treasury into a lending pool or LP position, changing a protocol risk parameter (LTV, fee, cap), moving funds between vaults, or paying a vendor in CSPR/CEP-18/RWA-backed tokens. Its agents read live DeFi state (balances, pool params, runway) and the executed transaction *is* a DeFi action on Casper. So Conclave sits squarely in the "Agentic AI × DeFi" emphasis: it's autonomous risk/treasury management for on-chain capital, with governance as the control surface.

## Target Users
- **Primary:** Casper-ecosystem DeFi protocols and DAOs with real treasuries deciding allocations, parameter changes, and vault moves under low, under-informed voter turnout.
- **Secondary:** Multisig treasuries / DAO tooling teams who want an autonomous DeFi "review layer" that still keeps a human kill-switch.

## The ONE core flow (narrow + deep)
> **A proposal arrives → Risk/Treasury/Legal agents read live chain state and debate → Arbiter reaches a quorum verdict → approvals assembled into an off-chain consensus → human veto window → the Executor signs the real Testnet transaction (Odra `execute`, quorum-guarded on-chain) → transcript hash recorded on-chain, deploy hash shown on the explorer.**

## Core Features (MVP)
1. **Proposal intake** — paste/submit a proposal (target contract, entrypoint, args, rationale).
2. **Live-state grounding** — agents pull treasury balances, contract entrypoints, and history via Casper MCP + CSPR.cloud (no hallucinated numbers).
3. **Multi-agent deliberation** — three role-specialized agents argue; each can re-query chain state; an Arbiter applies the quorum rule.
4. **Quorum approval** — the orchestrator assembles role-agent approvals into an off-chain consensus; the **Odra contract enforces the quorum threshold on-chain** (`approve` + threshold-guarded `execute`). *(The hosted MCP `AwaitingDeploy` helpers are 403-gated on free-tier keys and unused.)*
5. **Human veto window** — a countdown before execution; one click aborts.
6. **Autonomous execution** — CSPR.click signs/sends the approved `TransactionV1` to the Odra governance contract.
7. **Immutable audit** — the deliberation transcript is hashed and written on-chain alongside the executed deploy hash.

## User Stories
- *As a DeFi protocol treasurer,* I submit "move 25k CSPR into Lending Pool Z." The Treasury Agent flags it's 38% of liquid runway; the Risk Agent notes Pool Z is a fresh, low-TVL contract with no track record; the Arbiter returns **APPROVE-WITH-CONDITION (cap 10k)** at 0.62 confidence — and I see exactly why before anything signs.
- *As a council member,* I open the transcript six months later and verify, from the on-chain hash, that the executed decision matches what the agents actually argued.

## Success Metrics
- **≥1 real Testnet transaction** per executed proposal, with a public `cspr.live` deploy hash (hard-gate requirement).
- **Grounding accuracy:** 100% of treasury/contract figures cited by agents trace to a real MCP/CSPR.cloud read (verify script).
- **Veto safety:** 100% of executions blocked when the veto is clicked (tested).
- Deliberation latency published (p50/p95) on stated hardware.

## Out of Scope
- Token-weighted human voting UI (Conclave reviews + executes; it doesn't replace token voting rails).
- >4 agents or external tool-use beyond chain reads + the one execution path (MVP).
- Cross-chain governance; mainnet deployment (Testnet only for the round).
- x402 is **optional/stretch** here (premium risk-data feed) — deliberately *not* load-bearing, since Conclave's edge is low x402 dependency.

## Honest Limitations
- Agent reasoning is bounded by the LLM; the Arbiter reduces but cannot eliminate bad calls — hence the **mandatory human veto window** before any execution.
- The hosted MCP `AwaitingDeploy` multisig helpers are **access-restricted (HTTP 403 on free-tier CSPR.cloud keys, confirmed against the MCP test suite)** and are **not used**. On-chain quorum is instead enforced by our own **Odra contract** (`approve` + threshold-guarded `execute`, tested); at runtime the orchestrator collects approvals off-chain and a single Executor signs via `casper-js-sdk`.
- Conclave assumes the proposal's target contract/entrypoint is supplied; it reviews and executes, it does not author arbitrary contracts.
