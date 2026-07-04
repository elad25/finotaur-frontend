// src/components/landing-new/CoreSystem.tsx
// ================================================
// CoreSystem — "How It Works" section.
// 3-step horizontal process: Ingest → Analyze → Deliver.
// Desktop: 3-column flex row with animated connecting lines.
// Mobile: vertical stack, connecting lines hidden.
// ================================================

import { motion } from 'framer-motion';
import { ArrowDownToLine, Cpu, Zap } from 'lucide-react';
import { SectionShell } from './_shared/SectionShell';
import { SectionEyebrow } from './_shared/SectionEyebrow';
import { SectionTitle } from './_shared/SectionTitle';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const steps = [
  {
    number: '01',
    label: 'Ingest',
    description:
      'Real-time market data, options flow, institutional research, macro signals — pulled continuously from every relevant source.',
    sourcesLabel: 'Sources',
    sources: ['Polygon', 'Perplexity', 'Internal Research', 'Whop'],
    Icon: ArrowDownToLine,
  },
  {
    number: '02',
    label: 'Analyze',
    description:
      'AI engine cross-references signals, runs pattern matching, and weighs conviction across timeframes and asset classes.',
    sourcesLabel: 'Powered by',
    sources: ['Custom Finance Models'],
    Icon: Cpu,
  },
  {
    number: '03',
    label: 'Deliver',
    description:
      'Five focused modules. Push notifications. Top Secret briefings. AI on demand — surfaced where you need it.',
    sourcesLabel: 'Surfaces',
    sources: ['Web', 'Mobile', 'API'],
    Icon: Zap,
  },
] as const;

// ---------------------------------------------------------------------------
// ConnectorLine — horizontal hairline + animated traveling dot (desktop only)
// ---------------------------------------------------------------------------
function ConnectorLine() {
  return (
    <div className="hidden md:flex items-center flex-shrink-0 w-12 relative" aria-hidden="true">
      {/* Hairline */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-construction via-gold-eyebrow-hairline to-construction" />

      {/* Traveling dot */}
      <div className="relative w-full overflow-hidden" style={{ height: '6px' }}>
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gold-primary"
          style={{ boxShadow: '0 0 12px rgba(201,166,70,0.8)' }}
          animate={{ x: ['0%', '100%', '0%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepCard
// ---------------------------------------------------------------------------
type StepData = (typeof steps)[number];

function StepCard({ step, index }: { step: StepData; index: number }) {
  const { number, label, description, sourcesLabel, sources, Icon } = step;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="relative flex-1 rounded-[12px] bg-section-card-rest backdrop-blur-md
        border border-gold-border
        shadow-card-rest hover:shadow-card-hover
        hover:-translate-y-1
        transition-all duration-300
        p-8 flex flex-col"
    >
      {/* Corner brackets */}
      <span className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-construction-marker pointer-events-none" aria-hidden="true" />
      <span className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-construction-marker pointer-events-none" aria-hidden="true" />
      <span className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-construction-marker pointer-events-none" aria-hidden="true" />
      <span className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-construction-marker pointer-events-none" aria-hidden="true" />

      {/* Icon — top-right, subtle */}
      <div className="absolute top-6 right-6 opacity-40 text-gold-primary" aria-hidden="true">
        <Icon className="w-5 h-5" />
      </div>

      {/* Large step number */}
      <p
        className="font-wordmark font-medium text-6xl md:text-7xl leading-[0.85] tracking-[-0.04em] mb-4
          bg-gradient-gold-vertical bg-clip-text text-transparent select-none"
        aria-hidden="true"
      >
        {number}
      </p>

      {/* Step eyebrow */}
      <p className="font-sans text-[10px] uppercase tracking-[0.32em] text-gold-eyebrow font-medium mb-2">
        Step {number}
      </p>

      {/* Step title */}
      <h3 className="font-wordmark font-medium text-2xl md:text-[28px] tracking-[-0.02em] leading-[1.1] text-ink-primary mb-4">
        {label}
      </h3>

      {/* Description */}
      <p className="font-sans font-light text-ink-secondary text-base leading-[1.65] mt-1 flex-1">
        {description}
      </p>

      {/* Divider + sources */}
      <div className="mt-6 pt-4 border-t border-construction">
        <p className="font-sans text-[9px] uppercase tracking-[0.36em] text-ink-muted font-medium mb-2">
          {sourcesLabel}
        </p>
        <p className="font-sans text-[12px] font-light text-ink-tertiary">
          {sources.map((s, i) => (
            <span key={s}>
              {i > 0 && <span className="text-gold-eyebrow-hairline mx-1">·</span>}
              {s}
            </span>
          ))}
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// CoreSystem
// ---------------------------------------------------------------------------
const CoreSystem = () => {
  return (
    <SectionShell id="how-it-works" atmosphere="full" beam={false} constructionMarkers={false}>
      {/* Section header */}
      <div className="text-center mb-16">
        <SectionEyebrow>How It Works</SectionEyebrow>
        <SectionTitle gradient="split">
          One intelligence layer.{' '}
          <span className="text-gold-primary">Three stages.</span>
        </SectionTitle>

        {/* Subhead */}
        <p className="font-sans font-light text-ink-secondary text-base md:text-lg leading-relaxed max-w-xl mx-auto mt-4">
          From raw market signals to actionable conviction — fully automated, fully transparent.
        </p>
      </div>

      {/* Steps row */}
      <ol
        className="flex flex-col md:flex-row items-stretch gap-6 md:gap-0 list-none"
        aria-label="How Finotaur works"
      >
        {steps.map((step, index) => (
          <li key={step.number} className="contents">
            <StepCard step={step} index={index} />
            {index < steps.length - 1 && <ConnectorLine />}
          </li>
        ))}
      </ol>
    </SectionShell>
  );
};

export default CoreSystem;
