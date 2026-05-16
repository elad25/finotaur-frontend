// src/components/landing-new/PartnershipRow.tsx
// ================================================
// PARTNERSHIP ROW — NinjaTrader + Kinetick affiliate strip
// Matches SocialProof.tsx aesthetic: hairline rules, gold eyebrow
// ================================================

const PartnershipRow = () => {
  return (
    <section className="relative overflow-hidden py-8 md:py-10 bg-section-base">
      {/* Top hairline */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Eyebrow */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold-eyebrow-hairline" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-gold-primary/60 font-medium">
            In Partnership With
          </span>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold-eyebrow-hairline" />
        </div>

        {/* Logos */}
        <div className="flex items-center justify-center gap-12 md:gap-20 mb-3">
          <a
            href="https://ninjatraderdomesticvendor.sjv.io/YVNmGP"
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="opacity-80 hover:opacity-100 transition-opacity"
            aria-label="NinjaTrader"
          >
            <img
              src="/brokers/ninjatrader-official.svg"
              alt="NinjaTrader"
              className="h-10 md:h-12 w-auto"
            />
          </a>
          <a
            href="http://kinetick.com/NinjaTrader"
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="opacity-80 hover:opacity-100 transition-opacity"
            aria-label="Kinetick"
          >
            <img
              src="/brokers/kinetick-official.svg"
              alt="Kinetick"
              className="h-8 md:h-10 w-auto"
            />
          </a>
        </div>

        {/* Tagline */}
        <p className="text-center text-sm text-ink-secondary max-w-xl mx-auto leading-relaxed">
          Execute futures and stream institutional-grade market data directly through your trading journal.
        </p>
      </div>

      {/* Bottom hairline */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent" />
    </section>
  );
};

export default PartnershipRow;
