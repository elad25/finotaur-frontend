/**
 * FinotaurChart — the proprietary chart primitive.
 *
 * Built on `lightweight-charts` (TradingView's MIT-licensed OSS library).
 * Generic: zero knowledge of Trade / Backtest / any business object.
 * Callers (TradeChart, future ReplayChart, Live tab) translate their domain
 * objects into the props below.
 *
 * Responsibilities:
 *   - Mount a candlestick series in a container div
 *   - Fetch OHLCV bars via the injected ChartDataSource
 *   - Apply markers (entry/exit arrows etc.) via lightweight-charts native API
 *   - Apply optional indicator overlays (SMA/EMA/VWAP on price pane; RSI in
 *     its own bottom 25% via scaleMargins on a dedicated price scale)
 *   - Resize responsively (ResizeObserver)
 *   - Show loading / empty / error overlays
 *   - Clean up on unmount
 *
 * What this component is NOT (deferred to a future phase):
 *   - Drawing tools (trendlines, fib, rectangles)
 *   - Live tick subscription
 *   - True multi-pane API (lightweight-charts v4 has none — we approximate
 *     with shared-chart scaleMargins for RSI)
 *   - Light theme (Phase 0 is dark only per OQ #4)
 *
 * THEME CUSTOMIZATION:
 *   All visual tokens live in FINOTAUR_DARK_THEME below. Tweak there to
 *   change colors / typography across every chart in the app. Per Elad:
 *   "looks similar to TradingView but distinct — we'll talk about what
 *   exactly to change later." Keep this object as the single seam.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type DeepPartial,
  type ChartOptions,
  type UTCTimestamp,
} from 'lightweight-charts';

import type {
  Bar,
  ChartDataSource,
  ChartMarker,
  ChartTheme,
  Indicator,
  IndicatorType,
  Interval,
} from './types';
import {
  computeATR,
  computeBollinger,
  computeEMA,
  computeMACD,
  computeRSI,
  computeSMA,
  computeVWAP,
} from './indicators';

// ═══════════════════════════════════════════════════════════════
// THEME TOKENS — the seam for visual customization
// ═══════════════════════════════════════════════════════════════
// "Finotaur Signature" — looks like TradingView at first glance so traders
// recognize it, feels distinctly Finotaur on second glance via palette,
// gold accents, dotted grid, premium near-black background, watermark.
//
// To tweak look-and-feel, change ONLY the values here. Every chart in the
// app pulls from this object — one diff, global effect.
const FINOTAUR_DARK_THEME = {
  // ─── Surfaces ──────────────────────────────────────────────
  background: '#08080a',        // near-black premium (slightly deeper than zinc-950)
  grid: '#1f1f23',              // very subtle (between zinc-900 and zinc-800)
  border: '#3f3f46',            // zinc-700

  // ─── Text ──────────────────────────────────────────────────
  text: '#a1a1aa',              // zinc-400
  textAxis: '#71717a',          // zinc-500

  // ─── Candles ───────────────────────────────────────────────
  // Vivid but professional — slightly more saturated than React defaults
  candleUp: '#22c55e',          // green-500 (LONG / bull)
  candleDown: '#dc2626',        // red-600   (SHORT / bear)
  candleWickUp: '#16a34a',      // green-600 wicks slightly muted
  candleWickDown: '#b91c1c',    // red-700 wicks slightly muted
  candleBorderUp: '#22c55e',
  candleBorderDown: '#dc2626',

  // ─── Brand accents (Finotaur gold) ────────────────────────
  // Used ONLY for static brand identity (brand bar, watermark, symbol chip).
  // Interactive elements (crosshair, live price) use neutral gray so the
  // gold accents don't compete for attention while the user is reading bars.
  brandGold: '#eab308',         // yellow-500 — primary brand color
  brandGoldDim: 'rgba(234, 179, 8, 0.07)',  // for watermark + subtle bg accents

  // ─── Crosshair + price line — NEUTRAL GRAY ────────────────
  // Per Elad 2026-05-17: crosshair + price label should not compete
  // visually with bars. Gray reads as "tool / measurement", gold reads
  // as "brand attention" — keep the two registers separated.
  crosshair: '#9ca3af',         // gray-400 — bright enough to track, neutral
  priceLineColor: '#9ca3af',    // same — live price label on right edge

  // ─── Typography ────────────────────────────────────────────
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  fontSizeAxis: 11,
} as const;

// ─── Light theme — TradingView-style white canvas ──────────────
const FINOTAUR_LIGHT_THEME = {
  background:        '#ffffff',
  grid:              '#e1e3eb',
  border:            '#d1d4dc',
  text:              '#131722',
  textAxis:          '#787b86',
  candleUp:          '#26a69a',
  candleDown:        '#ef5350',
  candleWickUp:      '#26a69a',
  candleWickDown:    '#ef5350',
  candleBorderUp:    '#26a69a',
  candleBorderDown:  '#ef5350',
  brandGold:         '#C9A646',
  brandGoldDim:      'rgba(201, 166, 70, 0.10)',
  crosshair:         '#787b86',
  priceLineColor:    '#787b86',
  fontFamily:        FINOTAUR_DARK_THEME.fontFamily,
  fontSizeAxis:      11,
} as const;

function pickTheme(mode: ChartTheme) {
  return mode === 'light' ? FINOTAUR_LIGHT_THEME : FINOTAUR_DARK_THEME;
}

// ═══════════════════════════════════════════════════════════════
// Indicator palette
// ═══════════════════════════════════════════════════════════════
// Per-type defaults — each picked to be distinguishable from candle
// green/red AND from each other. Callers can override per-Indicator via
// `Indicator.color`. For multi-series indicators (MACD, Bollinger) the
// palette value is the PRIMARY line color; companion lines have their
// own constants below.
const INDICATOR_COLORS: Record<IndicatorType, string> = {
  SMA: '#7dd3fc',     // sky-300 — moving average, "soft trend"
  EMA: '#fcd34d',     // amber-300 — faster MA, "warmer / shorter horizon"
  VWAP: '#c4b5fd',    // violet-300 — volume-weighted, distinct hue
  RSI: '#d4d4d8',     // zinc-300 — sits in its own pane, neutral
  MACD: '#fcd34d',    // amber-300 — MACD line (paired with signal amber-400)
  BBANDS: '#a78bfa',  // violet-400 — middle band (distinct from VWAP violet-300)
  ATR: '#94a3b8',     // slate-400 — sits in its own pane (distinct from RSI zinc)
};

// Companion colors for the multi-series indicators
const MACD_SIGNAL_COLOR = '#fbbf24';                 // amber-400, slightly bolder than MACD line
const BBANDS_BAND_COLOR = 'rgba(167, 139, 250, 0.5)'; // violet-400 at 0.5 opacity for upper/lower

// Subpane price-scale IDs. Each unknown id creates a new overlay scale in
// lightweight-charts. The candle pane uses the built-in `right` scale.
const RSI_PRICE_SCALE_ID = 'rsi';
const MACD_PRICE_SCALE_ID = 'macd';
const ATR_PRICE_SCALE_ID = 'atr';

// ═══════════════════════════════════════════════════════════════
// Pane allocation — dynamic scaleMargins for 0-3 active subpanes
// ═══════════════════════════════════════════════════════════════
// `lightweight-charts` v4 has no native multi-pane API (added in v5). We
// approximate panes by giving each subpane its own overlay price scale and
// carving the vertical space via `scaleMargins`. The candle pane shrinks
// as more subpanes activate.
//
// scaleMargins semantics:
//   { top: a, bottom: b }  →  scale occupies y ∈ [a, 1 − b]  (a + b ≤ 1)
//
// Subpane order top→bottom when more than one is active: RSI, MACD, ATR.
// Order is fixed (not user-configurable in Phase 2.5) so the layout is
// predictable across reload.
type ScaleMargins = { top: number; bottom: number };
interface PaneMargins {
  candle: ScaleMargins;
  rsi?: ScaleMargins;
  macd?: ScaleMargins;
  atr?: ScaleMargins;
}

function computePaneMargins(subpanes: {
  rsi: boolean;
  macd: boolean;
  atr: boolean;
}): PaneMargins {
  const count =
    (subpanes.rsi ? 1 : 0) + (subpanes.macd ? 1 : 0) + (subpanes.atr ? 1 : 0);

  if (count === 0) {
    return { candle: { top: 0.1, bottom: 0.1 } };
  }
  if (count === 1) {
    // Phase 2 behavior preserved: candle compresses, single subpane at bottom
    const candle: ScaleMargins = { top: 0.05, bottom: 0.3 };
    const sub: ScaleMargins = { top: 0.75, bottom: 0.05 };
    return {
      candle,
      rsi: subpanes.rsi ? sub : undefined,
      macd: subpanes.macd ? sub : undefined,
      atr: subpanes.atr ? sub : undefined,
    };
  }
  if (count === 2) {
    const candle: ScaleMargins = { top: 0.05, bottom: 0.5 };
    const slotTop: ScaleMargins = { top: 0.55, bottom: 0.27 }; // height ≈ 18%
    const slotBot: ScaleMargins = { top: 0.78, bottom: 0.04 }; // height ≈ 18%
    return assignSlots(subpanes, candle, [slotTop, slotBot]);
  }
  // count === 3
  const candle: ScaleMargins = { top: 0.05, bottom: 0.55 };
  const slot1: ScaleMargins = { top: 0.45, bottom: 0.37 }; // y∈[0.45, 0.63]
  const slot2: ScaleMargins = { top: 0.63, bottom: 0.19 }; // y∈[0.63, 0.81]
  const slot3: ScaleMargins = { top: 0.81, bottom: 0.02 }; // y∈[0.81, 0.98]
  return assignSlots(subpanes, candle, [slot1, slot2, slot3]);
}

// Helper: drop subpanes into available slots in RSI→MACD→ATR order.
function assignSlots(
  subpanes: { rsi: boolean; macd: boolean; atr: boolean },
  candle: ScaleMargins,
  slots: ScaleMargins[],
): PaneMargins {
  const out: PaneMargins = { candle };
  let idx = 0;
  if (subpanes.rsi) out.rsi = slots[idx++];
  if (subpanes.macd) out.macd = slots[idx++];
  if (subpanes.atr) out.atr = slots[idx++];
  return out;
}

// ═══════════════════════════════════════════════════════════════
// Series factory — instantiates the right number of series per indicator
// ═══════════════════════════════════════════════════════════════
// Single-series indicators (SMA / EMA / RSI / VWAP / ATR) return [line].
// Multi-series indicators return their series in a fixed order:
//   MACD   → [macdLine, signalLine, histogram]
//   BBANDS → [middle, upper, lower]
//
// Caller stores the returned array in `indicatorSeriesRef.current` and
// pulls them by index when feeding data.
function createSeriesForType(
  chart: IChartApi,
  type: IndicatorType,
  primaryColor: string,
  themeTokens: typeof FINOTAUR_DARK_THEME | typeof FINOTAUR_LIGHT_THEME,
): ISeriesApi<'Line' | 'Histogram'>[] {
  switch (type) {
    case 'RSI': {
      const line = chart.addLineSeries({
        color: primaryColor,
        lineWidth: 2,
        priceScaleId: RSI_PRICE_SCALE_ID,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      // Classic 30 / 70 reference lines — dotted, neutral, no axis label.
      line.createPriceLine({
        price: 30,
        color: themeTokens.textAxis,
        lineWidth: 1,
        lineStyle: 1,
        axisLabelVisible: false,
        title: '',
      });
      line.createPriceLine({
        price: 70,
        color: themeTokens.textAxis,
        lineWidth: 1,
        lineStyle: 1,
        axisLabelVisible: false,
        title: '',
      });
      return [line];
    }
    case 'MACD': {
      const macdLine = chart.addLineSeries({
        color: primaryColor,
        lineWidth: 2,
        priceScaleId: MACD_PRICE_SCALE_ID,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      const signalLine = chart.addLineSeries({
        color: MACD_SIGNAL_COLOR,
        lineWidth: 2,
        priceScaleId: MACD_PRICE_SCALE_ID,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      const histogram = chart.addHistogramSeries({
        priceScaleId: MACD_PRICE_SCALE_ID,
        priceLineVisible: false,
        lastValueVisible: false,
        base: 0,
        // color is set per-data-point (HistogramDataPoint.color) so positive
        // bars paint green and negative bars paint red on the same series.
      });
      // Zero reference line — common-sense visual anchor for momentum sign
      macdLine.createPriceLine({
        price: 0,
        color: themeTokens.textAxis,
        lineWidth: 1,
        lineStyle: 1,
        axisLabelVisible: false,
        title: '',
      });
      return [macdLine, signalLine, histogram];
    }
    case 'BBANDS': {
      const middle = chart.addLineSeries({
        color: primaryColor,
        lineWidth: 2,
        priceScaleId: 'right',
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      const upper = chart.addLineSeries({
        color: BBANDS_BAND_COLOR,
        lineWidth: 1,
        priceScaleId: 'right',
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      const lower = chart.addLineSeries({
        color: BBANDS_BAND_COLOR,
        lineWidth: 1,
        priceScaleId: 'right',
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      return [middle, upper, lower];
    }
    case 'ATR': {
      const line = chart.addLineSeries({
        color: primaryColor,
        lineWidth: 2,
        priceScaleId: ATR_PRICE_SCALE_ID,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      return [line];
    }
    case 'SMA':
    case 'EMA':
    case 'VWAP':
    default: {
      // Single-line overlay on the price pane
      const line = chart.addLineSeries({
        color: primaryColor,
        lineWidth: 2,
        priceScaleId: 'right',
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      return [line];
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Chart options builder
// ═══════════════════════════════════════════════════════════════
function buildChartOptions(theme: ChartTheme): DeepPartial<ChartOptions> {
  const t = pickTheme(theme);
  return {
    layout: {
      background: { type: ColorType.Solid, color: t.background },
      textColor: t.text,
      fontFamily: t.fontFamily,
      fontSize: t.fontSizeAxis,
    },
    grid: {
      // Dotted, very subtle — "we know the grid exists but it doesn't shout"
      vertLines: { color: t.grid, style: 2, visible: true },
      horzLines: { color: t.grid, style: 2, visible: true },
    },
    rightPriceScale: {
      borderColor: t.border,
      textColor: t.textAxis,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    },
    timeScale: {
      borderColor: t.border,
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 6,
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: t.crosshair,
        width: 1,
        style: 3,
        labelBackgroundColor: t.crosshair,
      },
      horzLine: {
        color: t.crosshair,
        width: 1,
        style: 3,
        labelBackgroundColor: t.crosshair,
      },
    },
    handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: false,
    },
    autoSize: false,
  };
}

// ═══════════════════════════════════════════════════════════════
// Marker icon overlay type
// ═══════════════════════════════════════════════════════════════
/**
 * Describes a single icon-in-circle marker rendered as an HTML overlay on top
 * of the lightweight-charts canvas. Parallel to ChartMarker — the native circle
 * dot lives on the canvas; the arrow icon lives in this overlay.
 */
export interface MarkerIcon {
  /** UTC timestamp (seconds) matching the corresponding ChartMarker. */
  time: UTCTimestamp;
  /** Price level the icon should be anchored to. */
  price: number;
  /** 'up' = ArrowUp icon (BUY direction); 'down' = ArrowDown icon (SELL direction). */
  direction: 'up' | 'down';
  /** Background color of the circle (e.g. '#C9A646' or '#E24B4A'). */
  color: string;
  /**
   * Vertical offset from the computed price coordinate.
   * Positive = below (for belowBar markers), negative = above (for aboveBar markers).
   */
  offsetY: number;
}

// ═══════════════════════════════════════════════════════════════
// Component props
// ═══════════════════════════════════════════════════════════════
export interface FinotaurChartProps {
  /** Source-native symbol (Yahoo: `MNQ=F`, Binance: `BTCUSDT`). Caller resolves. */
  symbol: string;
  /** Bar interval. Source resolves to its native format. */
  interval: Interval;
  /** Window start (Unix seconds, UTC). */
  from: number;
  /** Window end (Unix seconds, UTC). */
  to: number;
  /** Pluggable bar fetch. Use pickDataSource(symbol) in the caller. */
  dataSource: ChartDataSource;
  /** Optional markers (entry/exit arrows etc.). */
  markers?: ChartMarker[];
  /**
   * Optional icon-in-circle overlay markers (ArrowUp / ArrowDown) positioned
   * over the lightweight-charts canvas. Pass in parallel with `markers` —
   * the native colored circle is the background dot; these icons sit on top.
   */
  markerIcons?: MarkerIcon[];
  /**
   * Optional technical indicators rendered as line overlays.
   *
   * - SMA / EMA / VWAP render on the price pane.
   * - RSI gets its own price scale (bottom ~25%) with 30/70 reference lines;
   *   the candle pane auto-compresses to make room when RSI is present.
   *
   * Indicators compute O(n) client-side from the already-fetched bars —
   * no extra network calls.
   */
  indicators?: Indicator[];
  /** Phase 0 = dark only; light reserved for Phase 1+. */
  theme?: ChartTheme;
  /** Container height. Number = pixels; string = CSS (e.g. '100%', '600px'). */
  height?: number | string;
  /** Fired on fetch failure. Caller decides whether to render a fallback UI. */
  onError?: (err: Error) => void;
  /**
   * Optional time range to focus the visible viewport on after bars load.
   * If omitted, the chart calls fitContent() (existing behavior).
   * Useful for trade journal: show the trade with tight context, not the
   * entire fetched data window.
   */
  focusRange?: { from: number; to: number };
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════
export function FinotaurChart({
  symbol,
  interval,
  from,
  to,
  dataSource,
  markers,
  markerIcons,
  indicators,
  theme = 'dark',
  height = 600,
  onError,
  focusRange,
}: FinotaurChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // Active theme tokens — derived once, used by both JSX and effects.
  const themeTokens = pickTheme(theme);
  /** Latest bars fetched, kept so the indicators effect can recompute on toggle. */
  const barsRef = useRef<Bar[]>([]);
  /**
   * Active series per indicator type — survives bar refetch.
   * Multi-series indicators (MACD = line+signal+histogram, BBANDS = middle+upper+lower)
   * keep their series in a fixed order; single-series indicators store a length-1 array.
   */
  const indicatorSeriesRef = useRef<Map<IndicatorType, ISeriesApi<'Line' | 'Histogram'>[]>>(
    new Map(),
  );
  /** Which subpane price scales have been styled (borderColor etc.) at least once. */
  const scalesConfiguredRef = useRef<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [barCount, setBarCount] = useState(0);
  /**
   * Bumping counter that triggers a re-render of the icon overlay whenever
   * the chart viewport changes (pan / zoom / resize). Increment to reposition.
   */
  const [overlayTick, setOverlayTick] = useState(0);

  // ─── Mount / unmount the chart ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      ...buildChartOptions(theme),
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const t = pickTheme(theme);
    const series = chart.addCandlestickSeries({
      upColor: t.candleUp,
      downColor: t.candleDown,
      borderUpColor: t.candleBorderUp,
      borderDownColor: t.candleBorderDown,
      wickUpColor: t.candleWickUp,
      wickDownColor: t.candleWickDown,
      priceLineColor: t.priceLineColor,
      priceLineStyle: 2,
      priceLineWidth: 1,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      try {
        chart.remove();
      } catch {
        // lightweight-charts can throw if container already gone — safe to ignore
      }
      chartRef.current = null;
      seriesRef.current = null;
      // Indicator series belonged to the destroyed chart — drop refs so the
      // next mount re-creates them from scratch.
      indicatorSeriesRef.current.clear();
      scalesConfiguredRef.current.clear();
    };
    // Re-create when theme changes — full remount swaps the candle palette,
    // background, grid, crosshair, and all subpane scale colors atomically.
  }, [theme]);

  // ─── ResizeObserver — keep chart fitting its container ──────
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !chartRef.current) return;
      const { width: w, height: h } = entry.contentRect;
      if (w > 0 && h > 0) {
        chartRef.current.applyOptions({ width: Math.floor(w), height: Math.floor(h) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── Overlay reposition: subscribe to pan/zoom + resize ────
  // Fires setOverlayTick (bumping counter) whenever the visible time range
  // changes or the container resizes — both events require re-computing pixel
  // coordinates for each marker icon.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const bump = () => setOverlayTick((n) => n + 1);

    chart.timeScale().subscribeVisibleTimeRangeChange(bump);

    // ResizeObserver on the container fires on container-size changes, which
    // also shift pixel coordinates. We attach a second observer here rather
    // than reusing the sizing observer above so the two concerns stay separate.
    const el = containerRef.current;
    let ro: ResizeObserver | null = null;
    if (el) {
      ro = new ResizeObserver(bump);
      ro.observe(el);
    }

    // After first paint, defer 2 frames so the chart finishes its initial
    // layout pass (setVisibleRange + fitContent). Without this, the first
    // bump runs while timeToCoordinate / priceToCoordinate still return null
    // and the icons render at top:-9 left:-9 — clipped by overflow-hidden.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(bump);
      // Store raf2 id for cleanup via the outer raf1Ref pattern below
      (bump as unknown as { _raf2?: number })._raf2 = raf2;
    });

    return () => {
      cancelAnimationFrame(raf1);
      const raf2 = (bump as unknown as { _raf2?: number })._raf2;
      if (raf2 != null) cancelAnimationFrame(raf2);
      chart.timeScale().unsubscribeVisibleTimeRangeChange(bump);
      ro?.disconnect();
    };
    // Re-subscribe whenever the chart is remounted (theme change rebuilds chartRef).
  }, [barCount]); // barCount > 0 guarantees chart+series are initialized

  // ─── Fetch bars when symbol / interval / window changes ────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    dataSource
      .getBars(symbol, interval, from as never, to as never)
      .then((bars: Bar[]) => {
        if (cancelled || !seriesRef.current) return;
        seriesRef.current.setData(bars);
        barsRef.current = bars;
        setBarCount(bars.length);
        if (bars.length > 0) {
          if (focusRange) {
            chartRef.current?.timeScale().setVisibleRange({
              from: focusRange.from as never,
              to: focusRange.to as never,
            });
          } else {
            chartRef.current?.timeScale().fitContent();
          }
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setLoading(false);
        onError?.(e);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, interval, from, to, dataSource, onError, focusRange]);

  // ─── Apply markers ──────────────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current) return;
    // lightweight-charts SeriesMarker has the exact shape of ChartMarker by design.
    seriesRef.current.setMarkers((markers ?? []).map((m) => ({
      time: m.time,
      position: m.position,
      shape: m.shape,
      color: m.color,
      text: m.text,
      size: m.size ?? 1,
    })));
  }, [markers, barCount]); // barCount → re-apply after fresh data load

  // ─── Apply indicators ───────────────────────────────────────
  // Lifecycle:
  //   - Add series for newly-requested types (multi-series indicators get
  //     several series stored under the same map key, in fixed order).
  //   - Remove every series for types no longer requested.
  //   - Recompute + setData on every effect run (cheap; runs on bars in memory).
  //   - Re-apply scaleMargins for ALL active scales each run, because pane
  //     allocation depends on how many subpanes are simultaneously active.
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = seriesRef.current;
    if (!chart || !candleSeries) return;

    const desired = new Map<IndicatorType, Indicator>();
    for (const ind of indicators ?? []) {
      // Last-write-wins if caller passes the same type twice — harmless,
      // protects against accidental duplicates.
      desired.set(ind.type, ind);
    }

    const current = indicatorSeriesRef.current;
    const bars = barsRef.current;

    // ─── Remove series no longer requested ──────────────────
    for (const [type, seriesList] of Array.from(current.entries())) {
      if (!desired.has(type)) {
        for (const s of seriesList) {
          try {
            chart.removeSeries(s);
          } catch {
            // Series may already be gone if chart was torn down mid-flight.
          }
        }
        current.delete(type);
      }
    }

    // ─── Add / update series for each desired indicator ─────
    for (const [type, ind] of desired.entries()) {
      const color = ind.color ?? INDICATOR_COLORS[type];

      // ── Create on first sight, or fetch existing ──────────
      let seriesList = current.get(type);
      if (!seriesList) {
        seriesList = createSeriesForType(chart, type, color, pickTheme(theme));
        current.set(type, seriesList);
      } else if (seriesList.length > 0 && type !== 'MACD' && type !== 'BBANDS') {
        // Single-series indicator: color may have changed
        (seriesList[0] as ISeriesApi<'Line'>).applyOptions({ color });
      }

      // ── Compute + apply data ──────────────────────────────
      if (bars.length === 0) {
        // Pre-fetch: clear out any stale data
        for (const s of seriesList) s.setData([]);
        continue;
      }

      switch (type) {
        case 'SMA':
          (seriesList[0] as ISeriesApi<'Line'>).setData(
            computeSMA(bars, ind.period),
          );
          break;
        case 'EMA':
          (seriesList[0] as ISeriesApi<'Line'>).setData(
            computeEMA(bars, ind.period),
          );
          break;
        case 'RSI':
          (seriesList[0] as ISeriesApi<'Line'>).setData(
            computeRSI(bars, ind.period),
          );
          break;
        case 'VWAP':
          (seriesList[0] as ISeriesApi<'Line'>).setData(computeVWAP(bars));
          break;
        case 'MACD': {
          const { macd, signal, histogram } = computeMACD(bars);
          (seriesList[0] as ISeriesApi<'Line'>).setData(macd);
          (seriesList[1] as ISeriesApi<'Line'>).setData(signal);
          (seriesList[2] as ISeriesApi<'Histogram'>).setData(histogram);
          break;
        }
        case 'BBANDS': {
          const { middle, upper, lower } = computeBollinger(
            bars,
            ind.period,
          );
          (seriesList[0] as ISeriesApi<'Line'>).setData(middle);
          (seriesList[1] as ISeriesApi<'Line'>).setData(upper);
          (seriesList[2] as ISeriesApi<'Line'>).setData(lower);
          break;
        }
        case 'ATR':
          (seriesList[0] as ISeriesApi<'Line'>).setData(
            computeATR(bars, ind.period),
          );
          break;
      }
    }

    // ─── Subpane scale styling (one-time per scale) ─────────
    const styleScaleOnce = (scaleId: string) => {
      if (scalesConfiguredRef.current.has(scaleId)) return;
      chart.priceScale(scaleId).applyOptions({
        borderColor: pickTheme(theme).border,
      });
      scalesConfiguredRef.current.add(scaleId);
    };
    if (desired.has('RSI')) styleScaleOnce(RSI_PRICE_SCALE_ID);
    if (desired.has('MACD')) styleScaleOnce(MACD_PRICE_SCALE_ID);
    if (desired.has('ATR')) styleScaleOnce(ATR_PRICE_SCALE_ID);

    // ─── Pane allocation — scaleMargins for active scales ───
    const margins = computePaneMargins({
      rsi: desired.has('RSI'),
      macd: desired.has('MACD'),
      atr: desired.has('ATR'),
    });
    candleSeries.priceScale().applyOptions({ scaleMargins: margins.candle });
    if (margins.rsi) {
      chart.priceScale(RSI_PRICE_SCALE_ID).applyOptions({
        scaleMargins: margins.rsi,
      });
    }
    if (margins.macd) {
      chart.priceScale(MACD_PRICE_SCALE_ID).applyOptions({
        scaleMargins: margins.macd,
      });
    }
    if (margins.atr) {
      chart.priceScale(ATR_PRICE_SCALE_ID).applyOptions({
        scaleMargins: margins.atr,
      });
    }
  }, [indicators, barCount, theme]); // barCount → recompute after fresh data load; theme → re-style scales on switch

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        background: themeTokens.background,
      }}
    >
      {/* Brand bar — 1px gold accent at the top edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px"
        style={{ background: themeTokens.brandGold, opacity: 0.5 }}
      />

      {/* Chart canvas mount */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Icon-in-circle overlay — ArrowUp / ArrowDown markers positioned via
          pixel coordinates from the chart API. pointer-events:none so the overlay
          never steals hover/click from the lightweight-charts canvas below. */}
      {markerIcons && markerIcons.length > 0 && chartRef.current && seriesRef.current && (
        <div
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
          // overlayTick in key forces React to recompute coordinates on pan/zoom/resize
          key={overlayTick}
        >
          {markerIcons.map((icon, idx) => {
            const chart = chartRef.current;
            const series = seriesRef.current;
            if (!chart || !series) return null;

            const x = chart.timeScale().timeToCoordinate(icon.time as UTCTimestamp);
            const y = series.priceToCoordinate(icon.price);

            // null = outside viewport; NaN = chart not yet laid out (first paint).
            // The RAF deferral in the subscribe effect handles the NaN case on the
            // next bump, but defend at the boundary too.
            if (x === null || y === null) return null;
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

            const top = (y as number) + icon.offsetY;
            const left = x as number;

            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  top: top - 11,   // center the 22px circle vertically on the anchor point
                  left: left - 11, // center the 22px circle horizontally on the bar
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: icon.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.45)',
                  pointerEvents: 'none',
                }}
              >
                {icon.direction === 'up'
                  ? <ArrowUp size={14} color="#fff" strokeWidth={3} absoluteStrokeWidth />
                  : <ArrowDown size={14} color="#fff" strokeWidth={3} absoluteStrokeWidth />
                }
              </div>
            );
          })}
        </div>
      )}

      {/* Watermark — subtle Finotaur signature, bottom-right above the timescale */}
      <div
        className="pointer-events-none absolute bottom-7 right-16 z-10 select-none text-[10px] font-bold uppercase tracking-[0.3em]"
        style={{ color: themeTokens.brandGold, opacity: 0.18 }}
        aria-hidden="true"
      >
        FINOTAUR
      </div>

      {/* Symbol + interval chip — top-left, replaces lightweight-charts' default */}
      {!loading && !error && barCount > 0 && (
        <div
          className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            borderColor: themeTokens.border,
            background: theme === 'light' ? 'rgba(255,255,255,0.75)' : 'rgba(8,8,10,0.7)',
            color: themeTokens.text,
            backdropFilter: 'blur(4px)',
          }}
        >
          <span style={{ color: themeTokens.brandGold }}>{symbol}</span>
          <span className="mx-1.5 opacity-30">·</span>
          <span>{interval}</span>
        </div>
      )}

      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500"
          style={{ background: theme === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(8,8,10,0.6)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ background: themeTokens.brandGold }}
            />
            Loading {symbol} {interval} bars…
          </div>
        </div>
      )}

      {!loading && error && (
        <div
          className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-rose-400"
          style={{ background: theme === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(8,8,10,0.85)' }}
        >
          <div className="max-w-md">
            <div className="mb-1 font-semibold uppercase tracking-wider">Chart unavailable</div>
            <div className="text-zinc-500">{error.message}</div>
          </div>
        </div>
      )}

      {!loading && !error && barCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
          No bars in window for {symbol} {interval}
        </div>
      )}
    </div>
  );
}

export default FinotaurChart;
