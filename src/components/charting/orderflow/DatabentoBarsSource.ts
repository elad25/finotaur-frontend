// src/components/charting/orderflow/DatabentoBarsSource.ts
// ChartDataSource adapter over DatabentoTradeSource — lets FinotaurChart
// render a futures candlestick series derived from the SAME trade stream
// FuturesChartTab's order-flow pipeline already consumes (backfill + 15s
// poll), via tradesToBars(). No separate bars API, no Tradovate involvement
// — see DatabentoTradeSource.ts for the compliance note.
//
// Mechanism: on getBars(), opens (or reuses) a DatabentoTradeSource
// subscription (polling) for the symbol, runs a one-time backfill for
// [from, to], then buckets every trade seen (backfill + any polled trades
// since) into OHLCV bars. FinotaurChart only calls getBars() once per
// symbol/interval/window change (its bar-load effect does not poll on its
// own) — so this keeps the background poll alive between calls purely to
// accumulate trades for the NEXT getBars() call, torn down via `release`.

import type { UTCTimestamp } from 'lightweight-charts';
import type { Bar, ChartDataSource, Interval } from '../types';
import type { FlowTrade } from './types';
import { DatabentoTradeSource } from './DatabentoTradeSource';
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

// Cap the in-memory trade cache — same order of magnitude as FlowBinStore's
// raw ring buffer; futures tick volume is far lower than crypto so this is
// generous headroom, not a real limiter in practice.
const TRADE_CACHE_CAP = 250_000;

interface SymbolCache {
  trades: FlowTrade[];
  unsubscribe: () => void;
}

export class DatabentoBarsSource implements ChartDataSource {
  private caches = new Map<string, SymbolCache>();

  private ensureSubscription(symbol: string): SymbolCache {
    const existing = this.caches.get(symbol);
    if (existing) return existing;

    const cache: SymbolCache = { trades: [], unsubscribe: () => {} };
    const unsubscribe = DatabentoTradeSource.subscribe(symbol, (batch) => {
      cache.trades.push(...batch);
      if (cache.trades.length > TRADE_CACHE_CAP) {
        cache.trades.splice(0, cache.trades.length - TRADE_CACHE_CAP);
      }
    });
    cache.unsubscribe = unsubscribe;
    this.caches.set(symbol, cache);
    return cache;
  }

  async getBars(
    symbol: string,
    interval: Interval,
    from: UTCTimestamp,
    to: UTCTimestamp,
  ): Promise<Bar[]> {
    const intervalSec = INTERVAL_SECONDS[interval] ?? 60;
    const cache = this.ensureSubscription(symbol);

    // One-time backfill for the requested window — merged into the same
    // cache the poll subscription is filling, deduped by (time, price, qty)
    // tuple (Databento trades have no client-visible stable id in the
    // FlowTrade shape DatabentoTradeSource exposes).
    try {
      const { trades: backfilled } = await DatabentoTradeSource.backfill(
        symbol,
        Number(from) * 1000,
        Number(to) * 1000,
      );
      if (backfilled.length > 0) {
        const seen = new Set(cache.trades.map((t) => `${t.time}:${t.price}:${t.qty}`));
        for (const trade of backfilled) {
          const key = `${trade.time}:${trade.price}:${trade.qty}`;
          if (seen.has(key)) continue;
          seen.add(key);
          cache.trades.push(trade);
        }
        cache.trades.sort((a, b) => a.time - b.time);
      }
    } catch {
      // Backfill is best-effort — bars derived from whatever trades have
      // accumulated so far (prior backfill + polls) are still returned below.
    }

    const fromMs = Number(from) * 1000;
    const toMs = Number(to) * 1000;
    const windowed = cache.trades.filter((t) => t.time >= fromMs && t.time <= toMs);
    return tradesToBars(windowed, intervalSec);
  }

  /** Tear down the background poll subscription for a symbol. Call on contract switch/unmount. */
  release(symbol: string): void {
    const cache = this.caches.get(symbol);
    if (!cache) return;
    cache.unsubscribe();
    this.caches.delete(symbol);
  }

  /** Tear down every open subscription — used on full component unmount. */
  releaseAll(): void {
    for (const [symbol] of this.caches) this.release(symbol);
  }
}
