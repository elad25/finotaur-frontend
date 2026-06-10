// ============================================================
// src/pages/app/forex/_shared/api.ts
// Centralized forex API with request dedup + SWR-style cache
// Mirrors crypto/_shared/api.ts — same pattern, forex endpoints
// ============================================================

import { api } from '@/lib/apiBase';

interface CacheEntry { data: any; ts: number; }
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<any>>();

const TTLS: Record<string, number> = {
  heatmap: 30_000,
  strength: 30_000,
  movers: 30_000,
  'dxy/series': 300_000,    // 5 min — DXY series is low-churn
  intraday: 60_000,
  commentary: 3_600_000,    // 1 hour
};

function getTTL(path: string): number {
  for (const [k, v] of Object.entries(TTLS)) { if (path.includes(k)) return v; }
  return 60_000;
}

export async function forexFetch<T = any>(path: string): Promise<T> {
  const url = api(path);
  const ttl = getTTL(path);

  // SWR cache
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < ttl) return cached.data as T;

  // Dedup inflight
  if (inflight.has(url)) return inflight.get(url) as Promise<T>;

  const promise = fetch(url)
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(data => { cache.set(url, { data, ts: Date.now() }); inflight.delete(url); return data as T; })
    .catch(err => { inflight.delete(url); throw err; });

  inflight.set(url, promise);
  return promise;
}
