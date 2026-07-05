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

    if (windowed.length > 0 || cache.trades.length === 0) {
      return tradesToBars(windowed, intervalSec);
    }

    // Anchored-window fallback (deliberate, dev/trial surface only): the caller
    // (FuturesChartTab) anchors [from, to] to wall-clock "now", but on a closed
    // market (weekend/holiday) the only trades available are from the last
    // session, which can be hours or days older than `from`. Rather than show
    // an empty chart while the trade cache is actually full, fall back to the
    // most recent bars covering the SAME window width, taken from wherever the
    // cache's data actually lives. This is "show the last available session"
    // behavior — acceptable here because this tab is explicitly labeled
    // "Delayed data — development preview" and is never customer-facing.
    const windowSec = Math.max(toMs - fromMs, intervalSec * 1000) / 1000;
    const barsNeeded = Math.max(Math.ceil(windowSec / intervalSec), 1);
    const newestTradeTime = cache.trades[cache.trades.length - 1].time;
    const fallbackFromMs = newestTradeTime - barsNeeded * intervalSec * 1000;
    const fallback = cache.trades.filter((t) => t.time >= fallbackFromMs && t.time <= newestTradeTime);
    return tradesToBars(fallback, intervalSec);
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
