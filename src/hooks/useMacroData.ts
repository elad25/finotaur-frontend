// src/hooks/useMacroData.ts
// Custom hook for fetching and managing macro market data
// Connects to /api/macro/snapshot endpoint with caching and auto-refresh

import { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface MacroAsset {
  symbol: string;
  name: string;
  category: 'index' | 'volatility' | 'bond' | 'currency' | 'commodity' | 'crypto';
  price: number | null;
  dailyChange: number | null;
  dailyChangePercent: number | null;
  weeklyChange: number | null;
  weeklyChangePercent: number | null;
  volume: string;
  riskSentiment: 'Risk-On' | 'Risk-Off' | 'Neutral';
  error?: boolean;
  cached?: boolean;
  cachedAt?: string;
}

export interface MacroSnapshot {
  timestamp: string;
  source: 'live' | 'cache';
  cachedAt?: string;
  marketStatus?: 'open' | 'closed';
  assets: MacroAsset[];
}

export interface MacroDataState {
  data: MacroSnapshot | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  isStale: boolean;
  refetch: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const REFRESH_INTERVAL = 60_000; // 1 minute during market hours
const STALE_THRESHOLD = 5 * 60_000; // 5 minutes
const CACHE_KEY = 'finotaur_macro_cache';

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE CACHE
// ═══════════════════════════════════════════════════════════════════════════

function saveToLocalCache(data: MacroSnapshot): void {
  try {
    const cacheData = {
      data,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (e) {
    console.warn('[useMacroData] Failed to save to local cache:', e);
  }
}

function loadFromLocalCache(): { data: MacroSnapshot; savedAt: string } | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (e) {
    console.warn('[useMacroData] Failed to load from local cache:', e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useMacroData(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}): MacroDataState {
  const { 
    autoRefresh = true, 
    refreshInterval = REFRESH_INTERVAL 
  } = options || {};

  const [data, setData] = useState<MacroSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate if data is stale
  const isStale = lastUpdated 
    ? Date.now() - lastUpdated.getTime() > STALE_THRESHOLD 
    : true;

  // Fetch data from API
  const fetchData = useCallback(async (showLoading = true): Promise<void> => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/macro/snapshot`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const snapshot: MacroSnapshot = await response.json();
      
      setData(snapshot);
      setLastUpdated(new Date());
      saveToLocalCache(snapshot);
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore aborted requests
      }

      console.error('[useMacroData] Fetch error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));

      // Try to load from local cache on error
      const cached = loadFromLocalCache();
      if (cached && !data) {
        setData(cached.data);
        setLastUpdated(new Date(cached.savedAt));
      }
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  // Initial load - try cache first for instant display
  useEffect(() => {
    const cached = loadFromLocalCache();
    if (cached) {
      setData(cached.data);
      setLastUpdated(new Date(cached.savedAt));
      setIsLoading(false);
    }
    
    // Then fetch fresh data
    fetchData(!cached);
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    intervalRef.current = setInterval(() => {
      fetchData(false); // Don't show loading on background refresh
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    isStale,
    refetch: () => fetchData(true),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// Get specific asset by symbol
export function useMacroAsset(symbol: string): {
  asset: MacroAsset | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useMacroData();
  
  const asset = data?.assets.find(
    a => a.symbol.toUpperCase() === symbol.toUpperCase()
  ) || null;

  return { asset, isLoading, error };
}

// Get assets by category
export function useMacroByCategory(category: MacroAsset['category']): {
  assets: MacroAsset[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useMacroData();
  
  const assets = data?.assets.filter(a => a.category === category) || [];

  return { assets, isLoading, error };
}

// Get market sentiment overview
export function useMarketSentiment(): {
  sentiment: 'Risk-On' | 'Risk-Off' | 'Neutral';
  score: number; // -3 to +3
  riskOnCount: number;
  riskOffCount: number;
  isLoading: boolean;
} {
  const { data, isLoading } = useMacroData();

  if (!data || isLoading) {
    return {
      sentiment: 'Neutral',
      score: 0,
      riskOnCount: 0,
      riskOffCount: 0,
      isLoading: true,
    };
  }

  const validAssets = data.assets.filter(a => a.price !== null && !a.error);
  const riskOnCount = validAssets.filter(a => a.riskSentiment === 'Risk-On').length;
  const riskOffCount = validAssets.filter(a => a.riskSentiment === 'Risk-Off').length;
  
  // Calculate score based on weighted assets
  const weights: Record<string, number> = {
    SPX: 2,
    NDX: 1.5,
    VIX: -2, // Inverse - high VIX = risk-off
    DXY: -1, // Strong dollar often = risk-off
    GC: -0.5, // Gold up = flight to safety
    BTC: 1,
    CL: 0.5,
  };

  let weightedScore = 0;
  let totalWeight = 0;

  for (const asset of validAssets) {
    const weight = weights[asset.symbol] || 0.5;
    const absWeight = Math.abs(weight);
    const direction = weight > 0 ? 1 : -1;
    
    if (asset.dailyChangePercent !== null) {
      // Normalize change to -1 to +1 range (clamp at ±3%)
      const normalizedChange = Math.max(-1, Math.min(1, asset.dailyChangePercent / 3));
      weightedScore += normalizedChange * direction * absWeight;
      totalWeight += absWeight;
    }
  }

  const rawScore = totalWeight > 0 ? (weightedScore / totalWeight) * 3 : 0;
  const score = Math.max(-3, Math.min(3, rawScore));

  let sentiment: 'Risk-On' | 'Risk-Off' | 'Neutral' = 'Neutral';
  if (score > 0.5) sentiment = 'Risk-On';
  else if (score < -0.5) sentiment = 'Risk-Off';

  return {
    sentiment,
    score,
    riskOnCount,
    riskOffCount,
    isLoading: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

// Format price based on asset type
export function formatPrice(price: number | null, symbol: string): string {
  if (price === null) return '—';
  
  // Indices - no decimals for large numbers
  if (['SPX', 'NDX', 'DJI', 'RUT'].includes(symbol)) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  
  // VIX - 2 decimals
  if (symbol === 'VIX') {
    return price.toFixed(2);
  }
  
  // Yields - percentage
  if (symbol === 'TNX') {
    return `${(price).toFixed(2)}%`;
  }
  
  // Currencies
  if (symbol === 'DXY') {
    return price.toFixed(2);
  }
  
  // Commodities
  if (['CL', 'GC'].includes(symbol)) {
    return `$${price.toFixed(2)}`;
  }
  
  // Crypto
  if (symbol === 'BTC') {
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  
  return price.toFixed(2);
}

// Format change percentage
export function formatChange(change: number | null): string {
  if (change === null) return '—';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

// Get time since last update
export function getTimeSince(date: Date | null): string {
  if (!date) return 'Never';
  
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default useMacroData;