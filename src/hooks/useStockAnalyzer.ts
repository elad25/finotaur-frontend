// src/hooks/useStockAnalyzer.ts
// =====================================================
// 🪝 STOCK ANALYZER — Custom Hook (All State Management)
// =====================================================
// Extracted from the monolithic StockAnalyzer.tsx.
// Owns: selectedTicker, stockData, news, loading, error states.
// Exposes a clean API for the thin orchestrator page.
// =====================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { StockData, NewsItem, TabType, StockSuggestion } from '@/types/stock-analyzer.types';
import { POPULAR_TICKERS } from '@/constants/stock-analyzer.constants';
import { fetchAllStockData, fetchNews } from '@/services/stock-analyzer.api';

export function useStockAnalyzer() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Core state ──────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(
    searchParams.get('ticker')
  );
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // ── Data state ──────────────────────────────────────
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);

  // ── Loading / error state ───────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Derived: search suggestions ─────────────────────
  const suggestions = useMemo<StockSuggestion[]>(() => {
    if (!searchQuery) return POPULAR_TICKERS.slice(0, 6);
    const q = searchQuery.toLowerCase();
    return POPULAR_TICKERS.filter(
      (t) =>
        t.ticker.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  // ── Load stock data ─────────────────────────────────
  const loadStockData = useCallback(
    async (ticker: string) => {
      setIsLoading(true);
      setLoadError(null);
      setIsLoadingNews(true);
      setActiveTab('overview');

      try {
        const data = await fetchAllStockData(ticker);
        if (!data.price && !data.name) {
          setLoadError(
            `Could not find data for "${ticker}". Please check the ticker symbol.`
          );
          setStockData(null);
        } else {
          setStockData(data);
          setSearchParams({ ticker: ticker.toUpperCase() });
        }
      } catch (error) {
        console.error('Failed to load stock data:', error);
        setLoadError(
          'An error occurred while fetching data. Please try again.'
        );
        setStockData(null);
      } finally {
        setIsLoading(false);
      }

      // Load news in parallel (non-blocking)
      try {
        const newsData = await fetchNews(ticker);
        setNews(newsData);
      } catch {
        setNews([]);
      } finally {
        setIsLoadingNews(false);
      }
    },
    [setSearchParams]
  );

  // ── Select ticker handler ───────────────────────────
  const handleSelectTicker = useCallback(
    (ticker: string) => {
      setSelectedTicker(ticker);
      setSearchQuery('');
      loadStockData(ticker);
    },
    [loadStockData]
  );

  // ── Load from URL on mount ──────────────────────────
  useEffect(() => {
    const tickerFromUrl = searchParams.get('ticker');
    if (tickerFromUrl && !stockData) {
      setSelectedTicker(tickerFromUrl);
      loadStockData(tickerFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public API ──────────────────────────────────────
  return {
    // Search
    searchQuery,
    setSearchQuery,
    suggestions,

    // Selection
    selectedTicker,
    handleSelectTicker,

    // Tabs
    activeTab,
    setActiveTab,

    // Data
    stockData,
    news,

    // Status
    isLoading,
    isLoadingNews,
    loadError,
  };
}