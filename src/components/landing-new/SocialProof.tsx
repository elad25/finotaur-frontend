// src/components/landing-new/SocialProof.tsx
// ================================================
// SOCIAL PROOF — "SYNCS WITH" broker-logo trust strip.
// ================================================

"use client";

import { SectionShell } from "./_shared/SectionShell";

// ---------------------------------------------------------------------------
// IntegrationsStrip — static "SYNCS WITH" trust band.
// ---------------------------------------------------------------------------
function IntegrationsStrip() {
  return (
    <div className="py-2 md:py-2.5">
      <p className="text-center text-xs tracking-[0.3em] text-gold-primary/80 uppercase mb-4">
        Syncs With
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-8 md:gap-x-14">
        <div className="flex flex-col items-center gap-2">
          <img
            src="/brokers/ninjatrader-mark.svg"
            alt="NinjaTrader"
            className="h-9 w-auto opacity-70 hover:opacity-100 transition-opacity"
          />
          <span className="text-[10px] tracking-[0.2em] uppercase text-ink-secondary">
            NinjaTrader
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <img
            src="/brokers/tradovate-mark.svg"
            alt="Tradovate"
            className="h-9 w-auto opacity-70 hover:opacity-100 transition-opacity"
          />
          <span className="text-[10px] tracking-[0.2em] uppercase text-ink-secondary">
            Tradovate
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <img
            src="/brokers/ibkr-mark.svg"
            alt="Interactive Brokers"
            className="h-9 w-auto opacity-70 hover:opacity-100 transition-opacity"
          />
          <span className="text-[10px] tracking-[0.2em] uppercase text-ink-secondary">
            Interactive Brokers
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SocialProof
// ---------------------------------------------------------------------------
const SocialProof = () => {
  return (
    <SectionShell
      atmosphere="none"
      beam={false}
      className="py-4 md:py-6"
    >
      <div className="max-w-6xl mx-auto px-6 relative">
        {/* Subtle ambient gold beam — behind content */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 50% 50%, rgba(201,166,70,0.05) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />

        {/* TOP hairline rule */}
        <div
          className="w-full h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent"
          aria-hidden="true"
        />

        {/* ── SYNCS WITH ── static trust band */}
        <IntegrationsStrip />

        {/* BOTTOM hairline rule */}
        <div
          className="w-full h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent"
          aria-hidden="true"
        />
      </div>
    </SectionShell>
  );
};

export default SocialProof;
