// =====================================================
// 🎯 FLOW SCANNER - Types
// =====================================================

export interface FlowItem {
  id: string;
  ticker: string;
  company: string;
  type: 'unusual_volume' | 'institutional' | 'insider' | 'dark_pool' | 'accumulation';
  direction: 'bullish' | 'bearish' | 'neutral';
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  price: number;
  change: number;
  changePercent: number;
  value: string;
  time: string;
  signal: string;
}

export interface SectorFlow {
  sector: string;
  inflow: number;
  outflow: number;
  net: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface QuickStat {
  label: string;
  value: string;
  sublabel: string;
  color: string;
}

export interface FlowStats {
  unusualVolume: number;
  institutional: number;
  insiderTrades: number;
  netFlow: string;
}

export type FlowTypeFilter = 'all' | 'unusual_volume' | 'institutional' | 'insider' | 'dark_pool' | 'accumulation';
export type DirectionFilter = 'all' | 'bullish' | 'bearish' | 'neutral';
export type TabType = 'all-flow' | 'unusual-volume' | 'institutional' | 'insider' | 'dark-pool' | 'sector-flow';

export interface FlowFilters {
  search: string;
  type: FlowTypeFilter;
  direction: DirectionFilter;
}

// =====================================================
// Cache Types
// =====================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // ms
}

export interface FlowCache {
  flowData: CacheEntry<FlowItem[]> | null;
  sectorData: CacheEntry<SectorFlow[]> | null;
  statsData: CacheEntry<FlowStats> | null;
}
