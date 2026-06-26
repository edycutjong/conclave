# Conclave — Seed Data Design

## The ONE devastating demo proposal
> **"Transfer 25,000 CSPR from the treasury to account `vendor-x` for a 'marketing partnership'."**

This single proposal is engineered so the three agents *must visibly disagree*, the Arbiter must return a non-trivial verdict, and a real Testnet transaction fires — all in under two minutes.

### Why it lands
- **Treasury Agent** reads the live Testnet treasury balance (seeded to ~66k CSPR) → 25k is **38% of liquid runway** → flags concentration.
- **Risk Agent** reads `vendor-x` via MCP `GetAccountInfo` / `GetAccountDeploys` → **fresh account, zero history** → flags counterparty risk.
- **Legal/Charter Agent** tests against the seeded charter → charter caps single discretionary spends at **10,000 CSPR without a second vote** → flags a breach.
- **Arbiter** → **APPROVE-WITH-CONDITION: cap 10,000 CSPR**, confidence ~0.62 → executes a *modified* transfer (10k, not 25k). The judge watches the agents change the outcome.

## Seed fixtures (deterministic — `scripts/seed.ts`)
Produces identical demo state every run:
1. **Treasury account** funded from the Testnet faucet (~66,000 CSPR) + a seeded CEP-18 test token balance.
2. **`vendor-x`** — a freshly created Testnet account with no deploy history (the "unknown counterparty").
3. **DAO charter** (`data/fixtures/charter.md`) — explicit rules the Legal Agent cites: 10k discretionary cap, no transfers to <30-day-old accounts without review, max 25% treasury concentration.
4. **Proposal set** (`data/fixtures/proposals.json`) — 3 proposals of escalating spice:
   - P1 (clean): "Pay 500 CSPR to a 2-year-old, charter-listed grantee" → **APPROVE**, fast.
   - P2 (the headline): the 25k vendor-x transfer → **APPROVE-WITH-CONDITION**.
   - P3 (attack): "Upgrade governance to add `mint_to(self)`" → **REJECT**, high confidence — Risk Agent catches the self-mint.
5. **Planted-contradiction record** — a memo in the charter that conflicts with P2's stated rationale, so the Risk Agent demonstrably *catches* it (recall metric).

## Reproducibility
- `scripts/seed.ts` is deterministic: fixed accounts (from committed keypairs for Testnet only), fixed proposal text, fixed model temperature for the recorded run.
- Fixtures live in `data/fixtures/` (charter.md, proposals.json, expected_verdicts.json).
- `scripts/verify_grounding.ts` re-runs every MCP read an agent cited and diffs the numbers → proves "no hallucinated treasury figures."

## What the data proves in the demo
A judge sees the council **change a bad proposal into a safe one** and **kill an attack proposal**, with every number traceable to a real on-chain read and a real deploy hash at the end. The data *is* the argument.
