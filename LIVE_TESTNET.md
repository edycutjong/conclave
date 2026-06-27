# Conclave — Live Testnet Wiring

Conclave ships in **demo mode** (deterministic, no keys). This runbook flips the
two real-chain paths to **Casper Testnet**:

| Path | Code | Activated by |
|---|---|---|
| **Grounded reads** | `src/agents/tools/mcp.ts` → CSPR.cloud REST | `CONCLAVE_DEMO=false` + `CSPR_CLOUD_API_KEY` |
| **Governance lifecycle (real txs)** | `src/lib/casper.ts` (`submit_proposal`/`record_verdict`/`approve`/`execute`) + `scripts/run_lifecycle.ts` | `CONCLAVE_DEMO=false` + funded key + `CONCLAVE_CONTRACT_HASH` |

> Verified: the casper-js-sdk surface against `@5.0.12` .d.ts
> (`PrivateKey.fromPem` · `ContractCallBuilder` · `RpcClient.putTransaction`),
> **and** `execute(proposal_id: u64)` against `contract/src/conclave.rs` — the
> `src/lib/casper.ts` arg map matches. The livenet deploy binary
> (`contract/bin/deploy.rs`) also compiles (`cargo check --features livenet`).
> The only thing not yet runnable by me is the deploy itself (needs your funded
> key + node access).

---

## 1. Prerequisites

### a) CSPR.cloud access token (reads + node RPC auth)
Register at <https://cspr.cloud/> and copy the access token. Every CSPR.cloud REST,
RPC, and SSE request needs `Authorization: <token>`.

### b) Funded Ed25519 keypair (the orchestrator signer)
```bash
# casper-client comes from the Casper tooling; or export a PEM from your wallet.
mkdir -p data/keys
casper-client keygen data/keys/orchestrator
# Fund the public key on Testnet: https://testnet.cspr.live/tools/faucet
```
Point `CASPER_ORCHESTRATOR_SECRET_KEY_PATH` at the PEM (`secret_key.pem`).

### c) Build + deploy the Odra contract → `CONCLAVE_CONTRACT_HASH`

**Build the WASM** (produces `contract/wasm/Conclave.wasm`):
```bash
pnpm contract:build            # = cargo odra build
# Optional: install binaryen so cargo-odra can run wasm-opt (smaller wasm, less gas)
#   brew install binaryen
```

**Deploy via the Odra livenet backend** (already wired — `contract/bin/deploy.rs`
+ the `livenet` feature). Constructor is `init(quorum: u32, guardian: Address)`;
the deploy script defaults `guardian` to the deployer:
```bash
cd contract
# .env consumed by the livenet backend (a funded Testnet key):
export ODRA_CASPER_LIVENET_SECRET_KEY_PATH=./keys/secret_key.pem
export ODRA_CASPER_LIVENET_NODE_ADDRESS=https://node.testnet.cspr.cloud
export ODRA_CASPER_LIVENET_CHAIN_NAME=casper-test
export ODRA_CASPER_LIVENET_EVENTS_URL=https://node.testnet.cspr.cloud/events
# CSPR.cloud's node is auth-gated — if the backend 401s, pass your token via the
# node URL/header per odra-casper-livenet-env, or use a public Testnet RPC node.
export CONCLAVE_QUORUM=1                 # quorum=1 lets ONE key complete the lifecycle
export CONCLAVE_FUND_MOTES=20000000000   # fund the treasury at deploy (20 CSPR), so execute has funds

pnpm contract:deploy                     # = cargo run --bin conclave_livenet --features livenet
# → prints "contract address : ..." (and "treasury funded" if CONCLAVE_FUND_MOTES set).
#   Put that hash (prefix stripped) into .env.local as CONCLAVE_CONTRACT_HASH.
```

---

## 2. Configure `.env.local`
```bash
cp .env.example .env.local
```
```ini
CONCLAVE_DEMO=false
CSPR_CLOUD_API_KEY=<your token>
CSPR_CLOUD_API_URL=https://api.testnet.cspr.cloud
CASPER_NODE_RPC=https://node.testnet.cspr.cloud/rpc
CASPER_CHAIN_NAME=casper-test
CASPER_ORCHESTRATOR_SECRET_KEY_PATH=./data/keys/orchestrator/secret_key.pem
CASPER_KEY_ALGO=ed25519
CONCLAVE_CONTRACT_HASH=hash-<deployed contract hash>
```

---

## 3. Verify each path

### Reads (CSPR.cloud REST)
With a real account public key, the read layer returns live data instead of fixtures:
```bash
curl -s "$CSPR_CLOUD_API_URL/accounts/<publicKeyHex>" \
  -H "Authorization: $CSPR_CLOUD_API_KEY" | jq .data
```
In-app, the council's `GetAccountBalance` / `GetContractEntryPoints` tool calls now
hit this endpoint (mapped in `mcp.ts` → `REST_ROUTE`).

### Full on-chain lifecycle (one command)
The contract enforces `submit_proposal → record_verdict → approve ×quorum →
execute`. All four are wired to `casper-js-sdk` in `src/lib/casper.ts`, sequenced by
`scripts/run_lifecycle.ts`:
```bash
export $(grep -v '^#' .env.local | xargs)   # CONCLAVE_DEMO=false + contract + key
pnpm lifecycle
# → prints a REAL deploy hash + cspr.live link for EACH step:
#   submit_proposal · record_verdict · approve · execute
```
Each `https://testnet.cspr.live/transaction/<hash>` is a confirmed on-chain tx — the
buildathon's **transaction-producing on-chain component** gate is cleared on the first
(`submit_proposal`) alone.

**Caveats (in the script header too):**
- Treasury must be funded first — pass `CONCLAVE_FUND_MOTES` at deploy (above).
- `approve()` is **per-signer**: reaching `quorum > 1` needs other council keys to call
  `approve()` too. Deploy with `CONCLAVE_QUORUM=1` to complete the path with one key.
- The proposal `target` must be a **real account public key** (defaults to the signer);
  override with `CONCLAVE_PROPOSAL_TARGET`. On a fresh contract the first id is `0`.

### Single execute via the app
```bash
pnpm build && pnpm start          # CONCLAVE_DEMO=false in env
curl -s -X POST http://localhost:3000/api/proposals/P1/deliberate
curl -s -X POST http://localhost:3000/api/proposals/P1/execute | jq
# → { execution: { deployHash, explorerUrl } }. Note: this only broadcasts execute();
#   the proposal must already be submitted + decided + approved on-chain (use pnpm lifecycle).
```

---

## 4. Safety
- `.env.local`, `data/keys/`, and any `*.pem` are git-ignored — never commit them.
- Demo mode is the default for judges; live mode is strictly opt-in via `CONCLAVE_DEMO=false`.
