// src/hooks/macro/useLiquidity.ts
// TanStack Query hooks for Howell Net Liquidity data (FRED via /api/macro/liquidity).

import { useQuery } from '@tanstack/react-query';
import { QUERY_TTL } from '@/lib/queryClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LiquidityPoint {
  date: string;
  walcl: number;
  wtregen: number;
  rrpontsyd: number;
  netLiquidity: number;
}

export interface SpxPoint {
  date: string;
  value: number;
}

export interface LiquiditySnapshot {
  latest: LiquidityPoint;
  oneMonthAgo: LiquidityPoint;
  oneYearAgo: LiquidityPoint;
  deltaMoMPct: number;
  deltaYoYPct: number;
  spxOverlay?: SpxPoint[];
  ts: number;
}

export interface LiquiditySeriesResponse {
  data: LiquidityPoint[];
  ts: number;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchLiquiditySnapshot(): Promise<LiquiditySnapshot> {
  const res = await fetch('/api/macro/liquidity/snapshot');
  if (!res.ok) throw new Error(`liquidity snapshot fetch failed: ${res.status}`);
  return res.json();
}

async function fetchLiquiditySeries(days: number): Promise<LiquiditySeriesResponse> {
  const res = await fetch(`/api/macro/liquidity/series?days=${days}`);
  if (!res.ok) throw new Error(`liquidity series fetch failed: ${res.status}`);
  return res.json();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLiquiditySnapshot() {
  return useQuery<LiquiditySnapshot, Error>({
    queryKey: ['macro', 'liquidity', 'snapshot'],
    queryFn: fetchLiquiditySnapshot,
    ...QUERY_TTL.fredDaily,
  });
}

export function useLiquiditySeries(days = 365) {
  return useQuery<LiquiditySeriesResponse, Error>({
    queryKey: ['macro', 'liquidity', 'series', days],
    queryFn: () => fetchLiquiditySeries(days),
    ...QUERY_TTL.fredDaily,
  });
}
