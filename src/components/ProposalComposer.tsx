"use client";

import { useState, useCallback } from "react";
import type { AgentOpinion, ArbiterVerdict as ArbiterVerdictType } from "@/core/types";
import { AgentColumn } from "./AgentColumn";
import { ArbiterVerdict } from "./ArbiterVerdict";

// What-If console — judges compose an arbitrary proposal and watch the council
// reason over it live (POST /api/whatif). Real, varied verdicts: APPROVE / CAP /
// REJECT, driven by the charter rules — not a canned script.

interface Form {
  title: string;
  target: string;
  entrypoint: string;
  amountCspr: number;
  targetDeploys: number;
  rationale: string;
}

interface WhatIfResponse {
  opinions: AgentOpinion[];
  verdict: ArbiterVerdictType;
  concentrationPct: number;
  dangerousEntrypoint: boolean;
}

const PRESETS: Record<string, Form> = {
  clean: {
    title: "Q3 ecosystem grant",
    target: "grantee-aurora",
    entrypoint: "transfer",
    amountCspr: 500,
    targetDeploys: 847,
    rationale: "Routine quarterly disbursement to a charter-listed integration partner.",
  },
  oversized: {
    title: "Marketing partnership",
    target: "vendor-x",
    entrypoint: "transfer",
    amountCspr: 25000,
    targetDeploys: 0,
    rationale: "Large marketing spend with a new, unproven vendor.",
  },
  selfMint: {
    title: "Routine governance upgrade",
    target: "governance-self",
    entrypoint: "mint_to",
    amountCspr: 0,
    targetDeploys: 999,
    rationale: "“Streamline treasury operations” by adding a mint entrypoint.",
  },
};

export function ProposalComposer() {
  const [form, setForm] = useState<Form>(PRESETS.clean);
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const convene = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/whatif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deliberation failed");
      setResult(data as WhatIfResponse);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [form]);

  const applyPreset = (key: keyof typeof PRESETS) => {
    setForm(PRESETS[key]);
    setResult(null);
  };

  const inputCls =
    "w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50";

  return (
    <section className="mt-12">
      <h2 className="mb-1 text-xs font-medium uppercase tracking-widest text-slate-500">
        What-If Console — compose your own proposal
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Submit any proposal and watch the council reason over it against the charter. The verdict is
        deterministic — not scripted.
      </p>

      <div className="glass rounded-lg p-4">
        {/* presets */}
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 self-center">Try:</span>
          <button onClick={() => applyPreset("clean")} className="rounded-full border border-green-500/30 bg-green-500/5 px-3 py-1 text-[11px] text-green-300 hover:bg-green-500/15">
            Clean grant
          </button>
          <button onClick={() => applyPreset("oversized")} className="rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1 text-[11px] text-amber-300 hover:bg-amber-500/15">
            Oversized / unknown
          </button>
          <button onClick={() => applyPreset("selfMint")} className="rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1 text-[11px] text-red-300 hover:bg-red-500/15">
            Governance self-mint
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Title</span>
            <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Target account</span>
            <input className={inputCls} value={form.target} onChange={(e) => set("target", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Entrypoint</span>
            <input className={inputCls} value={form.entrypoint} onChange={(e) => set("entrypoint", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Amount (CSPR)</span>
            <input type="number" min={0} className={`${inputCls} font-mono`} value={form.amountCspr} onChange={(e) => set("amountCspr", Number(e.target.value))} />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Target deploy history</span>
            <input type="number" min={0} className={`${inputCls} font-mono`} value={form.targetDeploys} onChange={(e) => set("targetDeploys", Number(e.target.value))} />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Rationale</span>
            <input className={inputCls} value={form.rationale} onChange={(e) => set("rationale", e.target.value)} />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={convene}
            disabled={loading}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {loading ? "Council deliberating…" : "Convene the council"}
          </button>
          {result && (
            <span className="font-mono text-xs text-slate-500">
              concentration: {result.concentrationPct}% of runway
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400 animate-slideDown">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4 animate-fadeIn">
          <div className="grid gap-3 stagger md:grid-cols-3">
            {result.opinions.map((opinion) => (
              <AgentColumn key={opinion.role} opinion={opinion} animate />
            ))}
          </div>
          <ArbiterVerdict verdict={result.verdict} animate />
        </div>
      )}
    </section>
  );
}
