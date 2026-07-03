/**
 * BinanceSource — fetches OHLCV bars directly from Binance public klines API.
 *
 * Binance is CORS-friendly so we hit it from the browser — no Edge Function hop,
 * no cache (Binance has no rate-limit issues at our scale). The mapping below
 * converts our internal Yahoo-style interval names into Binance's format.
 *
 * Binance kline payload format (array of arrays):
 *   [
 *     openTime_ms,        // 0
 *     open_str,           // 1
 *     high_str,           // 2
 *     low_str,            // 3
 *     close_str,          // 4
 *     volume_str,         // 5
 *     closeTime_ms,       // 6
 *     quoteVolume_str,    // 7
 *     numTrades,          // 8
 *     ...                 // unused
 *   ]
 *
 * Binance returns max 1000 bars per request. Our pickInterval() in
 * dataSources/index.ts keeps every typical trade window comfortably under that
 * cap, so we don't paginate in Phase 0.
 */

import type { UTCTimestamp } from 'lightweight-charts';
import type { Bar, ChartDataSource, Interval } from '../types';
import { getCached, makeCacheKey, setCached } from './cache';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const BINANCE_BASE_URL = 'https://api.binance.com/api/v3/klines';
const MAX_BARS = 1000;

/** Map our internal interval names to Binance's accepted values. */
const INTERVAL_MAP: Record<Interval, string | null> = {
  '1m': '1m',
  '2m': null, // not supported — caller should pick 1m or 5m
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '60m': '1h',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1wk': '1w',
  '1mo': '1M',
};

export class BinanceSource implements ChartDataSource {
  async getBars(
    symbol: string,
    interval: Interval,
    from: UTCTimestamp,
    to: UTCTimestamp,
  ): Promise<Bar[]> {
    const binanceInterval = INTERVAL_MAP[interval];
    if (!binanceInterval) {
      throw new Error(`BinanceSource: interval "${interval}" not supported`);
    }

    // ─── Client-side LRU cache check ─────────────────────────
    // Binance is free + fast but every fetch still costs a network round-trip
    // and contributes to the per-IP rate limit. Cache avoids both.
    const cacheKey = makeCacheKey('binance', symbol, interval, Number(from), Number(to));
    const cached = getCached<Bar[]>(cacheKey);
    if (cached) return cached;

    const url = new URL(BINANCE_BASE_URL);
    url.searchParams.set('symbol', symbol.toUpperCase());
    url.searchParams.set('interval', binanceInterval);
    url.searchParams.set('startTime', String(Number(from) * 1000));
    url.searchParams.set('endTime', String(Number(to) * 1000));
    url.searchParams.set('limit', String(MAX_BARS));

    const resp = await fetchWithTimeout(url.toString(), undefined, 15000);
    if (!resp.ok) {
      throw new Error(`BinanceSource: HTTP ${resp.status} ${resp.statusText} for ${symbol}`);
    }

    const raw = (await resp.json()) as unknown;
    if (!Array.isArray(raw)) {
      throw new Error('BinanceSource: malformed payload (not an array)');
    }

    const seen = new Set<number>();
    const bars: Bar[] = [];
    for (const k of raw) {
      if (!Array.isArray(k) || k.length < 6) continue;
      // Binance gives ms — lightweight-charts wants seconds.
      const timeSec = Math.floor(Number(k[0]) / 1000);
      if (!Number.isFinite(timeSec) || seen.has(timeSec)) continue;
      seen.add(timeSec);
      const open = Number(k[1]);
      const high = Number(k[2]);
      const low = Number(k[3]);
      const close = Number(k[4]);
      const volume = Number(k[5]);
      if (![open, high, low, close].every(Number.isFinite)) continue;
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
