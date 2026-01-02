// src/hooks/useApiCache.ts
// =====================================================
// FINOTAUR API CACHE HOOK - v1.0.0
// =====================================================
// Smart caching layer for API calls with:
// - SessionStorage persistence
// - Configurable TTL (time-to-live)
// - Stale-while-revalidate pattern
// - Parallel fetch support
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface UseCacheOptions {
  /** Cache TTL in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Use stale data while revalidating (default: true) */
  staleWhileRevalidate?: boolean;
  /** Retry count on failure (default: 2) */
  retryCount?: number;
  /** Retry delay in ms (default: 1000) */
  retryDelay?: number;
  /** Skip cache and always fetch fresh (default: false) */
  skipCache?: boolean;
}

interface CacheState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  isCached: boolean;
  cacheAge: number | null;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_PREFIX = 'finotaur_cache_';

// ═══════════════════════════════════════════════════════════════
// CACHE UTILITIES
// ═══════════════════════════════════════════════════════════════

function getCacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

function getFromCache<T>(key: string): CacheEntry<T> | null {
  try {
    const cached = sessionStorage.getItem(getCacheKey(key));
    if (!cached) return null;
    return JSON.parse(cached) as CacheEntry<T>;
  } catch {
    return null;
  }
}

function setToCache<T>(key: string, data: T, ttl: number): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    sessionStorage.setItem(getCacheKey(key), JSON.stringify(entry));
  } catch (e) {
    // Storage full - clear old entries
    clearOldCache();
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };
      sessionStorage.setItem(getCacheKey(key), JSON.stringify(entry));
    } catch {
      // Still failing, ignore
    }
  }
}

function clearOldCache(): void {
  try {
    const keys = Object.keys(sessionStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const entry = JSON.parse(sessionStorage.getItem(key) || '{}');
          if (entry.expiresAt && entry.expiresAt < now) {
            sessionStorage.removeItem(key);
          }
        } catch {
          sessionStorage.removeItem(key);
        }
      }
    });
  } catch {
    // Ignore errors
  }
}

// ═══════════════════════════════════════════════════════════════
// FETCH WITH RETRY
// ═══════════════════════════════════════════════════════════════

async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  retryCount: number,
  retryDelay: number
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < retryCount) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, retryDelay * Math.pow(2, attempt))
        );
      }
    }
  }
  
  throw lastError;
}

// ═══════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════

export function useApiCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
): CacheState<T> & { refresh: () => void } {
  const {
    ttl = DEFAULT_TTL,
    staleWhileRevalidate = true,
    retryCount = 2,
    retryDelay = 1000,
    skipCache = false,
  } = options;

  const [state, setState] = useState<CacheState<T>>(() => {
    // Initialize with cached data if available
    if (!skipCache) {
      const cached = getFromCache<T>(cacheKey);
      if (cached) {
        const isStale = Date.now() > cached.expiresAt;
        return {
          data: cached.data,
          loading: isStale && staleWhileRevalidate,
          error: null,
          isStale,
          isCached: true,
          cacheAge: Date.now() - cached.timestamp,
        };
      }
    }
    return {
      data: null,
      loading: true,
      error: null,
      isStale: false,
      isCached: false,
      cacheAge: null,
    };
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (force = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Check cache first (unless forcing refresh)
    if (!force && !skipCache) {
      const cached = getFromCache<T>(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        setState({
          data: cached.data,
          loading: false,
          error: null,
          isStale: false,
          isCached: true,
          cacheAge: Date.now() - cached.timestamp,
        });
        return;
      }
    }

    // Set loading state (keep stale data if available)
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const data = await fetchWithRetry(fetcherRef.current, retryCount, retryDelay);
      
      // Save to cache
      if (!skipCache) {
        setToCache(cacheKey, data, ttl);
      }

      setState({
        data,
        loading: false,
        error: null,
        isStale: false,
        isCached: false,
        cacheAge: 0,
      });
    } catch (error) {
      // Don't update state if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        // Keep stale data on error
      }));
    }
  }, [cacheKey, ttl, retryCount, retryDelay, skipCache]);

  // Initial fetch
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

  return { ...state, refresh };
}

// ═══════════════════════════════════════════════════════════════
// PARALLEL FETCH HOOK
// ═══════════════════════════════════════════════════════════════

interface ParallelFetchConfig<T> {
  key: string;
  fetcher: () => Promise<T>;
  ttl?: number;
}

export function useParallelCache<T extends Record<string, any>>(
  configs: ParallelFetchConfig<T[keyof T]>[],
  options: Omit<UseCacheOptions, 'ttl'> = {}
): {
  data: Partial<T>;
  loading: boolean;
  errors: Record<string, string | null>;
  refresh: () => void;
} {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const {
    staleWhileRevalidate = true,
    retryCount = 2,
    retryDelay = 1000,
    skipCache = false,
  } = options;

  const fetchAll = useCallback(async (force = false) => {
    setLoading(true);
    
    // Load from cache first
    if (!force && !skipCache) {
      const cachedData: Partial<T> = {};
      let allCached = true;
      
      for (const config of configs) {
        const cached = getFromCache<T[keyof T]>(config.key);
        if (cached && Date.now() < cached.expiresAt) {
          cachedData[config.key as keyof T] = cached.data;
        } else {
          allCached = false;
        }
      }
      
      if (Object.keys(cachedData).length > 0) {
        setData(cachedData);
        if (allCached) {
          setLoading(false);
          return;
        }
      }
    }

    // Fetch all in parallel
    const results = await Promise.allSettled(
      configs.map(async (config) => {
        try {
          const result = await fetchWithRetry(config.fetcher, retryCount, retryDelay);
          if (!skipCache) {
            setToCache(config.key, result, config.ttl || DEFAULT_TTL);
          }
          return { key: config.key, data: result, error: null };
        } catch (error) {
          return { 
            key: config.key, 
            data: null, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      })
    );

    const newData: Partial<T> = {};
    const newErrors: Record<string, string | null> = {};

    results.forEach((result, index) => {
      const key = configs[index].key;
      if (result.status === 'fulfilled') {
        if (result.value.data !== null) {
          newData[key as keyof T] = result.value.data;
        }
        newErrors[key] = result.value.error;
      } else {
        newErrors[key] = result.reason?.message || 'Unknown error';
      }
    });

    setData(prev => ({ ...prev, ...newData }));
    setErrors(newErrors);
    setLoading(false);
  }, [configs, retryCount, retryDelay, skipCache]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refresh = useCallback(() => {
    fetchAll(true);
  }, [fetchAll]);

  return { data, loading, errors, refresh };
}

// ═══════════════════════════════════════════════════════════════
// STOCK DATA HOOK - SPECIALIZED FOR STOCK SUMMARY
// ═══════════════════════════════════════════════════════════════

interface StockDataBundle {
  financials: any;
  analyst: any;
  company: any;
  secFilings: any[];
}

export function useStockDataBundle(
  symbol: string,
  apiBase: string = 'https://finotaur-server-production.up.railway.app/api'
): {
  data: Partial<StockDataBundle>;
  loading: boolean;
  errors: Record<string, string | null>;
  refresh: () => void;
  progress: number;
} {
  const [progress, setProgress] = useState(0);

  const configs: ParallelFetchConfig<any>[] = [
    {
      key: 'financials',
      fetcher: async () => {
        const res = await fetch(`${apiBase}/market-data/financials/${symbol}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setProgress(p => Math.min(p + 25, 100));
        return res.json();
      },
      ttl: 10 * 60 * 1000, // 10 minutes for financials
    },
    {
      key: 'analyst',
      fetcher: async () => {
        const res = await fetch(`${apiBase}/market-data/analyst/${symbol}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setProgress(p => Math.min(p + 25, 100));
        return res.json();
      },
      ttl: 15 * 60 * 1000, // 15 minutes for analyst data
    },
    {
      key: 'company',
      fetcher: async () => {
        const res = await fetch(`${apiBase}/market-data/company/${symbol}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setProgress(p => Math.min(p + 25, 100));
        return res.json();
      },
      ttl: 60 * 60 * 1000, // 1 hour for company info (rarely changes)
    },
  ];

  const result = useParallelCache<StockDataBundle>(configs);

  useEffect(() => {
    setProgress(0);
  }, [symbol]);

  useEffect(() => {
    if (!result.loading) {
      setProgress(100);
    }
  }, [result.loading]);

  return { ...result, progress };
}

export default useApiCache;