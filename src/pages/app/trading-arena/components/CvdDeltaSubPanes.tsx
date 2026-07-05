/**
 * Trading Arena — compact CVD / Delta sub-panes for the Chart tab
 *
 * Two ~120px-tall lightweight-charts v4 instances rendered below the main
 * FinotaurChart when the user toggles CVD and/or Delta on via
 * OrderFlowControls. Data comes from the shared `useKlineDelta` hook (same
 * fetch/compute path as the full-page CvdTab) — no duplicated Binance logic.
 *
 * Each pane owns its own chart instance (lightweight-charts v4 has no native
 * multi-pane API), same pattern as CvdTab's two stacked panes, just shorter.
 */

import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type DeepPartial,
  type ChartOptions,
} from 'lightweight-charts';
import type { Interval } from '@/components/charting/types';
import { useKlineDelta } from '../hooks/useKlineDelta';

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
}

/** Compact CVD line sub-pane. */
export function CvdSubPane({ symbol, interval, showTimeAxis }: SubPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const { cvd, loadState, errorMsg } = useKlineDelta(symbol, interval);

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
export function DeltaSubPane({ symbol, interval, showTimeAxis }: SubPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const { delta, loadState, errorMsg } = useKlineDelta(symbol, interval);

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
