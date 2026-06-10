// src/pages/app/journal/finotaur-ai/components/CategoryBadge.tsx
// Small hairline pill labelling an insight's category.
// Uses rounded-[4px] per DS §4 (radius-sm = 4px for badges/pills).

import * as React from 'react';
import type { InsightCategory } from '../types';

const LABELS: Record<InsightCategory, string> = {
  symbol:     'Symbol',
  day_time:   'Day & Time',
  setup:      'Setup',
  risk:       'Risk',
  tag:        'Tag',
  behavioral: 'Behavioral',
};

interface CategoryBadgeProps {
  category: InsightCategory;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-[4px] border border-border-ds-subtle bg-transparent px-2 py-0.5 font-sans text-[10px] uppercase tracking-[1.5px] text-ink-tertiary">
      {LABELS[category]}
    </span>
  );
}
