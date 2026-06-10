// src/services/etf-analyzer.api.ts
// =====================================================
// ETF ANALYZER — API Service
// =====================================================
// Mirrors the base-URL mechanism from stock-analyzer.api.ts:
//   import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app'
// =====================================================

import type { EtfData, EtfVerdict, EtfListItem, EtfNewsItem, OhlcBar } from '@/types/etf.types';

const SERVER_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

// ─── Simple in-memory cache (ticker → { data, fetchedAt }) ──────────────────
const ETF_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
// Verdict is cached much longer — server already caches 24h; client matches that.
const ETF_VERDICT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const etfDataCache    = new Map<string, CacheEntry<EtfData>>();
const etfBarsCache    = new Map<string, CacheEntry<OhlcBar[]>>();
const etfVerdictCache = new Map<string, CacheEntry<EtfVerdict>>();
const etfListCache    = new Map<string, CacheEntry<{ etfs: EtfListItem[]; total: number; nextCursor: number | null }>>();
const etfNewsCache    = new Map<string, CacheEntry<EtfNewsItem[]>>();

// ─── Typed fetch helper ───────────────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ETF API error ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── fetchETFData ─────────────────────────────────────────────────────────────

export async function fetchETFData(ticker: string): Promise<EtfData> {
  const symbol = ticker.toUpperCase().trim();
  if (!symbol) throw new Error('Ticker must not be empty');

  const cached = etfDataCache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < ETF_CACHE_TTL_MS) {
    return cached.data;
  }

  const data = await apiFetch<EtfData>(`${SERVER_BASE}/api/etf/${symbol}`);
  etfDataCache.set(symbol, { data, fetchedAt: Date.now() });
  return data;
}

// ─── fetchETFVerdict ──────────────────────────────────────────────────────────
// Lazy-fetch: callers are responsible for only calling this when the user has
// opened the Verdict tab. Throws with err.code === 'unavailable' on HTTP 503
// so VerdictTab can render the "AI unavailable" state distinctly.

export class EtfVerdictUnavailableError extends Error {
  readonly code = 'unavailable' as const;
  constructor() {
    super('AI verdict is currently unavailable.');
    this.name = 'EtfVerdictUnavailableError';
  }
}

export async function fetchETFVerdict(ticker: string): Promise<EtfVerdict> {
  const symbol = ticker.toUpperCase().trim();
  if (!symbol) throw new Error('Ticker must not be empty');

  const cached = etfVerdictCache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < ETF_VERDICT_CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(`${SERVER_BASE}/api/etf/${symbol}/verdict`, {
    headers: { Accept: 'application/json' },
  });

  if (res.status === 503) {
    throw new EtfVerdictUnavailableError();
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ETF verdict API error ${res.status}: ${body || res.statusText}`);
  }

  const data = (await res.json()) as EtfVerdict;
  etfVerdictCache.set(symbol, { data, fetchedAt: Date.now() });
  return data;
}

// ─── fetchETFList ─────────────────────────────────────────────────────────────

export interface EtfListParams {
  search?: string;
  limit?: number;
  cursor?: number;
}

export async function fetchETFList(
  params?: EtfListParams,
): Promise<{ etfs: EtfListItem[]; total: number; nextCursor: number | null }> {
  const { search = '', limit = 50, cursor } = params ?? {};
  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  if (limit !== undefined) qs.set('limit', String(limit));
  if (cursor !== undefined) qs.set('cursor', String(cursor));

  const cacheKey = qs.toString();
  const cached = etfListCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < ETF_CACHE_TTL_MS) {
    return cached.data;
  }

  const data = await apiFetch<{ etfs: EtfListItem[]; total: number; nextCursor: number | null }>(
    `${SERVER_BASE}/api/etf/list?${qs.toString()}`,
  );
  etfListCache.set(cacheKey, { data, fetchedAt: Date.now() });
  return data;
}

// ─── fetchETFNews ─────────────────────────────────────────────────────────────

export async function fetchETFNews(limit = 20): Promise<EtfNewsItem[]> {
  const cacheKey = `news:${limit}`;
  const cached = etfNewsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < ETF_CACHE_TTL_MS) {
    return cached.data;
  }

  const payload = await apiFetch<{ news: EtfNewsItem[] }>(
    `${SERVER_BASE}/api/etf/news?limit=${limit}`,
  );
  const news = payload.news ?? [];
  etfNewsCache.set(cacheKey, { data: news, fetchedAt: Date.now() });
  return news;
}

// ─── fetchETFBars ─────────────────────────────────────────────────────────────

export type EtfBarsRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';

export async function fetchETFBars(
  ticker: string,
  range: EtfBarsRange = '1Y',
): Promise<OhlcBar[]> {
  const symbol = ticker.toUpperCase().trim();
  const cacheKey = `${symbol}:${range}`;

  const cached = etfBarsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < ETF_CACHE_TTL_MS) {
    return cached.data;
  }

  const payload = await apiFetch<{ ticker: string; range: string; bars: OhlcBar[] }>(
    `${SERVER_BASE}/api/etf/${symbol}/bars?range=${range}`,
  );
  const bars = payload.bars ?? [];
  etfBarsCache.set(cacheKey, { data: bars, fetchedAt: Date.now() });
  return bars;
}

// ─── fetchCompareBars ─────────────────────────────────────────────────────────
// Ungated, Yahoo-sourced endpoint. Uses the same etfBarsCache with a distinct
// key prefix ("cmp:") so entries never collide with fetchETFBars entries.

export async function fetchCompareBars(
  ticker: string,
  range: EtfBarsRange = '1Y',
): Promise<OhlcBar[]> {
  const symbol = ticker.toUpperCase().trim();
  const cacheKey = `cmp:${symbol}:${range}`;

  const cached = etfBarsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < ETF_CACHE_TTL_MS) {
    return cached.data;
  }

  const payload = await apiFetch<{ symbol: string; range: string; bars: OhlcBar[] }>(
    `${SERVER_BASE}/api/etf/compare/bars?symbol=${symbol}&range=${range}`,
  );
  const bars = payload.bars ?? [];
  etfBarsCache.set(cacheKey, { data: bars, fetchedAt: Date.now() });
  return bars;
}
