// src/components/journal/ds/JournalGauge.tsx
//
// Semicircular gauge primitive for journal KPI cards.
// Token-based colours only — NO hardcoded hex. Replaces the inline
// SegmentedGauge / WinLossGauge from DashboardKpiCard.tsx (not deleted —
// those are still in use; this is the new canonical version).
//
// @see JOURNAL_DESIGN.md § The Journal Gauge

import React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JournalGaugeProps =
  | {
      mode: 'winRate';
      wins: number;
      losses: number;
      breakeven?: number;
    }
  | {
      mode: 'winLossRatio';
      /** Average winning trade — positive dollar value */
      avgWin: number;
      /** Average losing trade — positive dollar value (sign ignored) */
      avgLoss: number;
    };

// ---------------------------------------------------------------------------
// Gradient stops — token-based, no hardcoded hex.
// CSS vars defined in src/styles/globals.css and tailwind.config.ts.
// ---------------------------------------------------------------------------

const GRADIENT_STOPS = [
  { offset: '0%',   color: 'var(--num-negative)'  },  // #E24B4A — red
  { offset: '45%',  color: 'var(--gold-primary)'  },  // #C9A646 — gold
  { offset: '100%', color: 'var(--status-success)' }, // #10b981 — green
] as const;

// ---------------------------------------------------------------------------
// SVG geometry constants — shared between both modes
// ---------------------------------------------------------------------------
const CX = 60;
const CY = 60;
const R  = 46;
const SW = 10;
const ARC_LEN = Math.PI * R;
const X1 = CX - R; // left arc endpoint
const Y1 = CY;
const X2 = CX + R; // right arc endpoint
const Y2 = CY;

/** Convert a 0–100 percentage to needle (x, y) from center. */
function needlePoint(pct: number): { nx: number; ny: number } {
  const angle = Math.PI - (pct / 100) * Math.PI; // π (left) → 0 (right)
  const len   = R - 6;
  return {
    nx: CX + len * Math.cos(angle),
    ny: CY - len * Math.sin(angle),
  };
}

// ---------------------------------------------------------------------------
// Shared SVG arc rendering
// ---------------------------------------------------------------------------

interface GaugeArcProps {
  /** 0–100 fill percentage */
  fillPct: number;
  gradId: string;
  glowId: string;
}

function GaugeArc({ fillPct, gradId, glowId }: GaugeArcProps) {
  const filled = fillPct > 0;
  const dashArray = `${(fillPct / 100) * ARC_LEN} ${ARC_LEN}`;
  const { nx, ny } = needlePoint(fillPct);

  return (
    <>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          {GRADIENT_STOPS.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track */}
      <path
        d={`M ${X1} ${Y1} A ${R} ${R} 0 0 1 ${X2} ${Y2}`}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={SW}
        strokeLinecap="round"
      />

      {/* Fill arc */}
      {filled && (
        <path
          d={`M ${X1} ${Y1} A ${R} ${R} 0 0 1 ${X2} ${Y2}`}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          filter={`url(#${glowId})`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      )}

      {/* Needle base dot */}
      <circle cx={CX} cy={CY} r={3} fill="rgba(255,255,255,0.6)" />

      {/* Needle line */}
      {filled && (
        <line
          x1={CX}
          y1={CY}
          x2={nx}
          y2={ny}
          stroke="rgba(255,255,255,0.8)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Win-Rate mode
// ---------------------------------------------------------------------------

interface WinRateModeProps {
  wins: number;
  losses: number;
  breakeven: number;
}

function WinRateGauge({ wins, losses, breakeven }: WinRateModeProps) {
  const total   = wins + losses + breakeven;
  const fillPct = total > 0 ? (wins / total) * 100 : 0;
  const key     = `${wins}-${losses}-${breakeven}`;

  return (
    <div className="flex w-full max-w-[120px] flex-col items-center">
      <svg width={124} height={74} viewBox="0 0 124 74" aria-hidden>
        <GaugeArc fillPct={fillPct} gradId={`jr-sg-grad-${key}`} glowId={`jr-sg-glow-${key}`} />
      </svg>

      {/* Legend */}
      <div className="-mt-1 flex w-full justify-between px-2">
        <LegendDot color="var(--status-success)" label={`${wins}W`} />
        {breakeven > 0 && (
          <LegendDot color="var(--gold-primary)" label={`${breakeven}BE`} />
        )}
        <LegendDot color="var(--num-negative)" label={`${losses}L`} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Win/Loss Ratio mode
// ---------------------------------------------------------------------------

interface WinLossRatioModeProps {
  avgWin: number;
  avgLoss: number;
}

function WinLossRatioGauge({ avgWin, avgLoss }: WinLossRatioModeProps) {
  // Log₂ scale: ratio=1 → 50%, ratio=2 → ~67%, ratio=0.5 → ~33%
  const ratio   = avgLoss > 0 ? avgWin / Math.abs(avgLoss) : 1;
  const fillPct = Math.min(100, Math.max(0, 50 + (50 * Math.log2(Math.max(ratio, 0.01))) / 3));
  const key     = `${Math.round(avgWin)}-${Math.round(Math.abs(avgLoss))}`;

  return (
    <div className="flex w-full max-w-[120px] flex-col items-center">
      <svg width={124} height={74} viewBox="0 0 124 74" aria-hidden>
        <GaugeArc fillPct={fillPct} gradId={`jr-wl-grad-${key}`} glowId={`jr-wl-glow-${key}`} />
      </svg>

      {/* Legend */}
      <div className="-mt-1 flex w-full justify-between px-2">
        <LegendDot color="var(--status-success)" label={`+$${Math.abs(avgWin).toFixed(0)}`} />
        <LegendDot color="var(--num-negative)"   label={`-$${Math.abs(avgLoss).toFixed(0)}`} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend dot helper
// ---------------------------------------------------------------------------

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-0.5">
      <div
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span
        className="text-[9px] font-semibold"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component — discriminated union dispatch
// ---------------------------------------------------------------------------

const JournalGauge = React.memo<JournalGaugeProps>(function JournalGauge(props) {
  if (props.mode === 'winRate') {
    return (
      <WinRateGauge
        wins={props.wins}
        losses={props.losses}
        breakeven={props.breakeven ?? 0}
      />
    );
  }
  return (
    <WinLossRatioGauge
      avgWin={props.avgWin}
      avgLoss={props.avgLoss}
    />
  );
});

JournalGauge.displayName = 'JournalGauge';

export default JournalGauge;
export { JournalGauge };
