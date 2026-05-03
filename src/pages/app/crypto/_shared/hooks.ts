// ============================================================
// src/pages/app/crypto/_shared/hooks.ts
// React hooks with auto-polling for all crypto data
// ============================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { fetchGlobal, fetchCoins, fetchTrending, fetchFearGreed, fetchCoinDetail, fetchCategories, fetchExchanges, fetchKlines, fetchFunding, fetchNews } from './api';
import { generateSignals } from './technicals';
import type { CoinMarketData, GlobalMarketData, TrendingCoin, FearGreedData, FundingRateData, KlineData, CategoryData, ExchangeData, TechnicalSignal } from './types';

function usePoll<T>(fetcher: () => Promise<T>, interval: number, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const load = () => fetcher().then(d => { if (alive.current) { setData(d); setLoading(false); } }).catch(() => { if (alive.current) setLoading(false); });
    load();
    const id = interval > 0 ? setInterval(load, interval) : undefined;
    return () => { alive.current = false; if (id) clearInterval(id); };
  }, deps);

  return { data, loading };
}

export function useGlobalData() {
  return usePoll<GlobalMarketData>(() => fetchGlobal(), 60_000);
}

export function useTopCoins(page = 1, perPage = 50, sparkline = false) {
  return usePoll<CoinMarketData[]>(() => fetchCoins(page, perPage, sparkline), 60_000, [page, perPage, sparkline]);
}

export function useTrending() {
  return usePoll<TrendingCoin[]>(() => fetchTrending(), 300_000);
}

export function useFearGreed() {
  return usePoll<FearGreedData>(() => fetchFearGreed(), 600_000);
}

export function useCoinDetail(id: string) {
  return usePoll<any>(() => fetchCoinDetail(id), 120_000, [id]);
}

export function useCategories() {
  return usePoll<CategoryData[]>(() => fetchCategories(), 300_000);
}

export function useExchanges() {
  return usePoll<ExchangeData[]>(() => fetchExchanges(), 600_000);
}

export function useKlines(symbol: string, interval: string, limit = 200) {
  return usePoll<KlineData[]>(() => fetchKlines(symbol, interval, limit), 30_000, [symbol, interval, limit]);
}

export function useFundingRates() {
  return usePoll<FundingRateData[]>(() => fetchFunding(), 60_000);
}

export function useCryptoNews(limit = 30) {
  return usePoll<any[]>(() => fetchNews(limit), 120_000, [limit]);
}

export function useTechnicalSignals(symbol: string, interval: string) {
  const { data: klines, loading } = useKlines(symbol, interval);
  const signals = useMemo<TechnicalSignal[]>(() => {
    if (!klines || klines.length < 50) return [];
    try { return generateSignals(klines); } catch { return []; }
  }, [klines]);
  return { signals, klines, loading };
}
