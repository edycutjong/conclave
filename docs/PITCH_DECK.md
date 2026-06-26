# Conclave 🏛️ — Pitch Deck

> *Agentic governance that reads the contract before it signs.*

---

## Slide 1: Title & Hook

**CONCLAVE 🏛️**
*Agentic governance that reads the contract before it signs.*

Part of the **Vouch** suite — Conclave · Verity · Bastion

**Speaker Notes:** Open with authority. "What if your DAO had a council of AI agents that actually *read* the smart contract before voting? That's Conclave." Pause. Let it land.

---

## Slide 2: The Problem

**DAOs are governed by voters who don't read the code.**

- 78% of DAO proposals pass with < 5% voter turnout
- Token holders vote on sentiment, not contract analysis
- Unverified contract executions drain treasuries
- No grounding in actual on-chain state before voting

**Speaker Notes:** "The biggest lie in Web3 is 'decentralized governance.' In reality, a handful of whales click approve without reading a single line of Solidity. The result? DAO treasuries hemorrhage millions."

---

## Slide 3: The Solution

**A council of AI agents that debates every proposal, grounded in live Casper state.**

Three role agents (Risk, Treasury, Legal) + an Arbiter:
1. **Grounded reads** — MCP queries real Casper account state
2. **Cross-examination** — agents challenge each other's reasoning
3. **Deterministic baseline** — `reconcile()` provides a math-provable floor
4. **Human veto window** — 45 seconds for a human to override
5. **On-chain execution** — approved transfers execute via casper-js-sdk

**Speaker Notes:** "Conclave doesn't replace human governance — it gives it teeth. The AI council does the due diligence that token holders won't."

---

## Slide 4: Core Product Flow

```
Proposal Submitted
  → Risk Agent analyzes (Haiku 4.5)
  → Treasury Agent analyzes (Haiku 4.5)
  → Legal Agent analyzes (Haiku 4.5)
  → Arbiter reconciles (Opus 4.8)
  → Human Veto Window (45s)
  → On-chain Execute (casper-js-sdk)
```

**Speaker Notes:** Walk through the Deliberation Chamber UI. Show the three agent columns filling in real-time, the Arbiter verdict appearing, and the veto countdown.

---

## Slide 5: Technical Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind v4 |
| AI Council | Claude Opus 4.8 (Arbiter) + Haiku 4.5 (Roles) |
| Chain Reads | Casper MCP Server (msanlisavas/casper-mcp) |
| Chain Writes | casper-js-sdk (TransactionV1) |
| Contract | Odra (Rust) — submit, verdict, approve, veto, execute |
| History | CSPR.cloud REST/Streaming |

**Speaker Notes:** Emphasize the hybrid architecture — AI reasoning OFF-chain, execution ON-chain. The contract enforces quorum even if the AI is wrong.

---

## Slide 6: Live Demo Highlights

What judges must see:
1. **Deliberation Chamber** — 3 agent columns fill with grounded reasoning
2. **What-If Composer** — type any proposal, watch the council debate it
3. **Veto Bar** — 45-second countdown with human override
4. **On-chain proof** — real Testnet transactions in the explorer

**Speaker Notes:** "Open the live demo. Type a proposal like 'Transfer 500 CSPR to marketing.' Watch the council tear it apart in real-time."

---

## Slide 7: Casper Integration (Sponsor Stack)

| Casper Tool | How We Use It |
|---|---|
| **Odra Framework** | Governance contract (submit → verdict → approve → execute) |
| **casper-js-sdk** | TransactionV1 signing + broadcasting |
| **Casper MCP Server** | Real-time account balance queries for grounded reasoning |
| **CSPR.cloud REST** | Historical transaction data for agent context |
| **CSPR.cloud Streaming** | Live state change monitoring |

**Speaker Notes:** "We're not just using Casper — we're using *five* different Casper integration points. The AI council literally reads the chain before it votes."

---

## Slide 8: Live Testnet Proof

| Item | Evidence |
|---|---|
| Contract | `hash-0b7fcb9879f8a6fd5dd07f104bf5e74ace7c1a9b3c375c902fbf0bc044248e79` |
| Install TX | `03c6b2...bbbd6f6` |
| submit_proposal | `6cc8d4...593232` |
| record_verdict | `e7b6f2...c699c4` |
| approve | `b45648...2ef1b` |

All transactions verifiable on testnet.cspr.live.

**Speaker Notes:** "This isn't a mock. Click any of these transaction hashes — they're real Casper Testnet transactions. The AI council's governance decisions are recorded on-chain."

---

## Slide 9: Competitive Edge

| Feature | Traditional DAOs | Conclave |
|---|---|---|
| Voter analysis | Token-weighted sentiment | AI-grounded reasoning |
| Contract verification | Manual audit (if any) | Automated MCP reads |
| Execution safety | Trust the proposer | Deterministic baseline + veto |
| Transparency | Vote counts | Full reasoning transcript |

**Speaker Notes:** "Every other DAO governance tool is a voting widget. Conclave is the only system where AI agents actually *understand* what they're approving."

---

## Slide 10: Roadmap

| Timeline | Milestone |
|---|---|
| **Now** | Working prototype on Casper Testnet |
| **30 days** | Multi-round deliberation, agent memory |
| **60 days** | Mainnet deployment, real token treasury |
| **90 days** | Cross-chain MCP reads (Ethereum, Solana) |

**Speaker Notes:** "The foundation is built. The next step is making the agents smarter — multi-round debates where they can request more data and challenge each other."

---

## Slide 11: Team

**Edy Cu** — Solo developer, AI-native build methodology

- 60+ hackathon projects shipped
- Full-stack: Rust contracts + Next.js dashboards + AI agents
- Built the entire Vouch suite (3 projects) for this buildathon

**Speaker Notes:** "One developer, three production-grade projects, all with live Testnet contracts. That's the power of AI-native development."

---

## Slide 12: Conclusion

> **"Your DAO deserves a council that reads the code."**

🏛️ Conclave — Agentic governance that reads the contract before it signs.

Part of the **Vouch** suite:
- **Conclave** — Governance
- **Verity** — Oracle reputation
- **Bastion** — ZK compliance

**Speaker Notes:** End strong. "If you trust AI to write your code, why not trust it to *review* your governance proposals? That's Conclave." Pause. "Thank you."
