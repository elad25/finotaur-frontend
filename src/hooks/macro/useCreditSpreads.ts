// src/hooks/macro/useCreditSpreads.ts
// TanStack Query hooks for Credit Spreads data (FRED via /api/macro/credit-spreads).

import { useQuery } from '@tanstack/react-query';
import { QUERY_TTL } from '@/lib/queryClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreditRegime = 'risk-on' | 'neutral' | 'stress' | 'crisis';

export interface CreditSpreadsPoint {
  date: string;
  hy: number;
  ig: number;
  em: number;
  regime: CreditRegime;
}

export interface CreditSpreadsSnapshot {
  hy: number;
  ig: number;
  em: number;
  regime: CreditRegime;
  ts: string;
}

export interface CreditSpreadsSeriesResponse {
  data: CreditSpreadsPoint[];
  ts: number;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchCreditSpreadsSnapshot(): Promise<CreditSpreadsSnapshot> {
  const res = await fetch('/api/macro/credit-spreads/snapshot');
  if (!res.ok) throw new Error(`credit spreads snapshot fetch failed: ${res.status}`);
  return res.json();
}

async function fetchCreditSpreadsSeries(days: number): Promise<CreditSpreadsSeriesResponse> {
  const res = await fetch(`/api/macro/credit-spreads/series?days=${days}`);
  if (!res.ok) throw new Error(`credit spreads series fetch failed: ${res.status}`);
  return res.json();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useCreditSpreadsSnapshot() {
  return useQuery<CreditSpreadsSnapshot, Error>({
    queryKey: ['macro', 'credit-spreads', 'snapshot'],
    queryFn: fetchCreditSpreadsSnapshot,
    ...QUERY_TTL.fredDaily,
  });
}

export function useCreditSpreadsSeries(days = 365) {
  return useQuery<CreditSpreadsSeriesResponse, Error>({
    queryKey: ['macro', 'credit-spreads', 'series', days],
    queryFn: () => fetchCreditSpreadsSeries(days),
    ...QUERY_TTL.fredDaily,
  });
}
