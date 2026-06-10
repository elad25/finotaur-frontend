// src/hooks/useETFAnalyzer.ts
// =====================================================
// ETF ANALYZER — Custom Hook (All State Management)
// =====================================================
// Mirrors useStockAnalyzer.ts:
//   ticker state, activeTab, data, loading, error, loadETF fn.
// =====================================================

import { useState, useCallback } from 'react';
import type { EtfData, EtfTabId } from '@/types/etf.types';
import { fetchETFData } from '@/services/etf-analyzer.api';

export interface UseETFAnalyzerResult {
  // Ticker state
  ticker: string | null;
  setTicker: (t: string | null) => void;

  // Tab state
  activeTab: EtfTabId;
  setActiveTab: (t: EtfTabId) => void;

  // Data state
  data: EtfData | null;

  // Status
  loading: boolean;
  error: string | null;

  // Actions
  loadETF: (ticker: string) => Promise<void>;
}

export function useETFAnalyzer(): UseETFAnalyzerResult {
  const [ticker, setTicker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EtfTabId>('overview');
  const [data, setData] = useState<EtfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadETF = useCallback(async (rawTicker: string) => {
    const symbol = rawTicker.toUpperCase().trim();
    if (!symbol) {
      setError('Please enter a valid ETF ticker.');
      return;
    }

    setLoading(true);
    setError(null);
    setActiveTab('overview');
    setTicker(symbol);

    try {
      const result = await fetchETFData(symbol);
      setData(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An error occurred while fetching ETF data.';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    ticker,
    setTicker,
    activeTab,
    setActiveTab,
    data,
    loading,
    error,
    loadETF,
  };
}
