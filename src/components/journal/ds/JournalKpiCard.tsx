// src/components/journal/ds/JournalKpiCard.tsx
//
// Journal-grade glass KPI card — the single primitive used across every journal page.
// Pairs a frosted-glass surface with a coloured bottom-edge sliver and a tinted icon
// circle. Does NOT replace DashboardKpiCard yet — see JOURNAL_DESIGN.md migration plan.
//
// @see JOURNAL_DESIGN.md § The Journal KPI Card

import React, { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
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
  /** Colour scheme — encodes metric type. Default: 'neutral'. */
  accent?: Accent;
  /** Lucide icon rendered in top-right tinted circle. */
  icon?: LucideIcon;
  /** Optional gauge slot — mount <JournalGauge /> here. */
  gauge?: ReactNode;
  /**
   * Font-size override for the value string.
   * 'lg'  = text-num-default (22px)
   * 'xl'  = text-num-large   (28px) — default
   * '2xl' = text-num-display (48px) — use only for single large metrics
   */
  valueSize?: 'lg' | 'xl' | '2xl';
  className?: string;
}

// ---------------------------------------------------------------------------
// Accent → visual class map
// ---------------------------------------------------------------------------

interface AccentConfig {
  /** Icon circle background */
  iconBg: string;
  /** Icon circle text / icon colour */
  iconText: string;
  /** Bottom-edge sliver gradient classes (left to right) */
  sliver: string;
  /** Ambient hover glow background (inline style colour) */
  glow: string;
}

const ACCENT_MAP: Record<Accent, AccentConfig> = {
  gold: {
    iconBg:   'bg-gold-primary/15',
    iconText: 'text-gold-bright',
    sliver:   'bg-gradient-gold',
    glow:     'rgba(201, 166, 70, 0.12)',
  },
  green: {
    iconBg:   'bg-status-success/15',
    iconText: 'text-status-success',
    sliver:   'bg-gradient-to-r from-status-success/60 via-status-success/20 to-transparent',
    glow:     'rgba(16, 185, 129, 0.12)',
  },
  red: {
    iconBg:   'bg-num-negative/15',
    iconText: 'text-num-negative',
    sliver:   'bg-gradient-to-r from-num-negative/60 via-num-negative/20 to-transparent',
    glow:     'rgba(226, 75, 74, 0.12)',
  },
  blue: {
    iconBg:   'bg-status-info/15',
    iconText: 'text-status-info',
    sliver:   'bg-gradient-to-r from-status-info/60 via-status-info/20 to-transparent',
    glow:     'rgba(59, 130, 246, 0.12)',
  },
  // NOTE: no purple token exists yet. Tracked in JOURNAL_DESIGN.md § Token gaps.
  // Using literal #9F7AEA until `--metric-ratio` token is added.
  purple: {
    iconBg:   'bg-[#9F7AEA]/15',
    iconText: 'text-[#9F7AEA]',
    sliver:   'bg-gradient-to-r from-[#9F7AEA]/60 via-[#9F7AEA]/20 to-transparent',
    glow:     'rgba(159, 122, 234, 0.12)',
  },
  neutral: {
    iconBg:   'bg-white/5',
    iconText: 'text-ink-secondary',
    sliver:   'bg-gradient-to-r from-white/10 via-white/5 to-transparent',
    glow:     'rgba(255, 255, 255, 0.05)',
  },
};

const VALUE_SIZE_CLASS: Record<NonNullable<JournalKpiCardProps['valueSize']>, string> = {
  lg:  'text-num-default',   // 22px
  xl:  'text-num-large',     // 28px — default
  '2xl': 'text-num-display', // 48px
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
  valueSize = 'xl',
  className,
}) {
  const cfg = ACCENT_MAP[accent];
  const valueCls = VALUE_SIZE_CLASS[valueSize];

  return (
    <div
      className={cn(
        // Shell
        'relative overflow-hidden rounded-2xl group',
        // Glass surface
        'bg-surface-glass backdrop-blur-glass backdrop-saturate-[140%]',
        // Border
        'border-[0.5px] border-border-ds-subtle',
        // Hover: subtle border brightens
        'transition-colors duration-base ease-out hover:border-border-ds-default',
        className,
      )}
    >
      {/* Ambient hover glow — top-left radial */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full opacity-0 transition-opacity duration-slow group-hover:opacity-100"
        style={{ background: cfg.glow, filter: 'blur(28px)' }}
      />

      {/* Main content */}
      <div className="relative flex items-start justify-between gap-ds-4 p-ds-5">
        {/* Left column: label / value / hint */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Label */}
          <span className="mb-ds-3 text-[10px] font-medium uppercase tracking-widest text-ink-tertiary">
            {label}
          </span>

          {/* Value */}
          <span
            className={cn(
              'font-mono font-semibold leading-none tracking-tight text-ink-primary',
              valueCls,
            )}
          >
            {value}
          </span>

          {/* Hint */}
          {hint && (
            <span className="mt-ds-2 text-[11px] text-ink-tertiary">
              {hint}
            </span>
          )}
        </div>

        {/* Right column: icon circle + optional gauge */}
        <div className="flex flex-shrink-0 flex-col items-center gap-ds-3">
          {/* Icon circle */}
          {Icon && (
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                cfg.iconBg,
                cfg.iconText,
              )}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden />
            </div>
          )}

          {/* Gauge slot */}
          {gauge}
        </div>
      </div>

      {/* Bottom-edge gradient sliver — 2px, accent colour */}
      <div
        aria-hidden
        className={cn('pointer-events-none absolute bottom-0 left-0 right-0 h-[2px]', cfg.sliver)}
      />
    </div>
  );
});

JournalKpiCard.displayName = 'JournalKpiCard';

export default JournalKpiCard;
export { JournalKpiCard };
