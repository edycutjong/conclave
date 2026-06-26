// Canonical transcript hashing — the same canonicalization runs server-side (to write
// the hash on-chain) and client-side (to verify it). sha256 over a stable JSON encoding.

import { createHash } from "node:crypto";
import type { Transcript } from "./types";

/** Recursively sort object keys so the encoding is order-independent and reproducible. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortDeep((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}

/** `0x`-prefixed sha256 of the canonical transcript — what lands in the contract. */
export function transcriptHash(transcript: Transcript): string {
  const hash = createHash("sha256").update(canonicalize(transcript), "utf8").digest("hex");
  return `0x${hash}`;
}
