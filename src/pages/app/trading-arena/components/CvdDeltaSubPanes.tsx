/**
 * Trading Arena — compact CVD / Delta sub-panes for the Chart tab
 *
 * Two ~120px-tall lightweight-charts v4 instances rendered below the main
 * FinotaurChart when the user toggles CVD and/or Delta on via
 * OrderFlowControls.
 *
 * TWO DATA PATHS (caller picks by passing or omitting `store`):
 *   1. Klines path (default, unchanged) — `useKlineDelta` fetches Binance
 *      klines and derives per-bar delta + cumulative CVD from taker-buy
 *      volume. Same fetch/compute path as the full-page CvdTab. Deeper
 *      history (500 bars) but Binance-only — this is what the crypto
 *      ChartTab keeps using today.
 *   2. FlowBinStore path (new, opt-in via `store` prop) — reads live,
 *      source-agnostic per-candle deltas directly from the same
 *      FlowBinStore the footprint/volume-profile overlays already use
 *      (`store.getRange()` for per-candle delta, `store.getCvdSeries()`
 *      for the cumulative line). No extra network call — this is the path
 *      futures order flow will use once a non-Binance TradeSource lands,
 *      since FlowBinStore has no Binance-specific assumptions.
 *
 * Both paths render into the exact same SubPaneShell/chart plumbing —
 * omitting `store` is a complete no-op for existing callers (backward
 * compatible; the crypto ChartTab does not pass it).
 *
 * Each pane owns its own chart instance (lightweight-charts v4 has no native
 * multi-pane API), same pattern as CvdTab's two stacked panes, just shorter.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type DeepPartial,
  type ChartOptions,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Interval } from '@/components/charting/types';
import { useKlineDelta, type CvdPoint, type DeltaPoint, type KlineDeltaLoadState } from '../hooks/useKlineDelta';
import type { FlowBinStore } from '@/components/charting/orderflow/flowBinStore';

const SUB_PANE_HEIGHT_PX = 120;

const PALETTE = {
  background: '#08080a',
  grid: '#1f1f23',
  border: '#3f3f46',
  text: '#a1a1aa',
  textAxis: '#71717a',
  crosshair: '#9ca3af',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  cvdLine: '#C9A646',
  deltaPos: '#22c55e',
  deltaNeg: '#dc2626',
  zero: '#505050',
} as const;

function buildSubPaneOptions(showTimeAxis: boolean): DeepPartial<ChartOptions> {
  return {
    layout: {
      background: { type: ColorType.Solid, color: PALETTE.background },
      textColor: PALETTE.text,
      fontFamily: PALETTE.fontFamily,
      fontSize: 10,
      // Removes the TradingView wordmark (matches FinotaurChart.tsx / CvdTab.tsx).
      attributionLogo: false,
    },
    grid: {
      vertLines: { color: PALETTE.grid, style: LineStyle.Dotted, visible: true },
      horzLines: { color: PALETTE.grid, style: LineStyle.Dotted, visible: true },
    },
    rightPriceScale: {
      borderColor: PALETTE.border,
      textColor: PALETTE.textAxis,
    },
    timeScale: {
      borderColor: PALETTE.border,
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 4,
      visible: showTimeAxis,
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: PALETTE.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: PALETTE.crosshair },
      horzLine: { color: PALETTE.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: PALETTE.crosshair },
    },
    handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    autoSize: false,
  };
}

interface SubPaneShellProps {
  label: string;
  symbol: string;
  containerRef: React.RefObject<HTMLDivElement>;
  errorMsg?: string;
  loadState: 'loading' | 'loaded' | 'error';
}

function SubPaneShell({ label, symbol, containerRef, errorMsg, loadState }: SubPaneShellProps) {
  return (
    <div
      className="relative w-full flex-shrink-0 border-t"
      style={{ height: SUB_PANE_HEIGHT_PX, borderColor: 'rgba(201,166,70,0.10)' }}
    >
      <div className="absolute left-2 top-1 z-10 text-[10px] font-semibold text-[#707070] pointer-events-none">
        {label} <span className="text-[#454545] font-normal">{symbol}</span>
      </div>
      {loadState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#08080a]">
          <span className="text-[11px] text-[#ef4444]">{errorMsg || 'Failed to load'}</span>
        </div>
      )}
      {loadState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#08080a]">
          <span className="text-[11px] text-[#505050]">Loading…</span>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" aria-label={`${label} sub-pane`} />
    </div>
  );
}

interface SubPaneProps {
  symbol: string;
  interval: Interval;
  /** Show the time axis on this pane — pass true only for the bottom-most visible pane. */
  showTimeAxis: boolean;
  /**
   * Optional FlowBinStore — when provided, the pane reads live per-candle
   * deltas directly from the store (source-agnostic path) instead of
   * fetching Binance klines via `useKlineDelta`. Omit for the existing
   * klines-based behavior (unchanged default — the crypto ChartTab keeps
   * using klines for their deeper history).
   */
  store?: FlowBinStore;
}

/** Window (seconds) of store history read on each poll — matches the ~500-bar
 * klines fetch window loosely; FlowBinStore itself caps memory via its raw
 * trade ring buffer, this just bounds how far back getRange() scans. */
const STORE_WINDOW_SEC = 60 * 60 * 24; // 24h — generous, cheap (getRange scans a Map by key).
/** Poll cadence for the store-backed path — the store already updates live via
 * onChange, but re-deriving cvd/delta arrays on every single trade tick would
 * thrash React state; poll at the same cadence as the klines path instead. */
const STORE_POLL_MS = 2_000;

/**
 * Reads per-candle delta + cumulative CVD directly from a FlowBinStore.
 * Mirrors useKlineDelta's return shape so both SubPaneShell consumers
 * (CvdSubPane / DeltaSubPane below) can share one render path regardless of
 * which data source is active.
 *
 * `store` is optional and the hook is ALWAYS called (rules of hooks) —
 * pass undefined to no-op (empty arrays, 'loading' state, zero subscriptions).
 * Callers select between this hook's result and useKlineDelta's based on
 * whether `store` was provided.
 */
function useStoreDelta(store: FlowBinStore | undefined): {
  cvd: CvdPoint[];
  delta: DeltaPoint[];
  loadState: KlineDeltaLoadState;
  errorMsg: string;
} {
  const cvdRef = useRef<CvdPoint[]>([]);
  const deltaRef = useRef<DeltaPoint[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!store) return;

    function recompute() {
      if (!store) return;
      const nowSec = Math.floor(Date.now() / 1000);
      const candles = store.getRange(nowSec - STORE_WINDOW_SEC, nowSec + 3600);
      const cvdSeries = store.getCvdSeries(nowSec - STORE_WINDOW_SEC, nowSec + 3600);
      cvdRef.current = cvdSeries.map((p) => ({ time: p.time as UTCTimestamp, value: p.cvd }));
      deltaRef.current = candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.delta,
        isPositive: c.delta >= 0,
      }));
      setTick((n) => n + 1);
    }

    recompute();
    const unsubscribe = store.onChange(recompute);
    const poll = setInterval(recompute, STORE_POLL_MS);
    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, [store]);

  // `tick` is read here only to keep the memo dependency honest — the arrays
  // themselves are mutated in the refs above and re-read on each recompute;
  // useMemo just gives callers a stable reference per tick.
  return useMemo(
    () => ({
      cvd: cvdRef.current,
      delta: deltaRef.current,
      loadState: (store ? 'loaded' : 'loading') as KlineDeltaLoadState,
      errorMsg: '',
    }),
    [store, tick],
  );
}

/** Compact CVD line sub-pane. */
export function CvdSubPane({ symbol, interval, showTimeAxis, store }: SubPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  // Both hooks are always called (rules of hooks) — only the active one's
  // result is used, selected by whether `store` was provided.
  const klineResult = useKlineDelta(symbol, interval);
  const storeResult = useStoreDelta(store);
  const { cvd, loadState, errorMsg } = store ? storeResult : klineResult;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      ...buildSubPaneOptions(showTimeAxis),
      width: el.clientWidth,
      height: el.clientHeight,
    });
    const series = chart.addLineSeries({
      color: PALETTE.cvdLine,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
    });
    series.createPriceLine({
      price: 0,
      color: PALETTE.zero,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: '',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) chart.applyOptions({ width: w, height: h });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      try { chart.remove(); } catch { /* ignore */ }
      chartRef.current = null;
      seriesRef.current = null;
    };
    // showTimeAxis is fixed for a given mount position (top vs bottom pane) —
    // re-mounting the chart to toggle it is an acceptable (and rare) cost.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTimeAxis]);

  useEffect(() => {
    if (loadState !== 'loaded') return;
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    series.setData(cvd);
    chart.timeScale().fitContent();
  }, [cvd, loadState]);

  return (
    <SubPaneShell
      label="CVD"
      symbol={symbol}
      containerRef={containerRef}
      errorMsg={errorMsg}
      loadState={loadState}
    />
  );
}

/** Compact per-bar Delta histogram sub-pane. */
export function DeltaSubPane({ symbol, interval, showTimeAxis, store }: SubPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  // Both hooks are always called (rules of hooks) — only the active one's
  // result is used, selected by whether `store` was provided.
  const klineResult = useKlineDelta(symbol, interval);
  const storeResult = useStoreDelta(store);
  const { delta, loadState, errorMsg } = store ? storeResult : klineResult;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      ...buildSubPaneOptions(showTimeAxis),
      width: el.clientWidth,
      height: el.clientHeight,
    });
    const series = chart.addHistogramSeries({
      priceLineVisible: false,
      lastValueVisible: false,
      base: 0,
    });
    series.createPriceLine({
      price: 0,
      color: PALETTE.zero,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: '',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) chart.applyOptions({ width: w, height: h });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      try { chart.remove(); } catch { /* ignore */ }
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTimeAxis]);

  useEffect(() => {
    if (loadState !== 'loaded') return;
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    series.setData(
      delta.map((d) => ({
        time: d.time,
        value: d.value,
        color: d.isPositive ? PALETTE.deltaPos : PALETTE.deltaNeg,
      })),
    );
    chart.timeScale().fitContent();
  }, [delta, loadState]);

  return (
    <SubPaneShell
      label="Delta"
      symbol={symbol}
      containerRef={containerRef}
      errorMsg={errorMsg}
      loadState={loadState}
    />
  );
}
