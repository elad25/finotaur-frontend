// Very small in-memory TTL cache
type Entry<T> = { value: T; expires: number };

export class MemoryCache {
  private store = new Map<string, Entry<any>>();
  constructor(private defaultTtlMs = 5 * 60 * 1000) {}

  get<T>(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return;
    if (Date.now() > e.expires) {
      this.store.delete(key);
      return;
    }
    return e.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number) {
    this.store.set(key, { value, expires: Date.now() + (ttlMs ?? this.defaultTtlMs) });
  }
}
