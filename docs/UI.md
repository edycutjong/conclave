# Conclave — UI / Design

## Design language
Dark "war-room" aesthetic — a council chamber. Deep slate background, one accent per agent (Risk = amber, Treasury = teal, Legal = violet, Arbiter = white), monospace for chain data. The emotional beat is *watching reasoned disagreement resolve into a signed action.*

## Screens

### 1. Proposal Intake (hero)
- Single card: target contract, entrypoint, args, rationale (or "paste proposal").
- Big primary button: **Convene the Council**.
- Below: the seeded demo proposals as one-click chips (P1 clean / P2 headline / P3 attack).

### 2. The Deliberation Chamber (the money screen)
```
┌──────────────────────────────────────────────────────────┐
│  PROPOSAL #2  Transfer 25,000 CSPR → vendor-x             │
│  ● live   veto in 00:42                       [ VETO ]    │
├───────────────┬───────────────┬──────────────────────────┤
│ ⚠ RISK        │ ◆ TREASURY    │ § LEGAL                   │
│ vendor-x: 0   │ liquid 66,120 │ charter §3: 10k cap       │
│ deploys, new  │ 25k = 38% of  │ → BREACH (needs 2nd vote) │
│ acct → HIGH   │ runway → CAP  │                           │
├───────────────┴───────────────┴──────────────────────────┤
│ ⚖ ARBITER  APPROVE-WITH-CONDITION  cap 10,000  conf 0.62 │
│ "Counterparty unproven + charter cap → fund capped pilot" │
├──────────────────────────────────────────────────────────┤
│ quorum: ●●○ (2/3 approvals — off-chain consensus)       │
│ [ Execute capped transfer ]   tx → cspr.live/deploy/...   │
└──────────────────────────────────────────────────────────┘
```
- Each agent column streams its reasoning (SSE) with the **MCP tool-call chips** it used ("read GetAccountBalance →"), so grounding is visible.
- Arbiter verdict animates in once quorum is reached; a confidence dial (0–1).
- **Veto countdown** is always visible and prominent — the human kill-switch is a feature, not fine print.
- On execute: a real `cspr.live` deploy-hash link + the on-chain transcript-hash link.

### 3. Audit / Transcript
- Full debate transcript, the `transcript_hash`, and a "verify hash" button that recomputes it client-side and matches it to the on-chain value.
- History of past conclaves with verdicts + deploy hashes.

## Mobile
- Chamber collapses to a vertical stack (Risk → Treasury → Legal → Arbiter) with the veto bar pinned to the bottom. Optimized so a 30-second vertical clip reads instantly for CSPR.fans community voting.

## Component list
`ProposalCard`, `ConveneButton`, `AgentColumn` (streaming, tool-call chips), `ArbiterVerdict` (confidence dial), `VetoBar` (countdown), `QuorumMeter`, `DeployHashLink`, `TranscriptHashVerifier`, `ConclaveHistory`.

## Assets to generate (manual, post-spec)
Hero image of a glowing circular council table with three colored seats + one white seat; OG image with the tagline "Governance that reads the contract before it signs."
