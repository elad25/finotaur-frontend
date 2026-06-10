// src/pages/app/ai/copilot/components/CopilotPageHeader.tsx
// Persistent brand header for the COPILOT standalone shell. Rendered once
// by CopilotStandaloneLayout above the routed content; sub-pages inherit it
// automatically.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Link2 } from 'lucide-react';
import IBConnectionPopup from '@/components/brokers/IBConnectionPopup';
import { useIBConnection } from '@/hooks/brokers/useIBConnection';

export function CopilotPageHeader() {
  const [showBrokerPopup, setShowBrokerPopup] = useState(false);
  const ib = useIBConnection();

  return (
    <>
      <div className="relative overflow-hidden border-b border-gold-primary/12 pb-5 pt-1">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
        <Link
          to="/app/home"
          aria-label="Back to FINOTAUR"
          className="absolute left-0 top-0 z-20 inline-flex items-center gap-2 rounded-[8px] border border-gold-primary/25 bg-black/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gold-primary backdrop-blur-sm transition hover:border-gold-primary/45 hover:bg-gold-primary/10 hover:text-gold-bright"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        {/* Offset the heading block left by half the sidebar width so it is centered
            on the full viewport, not just the (sidebar-offset) content column. Uses the
            same --finotaur-sidebar-width var as <main>'s ml, so it tracks collapse state. */}
        <div className="md:translate-x-[calc(var(--finotaur-sidebar-width,14rem)/-2)]">
          <p className="text-center text-[10px] uppercase tracking-[0.28em] text-gold-primary/72">
            Finotaur Intelligence System
          </p>
          <h1 className="mx-auto mt-3 max-w-[980px] text-center text-[36px] font-semibold uppercase leading-[0.95] text-white md:text-[52px]">
            <span className="bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text text-transparent">
              FINOTAUR
            </span>{' '}
            <span className="text-ink-primary">COPILOT</span>
          </h1>
        </div>
        {ib.isConnected ? (
          <button
            type="button"
            onClick={() => setShowBrokerPopup(true)}
            title={ib.lastSyncAt ? `Last sync: ${new Date(ib.lastSyncAt).toLocaleString()}` : 'Connected'}
            className="mx-auto mt-4 flex items-center gap-2 rounded-[8px] border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.18)] transition hover:bg-emerald-500/15 xl:absolute xl:right-2 xl:top-1/2 xl:mt-0 xl:-translate-y-1/2"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-white/90">Interactive Brokers</span>
            {ib.accountId && (
              <span className="font-mono text-emerald-200/80 normal-case tracking-normal">{ib.accountId}</span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowBrokerPopup(true)}
            className="mx-auto mt-4 flex items-center gap-2 rounded-[8px] border border-gold-bright/55 bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-black shadow-[0_0_24px_rgba(201,166,70,0.26)] transition hover:brightness-110 xl:absolute xl:right-2 xl:top-1/2 xl:mt-0 xl:-translate-y-1/2"
          >
            <Link2 className="h-4 w-4" />
            Connect broker
          </button>
        )}
      </div>
      {showBrokerPopup && <IBConnectionPopup onClose={() => setShowBrokerPopup(false)} />}
    </>
  );
}
