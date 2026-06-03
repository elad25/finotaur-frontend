// ============================================================
// src/pages/app/stocks/_screener/hooks.ts
// Hooks: useScreenerMeta + useStockScreener
// Mirrors crypto hooks pattern with in-module SWR-style cache
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/apiBase';
import type { Filters, ScreenerMeta, ScreenerResponse, SortState } from './types';

// ── Module-level cache (shared across hook instances) ─────────
interface CacheEntry<T> { data: T; ts: number; }
const metaCache = { entry: null as CacheEntry<ScreenerMeta> | null };
const META_TTL = 5 * 60_000; // 5 minutes

// ── Serialise filters + sort into a stable query string ───────
export function buildQueryString(
  filters: Filters,
  sort: SortState,
  page: number,
  limit: number,
): string {
  const p = new URLSearchParams();

  p.set('page', String(page));
  p.set('limit', String(limit));
  p.set('sort', sort.sort);
  p.set('dir', sort.dir);

  if (filters.sector.length)   p.set('sector',   filters.sector.join(','));
  if (filters.exchange.length) p.set('exchange', filters.exchange.join(','));

  // numeric pairs
  const numPairs: Array<[keyof Filters, string]> = [
    ['mktcapMin', 'mktcapMin'], ['mktcapMax', 'mktcapMax'],
    ['priceMin', 'priceMin'],   ['priceMax', 'priceMax'],
    ['peMin', 'peMin'],         ['peMax', 'peMax'],
    ['psMin', 'psMin'],         ['psMax', 'psMax'],
    ['pbMin', 'pbMin'],         ['pbMax', 'pbMax'],
    ['pegMin', 'pegMin'],       ['pegMax', 'pegMax'],
    ['divYieldMin', 'divYieldMin'], ['divYieldMax', 'divYieldMax'],
    ['grossMarginMin', 'grossMarginMin'], ['grossMarginMax', 'grossMarginMax'],
    ['opMarginMin', 'opMarginMin'], ['opMarginMax', 'opMarginMax'],
    ['netMarginMin', 'netMarginMin'], ['netMarginMax', 'netMarginMax'],
    ['roeMin', 'roeMin'], ['roeMax', 'roeMax'],
    ['roaMin', 'roaMin'], ['roaMax', 'roaMax'],
    ['revGrowthMin', 'revGrowthMin'], ['revGrowthMax', 'revGrowthMax'],
    ['epsGrowthMin', 'epsGrowthMin'], ['epsGrowthMax', 'epsGrowthMax'],
    ['deMin', 'deMin'], ['deMax', 'deMax'],
    ['currentRatioMin', 'currentRatioMin'], ['currentRatioMax', 'currentRatioMax'],
    ['chg1dMin', 'chg1dMin'], ['chg1dMax', 'chg1dMax'],
    ['perf1wMin', 'perf1wMin'], ['perf1wMax', 'perf1wMax'],
    ['perf1mMin', 'perf1mMin'], ['perf1mMax', 'perf1mMax'],
    ['perf3mMin', 'perf3mMin'], ['perf3mMax', 'perf3mMax'],
    ['perf6mMin', 'perf6mMin'], ['perf6mMax', 'perf6mMax'],
    ['perf1yMin', 'perf1yMin'], ['perf1yMax', 'perf1yMax'],
    ['rsiMin', 'rsiMin'], ['rsiMax', 'rsiMax'],
    ['betaMin', 'betaMin'], ['betaMax', 'betaMax'],
    ['relVolMin', 'relVolMin'], ['relVolMax', 'relVolMax'],
    ['from52wHighMin', 'from52wHighMin'], ['from52wHighMax', 'from52wHighMax'],
    ['from52wLowMin', 'from52wLowMin'], ['from52wLowMax', 'from52wLowMax'],
    ['volMin', 'volMin'], ['volMax', 'volMax'],
  ];

  for (const [filterKey, paramKey] of numPairs) {
    const val = filters[filterKey] as string;
    if (val !== '') p.set(paramKey, val);
  }

  if (filters.smaPos20 !== 'any')  p.set('smaPos20', filters.smaPos20);
  if (filters.smaPos50 !== 'any')  p.set('smaPos50', filters.smaPos50);
  if (filters.smaPos200 !== 'any') p.set('smaPos200', filters.smaPos200);

  return p.toString();
}

// ── useScreenerMeta ───────────────────────────────────────────
export function useScreenerMeta() {
  const [data, setData] = useState<ScreenerMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      // SWR-style: return cached if fresh
      if (metaCache.entry && Date.now() - metaCache.entry.ts < META_TTL) {
        setData(metaCache.entry.data);
        setLoading(false);
        return;
      }

      try {
        const url = api('/api/stocks/screener/meta');
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d: ScreenerMeta = await r.json();
        metaCache.entry = { data: d, ts: Date.now() };
        if (alive) { setData(d); setLoading(false); }
      } catch {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  return { data, loading };
}

// ── useStockScreener ──────────────────────────────────────────
export function useStockScreener(
  filters: Filters,
  sort: SortState,
  page: number,
  limit: number,
) {
  const [data, setData] = useState<ScreenerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialise args to detect real changes
  const qs = buildQueryString(filters, sort, page, limit);
  const prevQs = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Debounce 350ms for filter typing; skip debounce if only page/sort changed
    const isSortOrPage = (() => {
      const prev = new URLSearchParams(prevQs.current);
      const next = new URLSearchParams(qs);
      // Compare only sort/dir/page — if only those differ, skip debounce
      const changedKeys = [...next.keys()].filter(k => next.get(k) !== prev.get(k));
      return changedKeys.every(k => ['sort', 'dir', 'page'].includes(k));
    })();

    const delay = isSortOrPage ? 0 : 350;

    timerRef.current = setTimeout(async () => {
      prevQs.current = qs;
      setLoading(true);
      setError(null);

      try {
        const url = api(`/api/stocks/screener?${qs}`);
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d: ScreenerResponse = await r.json();
        if (aliveRef.current) { setData(d); setLoading(false); }
      } catch (err) {
        if (aliveRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load');
          setLoading(false);
        }
      }
    }, delay);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [qs]);

  return { data, loading, error };
}
