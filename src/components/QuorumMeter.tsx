"use client";

interface Props {
  approvals: number;
  quorum: number;
}

export function QuorumMeter({ approvals, quorum }: Props) {
  const reached = approvals >= quorum;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium uppercase tracking-widest text-slate-500">quorum</span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: quorum }, (_, i) => (
          <div
            key={i}
            className={`
              h-3 w-3 rounded-full transition-all duration-300
              ${i < approvals ? "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.4)]" : "bg-slate-700 border border-slate-600"}
            `}
          />
        ))}
      </div>
      <span className="font-mono text-xs text-slate-400">
        {approvals}/{quorum}
        {reached && <span className="ml-1 text-green-400">✓</span>}
      </span>
    </div>
  );
}
