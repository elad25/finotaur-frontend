// =====================================================
// 🌐 FLOW SCANNER — API Layer v2
// Optimised: cache + request deduplication + batch fetch
// Tabs: All Flow | Unusual Volume | Dark Pool | Insider & Institutional | Confluence
// =====================================================

import {
  FlowItem, SectorFlow, FlowStats,
  FlowTypeFilter, DirectionFilter, TabType,
} from './types';
import { flowCache, sectorCache, statsCache, CACHE_KEYS } from './cache';
import { CACHE_TTL, CONFLUENCE_WEIGHTS, CONFLUENCE_THRESHOLD } from './constants';

// =====================================================
// Mock Data
// Replace each section's simulateFetch with real endpoints:
//   Unusual Volume  → /api/flow/unusual-volume
//   Dark Pool       → /api/flow/dark-pool
//   Insider         → /api/flow/insider     (SEC EDGAR Form 4)
//   Institutional   → /api/flow/institutional (SEC EDGAR 13F)
//   Confluence      → computed client-side (no extra API call)
// =====================================================

const MOCK_FLOW_DATA: FlowItem[] = [
  // ── Unusual Volume / Sweeps ──────────────────────
  {
    id: 'uv-1',
    ticker: 'NVDA', company: 'NVIDIA Corp', sector: 'Technology',
    type: 'unusual_volume', direction: 'bullish',
    volume: 45_000_000, avgVolume: 12_000_000, volumeRatio: 3.75,
    price: 875.50, change: 12.30, changePercent: 1.42,
    value: '$2.1B', time: '10:32 AM',
    signal: 'Volume 3.75x average — price broke above 30-day resistance at $870',
  },
  {
    id: 'uv-2',
    ticker: 'MSFT', company: 'Microsoft Corp', sector: 'Technology',
    type: 'sweep', direction: 'bullish',
    volume: 38_000_000, avgVolume: 22_000_000, volumeRatio: 1.73,
    price: 420.15, change: 6.80, changePercent: 1.65,
    value: '$1.8B', time: '02:15 PM',
    signal: 'Aggressive sweep cleared 4 price levels — buyer in a hurry',
  },
  {
    id: 'uv-3',
    ticker: 'AMD', company: 'Advanced Micro Devices', sector: 'Technology',
    type: 'block_trade', direction: 'bullish',
    volume: 32_000_000, avgVolume: 18_000_000, volumeRatio: 1.78,
    price: 178.90, change: 4.20, changePercent: 2.40,
    value: '$680M', time: '11:45 AM',
    signal: 'Single block of 5.2M shares executed at market open — 5-day accumulation pattern',
  },
  {
    id: 'uv-4',
    ticker: 'TSLA', company: 'Tesla Inc', sector: 'Consumer Disc.',
    type: 'short_squeeze', direction: 'bullish',
    volume: 82_000_000, avgVolume: 38_000_000, volumeRatio: 2.16,
    price: 258.40, change: 14.60, changePercent: 5.99,
    value: '$3.2B', time: '09:55 AM',
    signal: 'Short interest 18.4%, days-to-cover 3.2 — shorts being squeezed as volume spikes',
    shortInterestPercent: 18.4, daysToCover: 3.2, shortInterestChange: -12.3,
  },

  // ── Dark Pool ────────────────────────────────────
  {
    id: 'dp-1',
    ticker: 'META', company: 'Meta Platforms', sector: 'Technology',
    type: 'dark_pool', direction: 'bullish',
    volume: 15_200_000, avgVolume: 8_500_000, volumeRatio: 1.79,
    price: 505.20, change: 8.75, changePercent: 1.76,
    value: '$1.4B', time: '12:02 PM',
    signal: '42% of today\'s volume executed in dark pools — classic institutional accumulation',
    darkPoolPercent: 42, dpPrintSize: '$890M',
  },
  {
    id: 'dp-2',
    ticker: 'AAPL', company: 'Apple Inc', sector: 'Technology',
    type: 'dark_pool_sweep', direction: 'bullish',
    volume: 28_000_000, avgVolume: 15_000_000, volumeRatio: 1.87,
    price: 182.45, change: 2.15, changePercent: 1.19,
    value: '$890M', time: '11:15 AM',
    signal: 'Dark pool sweep — single print of $780M at 11:14 AM, 54% above average DP size',
    darkPoolPercent: 54, dpPrintSize: '$780M',
  },
  {
    id: 'dp-3',
    ticker: 'GOOGL', company: 'Alphabet Inc', sector: 'Technology',
    type: 'dark_pool', direction: 'neutral',
    volume: 12_800_000, avgVolume: 14_000_000, volumeRatio: 0.91,
    price: 175.30, change: 0.45, changePercent: 0.26,
    value: '$420M', time: '10:58 AM',
    signal: '38% dark pool vs 22% 30-day average — someone accumulating quietly',
    darkPoolPercent: 38, dpPrintSize: '$310M',
  },
  {
    id: 'dp-4',
    ticker: 'GS', company: 'Goldman Sachs', sector: 'Financials',
    type: 'dark_pool', direction: 'bearish',
    volume: 6_400_000, avgVolume: 4_200_000, volumeRatio: 1.52,
    price: 462.80, change: -3.40, changePercent: -0.73,
    value: '$380M', time: '01:44 PM',
    signal: '61% dark pool — heavy distribution, institutional selling off-exchange',
    darkPoolPercent: 61, dpPrintSize: '$245M',
  },

  // ── Insider ──────────────────────────────────────
  {
    id: 'ins-1',
    ticker: 'JPM', company: 'JPMorgan Chase', sector: 'Financials',
    type: 'insider_buy', direction: 'bullish',
    volume: 9_500_000, avgVolume: 8_200_000, volumeRatio: 1.16,
    price: 198.40, change: 3.20, changePercent: 1.64,
    value: '$4.96M', time: '01:30 PM',
    signal: 'CEO Jamie Dimon — open market purchase of 25,000 shares at $198.40',
    insiderName: 'Jamie Dimon', insiderTitle: 'CEO',
    insiderShares: 25_000, insiderPricePerShare: 198.40,
    form4Type: 'open_market',
  },
  {
    id: 'ins-2',
    ticker: 'TSLA', company: 'Tesla Inc', sector: 'Consumer Disc.',
    type: 'insider_sell', direction: 'bearish',
    volume: 18_500_000, avgVolume: 22_000_000, volumeRatio: 0.84,
    price: 245.80, change: -5.40, changePercent: -2.15,
    value: '$12.4M', time: '09:45 AM',
    signal: 'CFO Zachary Kirkhorn — 10b5-1 plan sale of 50,500 shares at $245.80',
    insiderName: 'Zachary Kirkhorn', insiderTitle: 'CFO',
    insiderShares: 50_500, insiderPricePerShare: 245.80,
    form4Type: '10b5-1',
  },
  {
    id: 'ins-3',
    ticker: 'PANW', company: 'Palo Alto Networks', sector: 'Technology',
    type: 'cluster_insider', direction: 'bullish',
    volume: 4_800_000, avgVolume: 3_200_000, volumeRatio: 1.50,
    price: 312.60, change: 7.80, changePercent: 2.56,
    value: '$18.2M', time: '10:05 AM',
    signal: '4 insiders bought within 5 days — CEO, CTO, CFO, and a board member all buying open market',
    clusterCount: 4,
    insiderShares: 58_250, insiderPricePerShare: 312.60,
    form4Type: 'open_market',
  },

  // ── Institutional ────────────────────────────────
  {
    id: 'inst-1',
    ticker: 'AAPL', company: 'Apple Inc', sector: 'Technology',
    type: 'institutional_increase', direction: 'bullish',
    volume: 28_000_000, avgVolume: 15_000_000, volumeRatio: 1.87,
    price: 182.45, change: 2.15, changePercent: 1.19,
    value: '$3.8B', time: '11:15 AM',
    signal: 'Berkshire Hathaway increased position by 2.1M shares — now 5.9% of portfolio',
    institutionName: 'Berkshire Hathaway', sharesAdded: 2_100_000,
    sharesTotal: 915_560_382, portfolioPercent: 5.9, isNewPosition: false,
  },
  {
    id: 'inst-2',
    ticker: 'PLTR', company: 'Palantir Technologies', sector: 'Technology',
    type: 'institutional_new', direction: 'bullish',
    volume: 8_200_000, avgVolume: 5_100_000, volumeRatio: 1.61,
    price: 24.80, change: 1.20, changePercent: 5.08,
    value: '$890M', time: '09:35 AM',
    signal: 'Citadel initiating new position — $890M across 35.8M shares in Q4 13F',
    institutionName: 'Citadel LLC', sharesAdded: 35_800_000,
    sharesTotal: 35_800_000, portfolioPercent: 0.8, isNewPosition: true,
  },
  {
    id: 'inst-3',
    ticker: 'NFLX', company: 'Netflix Inc', sector: 'Communication',
    type: 'institutional_exit', direction: 'bearish',
    volume: 5_600_000, avgVolume: 4_800_000, volumeRatio: 1.17,
    price: 628.40, change: -8.20, changePercent: -1.29,
    value: '$1.2B', time: '03:15 PM',
    signal: 'Cathie Wood / ARK completely exited position — sold all 1.9M shares over 3 days',
    institutionName: 'ARK Investment Management',
    sharesAdded: -1_900_000, sharesTotal: 0,
    portfolioPercent: 0, isNewPosition: false,
  },
];

// ─────────────────────────────────────────────────────
// Confluence computation (pure client-side, no API call)
// ─────────────────────────────────────────────────────

function computeConfluenceItems(items: FlowItem[]): FlowItem[] {
  // Group by ticker
  const byTicker = new Map<string, FlowItem[]>();
  for (const item of items) {
    if (!byTicker.has(item.ticker)) byTicker.set(item.ticker, []);
    byTicker.get(item.ticker)!.push(item);
  }

  const confluenceItems: FlowItem[] = [];

  for (const [ticker, tickerItems] of byTicker) {
    if (tickerItems.length < CONFLUENCE_THRESHOLD) continue;

    // Score
    let score = 0;
    const activeSignals: FlowItem['type'][] = [];
    for (const item of tickerItems) {
      const weight = CONFLUENCE_WEIGHTS[item.type] ?? 10;
      score += weight;
      activeSignals.push(item.type);
    }
    score = Math.min(score, 100);

    const first = tickerItems[0];
    // Dominant direction
    const bullish = tickerItems.filter(i => i.direction === 'bullish').length;
    const bearish  = tickerItems.filter(i => i.direction === 'bearish').length;
    const direction = bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral';

    const signalSummary = activeSignals
      .map(s => s.replace(/_/g, ' '))
      .join(' + ');

    confluenceItems.push({
      ...first,
      id: `conf-${ticker}`,
      type: 'confluence',
      direction,
      confluenceScore: score,
      activeSignals,
      signal: `${activeSignals.length} signals firing: ${signalSummary} — confluence score ${score}/100`,
    });
  }

  return confluenceItems.sort((a, b) => (b.confluenceScore ?? 0) - (a.confluenceScore ?? 0));
}

const MOCK_SECTOR_DATA: SectorFlow[] = [
  { sector: 'Technology',     inflow: 2.4, outflow: 0.8, net:  1.6, trend: 'bullish', etfTicker: 'XLK',  topMover: 'NVDA' },
  { sector: 'Healthcare',     inflow: 0.9, outflow: 1.2, net: -0.3, trend: 'bearish', etfTicker: 'XLV',  topMover: 'UNH'  },
  { sector: 'Financials',     inflow: 1.1, outflow: 0.6, net:  0.5, trend: 'bullish', etfTicker: 'XLF',  topMover: 'JPM'  },
  { sector: 'Energy',         inflow: 0.4, outflow: 0.9, net: -0.5, trend: 'bearish', etfTicker: 'XLE',  topMover: 'XOM'  },
  { sector: 'Consumer Disc.', inflow: 0.7, outflow: 0.5, net:  0.2, trend: 'neutral', etfTicker: 'XLY',  topMover: 'AMZN' },
  { sector: 'Industrials',    inflow: 0.8, outflow: 0.4, net:  0.4, trend: 'bullish', etfTicker: 'XLI',  topMover: 'CAT'  },
  { sector: 'Materials',      inflow: 0.3, outflow: 0.4, net: -0.1, trend: 'bearish', etfTicker: 'XLB',  topMover: 'FCX'  },
  { sector: 'Real Estate',    inflow: 0.5, outflow: 0.3, net:  0.2, trend: 'bullish', etfTicker: 'XLRE', topMover: 'AMT'  },
  { sector: 'Utilities',      inflow: 0.2, outflow: 0.2, net:  0.0, trend: 'neutral', etfTicker: 'XLU',  topMover: 'NEE'  },
];

const MOCK_STATS: FlowStats = {
  unusualVolume:    14,
  darkPoolAlerts:   8,
  insiderTrades:    6,
  confluenceAlerts: 3,
  netFlow:         '+$4.2B',
  marketSentiment: 'bullish',
};

// ─────────────────────────────────────────────────────
// Simulated fetch (swap with real endpoints)
// ─────────────────────────────────────────────────────

const simulateFetch = <T>(data: T, delay = 400): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(data), delay));

// ─────────────────────────────────────────────────────
// Public API — all cached + deduplicated
// ─────────────────────────────────────────────────────

export async function fetchFlowData(): Promise<FlowItem[]> {
  const cached = flowCache.get(CACHE_KEYS.FLOW_DATA);
  if (cached && !cached.isStale) return cached.data;

  const raw = await flowCache.dedupe(CACHE_KEYS.FLOW_DATA, async () => {
    // Replace with: const res = await fetch('/api/flow/all'); return res.json();
    return simulateFetch(MOCK_FLOW_DATA);
  });

  // Compute confluence items and merge
  const confluence = computeConfluenceItems(raw);
  const data = [...raw, ...confluence];

  flowCache.set(CACHE_KEYS.FLOW_DATA, data, CACHE_TTL.FLOW_DATA);
  return data;
}

export async function fetchSectorData(): Promise<SectorFlow[]> {
  const cached = sectorCache.get(CACHE_KEYS.SECTOR_DATA);
  if (cached && !cached.isStale) return cached.data;

  const data = await sectorCache.dedupe(CACHE_KEYS.SECTOR_DATA, async () => {
    // Replace with: const res = await fetch('/api/flow/sectors'); return res.json();
    return simulateFetch(MOCK_SECTOR_DATA, 300);
  });

  sectorCache.set(CACHE_KEYS.SECTOR_DATA, data, CACHE_TTL.SECTOR_DATA);
  return data;
}

export async function fetchStats(): Promise<FlowStats> {
  const cached = statsCache.get(CACHE_KEYS.STATS_DATA);
  if (cached && !cached.isStale) return cached.data;

  const data = await statsCache.dedupe(CACHE_KEYS.STATS_DATA, async () => {
    // Replace with: const res = await fetch('/api/flow/stats'); return res.json();
    return simulateFetch(MOCK_STATS, 200);
  });

  statsCache.set(CACHE_KEYS.STATS_DATA, data, CACHE_TTL.STATS_DATA);
  return data;
}

/** Batch init — one parallel round-trip on mount */
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

export function invalidateFlowCache(): void {
  flowCache.invalidate(CACHE_KEYS.FLOW_DATA);
  sectorCache.invalidate(CACHE_KEYS.SECTOR_DATA);
  statsCache.invalidate(CACHE_KEYS.STATS_DATA);
}

// ─────────────────────────────────────────────────────
// Client-side filtering  (no server round-trip)
// ─────────────────────────────────────────────────────

const TAB_TYPE_MAP: Partial<Record<TabType, string[]>> = {
  'unusual-volume':        ['unusual_volume', 'block_trade', 'sweep', 'short_squeeze'],
  'dark-pool':             ['dark_pool', 'dark_pool_sweep'],
  'insider-institutional': ['insider_buy', 'insider_sell', 'cluster_insider', 'institutional_new', 'institutional_increase', 'institutional_exit'],
  'confluence':            ['confluence'],
};

export function filterFlowData(
  data: FlowItem[],
  tab: TabType,
  search: string,
  type: FlowTypeFilter,
  direction: DirectionFilter,
): FlowItem[] {
  let result = data;

  // Tab filter
  const allowedTypes = TAB_TYPE_MAP[tab];
  if (allowedTypes) {
    result = result.filter(i => allowedTypes.includes(i.type));
  }

  // Search
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(i =>
      i.ticker.toLowerCase().includes(q) ||
      i.company.toLowerCase().includes(q)
    );
  }

  // Type filter
  if (type !== 'all') result = result.filter(i => i.type === type);

  // Direction filter
  if (direction !== 'all') result = result.filter(i => i.direction === direction);

  // Confluence tab: sort by score descending
  if (tab === 'confluence') {
    result = [...result].sort((a, b) => (b.confluenceScore ?? 0) - (a.confluenceScore ?? 0));
  }

  return result;
}
