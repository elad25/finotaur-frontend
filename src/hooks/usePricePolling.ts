// src/hooks/usePricePolling.ts
// =====================================================
// 🔄 SMART PRICE POLLING v2.0 — Shared Server Cache
// =====================================================
// CHANGES from v1:
//   ✅ 30-minute intervals (was 15 min)
//   ✅ Uses shared server quote cache (/api/shared-quote/:ticker)
//      instead of direct Polygon API calls
//   ✅ Server-side thundering herd — 10,000 users = 1 API call
//   ✅ 60-min for extended hours, 120-min for closed market
//
// API SAVINGS (for 10,000 concurrent users, 100 active tickers):
//   Before: 10,000 × 96 polls/day = 960,000 API calls/day
//   After:  100 tickers × 48 polls/day = 4,800 API calls/day
//   = 99.5% reduction
// =====================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import type { StockData } from '@/types/stock-analyzer.types';

// ── Interval Config (UPDATED: 30 min base) ──
const INTERVAL_MARKET_OPEN = 30 * 60 * 1000;   // 30 minutes (was 15)
const INTERVAL_EXTENDED    = 60 * 60 * 1000;    // 60 minutes (was 30)
const INTERVAL_CLOSED      = 120 * 60 * 1000;   // 120 minutes (was 60)
const STALE_THRESHOLD      = 35 * 60 * 1000;    // 35 minutes → show "delayed"

// ── Market Hours (US Eastern) ──
function getMarketSession(): 'open' | 'premarket' | 'afterhours' | 'closed' {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const time = et.getHours() * 60 + et.getMinutes();

  if (day === 0 || day === 6) return 'closed';
  if (time >= 240 && time < 570) return 'premarket';
  if (time >= 570 && time < 960) return 'open';
  if (time >= 960 && time < 1200) return 'afterhours';
  return 'closed';
}

function getIntervalForSession(session: string): number {
  switch (session) {
    case 'open':        return INTERVAL_MARKET_OPEN;
    case 'premarket':
    case 'afterhours':  return INTERVAL_EXTENDED;
    default:            return INTERVAL_CLOSED;
  }
}

// ── Quote type (from shared server cache) ──
export interface QuoteUpdate {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  dayHigh: number;
  dayLow: number;
  open: number;
  previousClose: number;
  marketStatus: string;
  lastUpdated: string;
}

// ── Fetch from shared server cache ──
async function fetchSharedQuote(ticker: string): Promise<QuoteUpdate | null> {
  try {
    const res = await fetch(`/api/shared-quote/${ticker.toUpperCase()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;

    const d = json.data;
    return {
      price: d.price ?? 0,
      change: d.change ?? 0,
      changePercent: d.changePercent ?? 0,
      volume: d.volume ?? 0,
      dayHigh: d.dayHigh ?? 0,
      dayLow: d.dayLow ?? 0,
      open: d.open ?? 0,
      previousClose: d.previousClose ?? 0,
      marketStatus: d.marketStatus ?? 'unknown',
      lastUpdated: d.lastUpdated || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// =====================================================
// HOOK
// =====================================================

interface UsePricePollingOptions {
  stockData: StockData | null;
  onPriceUpdate: (update: QuoteUpdate) => void;
  enabled?: boolean;
}

interface UsePricePollingReturn {
  isDelayed: boolean;
  marketSession: 'open' | 'premarket' | 'afterhours' | 'closed';
  lastRefresh: Date | null;
  nextRefreshIn: number;
  forceRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function usePricePolling({
  stockData,
  onPriceUpdate,
  enabled = true,
}: UsePricePollingOptions): UsePricePollingReturn {
  const [isDelayed, setIsDelayed] = useState(false);
  const [marketSession, setMarketSession] = useState<'open' | 'premarket' | 'afterhours' | 'closed'>('closed');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickerRef = useRef<string | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // ── Core fetch (uses SHARED server cache) ──
  const refreshPrice = useCallback(async () => {
    const ticker = tickerRef.current;
    if (!ticker) return;

    setIsRefreshing(true);
    try {
      const update = await fetchSharedQuote(ticker);
      if (!update) return;

      // Smart dedup
      if (update.price === lastPriceRef.current) {
        lastUpdateRef.current = Date.now();
        setLastRefresh(new Date());
        setIsDelayed(false);
        return;
      }

      lastPriceRef.current = update.price;
      lastUpdateRef.current = Date.now();
      setLastRefresh(new Date());
      setIsDelayed(false);
      onPriceUpdate(update);
    } catch {
      // Silent fail
    } finally {
      setIsRefreshing(false);
    }
  }, [onPriceUpdate]);

  // ── Start/restart polling ──
  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    const session = getMarketSession();
    setMarketSession(session);
    const interval = getIntervalForSession(session);

    setNextRefreshIn(interval);

    let remaining = interval;
    countdownRef.current = setInterval(() => {
      remaining -= 30_000;
      if (remaining < 0) remaining = 0;
      setNextRefreshIn(remaining);
    }, 30_000);

    intervalRef.current = setInterval(() => {
      const currentSession = getMarketSession();
      if (currentSession !== session) {
        startPolling();
        return;
      }
      refreshPrice();
      remaining = getIntervalForSession(currentSession);
      setNextRefreshIn(remaining);
    }, interval);
  }, [refreshPrice]);

  // ── Stale detection ──
  useEffect(() => {
    const staleChecker = setInterval(() => {
      const age = Date.now() - lastUpdateRef.current;
      setIsDelayed(age > STALE_THRESHOLD);
    }, 60_000);
    return () => clearInterval(staleChecker);
  }, []);

  // ── Visibility API ──
  useEffect(() => {
    if (!enabled) return;
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        intervalRef.current = null;
        countdownRef.current = null;
      } else {
        const age = Date.now() - lastUpdateRef.current;
        if (age > STALE_THRESHOLD) refreshPrice();
        startPolling();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, refreshPrice, startPolling]);

  // ── Ticker change ──
  useEffect(() => {
    if (!enabled || !stockData?.ticker) {
      tickerRef.current = null;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    const newTicker = stockData.ticker.toUpperCase();
    if (tickerRef.current !== newTicker) {
      tickerRef.current = newTicker;
      lastPriceRef.current = stockData.price;
      lastUpdateRef.current = Date.now();
      setLastRefresh(new Date());
      setIsDelayed(false);
      startPolling();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [stockData?.ticker, stockData?.price, enabled, startPolling]);

  const forceRefresh = useCallback(async () => {
    await refreshPrice();
    startPolling();
  }, [refreshPrice, startPolling]);

  return {
    isDelayed,
    marketSession,
    lastRefresh,
    nextRefreshIn,
    forceRefresh,
    isRefreshing,
  };
}