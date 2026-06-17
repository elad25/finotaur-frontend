/**
 * StrategyAdherenceAnalytics
 *
 * Pure presentational component. Receives a filtered trade list and a strategy
 * object, and renders four BreakdownTable sections that show how adherence to
 * each strategy component correlates with trade outcome.
 *
 * Sections:
 *   1. Per trackable component — Respected vs Skipped/Unmarked
 *   2. All confirmations present vs partial
 *   3. By setup_quality_rating (1–5 + Unrated)
 *   4. By mental_state (1–5 + Unrated)
 *
 * Min-sample guard: rows with < MIN_SAMPLE trades are greyed out.
 */

import React, { useMemo } from 'react';
import { Card } from '@/components/ds/Card';
import { Change } from '@/components/ds/NumberDisplay';
import type { Trade } from '@/hooks/useTradesData';
import type { StrategyComponent } from '@/utils/strategyComponents';
import { getStrategyComponents, trackableComponents, COMPONENT_TYPES } from '@/utils/strategyComponents';
import type { BreakdownRow } from '@/lib/journal/breakdownKit';
import { emptyRow, accumulateTrade } from '@/lib/journal/breakdownKit';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_SAMPLE = 3;

// ---------------------------------------------------------------------------
// Strategy prop shape
// Accepts the return type of useStrategiesOptimized (row + camelCase aliases).
// Only the fields getStrategyComponents and our sections actually use.
// ---------------------------------------------------------------------------

export interface StrategyForAdherence {
  id: string;
  name: string;
  components?: StrategyComponent[] | null;
  checklist?: Array<{ id: string; label: string }> | null;
  confirmationSignals?: string[] | null;
}

// ---------------------------------------------------------------------------
// Tiny table sub-component (local, mirrors Breakdowns.tsx BreakdownTable but
// is intentionally self-contained so this file compiles without importing JSX
// from a .ts file)
// ---------------------------------------------------------------------------

interface AdherenceTableProps {
  rows: BreakdownRow[];
}

const AdherenceTable: React.FC<AdherenceTableProps> = ({ rows }) => {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="px-3 py-2 text-left text-xs font-medium text-ink-tertiary min-w-[160px]">
              Group
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-ink-tertiary">Trades</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-ink-tertiary">Win %</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-ink-tertiary">Net P&amp;L</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-ink-tertiary">Avg P&amp;L</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-ink-tertiary">Avg R</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const belowMin = row.count < MIN_SAMPLE;
            const winPct = row.count > 0 ? (row.wins / row.count) * 100 : 0;
            const avgPnl = row.count > 0 ? row.netPnl / row.count : 0;
            const avgR = row.rCount > 0 ? row.totalR / row.rCount : null;

            if (belowMin) {
              return (
                <tr
                  key={row.label}
                  className="border-b border-white/[0.03] opacity-40"
                >
                  <td className="px-3 py-2.5 font-medium text-ink-primary">{row.label}</td>
                  <td className="px-3 py-2.5 text-ink-secondary" colSpan={5}>
                    {row.count} trade{row.count !== 1 ? 's' : ''} — not enough data
                  </td>
                </tr>
              );
            }

            return (
              <tr
                key={row.label}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-3 py-2.5 font-medium text-ink-primary">{row.label}</td>
                <td className="px-3 py-2.5 text-ink-secondary">{row.count}</td>
                <td
                  className={`px-3 py-2.5 font-medium ${
                    winPct >= 50
                      ? 'text-[#4AD295]'
                      : winPct >= 40
                      ? 'text-[#C9A646]'
                      : 'text-[#E24B4A]'
                  }`}
                >
                  {winPct.toFixed(1)}%
                </td>
                <td className="px-3 py-2.5">
                  <Change value={row.netPnl} format="currency" decimals={2} />
                </td>
                <td className="px-3 py-2.5">
                  <Change value={avgPnl} format="currency" decimals={2} />
                </td>
                <td className="px-3 py-2.5 text-ink-secondary">
                  {avgR != null ? `${avgR >= 0 ? '+' : ''}${avgR.toFixed(2)}R` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Empty-section note
// ---------------------------------------------------------------------------

const NotEnoughData: React.FC = () => (
  <p className="text-sm text-ink-tertiary py-4 italic">
    Not enough reviewed trades yet (minimum {MIN_SAMPLE} per group).
  </p>
);

// ---------------------------------------------------------------------------
// Section 1 helpers — per trackable component
// ---------------------------------------------------------------------------

function buildComponentRows(
  trades: Trade[],
  component: StrategyComponent,
): BreakdownRow[] {
  const respected = emptyRow('Respected');
  const skipped = emptyRow('Skipped / Unmarked');

  for (const t of trades) {
    const result = t.checklist_results?.[component.id];
    if (result === true) {
      accumulateTrade(respected, t);
    } else {
      accumulateTrade(skipped, t);
    }
  }

  return [respected, skipped];
}

// ---------------------------------------------------------------------------
// Section 2 helper — all confirmations present vs partial
// ---------------------------------------------------------------------------

function buildConfirmationRows(
  trades: Trade[],
  components: StrategyComponent[],
): BreakdownRow[] {
  const confirmIds = components
    .filter((c) => c.type === 'confirmation' && c.trackAdherence)
    .map((c) => c.id);

  if (confirmIds.length === 0) return [];

  const allPresent = emptyRow('All Confirmations Present');
  const partial = emptyRow('Partial / Missing');

  for (const t of trades) {
    const allTrue = confirmIds.every(
      (id) => t.checklist_results?.[id] === true,
    );
    accumulateTrade(allTrue ? allPresent : partial, t);
  }

  return [allPresent, partial];
}

// ---------------------------------------------------------------------------
// Section 3 helper — by setup_quality_rating
// ---------------------------------------------------------------------------

const QUALITY_LABELS: Record<number, string> = {
  1: '1 — Poor',
  2: '2 — Below Average',
  3: '3 — Average',
  4: '4 — Good',
  5: '5 — Excellent',
};

function buildQualityRows(trades: Trade[]): BreakdownRow[] {
  const buckets: Record<string, BreakdownRow> = {
    '1': emptyRow(QUALITY_LABELS[1]),
    '2': emptyRow(QUALITY_LABELS[2]),
    '3': emptyRow(QUALITY_LABELS[3]),
    '4': emptyRow(QUALITY_LABELS[4]),
    '5': emptyRow(QUALITY_LABELS[5]),
    unrated: emptyRow('Unrated'),
  };

  for (const t of trades) {
    const q = t.setup_quality_rating;
    if (q != null && q >= 1 && q <= 5) {
      accumulateTrade(buckets[String(q)], t);
    } else {
      accumulateTrade(buckets['unrated'], t);
    }
  }

  return Object.values(buckets);
}

// ---------------------------------------------------------------------------
// Section 4 helper — by mental_state
// ---------------------------------------------------------------------------

const MENTAL_LABELS: Record<number, string> = {
  1: '1 — Poor Focus',
  2: '2 — Below Average',
  3: '3 — Neutral',
  4: '4 — Focused',
  5: '5 — Peak State',
};

function buildMentalRows(trades: Trade[]): BreakdownRow[] {
  const buckets: Record<string, BreakdownRow> = {
    '1': emptyRow(MENTAL_LABELS[1]),
    '2': emptyRow(MENTAL_LABELS[2]),
    '3': emptyRow(MENTAL_LABELS[3]),
    '4': emptyRow(MENTAL_LABELS[4]),
    '5': emptyRow(MENTAL_LABELS[5]),
    unrated: emptyRow('Unrated'),
  };

  for (const t of trades) {
    const m = t.mental_state;
    if (m != null && m >= 1 && m <= 5) {
      accumulateTrade(buckets[String(m)], t);
    } else {
      accumulateTrade(buckets['unrated'], t);
    }
  }

  return Object.values(buckets);
}

// ---------------------------------------------------------------------------
// Helper — returns true if at least one row meets MIN_SAMPLE
// ---------------------------------------------------------------------------

function hasSufficientData(rows: BreakdownRow[]): boolean {
  return rows.some((r) => r.count >= MIN_SAMPLE);
}

// ---------------------------------------------------------------------------
// Component type display label map (for section headers)
// ---------------------------------------------------------------------------

const COMPONENT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  COMPONENT_TYPES.map((m) => [m.type, m.label]),
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface StrategyAdherenceAnalyticsProps {
  trades: Trade[];
  strategy: StrategyForAdherence;
}

const StrategyAdherenceAnalytics: React.FC<StrategyAdherenceAnalyticsProps> = ({
  trades,
  strategy,
}) => {
  const allComponents = useMemo(
    () => getStrategyComponents(strategy),
    [strategy],
  );
  const tracked = useMemo(() => trackableComponents(allComponents), [allComponents]);

  // Section 2
  const confirmationRows = useMemo(
    () => buildConfirmationRows(trades, allComponents),
    [trades, allComponents],
  );

  // Section 3
  const qualityRows = useMemo(() => buildQualityRows(trades), [trades]);

  // Section 4
  const mentalRows = useMemo(() => buildMentalRows(trades), [trades]);

  if (trades.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-ink-tertiary">
        No trades to analyse for this strategy.
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ------------------------------------------------------------------ */}
      {/* Section 1 — Per trackable component                                 */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h3 className="text-base font-semibold text-ink-primary mb-3">
          Adherence by Component
        </h3>

        {tracked.length === 0 ? (
          <Card padding="compact">
            <p className="text-sm text-ink-tertiary py-2">
              This strategy has no trackable components yet. Add checklist items
              or confirmation signals to see adherence analytics.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {tracked.map((component) => {
              const rows = buildComponentRows(trades, component);
              const typeLabel =
                COMPONENT_TYPE_LABEL[component.type] ?? component.type;

              return (
                <Card key={component.id} padding="compact">
                  <div className="mb-3">
                    <span className="text-xs font-medium text-[#C9A646] uppercase tracking-wide">
                      {typeLabel}
                    </span>
                    <h4 className="text-sm font-semibold text-ink-primary mt-0.5">
                      {component.label}
                    </h4>
                  </div>
                  {hasSufficientData(rows) ? (
                    <AdherenceTable rows={rows} />
                  ) : (
                    <NotEnoughData />
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2 — All confirmations present vs partial                    */}
      {/* ------------------------------------------------------------------ */}
      {confirmationRows.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-ink-primary mb-3">
            Confirmation Completeness
          </h3>
          <Card padding="compact">
            {hasSufficientData(confirmationRows) ? (
              <AdherenceTable rows={confirmationRows} />
            ) : (
              <NotEnoughData />
            )}
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 3 — By setup quality rating                                 */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h3 className="text-base font-semibold text-ink-primary mb-3">
          By Setup Quality Rating
        </h3>
        <Card padding="compact">
          {hasSufficientData(qualityRows) ? (
            <AdherenceTable rows={qualityRows} />
          ) : (
            <NotEnoughData />
          )}
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 4 — By mental state                                         */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h3 className="text-base font-semibold text-ink-primary mb-3">
          By Mental State
        </h3>
        <Card padding="compact">
          {hasSufficientData(mentalRows) ? (
            <AdherenceTable rows={mentalRows} />
          ) : (
            <NotEnoughData />
          )}
        </Card>
      </div>

    </div>
  );
};

export default StrategyAdherenceAnalytics;
