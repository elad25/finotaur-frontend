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
 * Binance returns max 1000 bars per request (MAX_BARS). For ranges that need
 * more history than that (e.g. Trading Arena's crypto backfill — see
 * FinotaurChart's left-pan backfill + ChartTab's interval-aware initial
 * window), getBars() issues sequential chunked requests, advancing
 * `startTime` past the last bar received each time, up to a hard total cap
 * (MAX_TOTAL_BARS) to protect perf. A chunk shorter than MAX_BARS means
 * Binance has no more data in range — chunking stops early rather than
 * requesting empty pages.
 */

import type { UTCTimestamp } from 'lightweight-charts';
import type { Bar, ChartDataSource, Interval } from '../types';
import { getCached, makeCacheKey, setCached } from './cache';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const BINANCE_BASE_URL = 'https://api.binance.com/api/v3/klines';
const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';
const MAX_BARS = 1000;
/**
 * Hard cap on total bars returned by a single getBars() call, across every
 * chunk. Protects perf (chart render + indicator recompute cost) for very
 * wide backfill/history requests — callers wanting more history make
 * additional getBars() calls (e.g. FinotaurChart's left-pan backfill fetches
 * one further-back chunk at a time).
 */
const MAX_TOTAL_BARS = 3000;

/** Reconnect backoff: 1s doubling to a 15s cap, reset to 0 on a successful open. */
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 15_000;

/**
 * A request whose `to` is within this many seconds of "now" is a live-edge
 * (rolling) window — the client cache's 5-min TTL is too stale for it (a
 * remount would otherwise render up-to-5-min-old candles as the chart's
 * starting state, then wait for the live WS subscription to catch up).
 * Historical windows (trade-detail dialogs) are unaffected — they still read
 * the cache normally.
 */
const LIVE_EDGE_CACHE_BYPASS_SEC = 120;

/**
 * Shape of a Binance single-stream kline WS event
 * (`wss://stream.binance.com:9443/ws/<symbol>@kline_<interval>`).
 * Only the fields we read are declared.
 */
interface BinanceKlineWsEvent {
  k?: {
    t: number; // kline open time, ms
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
  };
}

/** Map our internal interval names to Binance's accepted values. */
const INTERVAL_MAP: Record<Interval, string | null> = {
  '1s': '1s',
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
    // Live-edge requests (rolling "now" windows, e.g. the Trading Arena Chart
    // tab) bypass the CACHE READ so a fresh mount never shows up-to-5-min-old
    // candles as the starting state — still written to cache below so a
    // historical re-read of the same key elsewhere can still hit it.
    const cacheKey = makeCacheKey('binance', symbol, interval, Number(from), Number(to));
    const isLiveEdge = Number(to) >= Math.floor(Date.now() / 1000) - LIVE_EDGE_CACHE_BYPASS_SEC;
    if (!isLiveEdge) {
      const cached = getCached<Bar[]>(cacheKey);
      if (cached) return cached;
    }

    // ─── Chunked sequential fetch ─────────────────────────────
    // A single request maxes out at MAX_BARS; wider ranges (e.g. crypto
    // backfill) walk forward chunk-by-chunk, advancing startTime past the
    // last bar received. Stops early when a chunk returns fewer than
    // MAX_BARS bars (Binance has no more data in range) or the total cap is
    // hit.
    const seen = new Set<number>();
    const bars: Bar[] = [];
    let chunkStartMs = Number(from) * 1000;
    const endMs = Number(to) * 1000;

    while (chunkStartMs < endMs && bars.length < MAX_TOTAL_BARS) {
      const url = new URL(BINANCE_BASE_URL);
      url.searchParams.set('symbol', symbol.toUpperCase());
      url.searchParams.set('interval', binanceInterval);
      url.searchParams.set('startTime', String(chunkStartMs));
      url.searchParams.set('endTime', String(endMs));
      url.searchParams.set('limit', String(MAX_BARS));

      const resp = await fetchWithTimeout(url.toString(), undefined, 15000);
      if (!resp.ok) {
        throw new Error(`BinanceSource: HTTP ${resp.status} ${resp.statusText} for ${symbol}`);
      }

      const raw = (await resp.json()) as unknown;
      if (!Array.isArray(raw)) {
        throw new Error('BinanceSource: malformed payload (not an array)');
      }
      if (raw.length === 0) break; // no more data in range

      let lastTimeSec = -Infinity;
      for (const k of raw) {
        if (!Array.isArray(k) || k.length < 6) continue;
        // Binance gives ms — lightweight-charts wants seconds.
        const timeSec = Math.floor(Number(k[0]) / 1000);
        if (!Number.isFinite(timeSec)) continue;
        if (timeSec > lastTimeSec) lastTimeSec = timeSec;
        if (seen.has(timeSec)) continue; // dedupe chunk-boundary overlap
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

      if (raw.length < MAX_BARS || !Number.isFinite(lastTimeSec)) break; // last page
      chunkStartMs = (lastTimeSec + 1) * 1000; // advance past the last bar received
    }

    bars.sort((a, b) => (a.time as number) - (b.time as number));

    if (bars.length > 0) setCached(cacheKey, bars);
    return bars;
  }

  /**
   * Live last-bar subscription via Binance's kline WebSocket stream. Emits on
   * every tick (not only `k.x`-closed candles) so the caller sees the
   * currently-forming candle update in near-real-time.
   *
   * Auto-reconnects with exponential backoff (1s doubling to 15s), resetting
   * the backoff on a successful open. Fully tears down (timer + socket) when
   * the returned unsubscribe function is called. No-op safely (returns a
   * harmless unsubscribe) if the interval isn't a valid kline stream interval
   * or `WebSocket` isn't available in the runtime.
   */
  subscribeBars(
    symbol: string,
    interval: Interval,
    onBar: (bar: Bar) => void,
  ): () => void {
    const binanceInterval = INTERVAL_MAP[interval];
    if (!binanceInterval || typeof WebSocket === 'undefined') {
      return () => {};
    }

    const streamName = `${symbol.toLowerCase()}@kline_${binanceInterval}`;
    let ws: WebSocket | null = null;
    let unsubscribed = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReconnect = () => {
      if (unsubscribed) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      if (unsubscribed) return;
      reconnectTimer = null;

      const socket = new WebSocket(`${BINANCE_WS_BASE}/${streamName}`);
      ws = socket;

      socket.onopen = () => {
        if (unsubscribed || socket !== ws) return;
        reconnectAttempt = 0; // reset backoff on successful open
      };

      socket.onmessage = (evt: MessageEvent) => {
        if (unsubscribed || socket !== ws) return;
        try {
          const msg = JSON.parse(evt.data as string) as BinanceKlineWsEvent;
          const k = msg.k;
          if (!k) return;

          const timeSec = Math.floor(Number(k.t) / 1000);
          if (!Number.isFinite(timeSec)) return;
          const open = Number(k.o);
          const high = Number(k.h);
          const low = Number(k.l);
          const close = Number(k.c);
          const volume = Number(k.v);
          if (![open, high, low, close].every(Number.isFinite)) return;

          onBar({
            time: timeSec as UTCTimestamp,
            open,
            high,
            low,
            close,
            volume: Number.isFinite(volume) ? volume : undefined,
          });
        } catch {
          // malformed message — ignore, matches BinanceTradeSource's convention
        }
      };

      socket.onerror = () => {
        if (unsubscribed || socket !== ws) return;
        socket.close();
      };

      socket.onclose = () => {
        if (unsubscribed || socket !== ws) return;
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      unsubscribed = true;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      const socket = ws;
      ws = null;
      if (socket && socket.readyState < WebSocket.CLOSING) {
        socket.close();
      }
    };
  }
}
