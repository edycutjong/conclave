"use client";

import { useState } from "react";

interface Props {
  proposalId: string;
  disabled?: boolean;
  onConvene: (proposalId: string) => void;
}

export function ConveneButton({ proposalId, disabled, onConvene }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    onConvene(proposalId);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        group relative overflow-hidden rounded-lg px-6 py-3 text-sm font-semibold tracking-wide
        transition-all duration-300
        ${
          disabled || loading
            ? "cursor-not-allowed bg-slate-800 text-slate-500"
            : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
        }
      `}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
          <svg className="animate-spinSlow h-5 w-5 text-cyan-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <span className="flex items-center gap-2">
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="3" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="13" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 6v2M5 11l2-3M11 11l-2-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {loading ? "Convening…" : "Convene the Council"}
      </span>
    </button>
  );
}
