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

export interface InsightCardProps {
  insight: Insight;
  /** When true, render as the featured (Pattern of the Week) variant. */
  featured?: boolean;
  /** When provided, an inline button calls this with the insight. Phase 5 will wire to chat. */
  onDiscuss?: (insight: Insight) => void;
}

export function InsightCard({ insight, featured, onDiscuss }: InsightCardProps) {
  const isCritical = insight.severity === 'critical';

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
