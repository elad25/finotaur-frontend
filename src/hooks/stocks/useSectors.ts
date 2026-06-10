// src/hooks/stocks/useSectors.ts
// TanStack Query hooks for the rich sector data from /api/sectors/all + detail.

import { useQuery } from '@tanstack/react-query';
import { getJsonSmart } from '@/lib/http';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SectorEtf {
  ticker: string;
  name: string;
  aum?: number;
}

export interface SectorCorrelation {
  ticker: string;
  correlation: number;
}

export interface SectorMacroSensitivity {
  factor: string;
  sensitivity: string; // 'High' | 'Medium' | 'Low'
  impact: string;
}

export interface SectorFundamentals {
  revGrowth?: number | null;
  earningsGrowth?: number | null;
  peVsSpAvg?: number | null;
  evEbitda?: number | null;
  peForward?: number | null;
}

export interface SectorVsMarketEntry {
  period: '1D' | '1W' | '1M' | 'YTD' | '1Y';
  sectorReturn: number;
  spyReturn: number;
  alpha: number;
  series?: Array<{
    label: string;
    sectorReturn: number;
    spyReturn: number;
    alpha: number;
    date?: string;
  }>;
}

export interface Sector {
  id: string;
  name: string;
  ticker: string;
  price: number | string;
  changePercent: number;
  beta?: number | null;
  spWeight?: number | null;
  description?: string;
  etfs?: SectorEtf[];
  correlations?: SectorCorrelation[];
  macroSensitivity?: SectorMacroSensitivity[];
  fundamentals?: SectorFundamentals;
  vsMarket?: SectorVsMarketEntry[];
  lastUpdated?: string;
  // Allow unknown AI / extra fields via index signature — they are intentionally ignored
  [key: string]: unknown;
}

export interface Holding {
  ticker: string;
  price?: number | null;
  change_percent?: number | null;
  volume?: number | null;
  pe_ratio?: number | null;
  // Allow extra fields; we render only the above
  [key: string]: unknown;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

const STALE_5MIN = 5 * 60 * 1000;

export function useSectorsAll() {
  return useQuery<Sector[], Error>({
    queryKey: ['sectors', 'all'],
    queryFn: async () => {
      const json = await getJsonSmart('/api/sectors/all');
      return (json as { data: Sector[] }).data;
    },
    staleTime: STALE_5MIN,
  });
}

export function useSectorDetail(id: string | undefined) {
  return useQuery<Sector, Error>({
    queryKey: ['sectors', id],
    queryFn: async () => {
      const json = await getJsonSmart(`/api/sectors/${id}`);
      return (json as { data: Sector }).data;
    },
    enabled: !!id,
    staleTime: STALE_5MIN,
  });
}

export function useSectorHoldings(id: string | undefined) {
  return useQuery<Holding[], Error>({
    queryKey: ['sectors', id, 'holdings'],
    queryFn: async () => {
      const json = await getJsonSmart(`/api/sectors/${id}/holdings`);
      return (json as { data: Holding[] }).data;
    },
    enabled: !!id,
    staleTime: STALE_5MIN,
  });
}
