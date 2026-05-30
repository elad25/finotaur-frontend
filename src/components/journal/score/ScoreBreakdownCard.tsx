/**
 * ScoreBreakdownCard — renders per-criterion earned/max rows.
 *
 * Pure presentational — no data fetching, no side effects.
 * Maps ScoreBreakdown keys to human-readable labels; shows met/unmet
 * status with a check or cross icon plus an earned/max fraction.
 */

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScoreBreakdown } from '@/lib/journal/scoring';

// ---------------------------------------------------------------------------
// Criterion label map
// ---------------------------------------------------------------------------

const LABELS: Record<keyof ScoreBreakdown, { title: string; description: string }> = {
  followedStop: {
    title: 'Followed Stop',
    description: 'Stop price set and trade closed',
  },
  hitTarget: {
    title: 'Hit Target',
    description: 'Closed as a WIN',
  },
  positiveR: {
    title: 'Positive R',
    description: 'R-multiple above zero',
  },
  hasNotes: {
    title: 'Has Notes',
    description: 'Non-empty journal notes',
  },
  withinSession: {
    title: 'Within Session',
    description: 'Session field is set',
  },
};

const CRITERION_ORDER: Array<keyof ScoreBreakdown> = [
  'followedStop',
  'hitTarget',
  'positiveR',
  'hasNotes',
  'withinSession',
];

// ---------------------------------------------------------------------------
// Bar fill — proportional to earned/max
// ---------------------------------------------------------------------------

function BarFill({ earned, max, met }: { earned: number; max: number; met: boolean }) {
  const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
  return (
    <div className="relative h-1 w-full rounded-full bg-surface-1 border border-border-ds-subtle overflow-hidden">
      <div
        className={cn(
          'absolute left-0 top-0 h-full rounded-full transition-all duration-300',
          met ? 'bg-gold-primary' : 'bg-red-500/40',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props & component
// ---------------------------------------------------------------------------

export interface ScoreBreakdownCardProps {
  breakdown: ScoreBreakdown;
  className?: string;
}

export default function ScoreBreakdownCard({ breakdown, className }: ScoreBreakdownCardProps) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {CRITERION_ORDER.map(key => {
        const { earned, max, met } = breakdown[key];
        const { title, description } = LABELS[key];

        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              {/* Left: icon + label */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0',
                    met
                      ? 'bg-[#10b981]/15 text-[#10b981]'
                      : 'bg-red-500/10 text-red-400',
                  )}
                >
                  {met ? <Check size={10} strokeWidth={2.5} /> : <X size={10} strokeWidth={2.5} />}
                </span>
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-ink-primary leading-none">
                    {title}
                  </span>
                  <p className="text-[10px] text-ink-tertiary leading-none mt-0.5 truncate">
                    {description}
                  </p>
                </div>
              </div>

              {/* Right: earned / max */}
              <span
                className={cn(
                  'shrink-0 text-[11px] font-semibold tabular-nums',
                  met ? 'text-gold-primary' : 'text-ink-tertiary',
                )}
              >
                {earned}/{max}
              </span>
            </div>

            <BarFill earned={earned} max={max} met={met} />
          </div>
        );
      })}
    </div>
  );
}
