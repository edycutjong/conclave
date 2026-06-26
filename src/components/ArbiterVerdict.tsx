"use client";

import type { ArbiterVerdict } from "@/core/types";
import { motesToCspr } from "@/core/types";
import { ConfidenceDial } from "./ConfidenceDial";

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  APPROVE: { bg: "bg-green-500/10 border-green-500/30", text: "text-green-400", label: "APPROVE" },
  APPROVE_WITH_CONDITION: {
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-400",
    label: "APPROVE WITH CONDITION",
  },
  REJECT: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", label: "REJECT" },
};

interface Props {
  verdict: ArbiterVerdict;
  animate?: boolean;
}

export function ArbiterVerdict({ verdict, animate }: Props) {
  const style = VERDICT_STYLES[verdict.verdict] ?? VERDICT_STYLES.APPROVE;
  const approvedCspr = motesToCspr(verdict.approvedAmountMotes);

  return (
    <div
      className={`
        glass-elevated rounded-lg border p-5 agent-arbiter
        ${animate ? "animate-verdict" : ""}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg text-slate-100">⚖</span>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-300">ARBITER</span>
      </div>

      {/* Verdict + Dial */}
      <div className="mt-4 flex items-center gap-6">
        <ConfidenceDial confidenceBps={verdict.confidenceBps} size={100} />
        <div className="flex-1">
          <div className={`inline-flex rounded-lg border px-3 py-1.5 text-sm font-bold ${style.bg} ${style.text}`}>
            {style.label}
          </div>
          {approvedCspr > 0 && (
            <p className="mt-2 font-mono text-lg text-slate-200">
              {approvedCspr.toLocaleString()} <span className="text-sm text-slate-500">CSPR</span>
            </p>
          )}
          {approvedCspr === 0 && verdict.verdict === "REJECT" && (
            <p className="mt-2 font-mono text-sm text-red-400">Execution blocked</p>
          )}
        </div>
      </div>

      {/* Reasoning */}
      <p className="mt-4 text-sm leading-relaxed text-slate-300">{verdict.reasoning}</p>
    </div>
  );
}
