// =====================================================
// ⚡ FLOW SCANNER - Client-Side Cache Manager
// Optimized for 10,000 concurrent users
// Strategy: stale-while-revalidate + request deduplication
// =====================================================

import { CacheEntry, FlowItem, SectorFlow, FlowStats } from './types';
import { CACHE_TTL } from './constants';

// =====================================================
// Generic Cache Store
// =====================================================

class CacheStore<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private inFlight = new Map<string, Promise<T>>();

  get(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const isStale = age > entry.ttl;
    const isExpired = age > entry.ttl + CACHE_TTL.STALE_WHILE_REVALIDATE;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return { data: entry.data, isStale };
  }

  set(key: string, data: T, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  // Deduplicate concurrent requests - critical for 10k users
  async dedupe(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)!;
    }
    const promise = fetcher().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }
}

// Singleton stores — shared across all component instances on the same client
export const flowCache    = new CacheStore<FlowItem[]>();
export const sectorCache  = new CacheStore<SectorFlow[]>();
export const statsCache   = new CacheStore<FlowStats>();

// =====================================================
// Cache Keys
// =====================================================

export const CACHE_KEYS = {
  FLOW_DATA:   'flow:data',
  SECTOR_DATA: 'flow:sectors',
  STATS_DATA:  'flow:stats',
} as const;
