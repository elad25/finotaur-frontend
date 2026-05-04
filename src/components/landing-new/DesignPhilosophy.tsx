// src/components/landing-new/DesignPhilosophy.tsx
// ================================================
// Before / After — Paired comparison cards.
// Each comparison: Before (red/num-negative) | After (gold).
// Desktop: 2-column grid. Mobile: stacked.
// Hormozi: Perceived Likelihood + Dream Outcome (visual)
// ================================================

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { SectionShell } from "./_shared/SectionShell";
import { SectionEyebrow } from "./_shared/SectionEyebrow";
import { SectionTitle } from "./_shared/SectionTitle";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const comparisons = [
  {
    before: "Wake up to 50 headlines and zero clarity",
    after: "Wake up with War Zone — know exactly what matters",
  },
  {
    before: "Analyze a stock in 4 hours",
    after: "AI analyzes it in 30 seconds",
  },
  {
    before: "Trade on gut feeling",
    after: "Trade on data and conclusions",
  },
  {
    before: "No idea why you're losing",
    after: "AI journal shows exactly where the problem is",
  },
  {
    before: "Pay $2,000+/month for separate tools",
    after: "Everything for $109/month — one place",
  },
];

// ---------------------------------------------------------------------------
// ComparisonPair — one Before + one After card
// ---------------------------------------------------------------------------
interface ComparisonPairProps {
  before: string;
  after: string;
  index: number;
}

function ComparisonPair({ before, after, index }: ComparisonPairProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="grid md:grid-cols-2 gap-4 md:gap-6"
    >
      {/* ── Before card (red / num-negative) ── */}
      <div className="relative rounded-[12px] p-6 bg-section-card-rest border border-num-negative/30 shadow-card-rest">
        {/* Corner brackets — red tint */}
        <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-num-negative/40 pointer-events-none" aria-hidden="true" />
        <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-num-negative/40 pointer-events-none" aria-hidden="true" />
        <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-num-negative/40 pointer-events-none" aria-hidden="true" />
        <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-num-negative/40 pointer-events-none" aria-hidden="true" />

        {/* Eyebrow tag */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm border border-num-negative/30 bg-num-negative/10 text-[9.5px] uppercase tracking-[0.32em] text-num-negative font-bold mb-4">
          <X className="w-3 h-3" aria-hidden="true" />
          Before
        </div>

        {/* Body */}
        <p className="text-ink-secondary text-sm leading-relaxed">{before}</p>
      </div>

      {/* ── After card (gold) ── */}
      <div className="relative rounded-[12px] p-6 bg-section-card-rest border border-gold-border shadow-card-rest">
        {/* Corner brackets — gold */}
        <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-construction-marker pointer-events-none" aria-hidden="true" />
        <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-construction-marker pointer-events-none" aria-hidden="true" />
        <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-construction-marker pointer-events-none" aria-hidden="true" />
        <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-construction-marker pointer-events-none" aria-hidden="true" />

        {/* Eyebrow tag */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm border border-gold-muted bg-gold-border text-[9.5px] uppercase tracking-[0.32em] text-gold-primary font-bold mb-4">
          <Check className="w-3 h-3" aria-hidden="true" />
          After
        </div>

        {/* Body */}
        <p className="text-ink-primary text-sm leading-relaxed font-medium">{after}</p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// DesignPhilosophy
// ---------------------------------------------------------------------------
const DesignPhilosophy = () => {
  return (
    <SectionShell id="design-philosophy" atmosphere="subtle" beam={false} constructionMarkers={false}>
      {/* Section header */}
      <div className="text-center mb-12">
        <SectionEyebrow>Design Philosophy</SectionEyebrow>
        <SectionTitle gradient="split">
          <span className="text-ink-primary">Before &amp; After </span>
          <span className="text-gold-primary">Finotaur</span>
        </SectionTitle>
        <p className="font-sans font-light text-ink-secondary text-base leading-relaxed max-w-xl mx-auto mt-4">
          The transformation is real. Here&apos;s what changes on day one.
        </p>
      </div>

      {/* Comparison pairs — vertical stack */}
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {comparisons.map((comp, index) => (
          <ComparisonPair
            key={index}
            before={comp.before}
            after={comp.after}
            index={index}
          />
        ))}
      </div>
    </SectionShell>
  );
};

export default DesignPhilosophy;
