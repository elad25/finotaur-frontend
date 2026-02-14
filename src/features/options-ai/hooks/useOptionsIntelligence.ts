// src/features/options-ai/hooks/useOptionsIntelligence.ts

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { OptionsData, OptionsTab, FilterType, FlowSubTab, BlockTier, UnusualFlow, BlockTrade, DeepDiveData } from '../types/options-ai.types';
import { AUTO_REFRESH_MS } from '../constants/options-ai.constants';
import { fetchAllOptionsData, refreshOptionsData, fetchDeepDive } from '../services/options-api.service';
import { fetchBlockTradesLive, clearBlockTradesCache } from '../services/blockTrades.service';

export function useOptionsIntelligence() {
  // ── UI State ──
  const [activeTab, setActiveTab] = useState<OptionsTab>('overview');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [flowSubTab, setFlowSubTab] = useState<FlowSubTab>('unusual');
  const [blockTier, setBlockTier] = useState<BlockTier>('all');
  const [selectedFlow, setSelectedFlow] = useState<UnusualFlow | null>(null);

  // ── Deep Dive State ──
  const [deepDiveTicker, setDeepDiveTicker] = useState('NVDA');
  const [deepDiveData, setDeepDiveData] = useState<DeepDiveData | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);

  // ── Data State ──
  const [data, setData] = useState<OptionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Live Block Trades State (real Polygon data) ──
  const [liveBlockTrades, setLiveBlockTrades] = useState<BlockTrade[]>([]);
  const [blockTradesMeta, setBlockTradesMeta] = useState<{
    tickersScanned: number;
    totalBlocksFound: number;
    blocksReturned: number;
    scanDurationMs: number;
    timestamp: string;
    isDelayed: boolean;
  } | null>(null);
  const [blockTradesSummary, setBlockTradesSummary] = useState<{
    totalPremium: string;
    longPremium: string;
    shortPremium: string;
    longPercent: number;
    shortPercent: number;
    blockCount: number;
    uniqueTickers: number;
    topTickers: { symbol: string; totalPremium: string; bias: string; blockCount: number }[];
    narrative: string;
  } | null>(null);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [blockTradesError, setBlockTradesError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const blockAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // ── Load main data ──
  const loadData = useCallback(async (isRefresh = false) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;
    if (isRefresh) setIsRefreshing(true); else setIsLoading(true);
    setLoadError(null);
    try {
      const result = isRefresh ? await refreshOptionsData(signal) : await fetchAllOptionsData(signal);
      if (mountedRef.current) setData(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (mountedRef.current) setLoadError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      if (mountedRef.current) { setIsLoading(false); setIsRefreshing(false); }
    }
  }, []);

  useEffect(() => { mountedRef.current = true; loadData(); return () => { mountedRef.current = false; abortRef.current?.abort(); blockAbortRef.current?.abort(); }; }, [loadData]);
  useEffect(() => { if (!data) return; const jitter = Math.random() * 60_000; const i = setInterval(() => loadData(true), AUTO_REFRESH_MS + jitter); return () => clearInterval(i); }, [data, loadData]);

  // ── Live Block Trades loader (real Polygon via backend) ──
  const loadBlockTrades = useCallback(async (forceRefresh = false) => {
    blockAbortRef.current?.abort();
    blockAbortRef.current = new AbortController();
    const { signal } = blockAbortRef.current;

    if (forceRefresh) clearBlockTradesCache();
    setIsLoadingBlocks(true);
    setBlockTradesError(null);

    try {
      const { blocks, meta, summary } = await fetchBlockTradesLive(undefined, signal);
      if (mountedRef.current) {
        setLiveBlockTrades(blocks);
        setBlockTradesMeta(meta);
        setBlockTradesSummary(summary);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (mountedRef.current) {
        setBlockTradesError(err instanceof Error ? err.message : 'Block trades fetch failed');
        // Don't clear existing data — keep showing last successful fetch
      }
    } finally {
      if (mountedRef.current) setIsLoadingBlocks(false);
    }
  }, []);

  // Load block trades when flow tab becomes active, and auto-refresh
  useEffect(() => {
    if (activeTab === 'flow') {
      loadBlockTrades();
      // Auto-refresh block trades every 5 minutes
      const interval = setInterval(() => loadBlockTrades(), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [activeTab, loadBlockTrades]);

  // ── Deep Dive loader ──
  const loadDeepDive = useCallback(async (ticker: string) => {
    setDeepDiveTicker(ticker);
    setDeepDiveLoading(true);
    try {
      const result = await fetchDeepDive(ticker);
      if (mountedRef.current) setDeepDiveData(result);
    } catch { /* ignore */ }
    finally { if (mountedRef.current) setDeepDiveLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === 'deepdive') loadDeepDive(deepDiveTicker); }, [activeTab]); // eslint-disable-line

  // ── Derived ──
  const filteredFlows = useMemo(() => {
    if (!data) return [];
    if (typeFilter === 'all') return data.unusualFlows;
    return data.unusualFlows.filter(f => f.type === typeFilter);
  }, [data, typeFilter]);

  // Use live block trades if available, fall back to mock data
  const activeBlockTrades = useMemo(() => {
    return liveBlockTrades.length > 0 ? liveBlockTrades : (data?.blockTrades ?? []);
  }, [liveBlockTrades, data]);

  const filteredBlocks = useMemo(() => {
    if (blockTier === 'all') return activeBlockTrades;
    return activeBlockTrades.filter(b => b.premiumTier === blockTier);
  }, [activeBlockTrades, blockTier]);

  const unreadAlerts = useMemo(() => data?.alerts.filter(a => !a.read).length ?? 0, [data]);

  // ── Callbacks ──
  const handleFilterChange = useCallback((f: FilterType) => setTypeFilter(f), []);
  const handleFlowClick = useCallback((f: UnusualFlow) => setSelectedFlow(f), []);
  const handleCloseDrawer = useCallback(() => setSelectedFlow(null), []);
  const handleRefresh = useCallback(() => { loadData(true); loadBlockTrades(true); }, [loadData, loadBlockTrades]);

  return {
    activeTab, setActiveTab,
    typeFilter, flowSubTab, setFlowSubTab, blockTier, setBlockTier,
    selectedFlow, data, isLoading, isRefreshing, loadError,
    filteredFlows, filteredBlocks, unreadAlerts,
    deepDiveTicker, deepDiveData, deepDiveLoading, loadDeepDive,
    handleFilterChange, handleFlowClick, handleCloseDrawer, handleRefresh,
    // ── New: Live block trades ──
    liveBlockTrades, blockTradesMeta, blockTradesSummary, isLoadingBlocks, blockTradesError,
    loadBlockTrades,
  } as const;
}