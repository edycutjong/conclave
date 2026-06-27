"use client";

const SPICE_STYLES: Record<string, { label: string; cls: string }> = {
  clean: { label: "clean", cls: "text-teal-300 border-teal-400/30 bg-teal-400/10" },
  headline: { label: "headline", cls: "text-amber-300 border-amber-400/30 bg-amber-400/10" },
  attack: { label: "attack", cls: "text-rose-300 border-rose-400/30 bg-rose-400/10" },
};

interface Props {
  id: string;
  title: string;
  spice: string;
  expectedVerdict: string;
  expectedCapCspr?: number;
  requestedAmountCspr: number;
  active?: boolean;
  onClick?: (id: string) => void;
}

export function ProposalCard({
  id,
  title,
  spice,
  expectedVerdict,
  expectedCapCspr,
  requestedAmountCspr,
  active,
  onClick,
}: Props) {
  const spiceStyle = SPICE_STYLES[spice] ?? SPICE_STYLES.clean;

  return (
    <button
      onClick={() => onClick?.(id)}
      className={`
        group w-full text-left rounded-lg border p-4 transition-all duration-200
        ${
          active
            ? "border-cyan-500/40 bg-cyan-500/5 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
            : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80"
        }
      `}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-slate-400">{id}</span>
          <span className="font-mono text-xs text-slate-600">
            {requestedAmountCspr > 0 ? `${requestedAmountCspr.toLocaleString()} CSPR` : "upgrade"}
          </span>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${spiceStyle.cls}`}
        >
          {spiceStyle.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-200 group-hover:text-slate-100">{title}</p>
      <p className="mt-2 font-mono text-xs text-slate-500">
        expected: {expectedVerdict}
        {expectedCapCspr ? ` · cap ${expectedCapCspr.toLocaleString()} CSPR` : ""}
      </p>
    </button>
  );
}
