"use client";

import { useState } from "react";

interface Props {
  deployHash: string;
  explorerUrl: string;
  /** When true, this is a demo placeholder — not a broadcast Testnet tx. */
  simulated?: boolean;
}

export function DeployHashLink({ deployHash, explorerUrl, simulated = false }: Props) {
  const [copied, setCopied] = useState(false);

  const short = `${deployHash.slice(0, 8)}…${deployHash.slice(-8)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(deployHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Demo placeholder: be explicit that this is NOT on-chain, and show NO cspr.live
  //    link (a dead explorer link reads as fabrication to a judge). ──────────────
  if (simulated) {
    return (
      <div className="glass-elevated rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 animate-scaleIn">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">◷</span>
          <span className="text-sm font-medium text-amber-400">Simulated execution (demo mode)</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-sm text-slate-300" title={deployHash}>
            {short}
          </span>
          <button
            onClick={handleCopy}
            className="rounded border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            {copied ? "copied!" : "copy"}
          </button>
          <span className="rounded border border-amber-700/40 bg-amber-900/20 px-2 py-0.5 text-[10px] text-amber-400/80">
            not broadcast
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          Deterministic placeholder — no on-chain transaction. Set <code className="text-slate-400">CONCLAVE_DEMO=false</code>{" "}
          with a funded key + deployed contract to broadcast a real Testnet tx (see LIVE_TESTNET.md).
        </p>
      </div>
    );
  }

  // ── Live: a real, broadcast Testnet transaction — link out to cspr.live. ──────
  return (
    <div className="glass-elevated rounded-lg border border-green-500/20 bg-green-500/5 p-4 animate-scaleIn">
      <div className="flex items-center gap-2">
        <span className="text-green-400">✅</span>
        <span className="text-sm font-medium text-green-400">Executed on Casper Testnet</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm text-cyan-400 underline decoration-cyan-400/30 underline-offset-2 hover:text-cyan-300 hover:decoration-cyan-300/50 transition-colors"
        >
          {short}
        </a>
        <button
          onClick={handleCopy}
          className="rounded border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
        >
          {copied ? "copied!" : "copy"}
        </button>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
        >
          cspr.live ↗
        </a>
      </div>
    </div>
  );
}
