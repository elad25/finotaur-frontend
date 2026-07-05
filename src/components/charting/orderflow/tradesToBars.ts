// src/components/charting/orderflow/tradesToBars.ts
// Derives OHLCV candle bars directly from a stream of FlowTrade — used by
// FuturesChartTab as the source of the candlestick series for Databento
// futures data. There is no separate historical-bars API for this surface:
// DatabentoTradeSource's backfill() + poll-delivered trades are the only
// data source, and FlowTrade is provider-agnostic, so bucketing those same
// trades into OHLCV here avoids a second network/auth surface entirely.
//
// Trade-off accepted: the visible chart window is bounded by FlowTrade
// coverage (backfill + poll), not an independent bars fetch. This matches
// the tab's other dev-v1 scope cuts (no CVD/Delta sub-panes, delayed data).

import type { UTCTimestamp } from 'lightweight-charts';
import type { Bar } from '../types';
import type { FlowTrade } from './types';

/**
 * Bucket an ascending-by-time array of FlowTrade into OHLCV bars of
 * `intervalSec` width. Bars are ascending by time, one entry per bucket that
 * has at least one trade (no synthetic empty-bar filling — FinotaurChart /
 * lightweight-charts tolerate time gaps in the series).
 */
export function tradesToBars(trades: FlowTrade[], intervalSec: number): Bar[] {
  if (trades.length === 0 || intervalSec <= 0) return [];

  const buckets = new Map<number, Bar>();

  for (const trade of trades) {
    const bucketTime = (Math.floor(trade.time / 1000 / intervalSec) * intervalSec) as UTCTimestamp;
    const existing = buckets.get(bucketTime);

    if (!existing) {
      buckets.set(bucketTime, {
        time: bucketTime,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.qty,
      });
      continue;
    }

    existing.high = Math.max(existing.high, trade.price);
    existing.low = Math.min(existing.low, trade.price);
    existing.close = trade.price;
    existing.volume = (existing.volume ?? 0) + trade.qty;
  }

  return Array.from(buckets.values()).sort((a, b) => (a.time as number) - (b.time as number));
}
