// src/components/charting/orderflow/BinanceTradeSource.ts
// TradeSource implementation backed by Binance spot aggTrade (WS + REST).
// Standalone — does NOT depend on useBinanceOrderBook (that hook mixes in
// depth/book state we don't need here); conventions (reconnect backoff, URL
// bases) are intentionally mirrored from it for consistency.

import type { FlowTrade, TradeSource, TradeSourceStatus } from './types';

// ── Constants ────────────────────────────────────────────────────────────────

const WS_BASE = 'wss://stream.binance.com:9443/ws';
const REST_BASE = 'https://api.binance.com/api/v3/aggTrades';

// Same cadence as TapeTab's aggTrade drain — never deliver trades per-message.
const FLUSH_INTERVAL_MS = 250;

const RECONNECT_DELAYS = [1_000, 2_000, 5_000]; // ms, backoff, caps at 5s

const DEFAULT_MAX_BACKFILL_REQUESTS = 40;
const BACKFILL_PAGE_LIMIT = 1000;
// Spacing between paginated REST calls — respects Binance IP rate limits.
const BACKFILL_REQUEST_SPACING_MS = 120;

// ── Wire shapes (Binance aggTrade) ──────────────────────────────────────────

interface AggTradeWsMessage {
  p: string; // price
  q: string; // quantity
  T: number; // trade time (ms)
  m: boolean; // isBuyerMaker
}

interface AggTradeRestItem {
  /** Aggregate trade id — used to dedupe across backward-pagination page boundaries. */
  a?: number;
  p: string;
  q: string;
  T: number;
  m: boolean;
}

function mapAggTrade(t: { p: string; q: string; T: number; m: boolean }): FlowTrade {
  return {
    time: t.T,
    price: parseFloat(t.p),
    qty: parseFloat(t.q),
    buyerAggressor: !t.m,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Implementation ───────────────────────────────────────────────────────────

class BinanceTradeSourceImpl implements TradeSource {
  subscribe(
    symbol: string,
    onTrades: (trades: FlowTrade[]) => void,
    onStatus?: (status: TradeSourceStatus) => void,
  ): () => void {
    let ws: WebSocket | null = null;
    let unmounted = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let flushTimer: ReturnType<typeof setInterval> | null = null;
    let pendingTrades: FlowTrade[] = [];

    const flush = () => {
      if (pendingTrades.length === 0) return;
      const batch = pendingTrades;
      pendingTrades = [];
      onTrades(batch);
    };

    const scheduleReconnect = () => {
      if (unmounted) return;
      onStatus?.('reconnecting');
      const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      if (unmounted) return;
      onStatus?.(reconnectAttempt === 0 ? 'connecting' : 'reconnecting');

      const streamName = `${symbol.toLowerCase()}@aggTrade`;
      const socket = new WebSocket(`${WS_BASE}/${streamName}`);
      ws = socket;

      socket.onopen = () => {
        if (unmounted || socket !== ws) return;
        reconnectAttempt = 0;
        onStatus?.('live');
      };

      socket.onmessage = (evt: MessageEvent) => {
        if (unmounted || socket !== ws) return;
        try {
          const msg = JSON.parse(evt.data as string) as AggTradeWsMessage;
          pendingTrades.push(mapAggTrade(msg));
        } catch {
          // malformed message — ignore, matches useBinanceOrderBook convention
        }
      };

      socket.onerror = () => {
        if (unmounted || socket !== ws) return;
        socket.close();
      };

      socket.onclose = () => {
        if (unmounted || socket !== ws) return;
        scheduleReconnect();
      };
    };

    connect();
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);

    return () => {
      unmounted = true;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (flushTimer !== null) {
        clearInterval(flushTimer);
        flushTimer = null;
      }
      const socket = ws;
      ws = null;
      if (socket && socket.readyState < WebSocket.CLOSING) {
        socket.close();
      }
      pendingTrades = [];
    };
  }

  async backfill(
    symbol: string,
    fromMs: number,
    toMs: number,
    opts?: { maxRequests?: number; signal?: AbortSignal },
  ): Promise<{ trades: FlowTrade[]; coveredFromMs: number }> {
    const maxRequests = opts?.maxRequests ?? DEFAULT_MAX_BACKFILL_REQUESTS;
    const trades: FlowTrade[] = [];
    const seenIds = new Set<number>();
    const seenTuples = new Set<string>();
    let cursor = toMs;
    let earliestFetchedTime = toMs;
    let requestCount = 0;

    while (cursor > fromMs && requestCount < maxRequests) {
      if (opts?.signal?.aborted) break;

      // Primary form: endTime only — Binance returns the most recent
      // `limit` aggTrades at/before endTime. Some deployments cap the
      // implicit lookback window when only endTime is given, in which
      // case the response can come back empty even though older trades
      // exist — handled by the defensive 59-min-window retry below.
      const url = `${REST_BASE}?symbol=${symbol.toUpperCase()}&endTime=${cursor}&limit=${BACKFILL_PAGE_LIMIT}`;
      let res: Response;
      try {
        res = await fetch(url, { signal: opts?.signal });
      } catch {
        // network failure — stop gracefully, report what we have so far
        break;
      }
      requestCount += 1;

      if (res.status === 429 || res.status === 418) {
        // Rate-limited/banned — stop gracefully per contract, never throw.
        break;
      }
      if (!res.ok) break;

      let page = (await res.json()) as AggTradeRestItem[];

      if (page.length === 0) {
        // Defensive fallback: endTime-only lookback may be capped by the
        // API — retry with an explicit 59-min startTime/endTime window
        // (stays under Binance's documented <1h constraint for paired
        // start+end requests) before concluding there's truly no more data.
        if (opts?.signal?.aborted || requestCount >= maxRequests) break;

        const windowStart = cursor - 3_540_000; // 59 minutes
        const fallbackUrl = `${REST_BASE}?symbol=${symbol.toUpperCase()}&startTime=${windowStart}&endTime=${cursor}&limit=${BACKFILL_PAGE_LIMIT}`;
        let fallbackRes: Response;
        try {
          fallbackRes = await fetch(fallbackUrl, { signal: opts?.signal });
        } catch {
          break;
        }
        requestCount += 1;

        if (fallbackRes.status === 429 || fallbackRes.status === 418) break;
        if (!fallbackRes.ok) break;

        page = (await fallbackRes.json()) as AggTradeRestItem[];
        if (page.length === 0) {
          // Genuinely no trades in this window — move the cursor back and
          // keep walking rather than stopping (there may be older data
          // beyond this quiet stretch).
          cursor = windowStart - 1;
          if (cursor < fromMs) break;
          if (requestCount < maxRequests) await sleep(BACKFILL_REQUEST_SPACING_MS);
          continue;
        }
      }

      for (const item of page) {
        if (typeof item.a === 'number') {
          if (seenIds.has(item.a)) continue;
          seenIds.add(item.a);
        } else {
          const dedupeKey = `${item.T}:${item.p}:${item.q}`;
          if (seenTuples.has(dedupeKey)) continue;
          seenTuples.add(dedupeKey);
        }

        if (item.T < fromMs) continue; // outside requested window — discard
        trades.push(mapAggTrade(item));
      }

      const earliestInPage = page[0].T;
      if (earliestInPage > cursor) break; // defensive: non-retreating cursor
      earliestFetchedTime = Math.min(earliestFetchedTime, earliestInPage);
      cursor = earliestInPage - 1;

      // Note: unlike forward pagination, a short page (< limit) does NOT
      // imply we've reached `fromMs` — the loop's cursor check is the only
      // thing that decides when to stop.

      if (cursor > fromMs && requestCount < maxRequests) {
        await sleep(BACKFILL_REQUEST_SPACING_MS);
      }
    }

    // Pagination walks BACKWARD from `toMs`, so on early exit (rate limit,
    // budget exhaustion, network error) the fetched trades are the LATEST
    // slice of the window — contiguous with the live stream. coveredFromMs
    // is honestly the earliest trade time we actually fetched (or `toMs`,
    // i.e. no coverage, when we got nothing) — a partial result means the
    // OLDEST bars are missing, never a mid-window gap.
    const coveredFromMs = trades.length > 0 ? Math.max(earliestFetchedTime, fromMs) : toMs;

    trades.sort((a, b) => a.time - b.time);
    return { trades, coveredFromMs };
  }
}

/** Singleton instance — stateless aside from per-call closures, safe to share. */
export const BinanceTradeSource: TradeSource = new BinanceTradeSourceImpl();
