// src/pages/app/journal/finotaur-ai/components/ScoreHero.tsx
// Score Hero — big number left, 6 sub-bars right.
// DS rules: no green, tabular-nums, U+2212 for negative deltas, max 1 gold element.

import * as React from 'react';
import { Card, Eyebrow } from '@/components/ds/Card';
import { Change } from '@/components/ds/NumberDisplay';
import type { FinotaurScore, ScoreBreakdown } from '../types';

// ---------------------------------------------------------------------------
// Sub-bar config
// ---------------------------------------------------------------------------
interface BarConfig {
  key: keyof ScoreBreakdown;
  label: string;
  tooltip: string;
  /** Convert raw value to 0-100 percentage for bar width */
  toPercent: (v: number) => number;
  /** Display string for raw value */
  display: (v: number) => string;
}

const BAR_CONFIGS: BarConfig[] = [
  {
    key: 'win_rate',
    label: 'WIN RATE',
    tooltip: 'Percentage of closed trades that were profitable',
    toPercent: (v) => Math.min(100, Math.max(0, v)),
    display: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: 'profit_factor',
    label: 'PROFIT FACTOR',
    tooltip: 'Gross profit divided by gross loss. ≥2 is strong.',
    toPercent: (v) => Math.min(100, Math.max(0, (v / 4) * 100)),
    display: (v) => v.toFixed(2),
  },
  {
    key: 'avg_wl',
    label: 'AVG W/L',
    tooltip: 'Average winner divided by average loser. ≥1.5 is healthy.',
    toPercent: (v) => Math.min(100, Math.max(0, (v / 3) * 100)),
    display: (v) => v.toFixed(2),
  },
  {
    key: 'max_dd',
    label: 'MAX DD',
    tooltip: 'Maximum drawdown as a percentage of peak equity. Lower is better.',
    // Invert: lower drawdown → higher bar fill (100 − dd, clamped)
    toPercent: (v) => Math.min(100, Math.max(0, 100 - v)),
    display: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: 'consistency',
    label: 'CONSISTENCY',
    tooltip: 'How uniformly wins and losses are distributed across sessions',
    toPercent: (v) => Math.min(100, Math.max(0, v)),
    display: (v) => `${v.toFixed(0)}`,
  },
  {
    key: 'recovery',
    label: 'RECOVERY',
    tooltip: 'How quickly portfolio recovers after drawdowns (Recovery Factor)',
    toPercent: (v) => Math.min(100, Math.max(0, v)),
    display: (v) => `${v.toFixed(0)}`,
  },
];

// ---------------------------------------------------------------------------
// Sub-bar component
// ---------------------------------------------------------------------------
interface SubBarProps {
  config: BarConfig;
  value: number;
}

function SubBar({ config, value }: SubBarProps) {
  const pct = config.toPercent(value);
  // Gold tint at high values (≥80% of bar), white otherwise
  const fillClass = pct >= 80 ? 'bg-gold-primary/40' : 'bg-white/40';

  return (
    <div
      className="flex items-center gap-ds-3"
      title={`${config.label}: ${config.display(value)} — ${config.tooltip}`}
    >
      <span className="w-[90px] shrink-0 font-sans text-[10px] font-medium tracking-[1px] uppercase text-ink-tertiary">
        {config.label}
      </span>
      <div className="flex-1 h-[6px] rounded-sm bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-sm transition-all duration-500 ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-[36px] shrink-0 text-right font-sans tabular-nums text-[12px] text-ink-secondary">
        {config.display(value)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function ScoreSkeleton() {
  return (
    <Card variant="featured" padding="spacious">
      <div className="flex flex-col gap-ds-5 md:flex-row md:gap-ds-7">
        {/* Big number placeholder */}
        <div className="flex flex-col gap-ds-3 min-w-[140px]">
          <div className="h-[11px] w-32 rounded bg-white/5 animate-pulse" />
          <div className="h-[72px] w-28 rounded bg-white/5 animate-pulse" />
          <div className="h-[14px] w-20 rounded bg-white/5 animate-pulse" />
        </div>
        {/* Bars placeholder */}
        <div className="flex-1 flex flex-col gap-ds-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-ds-3">
              <div className="h-[10px] w-[90px] rounded bg-white/5 animate-pulse" />
              <div className="flex-1 h-[6px] rounded bg-white/5 animate-pulse" />
              <div className="h-[12px] w-[36px] rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Error card
// ---------------------------------------------------------------------------
interface ErrorCardProps {
  onRetry?: () => void;
}

function ErrorCard({ onRetry }: ErrorCardProps) {
  return (
    <div className="rounded-[12px] border-l-2 border-status-error bg-surface-1 p-ds-5">
      <p className="font-sans text-body text-ink-primary">Could not load score.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-ds-2 font-sans text-small text-ink-secondary underline underline-offset-2 hover:text-ink-primary transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insufficient data state
// ---------------------------------------------------------------------------
function InsufficientDataState() {
  return (
    <Card variant="default" padding="spacious">
      <p className="font-sans text-body text-ink-secondary">
        Score will appear once you have ≥10 closed trades in the last 30 days.
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ScoreHeroProps {
  score: FinotaurScore | null | undefined;
  isLoading: boolean;
  error: Error | null;
  onRefresh?: () => void;
}

// ---------------------------------------------------------------------------
// ScoreHero
// ---------------------------------------------------------------------------
export function ScoreHero({ score, isLoading, error, onRefresh }: ScoreHeroProps) {
  if (isLoading) return <ScoreSkeleton />;
  if (error) return <ErrorCard onRetry={onRefresh} />;
  if (!score || score.score === null || !score.breakdown) {
    return <InsufficientDataState />;
  }

  const { score: scoreValue, delta, breakdown, window_days = 30 } = score;

  return (
    <Card variant="featured" padding="spacious">
      <div className="flex flex-col gap-ds-5 md:flex-row md:gap-ds-8">
        {/* ── Left: big number ───────────────────────────────────── */}
        <div className="flex flex-col gap-ds-2 min-w-[140px]">
          <Eyebrow>FINOTAUR SCORE · {window_days}D</Eyebrow>

          <span className="font-mono tabular-nums text-[72px] leading-none font-medium tracking-[-1px] text-ink-primary">
            {Math.round(scoreValue)}
          </span>

          {delta !== null && (
            <div className="flex items-center gap-ds-1">
              <Change
                value={delta}
                format="plain"
                decimals={0}
                showSign
                className="text-[13px]"
              />
              <span className="font-sans text-[13px] text-ink-tertiary">this period</span>
            </div>
          )}
        </div>

        {/* ── Right: 6 sub-bars ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-ds-3 justify-center">
          {BAR_CONFIGS.map((cfg, i) => (
            <div key={i}>
              <SubBar config={cfg} value={breakdown[cfg.key]} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
