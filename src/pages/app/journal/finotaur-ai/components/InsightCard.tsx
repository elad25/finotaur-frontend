// src/pages/app/journal/finotaur-ai/components/InsightCard.tsx
// Renders a single AI insight.
// DS rules:
//   - No text-red-* / text-green-* / inline style={{ color }}
//   - Severity signal goes on left border ONLY (border-l-2 border-num-negative for critical)
//   - Featured cards get gold border accent (variant="featured")
//   - rounded-[12px] = DS radius-lg (Card default)

import * as React from 'react';
import { Card } from '@/components/ds/Card';
import { cn } from '@/lib/utils';
import { CategoryBadge } from './CategoryBadge';
import type { Insight } from '../types';

/** A resolved summary of a trade referenced by an insight, for the evidence chips. */
export interface RelatedTradeChip {
  id: string;
  symbol: string;
  /** Actual R-multiple if known and sane; null falls back to a win/loss label. */
  r: number | null;
  pnl: number;
}

export interface InsightCardProps {
  insight: Insight;
  /** When true, render as the featured (Pattern of the Week) variant. */
  featured?: boolean;
  /** When provided, an inline button calls this with the insight. Phase 5 will wire to chat. */
  onDiscuss?: (insight: Insight) => void;
  /** Resolved trades behind this insight (from related_trade_ids) — rendered as evidence chips. */
  relatedTrades?: RelatedTradeChip[];
}

export function InsightCard({ insight, featured, onDiscuss, relatedTrades }: InsightCardProps) {
  const isCritical = insight.severity === 'critical';
  const chips = relatedTrades ?? [];

  return (
    <Card
      variant={featured ? 'featured' : 'default'}
      className={cn(
        isCritical && 'border-l-2 border-l-num-negative',
      )}
    >
      {/* Top row: category badge + eyebrow label */}
      <div className="flex items-center gap-ds-2">
        <CategoryBadge category={insight.category} />
        {featured && (
          <span className="font-sans text-[10px] uppercase tracking-[1.5px] text-gold-primary">
            Pattern of the week
          </span>
        )}
        {insight.eyebrow && !featured && (
          <span className="font-sans text-[10px] uppercase tracking-[1.5px] text-ink-tertiary">
            {insight.eyebrow}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-ds-3 font-sans text-h4 font-medium text-ink-primary leading-snug">
        {insight.title}
      </h3>

      {/* Body */}
      <p className="mt-ds-2 font-sans text-body text-ink-secondary leading-relaxed">
        {insight.body}
      </p>

      {/* Optional metric — monospace tabular-nums per DS number rules */}
      {insight.metric && (
        <div className="mt-ds-3 font-mono tabular-nums text-num-small text-ink-primary">
          {insight.metric}
        </div>
      )}

      {/* Evidence chips — the specific trades behind this insight (related_trade_ids).
          Tone from realized pnl sign; R shown only when known and sane. */}
      {chips.length > 0 && (
        <div className="mt-ds-3 flex flex-wrap gap-ds-1">
          {chips.map((t) => {
            const losing = t.pnl < 0;
            const showR = t.r !== null && Math.abs(t.r) <= 50;
            return (
              <span
                key={t.id}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                  losing
                    ? 'border-num-negative/30 text-num-negative'
                    : 'border-num-positive/30 text-num-positive',
                )}
              >
                <span className="font-sans text-ink-secondary">{t.symbol}</span>
                <span className="font-mono tabular-nums">
                  {showR
                    ? `${t.r > 0 ? '+' : ''}${t.r.toFixed(1)}R`
                    : losing
                      ? 'loss'
                      : 'win'}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Discuss button — Phase 5 will connect to chat panel */}
      {onDiscuss && (
        <button
          type="button"
          onClick={() => onDiscuss(insight)}
          className="mt-ds-3 self-start font-sans text-[12px] text-ink-tertiary transition-colors duration-base hover:text-gold-primary"
        >
          Discuss with AI →
        </button>
      )}
    </Card>
  );
}
