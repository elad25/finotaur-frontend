export type CacheEntry<T> = { ts: number; val: T };
export default class MemCache<T=any> {
  private store = new Map<string, CacheEntry<T>>();
  constructor(private ttlMs:number = 5*60*1000){}
  get(key:string): T | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (Date.now() - e.ts > this.ttlMs) { this.store.delete(key); return null; }
    return e.val;
  }
  set(key:string, val:T){ this.store.set(key, { ts: Date.now(), val }); }
}
