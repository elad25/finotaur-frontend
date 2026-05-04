// =====================================================
// 🎯 FLOW SCANNER — Types v2
// Tabs: All Flow | Unusual Volume | Dark Pool | Insider & Institutional | Confluence
// =====================================================

// ─────────────────────────────────────────────────────
// Core Flow Item
// ─────────────────────────────────────────────────────

export type FlowType =
  | 'unusual_volume'
  | 'block_trade'
  | 'sweep'
  | 'dark_pool'
  | 'dark_pool_sweep'
  | 'insider_buy'
  | 'insider_sell'
  | 'cluster_insider'
  | 'institutional_new'
  | 'institutional_increase'
  | 'institutional_exit'
  | 'short_squeeze'
  | 'confluence';

export type Direction = 'bullish' | 'bearish' | 'neutral';

export type InflectionStage = 'EARLY' | 'ACCELERATING' | 'CONFIRMED' | 'N/A';

export interface FlowItem {
  id: string;
  ticker: string;
  company: string;
  sector?: string;

  // Classification
  type: FlowType;
  direction: Direction;
  confluenceScore?: number;   // 0-100, present when type === 'confluence'
  activeSignals?: FlowType[]; // which signals fired, for confluence items

  // Price
  price: number;
  change: number;
  changePercent: number;

  // Volume
  volume: number;
  avgVolume: number;
  volumeRatio: number;

  // Value & timing
  value: string;          // formatted, e.g. "$2.1B"
  time: string;           // "10:32 AM"

  // Signal narrative
  signal: string;

  // Dark Pool fields
  darkPoolPercent?: number;   // % of today's volume in dark pools
  dpPrintSize?: string;       // size of largest dark pool print

  // Insider fields
  insiderName?: string;
  insiderTitle?: string;
  insiderShares?: number;
  insiderPricePerShare?: number;
  form4Type?: 'open_market' | '10b5-1' | 'gift' | 'other';
  clusterCount?: number;      // # of insiders buying in same week

  // Institutional fields
  institutionName?: string;
  sharesAdded?: number;
  sharesTotal?: number;
  portfolioPercent?: number;  // % of their portfolio
  isNewPosition?: boolean;

  // Short squeeze fields
  shortInterestPercent?: number;
  daysToCover?: number;
  shortInterestChange?: number; // % change vs prev period
}

// ─────────────────────────────────────────────────────
// Sector Flow
// ─────────────────────────────────────────────────────

export interface SectorFlow {
  sector: string;
  inflow: number;
  outflow: number;
  net: number;
  trend: Direction;
  etfTicker?: string;        // XLK, XLF, etc.
  etfFlowUSD?: string;       // formatted ETF flow
  topMover?: string;         // top ticker driving the move
}

// ─────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────

export interface FlowStats {
  unusualVolume: number;
  darkPoolAlerts: number;
  insiderTrades: number;
  confluenceAlerts: number;
  netFlow: string;
  marketSentiment: Direction;
}

// ─────────────────────────────────────────────────────
// Filters
// ─────────────────────────────────────────────────────

export type FlowTypeFilter =
  | 'all'
  | 'unusual_volume'
  | 'block_trade'
  | 'sweep'
  | 'dark_pool'
  | 'dark_pool_sweep'
  | 'insider_buy'
  | 'insider_sell'
  | 'cluster_insider'
  | 'institutional_new'
  | 'institutional_increase'
  | 'short_squeeze'
  | 'confluence';

export type DirectionFilter = 'all' | 'bullish' | 'bearish' | 'neutral';

export type TabType =
  | 'unusual-volume'
  | 'dark-pool'
  | 'insider-institutional'
  | 'confluence'
  | 'sector-flow';

export interface FlowFilters {
  search: string;
  type: FlowTypeFilter;
  direction: DirectionFilter;
}

// ─────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
