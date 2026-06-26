import { loadProposals } from "@/lib/fixtures";
import { DeliberationChamber } from "@/components/DeliberationChamber";
import { ProposalComposer } from "@/components/ProposalComposer";
import { version } from "../../package.json";

const FLOW = [
  "Proposal arrives (target, entrypoint, args, rationale)",
  "Risk / Treasury / Legal agents read live Testnet state via Casper MCP",
  "Arbiter reconciles the debate into a verdict + confidence",
  "Council approvals reach quorum (off-chain consensus)",
  "Human veto window — an always-visible kill-switch",
  "casper-js-sdk executes the approved TransactionV1",
  "Transcript hashed on-chain for immutable audit",
];

export default async function Home() {
  const { treasury, proposals } = loadProposals();

  const seedProposals = proposals.map((p) => ({
    id: p.id,
    title: p.title,
    spice: p.spice,
    expectedVerdict: p.expectedVerdict,
    expectedCapCspr: p.expectedCapCspr,
    requestedAmountCspr: p.requestedAmountCspr,
  }));

  return (
    <main className="min-h-screen grid-bg relative overflow-hidden">
      {/* Drifting Nebula Ambient Effect */}
      <div className="nebula-glow" />

      {/* Cyber Scanline effect */}
      <div className="scanline" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-12">
        {/* ── Hero ── */}
        <header className="animate-fadeIn">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              {/* Premium Pulsing Animated SVG Emblem */}
              <svg className="h-8 w-8 text-cyan-400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.6" className="animate-spinSlow" />
                <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="1" opacity="0.3" className="animate-pulse" />
                <path d="M30 70V45M43 70V38M57 70V38M70 70V45" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
                <path d="M24 72H76M26 35C26 28 35 24 50 24C65 24 74 28 74 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="M50 48L52 53L57 53.5L53.5 57L54.5 62L50 59.5L45.5 62L46.5 57L43 53.5L48 53L50 48Z" fill="currentColor" className="animate-pulse" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] font-semibold text-cyan-400 text-glow">
                Vouch · Casper Agentic Buildathon 2026
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gradient mt-1 flex items-center gap-3">
                Conclave
                <span className="inline-flex items-center rounded-md bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-400 ring-1 ring-inset ring-cyan-500/20">
                  v{version}
                </span>
              </h1>
            </div>
          </div>
          <p className="mt-6 text-xl sm:text-2xl font-light text-slate-200 max-w-3xl leading-snug">
            Agentic governance that reads the contract before it signs.
          </p>
          <p className="mt-4 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-400">
            A council of AI agents debates every DAO treasury proposal, grounds it in live
            Casper state, collects council approvals off-chain, and — after a human veto
            window — executes the approved transaction on Casper Testnet. The visible
            disagreement between agents <em className="text-slate-300">is</em> the trust mechanism.
          </p>

          {/* Interactive CTA Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#deliberation-chamber"
              className="relative group overflow-hidden px-5 py-3 rounded-lg bg-cyan-500 text-slate-950 font-medium text-xs tracking-wider uppercase transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Enter Council Chamber
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
              </span>
              <span className="absolute inset-0 bg-linear-to-r from-cyan-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </a>
            <a
              href="#what-if-composer"
              className="px-5 py-3 rounded-lg bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-500 font-medium text-xs tracking-wider uppercase transition-all duration-300"
            >
              Compose Proposal
            </a>
          </div>
        </header>

        {/* ── Flow steps (Bento Box style) ── */}
        <section className="mt-16 animate-slideUp">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Consensus & Execution Protocol
          </h2>
          <ol className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-7">
            {FLOW.map((step, i) => (
              <li
                key={i}
                className="bento-card glass-elevated rounded-xl p-4 flex flex-col justify-between min-h-[120px] relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 h-16 w-16 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/60 text-xs font-bold text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p className="mt-4 text-[11px] font-medium leading-relaxed text-slate-300">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Deliberation Chamber ── */}
        <section id="deliberation-chamber" className="mt-16 pt-8 scroll-mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
            Deliberation Chamber
          </h2>
          <DeliberationChamber
            seedProposals={seedProposals}
            treasuryCspr={treasury.fundedCspr}
          />
        </section>

        {/* ── What-If Composer ── */}
        <section id="what-if-composer" className="scroll-mt-6">
          <ProposalComposer />
        </section>

        {/* ── Footer ── */}
        <footer className="mt-16 border-t border-slate-800/50 pt-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span>Built on the verified Casper surface —</span>
            <span className="rounded border border-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">MCP reads</span>
            <span className="rounded border border-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">casper-js-sdk</span>
            <span className="rounded border border-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">Odra</span>
            <span className="rounded border border-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">CSPR.cloud</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-600">
              Part of the <span className="text-slate-400">Vouch</span> suite:
              Conclave (governance) · <span className="text-slate-500">Verity</span> (oracle) · <span className="text-slate-500">Bastion</span> (ZK compliance).
            </p>
            <span className="shrink-0 rounded border border-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-500">
              v{process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
