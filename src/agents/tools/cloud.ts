// CSPR.cloud REST helpers (treasury history, deploy lookups for the Treasury Agent).
// Auth pattern (verified): header `Authorization: <CSPR_CLOUD_API_KEY>` — token from
// https://cspr.cloud/ . Server-only; never expose the token to the browser.

import { config } from "@/lib/config";

export function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!config.csprCloudKey) {
    throw new Error("CSPR_CLOUD_API_KEY missing — get one at https://cspr.cloud/ (see .env.example).");
  }
  const url = path.startsWith("http") ? path : `${config.csprCloudRest}${path}`;
  return fetch(url, {
    ...init,
    headers: { Authorization: config.csprCloudKey, Accept: "application/json", ...(init?.headers ?? {}) },
  });
}

/** Account CSPR balance (motes as string). Exact endpoint pinned on BUILD_PLAN Day 2. */
export async function getAccountBalance(publicKeyOrHash: string): Promise<string> {
  // TODO(Day 2): pin the CSPR.cloud REST path for account balances.
  const res = await authedFetch(`/accounts/${publicKeyOrHash}`);
  if (!res.ok) throw new Error(`CSPR.cloud ${res.status} for ${publicKeyOrHash}`);
  const json = (await res.json()) as { data?: { balance?: string } };
  return json.data?.balance ?? "0";
}
