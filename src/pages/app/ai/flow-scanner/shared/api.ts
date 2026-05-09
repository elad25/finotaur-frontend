// =====================================================
// 🌐 FLOW SCANNER - API Layer (Real Data)
// =====================================================

import { FlowItem, FlowType, SectorFlow, FlowStats, FlowTypeFilter, DirectionFilter } from './types';
import { flowCache, sectorCache, statsCache, CACHE_KEYS } from './cache';
import { CACHE_TTL } from './constants';
import { authFetch } from '@/utils/authFetch';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiFetch<T>(path: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Use authFetch so Authorization: Bearer <supabase_token> is auto-injected.
    // Without it, userTier middleware sees no Bearer header and sets req.userTier='free',
    // causing aiGate to refuse `pro+`-tier flow_scanner endpoints with 403.
    const res = await authFetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

const DEFAULT_STATS: FlowStats = {
  unusualVolume:    0,
  darkPoolAlerts:   0,
  insiderTrades:    0,
  confluenceAlerts: 0,
  netFlow:          '—',
  marketSentiment:  'neutral',
};

// =====================================================
// Fetch flow data
// =====================================================
export async function fetchFlowData(): Promise<FlowItem[]> {
  const cached = flowCache.get(CACHE_KEYS.FLOW_DATA);
  if (cached && !cached.isStale) return cached.data;

  const data = await flowCache.dedupe(CACHE_KEYS.FLOW_DATA, async () => {
    const res = await apiFetch<{ success: boolean; flowData: FlowItem[]; stats: FlowStats }>(
      '/api/flow/scanner'
    );
    if (res.stats) {
      statsCache.set(CACHE_KEYS.STATS_DATA, res.stats, CACHE_TTL.STATS_DATA);
    }
    return res.flowData || [];
  });

  flowCache.set(CACHE_KEYS.FLOW_DATA, data, CACHE_TTL.FLOW_DATA);
  return data;
}

// =====================================================
// Fetch stats
// =====================================================
export async function fetchStats(): Promise<FlowStats> {
  const cached = statsCache.get(CACHE_KEYS.STATS_DATA);
  if (cached && !cached.isStale) return cached.data;

  const data = await statsCache.dedupe(CACHE_KEYS.STATS_DATA, async () => {
    const res = await apiFetch<{ success: boolean; stats: FlowStats }>('/api/flow/scanner/stats');
    return res.stats ?? DEFAULT_STATS;
  });

  statsCache.set(CACHE_KEYS.STATS_DATA, data, CACHE_TTL.STATS_DATA);
  return data;
}

// =====================================================
// Fetch sector data
// =====================================================
export async function fetchSectorData(): Promise<SectorFlow[]> {
  const cached = sectorCache.get(CACHE_KEYS.SECTOR_DATA);
  if (cached && !cached.isStale) return cached.data;

  const data = await sectorCache.dedupe(CACHE_KEYS.SECTOR_DATA, async () => {
    try {
      const res = await apiFetch<{ success: boolean; data: SectorFlow[] }>(
        '/api/flow/scanner/sectors'
      );
      return res.data || [];
    } catch {
      const flow = flowCache.get(CACHE_KEYS.FLOW_DATA);
      return flow ? aggregateSectors(flow.data) : [];
    }
  });

  sectorCache.set(CACHE_KEYS.SECTOR_DATA, data, CACHE_TTL.SECTOR_DATA);
  return data;
}

// =====================================================
// Batch init — one round-trip
// =====================================================
export async function fetchAllFlowData(): Promise<{
  flowData: FlowItem[];
  sectorData: SectorFlow[];
  stats: FlowStats;
}> {
  const [flowData, sectorData] = await Promise.all([
    fetchFlowData(),
    fetchSectorData(),
  ]);
  const statsFromCache = statsCache.get(CACHE_KEYS.STATS_DATA);
  const stats = statsFromCache?.data ?? await fetchStats();
  return { flowData, sectorData, stats };
}

// =====================================================
// Cache invalidation
// =====================================================
export function invalidateFlowCache(): void {
  flowCache.invalidate(CACHE_KEYS.FLOW_DATA);
  sectorCache.invalidate(CACHE_KEYS.SECTOR_DATA);
  statsCache.invalidate(CACHE_KEYS.STATS_DATA);
}

export async function triggerServerRefresh(): Promise<{ success: boolean; message: string }> {
  try {
    return await apiFetch<{ success: boolean; message: string }>('/api/flow/scanner/refresh');
  } catch (e: unknown) {
    return { success: false, message: (e as Error).message };
  }
}

// =====================================================
// Tab → FlowType[] mapping (exact values from FlowType union)
// =====================================================
const TAB_TO_TYPES: Partial<Record<string, FlowType[]>> = {
  'unusual-volume':        ['unusual_volume', 'block_trade', 'sweep', 'short_squeeze'],
  'dark-pool':             ['dark_pool', 'dark_pool_sweep'],
  'insider-institutional': ['insider_buy', 'insider_sell', 'cluster_insider',
                            'institutional_new', 'institutional_increase', 'institutional_exit'],
  'confluence':            ['confluence'],
  // 'sector-flow' — no filter, handled by SectorFlowTab component
};

// =====================================================
// Client-side filtering (no server round-trip)
// =====================================================
export function filterFlowData(
  data: FlowItem[],
  tab: string,
  search: string,
  type: FlowTypeFilter,
  direction: DirectionFilter,
): FlowItem[] {
  let result = data;

  // Tab filter
  const tabTypes = TAB_TO_TYPES[tab];
  if (tabTypes) {
    result = result.filter(i => tabTypes.includes(i.type));
  }

  // Search filter
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(i =>
      i.ticker.toLowerCase().includes(q) ||
      i.company.toLowerCase().includes(q)
    );
  }

  // Type dropdown filter
  if (type !== 'all') result = result.filter(i => i.type === type);

  // Direction filter
  if (direction !== 'all') result = result.filter(i => i.direction === direction);

  return result;
}

// ─── Sector aggregation fallback ──────────────────────────────────────────
const TICKER_SECTOR: Record<string, string> = {
  NVDA: 'Technology',    AAPL: 'Technology',    MSFT: 'Technology',
  META: 'Technology',    GOOGL: 'Technology',   AMZN: 'Consumer Disc.',
  TSLA: 'Consumer Disc.',AMD:  'Technology',    PLTR: 'Technology',
  JPM:  'Financials',    BAC:  'Financials',    GS:   'Financials',
  MS:   'Financials',    SOFI: 'Financials',    HOOD: 'Financials',
  XLK:  'Technology',    XLF:  'Financials',
};

function aggregateSectors(items: FlowItem[]): SectorFlow[] {
  const map: Record<string, { inflow: number; outflow: number; bull: number; bear: number }> = {};

  items.forEach(item => {
    const sector = TICKER_SECTOR[item.ticker] || item.sector || 'Other';
    if (!map[sector]) map[sector] = { inflow: 0, outflow: 0, bull: 0, bear: 0 };
    const vol = item.volume / 1e9;
    if (item.direction === 'bullish') { map[sector].inflow += vol; map[sector].bull++; }
    else if (item.direction === 'bearish') { map[sector].outflow += vol; map[sector].bear++; }
  });

  return Object.entries(map).map(([sector, s]) => ({
    sector,
    inflow:  parseFloat(s.inflow.toFixed(2)),
    outflow: parseFloat(s.outflow.toFixed(2)),
    net:     parseFloat((s.inflow - s.outflow).toFixed(2)),
    trend:   (s.bull > s.bear ? 'bullish' : s.bear > s.bull ? 'bearish' : 'neutral') as SectorFlow['trend'],
  })).sort((a, b) => b.net - a.net);
}