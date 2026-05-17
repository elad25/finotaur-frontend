/**
 * Shared client-side LRU cache for chart data sources.
 *
 * WHY: Even with a serious server-side cache (`chart_bars_cache` table), every
 * trade-detail dialog open still pays the Edge Function round-trip — ~1-2s on
 * cache hit, 1.5-3s on miss. With this layer, opening the SAME trade twice
 * within 5 minutes is zero network. Scrolling through 10 recent trades in
 * MyTrades fills the cache; reopening any is instant.
 *
 * DESIGN:
 *   - Map<string, entry> preserves insertion order → natural LRU
 *   - 50-entry cap → ~5-10MB worst case for typical bar payloads
 *   - 5-minute TTL → trades opened back-to-back hit cache; longer gaps re-fetch
 *     to pick up new bars at the right edge for OPEN trades
 *   - Cleared on page reload (per-tab, in-memory) — intentional: server is the
 *     source of truth, client cache is only an in-session amortizer
 *
 * USAGE:
 *   const key = makeCacheKey('yahoo', 'MNQ=F', '5m', from, to);
 *   const hit = getCached<Bar[]>(key);
 *   if (hit) return hit;
 *   const fresh = await fetch(...);
 *   setCached(key, fresh);
 */

const CACHE_MAX_ENTRIES = 50;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Build a stable cache key. `from` and `to` are bucketed to the nearest 60
 * seconds so two opens of the same trade within the same minute hit the same
 * key (cache hit) instead of generating sibling entries.
 */
export function makeCacheKey(
  sourceTag: string,
  symbol: string,
  interval: string,
  fromSec: number,
  toSec: number,
): string {
  const bucketedFrom = Math.floor(fromSec / 60) * 60;
  const bucketedTo = Math.floor(toSec / 60) * 60;
  return `${sourceTag}|${symbol}|${interval}|${bucketedFrom}|${bucketedTo}`;
}

/** Get cached value, or null if missing/expired. Touches access order (LRU). */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  // LRU touch: re-insert at end so it survives longest
  cache.delete(key);
  cache.set(key, entry);
  return entry.value as T;
}

/** Store value under key. Evicts oldest if cap is hit. */
export function setCached<T>(key: string, value: T): void {
  if (cache.size >= CACHE_MAX_ENTRIES && !cache.has(key)) {
    // Evict the oldest insertion (Map iterates in insertion order)
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Clear the cache. Useful for debug + future "force refresh" buttons. */
export function clearChartCache(): void {
  cache.clear();
}

/** Telemetry hook — useful for verifying cache effectiveness in dev. */
export function getChartCacheStats(): { size: number; max: number; ttlMs: number } {
  return { size: cache.size, max: CACHE_MAX_ENTRIES, ttlMs: CACHE_TTL_MS };
}
