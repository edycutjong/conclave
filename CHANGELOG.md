# Changelog

All notable changes to this project will be documented in this file.

## [2.2.4](../../compare/v2.2.3...v2.2.4) (2026-08-12)

### 🐛 Bug Fixes

- **ci:** hoist pnpm node_modules so prebuilt deploys resolve (c7853f0)

### 🔧 Chores

- **deps-dev:** bump @types/node from 26.1.1 to 26.2.0 (#33) (96fe84b)
- **deps:** repair the corrupt lockfile and clear all security advisories (4ad4908)
- **deps-dev:** bump @playwright/test from 1.61.1 to 1.62.1 (#37) (bd23684)
- **deps-dev:** bump @types/react from 19.2.17 to 19.2.18 (#38) (560cf40)
- **deps-dev:** bump eslint-config-next from 16.2.11 to 16.3.0 (#39) (7b87e33)
- **deps-dev:** bump tsx from 4.23.1 to 4.23.5 (#41) (919a2f3)

### 📝 Documentation

- **architecture:** quote mermaid labels so the system diagram renders (5311845)
- point pitch video badge + deck embed to final demo video (facbb83)

## [2.2.3](../../compare/v2.2.2...v2.2.3) (2026-07-25)

### 🐛 Bug Fixes

- **honesty:** regenerate OG preview image to match the real stack (1fd9a01)

## [2.2.2](../../compare/v2.2.1...v2.2.2) (2026-07-25)

### 🐛 Bug Fixes

- **honesty:** align meta tags + docs with the real stack (7f59335)

## [2.2.1](../../compare/v2.2.0...v2.2.1) (2026-07-25)

### 🐛 Bug Fixes

- honest grounding copy + repair ARCHITECTURE mermaid diagram (f78db93)

### 📝 Documentation

- remove stale error-state screenshots (superseded, unreferenced) (0dd826d)
- drop unused screenshots (02-select-proposal, 07-whatif-clean-grant) (a73e3fc)
- refresh product screenshots; drop stale error-state + unused shots (2f11a02)
- honest grounding/MCP wording + untrack kitchen docs (1477041)

## [2.2.0](../../compare/v2.1.2...v2.2.0) (2026-07-25)

### 🚀 Features

- **contract:** restrict quorum approvals to registered council signers (3bdcd0b)

### 📝 Documentation

- **readme:** link Casper Buildathon 2026 FINALS + Vouch suite hub (15816bd)

## [2.1.2](../../compare/v2.1.1...v2.1.2) (2026-07-25)

### 🐛 Bug Fixes

- **security:** bump minimatch@3->10.2.5 to eliminate vulnerable brace-expansion@1.1.16 (GHSA-mh99-v99m-4gvg) (0481774)

## [2.1.1](../../compare/v2.1.0...v2.1.1) (2026-07-25)

### 🐛 Bug Fixes

- **security:** override brace-expansion, postcss, sharp to patched versions (fc0daea)

### 🔧 Chores

- **deps:** bump react 19.2.8, next 16.2.11, eslint-config-next 16.2.11, @anthropic-ai/sdk 0.115.0 (4e6176a)

## [2.1.0](../../compare/v2.0.1...v2.1.0) (2026-07-19)

### 🚀 Features

- **ux:** preset chips convene the council in one click (55284cc)

## [2.0.1](../../compare/v2.0.0...v2.0.1) (2026-07-18)

### 🐛 Bug Fixes

- add documented package scripts (e2e, lifecycle, deploy:rpc, contract:*, ci) (096ae03)

### 📝 Documentation

- correct unit test count 152 -> 183 (b416a5e)

## [2.0.0](../../compare/v1.6.0...v2.0.0) (2026-07-18)

### ⚠️ BREAKING CHANGES

- Vouch 2.0 — Casper Buildathon Finals release (98c020b)

### 🚀 Features

- Vouch 2.0 — Casper Buildathon Finals release (98c020b)

### 📝 Documentation

- explicit DeFi/RWA treasury framing (Beanstalk anchor + on-chain cap-and-execute proof) in README and deck (7f47205)
- **pitch:** wire live @VouchOnCasper socials into launch plan + closing slide (1e45e5b)

## [1.6.0](../../compare/v1.5.3...v1.6.0) (2026-07-18)

### 🚀 Features

- **chain:** complete FULL on-chain lifecycle — payable deposit via Odra proxy_caller + quorum-enforced execute (50 CSPR treasury transfer); proof rows in README/deck (70d13e8)

### 🔧 Chores

- **deps-dev:** bump tsx from 4.23.0 to 4.23.1 (#26) (2c5c1f8)
- **deps-dev:** bump @eslint/eslintrc from 3.3.5 to 3.3.6 (#25) (2b659a3)
- **deps-dev:** bump @tailwindcss/postcss from 4.3.2 to 4.3.3 (#24) (41193cb)
- **deps:** bump @anthropic-ai/sdk from 0.111.0 to 0.112.2 (#23) (bcc5d32)
- **deps-dev:** bump tailwindcss from 4.3.2 to 4.3.3 (#22) (b31bddf)
- **deps:** bump actions/setup-node from 4 to 7 (#21) (b3adf6f)

## [1.5.3](../../compare/v1.5.2...v1.5.3) (2026-07-18)

### 🐛 Bug Fixes

- **ci:** exclude vendored public/vendor bundle from ESLint (3619e76)

### 📝 Documentation

- **pitch:** finals-round accuracy pass — honest integration claims, on-chain proof rows, finalist badges, launch plan, print-to-PDF, self-hosted Tailwind (acf0d69)
- **readme:** add @VouchOnCasper follow badge (#17) (3240514)

### 🔧 Chores

- **deps:** bump react-dom from 19.2.4 to 19.2.7 (#20) (f2cca71)
- **deps:** bump @anthropic-ai/sdk from 0.110.0 to 0.111.0 (#19) (0a59670)
- **deps-dev:** bump @types/node from 26.1.0 to 26.1.1 (#18) (d89fc8e)
- **deps-dev:** bump typescript from 5.9.3 to 6.0.3 (#14) (c5d23f3)
- **deps-dev:** bump @types/node from 20.19.43 to 26.1.0 (#11) (7063641)
- **deps-dev:** bump @lhci/cli from 0.14.0 to 0.15.1 (#10) (ab33ee8)
- **deps:** bump next from 16.2.9 to 16.2.10 (#7) (250bcdc)
- **deps:** regenerate pnpm-lock.yaml to repair duplicate mapping keys (#16) (805683a)
- **deps:** bump react from 19.2.4 to 19.2.7 (#8) (e213eea)
- **deps-dev:** bump @tailwindcss/postcss from 4.3.0 to 4.3.2 (#6) (6488427)
- **deps-dev:** bump tsx from 4.22.4 to 4.23.0 (#15) (bac4652)
- **deps:** bump @anthropic-ai/sdk from 0.105.0 to 0.110.0 (#13) (572d2cd)
- **deps-dev:** bump tailwindcss from 4.3.0 to 4.3.2 (#12) (320eb44)
- **deps-dev:** bump eslint-config-next from 16.2.9 to 16.2.10 (#9) (9ddb881)

## [1.5.2](../../compare/v1.5.1...v1.5.2) (2026-07-06)

### 🐛 Bug Fixes

- **deps:** patch remaining low/medium Dependabot alerts (cookie/js-yaml/postcss/uuid via scoped overrides) (72a4b68)

## [1.5.1](../../compare/v1.5.0...v1.5.1) (2026-07-06)

### 🐛 Bug Fixes

- **deps:** override tmp to >=0.2.6 (resolves high-severity Dependabot alert) (b935d61)

### 📝 Documentation

- add community health files (code of conduct, contributing, issue + PR templates) (18b4cc0)
- **readme:** link contract package to testnet explorer [skip ci] (b0428fc)
- **readme:** add step-by-step screenshots walkthrough (f1482fe)

### ✅ Tests

- reach 100% statement and branch coverage (1675325)

## [1.5.0](../../compare/v1.4.1...v1.5.0) (2026-06-27)

### 🚀 Features

- **deck:** embed YouTube walkthrough and add final slide Pitch Video link (176db71)

### 📝 Documentation

- **readme:** update YouTube Pitch Video URL (162f4da)
- **readme:** expand Testnet transaction deploy hashes to full length (6d30442)
- **readme:** add MCP badge and Casper MCP setup instructions (3e72647)

## [1.4.1](../../compare/v1.4.0...v1.4.1) (2026-06-27)

### 🐛 Bug Fixes

- **docs:** fix Mermaid diagram syntax error in README (8a08940)

## [1.4.0](../../compare/v1.3.0...v1.4.0) (2026-06-27)

### 🚀 Features

- **ui:** use brand icon.svg logo in top left (2b8ed81)

### 💄 Style

- **pitch:** replace custom SVGs with premium icon.svg, remove globe emoji (88fc964)

### 📝 Documentation

- **pitch:** update Slide 12 Live Website links to match custom edycu.dev domains from README (6361fb9)
- **pitch:** add live website and github codebase links on conclusion slide (c0468b8)
- **pitch:** update Slide 8 to display full hashes and links to cspr.live (3874b96)

## [1.3.0](../../compare/v1.2.0...v1.3.0) (2026-06-27)

### 🚀 Features

- **casper:** support loading raw PEM key from env var & update logo size (df83082)

### 📝 Documentation

- move referenced design documents to docs root (944732e)

### 🔧 Chores

- trigger ci run with new secrets (943f047)

## [1.2.0](../../compare/HEAD~50...v1.2.0) (2026-06-27)

### 🚀 Features

- initial commit of Conclave agentic governance council for Casper DAOs (6410194)

