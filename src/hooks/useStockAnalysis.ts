// =====================================================
// 🔌 STOCK ANALYZER HOOKS
// =====================================================
// React hooks for the Stock Analyzer API
// =====================================================

import { useState, useCallback } from 'react';
import type { 
  StockAnalyzerData, 
  StockAnalyzerAPIResponse,
  UseStockAnalysisReturn 
} from '../types/stock.types';

// =====================================================
// API CONFIGURATION
// =====================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

// =====================================================
// MAIN HOOK: useStockAnalysis
// =====================================================

export function useStockAnalysis(): UseStockAnalysisReturn {
  const [data, setData] = useState<StockAnalyzerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'cache' | 'api' | null>(null);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  const fetch = useCallback(async (ticker: string) => {
    if (!ticker) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await window.fetch(
        `${API_BASE_URL}/api/stock-analyzer/${ticker.toUpperCase()}`,
        {
          headers: {
            'Content-Type': 'application/json',
            // Add auth header if available
            ...(localStorage.getItem('supabase.auth.token') && {
              'Authorization': `Bearer ${JSON.parse(localStorage.getItem('supabase.auth.token') || '{}')?.currentSession?.access_token || ''}`
            }),
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch data for ${ticker}`);
      }
      
      const result: StockAnalyzerAPIResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.data ? 'Unknown error' : 'No data returned');
      }
      
      setData(result.data);
      setSource(result.source);
      setCacheAge(result.cacheAge || null);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stock data';
      setError(message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async (ticker: string) => {
    if (!ticker) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await window.fetch(
        `${API_BASE_URL}/api/stock-analyzer/${ticker.toUpperCase()}/refresh`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('supabase.auth.token') && {
              'Authorization': `Bearer ${JSON.parse(localStorage.getItem('supabase.auth.token') || '{}')?.currentSession?.access_token || ''}`
            }),
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to refresh data for ${ticker}`);
      }
      
      const result: StockAnalyzerAPIResponse = await response.json();
      
      setData(result.data);
      setSource('api');
      setCacheAge(0);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh stock data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setSource(null);
    setCacheAge(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    source,
    cacheAge,
    fetch,
    refresh,
    reset,
  };
}

// =====================================================
// QUICK PRICE HOOK
// =====================================================

export function useQuickPrice() {
  const [price, setPrice] = useState<{
    price: number;
    change: number;
    changePercent: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async (ticker: string) => {
    if (!ticker) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await window.fetch(
        `${API_BASE_URL}/api/stock-analyzer/${ticker.toUpperCase()}/quick`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch price');
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setPrice({
          price: result.data.price,
          change: result.data.change,
          changePercent: result.data.changePercent,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { price, isLoading, error, fetchPrice };
}

// =====================================================
// POPULAR TICKERS HOOK
// =====================================================

export function usePopularTickers() {
  const [tickers, setTickers] = useState<{
    ticker: string;
    name: string;
    sector: string;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const response = await window.fetch(
        `${API_BASE_URL}/api/stock-analyzer/list/popular`
      );
      
      if (response.ok) {
        const result = await response.json();
        setTickers(result.tickers || []);
      }
    } catch {
      // Silent fail - use empty array
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { tickers, isLoading, fetch };
}

// =====================================================
// RECENT ANALYSES HOOK
// =====================================================

export function useRecentAnalyses() {
  const [analyses, setAnalyses] = useState<{
    ticker: string;
    company_name: string;
    sector: string;
    current_price: number;
    price_change_percent: number;
    finotaur_score: number;
    updated_at: string;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async (limit = 20) => {
    setIsLoading(true);
    
    try {
      const response = await window.fetch(
        `${API_BASE_URL}/api/stock-analyzer/list/recent?limit=${limit}`
      );
      
      if (response.ok) {
        const result = await response.json();
        setAnalyses(result.results || []);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { analyses, isLoading, fetch };
}

// =====================================================
// TOP SCORED HOOK
// =====================================================

export function useTopScored() {
  const [stocks, setStocks] = useState<{
    ticker: string;
    company_name: string;
    sector: string;
    finotaur_score: number;
    current_price: number;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async (limit = 10) => {
    setIsLoading(true);
    
    try {
      const response = await window.fetch(
        `${API_BASE_URL}/api/stock-analyzer/list/top-scored?limit=${limit}`
      );
      
      if (response.ok) {
        const result = await response.json();
        setStocks(result.results || []);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { stocks, isLoading, fetch };
}

// =====================================================
// BATCH ANALYSIS HOOK
// =====================================================

export function useBatchAnalysis() {
  const [results, setResults] = useState<Record<string, StockAnalyzerAPIResponse>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (tickers: string[]) => {
    if (!tickers.length) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await window.fetch(
        `${API_BASE_URL}/api/stock-analyzer/batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tickers }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Batch analysis failed');
      }
      
      const result = await response.json();
      setResults(result.results || {});
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch analysis failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { results, isLoading, error, analyze };
}

export default {
  useStockAnalysis,
  useQuickPrice,
  usePopularTickers,
  useRecentAnalyses,
  useTopScored,
  useBatchAnalysis,
};
