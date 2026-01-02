// src/pages/app/all-markets/Overview.tsx
import { api } from '@/lib/apiBase';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle,
  BarChart3,
  Zap,
  Target,
  Calendar,
  Volume2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Gauge,
  Shield,
  Flame,
  Clock,
  DollarSign,
  Coins,
  LineChart as LineChartIcon,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  History,
  Focus,
  Eye,
  Newspaper,
  Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Types
type Mover = { 
  symbol: string; 
  price: number | null; 
  chp: number | null; 
  name?: string;
  volume?: number;
};

type MoversResp = { 
  gainers: Mover[]; 
  losers: Mover[]; 
  mostActive?: Mover[];
  source?: string; 
  ts?: number;
};

type MarketRegime = 'risk-on' | 'risk-off' | 'transitional' | 'distribution';

// Mock data for regime timeline
type RegimePoint = {
  date: string;
  regime: MarketRegime;
  confidence: number;
};

const mockRegimeTimeline: RegimePoint[] = [
  { date: 'Nov 1', regime: 'risk-off', confidence: 68 },
  { date: 'Nov 8', regime: 'transitional', confidence: 55 },
  { date: 'Nov 15', regime: 'transitional', confidence: 62 },
  { date: 'Nov 22', regime: 'risk-on', confidence: 58 },
  { date: 'Nov 29', regime: 'risk-on', confidence: 65 },
  { date: 'Dec 6', regime: 'risk-on', confidence: 70 },
  { date: 'Dec 13', regime: 'risk-on', confidence: 68 },
  { date: 'Dec 20', regime: 'risk-on', confidence: 71 },
  { date: 'Dec 27', regime: 'risk-on', confidence: 72 },
  { date: 'Today', regime: 'risk-on', confidence: 72 },
];

// Cross-Asset signals
type AssetSignal = 'up' | 'down' | 'neutral';
type CrossAssetData = {
  equities: { signal: AssetSignal; label: string };
  bonds: { signal: AssetSignal; label: string };
  dollar: { signal: AssetSignal; label: string };
  gold: { signal: AssetSignal; label: string };
};

type EarningsStock = {
  symbol: string;
  name: string;
  time: 'pre' | 'post' | 'during';
  estimate?: number;
};

const mockCrossAsset: CrossAssetData = {
  equities: { signal: 'up', label: 'Momentum' },
  bonds: { signal: 'neutral', label: 'Range-bound' },
  dollar: { signal: 'down', label: 'Softening' },
  gold: { signal: 'up', label: 'Bid under surface' },
};

// Today's focus
const todaysFocus = {
  headline: "Tech leads on AI optimism, but breadth isn't fully confirming",
  subtext: "Markets pricing continued rate stability — watch for positioning shifts if data surprises"
};

function determineRegime(): { regime: MarketRegime; confidence: number } {
  return { regime: 'risk-on', confidence: 72 };
}

function formatVolume(vol: number | undefined): string {
  if (!vol) return '-';
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(0)}K`;
  return vol.toString();
}

const regimeStyles: Record<MarketRegime, { bg: string; text: string; icon: typeof TrendingUp; color: string }> = {
  'risk-on': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: TrendingUp, color: '#10b981' },
  'risk-off': { bg: 'bg-red-500/20', text: 'text-red-400', icon: Shield, color: '#ef4444' },
  'transitional': { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: Activity, color: '#f59e0b' },
  'distribution': { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: BarChart3, color: '#a855f7' },
};

// ═══════════════════════════════════════════════════════════════════
// MARKET TICKER STRIP
// ═══════════════════════════════════════════════════════════════════

type MarketCategory = 'US' | 'World' | 'Commodities' | 'Futures' | 'Treasuries';
type TimeFrame = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | '10Y' | 'MAX';
type ChartPoint = { time: string; value: number };

type MarketIndexItem = {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
};

// ============ CACHE CONFIGURATION ============
const OVERVIEW_CACHE_KEY = 'finotaur_overview_market_data';
const CHART_CACHE_KEY = 'finotaur_chart_data';
const OVERVIEW_CACHE_DURATION_MS = 15 * 60 * 1000;

interface OverviewCachedData {
  data: any;
  timestamp: number;
  marketOpen: boolean;
}

interface ChartCacheEntry {
  data: ChartPoint[];
  timestamp: number;
  isReal: boolean;
}

function getOverviewCache(): OverviewCachedData | null {
  try {
    const cached = localStorage.getItem(OVERVIEW_CACHE_KEY);
    if (!cached) return null;
    const parsed: OverviewCachedData = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    if (!parsed.marketOpen && age < OVERVIEW_CACHE_DURATION_MS * 4) return parsed;
    if (age < OVERVIEW_CACHE_DURATION_MS) return parsed;
    return null;
  } catch {
    return null;
  }
}

function setOverviewCache(data: any, marketOpen: boolean): void {
  try {
    localStorage.setItem(OVERVIEW_CACHE_KEY, JSON.stringify({
      data, timestamp: Date.now(), marketOpen
    }));
  } catch (e) {
    console.warn('Failed to cache overview data:', e);
  }
}

function getChartCache(symbol: string, timeframe: TimeFrame): ChartCacheEntry | null {
  try {
    const cacheKey = `${CHART_CACHE_KEY}_${symbol}_${timeframe}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    const parsed: ChartCacheEntry = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    const maxAge = timeframe === '1D' ? 5 * 60 * 1000 :
                   timeframe === '5D' ? 15 * 60 * 1000 :
                   60 * 60 * 1000;
    if (age < maxAge) return parsed;
    return null;
  } catch {
    return null;
  }
}

function setChartCache(symbol: string, timeframe: TimeFrame, data: ChartPoint[], isReal: boolean): void {
  try {
    const cacheKey = `${CHART_CACHE_KEY}_${symbol}_${timeframe}`;
    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now(), isReal }));
  } catch (e) {
    console.warn('Failed to cache chart data:', e);
  }
}

// ============ REALISTIC CHART GENERATION ============
function generateRealisticChart(
  currentPrice: number, 
  changePercent: number, 
  timeframe: TimeFrame,
  symbol: string
): ChartPoint[] {
  const points: ChartPoint[] = [];
  
  const config: Record<TimeFrame, { count: number; volatility: number; labels: (i: number, count: number) => string }> = {
    '1D': {
      count: 78,
      volatility: 0.001,
      labels: (i, count) => {
        const minutes = Math.floor(i * 390 / count);
        const hour = Math.floor((570 + minutes) / 60);
        const min = (570 + minutes) % 60;
        return `${hour}:${min.toString().padStart(2, '0')}`;
      }
    },
    '5D': {
      count: 40,
      volatility: 0.003,
      labels: (i, count) => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const dayIdx = Math.floor(i / (count / 5));
        return days[Math.min(dayIdx, 4)];
      }
    },
    '1M': {
      count: 22,
      volatility: 0.005,
      labels: (i) => {
        const d = new Date();
        d.setDate(d.getDate() - (22 - i));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    },
    '6M': {
      count: 130,
      volatility: 0.008,
      labels: (i) => {
        const d = new Date();
        d.setDate(d.getDate() - (130 - i));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    },
    'YTD': {
      count: 250,
      volatility: 0.01,
      labels: (i) => {
        const d = new Date();
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const targetDay = Math.floor(i * dayOfYear / 250);
        const targetDate = new Date(startOfYear.getTime() + targetDay * 24 * 60 * 60 * 1000);
        return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    },
    '1Y': {
      count: 252,
      volatility: 0.012,
      labels: (i) => {
        const d = new Date();
        d.setDate(d.getDate() - (252 - i));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    },
    '5Y': {
      count: 60,
      volatility: 0.03,
      labels: (i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (60 - i));
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    },
    '10Y': {
      count: 120,
      volatility: 0.04,
      labels: (i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (120 - i));
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    },
    'MAX': {
      count: 180,
      volatility: 0.05,
      labels: (i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (180 - i));
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    }
  };

  const { count, volatility, labels } = config[timeframe];
  const startPrice = currentPrice / (1 + changePercent / 100);
  let price = startPrice;
  const targetPrice = currentPrice;
  const drift = (targetPrice - startPrice) / count;
  
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 9999) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < count; i++) {
    const noise = (seededRandom(i) - 0.5) * 2 * currentPrice * volatility;
    const meanReversion = (targetPrice - price) * 0.05;
    price = price + drift + noise + meanReversion;
    price = Math.max(price, currentPrice * 0.5);
    price = Math.min(price, currentPrice * 1.5);
    
    points.push({
      time: labels(i, count),
      value: Math.round(price * 100) / 100
    });
  }
  
  points[points.length - 1].value = currentPrice;
  return points;
}

// ============ FETCH CHART DATA WITH FALLBACK ============
async function fetchChartData(
  symbol: string, 
  timeframe: TimeFrame,
  currentPrice: number,
  changePercent: number
): Promise<{ data: ChartPoint[], isReal: boolean }> {
  const cached = getChartCache(symbol, timeframe);
  if (cached && cached.data.length > 0) {
    return { data: cached.data, isReal: cached.isReal };
  }

  const symbolMap: Record<string, string> = {
    'SPY': 'SPY', 'QQQ': 'QQQ', 'DIA': 'DIA', 'IWM': 'IWM',
    'XLK': 'XLK', 'XLF': 'XLF', 'XLE': 'XLE', 'XLV': 'XLV',
    'XLY': 'XLY', 'XLP': 'XLP', 'XLI': 'XLI', 'XLB': 'XLB',
    'XLRE': 'XLRE', 'XLC': 'XLC', 'XLU': 'XLU',
    'GLD': 'GLD', 'USO': 'USO', 'SLV': 'SLV', 'UNG': 'UNG', 'CPER': 'CPER',
    'ES': 'SPY', 'NQ': 'QQQ', 'YM': 'DIA', 'RTY': 'IWM',
    'VIX': 'VIX',
    'US10Y': 'TLT', 'US02Y': 'SHY', 'US30Y': 'TLT',
  };

  const ticker = symbolMap[symbol] || symbol;
  
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  let from: string;
  let multiplier: number;
  let timespan: string;

  switch (timeframe) {
    case '1D':
      from = to;
      multiplier = 5;
      timespan = 'minute';
      break;
    case '5D':
      from = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      multiplier = 30;
      timespan = 'minute';
      break;
    case '1M':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      multiplier = 1;
      timespan = 'day';
      break;
    case '6M':
      from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      multiplier = 1;
      timespan = 'day';
      break;
    case 'YTD':
      from = `${now.getFullYear()}-01-01`;
      multiplier = 1;
      timespan = 'day';
      break;
    case '1Y':
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      multiplier = 1;
      timespan = 'day';
      break;
    case '5Y':
      from = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      multiplier = 1;
      timespan = 'week';
      break;
    case '10Y':
      from = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      multiplier = 1;
      timespan = 'month';
      break;
    case 'MAX':
      from = '2010-01-01';
      multiplier = 1;
      timespan = 'month';
      break;
    default:
      from = to;
      multiplier = 5;
      timespan = 'minute';
  }

  try {
    const url = api(`/api/chart/${ticker}?from=${from}&to=${to}&multiplier=${multiplier}&timespan=${timespan}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.results || result.results.length === 0) {
      throw new Error('No data returned');
    }

    const chartData: ChartPoint[] = result.results.map((bar: any) => {
      const date = new Date(bar.t);
      let timeLabel: string;
      
      if (timeframe === '1D') {
        timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
      } else if (timeframe === '5D') {
        timeLabel = date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric' });
      } else if (['1M', '6M', 'YTD', '1Y'].includes(timeframe)) {
        timeLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        timeLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      
      return { time: timeLabel, value: bar.c };
    });

    setChartCache(symbol, timeframe, chartData, true);
    return { data: chartData, isReal: true };
    
  } catch (e: any) {
    const simulatedData = generateRealisticChart(currentPrice, changePercent, timeframe, symbol);
    setChartCache(symbol, timeframe, simulatedData, false);
    return { data: simulatedData, isReal: false };
  }
}

// ============ OVERVIEW MARKET DATA HOOK ============
function useOverviewMarketData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async (force = false) => {
    if (!force) {
      const cached = getOverviewCache();
      if (cached) {
        setData(cached.data);
        setLastUpdate(new Date(cached.timestamp));
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(api('/api/fetch-market-data'));
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const marketData = await response.json();
      setData(marketData);
      setLastUpdate(new Date());
      setOverviewCache(marketData, marketData.marketStatus?.isOpen || false);
    } catch (e: any) {
      console.error('[OverviewMarketData] Fetch error:', e);
      setError(e.message);
      
      const staleCache = localStorage.getItem(OVERVIEW_CACHE_KEY);
      if (staleCache) {
        const parsed = JSON.parse(staleCache);
        setData(parsed.data);
        setLastUpdate(new Date(parsed.timestamp));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      const now = new Date();
      const nyHour = parseInt(now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }));
      const day = now.getDay();
      if (day >= 1 && day <= 5 && nyHour >= 9 && nyHour < 16) {
        fetchData(true);
      }
    }, OVERVIEW_CACHE_DURATION_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, lastUpdate, refetch: () => fetchData(true) };
}

// ============ DATA TRANSFORMATION ============
function transformMarketData(apiData: any): Record<MarketCategory, MarketIndexItem[]> | null {
  if (!apiData) return null;

  const { indices, rates, commodities, sectors } = apiData;

  const usItems: MarketIndexItem[] = [];
  if (indices?.spy) usItems.push({ name: 'S&P 500', symbol: 'SPY', price: indices.spy.price || 0, change: indices.spy.change || 0, changePercent: indices.spy.changePercent || 0 });
  if (indices?.qqq) usItems.push({ name: 'Nasdaq 100', symbol: 'QQQ', price: indices.qqq.price || 0, change: indices.qqq.change || 0, changePercent: indices.qqq.changePercent || 0 });
  if (indices?.dia) usItems.push({ name: 'Dow Jones', symbol: 'DIA', price: indices.dia.price || 0, change: indices.dia.change || 0, changePercent: indices.dia.changePercent || 0 });
  if (indices?.iwm) usItems.push({ name: 'Russell 2000', symbol: 'IWM', price: indices.iwm.price || 0, change: indices.iwm.change || 0, changePercent: indices.iwm.changePercent || 0 });
  if (indices?.vix) usItems.push({ name: 'VIX', symbol: 'VIX', price: indices.vix.price || 0, change: indices.vix.change || 0, changePercent: indices.vix.changePercent || 0 });

  const worldItems: MarketIndexItem[] = [];
  if (sectors?.XLK) worldItems.push({ name: 'Technology', symbol: 'XLK', price: sectors.XLK.price || 0, change: sectors.XLK.change || 0, changePercent: sectors.XLK.changePercent || 0 });
  if (sectors?.XLF) worldItems.push({ name: 'Financials', symbol: 'XLF', price: sectors.XLF.price || 0, change: sectors.XLF.change || 0, changePercent: sectors.XLF.changePercent || 0 });
  if (sectors?.XLE) worldItems.push({ name: 'Energy', symbol: 'XLE', price: sectors.XLE.price || 0, change: sectors.XLE.change || 0, changePercent: sectors.XLE.changePercent || 0 });

  const commodityItems: MarketIndexItem[] = [];
  if (commodities?.gold) commodityItems.push({ name: 'Gold (GLD)', symbol: 'GLD', price: commodities.gold.price || 0, change: commodities.gold.change || 0, changePercent: commodities.gold.changePercent || 0 });
  if (commodities?.oil) commodityItems.push({ name: 'Crude Oil (USO)', symbol: 'USO', price: commodities.oil.price || 0, change: commodities.oil.change || 0, changePercent: commodities.oil.changePercent || 0 });
  if (commodities?.silver) commodityItems.push({ name: 'Silver (SLV)', symbol: 'SLV', price: commodities.silver.price || 0, change: commodities.silver.change || 0, changePercent: commodities.silver.changePercent || 0 });
  if (commodities?.natgas) commodityItems.push({ name: 'Natural Gas (UNG)', symbol: 'UNG', price: commodities.natgas.price || 0, change: commodities.natgas.change || 0, changePercent: commodities.natgas.changePercent || 0 });

  const futuresItems: MarketIndexItem[] = [];
  if (indices?.spy) futuresItems.push({ name: 'ES (S&P 500)', symbol: 'ES', price: (indices.spy.price || 593) * 10, change: (indices.spy.change || 0) * 10, changePercent: indices.spy.changePercent || 0 });
  if (indices?.qqq) futuresItems.push({ name: 'NQ (Nasdaq)', symbol: 'NQ', price: (indices.qqq.price || 505) * 40, change: (indices.qqq.change || 0) * 40, changePercent: indices.qqq.changePercent || 0 });
  if (indices?.dia) futuresItems.push({ name: 'YM (Dow)', symbol: 'YM', price: (indices.dia.price || 428) * 100, change: (indices.dia.change || 0) * 100, changePercent: indices.dia.changePercent || 0 });

  const treasuryItems: MarketIndexItem[] = [];
  if (rates?.us10y) treasuryItems.push({ name: '10Y Yield', symbol: 'US10Y', price: rates.us10y.yield || 0, change: rates.us10y.change || 0, changePercent: rates.us10y.change ? (rates.us10y.change / (rates.us10y.previous || 4.5)) * 100 : 0 });
  if (rates?.us02y) treasuryItems.push({ name: '2Y Yield', symbol: 'US02Y', price: rates.us02y.yield || 0, change: rates.us02y.change || 0, changePercent: rates.us02y.change ? (rates.us02y.change / (rates.us02y.previous || 4.3)) * 100 : 0 });
  if (rates?.us30y) treasuryItems.push({ name: '30Y Yield', symbol: 'US30Y', price: rates.us30y.yield || 0, change: rates.us30y.change || 0, changePercent: rates.us30y.change ? (rates.us30y.change / (rates.us30y.previous || 4.7)) * 100 : 0 });

  return {
    US: usItems.length > 0 ? usItems : getFallbackData('US'),
    World: worldItems.length > 0 ? worldItems : getFallbackData('World'),
    Commodities: commodityItems.length > 0 ? commodityItems : getFallbackData('Commodities'),
    Futures: futuresItems.length > 0 ? futuresItems : getFallbackData('Futures'),
    Treasuries: treasuryItems.length > 0 ? treasuryItems : getFallbackData('Treasuries'),
  };
}

function getFallbackData(category: MarketCategory): MarketIndexItem[] {
  const fallback: Record<MarketCategory, MarketIndexItem[]> = {
    US: [
      { name: 'S&P 500', symbol: 'SPY', price: 593.50, change: -4.21, changePercent: -0.71 },
      { name: 'Nasdaq 100', symbol: 'QQQ', price: 505.25, change: -3.85, changePercent: -0.76 },
      { name: 'Dow Jones', symbol: 'DIA', price: 428.40, change: -3.05, changePercent: -0.71 },
      { name: 'Russell 2000', symbol: 'IWM', price: 226.79, change: -1.91, changePercent: -0.84 },
      { name: 'VIX', symbol: 'VIX', price: 17.35, change: 1.56, changePercent: 9.88 },
    ],
    World: [
      { name: 'Technology', symbol: 'XLK', price: 220.50, change: 1.25, changePercent: 0.57 },
      { name: 'Financials', symbol: 'XLF', price: 45.20, change: -0.32, changePercent: -0.70 },
      { name: 'Energy', symbol: 'XLE', price: 89.75, change: -1.15, changePercent: -1.27 },
    ],
    Commodities: [
      { name: 'Gold (GLD)', symbol: 'GLD', price: 244.30, change: -1.40, changePercent: -0.57 },
      { name: 'Crude Oil (USO)', symbol: 'USO', price: 70.60, change: -0.96, changePercent: -1.34 },
      { name: 'Natural Gas (UNG)', symbol: 'UNG', price: 12.45, change: 0.42, changePercent: 3.49 },
    ],
    Futures: [
      { name: 'ES (S&P 500)', symbol: 'ES', price: 5942.75, change: 12.50, changePercent: 0.21 },
      { name: 'NQ (Nasdaq)', symbol: 'NQ', price: 21485.25, change: 68.75, changePercent: 0.32 },
      { name: 'YM (Dow)', symbol: 'YM', price: 42950, change: 110, changePercent: 0.26 },
    ],
    Treasuries: [
      { name: '10Y Yield', symbol: 'US10Y', price: 4.58, change: 0.04, changePercent: 0.88 },
      { name: '2Y Yield', symbol: 'US02Y', price: 4.35, change: -0.03, changePercent: -0.68 },
      { name: '30Y Yield', symbol: 'US30Y', price: 4.78, change: 0.05, changePercent: 1.06 },
    ],
  };
  return fallback[category];
}

const newsHeadlines = [
  "S&P 500 finishes 2025 with 16% advance",
  "Bulls on Parade", 
  "What analysts are predicting for 2026",
  "Fed signals patience on rate cuts",
];

const CustomTooltip = ({ active, payload, color }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1e222d] border border-[#2a2e39] px-2 py-1 rounded text-xs">
        <p className="text-gray-400">{payload[0].payload.time}</p>
        <p style={{ color }} className="font-semibold tabular-nums">
          {payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

function MarketTickerStrip() {
  const { data: apiData, loading, lastUpdate } = useOverviewMarketData();
  const [category, setCategory] = useState<MarketCategory>('US');
  const [timeframe, setTimeframe] = useState<TimeFrame>('1D');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [isRealData, setIsRealData] = useState(true);
  
  const categories: MarketCategory[] = ['US', 'World', 'Commodities', 'Futures', 'Treasuries'];
  const timeframes: TimeFrame[] = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', '10Y', 'MAX'];
  
  const marketData = useMemo(() => {
    return transformMarketData(apiData) || {
      US: getFallbackData('US'),
      World: getFallbackData('World'),
      Commodities: getFallbackData('Commodities'),
      Futures: getFallbackData('Futures'),
      Treasuries: getFallbackData('Treasuries'),
    };
  }, [apiData]);
  
  const items = marketData[category];
  const selected = items[selectedIdx] || items[0];
  const isPositive = selected?.changePercent >= 0;
  const chartColor = isPositive ? '#22c55e' : '#ef4444';
  
  useEffect(() => {
    if (!selected?.symbol || !selected?.price) return;
    
    let cancelled = false;
    setChartLoading(true);
    
    fetchChartData(selected.symbol, timeframe, selected.price, selected.changePercent)
      .then(result => {
        if (!cancelled) {
          setChartData(result.data);
          setIsRealData(result.isReal);
        }
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });
    
    return () => { cancelled = true; };
  }, [selected?.symbol, selected?.price, selected?.changePercent, timeframe]);
  
  const timeLabels = useMemo(() => {
    if (chartData.length < 3) return ['', '', ''];
    return [
      chartData[0].time,
      chartData[Math.floor(chartData.length / 2)].time,
      chartData[chartData.length - 1].time
    ];
  }, [chartData]);

  const formatTickerPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-[#131722] border border-[#2a2e39] rounded-lg overflow-hidden text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2a2e39]">
        <div className="flex items-center gap-4">
          {categories.map((cat, i) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setSelectedIdx(0); }}
              className={cn(
                "transition-colors flex items-center gap-4",
                category === cat ? "text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              {i > 0 && <span className="text-gray-600">|</span>}
              <span>{cat}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-gray-600 text-[10px]">
              {loading ? '⟳' : '●'} {lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <div className="flex items-center gap-0.5">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-2 py-0.5 rounded transition-colors",
                  timeframe === tf ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex">
        {/* Table */}
        <div className="flex-1">
          {items.map((item, i) => {
            const pos = item.changePercent >= 0;
            return (
              <div
                key={item.symbol}
                onClick={() => setSelectedIdx(i)}
                className={cn(
                  "flex items-center border-b border-[#2a2e39] cursor-pointer",
                  i === selectedIdx ? "bg-[#1e222d]" : "hover:bg-[#1a1d27]"
                )}
              >
                <div className={cn("w-0.5 self-stretch", pos ? "bg-green-500" : "bg-red-500")} />
                <div className="flex-1 py-1.5 px-3 text-gray-200">{item.name}</div>
                <div className="w-24 py-1.5 px-2 text-right text-gray-200 tabular-nums">
                  {formatTickerPrice(item.price)}
                </div>
                <div className={cn("w-20 py-1.5 px-2 text-right tabular-nums", pos ? "text-green-500" : "text-red-500")}>
                  {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}
                </div>
                <div className={cn("w-16 py-1.5 px-2 text-right tabular-nums", pos ? "text-green-500" : "text-red-500")}>
                  {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Chart */}
        <div className="w-[280px] border-l border-[#2a2e39] relative min-h-[200px]">
          <div className="absolute top-2 right-3 text-lg font-semibold text-gray-200 tabular-nums z-10">
            {formatTickerPrice(selected?.price || 0)}
          </div>
          
          <div className="absolute top-2 left-3 z-10">
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded",
              isRealData 
                ? "text-emerald-400 bg-emerald-400/10" 
                : "text-amber-400 bg-amber-400/10"
            )}>
              {isRealData ? 'Live' : 'Simulated'}
            </span>
          </div>
          
          {chartLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#131722]/50 z-20">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          
          <div className="h-full pt-8 pb-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColor} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={chartColor} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={['dataMin', 'dataMax']} hide />
                  <Tooltip 
                    content={<CustomTooltip color={chartColor} />}
                    cursor={{ stroke: '#4b5563', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={chartColor}
                    strokeWidth={1.5}
                    fill="url(#chartGradient)"
                    isAnimationActive={true}
                    animationDuration={200}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : !chartLoading && (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Loading chart...</p>
                </div>
              </div>
            )}
          </div>
          
          {chartData.length > 0 && (
            <div className="absolute bottom-1 left-0 right-0 flex justify-between px-3 text-[10px] text-gray-600">
              <span>{timeLabels[0]}</span>
              <span>{timeLabels[1]}</span>
              <span>{timeLabels[2]}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* News */}
      <div className="flex items-center border-t border-[#2a2e39] text-[11px]">
        <div className="bg-red-600 px-2 py-1 text-white font-bold">In Focus</div>
        <div className="text-orange-400 font-semibold px-2">NEWS</div>
        <div className="flex-1 flex items-center gap-2 px-2 py-1 text-gray-400 overflow-hidden">
          {newsHeadlines.map((h, i) => (
            <span key={i} className="whitespace-nowrap flex items-center gap-2">
              {h}{i < newsHeadlines.length - 1 && <span className="text-gray-600">•</span>}
            </span>
          ))}
        </div>
        <div className="border-l border-[#2a2e39] px-3 py-1 text-gray-500 font-semibold">ANALYSIS</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NEW COMPONENTS
// ═══════════════════════════════════════════════════════════════════

// Market Regime Timeline Component - Elegant version
function MarketRegimeTimeline({ regime, confidence }: { regime: MarketRegime; confidence: number }) {
  const RegimeIcon = regimeStyles[regime].icon;
  
  return (
    <div className="rounded-2xl border border-white/10 bg-base-800/50 backdrop-blur p-5">
      {/* Top row: Current Status + Indicators */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", regimeStyles[regime].bg)}>
            <RegimeIcon className={cn("h-5 w-5", regimeStyles[regime].text)} />
          </div>
          <div>
            <p className="text-xs text-base-500">Market State</p>
            <div className="flex items-center gap-2">
              <span className={cn("text-lg font-semibold capitalize", regimeStyles[regime].text)}>
                {regime.replace('-', ' ')}
              </span>
              <span className="text-xs text-base-500 border border-white/10 px-1.5 py-0.5 rounded">
                {confidence}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <Activity className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-base-400">Vol</span>
            <span className="text-amber-400 font-medium">↑</span>
          </div>
          <span className="text-base-700">|</span>
          <div className="flex items-center gap-1.5 text-sm">
            <Gauge className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-base-400">Liq</span>
            <span className="text-emerald-400 font-medium">●</span>
          </div>
          <span className="text-base-700">|</span>
          <div className="flex items-center gap-1.5 text-sm">
            <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-base-400">Breadth</span>
            <span className="text-blue-400 font-medium">●</span>
          </div>
        </div>
      </div>

      {/* Timeline - Compact */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-base-500">60-day regime</span>
          <Link 
            to="/app/all-markets/regime-history" 
            className="text-xs text-base-500 hover:text-white transition-colors"
          >
            History →
          </Link>
        </div>
        
        {/* Timeline bar */}
        <div className="h-1.5 flex rounded-full overflow-hidden bg-base-700">
          {mockRegimeTimeline.map((point, i) => (
            <div
              key={i}
              className={cn(
                "h-full",
                point.regime === 'risk-on' && "bg-emerald-500",
                point.regime === 'risk-off' && "bg-red-500",
                point.regime === 'transitional' && "bg-amber-500"
              )}
              style={{ width: `${100 / mockRegimeTimeline.length}%` }}
            />
          ))}
        </div>
        
        <div className="flex justify-between mt-1 text-[10px] text-base-600">
          <span>Nov 1</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}

// Today's Market Focus Component - Compact version
function TodaysMarketFocus() {
  return (
    <div className="rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-transparent backdrop-blur px-4 py-3">
      <div className="flex items-start gap-3">
        <Eye className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-white leading-snug">
            {todaysFocus.headline}
          </p>
          <p className="text-xs text-base-400 mt-1">
            {todaysFocus.subtext}
          </p>
        </div>
      </div>
    </div>
  );
}

// Cross-Asset Snapshot Component - Compact inline version
function CrossAssetSnapshot() {
  const getSignalIcon = (signal: AssetSignal) => {
    switch (signal) {
      case 'up': return <ArrowUp className="h-3.5 w-3.5" />;
      case 'down': return <ArrowDown className="h-3.5 w-3.5" />;
      case 'neutral': return <ArrowRight className="h-3.5 w-3.5" />;
    }
  };

  const assets = [
    { key: 'equities', name: 'Equities', data: mockCrossAsset.equities },
    { key: 'bonds', name: 'Bonds', data: mockCrossAsset.bonds },
    { key: 'dollar', name: 'Dollar', data: mockCrossAsset.dollar },
    { key: 'gold', name: 'Gold', data: mockCrossAsset.gold },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-base-800/50 backdrop-blur px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {assets.map(({ key, name, data }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-sm text-base-400">{name}</span>
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                data.signal === 'up' && "text-emerald-400",
                data.signal === 'down' && "text-red-400",
                data.signal === 'neutral' && "text-amber-400"
              )}>
                {getSignalIcon(data.signal)}
                <span className="hidden sm:inline">{data.label}</span>
              </div>
            </div>
          ))}
        </div>
        <Link 
          to="/app/all-markets/cross-asset" 
          className="text-xs text-base-500 hover:text-white transition-colors"
        >
          More →
        </Link>
      </div>
    </div>
  );
}

// Earnings Today Component - Compact inline version
function EarningsToday() {
  const mockEarnings: EarningsStock[] = [
    { symbol: 'NVDA', name: 'NVIDIA Corp', time: 'post', estimate: 0.74 },
    { symbol: 'CRM', name: 'Salesforce', time: 'post', estimate: 2.44 },
    { symbol: 'DELL', name: 'Dell Technologies', time: 'post', estimate: 1.72 },
    { symbol: 'MRVL', name: 'Marvell Tech', time: 'post', estimate: 0.41 },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-base-800/50 backdrop-blur px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-base-400 shrink-0">
          <Calendar className="h-4 w-4 text-purple-400" />
          <span>Earnings</span>
          <span className="text-xs text-base-500">({mockEarnings.length})</span>
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {mockEarnings.map((stock) => (
            <div 
              key={stock.symbol}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <div>
                <span className="font-medium text-sm">{stock.symbol}</span>
                <span className="text-xs text-base-500 ml-1">${stock.estimate}</span>
              </div>
              <Badge 
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  stock.time === 'pre' && "bg-amber-500/20 text-amber-300",
                  stock.time === 'post' && "bg-blue-500/20 text-blue-300",
                  stock.time === 'during' && "bg-emerald-500/20 text-emerald-300"
                )}
              >
                {stock.time === 'pre' ? 'Pre' : stock.time === 'post' ? 'Post' : 'During'}
              </Badge>
            </div>
          ))}
        </div>
        
        <Link 
          to="/app/all-markets/earnings" 
          className="text-xs text-base-500 hover:text-white transition-colors shrink-0 ml-auto"
        >
          Calendar →
        </Link>
      </div>
    </div>
  );
}

// What Matters This Week Component - Key events at a glance
type WeekEvent = {
  event: string;
  day: string;
  date: string;
  time?: string;
  priority: 'critical' | 'high' | 'medium';
  type: 'economic' | 'earnings' | 'fed';
  forecast?: string;
  previous?: string;
};

function WhatMattersThisWeek({ calendarData, earningsData }: { calendarData: any[]; earningsData?: any[] }) {
  // Priority events we care about
  const priorityKeywords = {
    critical: ['CPI', 'NFP', 'FOMC', 'Nonfarm', 'Federal Reserve', 'Interest Rate', 'Fed Chair', 'Core CPI', 'Fed Interest'],
    high: ['ISM', 'GDP', 'PCE', 'Core Inflation', 'Retail Sales', 'Consumer Confidence', 'Unemployment', 'PMI'],
    medium: ['PPI', 'Jobless Claims', 'Initial Claims', 'Durable Goods', 'Housing', 'Existing Home', 'Building Permits', 'Trade Balance']
  };

  // Major earnings we track - these are CRITICAL
  const majorEarnings = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM', 'BAC', 'GS', 'V', 'MA', 'UNH', 'XOM', 'WMT', 'HD', 'PG', 'JNJ', 'CRM', 'NFLX'];

  // Get day name from date
  const getDayName = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } catch {
      return '';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Process calendar data to find this week's key events
  const getThisWeekEvents = (): WeekEvent[] => {
    const events: WeekEvent[] = [];
    
    // Process economic calendar from API
    if (calendarData && calendarData.length > 0) {
      console.log('[WhatMatters] Processing', calendarData.length, 'calendar events');
      
      for (const item of calendarData) {
        // Handle different API response formats - check all possible field names
        const eventName = item.event || item.title || item.name || item.eventName || '';
        const eventDate = item.date || item.datetime || item.time || item.releaseDate || '';
        
        if (!eventName || !eventDate) continue;

        let priority: 'critical' | 'high' | 'medium' | null = null;

        // Check priority based on keywords
        const lowerName = eventName.toLowerCase();
        for (const keyword of priorityKeywords.critical) {
          if (lowerName.includes(keyword.toLowerCase())) {
            priority = 'critical';
            break;
          }
        }
        if (!priority) {
          for (const keyword of priorityKeywords.high) {
            if (lowerName.includes(keyword.toLowerCase())) {
              priority = 'high';
              break;
            }
          }
        }
        if (!priority) {
          for (const keyword of priorityKeywords.medium) {
            if (lowerName.includes(keyword.toLowerCase())) {
              priority = 'medium';
              break;
            }
          }
        }

        // Also check impact level from API (high/medium/low or 3/2/1)
        if (!priority) {
          const impact = item.impact?.toString().toLowerCase();
          if (impact === 'high' || impact === '3') {
            priority = 'high';
          }
        }

        if (priority) {
          // Shorten common event names
          let shortName = eventName
            .replace('Consumer Price Index', 'CPI')
            .replace('Nonfarm Payrolls', 'NFP')
            .replace('Producer Price Index', 'PPI')
            .replace('Initial Jobless Claims', 'Jobless Claims')
            .replace('Federal Open Market Committee', 'FOMC')
            .replace('Gross Domestic Product', 'GDP')
            .replace('Personal Consumption Expenditures', 'PCE')
            .replace('Institute for Supply Management', 'ISM')
            .replace(' (United States)', '')
            .replace(' (US)', '')
            .replace(' - United States', '')
            .replace('(MoM)', 'MoM')
            .replace('(YoY)', 'YoY')
            .replace('(QoQ)', 'QoQ');
          
          if (shortName.length > 30) shortName = shortName.slice(0, 30) + '...';

          events.push({
            event: shortName,
            day: getDayName(eventDate),
            date: eventDate,
            time: item.time || '',
            priority,
            type: lowerName.includes('fed') || lowerName.includes('fomc') ? 'fed' : 'economic',
            forecast: item.forecast?.toString() || item.estimate?.toString() || '',
            previous: item.previous?.toString() || item.prev?.toString() || ''
          });
        }
      }
    }

    // Add major earnings from API
    if (earningsData && earningsData.length > 0) {
      for (const earning of earningsData) {
        const symbol = earning.symbol || earning.ticker || '';
        const eventDate = earning.date || earning.reportDate || '';
        
        if (!symbol || !eventDate) continue;
        
        if (majorEarnings.includes(symbol.toUpperCase())) {
          events.push({
            event: `${symbol.toUpperCase()} Earnings`,
            day: getDayName(eventDate),
            date: eventDate,
            time: earning.time || '',
            priority: 'critical',
            type: 'earnings',
            forecast: earning.epsEstimate ? `Est: $${earning.epsEstimate}` : ''
          });
        }
      }
    }

    // Sort by date first, then by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    events.sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      if (dateA !== dateB) return dateA - dateB;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Remove duplicates by event name
    const seen = new Set();
    const filtered = events.filter(e => {
      const key = e.event.toLowerCase().replace(/\s+/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
    
    return filtered;
  };

  // Generate dynamic fallback data based on current week
  const generateFallbackEvents = (): WeekEvent[] => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const dayOfMonth = today.getDate();
    const weekOfMonth = Math.ceil(dayOfMonth / 7); // 1-4
    
    // Find Monday of this week
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1);
    
    const getDateStr = (daysFromMonday: number) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + daysFromMonday);
      return d.toISOString().split('T')[0];
    };
    
    const getDateObj = (daysFromMonday: number) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + daysFromMonday);
      return d;
    };
    
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const events: WeekEvent[] = [];
    
    // Weekly events (happen every week)
    const weeklyEvents = [
      { day: 3, event: 'Initial Jobless Claims', priority: 'medium' as const },
    ];
    
    // First week of month events
    const week1Events = [
      { day: 0, event: 'ISM Manufacturing PMI', priority: 'high' as const },
      { day: 0, event: 'ISM Services PMI', priority: 'high' as const },
      { day: 2, event: 'ADP Employment Change', priority: 'high' as const },
      { day: 4, event: 'Nonfarm Payrolls', priority: 'critical' as const },
      { day: 4, event: 'Unemployment Rate', priority: 'critical' as const },
    ];
    
    // Second week of month events (CPI week)
    const week2Events = [
      { day: 2, event: 'CPI YoY', priority: 'critical' as const },
      { day: 2, event: 'Core CPI MoM', priority: 'critical' as const },
      { day: 3, event: 'PPI MoM', priority: 'medium' as const },
    ];
    
    // Third week of month events
    const week3Events = [
      { day: 2, event: 'Retail Sales MoM', priority: 'high' as const },
      { day: 3, event: 'Building Permits', priority: 'medium' as const },
    ];
    
    // Fourth week of month events (PCE week)
    const week4Events = [
      { day: 1, event: 'Consumer Confidence', priority: 'medium' as const },
      { day: 3, event: 'GDP QoQ', priority: 'high' as const },
      { day: 4, event: 'PCE Price Index MoM', priority: 'high' as const },
      { day: 4, event: 'Core PCE Price Index', priority: 'critical' as const },
    ];
    
    // Add weekly events
    for (const evt of weeklyEvents) {
      const evtDate = getDateObj(evt.day);
      if (evtDate >= today || evtDate.toDateString() === today.toDateString()) {
        events.push({
          event: evt.event,
          day: dayNames[evt.day],
          date: getDateStr(evt.day),
          priority: evt.priority,
          type: 'economic' as const
        });
      }
    }
    
    // Add week-specific events
    const weekEvents = weekOfMonth === 1 ? week1Events 
                     : weekOfMonth === 2 ? week2Events
                     : weekOfMonth === 3 ? week3Events
                     : week4Events;
    
    for (const evt of weekEvents) {
      const evtDate = getDateObj(evt.day);
      if (evtDate >= today || evtDate.toDateString() === today.toDateString()) {
        events.push({
          event: evt.event,
          day: dayNames[evt.day],
          date: getDateStr(evt.day),
          priority: evt.priority,
          type: 'economic' as const
        });
      }
    }
    
    // Sort by date then priority
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    events.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return events.slice(0, 6);
  };

  const hasRealData = (calendarData && calendarData.length > 0) || (earningsData && earningsData.length > 0);
  const events = hasRealData ? getThisWeekEvents() : [];
  const displayEvents = events.length > 0 ? events : generateFallbackEvents();

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">HIGH</span>;
      case 'high': return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">MED</span>;
      default: return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fed': return <Target className="h-3.5 w-3.5 text-blue-400" />;
      case 'earnings': return <TrendingUp className="h-3.5 w-3.5 text-purple-400" />;
      default: return <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-base-800/50 backdrop-blur overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-white">What Matters This Week</span>
        </div>
        <Link 
          to="/app/all-markets/calendar" 
          className="text-xs text-base-500 hover:text-white transition-colors"
        >
          Full Calendar →
        </Link>
      </div>
      
      {/* Table Header */}
      <div className="flex items-center px-4 py-2 text-[10px] text-base-500 border-b border-white/5 bg-white/5">
        <div className="w-16">Day</div>
        <div className="flex-1">Event</div>
        <div className="w-20 text-right">Forecast</div>
        <div className="w-20 text-right">Previous</div>
        <div className="w-12"></div>
      </div>

      {/* Events List */}
      <div className="divide-y divide-white/5">
        {displayEvents.map((evt, idx) => (
          <div 
            key={idx}
            className={cn(
              "flex items-center px-4 py-2.5 text-xs hover:bg-white/5 transition-colors",
              evt.priority === 'critical' && "bg-red-500/5"
            )}
          >
            {/* Day */}
            <div className="w-16 text-base-400">
              <span className="font-medium">{evt.day}</span>
              <span className="text-[10px] text-base-600 ml-1">{formatDate(evt.date)}</span>
            </div>
            
            {/* Event Name with Icon */}
            <div className="flex-1 flex items-center gap-2">
              {getTypeIcon(evt.type)}
              <span className={cn(
                "font-medium",
                evt.priority === 'critical' ? "text-white" : "text-base-300"
              )}>
                {evt.event}
              </span>
            </div>
            
            {/* Forecast */}
            <div className="w-20 text-right text-base-400 tabular-nums">
              {evt.forecast || '-'}
            </div>
            
            {/* Previous */}
            <div className="w-20 text-right text-base-500 tabular-nums">
              {evt.previous || '-'}
            </div>
            
            {/* Priority Badge */}
            <div className="w-12 text-right">
              {getPriorityBadge(evt.priority)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Macro Economic News Component - Uses real API data
function MacroNews({ newsData, loading }: { newsData: any[]; loading: boolean }) {
  // Fallback mock data if API doesn't return news
  const fallbackNews = [
    { 
      headline: 'Fed signals patience on rate cuts amid sticky inflation', 
      source: 'Reuters', 
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      impact: 'high',
      image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&h=120&fit=crop'
    },
    { 
      headline: 'US jobless claims fall to 211,000, labor market remains tight', 
      source: 'Bloomberg', 
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      impact: 'medium',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&h=120&fit=crop'
    },
    { 
      headline: 'Treasury yields rise as investors digest economic data', 
      source: 'WSJ', 
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      impact: 'high',
      image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=200&h=120&fit=crop'
    },
    { 
      headline: 'ECB holds rates steady, signals data-dependent approach', 
      source: 'FT', 
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      impact: 'medium',
      image: 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=200&h=120&fit=crop'
    },
  ];

  const news = newsData.length > 0 ? newsData : fallbackNews;

  // Image mapping based on keywords
  const getImageForNews = (headline: string, existingImage?: string) => {
    if (existingImage) return existingImage;
    const h = headline.toLowerCase();
    if (h.includes('fed') || h.includes('rate')) return 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&h=120&fit=crop';
    if (h.includes('job') || h.includes('employ')) return 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&h=120&fit=crop';
    if (h.includes('china') || h.includes('asia')) return 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=200&h=120&fit=crop';
    if (h.includes('yield') || h.includes('treasury') || h.includes('bond')) return 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=200&h=120&fit=crop';
    if (h.includes('europe') || h.includes('ecb')) return 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=200&h=120&fit=crop';
    if (h.includes('oil') || h.includes('energy')) return 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=200&h=120&fit=crop';
    if (h.includes('tech') || h.includes('apple') || h.includes('nvidia')) return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=120&fit=crop';
    return 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&h=120&fit=crop';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <Card className="rounded-2xl border-white/10 bg-base-800/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Newspaper className="h-5 w-5 text-amber-400" />
            Macro & Economic News
          </div>
          <Link 
            to="/app/all-markets/news" 
            className="text-xs font-normal text-base-500 hover:text-white transition-colors"
          >
            All News →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="divide-y divide-white/5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-4 py-3">
                <div className="w-28 h-20 rounded-lg bg-white/10 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-white/10 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {news.slice(0, 6).map((item: any, idx: number) => (
              <a 
                key={idx}
                href={item.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="shrink-0 w-28 h-20 rounded-lg overflow-hidden bg-base-700">
                  <img 
                    src={getImageForNews(item.headline, item.image)} 
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&h=120&fit=crop';
                    }}
                  />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-snug line-clamp-2 hover:text-blue-400 transition-colors font-medium">
                    {item.headline}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-base-400">{item.source}</span>
                    <span className="text-base-600">•</span>
                    <span className="text-xs text-base-500">{formatTime(item.timestamp)}</span>
                    {item.impact === 'high' && (
                      <>
                        <span className="text-base-600">•</span>
                        <span className="text-[10px] text-amber-400 font-medium bg-amber-400/10 px-1.5 py-0.5 rounded">High Impact</span>
                      </>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
        <div className="border-t border-white/10 p-3">
          <Link 
            to="/app/all-markets/news" 
            className="flex items-center justify-center gap-1 text-sm text-base-400 hover:text-white transition-colors"
          >
            View all macro news <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MARKET MOVERS WIDGET (CNN Style)
// ═══════════════════════════════════════════════════════════════════

type MoverTab = 'ACTIVES' | 'GAINERS' | 'LOSERS';

function MarketMoversWidget({ 
  data, 
  loading 
}: { 
  data: MoversResp | null; 
  loading: boolean;
}) {
  const [activeTab, setActiveTab] = useState<MoverTab>('ACTIVES');
  
  const tabs: MoverTab[] = ['ACTIVES', 'GAINERS', 'LOSERS'];
  
  const getTabData = () => {
    if (!data) return [];
    switch (activeTab) {
      case 'ACTIVES': return data.mostActive || [];
      case 'GAINERS': return data.gainers || [];
      case 'LOSERS': return data.losers || [];
    }
  };
  
  const movers = getTabData().slice(0, 15);
  const lastUpdate = data?.ts ? new Date(data.ts) : null;

  // Format volume (e.g., 1.2M, 500K)
  const formatVol = (vol: number | undefined) => {
    if (!vol) return '-';
    if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
    return vol.toString();
  };

  return (
    <div className="rounded-xl border border-white/10 bg-base-800/50 backdrop-blur overflow-hidden flex flex-col">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <Link 
          to="/app/all-markets/movers" 
          className="flex items-center gap-1.5 text-sm font-medium text-white hover:text-blue-400 transition-colors"
        >
          Market Movers →
        </Link>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-2 py-1 text-[10px] font-medium transition-colors rounded",
                activeTab === tab 
                  ? "bg-white text-black" 
                  : "text-base-500 hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      
      {/* Table Header */}
      <div className="flex items-center px-3 py-1.5 text-[10px] text-base-500 border-b border-white/5 bg-white/5">
        <div className="flex-1">Symbol</div>
        <div className="w-14 text-right">Price</div>
        <div className="w-12 text-right">Vol</div>
        <div className="w-14 text-right">Chg%</div>
      </div>
      
      {/* Table Body */}
      <div className="flex-1">
        {loading ? (
          [...Array(15)].map((_, i) => (
            <div key={i} className="flex items-center px-3 py-2 border-b border-white/5">
              <div className="h-3 w-10 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-10 ml-auto animate-pulse rounded bg-white/10" />
              <div className="h-3 w-8 ml-2 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-10 ml-2 animate-pulse rounded bg-white/10" />
            </div>
          ))
        ) : movers.length > 0 ? (
          movers.map((m, i) => {
            const isPositive = (m.chp || 0) >= 0;
            return (
              <div 
                key={m.symbol + String(i)} 
                className="flex items-center px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors text-xs"
              >
                <Link 
                  to={`/app/stock/${m.symbol}`}
                  className="flex-1 font-medium text-blue-400 hover:underline"
                >
                  {m.symbol}
                </Link>
                <div className="w-14 text-right text-base-400 tabular-nums">
                  {m.price != null ? m.price.toFixed(2) : '-'}
                </div>
                <div className="w-12 text-right text-base-500 tabular-nums text-[10px]">
                  {formatVol(m.volume)}
                </div>
                <div className={cn(
                  "w-14 text-right font-medium tabular-nums",
                  isPositive ? "text-emerald-500" : "text-red-500"
                )}>
                  {m.chp != null ? `${isPositive ? '+' : ''}${m.chp.toFixed(2)}%` : '-'}
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-3 py-8 text-center text-sm text-base-500">
            No data available
          </div>
        )}
      </div>
      
      {/* Footer */}
      {lastUpdate && (
        <div className="px-3 py-1.5 text-[9px] text-base-600 border-t border-white/5">
          Updated {lastUpdate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function AllMarketsOverview() {
  const [marketData, setMarketData] = useState<any>(null);
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [earningsData, setEarningsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { regime, confidence } = determineRegime();

  useEffect(() => {
    let ok = true;
    
    const fetchAllData = async () => {
      try {
        // Main market data - includes calendar and earnings from Finnhub/FRED
        const marketRes = await fetch(api('/api/fetch-market-data'));
        const market = marketRes.ok ? await marketRes.json() : null;
        
        console.log('[Overview] Market data received:', {
          hasHeatmap: !!market?.heatmapData,
          heatmapCount: market?.heatmapData?.count || 0,
          hasCalendar: !!market?.calendar,
          calendarCount: market?.calendar?.length || 0,
          hasEarnings: !!market?.earnings,
          earningsCount: market?.earnings?.length || 0,
        });
        
        // Try to get calendar from dedicated endpoints if not in main response
        let calData = market?.calendar || [];
        let earnData = market?.earnings || [];
        
        // If no calendar data, try alternate endpoints
        if (calData.length === 0) {
          const calendarEndpoints = [
            '/api/events/economic?dateFilter=thisWeek',
            '/api/calendar/economic?dateFilter=thisWeek',
            '/api/all-markets/events?tab=economic&dateFilter=thisWeek',
          ];
          
          for (const endpoint of calendarEndpoints) {
            try {
              const res = await fetch(api(endpoint));
              if (res.ok) {
                const data = await res.json();
                const events = data?.events || data?.economic || (Array.isArray(data) ? data : []);
                if (events.length > 0) {
                  console.log('[Overview] Found calendar data from:', endpoint);
                  calData = events;
                  break;
                }
              }
            } catch (e) {
              // Try next endpoint
            }
          }
        }
        
        if (ok) {
          setMarketData(market);
          setCalendarData(calData);
          setEarningsData(earnData);
        }
      } catch (err) {
        console.error('[Overview] Fetch error:', err);
      } finally {
        if (ok) setLoading(false);
      }
    };
    
    fetchAllData();
    return () => { ok = false };
  }, []);

  // Transform market data into movers format
  // Primary: heatmapData (thousands of stocks), Fallback: sectorRanking + stocks + indices
  const moversData = useMemo((): MoversResp => {
    if (!marketData) {
      return { gainers: [], losers: [], mostActive: [], ts: Date.now() };
    }
    
    let allItems: Mover[] = [];
    
    // Primary: Use heatmapData which has thousands of real-time stock snapshots
    const heatmap = marketData.heatmapData?.tickers;
    
    if (heatmap && typeof heatmap === 'object' && Object.keys(heatmap).length > 0) {
      allItems = Object.entries(heatmap)
        .filter(([symbol, data]: [string, any]) => {
          return data?.price && 
                 data.price > 1 && 
                 data.changePercent !== undefined &&
                 data.changePercent !== null &&
                 !symbol.includes('.') &&
                 symbol.length <= 5;
        })
        .map(([symbol, data]: [string, any]) => ({
          symbol,
          price: data.price,
          chp: data.changePercent,
          volume: data.volume || 0
        }));
      
      console.log(`[Movers] Loaded ${allItems.length} stocks from heatmap`);
    }
    
    // Fallback: Combine all available data sources
    if (allItems.length === 0) {
      // Sectors
      const sectors = marketData.sectorRanking || [];
      for (const s of sectors) {
        if (s?.symbol && s?.price !== undefined) {
          allItems.push({
            symbol: s.symbol,
            price: s.price,
            chp: s.changePercent ?? s.change ?? 0,
            volume: s.volume || 0
          });
        }
      }
      
      // Stocks
      const stocks = marketData.stocks || {};
      for (const [sym, data] of Object.entries(stocks)) {
        const d = data as any;
        if (d?.price !== undefined) {
          allItems.push({
            symbol: sym.toUpperCase(),
            price: d.price,
            chp: d.changePercent ?? d.change ?? 0,
            volume: d.volume || 0
          });
        }
      }
      
      // Indices
      const indices = marketData.indices || {};
      const indexMap: Record<string, string> = { spy: 'SPY', qqq: 'QQQ', dia: 'DIA', iwm: 'IWM' };
      for (const [key, data] of Object.entries(indices)) {
        const d = data as any;
        if (d?.price !== undefined) {
          allItems.push({
            symbol: d.symbol || indexMap[key] || key.toUpperCase(),
            price: d.price,
            chp: d.changePercent ?? d.change ?? 0,
            volume: d.volume || 0
          });
        }
      }
    }
    
    // Remove duplicates
    const seen = new Set<string>();
    allItems = allItems.filter(item => {
      if (seen.has(item.symbol)) return false;
      seen.add(item.symbol);
      return true;
    });
    
    // Sort for different tabs
    const gainers = [...allItems]
      .filter(s => s.chp !== null && s.chp !== undefined && s.chp > 0)
      .sort((a, b) => (b.chp || 0) - (a.chp || 0))
      .slice(0, 20);
    
    const losers = [...allItems]
      .filter(s => s.chp !== null && s.chp !== undefined && s.chp < 0)
      .sort((a, b) => (a.chp || 0) - (b.chp || 0))
      .slice(0, 20);
    
    let mostActive = [...allItems]
      .filter(s => (s.volume || 0) > 0)
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, 20);
    
    if (mostActive.length === 0) {
      mostActive = [...allItems]
        .sort((a, b) => Math.abs(b.chp || 0) - Math.abs(a.chp || 0))
        .slice(0, 20);
    }
    
    return { gainers, losers, mostActive, ts: Date.now() };
  }, [marketData]);

  // Get corporate news for Macro News section
  const newsData = useMemo(() => {
    if (!marketData?.corporate_news) {
      return [];
    }
    return marketData.corporate_news.slice(0, 6);
  }, [marketData]);

  // calendarData and earningsData are now fetched separately and stored in state

  return (
    <div className="space-y-4 pb-8">
      {/* Market Regime Timeline */}
      <MarketRegimeTimeline regime={regime} confidence={confidence} />

      {/* Market Ticker Strip */}
      <MarketTickerStrip />

      {/* Main Content Grid: Left stacked content + Right Movers (full height) */}
      <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
        {/* Left Column: All content stacked */}
        <div className="space-y-4">
          {/* Today's Focus */}
          <TodaysMarketFocus />
          
          {/* Cross-Asset Snapshot */}
          <CrossAssetSnapshot />
          
          {/* Earnings Today */}
          <EarningsToday />
          
          {/* What Matters This Week - Key Events */}
          <WhatMattersThisWeek calendarData={calendarData} earningsData={earningsData} />
          
          {/* Macro Economic News */}
          <MacroNews newsData={newsData} loading={loading} />
        </div>
        
        {/* Right Column: Market Movers Widget - Sticky, full height */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <MarketMoversWidget data={moversData} loading={loading} />
        </div>
      </div>
    </div>
  );
}