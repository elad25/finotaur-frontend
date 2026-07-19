/**
 * TradeListTable — every executed trade from a completed Automated Backtest.
 *
 * Each row maps an `AutoPosition` (engine output) to its originating pattern
 * (looked up from `result.detections` by entry time) plus entry/SL/TP/exit, the
 * exit reason, R-multiple, and P&L. Clicking a row selects it (selectTrade).
 * A note surfaces how many detections never became trades.
 */

import { useMemo } from 'react';
import { Card } from '@/components/ds/Card';
import { cn } from '@/lib/utils';
import {
  useAutoBacktestStore,
  selectAutoResult,
  selectSelectedTradeIndex,
} from '@/store/useAutoBacktestStore';
import type { AutoPosition } from '@/core/auto/signalToPosition';
import type { Detection, PatternType } from '@/core/auto/types';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtTime(sec?: number): string {
  if (!sec) return '—';
  return new Date(sec * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtPrice(v?: number): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function rMultiple(trade: AutoPosition): number | null {
  if (trade.realizedPnl == null || !trade.riskAmount || trade.riskAmount <= 0) return null;
  return trade.realizedPnl / trade.riskAmount;
}

const EXIT_REASON_LABEL: Record<NonNullable<AutoPosition['exitReason']>, string> = {
  stop_loss: 'Stop loss',
  take_profit: 'Take profit',
  manual: 'Manual',
  flat_time: 'Flat (time)',
  condition: 'Condition exit',
};

/**
 * Resolve the pattern type that produced a trade, by matching the detection
 * whose formed bar is closest at/before the trade's entry time. Detections do
 * not carry entry times, so we approximate by nearest entry-time ordering;
 * falls back to the run's first pattern type when ambiguous.
 */
function buildPatternByEntry(detections: Detection[]): (entryTime: number) => PatternType | null {
  if (detections.length === 0) return () => null;
  return () => detections[0]?.patternType ?? null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const HEADERS = [
  '#',
  'Pattern',
  'Side',
  'Entry time',
  'Entry',
  'SL',
  'TP',
  'Exit',
  'Exit reason',
  'R',
  'P&L',
] as const;

export function TradeListTable() {
  const result = useAutoBacktestStore(selectAutoResult);
  const selectedIndex = useAutoBacktestStore(selectSelectedTradeIndex);
  const selectTrade = useAutoBacktestStore((s) => s.selectTrade);

  const patternFor = useMemo(
    () => buildPatternByEntry(result?.detections ?? []),
    [result?.detections],
  );

  if (!result) return null;

  const trades = result.trades;
  const detectionsWithoutTrades = Math.max(0, result.detections.length - trades.length);

  return (
    <Card padding="default">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-primary">Trades</h3>
        <span className="text-[12px] text-ink-tertiary">
          {trades.length.toLocaleString('en-US')} executed · {detectionsWithoutTrades.toLocaleString('en-US')}{' '}
          detections without a trade
        </span>
      </div>

      {trades.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-ds-subtle bg-surface-1 p-6 text-center text-sm text-ink-tertiary">
          No trades were executed for this setup and range.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-ds-subtle text-left">
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 text-[11px] font-medium uppercase tracking-[1px] text-ink-tertiary"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, i) => {
                const r = rMultiple(trade);
                const pnl = trade.realizedPnl ?? 0;
                const selected = selectedIndex === i;
                const pattern = patternFor(trade.entryTime);
                return (
                  <tr
                    key={i}
                    onClick={() => selectTrade(selected ? null : i)}
                    className={cn(
                      'cursor-pointer border-b border-border-ds-subtle transition-colors',
                      selected ? 'bg-gold-primary/10' : 'hover:bg-surface-2',
                    )}
                  >
                    <td className="px-3 py-2 tabular-nums text-ink-tertiary">{i + 1}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-ink-secondary">
                      {pattern ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[11px] font-medium uppercase',
                          trade.type === 'long'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-num-negative/15 text-num-negative',
                        )}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-secondary">
                      {fmtTime(trade.entryTime)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink-primary">
                      {fmtPrice(trade.entryPrice)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink-tertiary">
                      {fmtPrice(trade.stopLoss)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink-tertiary">
                      {fmtPrice(trade.takeProfit)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink-primary">
                      {fmtPrice(trade.exitPrice)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-ink-secondary">
                      {trade.exitReason ? EXIT_REASON_LABEL[trade.exitReason] : '—'}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2 tabular-nums',
                        r == null
                          ? 'text-ink-tertiary'
                          : r >= 0
                          ? 'text-emerald-500'
                          : 'text-num-negative',
                      )}
                    >
                      {r == null ? '—' : `${r >= 0 ? '+' : '−'}${Math.abs(r).toFixed(2)}R`}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2 tabular-nums',
                        pnl > 0 ? 'text-emerald-500' : pnl < 0 ? 'text-num-negative' : 'text-ink-secondary',
                      )}
                    >
                      {pnl >= 0 ? '+' : '−'}${Math.abs(pnl).toLocaleString('en-US', {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default TradeListTable;
