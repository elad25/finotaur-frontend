// src/hooks/crypto/useStablecoins.ts
// TanStack Query hooks for stablecoin data (DeFiLlama via /api/crypto/stablecoins).

import { useQuery } from '@tanstack/react-query';
import { QUERY_TTL } from '@/lib/queryClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Stablecoin {
  id: string;
  name: string;
  symbol: string;
  pegType: string;
  pegMechanism: string;
  circulating: number;
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
  pegHealth: 'healthy' | 'warning' | 'depeg';
}

export interface StablecoinHistoryPoint {
  date: string;
  totalCirculating: number;
  top3: {
    usdt: number;
    usdc: number;
    dai: number;
  };
}

export interface StablecoinsListResponse {
  data: Stablecoin[];
  ts: number;
}

export interface StablecoinsHistoryResponse {
  data: StablecoinHistoryPoint[];
  ts: number;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchStablecoinsList(): Promise<StablecoinsListResponse> {
  const res = await fetch('/api/crypto/stablecoins/list');
  if (!res.ok) throw new Error(`stablecoins list fetch failed: ${res.status}`);
  return res.json();
}

async function fetchStablecoinsHistory(days: number): Promise<StablecoinsHistoryResponse> {
  const res = await fetch(`/api/crypto/stablecoins/history?days=${days}`);
  if (!res.ok) throw new Error(`stablecoins history fetch failed: ${res.status}`);
  return res.json();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useStablecoinsList() {
  return useQuery<StablecoinsListResponse, Error>({
    queryKey: ['stablecoins', 'list'],
    queryFn: fetchStablecoinsList,
    ...QUERY_TTL.stablecoins,
  });
}

export function useStablecoinsHistory(days = 365) {
  return useQuery<StablecoinsHistoryResponse, Error>({
    queryKey: ['stablecoins', 'history', days],
    queryFn: () => fetchStablecoinsHistory(days),
    ...QUERY_TTL.stablecoins,
  });
}
