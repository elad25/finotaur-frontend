/**
 * tradeChartAdapter — pure mapping from the auto-backtest trade shape
 * (AutoPosition) into TradeChartTrade, the shape consumed by the shared
 * journal chart primitive (src/components/journal/TradeChart.tsx).
 *
 * Kept as a standalone pure function (no React) so it's trivially unit
 * testable without mounting the panel or the chart.
 */

import type { AutoPosition } from '@/core/auto/signalToPosition';
import type { SetupDefinition } from '@/core/auto/types';
import type { StrategyDefinitionV2 } from '@/core/auto/v2/types';
import type { TradeChartTrade } from '@/components/journal/TradeChart';
import type { Interval } from '@/components/charting/types';

/** The timeframe strings the setup builder offers (see SetupInputForm.tsx TIMEFRAME_OPTIONS). */
const KNOWN_INTERVALS: ReadonlySet<string> = new Set<Interval>([
  '1m', '2m', '5m', '15m', '30m', '60m', '1h', '4h', '1d', '1wk', '1mo',
]);

/**
 * Maps a free-form setup timeframe string (e.g. from SetupDefinition.instrument.timeframe)
 * to a validated `Interval`. Returns undefined for anything unrecognized so the caller
 * can fall back to TradeChart's own trade-duration auto-pick instead of passing a bogus value.
 */
export function mapTimeframeToInterval(timeframe: string | null | undefined): Interval | undefined {
  if (!timeframe) return undefined;
  return KNOWN_INTERVALS.has(timeframe) ? (timeframe as Interval) : undefined;
}

/**
 * Maps an AutoPosition (auto-backtest trade, times in SECONDS per journal
 * convention) into the TradeChartTrade shape. `symbol` is threaded in
 * separately from the run's setup — AutoPosition.symbol carries whatever the
 * originating detection stashed in `meta.symbol` (often the literal `'AUTO'`
 * placeholder), which is NOT reliably chartable, so callers should pass the
 * run's `setup.instrument.symbol` instead.
 */
export function autoPositionToTradeChartTrade(
  trade: AutoPosition,
  symbol: string,
): TradeChartTrade {
  const isOpen = trade.status === 'open';
  const pnl = trade.realizedPnl ?? null;
  const outcome: TradeChartTrade['outcome'] = isOpen
    ? 'OPEN'
    : pnl == null
      ? null
      : pnl > 0
        ? 'WIN'
        : pnl < 0
          ? 'LOSS'
          : 'BE';

  return {
    symbol,
    side: trade.type === 'long' ? 'LONG' : 'SHORT',
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice ?? null,
    open_at: new Date(trade.entryTime * 1000).toISOString(),
    close_at: trade.exitTime != null ? new Date(trade.exitTime * 1000).toISOString() : null,
    outcome,
    pnl,
    stopLoss: trade.stopLoss,
    takeProfit: trade.takeProfit,
  };
}

/** Entry/risk scalars an "Inspect in Replay" handoff needs beyond the instrument. */
export interface RunEntryDefaults {
  orderType: 'limit' | 'market';
  validForBars: number;
  initialBalance: number;
}

/**
 * Resolve the entry/risk scalars TradeDetailPanel's "Inspect in Replay"
 * handoff needs from whichever definition actually produced the CURRENT
 * run: `strategyV2` when the resolved instrument's engine is `'v2'` (and a
 * v2 definition is actually loaded), else the v1 `setup`. Mirrors the same
 * "prefer the run that actually happened over the stale v1 slot" reasoning
 * as `selectEffectiveInstrument` in the store — pure, no store/React
 * import, trivially unit-testable.
 */
export function resolveRunEntryDefaults(
  engine: 'v1' | 'v2',
  setup: SetupDefinition,
  strategyV2: StrategyDefinitionV2 | null,
): RunEntryDefaults {
  if (engine === 'v2' && strategyV2) {
    return {
      orderType: strategyV2.entry.orderType,
      validForBars: strategyV2.entry.validForBars,
      initialBalance: strategyV2.risk.initialBalance,
    };
  }
  return {
    orderType: setup.entry.orderType,
    validForBars: setup.entry.validForBars,
    initialBalance: setup.risk.initialBalance,
  };
}
