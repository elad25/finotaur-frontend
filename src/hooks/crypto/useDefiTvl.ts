// src/hooks/crypto/useDefiTvl.ts
// TanStack Query hooks for DeFi TVL data (DeFiLlama via /api/crypto/defi-tvl).

import { useQuery } from '@tanstack/react-query';
import { QUERY_TTL } from '@/lib/queryClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DefiChain {
  name: string;
  tvl: number;
  tokenSymbol: string | null;
  cmcId: string | null;
  gecko_id: string | null;
}

export interface DefiProtocol {
  name: string;
  slug: string;
  tvl: number;
  chain: string;
  category: string;
  change_1d: number | null;
  change_7d: number | null;
  logo: string | null;
}

export interface DefiYieldPool {
  pool: string;
  project: string;
  chain: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
}

export interface DefiSummary {
  chains: DefiChain[];
  topProtocols: DefiProtocol[];
  yields: DefiYieldPool[];
  totalTvl: number;
  dominantChain: { name: string; tvl: number } | null;
  ts: number;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchDefiSummary(): Promise<DefiSummary> {
  const res = await fetch('/api/crypto/defi-tvl/summary');
  if (!res.ok) throw new Error(`defi summary fetch failed: ${res.status}`);
  return res.json();
}

async function fetchDefiProtocols(limit: number): Promise<DefiProtocol[]> {
  const res = await fetch(`/api/crypto/defi-tvl/protocols?limit=${limit}`);
  if (!res.ok) throw new Error(`defi protocols fetch failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

async function fetchDefiYields(limit: number): Promise<DefiYieldPool[]> {
  const res = await fetch(`/api/crypto/defi-tvl/yields?limit=${limit}`);
  if (!res.ok) throw new Error(`defi yields fetch failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDefiSummary() {
  return useQuery<DefiSummary, Error>({
    queryKey: ['defi-tvl', 'summary'],
    queryFn: fetchDefiSummary,
    ...QUERY_TTL.defiTVL,
  });
}

export function useDefiProtocols(limit = 50) {
  return useQuery<DefiProtocol[], Error>({
    queryKey: ['defi-tvl', 'protocols', limit],
    queryFn: () => fetchDefiProtocols(limit),
    ...QUERY_TTL.defiTVL,
  });
}

export function useDefiYields(limit = 50) {
  return useQuery<DefiYieldPool[], Error>({
    queryKey: ['defi-tvl', 'yields', limit],
    queryFn: () => fetchDefiYields(limit),
    ...QUERY_TTL.defiTVL,
  });
}
