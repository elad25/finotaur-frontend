// src/pages/app/ai/copilot/components/CopilotEmptyState.tsx
// Shared "connect a broker" CTA card. Mounted by any COPILOT sub-page that
// has nothing meaningful to display until the user links a broker
// (Risks, Dashboard, Holdings, Allocation, etc.).
//
// Visual language mirrors CopilotPageHeader's gold gradient "Connect broker"
// button so the CTA reads as the same affordance in both surfaces.
import { useState } from 'react';
import { Link2, FileEdit } from 'lucide-react';
import IBConnectionPopup from '@/components/brokers/IBConnectionPopup';
import ManualPortfolioPopup from '@/components/brokers/ManualPortfolioPopup';

export interface CopilotEmptyStateProps {
  title: string;
  description: string;
}

export function CopilotEmptyState({ title, description }: CopilotEmptyStateProps) {
  const [showIBPopup, setShowIBPopup] = useState(false);
  const [showManualPopup, setShowManualPopup] = useState(false);

  return (
    <>
      <section className="rounded-[12px] border border-gold-primary/20 bg-[#050505]/96 p-8 text-center shadow-[0_18px_45px_rgba(0,0,0,0.45),0_0_24px_rgba(201,166,70,0.10)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold-primary/30 bg-gold-primary/[0.08] text-gold-primary shadow-[0_0_24px_rgba(201,166,70,0.18)]">
          <Link2 className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold text-gold-primary">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-secondary">{description}</p>
        <div className="mx-auto mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setShowIBPopup(true)}
            className="inline-flex items-center gap-2 rounded-[8px] border border-gold-bright/55 bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-black shadow-[0_0_24px_rgba(201,166,70,0.26)] transition hover:brightness-110"
          >
            <Link2 className="h-4 w-4" />
            Connect Interactive Brokers
          </button>
          <button
            type="button"
            onClick={() => setShowManualPopup(true)}
            className="inline-flex items-center gap-2 rounded-[8px] border border-gold-primary/35 bg-transparent px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-gold-primary transition hover:border-gold-primary/60 hover:bg-gold-primary/[0.06]"
          >
            <FileEdit className="h-4 w-4" />
            Manual Portfolio
          </button>
        </div>
      </section>
      {showIBPopup && <IBConnectionPopup onClose={() => setShowIBPopup(false)} />}
      {showManualPopup && <ManualPortfolioPopup onClose={() => setShowManualPopup(false)} />}
    </>
  );
}
