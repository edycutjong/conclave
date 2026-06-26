# Conclave — Demo Script (≤ 3 min)

## Cold open (0:00–0:20) — the stakes
On screen: a real DAO-drain headline. VO: *"A $40,000 proposal passed at 2 a.m. with 4% turnout. Nobody read the contract it called. Conclave reads it — before it signs."*

## Act 1 — Convene (0:20–0:50)
- Click the seeded **P2** chip: "Transfer 25,000 CSPR → vendor-x."
- Hit **Convene the Council**. Three agent columns start streaming.
- Point at the **MCP tool-call chips** appearing under each agent: *"These numbers are live Testnet reads — not guesses."*

## Act 2 — The disagreement (0:50–1:40) — the wow
- **Treasury**: 25k = 38% of liquid runway → CAP.
- **Risk**: vendor-x has zero deploy history → HIGH.
- **Legal**: charter §3 caps discretionary spend at 10k → BREACH.
- **Arbiter** resolves: **APPROVE-WITH-CONDITION, cap 10,000, confidence 0.62.**
- VO: *"The council didn't rubber-stamp it — it changed the outcome."*

## Act 3 — Approve, veto window, execute (1:40–2:30)
- The **quorum meter** fills as the council's approvals reach the threshold (off-chain consensus; the Odra contract enforces the same quorum on `execute`).
- The **veto countdown** ticks — *"a human can always stop it"* — we let it run.
- **Execute.** A real **`cspr.live` deploy hash** pops for the **capped 10k** transfer. Click it → Testnet explorer confirms.

## Act 4 — Audit + kill-shot (2:30–3:00)
- Open the transcript; click **verify hash** → recomputed hash matches the on-chain value.
- Quick cut: run **P3** (the `mint_to(self)` attack) → council returns **REJECT, conf 0.95**. *"It catches governance attacks too."*
- Close: *"Conclave — part of Vouch, the trust layer for agents on Casper. Thank you for reviewing."*

## Expected outputs (for reproduction)
| Step | Expected |
|---|---|
| P2 verdict | APPROVE-WITH-CONDITION, cap 10,000, conf ≈ 0.6 |
| P2 execution | 10,000 CSPR transfer, real Testnet deploy hash |
| Transcript hash | recomputed == on-chain value |
| P3 verdict | REJECT, conf ≈ 0.9+ |
| Outbound grounding | every cited number maps to an MCP read (verify script) |
