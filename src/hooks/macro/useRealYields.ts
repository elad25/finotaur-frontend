// src/hooks/macro/useRealYields.ts
// TanStack Query hooks for Real Yields & TIPS data (FRED via /api/macro/real-yields).

import { useQuery } from '@tanstack/react-query';
import { QUERY_TTL } from '@/lib/queryClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RealYieldsPoint {
  date: string;
  tips5: number;
  tips10: number;
  tips30: number;
  breakeven5: number;
  breakeven10: number;
  breakeven30: number;
  gold: number | null;
}

export interface RealYieldsSnapshot {
  tips5: number;
  tips10: number;
  tips30: number;
  breakeven5: number;
  breakeven10: number;
  breakeven30: number;
  gold: number | null;
  ts: string;
}

export interface RealYieldsSeriesResponse {
  data: RealYieldsPoint[];
  ts: number;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchRealYieldsSnapshot(): Promise<RealYieldsSnapshot> {
  const res = await fetch('/api/macro/real-yields/snapshot');
  if (!res.ok) throw new Error(`real yields snapshot fetch failed: ${res.status}`);
  return res.json();
}

async function fetchRealYieldsSeries(days: number): Promise<RealYieldsSeriesResponse> {
  const res = await fetch(`/api/macro/real-yields/series?days=${days}`);
  if (!res.ok) throw new Error(`real yields series fetch failed: ${res.status}`);
  return res.json();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useRealYieldsSnapshot() {
  return useQuery<RealYieldsSnapshot, Error>({
    queryKey: ['macro', 'real-yields', 'snapshot'],
    queryFn: fetchRealYieldsSnapshot,
    ...QUERY_TTL.fredHourly,
  });
}

export function useRealYieldsSeries(days = 365) {
  return useQuery<RealYieldsSeriesResponse, Error>({
    queryKey: ['macro', 'real-yields', 'series', days],
    queryFn: () => fetchRealYieldsSeries(days),
    ...QUERY_TTL.fredHourly,
  });
}
