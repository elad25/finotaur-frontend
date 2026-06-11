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
  coin: 120_000, news: 120_000, reports: 300_000, whales: 15_000,
  walls: 8_000, wallsKlines: 3_600_000,
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

// ── Whale Trades ─────────────────────────────────────────────
export const fetchWhaleTrades = (opts: { minUsd?: number; symbol?: string; side?: string; limit?: number } = {}) => {
  const p = new URLSearchParams();
  if (opts.minUsd) p.set('minUsd', String(opts.minUsd));
  if (opts.symbol) p.set('symbol', opts.symbol);
  if (opts.side) p.set('side', opts.side);
  if (opts.limit) p.set('limit', String(opts.limit));
  return cryptoFetch(`/api/crypto/whales/trades?${p.toString()}`).then((d: any) => d?.items ?? d ?? []);
};

// ── Order Book Walls ─────────────────────────────────────────
export const fetchWalls = (opts: { limit?: number; side?: string } = {}) => {
  const p = new URLSearchParams();
  if (opts.limit) p.set('limit', String(opts.limit));
  if (opts.side) p.set('side', opts.side);
  return cryptoFetch(`/api/crypto/whales/walls?${p.toString()}`).then((d: any) => d?.items ?? []);
};

export const fetchSymbolWalls = (symbol: string) =>
  cryptoFetch(`/api/crypto/whales/walls/${symbol}`).then(
    (d: any) => d ?? { symbol, midPrice: null, bids: [], asks: [] }
  );

export const fetchWallsKlines = (symbol: string, days = 90) =>
  cryptoFetch(`/api/crypto/whales/klines?symbol=${symbol}&days=${days}`).then((d: any) => d?.candles ?? []);

export const whaleStreamUrl = (opts: { symbols?: string[]; minUsd?: number } = {}) => {
  const p = new URLSearchParams();
  if (opts.symbols?.length) p.set('symbols', opts.symbols.join(','));
  if (opts.minUsd) p.set('minUsd', String(opts.minUsd));
  return api(`/api/crypto/whales/stream?${p.toString()}`);
};

// ── Wall History (server-side 72-hour collector) ──────────────
export interface WallHistoryEpisode {
  side: 'bid' | 'ask';
  price: number;
  maxNotionalUsd: number;
  firstSeenAt: string; // ISO
  lastSeenAt: string;  // ISO
  active: boolean;
}

export interface WallHistoryResponse {
  symbol: string;
  hours: number;
  episodes: WallHistoryEpisode[];
}

/**
 * Fetch server-collected wall history for a symbol.
 * Intentionally bypasses the shared SWR cache so AbortController
 * signals are honoured (fetch() is called directly with the signal).
 * Uses the api() base-path helper for consistency with other fetchers.
 */
export function fetchWallsHistory(
  symbol: string,
  hours = 72,
  signal?: AbortSignal,
): Promise<WallHistoryResponse> {
  const url = api(`/api/crypto/whales/walls-history?symbol=${encodeURIComponent(symbol)}&hours=${hours}`);
  return fetch(url, { signal })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<WallHistoryResponse>; });
}
