// =====================================================
// ⚛️ SECTOR DATA HOOKS
// finotaur-frontend/src/hooks/useSectorData.ts
// =====================================================
// React Query hooks for fetching sector data
// ZERO per-user API calls to external services
// All data comes from pre-computed server cache
// =====================================================

import { useQuery } from '@tanstack/react-query';

// =====================================================
// TYPES (inline to avoid import path issues)
// These match the Sector interface from SectorAnalyzer
// =====================================================

type SentimentType = 'bullish' | 'bearish' | 'neutral';
type SignalType = 'BUY' | 'HOLD' | 'WATCH' | 'AVOID';
type RiskLevel = 'High' | 'Medium' | 'Low';

interface SectorHolding {
  ticker: string;
  name: string;
  weight: number;
  change: number;
  score: number;
  volumeVsAvg?: number;
  peVsSector?: number;
  insiderActivity?: 'buy' | 'sell' | 'none';
}

interface SectorETF {
  ticker: string;
  name: string;
  aum: string;
}

interface SectorVerdict {
  rating: number;
  signal: 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';
  summary: string;
}

interface Sector {
  id: string;
  name: string;
  ticker: string;
  icon: string;
  price: number;
  changePercent: number;
  weekChange: number;
  monthChange: number;
  ytdChange: number;
  momentum: number;
  relativeStrength: number;
  sentiment: SentimentType;
  beta: number;
  marketCap: string;
  spWeight: number;
  companies: number;
  description: string;
  etfs: SectorETF[];
  topHoldings: SectorHolding[];
  correlations: any[];
  macroSensitivity: any[];
  industryTrends: any[];
  risks: any[];
  breakoutCandidate: any;
  tradeIdeas: any[];
  verdict?: SectorVerdict;
  vsMarket?: any[];
  fundamentals?: any;
  moneyFlow?: any;
  subSectors?: any[];
  // Extra fields from server
  aiCommentary?: any;
  lastUpdated?: string;
  refreshType?: string;
}

interface SectorHoldingLive {
  id: string;
  sector_id: string;
  ticker: string;
  company_name: string;
  price: number;
  change_percent: number;
  volume: number;
  avg_volume: number;
  volume_vs_avg: number;
  sector_weight: number;
  finotaur_score: number;
  pe_ratio: number | null;
  signal: string;
  insider_activity: string;
  updated_at: string;
}

interface RefreshStatus {
  success: boolean;
  lastRefresh: {
    session_id: string;
    refresh_type: string;
    status: string;
    sectors_updated: number;
    holdings_updated: number;
    total_duration_ms: number;
    started_at: string;
    completed_at: string;
  } | null;
  nextRefresh: string;
  serverCacheAge: string;
  cachedSectorCount: number;
}

// =====================================================
// API BASE URL
// =====================================================

const API_BASE = (
  typeof window !== 'undefined' && (window as any).__FINOTAUR_API_URL
) || process.env.NEXT_PUBLIC_API_URL
  || process.env.REACT_APP_API_URL
  || '';

// =====================================================
// 📊 useSectors - Load ALL sectors (main hook)
// =====================================================

/**
 * Fetches all 11 sectors from the cached server endpoint.
 * - staleTime: 5 min (won't refetch within this window)
 * - refetchInterval: 5 min (background refresh)
 * - gcTime: 30 min (keeps data in memory)
 * 
 * Usage:
 *   const { data: sectors, isLoading, error } = useSectors();
 */
export function useSectors() {
  return useQuery<Sector[]>({
    queryKey: ['sectors', 'all'],
    queryFn: async (): Promise<Sector[]> => {
      const res = await fetch(`${API_BASE}/api/sectors/all`);
      if (!res.ok) {
        throw new Error(`Failed to fetch sectors: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to load sector data');
      }
      return json.data as Sector[];
    },
    staleTime: 5 * 60 * 1000,        // 5 min
    gcTime: 30 * 60 * 1000,          // 30 min
    refetchOnWindowFocus: false,       // Don't spam on tab switch
    refetchInterval: 5 * 60 * 1000,   // Background refetch every 5 min
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

// =====================================================
// 🏢 useSectorHoldings - Load holdings for one sector
// =====================================================

/**
 * Fetches detailed holdings for a specific sector (used by HeatMap tab).
 * Only enabled when sectorId is provided.
 * 
 * Usage:
 *   const { data: holdings } = useSectorHoldings('technology');
 */
export function useSectorHoldings(sectorId: string | null | undefined) {
  return useQuery<SectorHoldingLive[]>({
    queryKey: ['sector-holdings', sectorId],
    queryFn: async (): Promise<SectorHoldingLive[]> => {
      const res = await fetch(`${API_BASE}/api/sectors/${sectorId}/holdings`);
      if (!res.ok) {
        throw new Error(`Failed to fetch holdings: ${res.status}`);
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to load holdings');
      }
      return json.data as SectorHoldingLive[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!sectorId,
    retry: 1,
  });
}

// =====================================================
// 📡 useRefreshStatus - Monitor refresh health
// =====================================================

/**
 * Optional hook for admin/debug: check last refresh time.
 * 
 * Usage:
 *   const { data: status } = useRefreshStatus();
 */
export function useRefreshStatus() {
  return useQuery<RefreshStatus>({
    queryKey: ['sector-refresh-status'],
    queryFn: async (): Promise<RefreshStatus> => {
      const res = await fetch(`${API_BASE}/api/sectors/meta/refresh-status`);
      if (!res.ok) throw new Error('Failed to fetch refresh status');
      return res.json();
    },
    staleTime: 60 * 1000,        // 1 min
    refetchInterval: 60 * 1000,   // Check every minute
  });
}

// =====================================================
// 🔄 useSectorById - Get single sector from cached list
// =====================================================

/**
 * Extracts a single sector from the already-fetched sectors list.
 * Does NOT make a separate API call.
 * 
 * Usage:
 *   const { sector, isLoading } = useSectorById('technology');
 */
export function useSectorById(sectorId: string | null | undefined) {
  const { data: sectors, isLoading, error } = useSectors();

  const sector = sectors?.find(s => s.id === sectorId) || null;

  return { sector, isLoading, error, allSectors: sectors };
}

// =====================================================
// Export types for consumers
// =====================================================

export type {
  Sector,
  SectorHolding,
  SectorHoldingLive,
  SectorETF,
  SectorVerdict,
  RefreshStatus,
  SentimentType,
  SignalType,
  RiskLevel,
};