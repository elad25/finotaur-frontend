// src/components/journal/ds/JournalKpiCard.tsx
//
// Journal-grade glass KPI card — the single primitive used across every journal page.
// Visual reference: the Overview dashboard cards (NET P&L / WIN RATE / PROFIT FACTOR
// etc). Big bold value colored by accent, label-eyebrow on top-left, optional hint
// below, optional gauge inline-right. NO icon circles — Elad explicitly chose the
// cleaner Overview look (2026-05-09).
//
// @see JOURNAL_DESIGN.md § The Journal KPI Card

import React, { type ReactNode } from 'react';
import { HelpCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Accent = 'gold' | 'green' | 'red' | 'blue' | 'purple' | 'neutral';

export interface JournalKpiCardProps {
  /** Metric name — rendered as small-caps eyebrow top-left. */
  label: string;
  /** Pre-formatted value string. Caller handles currency, %, etc. */
  value: string;
  /** Supporting sub-text below the value (e.g. "6 / 9 trades"). */
  hint?: string;
  /** Colour scheme — drives both the value text color and the card accent. */
  accent?: Accent;
  /** Optional gauge slot — mount <JournalGauge /> here, rendered to the right. */
  gauge?: ReactNode;
  /** Optional tooltip text shown on the inline ? help icon next to the label. */
  tooltip?: string;
  /**
   * @deprecated The Overview-matching design has no icon circle. Prop accepted
   * to keep existing callsites compiling but not rendered. Will be removed
   * after the renovation cleanup pass.
   */
  icon?: LucideIcon;
  /**
   * Font-size override for the value string.
   * 'lg'  = text-2xl   (24px)
   * 'xl'  = text-3xl   (30px) — default, matches Overview KPI cards
   * '2xl' = text-4xl   (36px) — use only for hero metrics
   */
  valueSize?: 'lg' | 'xl' | '2xl';
  className?: string;
}

// ---------------------------------------------------------------------------
// Accent → visual map (matches the Overview cards exactly)
// ---------------------------------------------------------------------------

interface AccentConfig {
  /** Tailwind class applied to the big VALUE text — the dominant focal color */
  valueText: string;
  /** Subtle accent background tint behind the whole card (135deg gradient) */
  accentBg: string;
  /** Border + ambient-glow color (hex with alpha appended at use-site) */
  glow: string;
}

const ACCENT_MAP: Record<Accent, AccentConfig> = {
  // P&L positive values, Profit Factor — Overview's bright mint-green
  green: {
    valueText: 'text-[#4AD295]',
    accentBg:  'linear-gradient(135deg, rgba(74,210,149,0.06) 0%, rgba(74,210,149,0.02) 50%, rgba(255,255,255,0.01) 100%)',
    glow:      '#4AD295',
  },
  // Win rate, ratios, AVG R — Overview's gold
  gold: {
    valueText: 'text-[#C9A646]',
    accentBg:  'linear-gradient(135deg, rgba(201,166,70,0.06) 0%, rgba(201,166,70,0.02) 50%, rgba(255,255,255,0.01) 100%)',
    glow:      '#C9A646',
  },
  // Negative P&L, drawdown, worst trade — Overview's red
  red: {
    valueText: 'text-[#E36363]',
    accentBg:  'linear-gradient(135deg, rgba(227,99,99,0.06) 0%, rgba(227,99,99,0.02) 50%, rgba(255,255,255,0.01) 100%)',
    glow:      '#E36363',
  },
  // Counts (Total Trades, Streaks)
  blue: {
    valueText: 'text-[#7AB6F4]',
    accentBg:  'linear-gradient(135deg, rgba(122,182,244,0.06) 0%, rgba(122,182,244,0.02) 50%, rgba(255,255,255,0.01) 100%)',
    glow:      '#7AB6F4',
  },
  // R-multiples, ratios — purple stays literal until --metric-ratio token lands
  purple: {
    valueText: 'text-[#9F7AEA]',
    accentBg:  'linear-gradient(135deg, rgba(159,122,234,0.06) 0%, rgba(159,122,234,0.02) 50%, rgba(255,255,255,0.01) 100%)',
    glow:      '#9F7AEA',
  },
  // Default — white value on subtle white-tinted glass
  neutral: {
    valueText: 'text-[#F4F4F4]',
    accentBg:  'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
    glow:      '#C9A646',
  },
};

const VALUE_SIZE_CLASS: Record<NonNullable<JournalKpiCardProps['valueSize']>, string> = {
  lg:  'text-2xl',  // 24px
  xl:  'text-3xl',  // 30px — default, matches Overview
  '2xl': 'text-4xl', // 36px
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const JournalKpiCard = React.memo<JournalKpiCardProps>(function JournalKpiCard({
  label,
  value,
  hint,
  accent = 'neutral',
  gauge,
  tooltip,
  valueSize = 'xl',
  className,
}) {
  const cfg = ACCENT_MAP[accent];
  const valueCls = VALUE_SIZE_CLASS[valueSize];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] group',
        className,
      )}
      style={{
        background: cfg.accentBg,
        border: `1px solid ${cfg.glow}22`,
        boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Ambient hover glow — top-left radial */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `${cfg.glow}18`, filter: 'blur(28px)' }}
      />

      {/* Bottom accent line */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-4 right-4 h-px opacity-40"
        style={{ background: `linear-gradient(90deg, transparent, ${cfg.glow}, transparent)` }}
      />

      {/* Main content — flex row: text left, gauge right */}
      <div className="relative flex items-center justify-between gap-4 p-5">
        {/* Left column: label / value / hint */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Label + optional ? help icon */}
          <div className="mb-3 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6A6A6A]">
              {label}
            </span>
            {tooltip && (
              <div className="relative group/tooltip">
                <HelpCircle
                  className="h-3 w-3 cursor-help transition-colors"
                  style={{ color: `${cfg.glow}60` }}
                />
                <div
                  className="invisible absolute left-0 top-5 z-50 w-48 rounded-xl p-2.5 text-[10px] opacity-0 transition-all duration-200 group-hover/tooltip:visible group-hover/tooltip:opacity-100"
                  style={{
                    background: 'rgba(10,10,10,0.95)',
                    border: `1px solid ${cfg.glow}25`,
                    color: '#A0A0A0',
                    boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 16px ${cfg.glow}15`,
                  }}
                >
                  {tooltip}
                </div>
              </div>
            )}
          </div>

          {/* Value — bold, accent-colored, dominant focal point */}
          <span
            className={cn(
              'font-bold leading-none tracking-tight',
              valueCls,
              cfg.valueText,
            )}
            style={{ letterSpacing: '-0.02em' }}
          >
            {value}
          </span>

          {/* Hint */}
          {hint && (
            <span className="mt-2 text-[10px] font-medium text-[#5A5A5A]">
              {hint}
            </span>
          )}
        </div>

        {/* Right column: optional gauge */}
        {gauge && (
          <div className="flex-shrink-0 opacity-90 transition-opacity duration-300 group-hover:opacity-100">
            {gauge}
          </div>
        )}
      </div>
    </div>
  );
});

JournalKpiCard.displayName = 'JournalKpiCard';

export default JournalKpiCard;
export { JournalKpiCard };
