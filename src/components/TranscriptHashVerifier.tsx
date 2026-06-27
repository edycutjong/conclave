"use client";

import { useState, useCallback } from "react";

interface Props {
  transcriptHashHex: string;
  /** Raw transcript JSON for client-side re-hashing. */
  transcriptJson: string;
}

export function TranscriptHashVerifier({ transcriptHashHex, transcriptJson }: Props) {
  const [status, setStatus] = useState<"idle" | "verifying" | "match" | "mismatch">("idle");
  const [recomputed, setRecomputed] = useState<string | null>(null);

  const verify = useCallback(async () => {
    setStatus("verifying");
    try {
      // Use SubtleCrypto for client-side SHA-256
      const encoder = new TextEncoder();
      const data = encoder.encode(transcriptJson);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = `0x${hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
      setRecomputed(hashHex);
      setStatus(hashHex === transcriptHashHex ? "match" : "mismatch");
    } catch (_err) {
      setStatus("mismatch");
    }
  }, [transcriptHashHex, transcriptJson]);

  return (
    <div className="glass-elevated rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
            Transcript Hash (on-chain)
          </span>
          <p className="mt-1 font-mono text-xs text-slate-400 break-all">{transcriptHashHex}</p>
        </div>
        <button
          onClick={verify}
          disabled={status === "verifying"}
          className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
        >
          {status === "verifying" ? "Verifying…" : "Verify Hash"}
        </button>
      </div>

      {status === "match" && (
        <div className="mt-3 rounded-lg bg-green-500/10 border border-green-500/20 p-3 animate-scaleIn">
          <p className="text-sm text-green-400">✅ Hash verified — recomputed value matches on-chain record.</p>
          <p className="mt-1 font-mono text-[10px] text-green-400/60 break-all">{recomputed}</p>
        </div>
      )}

      {status === "mismatch" && (
        <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 p-3 animate-scaleIn">
          <p className="text-sm text-red-400">❌ Hash mismatch — transcript may have been tampered with.</p>
          <p className="mt-1 font-mono text-[10px] text-red-400/60 break-all">recomputed: {recomputed}</p>
        </div>
      )}
    </div>
  );
}
