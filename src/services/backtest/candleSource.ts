// ============================================================================
// CANDLE SOURCE ADAPTER
// Unified interface over multiple data providers. MVP: Binance only.
// ============================================================================

import type { Candle } from '@/components/ReplayChart/types';
import type { SetupDefinition } from '@/core/auto/types';
import { BinanceDataService } from './binanceDataService';
import type { Timeframe as BinanceTimeframe } from './binanceDataService';
import { dataCacheService, rangeCovered } from './dataCache';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface CandleSource {
  /**
   * Fetch candles for a given symbol / timeframe / time-range.
   * @param symbol     Exchange symbol, e.g. 'BTCUSDT'
   * @param timeframe  Timeframe string, e.g. '1h'
   * @param from       Start timestamp in **milliseconds** (Unix epoch)
   * @param to         End   timestamp in **milliseconds** (Unix epoch)
   */
  getCandles(
    symbol: string,
    timeframe: string,
    from: number,
    to: number,
  ): Promise<Candle[]>;

  capabilities: {
    /** Asset categories this source can serve. */
    categories: string[];
    /** Maximum number of bars per API call. */
    maxBarsPerCall: number;
  };
}

// ---------------------------------------------------------------------------
// Supported instruments / timeframes (for UI dropdowns)
// ---------------------------------------------------------------------------

export const POPULAR_CRYPTO_SYMBOLS: string[] = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
];

/** Timeframes supported by the MVP Binance source. */
export const SUPPORTED_TIMEFRAMES: string[] = [
  '1m',
  '5m',
  '15m',
  '1h',
  '4h',
  '1d',
];

// ---------------------------------------------------------------------------
// Binance implementation
// ---------------------------------------------------------------------------

/**
 * Maps a generic timeframe string to the Binance interval enum.
 * Throws if the timeframe is not recognised.
 */
function toBinanceInterval(timeframe: string): BinanceTimeframe {
  const map: Record<string, BinanceTimeframe> = {
    '1m': '1m',
    '3m': '3m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '2h': '2h',
    '4h': '4h',
    '6h': '6h',
    '8h': '8h',
    '12h': '12h',
    '1d': '1d',
    '3d': '3d',
    '1w': '1w',
  };
  const interval = map[timeframe];
  if (!interval) {
    throw new Error(
      `Timeframe "${timeframe}" is not supported by Binance. Use one of: ${Object.keys(map).join(', ')}`,
    );
  }
  return interval;
}

const CACHE_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

export class BinanceCandleSource implements CandleSource {
  private readonly service = new BinanceDataService();

  readonly capabilities = {
    categories: ['crypto'],
    maxBarsPerCall: 1000,
  };

  async getCandles(
    symbol: string,
    timeframe: string,
    from: number,
    to: number,
  ): Promise<Candle[]> {
    const interval = toBinanceInterval(timeframe);

    const barMs = this.service.getTimeframeDuration(interval);
    const barSec = barMs / 1000;
    const fromSec = Math.floor(from / 1000);
    const toSec = Math.floor(to / 1000);

    // --- IndexedDB cache check ---
    const cached = await dataCacheService.getDataset(symbol, timeframe, 'binance').catch(
      () => null, // non-fatal: IndexedDB may be unavailable in some environments
    );
    if (cached && Date.now() - cached.lastUpdated < CACHE_MAX_AGE_MS) {
      // Reject corrupt cache: a prior bug stored candles with NaN OHLC. If the
      // sample is not finite, ignore the cache and refetch fresh data.
      const sample = cached.candles[0];
      const cacheIsValid =
        sample != null &&
        [sample.time, sample.open, sample.high, sample.low, sample.close].every(
          (v) => Number.isFinite(v),
        );
      // Coverage check: the cached dataset must actually span the requested
      // [fromSec, toSec] range (within one bar's tolerance). Without this, a
      // cache holding only a recent slice was silently served for older
      // range requests, and a request whose `to` is ~now would keep serving
      // a stale cached tail forever. A request with `to ≈ now` against a
      // cache last updated hours ago will correctly miss and refetch.
      const covers = rangeCovered(cached.candles, fromSec, toSec, barSec);

      if (cacheIsValid && covers) {
        const filtered = cached.candles
          .filter((c) => c.time >= fromSec && c.time <= toSec)
          .map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume }));
        if (filtered.length > 0) return filtered as Candle[];
      }
    }

    // --- Fetch from Binance ---
    // Estimate total bars needed.
    const durationMs = to - from;
    const estimatedBars = Math.ceil(durationMs / barMs) + 1;

    let rawCandles;
    if (estimatedBars <= 1000) {
      rawCandles = await this.service.fetchKlines(
        symbol,
        interval,
        Math.min(estimatedBars, 1000),
        from,
        to,
      );
    } else {
      rawCandles = await this.service.fetchHistoricalData(symbol, interval, estimatedBars, false, to, from);
    }

    // Map CandleData (seconds) → canonical Candle (same shape, volume optional)
    const candles: Candle[] = rawCandles.map((c) => ({
      time: c.time, // already in seconds (BinanceDataService divides openTime by 1000)
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    // Populate cache (fire-and-forget — don't block the caller)
    dataCacheService
      .saveDataset(symbol, timeframe, 'binance', rawCandles)
      .catch(() => {/* non-fatal */});

    return candles;
  }
}

// ---------------------------------------------------------------------------
// Supabase (Databento futures) implementation
// ---------------------------------------------------------------------------

/** Canonical futures symbols served from `public.backtest_candles` (Databento). */
const FUTURES_SYMBOLS = new Set([
  'MNQ', 'NQ', 'MES', 'ES', 'MYM', 'YM', 'M2K', 'RTY', 'MGC', 'GC', 'SIL', 'SI', 'MCL', 'CL',
]);

/** Row shape returned by `public.backtest_candles` (1-minute Databento bars). */
interface BacktestCandleRow {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Supabase caps rows per response at 1000 — page through with `.range()`. */
const SUPABASE_PAGE_SIZE = 1000;

/** Bucket sizes, in seconds, for the timeframes this source supports aggregating to. */
const TIMEFRAME_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 5 * 60,
  '15m': 15 * 60,
  '1h': 60 * 60,
  '4h': 4 * 60 * 60,
  '1d': 24 * 60 * 60,
};

/**
 * Bucket-align a 1-minute-bar UTC timestamp (epoch seconds) down to the start
 * of its containing `timeframe` bucket (also epoch seconds), in UTC.
 */
function bucketStart(timeSec: number, timeframe: string): number {
  const bucketSec = TIMEFRAME_SECONDS[timeframe];
  if (!bucketSec) {
    throw new Error(
      `Timeframe "${timeframe}" is not supported for aggregation. Use one of: ${Object.keys(TIMEFRAME_SECONDS).join(', ')}`,
    );
  }
  return Math.floor(timeSec / bucketSec) * bucketSec;
}

/**
 * Aggregate ascending 1-minute candles into `timeframe` buckets.
 * `open` = first bar's open, `high`/`low` = extremes across the bucket,
 * `close` = last bar's close, `volume` = sum. Returns ascending by time.
 */
function aggregateCandles(oneMinuteCandles: Candle[], timeframe: string): Candle[] {
  if (timeframe === '1m') return oneMinuteCandles;

  const result: Candle[] = [];
  let currentBucketStart: number | null = null;
  let bucket: Candle | null = null;

  for (const candle of oneMinuteCandles) {
    const timeSec = Number(candle.time);
    const start = bucketStart(timeSec, timeframe);

    if (bucket === null || currentBucketStart !== start) {
      if (bucket !== null) result.push(bucket);
      currentBucketStart = start;
      bucket = {
        time: start,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume ?? 0,
      };
    } else {
      bucket.high = Math.max(bucket.high, candle.high);
      bucket.low = Math.min(bucket.low, candle.low);
      bucket.close = candle.close;
      bucket.volume = (bucket.volume ?? 0) + (candle.volume ?? 0);
    }
  }
  if (bucket !== null) result.push(bucket);

  return result;
}

export class SupabaseCandleSource implements CandleSource {
  readonly capabilities = {
    categories: ['futures'],
    maxBarsPerCall: 100_000,
  };

  async getCandles(
    symbol: string,
    timeframe: string,
    from: number,
    to: number,
  ): Promise<Candle[]> {
    const fromIso = new Date(from).toISOString();
    const toIso = new Date(to).toISOString();

    // --- Fetch all 1-minute rows in range, paginated (Supabase caps at 1000/response) ---
    const rows: BacktestCandleRow[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('backtest_candles')
        .select('ts, open, high, low, close, volume')
        .eq('source', 'databento')
        .eq('symbol', symbol)
        .eq('timeframe', '1m')
        .gte('ts', fromIso)
        .lte('ts', toIso)
        .order('ts', { ascending: true })
        .range(offset, offset + SUPABASE_PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Failed to load candles from Supabase: ${error.message}`);
      }

      const page = (data ?? []) as BacktestCandleRow[];
      rows.push(...page);

      if (page.length < SUPABASE_PAGE_SIZE) break;
      offset += SUPABASE_PAGE_SIZE;
    }

    // Map DB rows (ts = ISO string, bar open time UTC) → canonical Candle
    // (time = epoch seconds, matching BinanceCandleSource's convention).
    const oneMinuteCandles: Candle[] = rows.map((row) => ({
      time: Math.floor(new Date(row.ts).getTime() / 1000),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
    }));

    return aggregateCandles(oneMinuteCandles, timeframe);
  }
}

// ---------------------------------------------------------------------------
// Routing — which source serves a given symbol
// ---------------------------------------------------------------------------

/**
 * Decide which provider serves a given canonical symbol.
 * Futures symbols (MNQ, NQ, ES, ...) route to Supabase/Databento; everything
 * else (crypto pairs like BTCUSDT) keeps using Binance.
 */
export function sourceForSymbol(symbol: string): 'binance' | 'supabase' {
  return FUTURES_SYMBOLS.has(symbol.toUpperCase()) ? 'supabase' : 'binance';
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Return the appropriate CandleSource for the given provider key.
 */
export function getCandleSource(
  source: 'binance' | 'polygon' | 'udf' | 'supabase',
): CandleSource {
  switch (source) {
    case 'binance':
      return new BinanceCandleSource();
    case 'supabase':
      return new SupabaseCandleSource();
    case 'polygon':
      throw new Error(
        'Polygon data source is not yet supported in MVP. Only "binance" (crypto) and "supabase" (futures) are available.',
      );
    case 'udf':
      throw new Error(
        'UDF data source is not yet supported in MVP. Only "binance" (crypto) and "supabase" (futures) are available.',
      );
    default: {
      // Exhaustiveness check — TypeScript will flag unhandled cases at compile time.
      const _exhaustive: never = source;
      throw new Error(`Unknown candle source: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience: load candles for a SetupDefinition's instrument + time range
// ---------------------------------------------------------------------------

/**
 * Resolve the candle source from a setup's instrument config and fetch its
 * candles for the given range.
 * @param from  Start timestamp in **milliseconds** (Unix epoch)
 * @param to    End   timestamp in **milliseconds** (Unix epoch)
 */
export function loadCandlesForSetup(
  setup: SetupDefinition,
  from: number,
  to: number,
): Promise<Candle[]> {
  const { symbol, timeframe, source } = setup.instrument;
  return getCandleSource(source).getCandles(symbol, timeframe, from, to);
}
