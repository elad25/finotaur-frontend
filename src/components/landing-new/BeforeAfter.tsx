// src/components/landing-new/BeforeAfter.tsx
// ================================================
// UNLOCK — "Unlock the power of FINOTAUR"
// Persona self-selection: two doors in, Trader and Investor.
// Full reframe from the old 3-capability numbered-card pattern.
// ================================================

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Crosshair, Telescope } from 'lucide-react';
import { SectionShell } from './_shared/SectionShell';
import { SectionEyebrow } from './_shared/SectionEyebrow';
import { SectionTitle } from './_shared/SectionTitle';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const unlocks = [
  {
    eyebrow: 'FOR THE TRADER',
    title: 'Trade with an edge',
    promise: 'Catch the revenge trade before you take it.',
    description: 'Every tool a serious trader needs, in one terminal.',
    includesLabel: 'INCLUDES',
    includes: ['Trade Journal', 'AI Coach', 'Risk Management', 'Trade Copier'],
    ctaLabel: 'Enter as a Trader',
    Icon: Crosshair,
  },
  {
    eyebrow: 'FOR THE INVESTOR',
    title: 'Invest with clarity',
    promise: 'One brief every morning. What moved, and why.',
    description: 'The whole market on one page. The brief that replaces your nine tabs.',
    includesLabel: 'INCLUDES',
    includes: ['Daily Brief', 'Top Secret Reports', 'Insiders & 13F', 'Company Research'],
    ctaLabel: 'Enter as an Investor',
    Icon: Telescope,
  },
] as const;

// ---------------------------------------------------------------------------
// UnlockCard
// ---------------------------------------------------------------------------
type UnlockData = (typeof unlocks)[number];

function UnlockCard({ unlock, index }: { unlock: UnlockData; index: number }) {
  const { eyebrow, title, promise, description, includesLabel, includes, ctaLabel, Icon } = unlock;

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

      {/* Eyebrow: FOR THE TRADER */}
      <p className="font-sans uppercase tracking-[0.32em] text-[10px] text-gold-eyebrow font-medium flex items-center gap-1.5">
        <span className="inline-block w-1 h-1 rounded-full bg-gold-primary flex-shrink-0" aria-hidden="true" />
        {eyebrow}
      </p>

      {/* Title */}
      <h3 className="font-sans font-semibold text-2xl md:text-3xl text-ink-primary tracking-[-0.02em] leading-[1.1] mt-3">
        {title}
      </h3>

      {/* Promise — sans gold accent */}
      <p className="font-sans font-medium text-gold-primary text-lg md:text-xl leading-[1.4] mt-4">
        {promise}
      </p>

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

      {/* CTA — gold text link, not a filled button (one gold button max/viewport) */}
      <Link
        to="/auth/register"
        className="mt-6 flex items-center gap-1.5 text-gold-primary text-sm font-medium
          tracking-[0.02em] w-fit
          hover:underline underline-offset-4 transition-colors"
      >
        {ctaLabel}
        <span className="group-hover:translate-x-1 transition-transform inline-block" aria-hidden="true">
          →
        </span>
      </Link>
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
          One terminal, two ways in. Choose the edge you came for.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
        {unlocks.map((unlock, index) => (
          <UnlockCard key={unlock.title} unlock={unlock} index={index} />
        ))}
      </div>
    </SectionShell>
  );
};

export default BeforeAfter;
