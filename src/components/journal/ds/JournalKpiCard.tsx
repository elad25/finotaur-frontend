// src/components/journal/ds/JournalKpiCard.tsx
//
// Journal-grade glass KPI card — the single primitive used across every journal page.
//
// Visual reference: the Analytics tab's KPI grid (the look Elad confirmed as "מצוין"
// 2026-05-09). Each card has:
//   • Label small-caps top-left
//   • Icon in a tinted circle top-right (NOT a flat icon)
//   • Big WHITE value, sans-serif Inter font, font-bold
//   • Optional small hint below the value
//   • Subtle bottom-edge gradient sliver in the accent color
//   • Glass background with subtle accent-tint
//   • Optional gauge slot rendered to the right
//
// Accent does NOT colorize the value (Analytics convention: values stay white,
// accent lives in the icon circle and the bottom sliver).
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
  /** Metric name — small-caps eyebrow top-left. */
  label: string;
  /** Pre-formatted value string. */
  value: string;
  /** Supporting sub-text under the value (e.g. "6 / 9 trades"). */
  hint?: string;
  /** Drives the icon-circle tint and the bottom-edge sliver. */
  accent?: Accent;
  /** Lucide icon rendered in a tinted circle top-right. */
  icon?: LucideIcon;
  /** Optional gauge slot (e.g. <JournalGauge />). */
  gauge?: ReactNode;
  /** Optional tooltip — adds an inline ? help icon next to the label. */
  tooltip?: string;
  /**
   * Font-size override for the value:
   * 'lg'  = text-2xl (24px)
   * 'xl'  = text-3xl (30px) — default, matches Analytics
   * '2xl' = text-4xl (36px)
   */
  valueSize?: 'lg' | 'xl' | '2xl';
  /**
   * Optional value-text override. When set, replaces the default white
   * (#F4F4F4) — use sparingly for cases where the value itself needs to
   * encode meaning (e.g. green for positive P&L, red for drawdown). Most
   * journal cards leave this unset and stay neutral white.
   */
  valueColor?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Accent → visual class map
// ---------------------------------------------------------------------------

interface AccentConfig {
  /** Icon circle background tint */
  iconBg: string;
  /** Icon circle border + glow */
  iconBorder: string;
  /** Icon stroke color */
  iconText: string;
  /** Bottom-edge gradient sliver (left → center → right fade) */
  sliverGradient: string;
  /** Subtle card-bg tint (135deg gradient) */
  cardBg: string;
  /** Border + ambient hover-glow color (hex; alpha appended at use site) */
  glow: string;
}

const ACCENT_MAP: Record<Accent, AccentConfig> = {
  green: {
    iconBg:         'rgba(74,210,149,0.10)',
    iconBorder:     'rgba(74,210,149,0.30)',
    iconText:       '#4AD295',
    sliverGradient: 'linear-gradient(90deg, transparent, #4AD295, transparent)',
    cardBg:         'linear-gradient(135deg, rgba(74,210,149,0.04) 0%, rgba(74,210,149,0.01) 60%, rgba(255,255,255,0.01) 100%)',
    glow:           '#4AD295',
  },
  gold: {
    iconBg:         'rgba(201,166,70,0.10)',
    iconBorder:     'rgba(201,166,70,0.30)',
    iconText:       '#C9A646',
    sliverGradient: 'linear-gradient(90deg, transparent, #C9A646, transparent)',
    cardBg:         'linear-gradient(135deg, rgba(201,166,70,0.04) 0%, rgba(201,166,70,0.01) 60%, rgba(255,255,255,0.01) 100%)',
    glow:           '#C9A646',
  },
  red: {
    iconBg:         'rgba(227,99,99,0.10)',
    iconBorder:     'rgba(227,99,99,0.30)',
    iconText:       '#E36363',
    sliverGradient: 'linear-gradient(90deg, transparent, #E36363, transparent)',
    cardBg:         'linear-gradient(135deg, rgba(227,99,99,0.04) 0%, rgba(227,99,99,0.01) 60%, rgba(255,255,255,0.01) 100%)',
    glow:           '#E36363',
  },
  blue: {
    iconBg:         'rgba(122,182,244,0.10)',
    iconBorder:     'rgba(122,182,244,0.30)',
    iconText:       '#7AB6F4',
    sliverGradient: 'linear-gradient(90deg, transparent, #7AB6F4, transparent)',
    cardBg:         'linear-gradient(135deg, rgba(122,182,244,0.04) 0%, rgba(122,182,244,0.01) 60%, rgba(255,255,255,0.01) 100%)',
    glow:           '#7AB6F4',
  },
  purple: {
    iconBg:         'rgba(159,122,234,0.10)',
    iconBorder:     'rgba(159,122,234,0.30)',
    iconText:       '#9F7AEA',
    sliverGradient: 'linear-gradient(90deg, transparent, #9F7AEA, transparent)',
    cardBg:         'linear-gradient(135deg, rgba(159,122,234,0.04) 0%, rgba(159,122,234,0.01) 60%, rgba(255,255,255,0.01) 100%)',
    glow:           '#9F7AEA',
  },
  neutral: {
    iconBg:         'rgba(255,255,255,0.05)',
    iconBorder:     'rgba(255,255,255,0.10)',
    iconText:       '#A0A0A0',
    sliverGradient: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.20), transparent)',
    cardBg:         'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
    glow:           '#C9A646',
  },
};

const VALUE_SIZE_CLASS: Record<NonNullable<JournalKpiCardProps['valueSize']>, string> = {
  lg:  'text-2xl',  // 24px
  xl:  'text-3xl',  // 30px — default, matches Analytics
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
  icon: Icon,
  gauge,
  tooltip,
  valueSize = 'xl',
  valueColor,
  className,
}) {
  const cfg = ACCENT_MAP[accent];
  const valueCls = VALUE_SIZE_CLASS[valueSize];
  const finalValueColor = valueColor ?? '#F4F4F4';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] group',
        className,
      )}
      style={{
        background: cfg.cardBg,
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

      {/* Bottom-edge accent sliver — center-fade gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-4 right-4 h-px opacity-50"
        style={{ background: cfg.sliverGradient }}
      />

      {/* Main row: text on left, icon + optional gauge on right */}
      <div className="relative flex items-center justify-between gap-4 p-5">
        {/* Left column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Label + tooltip ? */}
          <div className="mb-3 flex items-center gap-1.5">
            <span className="font-sans text-[10px] font-semibold uppercase tracking-widest text-[#6A6A6A]">
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

          {/* Value — sans-serif Inter font-bold, white by default */}
          <span
            className={cn(
              'font-sans font-bold leading-none tracking-tight',
              valueCls,
            )}
            style={{ color: finalValueColor, letterSpacing: '-0.02em' }}
          >
            {value}
          </span>

          {/* Hint */}
          {hint && (
            <span className="mt-2 font-sans text-[10px] font-medium text-[#5A5A5A]">
              {hint}
            </span>
          )}
        </div>

        {/* Right column: icon circle + optional gauge */}
        {(Icon || gauge) && (
          <div className="flex flex-shrink-0 flex-col items-center gap-3">
            {Icon && (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: cfg.iconBg,
                  border: `1px solid ${cfg.iconBorder}`,
                }}
              >
                <Icon
                  className="h-4 w-4"
                  strokeWidth={1.8}
                  style={{ color: cfg.iconText }}
                  aria-hidden
                />
              </div>
            )}
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
