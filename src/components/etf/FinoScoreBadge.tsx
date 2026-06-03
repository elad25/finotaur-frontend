// src/components/etf/FinoScoreBadge.tsx
// =====================================================
// ETF ANALYZER — FINO Score Badge
// =====================================================
// Renders overall letter grade + numeric score, per-factor
// grade row, and the finoScore.note footnote.
//
// Grade color tiers (DS semantic tokens — NOT raw green/red):
//   A  → text-[#10b981]  (status-success — system status, not financial data)
//   B  → text-[#10b981]  (same success tier)
//   C  → text-ink-secondary  (neutral)
//   D  → text-[#E24B4A]  (num-negative / status-error)
//   F  → text-[#E24B4A]
// =====================================================

import { cn } from '@/lib/utils';
import type { EtfFinoScore, EtfFinoFactor } from '@/types/etf.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gradeColor(grade: string | null): string {
  if (!grade) return 'text-ink-tertiary';
  const g = grade.toUpperCase();
  if (g === 'A' || g === 'A+' || g === 'A-' || g === 'B+' || g === 'B' || g === 'B-') {
    return 'text-[#10b981]';
  }
  if (g === 'C+' || g === 'C' || g === 'C-') {
    return 'text-ink-secondary';
  }
  // D, F and anything else
  return 'text-[#E24B4A]';
}

function gradeRingColor(grade: string | null): string {
  if (!grade) return 'border-border-ds-subtle';
  const g = grade.toUpperCase();
  if (g.startsWith('A') || g.startsWith('B')) return 'border-[#10b981]/40';
  if (g.startsWith('C')) return 'border-border-ds-default';
  return 'border-[#E24B4A]/40';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FactorPillProps {
  factor: EtfFinoFactor;
}

function FactorPill({ factor }: FactorPillProps) {
  const included = factor.included;
  const label = factor.factor;
  const grade = included ? factor.grade : null;

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[56px]">
      <span
        className={cn(
          'text-[11px] font-medium tracking-wide',
          included ? gradeColor(grade) : 'text-ink-muted',
        )}
      >
        {included && grade ? grade : 'N/A'}
      </span>
      <span className="text-[10px] text-ink-tertiary truncate max-w-[64px] text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

// ─── Main badge ───────────────────────────────────────────────────────────────

interface FinoScoreBadgeProps {
  finoScore: EtfFinoScore;
  /** compact = small inline version; full = expanded with factors */
  size?: 'compact' | 'full';
  className?: string;
}

export function FinoScoreBadge({ finoScore, size = 'full', className }: FinoScoreBadgeProps) {
  const { overall, numeric, factors, note } = finoScore;
  const hasScore = overall !== null || numeric !== null;

  if (size === 'compact') {
    return (
      <div className={cn('flex items-center gap-ds-2', className)}>
        {/* Grade ring */}
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full border',
            gradeRingColor(overall),
          )}
        >
          <span className={cn('text-base font-semibold font-data', gradeColor(overall))}>
            {hasScore ? (overall ?? '—') : '—'}
          </span>
        </div>
        {/* Numeric */}
        {numeric !== null && (
          <div className="flex flex-col">
            <span className="text-[11px] text-ink-tertiary uppercase tracking-widest">
              FINO Score
            </span>
            <span className={cn('text-sm font-data font-medium', gradeColor(overall))}>
              {numeric.toFixed(0)}/100
            </span>
          </div>
        )}
      </div>
    );
  }

  // full size
  return (
    <div className={cn('space-y-ds-4', className)}>
      {/* Header row: big grade + numeric */}
      <div className="flex items-center gap-ds-4">
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full border-2',
            gradeRingColor(overall),
          )}
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <span
            className={cn(
              'text-3xl font-bold font-data leading-none',
              gradeColor(overall),
            )}
          >
            {hasScore ? (overall ?? '—') : '—'}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
            FINO Score
          </span>
          {numeric !== null ? (
            <span className={cn('text-xl font-data font-semibold', gradeColor(overall))}>
              {numeric.toFixed(0)}{' '}
              <span className="text-sm font-normal text-ink-tertiary">/ 100</span>
            </span>
          ) : (
            <span className="text-sm text-ink-tertiary">Score unavailable</span>
          )}
        </div>
      </div>

      {/* Per-factor row */}
      {factors.length > 0 && (
        <div className="flex items-start gap-ds-3 flex-wrap">
          {factors.map((f) => (
            <FactorPill key={f.factor} factor={f} />
          ))}
        </div>
      )}

      {/* Note/footnote */}
      {note && (
        <p className="text-[11px] text-ink-tertiary leading-relaxed border-t border-border-ds-subtle pt-ds-3">
          {note}
        </p>
      )}
    </div>
  );
}
