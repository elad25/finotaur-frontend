// src/pages/app/ai/copilot/components/FundamentalsGradeBadge.tsx
// Shared "overall grade" badge for fundamentals snapshots — used by both
// HoldingsTable and OpportunityShowcase. NO green: gold/amber/red tiers only
// (DS ADL-020 — positive numbers are white/gold, never green).

import { cn } from '@/lib/utils';
import type { FundamentalsGrades } from '@/services/copilotFundamentalsApi';

/** Average of the four 0-100 grades; null if none are available. */
export function overallGrade(grades: FundamentalsGrades | undefined | null): number | null {
  if (!grades) return null;
  const values = [grades.valuation, grades.growth, grades.profitability, grades.health].filter(
    (v): v is number => typeof v === 'number',
  );
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function tierClass(grade: number): string {
  if (grade >= 70) return 'border-gold-primary/40 bg-gold-primary/10 text-gold-primary';
  if (grade >= 40) return 'border-[#f5a623]/35 bg-[#f5a623]/10 text-[#f5a623]';
  return 'border-num-negative/35 bg-num-negative/10 text-num-negative';
}

interface Props {
  grades: FundamentalsGrades | undefined | null;
  className?: string;
}

/** Compact pill showing the averaged overall fundamentals grade (0-100). */
export function FundamentalsGradeBadge({ grades, className }: Props) {
  const grade = overallGrade(grades);
  if (grade == null) {
    return (
      <span className={cn('text-[11px] text-ink-tertiary', className)}>—</span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] border px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums',
        tierClass(grade),
        className,
      )}
      title="Overall fundamentals grade (avg of valuation, growth, profitability, health)"
    >
      {grade}
    </span>
  );
}
