/**
 * Trading Arena — shared kline-delta data hook
 *
 * Extracted from CvdTab.tsx (Phase 3): fetches Binance klines, reads
 * taker-buy volume (index 9), and derives per-bar delta + cumulative CVD.
 * Both CvdTab (full-page CVD view) and ChartTab's compact CVD/Delta
 * sub-panes consume this hook — one fetch/compute path, no duplicated logic.
 *
 *   per-bar delta  = takerBuyVolume − takerSellVolume
 *                  = 2 × takerBuyVolume − totalVolume
 *   CVD series     = running cumulative sum of per-bar delta
 *
 * Host: https://api.binance.com/api/v3/klines (same public host BinanceSource
 * uses — CORS-friendly, no geo-block at our scale).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UTCTimestamp } from 'lightweight-charts';
import type { Interval } from '@/components/charting/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of klines to request from Binance. 500 gives ~8h at 1m, ~3d at 15m. */
const FETCH_LIMIT = 500;

/** Auto-refresh cadence in milliseconds. 20 s is fast enough to stay current. */
const REFRESH_MS = 20_000;

/** Binance REST klines endpoint. */
const BINANCE_KLINES_URL = 'https://api.binance.com/api/v3/klines';

/** Map our internal interval names to Binance's accepted values. */
const INTERVAL_MAP: Record<Interval, string | null> = {
  '1s': null, // not supported — useKlineDelta is REST-klines only, no sub-minute bars
  '1m': '1m',
  '2m': null,
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '60m': '1h',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1wk': '1w',
  '1mo': '1M',
};

/**
 * Whether `useKlineDelta` can serve a given interval (see INTERVAL_MAP
 * above). Exported so callers (e.g. ChartTab.tsx's CVD/DELTA indicator gate)
 * can decide whether to even mount the hook's fetch without duplicating this
 * interval list.
 */
export function isKlineDeltaInterval(interval: Interval): boolean {
  return INTERVAL_MAP[interval] != null;
}

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

interface KlineBar {
  /** Bar open time in unix SECONDS (lightweight-charts wants seconds). */
  time: UTCTimestamp;
  totalVolume: number;
  takerBuyVolume: number;
}

export interface CvdPoint {
  time: UTCTimestamp;
  value: number;
}

export interface DeltaPoint {
  time: UTCTimestamp;
  value: number;
  /** true = net buy pressure (delta >= 0), false = net sell pressure. */
  isPositive: boolean;
}

export type KlineDeltaLoadState = 'loading' | 'loaded' | 'error';

export interface UseKlineDeltaResult {
  cvd: CvdPoint[];
  delta: DeltaPoint[];
  latestCvd: number | null;
  latestDelta: number | null;
  loadState: KlineDeltaLoadState;
  errorMsg: string;
}

// ---------------------------------------------------------------------------
// Fetch klines with taker-buy volume (index 9)
// ---------------------------------------------------------------------------

async function fetchKlines(symbol: string, interval: Interval): Promise<KlineBar[]> {
  const binanceInterval = INTERVAL_MAP[interval];
  if (!binanceInterval) {
    throw new Error(`useKlineDelta: interval "${interval}" not supported by Binance`);
  }

  const url = new URL(BINANCE_KLINES_URL);
  url.searchParams.set('symbol', symbol.toUpperCase());
  url.searchParams.set('interval', binanceInterval);
  url.searchParams.set('limit', String(FETCH_LIMIT));

  const resp = await fetch(url.toString());
  if (!resp.ok) {
    throw new Error(`useKlineDelta: Binance HTTP ${resp.status} for ${symbol}`);
  }

  const raw = (await resp.json()) as unknown;
  if (!Array.isArray(raw)) {
    throw new Error('useKlineDelta: malformed Binance payload (not an array)');
  }

  const bars: KlineBar[] = [];
  for (const k of raw) {
    // Binance klines array layout (indices):
    //   0  openTime_ms
    //   1  open
    //   2  high
    //   3  low
    //   4  close
    //   5  baseVolume          ← total base asset volume
    //   6  closeTime_ms
    //   7  quoteVolume
    //   8  numTrades
    //   9  takerBuyBaseVolume  ← TAKER BUY base asset volume (what we need)
    //  10  takerBuyQuoteVolume
    //  11  ignored
    if (!Array.isArray(k) || k.length < 10) continue;

    const timeSec = Math.floor(Number(k[0]) / 1000) as UTCTimestamp;
    const total = Number(k[5]);
    const takerBuy = Number(k[9]);

    if (!Number.isFinite(timeSec) || !Number.isFinite(total) || !Number.isFinite(takerBuy)) continue;

    bars.push({ time: timeSec, totalVolume: total, takerBuyVolume: takerBuy });
  }

  bars.sort((a, b) => (a.time as number) - (b.time as number));
  return bars;
}

// ---------------------------------------------------------------------------
// CVD computation
// ---------------------------------------------------------------------------

function computeCvdSeries(bars: KlineBar[]): { cvd: CvdPoint[]; delta: DeltaPoint[] } {
  const cvd: CvdPoint[] = [];
  const delta: DeltaPoint[] = [];

  let cumulative = 0;

  for (const bar of bars) {
    // per-bar delta = 2 × takerBuy − total
    // Positive → more aggressive buying than selling (net buy pressure)
    // Negative → more aggressive selling than buying (net sell pressure)
    const d = 2 * bar.takerBuyVolume - bar.totalVolume;
    cumulative += d;

    cvd.push({ time: bar.time, value: cumulative });
    delta.push({ time: bar.time, value: d, isPositive: d >= 0 });
  }

  return { cvd, delta };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches Binance klines for `symbol`/`interval`, derives per-bar delta +
 * cumulative CVD, and refreshes every 20s. Behavior mirrors the original
 * CvdTab fetch effect exactly (same fetch limit, same refresh cadence, same
 * computation) — this is a pure extraction, not a behavior change.
 *
 * `enabled` (default `true`, added for ChartTab.tsx's CVD/DELTA indicator
 * gate) lets a caller mount this hook unconditionally (rules of hooks) while
 * skipping the fetch/refresh effect entirely when the data isn't needed —
 * e.g. no CVD/DELTA indicator active, or a non-crypto symbol. Every existing
 * caller (CvdTab.tsx, CvdDeltaSubPanes.tsx) omits this param and is
 * byte-for-byte unaffected.
 */
export function useKlineDelta(symbol: string, interval: Interval, enabled: boolean = true): UseKlineDeltaResult {
  const [cvd, setCvd] = useState<CvdPoint[]>([]);
  const [delta, setDelta] = useState<DeltaPoint[]>([]);
  const [latestCvd, setLatestCvd] = useState<number | null>(null);
  const [latestDelta, setLatestDelta] = useState<number | null>(null);
  const [loadState, setLoadState] = useState<KlineDeltaLoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const loadData = useCallback(
    async (cancelled: { v: boolean }) => {
      try {
        const bars = await fetchKlines(symbol, interval);
        if (cancelled.v) return;

        const { cvd: cvdSeries, delta: deltaSeries } = computeCvdSeries(bars);

        setCvd(cvdSeries);
        setDelta(deltaSeries);
        if (cvdSeries.length > 0) setLatestCvd(cvdSeries[cvdSeries.length - 1].value);
        if (deltaSeries.length > 0) setLatestDelta(deltaSeries[deltaSeries.length - 1].value);
        setLoadState('loaded');
      } catch (err: unknown) {
        if (cancelled.v) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
        setLoadState('error');
      }
    },
    [symbol, interval],
  );

  const cancelledRef = useRef({ v: false });

  useEffect(() => {
    if (!enabled) return; // caller doesn't need this data — skip the fetch/refresh cycle entirely

    const cancelled = { v: false };
    cancelledRef.current = cancelled;
    setLoadState('loading');
    setErrorMsg('');

    void loadData(cancelled);

    const timer = setInterval(() => {
      void loadData(cancelled);
    }, REFRESH_MS);

    return () => {
      cancelled.v = true;
      clearInterval(timer);
    };
  }, [loadData, enabled]);

  return { cvd, delta, latestCvd, latestDelta, loadState, errorMsg };
}
