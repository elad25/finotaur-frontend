// ============================================================
// src/pages/app/forex/_shared/hooks.ts
// React hooks with auto-polling for all forex data
// Mirrors crypto/_shared/hooks.ts — same usePoll pattern
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { forexFetch } from './api';
import type {
  ForexHeatmapResponse,
  ForexMoversResponse,
  DXYSeriesResponse,
  ForexIntradayResponse,
  ForexCommentaryResponse,
  ForexCBRatesResponse,
  ForexCOTResponse,
  ForexCorrelationResponse,
  ForexMacroResponse,
} from './types';

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

/** Currency pair heatmap — 30s poll. */
export function useForexHeatmap() {
  return usePoll<ForexHeatmapResponse>(
    () => forexFetch<ForexHeatmapResponse>('/api/forex/heatmap'),
    30_000,
  );
}

/** Top forex gainers and losers — 30s poll. */
export function useForexStrength() {
  return usePoll<ForexMoversResponse>(
    () => forexFetch<ForexMoversResponse>('/api/forex/movers'),
    30_000,
  );
}

/** DXY index time series — 5min poll. `range` defaults to '1m'. */
export function useDXYSeries(range = '1m') {
  return usePoll<DXYSeriesResponse>(
    () => forexFetch<DXYSeriesResponse>('/api/forex/dxy/series?range=' + range),
    300_000,
    [range],
  );
}

/** Intraday OHLCV bars for a specific forex pair — 60s poll. */
export function useForexIntraday(symbol: string) {
  return usePoll<ForexIntradayResponse>(
    () => forexFetch<ForexIntradayResponse>('/api/forex/intraday/' + symbol),
    60_000,
    [symbol],
  );
}

// ============================================================
// Sprint-2 hooks
// ============================================================

/** AI market commentary — fetch once (no interval). */
export function useForexCommentary() {
  return usePoll<ForexCommentaryResponse>(
    () => forexFetch<ForexCommentaryResponse>('/api/forex/commentary'),
    0,
  );
}

/** Central-bank policy rates + carry differentials — 1h poll. */
export function useForexCBRates() {
  return usePoll<ForexCBRatesResponse>(
    () => forexFetch<ForexCBRatesResponse>('/api/forex/cb-rates'),
    3_600_000,
  );
}

/** COT (Commitment of Traders) positioning — 1h poll. */
export function useForexCOT() {
  return usePoll<ForexCOTResponse>(
    () => forexFetch<ForexCOTResponse>('/api/forex/cot'),
    3_600_000,
  );
}

/** Pair correlation matrix — 1h poll. `window` defaults to '30d'. */
export function useForexCorrelation(window = '30d') {
  return usePoll<ForexCorrelationResponse>(
    () => forexFetch<ForexCorrelationResponse>('/api/forex/correlation?window=' + window),
    3_600_000,
    [window],
  );
}

/** Macro cockpit for a single currency — 1h poll. */
export function useForexMacro(currency: string) {
  return usePoll<ForexMacroResponse>(
    () => forexFetch<ForexMacroResponse>('/api/forex/macro/' + currency),
    3_600_000,
    [currency],
  );
}
