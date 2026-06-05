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
import { authFetch } from '@/utils/authFetch';

const API_BASE = `${import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app'}/api/market-data`;

// =====================================================
// SEC-FUNDAMENTALS EDGE FUNCTION
// =====================================================
// Returns company + financials from public-domain SEC/EDGAR data.
// URL: ${SUPABASE_URL}/functions/v1/sec-fundamentals?symbol=<SYM>&price=<lastClose>
// Response shape (relevant fields):
//   company: { symbol, name, sector, industry, website, logo, cik, exchange }
//   financials: { revenue, netIncome, eps, grossMargin, operatingMargin, netMargin,
//     roe, roa, debtToEquity, currentRatio, fcf, fcfPerShare, ebitda,
//     revenueGrowth, netIncomeGrowth, epsGrowth, peRatio, priceToBook,
//     priceToSales, evToEbitda, evToRevenue, totalEquity, totalLiabilities,
//     operatingIncome, sharesOutstanding, confidence, ... }
//   source: 'sec'
// =====================================================

interface SecFundamentalsCompany {
  symbol?: string;
  name?: string;
  sector?: string;
  industry?: string;
  website?: string | null;
  logo?: string | null;
  cik?: string;
  exchange?: string;
}

interface SecFundamentalsFinancials {
  revenue?: number | null;
  netIncome?: number | null;
  eps?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  roe?: number | null;
  roa?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  fcf?: number | null;
  fcfPerShare?: number | null;
  ebitda?: number | null;
  revenueGrowth?: number | null;
  netIncomeGrowth?: number | null;
  epsGrowth?: number | null;
  peRatio?: number | null;
  priceToBook?: number | null;
  priceToSales?: number | null;
  evToEbitda?: number | null;
  evToRevenue?: number | null;
  totalEquity?: number | null;
  totalLiabilities?: number | null;
  operatingIncome?: number | null;
  sharesOutstanding?: number | null;
  confidence?: string | null;
  // Additional fields the edge function may return
  [key: string]: unknown;
}

interface SecFundamentalsResponse {
  company: SecFundamentalsCompany;
  financials: SecFundamentalsFinancials;
  source: string;
  meta?: { errors?: string[] };
}

async function fetchSecFundamentals(
  symbol: string,
  lastClosePrice: number | null,
): Promise<SecFundamentalsResponse | null> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  let url = `${SUPABASE_URL}/functions/v1/sec-fundamentals?symbol=${encodeURIComponent(symbol)}`;
  if (lastClosePrice != null && lastClosePrice > 0) {
    url += `&price=${lastClosePrice}`;
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as SecFundamentalsResponse;
    // Validate minimal shape
    if (!json?.company || !json?.financials) return null;
    return json;
  } catch {
    return null;
  }
}
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

const TYPE_BODY_KEY: Record<string, string> = {
  'brief': 'briefData',
  'valuation': 'valuationData',
  'data': 'marketData',
  'analyst': 'analystData',
  'quote': 'quoteData',
  'earnings-tab': 'earningsData',
  'wallstreet': 'wallStreetData',
  'quarterly': 'quarterlyData',
  'investor-profile': 'profileData',
};

export async function saveToServerCache(
  ticker: string,
  type: string,
  data: any,
  earningsDate?: string | null
) {
  try {
    const BASE = import.meta.env.VITE_API_URL || '';
    const bodyKey = TYPE_BODY_KEY[type] ?? 'data';
await authFetch(`${BASE}/api/stock-cache/${ticker}/${type}`, {      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [bodyKey]: data, earningsDate: earningsDate || null }),
    });
  } catch { /* non-critical */ }
}

export async function getServerCache<T>(
  ticker: string,
  type: string
): Promise<T | null> {
  try {
    const BASE = import.meta.env.VITE_API_URL || '';
const res = await authFetch(`${BASE}/api/stock-cache/${ticker}/${type}`);    if (!res.ok) return null;
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

  // Step 2: Fetch quote, analyst, and forward-estimates from Railway;
  // fetch company+financials from the sec-fundamentals edge function (SEC public data).
  // Quote is ALWAYS fresh; analyst/forwardEst use earnings-based cache.
  const [quoteRaw, analystRaw, forwardEstRaw] = await Promise.all([
    // ❌ Quote — ALWAYS FRESH
    safeFetch<any>(`${API_BASE}/quote-extended/${symbol}`),

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

  // Step 3: Fetch company + financials from sec-fundamentals edge function.
  // Pass lastClose from the quote so the edge function can derive PE and ratios.
  // Uses earnings-based cache; falls back to Railway on failure.
  const quotePrice: number | null = (quoteRaw?.price as number | undefined) ?? null;
  const secRaw = await stockCache.getOrFetch<SecFundamentalsResponse | null>(
    `${symbol}:sec-fundamentals`,
    () => fetchSecFundamentals(symbol, quotePrice),
    symbol,
    nextEarningsDate,
  );

  // Fallback to Railway if SEC edge returned nothing useful
  const secOk = secRaw != null && (secRaw.company?.name || secRaw.financials?.revenue != null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- settled to any so downstream property accesses remain unchanged
  let companyRaw: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let financialsRaw: any;

  if (secOk) {
    // Map SEC edge response → the shape the rest of this function expects
    const secCo = secRaw!.company;
    const secFin = secRaw!.financials;

    companyRaw = {
      name:                     secCo.name,
      sector:                   secCo.sector,
      industry:                 secCo.industry,
      website:                  secCo.website,
      logo:                     secCo.logo,
      exchange:                 secCo.exchange,
      // SEC does not provide employee count or HQ — keep null
      employees:                null,
      headquarters:             null,
      listDate:                 null,
      // marketCap not from SEC — will fall through to quote
      marketCap:                null,
    } as Record<string, unknown>;

    financialsRaw = {
      revenue:              secFin.revenue,
      netIncome:            secFin.netIncome,
      eps:                  secFin.eps,
      grossMargin:          secFin.grossMargin,
      operatingMargin:      secFin.operatingMargin,
      netMargin:            secFin.netMargin,
      roe:                  secFin.roe,
      roa:                  secFin.roa,
      debtToEquity:         secFin.debtToEquity,
      currentRatio:         secFin.currentRatio,
      // Edge function returns `fcf` (TTM) and `fcfPerShare`
      freeCashFlowPerShare: secFin.fcfPerShare,
      ebitda:               secFin.ebitda,
      revenueGrowth:        secFin.revenueGrowth,
      netIncomeGrowth:      secFin.netIncomeGrowth,
      epsGrowth:            secFin.epsGrowth,
      peRatio:              secFin.peRatio,
      priceToBook:          secFin.priceToBook,
      priceToSales:         secFin.priceToSales,
      evToEbitda:           secFin.evToEbitda,
      evToRevenue:          secFin.evToRevenue,
      totalEquity:          secFin.totalEquity,
      totalLiabilities:     secFin.totalLiabilities,
      operatingIncome:      secFin.operatingIncome,
      sharesOutstanding:    secFin.sharesOutstanding,
      // Fields not in SEC edge → null (UI renders "—" for null)
      beta:                 null,
      dividendYield:        null,
      dividendPerShare:     null,
      payoutRatio:          null,
      roic:                 null,
      debtToAssets:         null,
      quickRatio:           null,
      revenuePerShare:      null,
      bookValuePerShare:    null,
      forwardPe:            null,
      pegRatio:             null,
    } as Record<string, unknown>;
  } else {
    // Graceful fallback: Railway endpoints (original path)
    const [railwayCompany, railwayFinancials] = await Promise.all([
      stockCache.getOrFetch(
        `${symbol}:company`,
        () => safeFetch<any>(`${API_BASE}/company/${symbol}`),
        symbol,
        nextEarningsDate,
      ),
      stockCache.getOrFetch(
        `${symbol}:financials`,
        () => safeFetch<any>(`${API_BASE}/financials/${symbol}`),
        symbol,
        nextEarningsDate,
      ),
    ]);
    companyRaw = (railwayCompany as Record<string, unknown>) || {};
    financialsRaw = (railwayFinancials as Record<string, unknown>) || {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixed sources; typed at the SecFundamentalsFinancials interface level above
  const q: any = quoteRaw || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const co: any = companyRaw;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f: any = financialsRaw;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a: any = analystRaw || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fwd: any = forwardEstRaw || {};

  const dataSources: string[] = [];
  if (quoteRaw) dataSources.push('quote');
  if (secOk) dataSources.push('sec-fundamentals');
  else if (Object.keys(companyRaw).length) dataSources.push('company');
  if (!secOk && Object.keys(financialsRaw).length) dataSources.push('financials');
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
    eps: q.eps || f.eps || null,

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