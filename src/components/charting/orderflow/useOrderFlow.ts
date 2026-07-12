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
}

export function useOrderFlow(options: UseOrderFlowOptions): UseOrderFlowResult {
  const { symbol, intervalSec, rowSize, source, backfillBars = DEFAULT_BACKFILL_BARS } = options;

  const storeRef = useRef<FlowBinStore>(new FlowBinStore({ intervalSec, rowSize }));
  const [status, setStatus] = useState<TradeSourceStatus>('connecting');
  const [backfillCoveredFromSec, setBackfillCoveredFromSec] = useState<number | null>(null);
  const [backfillInFlight, setBackfillInFlight] = useState(false);

  // Re-bin in place when interval/rowSize change (no need to recreate the store).
  useEffect(() => {
    storeRef.current.setConfig({ intervalSec, rowSize });
  }, [intervalSec, rowSize]);

  useEffect(() => {
    const store = storeRef.current;
    const controller = new AbortController();
    let firstLiveTradeSeen = false;

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
      setBackfillCoveredFromSec(Math.floor(earliestCachedMs / 1000));
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

    const onTrades = (trades: FlowTrade[]) => {
      if (trades.length === 0) return;

      if (!firstLiveTradeSeen) {
        firstLiveTradeSeen = true;
        const firstLiveTime = trades[0].time;
        setBackfillInFlight(true);

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
              setBackfillCoveredFromSec((prev) => {
                const candidate = Math.floor(result.coveredFromMs / 1000);
                return prev === null ? candidate : Math.min(prev, candidate);
              });
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
              setBackfillCoveredFromSec((prev) => {
                const candidate = Math.floor(earliestMs / 1000);
                return prev === null ? candidate : Math.min(prev, candidate);
              });
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
          const fromMs = firstLiveTime - backfillBars * intervalSec * 1000;

          const ownWalk = (async () => {
            const phase1 = await runBackfill(fromMs, firstLiveTime, PHASE1_MAX_REQUESTS);
            if (controller.signal.aborted) return;
            setBackfillCoveredFromSec(Math.floor(phase1.coveredFromMs / 1000));

            // Phase 2 only makes sense if phase 1 didn't already reach the
            // requested window's floor (i.e. there's more history left to
            // fetch) and there's budget left for it.
            if (phase1.coveredFromMs > fromMs && PHASE2_MAX_REQUESTS > 0) {
              const phase2ToMs = phase1.coveredFromMs - 1;
              if (phase2ToMs > fromMs) {
                const phase2 = await runBackfill(fromMs, phase2ToMs, PHASE2_MAX_REQUESTS);
                if (controller.signal.aborted) return;
                // Coverage only ever extends further BACK in phase 2 (never
                // forward) — take the earlier of the two reported values.
                setBackfillCoveredFromSec((prev) => {
                  const candidate = Math.floor(phase2.coveredFromMs / 1000);
                  return prev === null ? candidate : Math.min(prev, candidate);
                });
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
            if (!controller.signal.aborted) setBackfillInFlight(false);
          });
      }

      store.applyTrades(trades);
      trackNewest(trades);
    };

    const unsubscribe = source.subscribe(symbol, onTrades, setStatus);

    return () => {
      controller.abort();
      unsubscribe();
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

  return { store: storeRef.current, status, backfillCoveredFromSec, backfillInFlight };
}
