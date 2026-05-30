/**
 * QuantFlow — two-column module showing smart-money sector rotation vs the user's book.
 *
 * Left column ("Smart-money rotation"): sector_calls rendered as stance pills.
 * Right column ("Your book"): sector weight bars matching SectorExposurePanel style.
 *
 * Design system constraints:
 *  - No green; positive = white (OW is watch tone, not green)
 *  - Tailwind DS tokens only
 *  - All strings English-only
 */

import { ToneBadge } from './ToneBadge';
import type { Tone } from './ToneBadge';

// ---------------------------------------------------------------------------
// Exported interfaces (consumed by buildBriefModules adapter)
// ---------------------------------------------------------------------------

export interface RotationRow {
  sector: string;
  stance: 'overweight' | 'underweight' | 'neutral';
  rationale?: string;
}

export interface BookRow {
  sector: string;
  weightPct: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map stance to a display abbreviation. */
function stanceLabel(stance: RotationRow['stance']): string {
  if (stance === 'overweight') return 'OW';
  if (stance === 'underweight') return 'UW';
  return 'MW';
}

/** Map stance to a ToneBadge tone.
 *  overweight → watch (gold — positive-leaning signal, but we don't use green)
 *  underweight → negative (red)
 *  neutral → neutral (muted)
 */
function stanceToTone(stance: RotationRow['stance']): Tone {
  if (stance === 'overweight') return 'watch';
  if (stance === 'underweight') return 'negative';
  return 'neutral';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RotationList({ rows }: { rows: RotationRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-[11px] text-ink-tertiary">No sector rotation signals this week.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.sector}
          title={row.rationale}
          className="flex items-center justify-between gap-2"
        >
          <span className="text-[12px] text-ink-secondary truncate">{row.sector}</span>
          <ToneBadge tone={stanceToTone(row.stance)}>
            {stanceLabel(row.stance)}
          </ToneBadge>
        </li>
      ))}
    </ul>
  );
}

function BookBars({ rows }: { rows: BookRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-[11px] text-ink-tertiary">No position data available.</p>
    );
  }

  // Scale bars so the largest sector fills the full track width.
  const maxPct = Math.max(...rows.map((r) => r.weightPct), 1);

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li
          key={row.sector}
          className="grid grid-cols-[1fr_100px_36px] items-center gap-2 text-[11px]"
        >
          <span className="text-ink-secondary truncate">{row.sector}</span>
          <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#9b7d22] to-[#f4d97b]"
              style={{ width: `${Math.min(100, (row.weightPct / maxPct) * 100)}%` }}
            />
          </div>
          <span className="font-mono text-ink-tertiary text-right tabular-nums">
            {row.weightPct.toFixed(1)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface QuantFlowProps {
  rotation: RotationRow[];
  book: BookRow[];
}

export function QuantFlow({ rotation, book }: QuantFlowProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {/* Left: Smart-money rotation */}
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-primary">
          Smart-money rotation
        </p>
        <RotationList rows={rotation} />
      </div>

      {/* Right: Your book */}
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-primary">
          Your book
        </p>
        <BookBars rows={book} />
      </div>
    </div>
  );
}

export default QuantFlow;
