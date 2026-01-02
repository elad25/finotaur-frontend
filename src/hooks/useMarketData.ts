// src/hooks/useMarketData.ts
// =====================================================
// FINOTAUR MARKET DATA HOOK - TypeScript Fixed
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════
// CACHE CLASS WITH PROPER TYPESCRIPT
// ═══════════════════════════════════════════════════════════════

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

class DataCache {
  private store: Map<string, CacheEntry<unknown>>;

  constructor() {
    this.store = new Map();
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.timestamp < CACHE_DURATION_MS) {
      return entry.data;
    }
    this.store.delete(key);
    return null;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, { data, timestamp: Date.now() });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    return this.store.has(key);
  }
}

const dataCache = new DataCache();

// ═══════════════════════════════════════════════════════════════
// HELPER: Safe JSON fetch with proper typing
// ═══════════════════════════════════════════════════════════════

async function safeFetch<T>(url: string, options: FetchOptions = {}): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: { 
        'Accept': 'application/json', 
        ...(options.headers || {}) 
      }
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch (e) {
    console.error(`[Fetch Error] ${url}:`, e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// STOCK SUMMARY TYPES
// ═══════════════════════════════════════════════════════════════

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  previousClose: number;
  marketCap?: number;
  pe?: number;
  eps?: number;
  beta?: number;
  dividendYield?: number;
  high52w?: number;
  low52w?: number;
  avgVolume?: number;
  timestamp: string;
  // Market status fields
  marketStatus?: 'open' | 'closed' | 'pre-market' | 'after-hours';
  isMarketOpen?: boolean;
}

export interface CompanyProfile {
  name: string;
  description: string | null;
  sector: string | null;
  industry: string | null;
  country: string;
  exchange: string;
  currency: string;
  website: string | null;
  logo?: string | null;
  employees?: number | null;
  ceo?: string | null;
  headquarters?: string | null;
  ipoDate?: string | null;
}

export interface AnalystRating {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  total: number;
  consensus: string;
}

export interface PriceTarget {
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
  currentPrice: number;
  upsidePercent: number;
  numberOfAnalysts: number;
}

export interface StockSummaryData {
  quote: StockQuote | null;
  profile: CompanyProfile | null;
  analystRating: AnalystRating | null;
  priceTarget: PriceTarget | null;
}

// ═══════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app/api';
const CACHE_KEY_PREFIX = 'finotaur.stock.';

// ═══════════════════════════════════════════════════════════════
// LOCAL STORAGE CACHE HELPERS
// ═══════════════════════════════════════════════════════════════

function getLocalCache<T>(key: string): CacheEntry<T> | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const entry: CacheEntry<T> = JSON.parse(stored);
      if (Date.now() - entry.timestamp < CACHE_DURATION_MS) {
        return entry;
      }
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

function setLocalCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore localStorage errors
  }
}

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function fetchQuoteExtended(symbol: string): Promise<StockQuote | null> {
  return safeFetch<StockQuote>(`${API_BASE}/market-data/quote-extended/${symbol}`);
}

async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  return safeFetch<CompanyProfile>(`${API_BASE}/market-data/company/${symbol}`);
}

interface AnalystResponse {
  rating: AnalystRating | null;
  priceTarget: PriceTarget | null;
}

async function fetchAnalystData(symbol: string): Promise<AnalystResponse> {
  const data = await safeFetch<AnalystResponse>(`${API_BASE}/market-data/analyst/${symbol}`);
  return data || { rating: null, priceTarget: null };
}

// ═══════════════════════════════════════════════════════════════
// MAIN HOOK: useStockSummary
// ═══════════════════════════════════════════════════════════════

export function useStockSummary(symbol: string | undefined | null) {
  const [data, setData] = useState<StockSummaryData>({
    quote: null,
    profile: null,
    analystRating: null,
    priceTarget: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!symbol) {
      setData({ quote: null, profile: null, analystRating: null, priceTarget: null });
      return;
    }

    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `${CACHE_KEY_PREFIX}${upperSymbol}`;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      // Memory cache
      const memCached = dataCache.get<StockSummaryData>(upperSymbol);
      if (memCached) {
        console.log(`[Memory Cache HIT] ${upperSymbol}`);
        setData(memCached);
        setIsCached(true);
        return;
      }

      // LocalStorage cache
      const localCached = getLocalCache<StockSummaryData>(cacheKey);
      if (localCached) {
        console.log(`[LocalStorage Cache HIT] ${upperSymbol}`);
        setData(localCached.data);
        dataCache.set(upperSymbol, localCached.data);
        setIsCached(true);
        setCacheAge(Date.now() - localCached.timestamp);
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setIsCached(false);

    try {
      console.log(`[API] Fetching data for ${upperSymbol}`);
      
      // Fetch all data in parallel for efficiency
      const [quote, profile, analystData] = await Promise.all([
        fetchQuoteExtended(upperSymbol),
        fetchCompanyProfile(upperSymbol),
        fetchAnalystData(upperSymbol),
      ]);

      const newData: StockSummaryData = {
        quote,
        profile,
        analystRating: analystData.rating,
        priceTarget: analystData.priceTarget,
      };

      // Cache the result
      dataCache.set(upperSymbol, newData);
      setLocalCache(cacheKey, newData);
      
      setData(newData);
      setCacheAge(0);
      
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('[Summary] Error:', err);
        setError(err.message || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  // Initial fetch
  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Update cache age periodically
  useEffect(() => {
    if (!symbol) return;
    
    const interval = setInterval(() => {
      const cacheKey = `${CACHE_KEY_PREFIX}${symbol.toUpperCase()}`;
      const localCached = getLocalCache<StockSummaryData>(cacheKey);
      if (localCached) {
        setCacheAge(Date.now() - localCached.timestamp);
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [symbol]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  const clearCache = useCallback(() => {
    if (symbol) {
      const upperSymbol = symbol.toUpperCase();
      const cacheKey = `${CACHE_KEY_PREFIX}${upperSymbol}`;
      dataCache.delete(upperSymbol);
      try {
        localStorage.removeItem(cacheKey);
      } catch {}
    }
  }, [symbol]);

  return {
    data,
    loading,
    error,
    cacheAge,
    isCached,
    refresh,
    clearCache,
  };
}

// ═══════════════════════════════════════════════════════════════
// BULK QUOTES HOOK
// ═══════════════════════════════════════════════════════════════

interface BulkQuotesResult {
  quotes: StockQuote[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBulkQuotes(symbols: string[]): BulkQuotesResult {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    if (!symbols.length) {
      setQuotes([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const symbolsStr = symbols.map(s => s.toUpperCase()).join(',');
      const response = await safeFetch<{ quotes: StockQuote[] }>(
        `${API_BASE}/market-data/quotes?symbols=${symbolsStr}`
      );
      
      if (response?.quotes) {
        setQuotes(response.quotes);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  return { quotes, loading, error, refresh: fetchQuotes };
}

// ═══════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════

export function clearAllMarketDataCache(): void {
  dataCache.clear();
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('[Cache] All market data caches cleared');
  } catch {
    // Ignore
  }
}

export default useStockSummary;