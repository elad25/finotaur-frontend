// =====================================================
// 🔁 FLOW SCANNER — useFlowData Hook v2
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

export function useFlowData() {
  const [state, setState] = useState<FlowDataState>(DEFAULT_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef  = useRef(true);

  const load = useCallback(async (isRefresh = false) => {
    if (!mountedRef.current) return;
    setState(prev => ({
      ...prev,
      isLoading:    !isRefresh && prev.flowData.length === 0,
      isRefreshing: isRefresh,
      error: null,
    }));
    try {
      const result = await fetchAllFlowData();
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        ...result,
        isLoading:    false,
        isRefreshing: false,
        lastUpdated:  new Date(),
      }));
    } catch {
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        isLoading:    false,
        isRefreshing: false,
        error: 'Failed to load flow data',
      }));
    }
  }, []);

  const refresh = useCallback(() => {
    invalidateFlowCache();
    load(true);
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    load(false);
    intervalRef.current = setInterval(() => load(true), CACHE_TTL.FLOW_DATA);
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  return { ...state, refresh };
}
