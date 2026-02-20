// =====================================================
// 🌐 FLOW SCANNER - API Layer (Real Data)
// src/pages/app/ai/flow-scanner/shared/api.ts
//
// Connects to Railway backend (/api/flow/scanner)
// which serves from Supabase cache (populated by cron)
// Zero Polygon calls from client — optimized for 10K users
// =====================================================

import { FlowItem, SectorFlow, FlowStats, FlowTypeFilter, DirectionFilter } from './types';
import { flowCache, sectorCache, statsCache, CACHE_KEYS } from './cache';
import { CACHE_TTL } from './constants';

// ─── Config ──────────────────────────────────────────

const RAILWAY_BASE = 'https://finotaur-server-production.up.railway.app';

// ─── Fetch Helper ─────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${RAILWAY_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Fallback Stats ───────────────────────────────────

const EMPTY_STATS: FlowStats = { unusualVolume: 0, institutional: 0, insiderTrades: 0, netFlow: '—' };

// ─── Mock Sector (until sector cron is built) ─────────

const MOCK_SECTOR_DATA: SectorFlow[] = [
  { sector: 'Technology',    inflow: 2.4, outflow: 0.8, net:  1.6, trend: 'bullish' },
  { sector: 'Healthcare',    inflow: 0.9, outflow: 1.2, net: -0.3, trend: 'bearish' },
  { sector: 'Financials',    inflow: 1.1, outflow: 0.6, net:  0.5, trend: 'bullish' },
  { sector: 'Energy',        inflow: 0.4, outflow: 0.9, net: -0.5, trend: 'bearish' },
  { sector: 'Consumer Disc.',inflow: 0.7, outflow: 0.5, net:  0.2, trend: 'neutral' },
  { sector: 'Industrials',   inflow: 0.8, outflow: 0.4, net:  0.4, trend: 'bullish' },
  { sector: 'Materials',     inflow: 0.3, outflow: 0.4, net: -0.1, trend: 'bearish' },
  { sector: 'Real Estate',   inflow: 0.5, outflow: 0.3, net:  0.2, trend: 'bullish' },
  { sector: 'Utilities',     inflow: 0.2, outflow: 0.2, net:  0.0, trend: 'neutral' },
];

// ─── Public API ────────────────────────────────────────

export async function fetchFlowData(): Promise<FlowItem[]> {
  const cached = flowCache.get(CACHE_KEYS.FLOW_DATA);
  if (cached && !cached.isStale) return cached.data;

  const data = await flowCache.dedupe(CACHE_KEYS.FLOW_DATA, async () => {
    try {
      const res = await apiFetch<{ success: boolean; flowData: FlowItem[] }>('/api/flow/scanner');
      if (!res.success || !Array.isArray(res.flowData)) throw new Error('Invalid response');
      return res.flowData;
    } catch (e) {
      console.warn('[FlowData] API unavailable:', (e as Error).message);
      return [] as FlowItem[];
    }
  });

  flowCache.set(CACHE_KEYS.FLOW_DATA, data, CACHE_TTL.FLOW_DATA);
  return data;
}

export async function fetchStats(): Promise<FlowStats> {
  const cached = statsCache.get(CACHE_KEYS.STATS_DATA);
  if (cached && !cached.isStale) return cached.data;

  const data = await statsCache.dedupe(CACHE_KEYS.STATS_DATA, async () => {
    try {
      const res = await apiFetch<{ success: boolean; stats: FlowStats }>('/api/flow/scanner/stats');
      if (!res.success || !res.stats) throw new Error('No stats');
      return res.stats;
    } catch (e) {
      console.warn('[FlowStats] API unavailable:', (e as Error).message);
      return EMPTY_STATS;
    }
  });

  statsCache.set(CACHE_KEYS.STATS_DATA, data, CACHE_TTL.STATS_DATA);
  return data;
}

export async function fetchSectorData(): Promise<SectorFlow[]> {
  const cached = sectorCache.get(CACHE_KEYS.SECTOR_DATA);
  if (cached && !cached.isStale) return cached.data;

  const data = await sectorCache.dedupe(CACHE_KEYS.SECTOR_DATA, async () => MOCK_SECTOR_DATA);
  sectorCache.set(CACHE_KEYS.SECTOR_DATA, data, CACHE_TTL.SECTOR_DATA);
  return data;
}

export async function fetchAllFlowData(): Promise<{
  flowData: FlowItem[];
  sectorData: SectorFlow[];
  stats: FlowStats;
}> {
  const [flowData, sectorData, stats] = await Promise.all([
    fetchFlowData(),
    fetchSectorData(),
    fetchStats(),
  ]);
  return { flowData, sectorData, stats };
}

export async function invalidateFlowCache(): Promise<void> {
  flowCache.invalidate(CACHE_KEYS.FLOW_DATA);
  sectorCache.invalidate(CACHE_KEYS.SECTOR_DATA);
  statsCache.invalidate(CACHE_KEYS.STATS_DATA);
  // Non-blocking: trigger Railway to re-fetch from Polygon
  apiFetch('/api/flow/scanner/refresh', { method: 'POST' }, 15_000)
    .catch(e => console.warn('[FlowCache] Refresh trigger failed:', (e as Error).message));
}

export function filterFlowData(
  data: FlowItem[],
  tab: string,
  search: string,
  type: FlowTypeFilter,
  direction: DirectionFilter,
): FlowItem[] {
  let result = data;

  if      (tab === 'unusual-volume') result = result.filter(i => i.type === 'unusual_volume');
  else if (tab === 'institutional')  result = result.filter(i => i.type === 'institutional');
  else if (tab === 'insider')        result = result.filter(i => i.type === 'insider');
  else if (tab === 'dark-pool')      result = result.filter(i => i.type === 'dark_pool');

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(i =>
      i.ticker.toLowerCase().includes(q) ||
      i.company.toLowerCase().includes(q)
    );
  }

  if (type !== 'all')      result = result.filter(i => i.type === type);
  if (direction !== 'all') result = result.filter(i => i.direction === direction);

  return result;
}