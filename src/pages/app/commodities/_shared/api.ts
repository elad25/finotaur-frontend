// ============================================================
// src/pages/app/commodities/_shared/api.ts
// Commodities API — mirrors crypto api.ts structure
// ============================================================

import { api } from '@/lib/apiBase';
import type { CommoditiesSnapshot } from './types';

const cache = new Map<string, { data: any; ts: number }>();
const inflight = new Map<string, Promise<any>>();

const SNAPSHOT_TTL = 300_000; // 5 min — matches poll interval
const SERIES_TTL = 60_000;    // 1 min for historical series

function getTTL(path: string): number {
  if (path.includes('/series')) return SERIES_TTL;
  return SNAPSHOT_TTL;
}

async function commodityFetch<T = any>(path: string): Promise<T> {
  const url = api(path);
  const ttl = getTTL(path);

  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < ttl) return cached.data as T;

  if (inflight.has(url)) return inflight.get(url) as Promise<T>;

  const promise = fetch(url)
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(data => { cache.set(url, { data, ts: Date.now() }); inflight.delete(url); return data as T; })
    .catch(err => { inflight.delete(url); throw err; });

  inflight.set(url, promise);
  return promise;
}

export function fetchCommoditiesSnapshot(): Promise<CommoditiesSnapshot> {
  return commodityFetch<CommoditiesSnapshot>('/api/commodities/snapshot');
}

export function fetchCommoditySeries(symbol: string, days = 365): Promise<any> {
  return commodityFetch(`/api/commodities/series?symbol=${symbol}&days=${days}`);
}
