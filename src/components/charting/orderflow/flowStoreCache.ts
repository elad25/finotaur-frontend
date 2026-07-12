// src/components/charting/orderflow/flowStoreCache.ts
// Module-level LRU cache of raw trade snapshots, keyed by venue+symbol.
//
// Purpose: useOrderFlow.ts clears its FlowBinStore on every symbol/source
// change (and on unmount) — the raw trade ring that store accumulated via
// backfill + live trades is normally lost, so re-subscribing to the same
// instrument (tab switch, symbol A -> B -> A, or an Arena-mount prefetch —
// see useArenaOrderflowPrefetch.ts) has to re-run a full backfill walk from
// scratch. This cache holds a *copy* of the raw trade ring (see
// flowBinStore.ts's getRawTrades()) so a quick round-trip back to a
// recently-warmed instrument can paint instantly, then top up only the
// (small) gap to the live edge.
//
// ── Key decision: intervalSec is deliberately EXCLUDED from the cache key ──
// The task brief's literal key format was "<venue>|<symbol>|<intervalSec>".
// After reading flowBinStore.ts, that's wrong: the raw ring is pre-binning —
// FlowTrade has no interval-dependent shape at all, and
// FlowBinStore.setConfig() re-bins the SAME raw ring in place on an
// intervalSec/rowSize change (see its "Re-bin from the raw ring buffer with
// the new config" comment) instead of refetching. Keying this cache by
// intervalSec would needlessly fragment it into up to 3x the entries for the
// exact same underlying trades, defeating the LRU's cap of 3 (a symbol
// viewed at 3 different candle widths would evict itself out of its own
// cache) for zero benefit — the cached data is equally valid at any
// intervalSec. Keying by venue+symbol only means switching intervalSec on an
// already-cached instrument is a pure re-bin, never a cache miss.
//
// Pure TS — no React, no DOM. Mirrors flowBinStore.ts's "pure engine" style.

import type { FlowTrade } from './types';

const MAX_ENTRIES = 3;

export interface CachedFlowTrades {
  /** Raw trade ring snapshot — a COPY, safe to hold independently of the store it was read from. */
  trades: FlowTrade[];
  /** Epoch ms of the newest trade in `trades` — the backfill/live gap boundary a cache-hit consumer should resume from. */
  newestMs: number;
  /** Epoch ms this entry was stored — consulted by evictStale(). */
  storedAt: number;
}

/** Builds the cache key for a (venue, symbol) pair. See the header comment for why intervalSec is not part of this. */
export function buildCacheKey(venue: string, symbol: string): string {
  return `${venue}|${symbol}`;
}

// Map iteration order in JS is insertion order. Deleting + re-inserting a
// key on every touch (get/put) moves it to the "most recently used" end, so
// the FIRST key in iteration order is always the least-recently-used one —
// that's the entire LRU mechanism below, no extra bookkeeping needed.
const cache = new Map<string, CachedFlowTrades>();

/** Reads a cache entry and marks it most-recently-used. Returns null on a miss. */
export function getCachedTrades(key: string): CachedFlowTrades | null {
  const entry = cache.get(key);
  if (!entry) return null;
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

/**
 * Stores a snapshot of `trades` (copied — the caller's array is never held
 * by reference) under `key`, evicting the least-recently-used entry once the
 * cache exceeds MAX_ENTRIES (3).
 */
export function putCachedTrades(key: string, trades: readonly FlowTrade[], newestMs: number): void {
  cache.delete(key); // ensures re-insertion below lands at the MRU position even on overwrite
  cache.set(key, { trades: trades.slice(), newestMs, storedAt: Date.now() });

  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

/**
 * Drops every entry older than `maxAgeMs`. Intended to be called once per
 * mount/resubscribe (see useOrderFlow.ts) rather than on a background timer
 * — this cache only needs to know "is this stale RIGHT NOW, at the moment
 * I'm about to consult it", not track staleness continuously.
 */
export function evictStale(maxAgeMs: number): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.storedAt > maxAgeMs) cache.delete(key);
  }
}

/** Current number of cached entries — exposed for tests only. */
export function __cacheSizeForTests(): number {
  return cache.size;
}

/** Clears the entire cache — exposed for tests only, so test files don't leak state into each other via this module-level singleton. */
export function __clearCacheForTests(): void {
  cache.clear();
}
