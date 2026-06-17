/**
 * StrategyPlanVsActual — "Plan vs Actual" card for a strategy's target metrics.
 *
 * Compares the trader's stated goals (expectedWinRate, avgRrGoal) against
 * realized metrics from their closed trades. Pure presentational — no data
 * fetching. Mirrors the gap-coloring style of StrategyChecklistVerify.
 *
 * Unit conventions (both sides must match):
 *   - winRate / expectedWinRate: 0–100 scale (e.g. 65.0 = 65%)
 *   - avgR / avgRrGoal: raw R-multiple (e.g. 1.8 = 1.8R)
 */

// ---------------------------------------------------------------------------
// Types & props
// ---------------------------------------------------------------------------

export interface StrategyPlanVsActualProps {
  /** Strategy target: expected win rate as a percentage (0–100), e.g. 65. */
  expectedWinRate?: number | null;
  /** Strategy target: average R:R goal, e.g. 2.0. */
  avgRrGoal?: number | null;
  /** Realized win rate from closed trades — 0–100 scale (from calculateAllStats). */
  actualWinRate: number;
  /** Realized avg R from closed trades (from calculateAllStats). */
  actualAvgR: number;
  /** Number of closed trades used to compute the actuals. */
  sampleSize: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a win-rate percentage to one decimal, e.g. 65.0 → "65.0%". */
function fmtWinRate(n: number): string {
  return `${n.toFixed(1)}%`;
}

/** Format an R-multiple to one decimal with "R" suffix, e.g. 1.8 → "1.8R". */
function fmtR(n: number): string {
  return `${n.toFixed(1)}R`;
}

/**
 * Gap color mirrors StrategyChecklistVerify ~lines 196–201.
 * Emerald (#34d399) when actual meets-or-exceeds target; red (#f87171) otherwise.
 */
function gapColor(actual: number, target: number): string {
  return actual >= target ? '#34d399' : '#f87171';
}

// Shared card wrapper — same PANEL style as StrategyChecklistVerify.
const PANEL =
  'rounded-[10px] border border-white/[0.07] bg-[rgba(16,16,16,0.92)] p-4';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StrategyPlanVsActual({
  expectedWinRate,
  avgRrGoal,
  actualWinRate,
  actualAvgR,
  sampleSize,
}: StrategyPlanVsActualProps) {
  const hasWinRateTarget = expectedWinRate != null;
  const hasAvgRTarget = avgRrGoal != null;
  const hasAnyTarget = hasWinRateTarget || hasAvgRTarget;

  const winRateGap = hasWinRateTarget ? actualWinRate - expectedWinRate! : null;
  const avgRGap = hasAvgRTarget ? actualAvgR - avgRrGoal! : null;

  return (
    <div className={PANEL}>
      {/* Card heading */}
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
        Plan vs Actual
      </p>

      {/* Comparison table */}
      <table className="w-full text-[11px]">
        <thead>
          <tr>
            <th className="pb-1.5 text-left font-medium text-white/30" />
            <th className="pb-1.5 text-right font-medium text-white/30">Plan</th>
            <th className="pb-1.5 text-right font-medium text-white/30">Actual</th>
            <th className="pb-1.5 text-right font-medium text-white/30">Gap</th>
          </tr>
        </thead>
        <tbody>
          {/* Win Rate row */}
          <tr>
            <td className="py-1 text-white/50">Win Rate</td>
            <td className="py-1 text-right tabular-nums text-white/70">
              {hasWinRateTarget ? fmtWinRate(expectedWinRate!) : '—'}
            </td>
            <td className="py-1 text-right tabular-nums text-white/85">
              {fmtWinRate(actualWinRate)}
            </td>
            <td className="py-1 text-right tabular-nums">
              {winRateGap != null ? (
                <span style={{ color: gapColor(actualWinRate, expectedWinRate!) }}>
                  {winRateGap >= 0 ? '+' : ''}{winRateGap.toFixed(1)}%
                </span>
              ) : (
                <span className="text-[10px] italic text-white/30">Set a target</span>
              )}
            </td>
          </tr>

          {/* Avg R row */}
          <tr>
            <td className="py-1 text-white/50">Avg R</td>
            <td className="py-1 text-right tabular-nums text-white/70">
              {hasAvgRTarget ? fmtR(avgRrGoal!) : '—'}
            </td>
            <td className="py-1 text-right tabular-nums text-white/85">
              {fmtR(actualAvgR)}
            </td>
            <td className="py-1 text-right tabular-nums">
              {avgRGap != null ? (
                <span style={{ color: gapColor(actualAvgR, avgRrGoal!) }}>
                  {avgRGap >= 0 ? '+' : ''}{avgRGap.toFixed(1)}R
                </span>
              ) : (
                <span className="text-[10px] italic text-white/30">Set a target</span>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* No-target hint — shown when neither goal is set */}
      {!hasAnyTarget && (
        <p className="mt-3 text-[10px] italic text-white/30">
          Set win rate and R:R targets in the strategy editor to track your edge.
        </p>
      )}

      {/* Low-sample caveat */}
      {sampleSize < 10 && (
        <p className="mt-3 text-[10px] text-white/30">
          Low sample (n={sampleSize}) — directional only.
        </p>
      )}
    </div>
  );
}
