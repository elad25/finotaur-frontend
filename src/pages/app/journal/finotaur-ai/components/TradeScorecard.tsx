// src/pages/app/journal/finotaur-ai/components/TradeScorecard.tsx
// Per-trade scorecard display — Phase B frontend.

import * as React from 'react';
import { Card, Eyebrow } from '@/components/ds/Card';
import { BriefingApiError } from '../services/finotaurAIApi';
import { useTradeScorecard } from '../hooks/useTradeScorecard';
import type { ScorecardDimensionKey, ScorecardGrade } from '../types';

// ---------------------------------------------------------------------------
// Score-band helpers — reuse token colours from the existing DS
// ---------------------------------------------------------------------------

/** Returns Tailwind text-color class based on score band. */
function scoreTextClass(score: number | null): string {
  if (score === null) return 'text-ink-tertiary';
  if (score >= 90) return 'text-gold-primary';
  if (score >= 75) return 'text-emerald-400';
  if (score >= 60) return 'text-ink-primary';
  if (score >= 45) return 'text-yellow-400';
  return 'text-status-error';
}

/** Returns Tailwind bg class for bar fill based on score band. */
function scoreBarClass(score: number | null): string {
  if (score === null) return 'bg-white/10';
  if (score >= 90) return 'bg-gold-primary/50';
  if (score >= 75) return 'bg-emerald-400/50';
  if (score >= 60) return 'bg-white/40';
  if (score >= 45) return 'bg-yellow-400/50';
  return 'bg-status-error/50';
}

/** Returns Tailwind text + border classes for the grade badge. */
function gradeBadgeClass(grade: ScorecardGrade | null): string {
  if (!grade) return 'border-white/10 text-ink-tertiary bg-white/5';
  switch (grade) {
    case 'A': return 'border-gold-primary/50 text-gold-primary bg-gold-primary/10';
    case 'B': return 'border-emerald-400/50 text-emerald-400 bg-emerald-400/10';
    case 'C': return 'border-white/20 text-ink-primary bg-white/5';
    case 'D': return 'border-yellow-400/50 text-yellow-400 bg-yellow-400/10';
    case 'F': return 'border-status-error/50 text-status-error bg-status-error/10';
  }
}

// ---------------------------------------------------------------------------
// Dimension display order and labels
// ---------------------------------------------------------------------------

const DIMENSION_ORDER: { key: ScorecardDimensionKey; label: string }[] = [
  { key: 'exit',      label: 'Exit Timing' },
  { key: 'sizing',    label: 'Position Sizing' },
  { key: 'entry',     label: 'Entry Quality' },
  { key: 'emotional', label: 'Emotional' },
  { key: 'history',   label: 'History Match' },
];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ScorecardSkeleton() {
  return (
    <Card variant="default" padding="default">
      <Eyebrow className="mb-ds-4">TRADE SCORECARD</Eyebrow>
      {/* Overall row */}
      <div className="flex items-center gap-ds-4 mb-ds-5">
        <div className="h-[52px] w-[52px] rounded-full bg-white/5 animate-pulse shrink-0" />
        <div className="h-[28px] w-[44px] rounded bg-white/5 animate-pulse" />
      </div>
      {/* Dimension rows */}
      <div className="flex flex-col gap-ds-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-ds-3">
            <div className="h-[12px] w-[120px] rounded bg-white/5 animate-pulse shrink-0" />
            <div className="flex-1 h-[6px] rounded bg-white/5 animate-pulse" />
            <div className="h-[12px] w-[28px] rounded bg-white/5 animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TradeScorecardProps {
  tradeId: string;
}

// ---------------------------------------------------------------------------
// TradeScorecard
// ---------------------------------------------------------------------------

export function TradeScorecard({ tradeId }: TradeScorecardProps) {
  const { data, isLoading, error } = useTradeScorecard(tradeId);

  if (isLoading) return <ScorecardSkeleton />;

  if (error) {
    const isPremiumError = error instanceof BriefingApiError && error.status === 403;
    return (
      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5">
        <p className="font-sans text-small text-ink-tertiary">
          {isPremiumError
            ? 'Trade scorecard is a premium feature.'
            : 'Scorecard unavailable.'}
        </p>
      </div>
    );
  }

  if (!data) return null;

  const { overall, grade, dimensions } = data.scorecard;

  const overallDisplay =
    overall === null
      ? '—'
      : Number.isInteger(overall)
      ? String(overall)
      : overall.toFixed(1);

  return (
    <Card variant="default" padding="default">
      {/* ── Card title ──────────────────────────────────────────── */}
      <Eyebrow className="mb-ds-4">TRADE SCORECARD</Eyebrow>

      {/* ── Overall score row ────────────────────────────────────── */}
      <div className="flex items-center gap-ds-4 mb-ds-5">
        {/* Big score number */}
        <span
          className={`font-mono tabular-nums text-[48px] leading-none font-medium tracking-[-1px] ${scoreTextClass(overall)}`}
        >
          {overallDisplay}
        </span>

        {/* Grade badge */}
        <span
          className={`inline-flex items-center justify-center w-[44px] h-[44px] rounded-full border font-sans text-[18px] font-bold ${gradeBadgeClass(grade)}`}
        >
          {grade ?? '—'}
        </span>

        {/* Insufficient data note */}
        {overall === null && (
          <span className="font-sans text-small text-ink-tertiary">
            Not enough data to score this trade yet.
          </span>
        )}
      </div>

      {/* ── Dimension rows ───────────────────────────────────────── */}
      <div className="flex flex-col gap-ds-3">
        {DIMENSION_ORDER.map(({ key, label }) => {
          const dim = dimensions[key];
          const isInsufficient = dim.status === 'insufficient_data';
          const pct = dim.score !== null ? Math.min(100, Math.max(0, dim.score)) : 0;

          return (
            <div key={key} className="flex flex-col gap-ds-1">
              {/* Label + bar + score */}
              <div className="flex items-center gap-ds-3">
                <span className="w-[120px] shrink-0 font-sans text-[11px] font-medium tracking-[0.5px] uppercase text-ink-tertiary">
                  {label}
                </span>

                {/* Bar track */}
                <div className="flex-1 h-[6px] rounded-sm bg-white/5 overflow-hidden">
                  {!isInsufficient && dim.score !== null && (
                    <div
                      className={`h-full rounded-sm transition-all duration-500 ${scoreBarClass(dim.score)}`}
                      style={{ width: `${pct}%` }}
                    />
                  )}
                </div>

                {/* Score value */}
                <span
                  className={`w-[28px] shrink-0 text-right font-sans tabular-nums text-[12px] ${
                    isInsufficient ? 'text-ink-tertiary' : scoreTextClass(dim.score)
                  }`}
                >
                  {isInsufficient || dim.score === null ? '—' : dim.score.toFixed(0)}
                </span>
              </div>

              {/* Detail / nudge text */}
              <p className="pl-[132px] font-sans text-[11px] text-ink-tertiary leading-snug">
                {isInsufficient ? (dim.nudge ?? dim.detail) : dim.detail}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
