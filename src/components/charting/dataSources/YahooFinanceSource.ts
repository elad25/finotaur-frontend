/**
 * YahooFinanceSource — fetches OHLCV bars via the Supabase Edge Function `chart-bars`.
 *
 * The Edge Function (server-side) proxies to query2.finance.yahoo.com and adds
 * a serious cache layer backed by the `chart_bars_cache` table. The browser
 * never talks to Yahoo directly — keeps API keys / scraping behavior server-side
 * and lets the cache amortize hits across all users.
 *
 * For Phase 0 the Edge Function is anonymous (no JWT). If we add per-user rate
 * limiting later, the supabase client will pass the access token automatically.
 */

import type { UTCTimestamp } from 'lightweight-charts';
import type { Bar, ChartDataSource, Interval } from '../types';
import { getCached, makeCacheKey, setCached } from './cache';

interface ChartBarsResponse {
  bars: Array<{
    time: number; // unix seconds
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
  meta?: {
    cached_count?: number;
    fetched_count?: number;
    source?: string;
  };
}

export class YahooFinanceSource implements ChartDataSource {
  async getBars(
    symbol: string,
    interval: Interval,
    from: UTCTimestamp,
    to: UTCTimestamp,
  ): Promise<Bar[]> {
    // ─── Client-side LRU cache check ─────────────────────────
    // Avoids re-hitting the Edge Function (~1-2s) for trades the user just
    // looked at. Server-side `chart_bars_cache` still saves Yahoo round-trips;
    // this layer additionally saves the Edge Function round-trip itself.
    const cacheKey = makeCacheKey('yahoo', symbol, interval, Number(from), Number(to));
    const cached = getCached<Bar[]>(cacheKey);
    if (cached) return cached;

    // Use native fetch GET so the browser HTTP cache and CDN can serve cached
    // responses. supabase.functions.invoke() always POSTs and bypasses the
    // browser cache entirely. The apikey header satisfies the Supabase platform
    // gateway; Authorization is intentionally omitted to keep the cache key
    // user-agnostic (the endpoint is anonymous — no JWT needed).
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const edgeUrl =
      `${SUPABASE_URL}/functions/v1/chart-bars` +
      `?symbol=${encodeURIComponent(symbol)}` +
      `&interval=${interval}` +
      `&from=${Number(from)}` +
      `&to=${Number(to)}`;

    const resp = await fetch(edgeUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
      },
    });

    if (!resp.ok) {
      throw new Error(`YahooFinanceSource: chart-bars HTTP ${resp.status}`);
    }

    let data: ChartBarsResponse;
    try {
      data = await resp.json() as ChartBarsResponse;
    } catch {
      throw new Error('YahooFinanceSource: chart-bars returned malformed payload');
    }
    if (!Array.isArray(data.bars)) {
      throw new Error('YahooFinanceSource: chart-bars returned malformed payload');
    }

    // Normalize + sort + dedupe. lightweight-charts requires strictly ascending
    // time and rejects duplicates. The Edge Function should already guarantee
    // this but we defend at the boundary.
    const seen = new Set<number>();
    const bars: Bar[] = [];
    for (const raw of data.bars) {
      if (seen.has(raw.time)) continue;
      seen.add(raw.time);
      bars.push({
        time: raw.time as UTCTimestamp,
        open: raw.open,
        high: raw.high,
        low: raw.low,
        close: raw.close,
        volume: raw.volume,
      });
    }
    bars.sort((a, b) => (a.time as number) - (b.time as number));

    // Cache only successful, non-empty responses. Empty results may indicate
    // Yahoo rate limit / transient error — re-fetching is the right behavior.
    if (bars.length > 0) setCached(cacheKey, bars);
    return bars;
  }
}
