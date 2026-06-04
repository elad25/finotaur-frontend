// ============================================================
// src/pages/app/commodities/_shared/hooks.ts
// React hooks with auto-polling for commodities data
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { fetchCommoditiesSnapshot, fetchSeasonality } from './api';
import type { CommoditiesSnapshot, SeasonalityData } from './types';

function usePoll<T>(fetcher: () => Promise<T>, interval: number, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const load = () =>
      fetcher()
        .then(d => { if (alive.current) { setData(d); setLoading(false); } })
        .catch(() => { if (alive.current) setLoading(false); });
    load();
    const id = interval > 0 ? setInterval(load, interval) : undefined;
    return () => { alive.current = false; if (id) clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading };
}

/** Poll the commodities snapshot every 5 minutes. */
export function useCommoditiesSnapshot() {
  return usePoll<CommoditiesSnapshot>(() => fetchCommoditiesSnapshot(), 300_000);
}

/** Fetch seasonality data once; refetches when symbol changes. */
export function useSeasonality(symbol: string) {
  return usePoll<SeasonalityData>(() => fetchSeasonality(symbol), 0, [symbol]);
}
