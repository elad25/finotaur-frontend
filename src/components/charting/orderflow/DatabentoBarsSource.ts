// src/components/charting/orderflow/DatabentoBarsSource.ts
// ChartDataSource adapter over a shared FlowBinStore — lets FinotaurChart
// render a futures candlestick series derived from the SAME trades that
// fill the footprint (via tradesToBars()). No separate bars API, no
// Tradovate involvement — see DatabentoTradeSource.ts for the compliance
// note.
//
// Single source of truth (fixed 2026-07-05): this class used to keep its
// OWN internal trade cache, populated by its own DatabentoTradeSource
// subscription + backfill call, entirely separate from the FlowBinStore
// useOrderFlow/FuturesChartTab already fill for the footprint. On a closed
// weekend the footprint's store had the smart anchor-backfill data (walked
// back to Friday's session) while this class's independent cache stayed
// EMPTY (its own backfill+poll path never got the same anchor walk wired
// in), so getBars() — including the most-recent-bars fallback below —
// always returned []. Fix: this class no longer owns any trade storage; it
// reads raw trades straight out of the FlowBinStore instance the caller
// passes in via the constructor. FuturesChartTab wires in the same `store`
// returned by useOrderFlow, so both the footprint and the candles are
// always looking at identical data.
//
// Mechanism: on getBars(), read the store's current raw trades
// (getRawTrades()), filter to [from, to], and bucket into OHLCV bars via
// tradesToBars(). No network call happens here — filling the store is
// useOrderFlow's job (backfill + live poll); this class is a pure read
// adapter over it.

import type { UTCTimestamp } from 'lightweight-charts';
import type { Bar, ChartDataSource, Interval } from '../types';
import type { FlowBinStore } from './flowBinStore';
import { tradesToBars } from './tradesToBars';

const INTERVAL_SECONDS: Partial<Record<Interval, number>> = {
  '1m': 60,
  '5m': 5 * 60,
  '15m': 15 * 60,
  '30m': 30 * 60,
  '60m': 60 * 60,
  '1h': 60 * 60,
  '4h': 4 * 60 * 60,
  '1d': 24 * 60 * 60,
};

export class DatabentoBarsSource implements ChartDataSource {
  constructor(private readonly store: FlowBinStore) {}

  async getBars(
    _symbol: string,
    interval: Interval,
    from: UTCTimestamp,
    to: UTCTimestamp,
  ): Promise<Bar[]> {
    const intervalSec = INTERVAL_SECONDS[interval] ?? 60;
    const trades = this.store.getRawTrades();

    const fromMs = Number(from) * 1000;
    const toMs = Number(to) * 1000;
    const windowed = trades.filter((t) => t.time >= fromMs && t.time <= toMs);

    if (windowed.length > 0 || trades.length === 0) {
      return tradesToBars(windowed, intervalSec);
    }

    // Anchored-window fallback (deliberate, dev/trial surface only): the caller
    // (FuturesChartTab) anchors [from, to] to wall-clock "now", but on a closed
    // market (weekend/holiday) the only trades available are from the last
    // session, which can be hours or days older than `from`. Rather than show
    // an empty chart while the store actually has data, fall back to the most
    // recent bars covering the SAME window width, taken from wherever the
    // store's data actually lives. This is "show the last available session"
    // behavior — acceptable here because this tab is explicitly labeled
    // "Delayed data — development preview" and is never customer-facing.
    const windowSec = Math.max(toMs - fromMs, intervalSec * 1000) / 1000;
    const barsNeeded = Math.max(Math.ceil(windowSec / intervalSec), 1);
    const newestTradeTime = trades[trades.length - 1].time;
    const fallbackFromMs = newestTradeTime - barsNeeded * intervalSec * 1000;
    const fallback = trades.filter((t) => t.time >= fallbackFromMs && t.time <= newestTradeTime);
    return tradesToBars(fallback, intervalSec);
  }
}
