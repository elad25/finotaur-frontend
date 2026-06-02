// src/hooks/stocks/useSectors.ts
// TanStack Query hook for sector ETF snapshots (via /api/sectors — cached proxy).

import { useQuery } from '@tanstack/react-query';
import { QUERY_TTL } from '@/lib/queryClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SectorItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  previousClose: number;
  timestamp: string;
  session: string;
  dataSource: string;
}

export interface SectorsResponse {
  timestamp: string;
  sectors: SectorItem[];
}

// ─── Fetcher ─────────────────────────────────────────────────────────────────

async function fetchSectors(): Promise<SectorsResponse> {
  const res = await fetch('/api/sectors');
  if (!res.ok) throw new Error(`sectors fetch failed: ${res.status}`);
  return res.json();
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSectors() {
  return useQuery<SectorsResponse, Error>({
    queryKey: ['stocks', 'sectors'],
    queryFn: fetchSectors,
    // Sector ETF snapshots refresh on the same cadence as overview data
    ...QUERY_TTL.overview,
  });
}
