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
import { FUTURES_ROOTS } from './futuresContracts';
import type { FlowTrade, TradeSource, TradeSourceStatus } from './types';

// ── Constants ────────────────────────────────────────────────────────────

const BACKFILL_ENDPOINT = '/api/orderflow/backfill';

const POLL_INTERVAL_MS = 15_000;
const POLL_RECONNECT_DELAYS = [15_000, 30_000, 60_000]; // backoff on transient poll failure
const MAX_CONSECUTIVE_FAILURES = 5;
// Never fire a poll window narrower than this — avoids the degenerate/inverted
// windows seen live (e.g. fromMs=…693&toMs=…692) when the poll cursor catches
// up to "now" with no new trades landing (e.g. CME closed on a weekend).
const MIN_POLL_WINDOW_MS = 5_000;
// Small safety margin behind "now" so a window is never requested for trades
// that haven't landed/settled yet.
const POLL_NOW_MARGIN_MS = 1_000;

// Backfill request budget — chunk into <=2h windows, newest-window-first so
// partial coverage (rate limit / budget exhaustion) stays contiguous with
// the freshest edge, same contract as BinanceTradeSource.backfill.
const BACKFILL_WINDOW_MS = 2 * 60 * 60 * 1000;
const DEFAULT_MAX_BACKFILL_REQUESTS = 60;

// When the requested window has ZERO trades (e.g. CME closed since Friday
// close over a weekend/holiday), keep walking backward past `fromMs` looking
// for the last session that actually traded, capped at this many days before
// the originally-requested `toMs`. Prevents an unbounded walk while still
// reaching back over a long weekend (3-day) plus slack.
const MAX_EMPTY_LOOKBACK_DAYS = 5;
const MAX_EMPTY_LOOKBACK_MS = MAX_EMPTY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

// ── Empty-window anchor walk: exponential-step probing ─────────────────────
//
// Crawling backward in fixed 2h chunks through a closed market (a 3-day
// weekend = ~36 chunks) burns most of the request budget on windows that are
// GUARANTEED empty before ever reaching the last traded session. Two
// speedups, applied in order:
//
// 1. Jump straight to the server-reported availability boundary
//    (`availableEndMs`) instead of crawling to it 2h at a time — the server
//    already told us nothing newer exists, so every chunk between "now" and
//    that boundary is a wasted round trip.
// 2. Below the boundary, DOUBLE the step on every empty chunk (2h → 4h → 8h
//    → 16h, capped at 24h) and PROBE — not fully cover — each doubled span.
//    A probe is still a normal <=2h window (the server enforces that ceiling
//    anyway); when stepping wider than 2h we only fetch the 2h slice
//    immediately behind the new cursor and SKIP the rest of the gap. This is
//    sound because CME regular/overnight sessions run for many hours at a
//    stretch — any session that has started will have trades in ANY 2h
//    sub-window of it, so a 2h probe every 4h/8h/16h can never step clean
//    over an active session; it can only ever skip through provably-closed
//    time. The moment a probe lands inside a session, trades come back and
//    the "found anchor" fallback below fills backward normally.
const ANCHOR_PROBE_WINDOW_MS = BACKFILL_WINDOW_MS; // 2h — same as normal chunking, server-capped
const ANCHOR_MAX_STEP_MS = 24 * 60 * 60 * 1000; // cap growth at 24h/probe

// ── Wire shape ───────────────────────────────────────────────────────────

interface BackfillResponse {
  trades: FlowTrade[];
  /** True when the response was served from a server-side cache, not a fresh Databento call. */
  cached?: boolean;
  /**
   * Optional: Databento's rolling available-data end, epoch ms. When present
   * and < the requested `toMs`, the caller should clamp further chunk
   * requests to it instead of repeatedly asking beyond what the server can
   * ever serve.
   */
  availableEndMs?: number;
}

// Longest-root-first so 3-char roots (MNQ, MES) are checked before their
// 2-char siblings would otherwise be mistaken as a prefix match.
const ROOTS_BY_LENGTH_DESC = [...FUTURES_ROOTS].sort((a, b) => b.length - a.length);

/**
 * Extract the bare futures root (e.g. "NQU6" → "NQ") — the backfill proxy
 * only accepts roots (NQ/ES/MNQ/MES), never the full contract code.
 *
 * A naive `/^([A-Z]{1,4})/` greedy-match is WRONG here: the CME month code
 * (H/M/U/Z) immediately follows the root and is itself an uppercase letter,
 * so it gets swallowed into the match (e.g. "NQU6" → "NQU" instead of "NQ")
 * — this was the live 400 bug. Matching against the known root list avoids
 * that trap entirely.
 */
function extractRoot(symbol: string): string {
  const found = ROOTS_BY_LENGTH_DESC.find((root) => symbol.startsWith(root));
  return found ?? symbol;
}

interface FetchWindowResult {
  page: FlowTrade[];
  ok: boolean;
  rateLimited: boolean;
  badRequest: boolean;
  /** Echoed from the response, if the server sent one (see BackfillResponse). */
  availableEndMs?: number;
}

async function fetchBackfillWindow(
  symbol: string,
  fromMs: number,
  toMs: number,
  signal?: AbortSignal,
): Promise<FetchWindowResult> {
  const root = extractRoot(symbol);
  const url = `${BACKFILL_ENDPOINT}?symbol=${encodeURIComponent(root)}&fromMs=${fromMs}&toMs=${toMs}`;

  let res: Response;
  try {
    res = await authFetch(url, { signal });
  } catch {
    return { page: [], ok: false, rateLimited: false, badRequest: false };
  }

  if (res.status === 429) return { page: [], ok: false, rateLimited: true, badRequest: false };
  if (res.status === 400) return { page: [], ok: false, rateLimited: false, badRequest: true };
  if (!res.ok) return { page: [], ok: false, rateLimited: false, badRequest: false };

  let body: BackfillResponse;
  try {
    body = (await res.json()) as BackfillResponse;
  } catch {
    return { page: [], ok: false, rateLimited: false, badRequest: false };
  }

  if (!Array.isArray(body.trades)) return { page: [], ok: false, rateLimited: false, badRequest: false };

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

  const availableEndMs = typeof body.availableEndMs === 'number' ? body.availableEndMs : undefined;
  return { page, ok: true, rateLimited: false, badRequest: false, availableEndMs };
}

// ── Implementation ──────────────────────────────────────────────────────

class DatabentoTradeSourceImpl implements TradeSource {
  readonly venueId = 'databento';

  subscribe(
    symbol: string,
    onTrades: (trades: FlowTrade[]) => void,
    onStatus?: (status: TradeSourceStatus) => void,
  ): () => void {
    let unmounted = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let consecutiveFailures = 0;
    // Warn about a non-retryable 400 (bad symbol/params) exactly once per
    // mount — repeated 400s are a config/logic error, not a transient
    // failure, and must never trigger a tight retry loop.
    let badRequestWarned = false;
    // Dedupe key set for the trailing edge of the poll window — bounded since
    // we only ever re-check the most recent poll's worth of trades.
    let lastSeenTime = Date.now();
    let lastBatchKeys = new Set<string>();
    // Databento's rolling available-data end, epoch ms — once the server
    // reports one, the poll cursor chases IT instead of wall-clock "now" so
    // we stop asking for a window beyond what Databento can ever serve
    // (e.g. CME closed since Friday: "now" keeps advancing every poll, but
    // there is nothing newer than Friday's close to fetch).
    let availableEndMs: number | null = null;

    const dedupeKey = (t: FlowTrade) => `${t.time}:${t.price}:${t.qty}`;

    const schedule = (delayMs: number) => {
      if (unmounted) return;
      pollTimer = setTimeout(poll, delayMs);
    };

    const poll = async () => {
      if (unmounted) return;

      // Clamp the poll window so it never runs ahead of itself: when no new
      // trades have landed (e.g. CME closed on a weekend), `lastSeenTime`
      // sits at mount-time "now" while wall-clock "now" barely moves between
      // polls, producing a near-zero or inverted window (`toMs <= fromMs`).
      // Requiring a minimum width and skipping short/degenerate cycles fixes
      // both the inverted-window and the tight-loop symptoms.
      //
      // Once the server has told us its rolling available-data end, chase
      // THAT instead of wall-clock "now" — otherwise every poll keeps
      // requesting a window beyond what Databento can ever serve (e.g. CME
      // closed since Friday close), which is a pointless request every cycle.
      const wallNowMs = Date.now() - POLL_NOW_MARGIN_MS;
      const nowMs = availableEndMs !== null ? Math.min(availableEndMs, wallNowMs) : wallNowMs;
      const fromMs = Math.min(lastSeenTime + 1, nowMs);
      const toMs = nowMs;

      if (toMs - fromMs < MIN_POLL_WINDOW_MS) {
        // Window too narrow (or inverted) — skip this cycle silently, keep
        // the normal 15s cadence, and don't touch consecutiveFailures/status.
        schedule(POLL_INTERVAL_MS);
        return;
      }

      const { page, ok, rateLimited, badRequest, availableEndMs: reportedEndMs } = await fetchBackfillWindow(
        symbol,
        fromMs,
        toMs,
      );

      if (unmounted) return;

      if (typeof reportedEndMs === 'number') {
        availableEndMs = reportedEndMs;
      }

      if (badRequest) {
        // Non-retryable config/logic error (e.g. malformed symbol/root) —
        // never tight-loop on this. Log once, surface 'error' status, and
        // keep polling at the normal cadence in case the condition clears
        // (e.g. a root computed from a stale contract on a rollover day).
        if (!badRequestWarned) {
          badRequestWarned = true;
          // eslint-disable-next-line no-console
          console.warn(
            `[DatabentoTradeSource] backfill request rejected (400) for symbol "${symbol}" — check the symbol/root mapping.`,
          );
        }
        onStatus?.('error');
        schedule(POLL_INTERVAL_MS);
        return;
      }

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
    const requestedWindowMs = toMs - fromMs;
    const trades: FlowTrade[] = [];
    let cursor = toMs;
    let earliestFetchedTime = toMs;
    let requestCount = 0;
    // Once the server reports its rolling available-data end, clamp the
    // window ceiling to it so we don't keep re-asking beyond available data.
    let availableEndMs: number | null = null;

    const clampedCursor = () => (availableEndMs !== null ? Math.min(cursor, availableEndMs) : cursor);

    // Walk backward in <=2h windows, newest-first — a partial result (rate
    // limit / budget exhaustion) only ever drops the OLDEST bars, staying
    // contiguous with the freshest edge (same contract as BinanceTradeSource).
    while (cursor > fromMs && requestCount < maxRequests) {
      if (opts?.signal?.aborted) break;

      const chunkEnd = clampedCursor();
      if (chunkEnd <= fromMs) break; // available end has receded to/behind fromMs — nothing left to ask for here

      const windowStart = Math.max(chunkEnd - BACKFILL_WINDOW_MS, fromMs);
      const { page, ok, rateLimited, availableEndMs: reportedEndMs } = await fetchBackfillWindow(
        symbol,
        windowStart,
        chunkEnd,
        opts?.signal,
      );
      requestCount += 1;
      if (typeof reportedEndMs === 'number') availableEndMs = reportedEndMs;

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

    // Anchor-to-last-data: the requested window landed ZERO trades — most
    // commonly a weekend/holiday backfill request (CME closed since Friday
    // close) where "last N bars from now" has nothing to show even though
    // Thursday/Friday's session is sitting right behind it.
    //
    // Two-phase walk, bounded by MAX_EMPTY_LOOKBACK_DAYS before the original
    // `toMs` and by the remaining request budget:
    //
    //   Phase 1 (search) — find the anchor FAST:
    //     a) if the server has reported an availability boundary
    //        (`availableEndMs`) above `lookbackFloorMs`, jump the cursor
    //        straight there in one step — no point crawling through a span
    //        the server has already told us is empty.
    //     b) below the boundary, probe with an EXPONENTIALLY GROWING step
    //        (2h → 4h → 8h → 16h, capped at 24h). Each probe is still only a
    //        <=2h window (server-enforced ceiling) taken from the END of the
    //        current step — the span BETWEEN probes is skipped entirely, not
    //        fetched. This is safe because a CME session (regular or
    //        overnight) runs far longer than the largest gap between two
    //        consecutive probes, so a probe can never step clean over a
    //        session that has started; it can only skip through time that is
    //        provably still closed. A 3-day weekend is then crossed in ~5
    //        requests (2h,4h,8h,16h,24h ≈ 54h) instead of ~35.
    //   Phase 2 (fill) — once a probe lands inside a session, that session IS
    //     the anchor: switch back to normal <=2h chunks and fill backward
    //     from the probe's window-start until roughly the originally
    //     requested window length is covered (or budget/lookback runs out).
    if (trades.length === 0) {
      const lookbackFloorMs = toMs - MAX_EMPTY_LOOKBACK_MS;
      let foundAnyData = false;
      let anchorEarliest = fromMs;

      // Phase 1a — jump straight to the reported availability boundary
      // instead of crawling to it. Only meaningful if it's strictly below
      // the already-empty requested window (otherwise there's nothing to
      // skip) and still above the lookback floor.
      let probeCursor = fromMs;
      if (availableEndMs !== null && availableEndMs < probeCursor && availableEndMs > lookbackFloorMs) {
        probeCursor = availableEndMs;
      }

      // Phase 1b — exponential-step probing for the last-traded session.
      let stepMs = ANCHOR_PROBE_WINDOW_MS;
      let anchorWindowStart: number | null = null;
      let anchorPage: FlowTrade[] = [];

      while (probeCursor > lookbackFloorMs && requestCount < maxRequests) {
        if (opts?.signal?.aborted) break;

        const chunkEnd = availableEndMs !== null ? Math.min(probeCursor, availableEndMs) : probeCursor;
        if (chunkEnd <= lookbackFloorMs) break;

        // Probe a <=2h window taken from the END of the current step — the
        // gap between chunkEnd - stepMs and the probe's own start is
        // deliberately skipped (see reasoning above).
        const probeStart = Math.max(chunkEnd - ANCHOR_PROBE_WINDOW_MS, lookbackFloorMs);
        const { page, ok, rateLimited, availableEndMs: reportedEndMs } = await fetchBackfillWindow(
          symbol,
          probeStart,
          chunkEnd,
          opts?.signal,
        );
        requestCount += 1;
        if (typeof reportedEndMs === 'number') availableEndMs = reportedEndMs;

        if (rateLimited || !ok) break; // stop gracefully, report what we have (possibly still empty)

        if (page.length === 0) {
          // Nothing here — grow the step (exponential backoff through closed
          // market) and keep probing further back.
          probeCursor = chunkEnd - stepMs;
          stepMs = Math.min(stepMs * 2, ANCHOR_MAX_STEP_MS);
          continue;
        }

        // Found the anchor session.
        anchorWindowStart = probeStart;
        anchorPage = page;
        break;
      }

      if (anchorWindowStart !== null) {
        for (const trade of anchorPage) trades.push(trade);
        anchorEarliest = anchorWindowStart;
        foundAnyData = true;

        // Phase 2 — fill backward with normal <=2h chunks from the anchor
        // until we've accumulated roughly the originally requested window
        // length worth of trades, or budget/lookback runs out.
        let fillCursor = anchorWindowStart - 1;
        while (fillCursor > lookbackFloorMs && requestCount < maxRequests) {
          if (opts?.signal?.aborted) break;

          const coveredSoFarMs = toMs - anchorEarliest;
          if (coveredSoFarMs >= requestedWindowMs) break;

          const chunkEnd = availableEndMs !== null ? Math.min(fillCursor, availableEndMs) : fillCursor;
          if (chunkEnd <= lookbackFloorMs) break;

          const windowStart = Math.max(chunkEnd - BACKFILL_WINDOW_MS, lookbackFloorMs);
          const { page, ok, rateLimited, availableEndMs: reportedEndMs } = await fetchBackfillWindow(
            symbol,
            windowStart,
            chunkEnd,
            opts?.signal,
          );
          requestCount += 1;
          if (typeof reportedEndMs === 'number') availableEndMs = reportedEndMs;

          if (rateLimited || !ok) break;

          if (page.length === 0) {
            // A gap inside the fill range (e.g. the daily CME maintenance
            // break) — keep walking backward past it, don't stop the fill.
            fillCursor = windowStart - 1;
            continue;
          }

          for (const trade of page) trades.push(trade);
          anchorEarliest = Math.min(anchorEarliest, windowStart);
          fillCursor = windowStart - 1;
        }
      }

      if (foundAnyData) {
        trades.sort((a, b) => a.time - b.time);
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.info(
            `[DatabentoTradeSource] empty-window anchor resolved: ${requestCount} requests, ` +
              `anchor=${new Date(anchorEarliest).toISOString()}, trades=${trades.length}`,
          );
        }
        return { trades, coveredFromMs: anchorEarliest };
      }
      // No data anywhere in the lookback window either — report honestly.
      return { trades: [], coveredFromMs: toMs };
    }

    const coveredFromMs = Math.max(earliestFetchedTime, fromMs);

    trades.sort((a, b) => a.time - b.time);
    return { trades, coveredFromMs };
  }
}

/** Singleton instance — stateless aside from per-call closures, safe to share. */
export const DatabentoTradeSource: TradeSource = new DatabentoTradeSourceImpl();

// ── Cache warm-up (H5 — PR 3) ────────────────────────────────────────────
//
// Fire-and-forget: asks the server to pre-populate its durable
// orderflow_trade_windows repo for `root` (POST /api/orderflow/warm — see
// finotaur-server/src/routes/orderflowRouter.js) so the FIRST real backfill
// request a user's session makes (when they actually open the futures Order
// Flow tab) is more likely to hit a warm repo row instead of a cold
// Databento call. Mirrors fetchBackfillWindow's auth (authFetch, same
// requireAuthJWT + requireAdmin gate as /backfill) — response is ignored
// entirely (202/409/4xx/network failure all silently swallowed): this is
// pure optimization, never a source of truth for actual chart data, and
// must never surface an error to the user for a background warm-up.
//
// Server contract (confirmed by reading orderflowRouter.js directly, NOT
// guessed): POST /api/orderflow/warm takes `{ symbols: string, days?: number }`
// in the JSON body (comma-separated root symbols, e.g. "NQ,ES"; NOT
// fromMs/toMs — the server walks its own backward window per `days`). A
// single-root warm call only ever needs ONE symbol and a small `days` value
// — a mount-triggered warm doesn't need the server's full
// DEFAULT_WARM_DAYS=3 walk.
const WARM_ENDPOINT = '/api/orderflow/warm';
const WARM_DAYS = 1;

export function warmOrderflowCache(root: string): void {
  const bareRoot = extractRoot(root);

  authFetch(WARM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols: bareRoot, days: WARM_DAYS }),
  }).catch((err) => {
    if (import.meta.env.DEV) {
      console.debug('[DatabentoTradeSource] warmOrderflowCache failed (non-fatal):', err);
    }
  });
}
