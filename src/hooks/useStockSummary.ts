// src/hooks/useStockSummary.ts
// =====================================================
// FINOTAUR STOCK SUMMARY HOOK - FIXED v2.2
// =====================================================
// FIXES:
// 1. CORRECT API path: /api/quote/:symbol ✅
// 2. Handles BOTH raw Polygon format AND transformed format
// 3. Added in-memory cache to prevent duplicate requests
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  eps?: number;
  beta?: number;
  high52w?: number;
  low52w?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  dividendYield?: number;
  timestamp?: string;
  session?: string;
}

interface CompanyProfile {
  name: string;
  description: string | null;
  sector: string | null;
  industry: string | null;
  country: string;
  exchange: string;
  website: string | null;
  logo?: string | null;
  employees?: number | null;
  ceo?: string | null;
  marketCap?: number;
}

interface AnalystRating {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  total: number;
  consensus: string;
}

interface PriceTarget {
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  currentPrice: number;
  upsidePercent: number;
  numberOfAnalysts?: number;
}

interface FinancialMetrics {
  revenueGrowth?: number;
  netIncomeGrowth?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  roe?: number;
  roa?: number;
  currentRatio?: number;
  debtToEquity?: number;
  peRatio?: number;
  beta?: number;
}

interface AnalystAction {
  date: string;
  firm: string;
  action: string;
  fromGrade: string | null;
  toGrade: string | null;
  priceTarget?: number | null;
}

// Data structure returned in the 'data' property
interface StockSummaryData {
  quote: StockQuote | null;
  profile: CompanyProfile | null;
  analystRating: AnalystRating | null;
  priceTarget: PriceTarget | null;
  financials: FinancialMetrics | null;
  analystActions: AnalystAction[];
}

// Return type for the hook
interface UseStockSummaryReturn {
  data: StockSummaryData;
  quote: StockQuote | null;
  profile: CompanyProfile | null;
  analystRating: AnalystRating | null;
  priceTarget: PriceTarget | null;
  financials: FinancialMetrics | null;
  analystActions: AnalystAction[];
  loading: boolean;
  error: string | null;
  cacheAge: number | null;
  isCached: boolean;
  refresh: () => void;
}

// ═══════════════════════════════════════════════════════════════
// SIMPLE IN-MEMORY CACHE
// ═══════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION_MS = 60 * 1000; // 1 minute

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_DURATION_MS) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function getCacheAge(key: string): number | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return Date.now() - entry.timestamp;
}

// ═══════════════════════════════════════════════════════════════
// FETCH WITH TIMEOUT AND CACHE
// ═══════════════════════════════════════════════════════════════

async function fetchWithCache<T>(
  url: string,
  cacheKey: string,
  timeoutMs: number = 8000,
  signal?: AbortSignal
): Promise<T | null> {
  const cached = getCached<T>(cacheKey);
  if (cached) {
    console.log(`[useStockSummary] Cache HIT: ${cacheKey}`);
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: signal || controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[useStockSummary] HTTP ${response.status} for ${url}`);
      return null;
    }

    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[useStockSummary] Timeout: ${url}`);
    } else {
      console.error(`[useStockSummary] Error:`, error);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// NORMALIZE QUOTE RESPONSE
// Handles both raw Polygon format AND server-transformed format
// ═══════════════════════════════════════════════════════════════

function normalizeQuoteResponse(data: any, symbol: string): StockQuote | null {
  if (!data) return null;

  // Case 1: Raw Polygon format (has 'ticker' object)
  // {"ticker":{"ticker":"AAPL","todaysChangePerc":1.38,"day":{"c":275.58,...},...}}
  if (data.ticker && data.ticker.day) {
    const t = data.ticker;
    const day = t.day;
    const prevDay = t.prevDay;
    
    return {
      symbol: t.ticker || symbol,
      price: day.c,
      change: t.todaysChange || 0,
      changePercent: t.todaysChangePerc || 0,
      volume: day.v || 0,
      high: day.h,
      low: day.l,
      open: day.o,
      previousClose: prevDay?.c,
      timestamp: t.updated ? new Date(t.updated / 1000000).toISOString() : new Date().toISOString(),
      session: 'regular',
    };
  }

  // Case 2: Server-transformed format (already has price, change, etc at root)
  // {"symbol":"AAPL","price":275.58,"change":3.75,"changePercent":1.38,...}
  if (data.price !== undefined) {
    return {
      symbol: data.symbol || symbol,
      price: data.price,
      change: data.change || 0,
      changePercent: data.changePercent || 0,
      volume: data.volume || 0,
      high: data.high,
      low: data.low,
      open: data.open,
      previousClose: data.previousClose,
      timestamp: data.timestamp || new Date().toISOString(),
      session: data.session,
      marketCap: data.marketCap,
      pe: data.pe,
      eps: data.eps,
      beta: data.beta,
      high52w: data.high52w,
      low52w: data.low52w,
      dividendYield: data.dividendYield,
    };
  }

  console.warn('[useStockSummary] Unknown quote format:', data);
  return null;
}

// ═══════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════

export default function useStockSummary(symbol: string): UseStockSummaryReturn {
  const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app/api';

  const emptyData: StockSummaryData = {
    quote: null,
    profile: null,
    analystRating: null,
    priceTarget: null,
    financials: null,
    analystActions: [],
  };

  const [data, setData] = useState<StockSummaryData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [isCached, setIsCached] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!symbol) {
      setData(emptyData);
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Clear cache if force refresh
    if (forceRefresh) {
      cache.delete(`quote_${symbol}`);
      cache.delete(`company_${symbol}`);
      cache.delete(`analyst_${symbol}`);
      cache.delete(`financials_${symbol}`);
    }

    setLoading(true);
    setError(null);

    try {
      // ═══════════════════════════════════════════════════════════
      // CORRECT API PATHS:
      // ✅ /api/quote/:symbol → Quote data (Polygon snapshot)
      // ✅ /api/market-data/company/:symbol → Company profile
      // ✅ /api/market-data/analyst/:symbol → Analyst ratings
      // ✅ /api/market-data/financials/:symbol → Financial metrics
      // ═══════════════════════════════════════════════════════════

      console.log(`[useStockSummary] Fetching data for ${symbol}...`);

      const [quoteResult, profileResult, analystResult, financialsResult] = await Promise.all([
        // ✅ FIXED: /api/quote (NOT /api/ticker)
        fetchWithCache<any>(
          `${API_BASE}/quote/${symbol}`,
          `quote_${symbol}`,
          8000,
          abortControllerRef.current.signal
        ),
        fetchWithCache<CompanyProfile>(
          `${API_BASE}/market-data/company/${symbol}`,
          `company_${symbol}`,
          8000,
          abortControllerRef.current.signal
        ),
        // ✅ FIXED: /api/analyst (NOT /api/market-data/analyst)
        fetchWithCache<{ rating: AnalystRating; priceTarget: PriceTarget; analystActions?: AnalystAction[] }>(
          `${API_BASE}/analyst/${symbol}`,
          `analyst_${symbol}`,
          8000,
          abortControllerRef.current.signal
        ),
        fetchWithCache<FinancialMetrics>(
          `${API_BASE}/market-data/financials/${symbol}`,
          `financials_${symbol}`,
          8000,
          abortControllerRef.current.signal
        ),
      ]);

      // Normalize quote response (handles both raw and transformed formats)
      let quote = normalizeQuoteResponse(quoteResult, symbol);

      // Merge additional data into quote
      if (quote) {
        if (profileResult?.marketCap && !quote.marketCap) {
          quote.marketCap = profileResult.marketCap;
        }
        if (financialsResult?.beta && !quote.beta) {
          quote.beta = financialsResult.beta;
        }
        if (financialsResult?.peRatio && !quote.pe) {
          quote.pe = financialsResult.peRatio;
        }
      }

      const newData: StockSummaryData = {
  quote,
  profile: profileResult,
  analystRating: analystResult?.rating || null,
  priceTarget: analystResult?.priceTarget || null,
  financials: financialsResult,
  analystActions: analystResult?.analystActions || [],
};

      console.log(`[useStockSummary] Data loaded for ${symbol}:`, {
        hasQuote: !!quote,
        hasProfile: !!profileResult,
        hasAnalyst: !!analystResult,
        hasFinancials: !!financialsResult,
      });

      setData(newData);

      const quoteAge = getCacheAge(`quote_${symbol}`);
      setCacheAge(quoteAge);
      setIsCached(quoteAge !== null && quoteAge > 100);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('[useStockSummary] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [symbol, API_BASE]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    data,
    quote: data.quote,
    profile: data.profile,
    analystRating: data.analystRating,
    priceTarget: data.priceTarget,
    financials: data.financials,
    analystActions: data.analystActions,
    loading,
    error,
    cacheAge,
    isCached,
    refresh,
  };
}

export { getCached, setCache, getCacheAge, CACHE_DURATION_MS };