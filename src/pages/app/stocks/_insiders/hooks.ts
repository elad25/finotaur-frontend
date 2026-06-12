// ============================================================
// src/pages/app/stocks/_insiders/hooks.ts
// Hooks: useInstitutionalManagers, useManagerDetail, useInstitutionalConsensus
// Module-level SWR-style cache, 15-min TTL — mirrors _screener/hooks.ts pattern
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/apiBase';

const CACHE_TTL = 15 * 60_000; // 15 minutes

// ── Types ──────────────────────────────────────────────────────

export interface TopHolding {
  ticker: string;
  issuerName: string;
  pctOfPortfolio: number;
}

export interface Manager {
  cik: string;
  name: string;
  fundName: string;
  slug: string;
  portfolioValueUsd: number;
  holdingsCount: number;
  topHoldings: TopHolding[];
  newBuysCount: number;
  soldOutCount: number;
}

export interface ManagersResponse {
  quarter: string;
  managers: Manager[];
}

export type ChangeType = 'new' | 'added' | 'reduced' | 'sold_out' | 'unchanged';

export interface Holding {
  ticker: string;
  issuerName: string;
  cusip: string;
  shares: number;
  valueUsd: number;
  pctOfPortfolio: number;
  changeShares: number;
  changeType: ChangeType;
}

export interface ManagerDetailResponse {
  quarter: string;
  manager: Manager;
  holdings: Holding[];
}

export interface ConsensusTicker {
  ticker: string;
  issuerName: string;
  buyersCount?: number;
  sellersCount?: number;
  holdersCount?: number;
  totalValueUsd: number;
}

export interface ConsensusResponse {
  quarter: string;
  mostBought: ConsensusTicker[];
  mostSold: ConsensusTicker[];
  mostHeld: ConsensusTicker[];
}

// ── Module-level caches ────────────────────────────────────────
interface CacheEntry<T> { data: T; ts: number; }

const managersCache = { entry: null as CacheEntry<ManagersResponse> | null };
const consensusCache = { entry: null as CacheEntry<ConsensusResponse> | null };
const detailCache: Record<string, CacheEntry<ManagerDetailResponse>> = {};

// ── useInstitutionalManagers ──────────────────────────────────
export function useInstitutionalManagers() {
  const [data, setData] = useState<ManagersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (managersCache.entry && Date.now() - managersCache.entry.ts < CACHE_TTL) {
        setData(managersCache.entry.data);
        setLoading(false);
        return;
      }

      try {
        const r = await fetch(api('/api/institutional/managers'));
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d: ManagersResponse = await r.json();
        managersCache.entry = { data: d, ts: Date.now() };
        if (alive) { setData(d); setLoading(false); }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Failed to load');
          setLoading(false);
        }
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  return { data, loading, error };
}

// ── useManagerDetail ──────────────────────────────────────────
export function useManagerDetail(slug: string | null) {
  const [data, setData] = useState<ManagerDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slugRef = useRef<string | null>(null);

  useEffect(() => {
    if (!slug) { setData(null); setLoading(false); setError(null); return; }

    let alive = true;
    slugRef.current = slug;

    const cached = detailCache[slug];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const r = await fetch(api(`/api/institutional/managers/${slug}`));
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d: ManagerDetailResponse = await r.json();
        detailCache[slug] = { data: d, ts: Date.now() };
        if (alive && slugRef.current === slug) {
          setData(d);
          setLoading(false);
        }
      } catch (err) {
        if (alive && slugRef.current === slug) {
          setError(err instanceof Error ? err.message : 'Failed to load');
          setLoading(false);
        }
      }
    })();

    return () => { alive = false; };
  }, [slug]);

  return { data, loading, error };
}

// ── useInstitutionalConsensus ─────────────────────────────────
export function useInstitutionalConsensus() {
  const [data, setData] = useState<ConsensusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (consensusCache.entry && Date.now() - consensusCache.entry.ts < CACHE_TTL) {
        setData(consensusCache.entry.data);
        setLoading(false);
        return;
      }

      try {
        const r = await fetch(api('/api/institutional/consensus'));
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d: ConsensusResponse = await r.json();
        consensusCache.entry = { data: d, ts: Date.now() };
        if (alive) { setData(d); setLoading(false); }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Failed to load');
          setLoading(false);
        }
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  return { data, loading, error };
}
