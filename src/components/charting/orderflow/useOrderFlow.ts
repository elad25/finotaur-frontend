// src/components/charting/orderflow/useOrderFlow.ts
// React glue: owns a FlowBinStore + a TradeSource subscription lifecycle,
// kicks off a backfill on mount, then lets live trades flow into the store.
//
// Deliberate deviation from a literal "resubscribe on interval change": raw
// trades are interval-agnostic (only binning depends on intervalSec), so an
// intervalSec-only change re-bins the existing store in place (see the first
// effect below) instead of tearing down and reopening the WS connection.
// Symbol change still fully unsubscribes+clears, per spec.
//
// PR 3 (H2/H3) additions on top of the above:
//  - flowStoreCache.ts integration: on (re)subscribe, a cache hit paints the
//    store instantly from a recently-snapshotted raw ring, then only
//    backfills the small gap up to the first live trade instead of the full
//    historical window. On teardown, the raw ring is snapshotted back into
//    the cache for the next visit. See flowStoreCache.ts's header comment
//    for the venue+symbol-only key decision.
//  - Two-phase backfill on a cache MISS: phase 1 grabs a fast, small-budget
//    first paint; phase 2 continues the deeper historical walk in the
//    background through the same progressive onChunk path phase 1 uses, so
//    the UI never blocks on the full walk finishing.
//  - In-flight de-dup: landing directly on the Footprint tab mounts this
//    hook's effect AND useArenaOrderflowPrefetch.ts's Arena-mount warm-up in
//    the same render pass, before either one's cache write lands. Before
//    starting its own two-phase walk on a cache miss, this hook checks
//    flowStoreCache.ts's shared in-flight-promise registry; if the prefetch
//    already claimed this key, it awaits that walk and reuses whatever
//    landed in the cache instead of racing a near-duplicate REST walk.

import { useEffect, useRef, useState } from 'react';
import { FlowBinStore } from './flowBinStore';
import {
  buildCacheKey,
  getCachedTrades,
  putCachedTrades,
  evictStale,
  getInFlightBackfill,
  registerInFlightBackfill,
} from './flowStoreCache';
import type { FlowBinStoreConfig, FlowTrade, TradeSource, TradeSourceStatus } from './types';

const DEFAULT_BACKFILL_BARS = 40;

// Phase 1 — small request budget for a fast first paint (task target: ~15
// requests max). Phase 2 — the remainder of the existing 90-request cap
// (see BinanceTradeSource.ts's DEFAULT_MAX_BACKFILL_REQUESTS, raised
// 40->90 on 2026-07-12). Deliberate deviation/flag: prior to this change,
// useOrderFlow never passed `maxRequests` at all, so each source silently
// used its OWN default (90 for Binance, 60 for Databento — see
// DatabentoTradeSource.ts's DEFAULT_MAX_BACKFILL_REQUESTS). Now that both
// phases pass an explicit maxRequests, Databento's effective per-mount
// budget rises from 60 to 90 (15 + 75) — a behavior change flagged here and
// in the task report, not hidden. If that's unwanted for the (admin-only,
// non-customer-facing) futures path specifically, a per-source override is
// the natural follow-up.
const PHASE1_MAX_REQUESTS = 15;
const TOTAL_BACKFILL_MAX_REQUESTS = 90;
const PHASE2_MAX_REQUESTS = TOTAL_BACKFILL_MAX_REQUESTS - PHASE1_MAX_REQUESTS;

// flowStoreCache entries older than this are treated as stale on the next
// mount/resubscribe — a fresh backfill is cheap enough at that point that
// reusing old data isn't worth the risk of painting genuinely outdated
// trades. Swept once per (re)subscribe (see evictStale() below), not on a
// background timer.
const CACHE_STALE_MS = 10 * 60 * 1000;

// ── Pan-triggered incremental history backfill (fills-the-window feature) ───
// requestHistory()/FootprintLayer's onHistoryNeeded call this to extend
// coverage further back when the user pans left past what's currently
// loaded. Deliberately small vs. the initial-load budgets above — a single
// pan gesture should feel responsive, not trigger a 90-request storm; a
// user panning further just fires more of these, progressively extending
// coverage rather than front-loading it all at once.
const INCREMENTAL_BACKFILL_MAX_REQUESTS = 30;
// Minimum spacing between incremental backfill REST walks — a fast series of
// pan events (mouse-drag, momentum scroll) collapses to at most one request
// per this window; the latest/earliest requested edge wins (see
// pendingHistoryFromMsRef in the hook body).
const HISTORY_REQUEST_MIN_INTERVAL_MS = 1500;

export interface UseOrderFlowOptions extends FlowBinStoreConfig {
  symbol: string;
  source: TradeSource;
  /** How many intervalSec-wide candles to backfill on mount/symbol change. Default 40. */
  backfillBars?: number;
}

export interface UseOrderFlowResult {
  /** Stable identity across re-renders (same instance until symbol/interval/rowSize teardown). */
  store: FlowBinStore;
  status: TradeSourceStatus;
  /** Epoch-ms coverage boundary the backfill actually reached (may be later than requested — see backfill contract). */
  backfillCoveredFromSec: number | null;
  /** True while the historical backfill walk is still in flight (for a transient "Loading trade history…" UI hint). */
  backfillInFlight: boolean;
  /**
   * Requests that history coverage extend back to (at least) `fromMs`
   * (epoch ms) — call this when a pan/scroll reveals a visible window edge
   * earlier than what's currently loaded. No-op if already covered.
   * Debounced (min 1.5s between actual REST walks) and single-flight (a
   * request arriving while one is in flight is queued, not raced); repeated
   * calls with progressively earlier values extend coverage further back
   * each time instead of re-fetching what's already loaded. Stable identity
   * across re-renders — safe to pass directly as a prop/dependency.
   */
  requestHistory: (fromMs: number) => void;
}

/**
 * Pure helper: given the store's current earliest-covered edge
 * (`coveredFromMs`, epoch ms — null if the initial backfill hasn't landed
 * anything yet) and a newly-requested edge (`requestedFromMs`), returns the
 * incremental range to backfill, or null when there's nothing to do.
 *
 * - `coveredFromMs === null` → nothing is covered yet at all; the caller
 *   isn't ready for an incremental request (the initial backfill should
 *   fold this target into its own window instead — see useOrderFlow's
 *   pendingHistoryFromMsRef handling).
 * - `requestedFromMs >= coveredFromMs` → already covered, no-op.
 * - otherwise → `{ fromMs: requestedFromMs, toMs: coveredFromMs - 1 }`,
 *   i.e. exactly the gap between the new target and the current edge —
 *   the already-covered range is NEVER re-fetched.
 */
export function computeIncrementalRange(
  coveredFromMs: number | null,
  requestedFromMs: number,
): { fromMs: number; toMs: number } | null {
  if (coveredFromMs === null) return null;
  if (requestedFromMs >= coveredFromMs) return null;
  const toMs = coveredFromMs - 1;
  if (toMs <= requestedFromMs) return null;
  return { fromMs: requestedFromMs, toMs };
}

// ── requestHistory side-channel, keyed by FlowBinStore instance ─────────────
// FootprintLayer receives a `store: FlowBinStore` prop but has no direct line
// to the useOrderFlow hook invocation that owns it — that hook is called
// several ownership hops away (FootprintTab/ChartTab/FuturesChartTab), and
// threading a new callback prop through FinotaurChart.tsx (which instantiates
// FootprintLayer) is out of scope for this change. Instead, useOrderFlow
// registers its `requestHistory` callback here, keyed by the store INSTANCE
// it owns; FootprintLayer looks itself up via `getRequestHistoryForStore`
// using the exact same store prop it already receives. Zero prop plumbing
// through any file outside this task's scope.
const requestHistoryRegistry = new WeakMap<FlowBinStore, (fromMs: number) => void>();

/** Looks up the requestHistory callback registered for a given store instance (see registry doc comment above). Undefined if no useOrderFlow hook has claimed this store yet. */
export function getRequestHistoryForStore(store: FlowBinStore): ((fromMs: number) => void) | undefined {
  return requestHistoryRegistry.get(store);
}

export function useOrderFlow(options: UseOrderFlowOptions): UseOrderFlowResult {
  const { symbol, intervalSec, rowSize, source, backfillBars = DEFAULT_BACKFILL_BARS } = options;

  const storeRef = useRef<FlowBinStore>(new FlowBinStore({ intervalSec, rowSize }));
  const [status, setStatus] = useState<TradeSourceStatus>('connecting');
  const [backfillCoveredFromSec, setBackfillCoveredFromSec] = useState<number | null>(null);
  const [backfillInFlight, setBackfillInFlight] = useState(false);

  // ── requestHistory plumbing ──────────────────────────────────────────────
  // The exposed `requestHistory` identity is created ONCE (useRef initializer)
  // and never changes — it just forwards to whatever the current subscribe
  // effect installed in requestHistoryImplRef, so callers (and the store
  // registry above) can hold a permanently-stable function reference even
  // though the real implementation is recreated on every symbol/source
  // change alongside the rest of that effect's closures.
  const requestHistoryImplRef = useRef<(fromMs: number) => void>(() => {});
  const requestHistory = useRef((fromMs: number) => {
    requestHistoryImplRef.current(fromMs);
  }).current;

  // Claim this store instance in the WeakMap registry for FootprintLayer's
  // getRequestHistoryForStore lookup (see registry doc comment above). The
  // store instance itself never changes for this hook's lifetime, so a
  // single register-on-mount / unregister-on-unmount effect is enough.
  useEffect(() => {
    const store = storeRef.current;
    requestHistoryRegistry.set(store, requestHistory);
    return () => {
      requestHistoryRegistry.delete(store);
    };
  }, [requestHistory]);

  // Re-bin in place when interval/rowSize change (no need to recreate the store).
  useEffect(() => {
    storeRef.current.setConfig({ intervalSec, rowSize });
  }, [intervalSec, rowSize]);

  useEffect(() => {
    const store = storeRef.current;
    const controller = new AbortController();
    let firstLiveTradeSeen = false;

    // ── Coverage tracking + pan-triggered incremental backfill state ────
    // Plain closure `let`s (not refs) — same convention as newestTradeMs/
    // cacheGapFromMs below: nothing outside this effect run needs to read
    // them, and every nested closure here (queuePendingHistory,
    // requestHistoryImpl, etc.) mutates them by direct closure capture, so
    // no ref indirection is needed. All reset implicitly on every re-run of
    // this effect (symbol/source change) since they're declared fresh here.

    // Earliest epoch-ms the store is backfilled to — null until the initial
    // backfill/cache-hit lands anything.
    let coveredFromMs: number | null = null;
    // True while ANY backfill walk (initial two-phase OR an incremental
    // requestHistory run) is in flight — requestHistoryImpl uses this for
    // single-flight de-dup so a pan doesn't race a concurrent REST walk.
    let historyInFlight = false;
    let lastHistoryRequestAt = 0;
    // Earliest still-unserved requestHistory target, queued while not yet
    // ready (nothing covered yet — folded into the initial window instead)
    // or while debounced/single-flighted. Always the MIN of whatever's
    // pending — a later, less-deep request never overwrites an earlier one.
    let pendingHistoryFromMs: number | null = null;
    let historyDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    const queuePendingHistory = (fromMs: number) => {
      pendingHistoryFromMs = pendingHistoryFromMs === null ? fromMs : Math.min(pendingHistoryFromMs, fromMs);
    };

    /** Extends coveredFromMs backward (never forward) and mirrors it into the exposed backfillCoveredFromSec state. */
    const updateCoveredFrom = (candidateMs: number) => {
      coveredFromMs = coveredFromMs === null ? candidateMs : Math.min(coveredFromMs, candidateMs);
      setBackfillCoveredFromSec(Math.floor(coveredFromMs / 1000));
    };

    // ── flowStoreCache lookup ────────────────────────────────────────────
    const venue = source.venueId ?? 'unknown';
    const cacheKey = buildCacheKey(venue, symbol);
    evictStale(CACHE_STALE_MS);
    const cached = getCachedTrades(cacheKey);

    // Newest trade time seen so far this effect run (cache application,
    // backfill chunks, or live trades) — snapshotted back into the cache on
    // teardown. A plain closure variable (not a ref): nothing outside this
    // effect ever needs to read it, and the cleanup closure below already
    // captures it by reference.
    let newestTradeMs = 0;
    const trackNewest = (batch: FlowTrade[]) => {
      for (const t of batch) {
        if (t.time > newestTradeMs) newestTradeMs = t.time;
      }
    };

    // Set (non-null) only on a cache hit — the gap-fill boundary the first
    // live trade's backfill should resume from, instead of the full
    // historical window.
    let cacheGapFromMs: number | null = null;

    store.clear();
    setStatus('connecting');
    setBackfillCoveredFromSec(null);
    setBackfillInFlight(false);

    if (cached && cached.trades.length > 0) {
      // Instant paint from the cached raw ring.
      store.applyTrades(cached.trades);
      trackNewest(cached.trades);
      cacheGapFromMs = cached.newestMs;

      let earliestCachedMs = cached.trades[0].time;
      for (const t of cached.trades) {
        if (t.time < earliestCachedMs) earliestCachedMs = t.time;
      }
      updateCoveredFrom(earliestCachedMs);
    }

    // Shared backfill runner — used by both the cache-hit gap-fill and the
    // cache-miss two-phase walk below. Applies trades progressively via
    // onChunk when the source supports it (BinanceTradeSource does), else
    // falls back to applying the final resolved `trades` array once
    // (DatabentoTradeSource — see TradeSource.backfill's onChunk doc
    // comment for why callers must not do both).
    const runBackfill = (fromMs: number, toMs: number, maxRequests: number) => {
      let appliedViaChunk = false;
      return source
        .backfill(symbol, fromMs, toMs, {
          signal: controller.signal,
          maxRequests,
          onChunk: (chunk) => {
            if (controller.signal.aborted) return;
            appliedViaChunk = true;
            trackNewest(chunk);
            store.applyTrades(chunk);
          },
        })
        .then((result) => {
          if (controller.signal.aborted) return result;
          if (!appliedViaChunk) {
            trackNewest(result.trades);
            store.applyTrades(result.trades);
          }
          return result;
        });
    };

    // Runs a single incremental backfill walk for [fromMsToRun, toMsToRun),
    // capped at INCREMENTAL_BACKFILL_MAX_REQUESTS so a large pan can't fire a
    // 90-request storm — a user panning further just calls requestHistory
    // again, progressively extending coverage. On completion (success OR
    // failure — best-effort, same posture as the initial walk), re-checks
    // pendingHistoryFromMs so a request that arrived while this one was
    // in flight gets served immediately after, not dropped.
    //
    // Declared as a hoisted `function` (not `const ... = () => {}`) because
    // this and requestHistoryImpl below are mutually recursive (each calls
    // the other) — hoisting avoids a use-before-define lint warning that a
    // const/arrow pair would otherwise trigger regardless of which one is
    // declared first.
    function runIncrementalHistoryBackfill(fromMsToRun: number, toMsToRun: number) {
      historyInFlight = true;
      lastHistoryRequestAt = Date.now();
      runBackfill(fromMsToRun, toMsToRun, INCREMENTAL_BACKFILL_MAX_REQUESTS)
        .then((result) => {
          if (controller.signal.aborted) return;
          updateCoveredFrom(result.coveredFromMs);
        })
        .catch(() => {
          // Best-effort — a failed incremental backfill just leaves the pan
          // showing whatever's already loaded; panning again retries.
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          historyInFlight = false;
          const nextPending = pendingHistoryFromMs;
          if (nextPending !== null) {
            pendingHistoryFromMs = null;
            requestHistoryImpl(nextPending);
          }
        });
    }

    // Core implementation behind the hook's exposed `requestHistory` and the
    // "honor any pending request" step run after the initial backfill lands
    // (see maybeHonorPendingHistory below). Debounced + single-flight — see
    // UseOrderFlowResult.requestHistory's doc comment for the contract.
    // Hoisted `function` — see runIncrementalHistoryBackfill's doc comment
    // above for why (mutual recursion with that function).
    function requestHistoryImpl(fromMs: number) {
      if (controller.signal.aborted) return;

      // Captured into a local const (rather than reading the outer `let`
      // twice) so the null-check below narrows cleanly for
      // computeIncrementalRange regardless of TS's closure-narrowing rules.
      const covered = coveredFromMs;
      if (covered === null) {
        // Nothing covered yet at all — the initial backfill hasn't landed
        // (may not have even started, e.g. no live trade seen yet). Stash
        // for the initial window to fold in (widens its target) and/or for
        // maybeHonorPendingHistory to serve once that walk completes.
        queuePendingHistory(fromMs);
        return;
      }

      const range = computeIncrementalRange(covered, fromMs);
      if (range === null) return; // already covered (or a degenerate request) — no-op

      if (historyInFlight) {
        // Single-flight — queue the earliest pending target for right after
        // the in-flight run finishes.
        queuePendingHistory(fromMs);
        return;
      }

      const now = Date.now();
      const elapsed = now - lastHistoryRequestAt;
      if (elapsed < HISTORY_REQUEST_MIN_INTERVAL_MS) {
        // Debounced — queue and let the trailing timer fire once the window
        // elapses, re-evaluating coverage at fire time (more may have landed
        // by then via another path, e.g. the initial walk still finishing).
        queuePendingHistory(fromMs);
        if (historyDebounceTimer === null) {
          historyDebounceTimer = setTimeout(() => {
            historyDebounceTimer = null;
            const queued = pendingHistoryFromMs;
            if (queued !== null) {
              pendingHistoryFromMs = null;
              requestHistoryImpl(queued);
            }
          }, HISTORY_REQUEST_MIN_INTERVAL_MS - elapsed);
        }
        return;
      }

      runIncrementalHistoryBackfill(range.fromMs, range.toMs);
    }
    requestHistoryImplRef.current = requestHistoryImpl;

    /** Serves any requestHistory call that arrived (and got queued) before the initial backfill had anything covered. Called once the initial walk settles. */
    function maybeHonorPendingHistory() {
      const pending = pendingHistoryFromMs;
      if (pending === null) return;
      pendingHistoryFromMs = null;
      requestHistoryImpl(pending);
    }

    const onTrades = (trades: FlowTrade[]) => {
      if (trades.length === 0) return;

      if (!firstLiveTradeSeen) {
        firstLiveTradeSeen = true;
        const firstLiveTime = trades[0].time;
        setBackfillInFlight(true);
        historyInFlight = true;

        const walk = async () => {
          if (cacheGapFromMs !== null) {
            // Cache hit — only fetch the (typically small — seconds to a
            // couple of minutes) gap between the cached snapshot and the
            // first live trade. +1 avoids re-counting the cached boundary
            // trade itself if the gap response happens to re-include it.
            const gapFromMs = cacheGapFromMs + 1;
            if (gapFromMs < firstLiveTime) {
              const result = await runBackfill(gapFromMs, firstLiveTime, PHASE1_MAX_REQUESTS);
              if (controller.signal.aborted) return;
              updateCoveredFrom(result.coveredFromMs);
            }
            return;
          }

          // Cache miss — before starting our own REST walk, check whether
          // useArenaOrderflowPrefetch.ts is already backfilling this exact
          // venue+symbol key (both effects can mount in the same render
          // pass when the user lands directly on the Footprint tab). If so,
          // await that walk and reuse whatever it wrote to the cache
          // instead of racing a near-duplicate BinanceTradeSource.backfill()
          // call.
          const inFlight = getInFlightBackfill(cacheKey);
          if (inFlight) {
            await inFlight;
            if (controller.signal.aborted) return;
            const nowCached = getCachedTrades(cacheKey);
            if (nowCached && nowCached.trades.length > 0) {
              store.applyTrades(nowCached.trades);
              trackNewest(nowCached.trades);
              let earliestMs = nowCached.trades[0].time;
              for (const t of nowCached.trades) {
                if (t.time < earliestMs) earliestMs = t.time;
              }
              updateCoveredFrom(earliestMs);
              return; // covered by the prefetch's walk — no duplicate REST calls
            }
            // The in-flight walk finished without producing anything usable
            // (aborted, empty, or the tab unmounted before it landed) —
            // fall through and run our own walk below.
          }

          // Cache miss — two-phase walk. Phase 1: small request budget for
          // a fast first paint. Phase 2: continue deeper with the
          // remaining budget, delivered progressively via the same onChunk
          // path phase 1 uses, so the UI keeps filling in the background
          // instead of blocking on the whole walk finishing.
          //
          // Window: max(default backfillBars window, any requestHistory
          // target that arrived before this walk even started — see
          // pendingHistoryFromMs). "max" here means the WIDER of the two
          // windows, i.e. the EARLIER (smaller) epoch-ms edge — a caller
          // that already knows it wants deeper history than the default 40
          // bars gets it folded into this walk instead of waiting for a
          // separate incremental request afterward. Left un-cleared:
          // maybeHonorPendingHistory (run after this walk settles) re-checks
          // it in case the request budget didn't actually reach it.
          const defaultFromMs = firstLiveTime - backfillBars * intervalSec * 1000;
          const fromMs = pendingHistoryFromMs !== null ? Math.min(defaultFromMs, pendingHistoryFromMs) : defaultFromMs;

          const ownWalk = (async () => {
            const phase1 = await runBackfill(fromMs, firstLiveTime, PHASE1_MAX_REQUESTS);
            if (controller.signal.aborted) return;
            updateCoveredFrom(phase1.coveredFromMs);

            // Phase 2 only makes sense if phase 1 didn't already reach the
            // requested window's floor (i.e. there's more history left to
            // fetch) and there's budget left for it.
            if (phase1.coveredFromMs > fromMs && PHASE2_MAX_REQUESTS > 0) {
              const phase2ToMs = phase1.coveredFromMs - 1;
              if (phase2ToMs > fromMs) {
                const phase2 = await runBackfill(fromMs, phase2ToMs, PHASE2_MAX_REQUESTS);
                if (controller.signal.aborted) return;
                // Coverage only ever extends further BACK in phase 2 (never
                // forward) — updateCoveredFrom already takes the min.
                updateCoveredFrom(phase2.coveredFromMs);
              }
            }
          })();
          registerInFlightBackfill(cacheKey, ownWalk);
          await ownWalk;
        };

        walk()
          .catch(() => {
            // Backfill is best-effort — live trades already flowing regardless.
          })
          .finally(() => {
            if (!controller.signal.aborted) {
              setBackfillInFlight(false);
              historyInFlight = false;
              // Serve any requestHistory call that arrived (and got queued)
              // while the initial walk was still running — including one
              // that widened `fromMs` above but whose target the request
              // budget didn't actually reach.
              maybeHonorPendingHistory();
            }
          });
      }

      store.applyTrades(trades);
      trackNewest(trades);
    };

    const unsubscribe = source.subscribe(symbol, onTrades, setStatus);

    return () => {
      controller.abort();
      unsubscribe();
      if (historyDebounceTimer !== null) {
        clearTimeout(historyDebounceTimer);
        historyDebounceTimer = null;
      }
      requestHistoryImplRef.current = () => {};
      // Snapshot the raw ring into flowStoreCache before clearing — lets a
      // future re-subscribe to this venue+symbol paint instantly instead of
      // re-running the full backfill walk. Skipped when nothing was ever
      // applied (newestTradeMs stays 0 only if neither a cache hit nor any
      // live/backfilled trade landed this effect run — nothing worth caching).
      if (newestTradeMs > 0) {
        putCachedTrades(cacheKey, store.getRawTrades(), newestTradeMs);
      }
      store.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, source]);

  return { store: storeRef.current, status, backfillCoveredFromSec, backfillInFlight, requestHistory };
}
