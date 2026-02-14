// src/services/stock-analyzer.api.ts
// =====================================================
// 🔌 STOCK ANALYZER — API Service v2.2
//    Earnings-Based Smart Caching + Full Valuation Derivation
// =====================================================
// v2.2 FIXES:
//   ✅ Forward P/E — fetches from new /forward-estimates endpoint
//   ✅ PEG Ratio — fetches from new /forward-estimates endpoint
//   ✅ Revenue — pulled from backend (f.revenue)
//   ✅ FCF Yield — calculated from freeCashFlowPerShare / price
//   ✅ EV/EBITDA — fallback: calculate from raw data
//   ✅ EV/Revenue — fallback: calculate from raw data
//   ✅ P/E — fallback: calculate from marketCap / netIncome
//   ✅ Negative earnings handled properly
// =====================================================

import type { StockData, NewsItem } from '@/types/stock-analyzer.types';
import { stockCache, getNextEarningsDate } from './stock-analyzer.cache';

const API_BASE = '/api/market-data';

// =====================================================
// SAFE FETCH
// =====================================================

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// =====================================================
// SERVER CACHE HELPERS
// =====================================================

export async function saveToServerCache(
  ticker: string,
  type: string,
  data: any,
  earningsDate?: string | null
) {
  try {
    await fetch(`/api/stock-cache/${ticker}/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, earningsDate: earningsDate || null }),
    });
  } catch { /* non-critical */ }
}

export async function getServerCache<T>(
  ticker: string,
  type: string
): Promise<T | null> {
  try {
    const res = await fetch(`/api/stock-cache/${ticker}/${type}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success && json.cached && json.data ? json.data : null;
  } catch {
    return null;
  }
}

// =====================================================
// MAIN FETCH — Parallel with earnings-based caching
// =====================================================

export async function fetchAllStockData(ticker: string): Promise<StockData> {
  const symbol = ticker.toUpperCase();

  // Step 1: Get next earnings date (cached for 24h)
  const nextEarningsDate = await getNextEarningsDate(symbol);

  // Step 2: Fetch all endpoints in parallel
  // Quote is ALWAYS fresh; the rest use earnings-based cache
  const [quoteRaw, companyRaw, financialsRaw, analystRaw, forwardEstRaw] = await Promise.all([
    // ❌ Quote — ALWAYS FRESH
    safeFetch<any>(`${API_BASE}/quote-extended/${symbol}`),

    // ✅ Company — cached until next earnings
    stockCache.getOrFetch(
      `${symbol}:company`,
      () => safeFetch<any>(`${API_BASE}/company/${symbol}`),
      symbol,
      nextEarningsDate
    ),

    // ✅ Financials — cached until next earnings
    stockCache.getOrFetch(
      `${symbol}:financials`,
      () => safeFetch<any>(`${API_BASE}/financials/${symbol}`),
      symbol,
      nextEarningsDate
    ),

    // ✅ Analyst — cached until next earnings
    stockCache.getOrFetch(
      `${symbol}:analyst`,
      () => safeFetch<any>(`${API_BASE}/analyst/${symbol}`),
      symbol,
      nextEarningsDate
    ),

    // ✅ Forward estimates — cached until next earnings
    stockCache.getOrFetch(
      `${symbol}:forwardEst`,
      () => safeFetch<any>(`${API_BASE}/forward-estimates/${symbol}`),
      symbol,
      nextEarningsDate
    ),
  ]);

  const q = quoteRaw || {};
  const co = companyRaw || {};
  const f = financialsRaw || {};
  const a = analystRaw || {};
  const fwd = forwardEstRaw || {};

  const dataSources: string[] = [];
  if (quoteRaw) dataSources.push('quote');
  if (companyRaw) dataSources.push('company');
  if (financialsRaw) dataSources.push('financials');
  if (analystRaw) dataSources.push('analyst');
  if (forwardEstRaw) dataSources.push('forwardEst');

  // ═══════════════════════════════════════════════════
  // DERIVE VALUATION METRICS from raw data
  // ═══════════════════════════════════════════════════

  const price = q.price || 0;
  const marketCap = q.marketCap || co.marketCap || 0;

  // --- Raw financials from backend ---
  const revenue = f.revenue || null;
  const netIncome = f.netIncome || null;
  const totalEquity = f.totalEquity || null;
  const totalLiabilities = f.totalLiabilities || null;
  const operatingIncome = f.operatingIncome || null;
  const sharesOutstanding = f.sharesOutstanding || co.weightedSharesOutstanding || co.shareClassSharesOutstanding || null;
  const fcfPerShare = f.freeCashFlowPerShare || null;
  const epsGrowthVal = f.epsGrowth || q.epsGrowth || fwd.epsGrowth || null;

  // --- P/E (TTM): API → calculate from marketCap / netIncome ---
  const pe = f.peRatio || q.pe || (() => {
    if (netIncome && netIncome !== 0 && marketCap > 0) {
      return marketCap / netIncome;
    }
    return null;
  })();

  // --- Forward P/E: forward-estimates endpoint → backend FMP → estimate ---
  const forwardPe = fwd.forwardPe || f.forwardPe || (() => {
    // Fallback: estimate from trailing P/E + EPS growth
    if (pe && pe > 0 && epsGrowthVal && epsGrowthVal > 0) {
      return pe / (1 + epsGrowthVal / 100);
    }
    return null;
  })();

  // --- P/S: API → calculate from marketCap / revenue ---
  const ps = f.priceToSales || q.priceToSales || (() => {
    if (revenue && revenue > 0 && marketCap > 0) {
      return marketCap / revenue;
    }
    return null;
  })();

  // --- P/B: API → calculate from marketCap / totalEquity ---
  const pb = f.priceToBook || q.priceToBook || (() => {
    if (totalEquity && totalEquity > 0 && marketCap > 0) {
      return marketCap / totalEquity;
    }
    return null;
  })();

  // --- Enterprise Value ---
  const ev = (() => {
    if (marketCap > 0 && totalLiabilities && totalLiabilities > 0) {
      return marketCap + totalLiabilities;
    }
    if (marketCap > 0) return marketCap;
    return null;
  })();

  // --- EV/EBITDA ---
  const evEbitda = f.evToEbitda || (() => {
    if (ev && operatingIncome && operatingIncome > 0) {
      return ev / operatingIncome;
    }
    return null;
  })();

  // --- EV/Revenue ---
  const evRevenue = f.evToRevenue || (() => {
    if (ev && revenue && revenue > 0) {
      return ev / revenue;
    }
    return null;
  })();

  // --- PEG Ratio: forward-estimates → API → calculate ---
  const pegRatio = fwd.pegRatio || f.pegRatio || (() => {
    if (pe && pe > 0 && epsGrowthVal && epsGrowthVal > 0) {
      return pe / epsGrowthVal;
    }
    return null;
  })();

  // --- FCF Yield ---
  const fcfYield = (() => {
    if (fcfPerShare != null && price > 0) {
      return (fcfPerShare / price) * 100;
    }
    return null;
  })();

  return {
    ticker: symbol,
    name: co.name || symbol,
    description: co.description || '',
    sector: co.sector || co.industry || 'N/A',
    industry: co.industry || co.sector || 'N/A',
    exchange: co.exchange || q.exchange || 'N/A',
    website: co.website || null,
    logo: co.logo || null,
    employees: co.employees || null,
    headquarters: co.headquarters || null,
    listDate: co.listDate || co.ipo || null,

    price,
    change: q.change || 0,
    changePercent: q.changePercent || 0,
    previousClose: q.previousClose || 0,
    open: q.open || 0,
    dayHigh: q.high || 0,
    dayLow: q.low || 0,
    volume: q.volume || 0,
    avgVolume: q.avgVolume || 0,
    marketCap,
    week52High: q.high52w || null,
    week52Low: q.low52w || null,
    beta: f.beta || q.beta || null,
    marketStatus: q.marketStatus || 'unknown',

    pe,
    forwardPe,
    ps,
    pb,
    evEbitda,
    evRevenue,
    pegRatio,
    revenue,
    revenueGrowth: f.revenueGrowth || q.revenueGrowth || null,
    netIncomeGrowth: f.netIncomeGrowth || null,
    epsGrowth: epsGrowthVal,
    grossMargin: f.grossMargin || q.grossMargin || null,
    operatingMargin: f.operatingMargin || q.operatingMargin || null,
    netMargin: f.netMargin || q.netMargin || null,
    roe: f.roe || q.roe || null,
    roa: f.roa || q.roa || null,
    roic: f.roic || null,
    debtToEquity: f.debtToEquity || q.debtToEquity || null,
    debtToAssets: f.debtToAssets || null,
    currentRatio: f.currentRatio || q.currentRatio || null,
    quickRatio: f.quickRatio || null,
    fcfYield,
    freeCashFlowPerShare: fcfPerShare,
    revenuePerShare: f.revenuePerShare || null,
    bookValuePerShare: f.bookValuePerShare || null,
    eps: q.eps || null,

    dividendYield: f.dividendYield || q.dividendYield || null,
    dividendPerShare: f.dividendPerShare || null,
    payoutRatio: f.payoutRatio || null,

    analystRating: a.rating?.consensus || null,
    analystBreakdown: a.rating || null,
    priceTarget: a.priceTarget?.targetMedian || a.priceTarget?.targetMean || null,
    priceTargetHigh: a.priceTarget?.targetHigh || null,
    priceTargetLow: a.priceTarget?.targetLow || null,
    numberOfAnalysts: a.priceTarget?.numberOfAnalysts || a.rating?.total || 0,

    lastUpdated: new Date().toISOString(),
    nextEarningsDate: nextEarningsDate || null,
    dataSources,
  };
}

// =====================================================
// NEWS FETCH — Always fresh (no cache)
// =====================================================

function guessSentiment(title: string): 'positive' | 'negative' | 'neutral' {
  const t = title.toLowerCase();
  const pos = ['beats', 'record', 'surge', 'rally', 'gain', 'upgrade', 'strong', 'growth', 'profit', 'rises', 'jumps', 'soars', 'outperform', 'bullish'];
  const neg = ['miss', 'drop', 'fall', 'decline', 'cut', 'downgrade', 'loss', 'weak', 'slump', 'plunge', 'warn', 'risk', 'bearish', 'layoff'];
  if (pos.some(w => t.includes(w))) return 'positive';
  if (neg.some(w => t.includes(w))) return 'negative';
  return 'neutral';
}

export async function fetchNews(ticker: string): Promise<NewsItem[]> {
  const symbol = ticker.toUpperCase();

  const data = await safeFetch<any>(
    `/api/news/by-symbol?symbol=${symbol}&limit=10`
  );

  if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
    return data.items.map((n: any, i: number) => ({
      id: `${i}`,
      title: n.title || '',
      description: '',
      source: n.source || 'Unknown',
      url: n.url || '#',
      publishedAt: n.publishedAt || new Date().toISOString(),
      tickers: [symbol],
      imageUrl: null,
      sentiment: n.sentiment?.toLowerCase() === 'positive' ? 'positive' as const
        : n.sentiment?.toLowerCase() === 'negative' ? 'negative' as const
        : guessSentiment(n.title || ''),
    }));
  }

  const fallback = await safeFetch<any>(
    `/api/overview/news/by-symbol?symbol=${symbol}&limit=10`
  );

  if (fallback?.items && Array.isArray(fallback.items) && fallback.items.length > 0) {
    return fallback.items.map((n: any, i: number) => ({
      id: `${i}`,
      title: n.title || '',
      description: '',
      source: n.source || 'Unknown',
      url: n.url || '#',
      publishedAt: n.publishedAt || new Date().toISOString(),
      tickers: [symbol],
      imageUrl: null,
      sentiment: guessSentiment(n.title || ''),
    }));
  }

  return [];
}