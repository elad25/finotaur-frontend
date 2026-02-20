// =====================================================
// 🔁 FLOW SCANNER - useFlowData Hook
// Handles: initial load, auto-refresh, cache, stale states
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { FlowItem, SectorFlow, FlowStats } from './types';
import { fetchAllFlowData, invalidateFlowCache } from './api';
import { CACHE_TTL } from './constants';

interface FlowDataState {
  flowData: FlowItem[];
  sectorData: SectorFlow[];
  stats: FlowStats | null;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

const DEFAULT_STATE: FlowDataState = {
  flowData: [],
  sectorData: [],
  stats: null,
  isLoading: true,
  isRefreshing: false,
  lastUpdated: null,
  error: null,
};

/**
 * useFlowData
 * - Loads all data in one parallel batch on mount
 * - Auto-refreshes every 30s (CACHE_TTL.FLOW_DATA)
 * - Uses client-side cache to skip redundant server hits
 * - Exposes manual refresh for the Refresh button
 */
export function useFlowData() {
  const [state, setState] = useState<FlowDataState>(DEFAULT_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async (isRefresh = false) => {
    if (!mountedRef.current) return;

    setState(prev => ({
      ...prev,
      isLoading: !isRefresh && prev.flowData.length === 0,
      isRefreshing: isRefresh,
      error: null,
    }));

    try {
      const result = await fetchAllFlowData();
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        flowData: result.flowData,
        sectorData: result.sectorData,
        stats: result.stats,
        isLoading: false,
        isRefreshing: false,
        lastUpdated: new Date(),
      }));
    } catch (err) {
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: 'Failed to load flow data',
      }));
    }
  }, []);

  const refresh = useCallback(() => {
    invalidateFlowCache();
    load(true);
  }, [load]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    load(false);

    // Auto-refresh every 30s — cache handles deduplication across tabs
    intervalRef.current = setInterval(() => load(true), CACHE_TTL.FLOW_DATA);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  return { ...state, refresh };
}
