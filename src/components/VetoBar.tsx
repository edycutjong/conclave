"use client";

import { useState, useEffect, useCallback } from "react";

interface Props {
  windowClosesAt: string;
  vetoed: boolean;
  onVeto: () => void;
  onExpired: () => void;
}

export function VetoBar({ windowClosesAt, vetoed, onVeto, onExpired }: Props) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(windowClosesAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 1000));
  });

  // Total window length, captured once at mount (lazy initializer → pure render).
  const [totalSecs] = useState(() => {
    const diff = new Date(windowClosesAt).getTime() - Date.now();
    return Math.max(1, Math.ceil(diff / 1000));
  });

  const expired = remaining <= 0;

  useEffect(() => {
    if (expired || vetoed) return;
    const interval = setInterval(() => {
      const diff = new Date(windowClosesAt).getTime() - Date.now();
      const secs = Math.max(0, Math.ceil(diff / 1000));
      setRemaining(secs);
      if (secs <= 0) {
        clearInterval(interval);
        onExpired();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [windowClosesAt, vetoed, expired, onExpired]);

  const formatTime = useCallback((secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  if (vetoed) {
    return (
      <div className="glass rounded-lg border border-red-500/30 bg-red-500/5 p-4 animate-scaleIn">
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl">🛑</span>
          <span className="text-lg font-bold text-red-400">VETOED</span>
          <span className="text-sm text-slate-400">— execution permanently blocked</span>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="glass rounded-lg border border-green-500/30 bg-green-500/5 p-4 animate-scaleIn">
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl">✅</span>
          <span className="text-lg font-bold text-green-400">Veto window closed</span>
          <span className="text-sm text-slate-400">— ready to execute</span>
        </div>
      </div>
    );
  }

  const progress = Math.min(1, Math.max(0, 1 - remaining / totalSecs));

  return (
    <div className="glass rounded-lg border border-amber-500/20 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="animate-blink text-amber-400">●</span>
          <span className="text-sm font-medium text-slate-300">Veto window open</span>
          <span className="veto-countdown font-mono text-xl font-bold text-amber-400">
            {formatTime(remaining)}
          </span>
        </div>
        <button
          onClick={onVeto}
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-2 text-sm font-bold text-red-400 transition-all hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]"
        >
          🛑 VETO
        </button>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-amber-500/60 transition-all duration-200"
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        A human can always stop it. This is a feature, not fine print.
      </p>
    </div>
  );
}
