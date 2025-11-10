export class MemoryCache {
  private store = new Map<string, { expiry: number; value: any }>();
  constructor(private ttlMs: number) {}
  get<T>(key: string): T | null {
    const v = this.store.get(key);
    if (!v) return null;
    if (Date.now() > v.expiry) { this.store.delete(key); return null; }
    return v.value as T;
  }
  set<T>(key: string, value: T) {
    this.store.set(key, { expiry: Date.now() + this.ttlMs, value });
  }
  key(parts: any[]) { return parts.join('|'); }
}