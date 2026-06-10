/**
 * ScoreBadge — reusable 0-100 FINOTAUR Scale badge.
 *
 * Color tiers (grading thresholds):
 *   >= 80  A+ / A  — gold/green  (excellent)
 *   60-79  B       — amber/neutral (acceptable)
 *   40-59  C       — muted/slate  (marginal)
 *   < 40   D       — red         (poor)
 *
 * Pure presentational — no data fetching, no side effects.
 */

import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Grade helpers
// ---------------------------------------------------------------------------

type Grade = 'A+' | 'A' | 'B' | 'C' | 'D';

function toGrade(score: number): Grade {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

function colorClasses(score: number): string {
  if (score >= 80) {
    // Gold/green tier — excellent
    return 'bg-gold-primary/15 text-gold-primary border-gold-border';
  }
  if (score >= 60) {
    // Amber/neutral tier — acceptable
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  }
  if (score >= 40) {
    // Muted/slate tier — marginal
    return 'bg-surface-1 text-ink-tertiary border-border-ds-subtle';
  }
  // Red tier — poor
  return 'bg-red-500/10 text-red-400 border-red-500/30';
}

// ---------------------------------------------------------------------------
// Size classes
// ---------------------------------------------------------------------------

const SIZE_RING: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-xl',
};

const SIZE_LABEL: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-[9px] mt-0.5',
  md: 'text-[10px] mt-0.5',
  lg: 'text-xs mt-1',
};

// ---------------------------------------------------------------------------
// Props & component
// ---------------------------------------------------------------------------

export interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  /** When true, renders the letter grade (A+/A/B/C/D) below the number */
  showLabel?: boolean;
}

export default function ScoreBadge({ score, size = 'md', showLabel = false }: ScoreBadgeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const grade = toGrade(clamped);
  const color = colorClasses(clamped);

  return (
    <div className="inline-flex flex-col items-center gap-0.5">
      <span
        title={`Score: ${clamped}/100 — Grade ${grade}`}
        className={cn(
          'inline-flex items-center justify-center',
          'rounded-full border-[1.5px] font-bold tabular-nums select-none cursor-default',
          'transition-colors duration-150',
          color,
          SIZE_RING[size],
        )}
      >
        {clamped}
      </span>

      {showLabel && (
        <span
          className={cn(
            'font-semibold uppercase tracking-wider select-none',
            // Match the score color for label
            clamped >= 80
              ? 'text-gold-primary'
              : clamped >= 60
                ? 'text-amber-400'
                : clamped >= 40
                  ? 'text-ink-tertiary'
                  : 'text-red-400',
            SIZE_LABEL[size],
          )}
        >
          {grade}
        </span>
      )}
    </div>
  );
}
