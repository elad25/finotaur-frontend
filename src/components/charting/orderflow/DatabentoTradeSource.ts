// src/components/charting/orderflow/DatabentoTradeSource.ts
// TradeSource implementation backed by our server's Databento historical
// trade proxy (GET /api/orderflow/backfill). Admin-only dev/trial surface.
//
// 🔴 COMPLIANCE NOTE (2026-07-04): this file intentionally does NOT connect
// to any Tradovate endpoint, WebSocket, or market-data token. NinjaTrader's
// written guidance is explicit: "we don't support market data WebSocket
// connections through our API... would need to disable API access if it
// came up after the fact" — plus our own written commitment to never pull
// market data from Tradovate. A prior TradovateTradeSource.ts (md WS +
// mdAccessToken) was built and then deleted in full before merge — see the
// FuturesChartTab.tsx header comment / session log for the removal record.
// Do not reintroduce anything that touches md.tradovateapi.com or an
// mdAccessToken concept.
//
// There is NO live feed here — Databento's historical API has its own
// ingestion lag, so "live" for this admin-only dev surface means "polling
// the same historical backfill endpoint every 15s and delivering whatever
// new trades have landed since the last poll." This delay is ACCEPTED
// (dev/trial use only, not customer-facing).

import { authFetch } from '@/utils/authFetch';
import type { FlowTrade, TradeSource, TradeSourceStatus } from './types';

// ── Constants ────────────────────────────────────────────────────────────

const BACKFILL_ENDPOINT = '/api/orderflow/backfill';

const POLL_INTERVAL_MS = 15_000;
const POLL_RECONNECT_DELAYS = [15_000, 30_000, 60_000]; // backoff on transient poll failure
const MAX_CONSECUTIVE_FAILURES = 5;

// Backfill request budget — chunk into <=2h windows, newest-window-first so
// partial coverage (rate limit / budget exhaustion) stays contiguous with
// the freshest edge, same contract as BinanceTradeSource.backfill.
const BACKFILL_WINDOW_MS = 2 * 60 * 60 * 1000;
const DEFAULT_MAX_BACKFILL_REQUESTS = 20;

// ── Wire shape ───────────────────────────────────────────────────────────

interface BackfillResponse {
  trades: FlowTrade[];
  /** True when the response was served from a server-side cache, not a fresh Databento call. */
  cached?: boolean;
}

/** Extract the bare futures root (e.g. "NQU6" → "NQ") — the backfill proxy is keyed by root. */
function extractRoot(symbol: string): string {
  const match = symbol.match(/^([A-Z]{1,4})/);
  return match ? match[1] : symbol;
}

async function fetchBackfillWindow(
  symbol: string,
  fromMs: number,
  toMs: number,
  signal?: AbortSignal,
): Promise<{ page: FlowTrade[]; ok: boolean; rateLimited: boolean }> {
  const root = extractRoot(symbol);
  const url = `${BACKFILL_ENDPOINT}?symbol=${encodeURIComponent(root)}&fromMs=${fromMs}&toMs=${toMs}`;

  let res: Response;
  try {
    res = await authFetch(url, { signal });
  } catch {
    return { page: [], ok: false, rateLimited: false };
  }

  if (res.status === 429) return { page: [], ok: false, rateLimited: true };
  if (!res.ok) return { page: [], ok: false, rateLimited: false };

  let body: BackfillResponse;
  try {
    body = (await res.json()) as BackfillResponse;
  } catch {
    return { page: [], ok: false, rateLimited: false };
  }

  if (!Array.isArray(body.trades)) return { page: [], ok: false, rateLimited: false };

  const page: FlowTrade[] = [];
  for (const trade of body.trades) {
    if (
      typeof trade?.time !== 'number' ||
      typeof trade?.price !== 'number' ||
      typeof trade?.qty !== 'number' ||
      typeof trade?.buyerAggressor !== 'boolean'
    ) {
      continue; // malformed entry — skip defensively
    }
    page.push(trade);
  }
  return { page, ok: true, rateLimited: false };
}

// ── Implementation ──────────────────────────────────────────────────────

class DatabentoTradeSourceImpl implements TradeSource {
  subscribe(
    symbol: string,
    onTrades: (trades: FlowTrade[]) => void,
    onStatus?: (status: TradeSourceStatus) => void,
  ): () => void {
    let unmounted = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let consecutiveFailures = 0;
    // Dedupe key set for the trailing edge of the poll window — bounded since
    // we only ever re-check the most recent poll's worth of trades.
    let lastSeenTime = Date.now();
    let lastBatchKeys = new Set<string>();

    const dedupeKey = (t: FlowTrade) => `${t.time}:${t.price}:${t.qty}`;

    const schedule = (delayMs: number) => {
      if (unmounted) return;
      pollTimer = setTimeout(poll, delayMs);
    };

    const poll = async () => {
      if (unmounted) return;
      const now = Date.now();
      const { page, ok, rateLimited } = await fetchBackfillWindow(symbol, lastSeenTime + 1, now);

      if (unmounted) return;

      if (!ok) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          onStatus?.('error');
        } else {
          onStatus?.('reconnecting');
        }
        const delay =
          POLL_RECONNECT_DELAYS[Math.min(consecutiveFailures - 1, POLL_RECONNECT_DELAYS.length - 1)];
        // Rate-limited polls back off the same way as any other transient failure.
        schedule(rateLimited ? Math.max(delay, POLL_RECONNECT_DELAYS[POLL_RECONNECT_DELAYS.length - 1]) : delay);
        return;
      }

      consecutiveFailures = 0;
      onStatus?.('live');

      // Deliver only unseen trades — dedupe against the previous batch's keys
      // (trades right at the window boundary can repeat across polls).
      const freshKeys = new Set<string>();
      const unseen: FlowTrade[] = [];
      for (const trade of page) {
        const key = dedupeKey(trade);
        freshKeys.add(key);
        if (lastBatchKeys.has(key)) continue;
        unseen.push(trade);
      }
      lastBatchKeys = freshKeys;

      if (unseen.length > 0) {
        lastSeenTime = Math.max(lastSeenTime, ...unseen.map((t) => t.time));
        onTrades(unseen);
      }

      schedule(POLL_INTERVAL_MS);
    };

    onStatus?.('connecting');
    poll();

    return () => {
      unmounted = true;
      if (pollTimer !== null) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
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
    let cursor = toMs;
    let earliestFetchedTime = toMs;
    let requestCount = 0;

    // Walk backward in <=2h windows, newest-first — a partial result (rate
    // limit / budget exhaustion) only ever drops the OLDEST bars, staying
    // contiguous with the freshest edge (same contract as BinanceTradeSource).
    while (cursor > fromMs && requestCount < maxRequests) {
      if (opts?.signal?.aborted) break;

      const windowStart = Math.max(cursor - BACKFILL_WINDOW_MS, fromMs);
      const { page, ok, rateLimited } = await fetchBackfillWindow(symbol, windowStart, cursor, opts?.signal);
      requestCount += 1;

      if (rateLimited) break; // stop gracefully, report what we have
      if (!ok) break; // network/transport failure — stop gracefully

      if (page.length === 0) {
        cursor = windowStart - 1;
        if (cursor < fromMs) break;
        continue;
      }

      for (const trade of page) {
        if (trade.time < fromMs || trade.time > toMs) continue;
        trades.push(trade);
      }

      earliestFetchedTime = Math.min(earliestFetchedTime, windowStart);
      cursor = windowStart - 1;
    }

    const coveredFromMs = trades.length > 0 ? Math.max(earliestFetchedTime, fromMs) : toMs;

    trades.sort((a, b) => a.time - b.time);
    return { trades, coveredFromMs };
  }
}

/** Singleton instance — stateless aside from per-call closures, safe to share. */
export const DatabentoTradeSource: TradeSource = new DatabentoTradeSourceImpl();
