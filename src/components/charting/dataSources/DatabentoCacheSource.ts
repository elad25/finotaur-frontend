/**
 * DatabentoCacheSource — fetches OHLCV bars for our 14 cached futures symbols
 * from the Supabase `get_backtest_candles` RPC, backed by the Databento
 * `backtest_candles` cache table.
 *
 * Unlike YahooFinanceSource (Edge Function hop) or BinanceSource (direct
 * public API), this source calls a Postgres RPC directly via the Supabase
 * client — the cache is already fully populated server-side for our 14
 * futures roots, so there is no upstream provider round-trip on the client's
 * critical path.
 *
 * RPC contract:
 *   get_backtest_candles(p_source text, p_symbol text, p_bucket_seconds int,
 *                         p_from timestamptz, p_to timestamptz) returns jsonb
 *   → jsonb array of [epochSeconds, open, high, low, close, volume] tuples,
 *     ordered by time ascending.
 */

import type { UTCTimestamp } from 'lightweight-charts';
import type { Bar, ChartDataSource, Interval } from '../types';
import { getCached, makeCacheKey, setCached } from './cache';
import { supabase } from '@/lib/supabase';

/** Raw tuple shape returned inside the RPC's jsonb array. */
type CandleTuple = [number, number, number, number, number, number];

/**
 * Map our internal `Interval` (Yahoo-style) to the RPC's `p_bucket_seconds`.
 * Values mirror the wall-clock duration each interval name represents.
 */
const INTERVAL_TO_BUCKET_SECONDS: Record<Interval, number | null> = {
  '1s': null, // not supported — Databento cache has no sub-minute bucket
  '1m': 60,
  '2m': 120,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '60m': 3600,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1wk': null, // not supported — caller should pick 1d or coarser
  '1mo': null, // not supported
};

export class DatabentoCacheSource implements ChartDataSource {
  async getBars(
    symbol: string,
    interval: Interval,
    from: UTCTimestamp,
    to: UTCTimestamp,
  ): Promise<Bar[]> {
    const bucketSeconds = INTERVAL_TO_BUCKET_SECONDS[interval];
    if (!bucketSeconds) {
      throw new Error(`DatabentoCacheSource: interval "${interval}" not supported`);
    }

    // ─── Client-side LRU cache check ─────────────────────────
    // Same pattern as YahooFinanceSource/BinanceSource — avoids re-hitting the
    // RPC for a window the user just looked at.
    const cacheKey = makeCacheKey('databento', symbol, interval, Number(from), Number(to));
    const cached = getCached<Bar[]>(cacheKey);
    if (cached) return cached;

    // RPC expects ISO timestamptz strings; `from`/`to` are Unix seconds.
    const fromIso = new Date(Number(from) * 1000).toISOString();
    const toIso = new Date(Number(to) * 1000).toISOString();

    const { data, error } = await supabase.rpc('get_backtest_candles', {
      p_source: 'databento',
      p_symbol: symbol,
      p_bucket_seconds: bucketSeconds,
      p_from: fromIso,
      p_to: toIso,
    });

    if (error) {
      throw new Error(`DatabentoCacheSource: get_backtest_candles RPC failed — ${error.message}`);
    }

    // Empty/null cache result → return empty, same as Yahoo's "no bars" case.
    // Do NOT throw — an empty window (e.g. no coverage yet for this symbol)
    // is an expected, recoverable outcome, not a transport failure.
    if (!Array.isArray(data) || data.length === 0) return [];

    const seen = new Set<number>();
    const bars: Bar[] = [];
    for (const raw of data as CandleTuple[]) {
      if (!Array.isArray(raw) || raw.length < 6) continue;
      const timeSec = Math.floor(Number(raw[0]));
      if (!Number.isFinite(timeSec) || seen.has(timeSec)) continue;
      const open = Number(raw[1]);
      const high = Number(raw[2]);
      const low = Number(raw[3]);
      const close = Number(raw[4]);
      const volume = Number(raw[5]);
      if (![open, high, low, close].every(Number.isFinite)) continue;
      seen.add(timeSec);
      bars.push({
        time: timeSec as UTCTimestamp,
        open,
        high,
        low,
        close,
        volume: Number.isFinite(volume) ? volume : undefined,
      });
    }
    bars.sort((a, b) => (a.time as number) - (b.time as number));

    if (bars.length > 0) setCached(cacheKey, bars);
    return bars;
  }
}
