// src/services/benchmarks.api.ts
// =====================================================
// BENCHMARKS — API Service
// =====================================================
// Fetches normalised daily benchmark series (S&P 500 / NASDAQ) for a given
// time range so COPILOT can render a Portfolio-vs-benchmark comparison chart.
//
// Mirrors the pattern from etf-analyzer.api.ts:
//  - SERVER_BASE from VITE_API_URL or the Railway production URL
//  - 5-minute in-memory cache keyed by range
//  - Never throws to the UI; returns empty arrays on any error
// =====================================================

import type { TimeRange } from '@/pages/app/ai/copilot/hooks/usePortfolioData';

const SERVER_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

const BENCHMARKS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface BenchPoint {
  date: string;
  value: number;
}

export interface BenchmarksResponse {
  range: string;
  sp500: BenchPoint[];
  nasdaq: BenchPoint[];
}

interface CacheEntry {
  data: BenchmarksResponse;
  fetchedAt: number;
}

const benchmarksCache = new Map<string, CacheEntry>();

export async function fetchBenchmarks(range: TimeRange): Promise<BenchmarksResponse> {
  const cacheKey = range;
  const cached = benchmarksCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < BENCHMARKS_CACHE_TTL_MS) {
    return cached.data;
  }

  const empty: BenchmarksResponse = { range, sp500: [], nasdaq: [] };

  try {
    const url = `${SERVER_BASE}/api/benchmarks?range=${range}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      return empty;
    }
    const data = (await res.json()) as BenchmarksResponse;
    benchmarksCache.set(cacheKey, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    return empty;
  }
}
