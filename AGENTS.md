<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🏛️ Conclave — Agent Instructions

## Project
Agentic multi-agent DAO governance on Casper. A council of AI agents (Risk, Treasury, Legal) debates every proposal, grounds arguments in live chain state via MCP, collects council approvals off-chain to quorum, and — after a human veto window — executes the approved transaction on Casper Testnet via casper-js-sdk. The Odra contract additionally enforces quorum on-chain (`approve` + threshold-guarded `execute`). Part of the **Vouch** suite (Conclave · Verity · Bastion).

## Hackathon
**Casper Agentic Buildathon 2026** (DoraHacks) — Casper Innovation Track, Build direction #3 (Multi-Agent DAO Governance). $150K prize pool.

## Structure
- `src/core/` — Domain layer (types, quorum, transcript hashing, demo engine, execute, multisig, `whatif` deterministic reasoner over arbitrary proposals)
- `src/agents/` — Council orchestrator + role/arbiter system prompts + MCP/CSPR.cloud tool wrappers
- `src/lib/` — Config, fixture loaders, in-memory state store
- `src/components/` — React 19 client components (DeliberationChamber, AgentColumn, ArbiterVerdict, VetoBar, ProposalComposer = What-If console, etc.)
- `src/app/` — Next.js 16 App Router pages + API routes (proposals, deliberate, veto, execute, health, `whatif` = deliberate over a user-supplied proposal)
- `contract/` — Odra upgradable Rust contract (governance: submit, verdict, approve, veto, execute)
- `scripts/` — CLI tools (seed, bench, verify_grounding, check_submission_readiness)
- `data/fixtures/` — Deterministic demo data (charter, proposals, expected verdicts)

## Tech Stack
| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19 |
| **Styling** | Tailwind CSS v4 |
| **Testing** | Vitest |
| **Contract** | Odra (Rust) on Casper Testnet |
| **Chain Reads** | Casper MCP Server (msanlisavas/casper-mcp) |
| **Signing** | CSPR.click AI Agent Skill (casper-js-sdk) |
| **History** | CSPR.cloud REST/Streaming |
| **AI Council** | Claude Opus 4.8 (Arbiter) + Claude Haiku 4.5 (Role Agents) |

## Key Rules
- **Frontend** = ESM (`import`), Next.js 16, React 19, Tailwind v4
- **Tests** = Vitest globals (`describe`/`it`/`expect`)
- **Demo Mode** = `CONCLAVE_DEMO !== "false"` uses deterministic mock agents — no Anthropic/MCP/Testnet needed
- **Colors** = Amber (#f59e0b) for Risk, Teal (#14b8a6) for Treasury, Violet (#a78bfa) for Legal, White (#f1f5f9) for Arbiter, Cyan (#06b6d4) for accent
- **Typography** = Geist Sans (body), Geist Mono (data/addresses)
- **Aesthetic** = Dark war-room / council chamber, glassmorphism cards, grid background

## Critical Patterns
- All state initialization uses **lazy initializers** (not setState-in-useEffect)
- `params` is a **Promise** in Next.js 16 — must `await`
- Components using hooks must have `'use client'` directive
- Unused catch variables use underscore prefix (`_err`)
- The `reconcile()` function in `quorum.ts` is the deterministic baseline the Arbiter must justify deviating from
- Transcript hashing uses `canonicalize()` (recursive key sort) + SHA-256 for order-independent reproducibility

## Commits & Releases
- **Conventional Commits required** — all commit messages MUST follow the format: `type(scope): description`
- Types: `feat` (minor bump), `fix`/`perf`/`refactor` (patch bump), `chore`/`docs`/`ci`/`test`/`style` (no release)
- Breaking changes: append `!` after type or include `BREAKING CHANGE:` in body → triggers major bump
- Examples: `feat(council): add multi-round deliberation`, `fix(veto): correct timer expiry`, `chore: update deps`
- **Automated semantic versioning** runs in CI Stage 6 (`scripts/release-bump.ts`) — reads commits since last tag, bumps `package.json` + `contract/Cargo.toml`, generates `CHANGELOG.md`, creates GitHub Release
- Never manually edit `version` in `package.json` or `Cargo.toml` — the pipeline owns it
