/**
 * TradeStatsList — TradeZella-style flat key→value stats panel.
 *
 * Renders an optional large "headline" value (e.g. Net P&L) at the top,
 * followed by a vertical list of label → value rows. Pure presentational.
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatRow {
  label: string;
  value: React.ReactNode;
  /** Colors the value cell. Default = neutral white. */
  tone?: 'default' | 'positive' | 'negative' | 'muted';
}

export interface TradeStatsListProps {
  /** Hero number shown above the row list */
  headline?: {
    label: string;
    value: React.ReactNode;
    tone?: 'positive' | 'negative' | 'default';
  };
  rows: StatRow[];
  className?: string;
}

// ---------------------------------------------------------------------------
// Tone → Tailwind class mapping
// Green/red match BreakdownPanel's pnlColor convention (#4AD295 / #E36363).
// Emerald-400 (#4AD295) and red-400 (#F87171) are the closest Tailwind
// approximations; the hex literals are used where an exact match is needed.
// ---------------------------------------------------------------------------

function toneClass(tone: StatRow['tone']): string {
  switch (tone) {
    case 'positive': return 'text-emerald-400';      // #4AD295 — project green for P&L
    case 'negative': return 'text-red-400';           // matches text-red-400 used in AutoDirectionCapsule
    case 'muted':    return 'text-ink-tertiary';      // rgba(255,255,255,0.45)
    default:         return 'text-ink-primary';       // full white
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TradeStatsList({ headline, rows, className }: TradeStatsListProps) {
  return (
    <div
      className={cn(
        'rounded-[12px] border border-white/[0.08]',
        'bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))]',
        'shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]',
        'px-4 py-3',
        className,
      )}
    >
      {/* ── Headline ────────────────────────────────────────────────────── */}
      {headline && (
        <div className="mb-3 pb-3 border-b border-white/[0.06]">
          <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-ink-tertiary">
            {headline.label}
          </p>
          <p
            className={cn(
              'text-[28px] font-bold leading-none tabular-nums',
              toneClass(headline.tone ?? 'default'),
            )}
          >
            {headline.value}
          </p>
        </div>
      )}

      {/* ── Row list ────────────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-white/[0.05]">
          {rows.map((row, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
            >
              <span className="text-[12px] font-medium text-ink-tertiary">
                {row.label}
              </span>
              <span
                className={cn(
                  'text-[12px] font-semibold tabular-nums',
                  toneClass(row.tone),
                )}
              >
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TradeStatsList;
