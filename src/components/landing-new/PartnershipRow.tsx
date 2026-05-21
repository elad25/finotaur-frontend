// src/components/landing-new/PartnershipRow.tsx
// ================================================
// VENDOR ROW — NinjaTrader + Kinetick official-vendor strip
// Matches SocialProof.tsx aesthetic: hairline rules, gold eyebrow
//
// Compliance (NinjaTrader Vendor Guidelines, 2026-05-21 review by
// Juliet Wu, Business Development):
//  • Eyebrow MUST read "Official Vendor Of" — NOT "In Partnership With".
//  • Tagline MUST NOT imply trade execution or live market-data streaming.
//    Finotaur is a connection/integration to NT/Tradovate for analytics.
//  • Kinetick logo: now pointing at `Kinetick_Logo.png` — extracted
//    verbatim from NT's Homepage-Images-Logos.zip Media Kit (file kept
//    at original NT-supplied name to make the audit trail obvious).
//    The earlier placeholder `kinetick-official.svg` is left in /brokers
//    as inert artifact in case any other component references it; safe
//    to delete in a future cleanup once grep confirms no other usages.
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
            Official Vendor Of
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
              src="/brokers/Kinetick_Logo.png"
              alt="Kinetick"
              className="h-8 md:h-10 w-auto"
            />
          </a>
        </div>

        {/* Tagline */}
        <p className="text-center text-sm text-ink-secondary max-w-xl mx-auto leading-relaxed">
          Connect directly to NinjaTrader and Tradovate, and analyze your futures trades in your Finotaur journal.
        </p>
      </div>

      {/* Bottom hairline */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent" />
    </section>
  );
};

export default PartnershipRow;
