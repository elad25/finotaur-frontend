/**
 * Lightweight in-memory cache with TTL + snapshot fallback.
 * No external deps. Replace with Redis later if needed.
 */
type CacheEntry<T> = { value: T; expiresAt: number; snapshot?: T };

const store = new Map<string, CacheEntry<any>>();

export function saveWithTTL<T>(key: string, value: T, ttlSec: number) {
  const now = Date.now();
  const expiresAt = now + ttlSec * 1000;
  const existing = store.get(key);
  store.set(key, { value, expiresAt, snapshot: existing?.value ?? value });
}

export function getFresh<T>(key: string): { value: T; stale: boolean } | null {
  const e = store.get(key);
  if (!e) return null;
  const now = Date.now();
  if (now <= e.expiresAt) return { value: e.value as T, stale: false };
  // expired: serve stale snapshot if available
  const fallback = e.snapshot ?? e.value;
  return { value: fallback as T, stale: true };
}
