// ============================================================
// src/pages/app/crypto/_shared/api.ts
// Centralized crypto API with request dedup + SWR-style cache
// Optimized for 10K+ concurrent users — zero duplicate calls
// ============================================================

import { api } from '@/lib/apiBase';

interface CacheEntry { data: any; ts: number; }
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<any>>();

const TTLS: Record<string, number> = {
  global: 60_000, coins: 60_000, trending: 300_000, 'fear-greed': 600_000,
  categories: 300_000, exchanges: 600_000, klines: 30_000, funding: 60_000,
  coin: 120_000, news: 120_000, reports: 300_000,
};

function getTTL(url: string): number {
  for (const [k, v] of Object.entries(TTLS)) { if (url.includes(k)) return v; }
  return 60_000;
}

export async function cryptoFetch<T = any>(path: string): Promise<T> {
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

// Pre-built fetchers
export const fetchGlobal = () => cryptoFetch('/api/crypto/dominance');
export const fetchCoins = (page = 1, perPage = 50, sparkline = false) =>
  cryptoFetch(`/api/crypto/overview?per_page=${perPage}&page=${page}&sparkline=${sparkline}`).then(d => d?.items || d || []);
export const fetchTrending = () => cryptoFetch('/api/crypto/trending').then(d => d?.items || d?.coins || []);
export const fetchFearGreed = () => cryptoFetch('/api/crypto/fear-greed').then(d => d?.data?.[0] || d || {});
export const fetchCoinDetail = (id: string) => cryptoFetch(`/api/crypto/coin/${id}`);
export const fetchCategories = () => cryptoFetch('/api/crypto/categories');
export const fetchExchanges = () => cryptoFetch('/api/crypto/exchanges');
export const fetchKlines = (symbol: string, interval: string, limit = 200) =>
  cryptoFetch(`/api/crypto/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
export const fetchFunding = () => cryptoFetch('/api/crypto/funding-rates');
export const fetchNews = (limit = 30) => cryptoFetch(`/api/crypto/news?limit=${limit}`);
export const fetchReports = () => cryptoFetch('/api/crypto/reports');
