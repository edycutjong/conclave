"use client";

import { useState, useCallback } from "react";
import type { ProposalWithState } from "@/core/types";
import { AgentColumn } from "./AgentColumn";
import { ArbiterVerdict } from "./ArbiterVerdict";
import { VetoBar } from "./VetoBar";
import { QuorumMeter } from "./QuorumMeter";
import { DeployHashLink } from "./DeployHashLink";
import { TranscriptHashVerifier } from "./TranscriptHashVerifier";
import { ConveneButton } from "./ConveneButton";
import { ProposalCard } from "./ProposalCard";

interface SeedProposal {
  id: string;
  title: string;
  spice: string;
  expectedVerdict: string;
  expectedCapCspr?: number;
  requestedAmountCspr: number;
}

interface Props {
  seedProposals: SeedProposal[];
  treasuryCspr: number;
}

export function DeliberationChamber({ seedProposals, treasuryCspr }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [proposalState, setProposalState] = useState<ProposalWithState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectProposal = useCallback((id: string) => {
    setSelectedId(id);
    setProposalState(null);
    setError(null);
  }, []);

  const handleConvene = useCallback(async (proposalId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/deliberate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deliberation failed");
      setProposalState(data.proposal);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVeto = useCallback(async () => {
    if (!proposalState) return;
    try {
      const res = await fetch(`/api/proposals/${proposalState.proposal.id}/veto`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Veto failed");
      setProposalState(data.proposal);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [proposalState]);

  const handleExecute = useCallback(async () => {
    if (!proposalState) return;
    try {
      const res = await fetch(`/api/proposals/${proposalState.proposal.id}/execute`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Execution failed");
      setProposalState(data.proposal);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [proposalState]);

  const state = proposalState;
  const showAgents = state && state.opinions.length > 0;
  const showVerdict = state && state.verdict;
  const showVeto = state && state.veto && state.phase !== "executed" && state.verdict?.verdict !== "REJECT";
  const showExecution = state && state.execution;
  const showTranscript = state && state.transcriptHashHex && state.transcript;

  // Canonicalize for client-side hash verification (same as server-side transcript.ts)
  const canonicalTranscript = state?.transcript
    ? JSON.stringify(sortDeep(state.transcript))
    : "";

  return (
    <div className="space-y-6">
      {/* Proposal Intake */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-widest text-slate-500">
            Select a proposal
          </h2>
          <span className="font-mono text-xs text-slate-500">
            treasury ≈ {treasuryCspr.toLocaleString()} CSPR
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {seedProposals.map((p) => (
            <ProposalCard
              key={p.id}
              {...p}
              active={selectedId === p.id}
              onClick={handleSelectProposal}
            />
          ))}
        </div>
      </section>

      {/* Convene */}
      {selectedId && !state && (
        <div className="flex justify-center animate-fadeIn">
          <ConveneButton
            proposalId={selectedId}
            disabled={loading}
            onConvene={handleConvene}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400 animate-slideDown">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-8 animate-fadeIn">
          <svg className="animate-spinSlow h-8 w-8 text-cyan-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-slate-400">Council is deliberating…</p>
        </div>
      )}

      {/* ── Deliberation Chamber ── */}
      {showAgents && (
        <section className="space-y-4 animate-fadeIn">
          {/* Proposal header */}
          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-slate-500">{state.proposal.id}</span>
                <h3 className="mt-1 text-lg font-medium text-slate-100">{state.proposal.title}</h3>
              </div>
              <div className="flex items-center gap-3">
                {state.phase !== "idle" && (
                  <span className={`
                    flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider
                    ${state.phase === "executed" ? "bg-green-500/10 text-green-400 border border-green-500/30"
                      : state.phase === "vetoed" ? "bg-red-500/10 text-red-400 border border-red-500/30"
                      : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"}
                  `}>
                    <span className={state.phase === "veto_window" ? "animate-blink" : ""}>●</span>
                    {state.phase.replace("_", " ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Agent columns */}
          <div className="grid gap-3 md:grid-cols-3 stagger">
            {state.opinions.map((opinion) => (
              <AgentColumn key={opinion.role} opinion={opinion} animate />
            ))}
          </div>

          {/* Arbiter verdict */}
          {showVerdict && state.verdict && (
            <ArbiterVerdict verdict={state.verdict} animate />
          )}

          {/* Quorum + Veto bar */}
          {state.approvals.quorum > 0 && state.verdict?.verdict !== "REJECT" && (
            <div className="space-y-3">
              <QuorumMeter approvals={state.approvals.count} quorum={state.approvals.quorum} />

              {showVeto && state.veto && (
                <VetoBar
                  windowClosesAt={state.veto.windowClosesAt}
                  vetoed={state.veto.vetoed}
                  onVeto={handleVeto}
                  onExpired={handleExecute}
                />
              )}
            </div>
          )}

          {/* Execute button (manual, for demo) */}
          {state.phase === "veto_window" && !state.veto?.vetoed && (
            <div className="flex justify-center">
              <button
                onClick={handleExecute}
                className="rounded-lg border border-green-500/30 bg-green-500/10 px-6 py-2.5 text-sm font-semibold text-green-400 hover:bg-green-500/20 hover:border-green-400/50 transition-all"
              >
                Execute Now (skip veto window)
              </button>
            </div>
          )}

          {/* Execution result */}
          {showExecution && state.execution && (
            <DeployHashLink
              deployHash={state.execution.deployHash}
              explorerUrl={state.execution.explorerUrl}
              simulated={state.execution.simulated}
            />
          )}

          {/* Transcript hash verifier */}
          {showTranscript && state.transcriptHashHex && (
            <TranscriptHashVerifier
              transcriptHashHex={state.transcriptHashHex}
              transcriptJson={canonicalTranscript}
            />
          )}
        </section>
      )}
    </div>
  );
}

// ── Client-side canonical sort (mirrors core/transcript.ts) ─────────────

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
