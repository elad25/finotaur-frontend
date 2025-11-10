
type Entry<T> = { value: T; expiresAt: number };
export class TTLCache {
  private store = new Map<string, Entry<any>>();
  constructor(private defaultTtlMs: number = 60_000) {}
  get<T>(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return;
    if (Date.now() > e.expiresAt) { this.store.delete(key); return; }
    return e.value as T;
  }
  set<T>(key: string, value: T, ttlMs?: number) {
    const exp = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expiresAt: exp });
  }
  clear() { this.store.clear(); }
}
export const globalCache = new TTLCache(60_000);
