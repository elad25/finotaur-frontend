// src/components/landing-new/BeforeAfter.tsx
// ================================================
// UNLOCK — "Unlock the power of FINOTAUR"
// Positive exclusive framing: 3 institutional capabilities decoded.
// Full reframe from the old "Retail traders fight with hands tied" pain-point pattern.
// ================================================

import { motion } from 'framer-motion';
import { Brain, Zap, LineChart } from 'lucide-react';
import { SectionShell } from './_shared/SectionShell';
import { SectionEyebrow } from './_shared/SectionEyebrow';
import { SectionTitle } from './_shared/SectionTitle';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const unlocks = [
  {
    number: '01',
    eyebrow: 'UNLOCK 01',
    title: 'Institutional Intelligence',
    description:
      'Real-time AI analysis trained on flow data, macro signals, and analyst-grade research. The same edge funds pay $25K/year for.',
    includesLabel: 'INCLUDES',
    includes: ['AI Engine', 'Top Secret Reports', 'Sector Analyzer'],
    Icon: Brain,
  },
  {
    number: '02',
    eyebrow: 'UNLOCK 02',
    title: 'Real-Time Edge',
    description:
      'Pre-market briefings, live options flow, sector rotation tracking. See where smart money is moving before the headlines.',
    includesLabel: 'INCLUDES',
    includes: ['Top Secret', 'Options Flow', 'Live Signals'],
    Icon: Zap,
  },
  {
    number: '03',
    eyebrow: 'UNLOCK 03',
    title: 'Personal Trading System',
    description:
      'Your trades, backtested. Your strategies, refined. AI-powered insights from your own data — what works, what doesn\'t, and why.',
    includesLabel: 'INCLUDES',
    includes: ['Trading Journal', 'Backtesting', 'AI Insights'],
    Icon: LineChart,
  },
] as const;

// ---------------------------------------------------------------------------
// UnlockCard
// ---------------------------------------------------------------------------
type UnlockData = (typeof unlocks)[number];

function UnlockCard({ unlock, index }: { unlock: UnlockData; index: number }) {
  const { number, eyebrow, title, description, includesLabel, includes, Icon } = unlock;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="relative rounded-[12px] p-8 md:p-10
        bg-section-card-rest backdrop-blur-md
        border border-gold-border
        shadow-card-rest hover:shadow-card-hover
        hover:-translate-y-1
        transition-all duration-500 group"
    >
      {/* Corner brackets */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-construction-marker pointer-events-none" aria-hidden="true" />
      <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-construction-marker pointer-events-none" aria-hidden="true" />
      <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-construction-marker pointer-events-none" aria-hidden="true" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-construction-marker pointer-events-none" aria-hidden="true" />

      {/* Icon — top-right corner, subtle gold */}
      <div className="absolute top-6 right-6 opacity-40 text-gold-primary" aria-hidden="true">
        <Icon className="w-4 h-4" />
      </div>

      {/* Eyebrow: UNLOCK 01 */}
      <p className="font-sans uppercase tracking-[0.32em] text-[10px] text-gold-eyebrow font-medium flex items-center gap-1.5">
        <span className="inline-block w-1 h-1 rounded-full bg-gold-primary flex-shrink-0" aria-hidden="true" />
        {eyebrow}
      </p>

      {/* Big number */}
      <motion.p
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 + index * 0.15, duration: 0.7 }}
        className="font-wordmark font-medium text-7xl leading-[0.9] tracking-[-0.02em] mt-3
          bg-gradient-gold-vertical bg-clip-text text-transparent select-none"
        aria-hidden="true"
      >
        {number}
      </motion.p>

      {/* Title */}
      <h3 className="font-wordmark font-medium text-2xl md:text-3xl text-ink-primary tracking-[-0.02em] leading-[1.1] mt-3">
        {title}
      </h3>

      {/* Description */}
      <p className="font-sans font-light text-ink-secondary text-base leading-[1.6] mt-4">
        {description}
      </p>

      {/* Divider */}
      <div className="border-t border-construction mt-6 pt-6">
        {/* Includes label */}
        <p className="font-sans text-[10px] uppercase tracking-[0.32em] text-ink-muted font-medium mb-3">
          {includesLabel}
        </p>

        {/* Chips */}
        <div className="flex flex-wrap gap-2">
          {includes.map((chip) => (
            <span
              key={chip}
              className="px-2.5 py-1 rounded-sm border border-gold-border bg-gold-border/30
                text-[11px] tracking-[0.08em] text-ink-secondary"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// BeforeAfter (now: UNLOCK section)
// ---------------------------------------------------------------------------
const BeforeAfter = () => {
  return (
    <SectionShell id="unlock" atmosphere="full" beam={false} constructionMarkers={false}>
      {/* Section header */}
      <div className="text-center mb-12 md:mb-16">
        <SectionEyebrow size="lg">The Privilege</SectionEyebrow>

        <SectionTitle gradient="split" size="large">
          Unlock the power of{' '}
          <span className="text-gold-primary">FINOTAUR</span>.
        </SectionTitle>

        {/* Subhead */}
        <p className="font-sans font-light text-ink-secondary text-base md:text-lg max-w-2xl mx-auto mt-4">
          Three institutional capabilities, decoded for the independent trader. No more guesswork. No more lag.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        {unlocks.map((unlock, index) => (
          <UnlockCard key={unlock.number} unlock={unlock} index={index} />
        ))}
      </div>
    </SectionShell>
  );
};

export default BeforeAfter;
