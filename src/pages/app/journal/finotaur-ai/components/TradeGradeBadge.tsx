// src/pages/app/journal/finotaur-ai/components/TradeGradeBadge.tsx
// Compact letter-grade pill for trade list rows.
// Uses IntersectionObserver so no fetch fires until the row scrolls into view.

import * as React from 'react';
import { useTradeScorecard } from '../hooks/useTradeScorecard';
import type { ScorecardGrade } from '../types';

// ---------------------------------------------------------------------------
// Grade band colours (matching TradeScorecard bands)
// ---------------------------------------------------------------------------

function gradePillClass(grade: ScorecardGrade): string {
  switch (grade) {
    case 'A': return 'border-gold-primary/50 text-gold-primary bg-gold-primary/10';
    case 'B': return 'border-emerald-400/50 text-emerald-400 bg-emerald-400/10';
    case 'C': return 'border-white/20 text-ink-secondary bg-white/5';
    case 'D': return 'border-yellow-400/50 text-yellow-400 bg-yellow-400/10';
    case 'F': return 'border-status-error/50 text-status-error bg-status-error/10';
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TradeGradeBadgeProps {
  tradeId: string;
}

// ---------------------------------------------------------------------------
// TradeGradeBadge
// ---------------------------------------------------------------------------

export function TradeGradeBadge({ tradeId }: TradeGradeBadgeProps) {
  const [inView, setInView] = React.useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect(); // only need to fire once
        }
      },
      { rootMargin: '100px' }, // start loading slightly before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { data } = useTradeScorecard(tradeId, inView);

  const grade = data?.scorecard.grade ?? null;

  // Render a tiny invisible sentinel regardless; only show badge when grade available.
  return (
    <span ref={ref}>
      {grade !== null && (
        <span
          className={`inline-flex items-center justify-center h-[20px] min-w-[20px] px-[5px] rounded-full border font-sans text-[10px] font-bold leading-none ${gradePillClass(grade)}`}
        >
          {grade}
        </span>
      )}
    </span>
  );
}
