// src/hooks/stocks/useMarketBreadth.ts
// TanStack Query hook for Market Pulse breadth/sentiment/macro data
// from GET /api/market-data/breadth.
// Fields may be null when the backend table is freshly populated —
// all consumers must handle null gracefully.

import { useQuery } from '@tanstack/react-query';
import { getJsonSmart } from '@/lib/http';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BreadthHistoryPoint {
  date: string;
  pctAbove50: number;
  pctAbove200: number;
  advancers: number;
  decliners: number;
  newHighs: number;
  newLows: number;
  adCumulative: number;
}

export interface MarketBreadthPayload {
  asOf: string | null;
  scannedAt: string;
  universe: { label: string; count: number };
  breadth: {
    pctAbove: { ma20: number; ma50: number; ma200: number };
    advancers: number;
    decliners: number;
    unchanged: number;
    newHighs: number;
    newLows: number;
    history: BreadthHistoryPoint[];
  } | null;
  sentiment: {
    vix: number;
    vix3m: number;
    vixTermRatio: number;
    putCall: number | null;
    creditSpreadHY: number | null;
    fearGreed: { score: number; label: string };
  } | null;
  concentration: {
    rspSpy: Array<{ date: string; value: number }>;
    growthValue: number | null;
    cyclicalDefensive: number | null;
  } | null;
  macro: {
    tenY: number;
    twoY: number;
    twos10s: number;
    dxy: number;
    crude: number;
    gold: number;
    vix: number;
  } | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const STALE_5MIN = 5 * 60 * 1000;

export function useMarketBreadth() {
  return useQuery<MarketBreadthPayload, Error>({
    queryKey: ['market-pulse', 'breadth'],
    queryFn: async () => {
      const json = await getJsonSmart('/api/market-data/breadth');
      // The backend wraps the payload in { data: ... } by convention — fall
      // back to the raw response if the wrapper is absent (e.g. during
      // early-prototype runs that return the object directly).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw JSON response, shape varies
      const raw = json as any;
      return (raw?.data ?? raw) as MarketBreadthPayload;
    },
    staleTime: STALE_5MIN,
  });
}
