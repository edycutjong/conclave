"use client";

import type { AgentOpinion, AgentRole, ToolCall } from "@/core/types";

const ROLE_CONFIG: Record<AgentRole, { icon: string; label: string; color: string; borderClass: string }> = {
  risk: { icon: "⚠", label: "RISK", color: "text-amber-400", borderClass: "agent-risk" },
  treasury: { icon: "◆", label: "TREASURY", color: "text-teal-400", borderClass: "agent-treasury" },
  legal: { icon: "§", label: "LEGAL", color: "text-violet-400", borderClass: "agent-legal" },
};

const STANCE_STYLES: Record<string, string> = {
  APPROVE: "bg-green-500/10 text-green-400 border-green-500/30",
  CAP: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  REJECT: "bg-red-500/10 text-red-400 border-red-500/30",
  FLAG: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

function ToolCallChip({ tc }: { tc: ToolCall }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[10px] font-mono text-slate-400">
      <span className="text-cyan-500">⚡</span>
      {tc.tool}
      {tc.citedValue && <span className="text-slate-500">→ {tc.citedValue}</span>}
    </span>
  );
}

interface Props {
  opinion: AgentOpinion;
  animate?: boolean;
}

export function AgentColumn({ opinion, animate }: Props) {
  const cfg = ROLE_CONFIG[opinion.role];
  const stanceStyle = STANCE_STYLES[opinion.stance] ?? STANCE_STYLES.FLAG;

  return (
    <div
      className={`
        glass-elevated rounded-lg p-4 ${cfg.borderClass}
        ${animate ? "animate-slideUp" : ""}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-lg ${cfg.color}`}>{cfg.icon}</span>
          <span className={`text-xs font-bold uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${stanceStyle}`}>
          {opinion.stance}
        </span>
      </div>

      {/* Summary */}
      <p className="mt-3 text-sm font-medium text-slate-200">{opinion.summary}</p>

      {/* Tool calls */}
      {opinion.toolCalls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {opinion.toolCalls.map((tc) => (
            <ToolCallChip key={tc.id} tc={tc} />
          ))}
        </div>
      )}

      {/* Rationale */}
      <p className="mt-3 text-xs leading-relaxed text-slate-400">{opinion.rationale}</p>

      {/* Flags */}
      {opinion.flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {opinion.flags.map((flag) => (
            <span
              key={flag}
              className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] text-red-400"
            >
              🚩 {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
