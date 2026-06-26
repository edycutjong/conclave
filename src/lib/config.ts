// Server-only runtime config. Never import into client components.

export const config = {
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  arbiterModel: process.env.CONCLAVE_ARBITER_MODEL ?? "claude-opus-4-8",
  roleModel: process.env.CONCLAVE_ROLE_MODEL ?? "claude-haiku-4-5",
  csprCloudKey: process.env.CSPR_CLOUD_API_KEY ?? "",
  csprCloudRest: process.env.CSPR_CLOUD_REST_URL ?? "https://node.testnet.cspr.cloud",
  // CSPR.cloud REST API (indexed data) — distinct from the node RPC host above.
  csprCloudApi: process.env.CSPR_CLOUD_API_URL ?? "https://api.testnet.cspr.cloud",
  mcpUrl: process.env.CASPER_MCP_URL ?? "http://localhost:8080",
  network: process.env.CASPER_NETWORK ?? "casper-test",
  nodeRpc: process.env.CASPER_NODE_RPC ?? "https://node.testnet.cspr.cloud/rpc",
  chainName: process.env.CASPER_CHAIN_NAME ?? "casper-test",
  orchestratorKeyPath: process.env.CASPER_ORCHESTRATOR_SECRET_KEY_PATH ?? "./data/keys/orchestrator_secret_key.pem",
  contractHash: process.env.CONCLAVE_CONTRACT_HASH ?? "",
  quorum: Number(process.env.CONCLAVE_QUORUM ?? 2),
  vetoWindowSeconds: Number(process.env.CONCLAVE_VETO_WINDOW_SECONDS ?? 45),
};

export function assertServerEnv(keys: (keyof typeof config)[]): void {
  const missing = keys.filter((k) => !config[k]);
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(", ")} (see .env.example)`);
  }
}
