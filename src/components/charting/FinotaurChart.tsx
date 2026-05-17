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
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type DeepPartial,
  type ChartOptions,
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
  computeEMA,
  computeRSI,
  computeSMA,
  computeVWAP,
  type LineDataPoint,
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

// ═══════════════════════════════════════════════════════════════
// Indicator palette
// ═══════════════════════════════════════════════════════════════
// Per-type defaults — each picked to be distinguishable from candle
// green/red AND from each other. Callers can override per-Indicator via
// `Indicator.color`.
const INDICATOR_COLORS: Record<IndicatorType, string> = {
  SMA: '#7dd3fc',   // sky-300 — moving average, "soft trend"
  EMA: '#fcd34d',   // amber-300 — faster MA, "warmer / shorter horizon"
  VWAP: '#c4b5fd',  // violet-300 — volume-weighted, distinct hue
  RSI: '#d4d4d8',   // zinc-300 — sits in its own pane, neutral
};

// Scale margins for the candle pane — wider bottom when RSI is on.
const CANDLE_SCALE_MARGINS_DEFAULT = { top: 0.1, bottom: 0.1 };
const CANDLE_SCALE_MARGINS_WITH_RSI = { top: 0.05, bottom: 0.3 };
const RSI_SCALE_MARGINS = { top: 0.75, bottom: 0.05 };
const RSI_PRICE_SCALE_ID = 'rsi';

// ═══════════════════════════════════════════════════════════════
// Chart options builder
// ═══════════════════════════════════════════════════════════════
function buildChartOptions(theme: ChartTheme): DeepPartial<ChartOptions> {
  // Phase 0 is dark-only; reserved branch for Phase 1+ light theme.
  void theme;
  const t = FINOTAUR_DARK_THEME;
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
  indicators,
  theme = 'dark',
  height = 600,
  onError,
}: FinotaurChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  /** Latest bars fetched, kept so the indicators effect can recompute on toggle. */
  const barsRef = useRef<Bar[]>([]);
  /** Active line series, keyed by indicator type — survives bar refetch. */
  const indicatorSeriesRef = useRef<Map<IndicatorType, ISeriesApi<'Line'>>>(new Map());
  /** Whether the RSI price scale has been configured (one-time on first add). */
  const rsiScaleConfiguredRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [barCount, setBarCount] = useState(0);

  // ─── Mount / unmount the chart ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      ...buildChartOptions(theme),
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const t = FINOTAUR_DARK_THEME;
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
      rsiScaleConfiguredRef.current = false;
    };
    // Re-create only when theme changes (Phase 0: theme is constant).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          chartRef.current?.timeScale().fitContent();
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
  }, [symbol, interval, from, to, dataSource, onError]);

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
  //   - Add series for newly-requested types (configure RSI scale on first add).
  //   - Remove series for types no longer requested.
  //   - Recompute + setData on every effect run (cheap; runs on bars in memory).
  //   - Adjust candle pane scaleMargins when RSI toggles.
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

    // ─── Remove series no longer requested ──────────────────
    for (const [type, series] of Array.from(current.entries())) {
      if (!desired.has(type)) {
        try {
          chart.removeSeries(series);
        } catch {
          // Series may already be gone if chart was torn down mid-flight.
        }
        current.delete(type);
      }
    }

    // ─── Add / update series for each desired indicator ─────
    const bars = barsRef.current;
    for (const [type, ind] of desired.entries()) {
      const color = ind.color ?? INDICATOR_COLORS[type];
      let series = current.get(type);

      if (!series) {
        if (type === 'RSI') {
          series = chart.addLineSeries({
            color,
            lineWidth: 2,
            priceScaleId: RSI_PRICE_SCALE_ID,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: true,
          });
          // Configure the RSI price scale once (lightweight-charts treats
          // any unknown priceScaleId as a new overlay scale).
          if (!rsiScaleConfiguredRef.current) {
            chart.priceScale(RSI_PRICE_SCALE_ID).applyOptions({
              scaleMargins: RSI_SCALE_MARGINS,
              borderColor: FINOTAUR_DARK_THEME.border,
            });
            rsiScaleConfiguredRef.current = true;
          }
          // Classic 30 / 70 reference lines — dotted, neutral, no axis label.
          series.createPriceLine({
            price: 30,
            color: FINOTAUR_DARK_THEME.textAxis,
            lineWidth: 1,
            lineStyle: 1,
            axisLabelVisible: false,
            title: '',
          });
          series.createPriceLine({
            price: 70,
            color: FINOTAUR_DARK_THEME.textAxis,
            lineWidth: 1,
            lineStyle: 1,
            axisLabelVisible: false,
            title: '',
          });
        } else {
          // SMA / EMA / VWAP — share the main right price scale with candles.
          series = chart.addLineSeries({
            color,
            lineWidth: 2,
            priceScaleId: 'right',
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: true,
          });
        }
        current.set(type, series);
      } else {
        // Color may have changed (caller provided a new Indicator.color)
        series.applyOptions({ color });
      }

      // Compute + apply data. Empty bars (pre-fetch) → empty series — that's fine.
      let data: LineDataPoint[] = [];
      if (bars.length > 0) {
        switch (type) {
          case 'SMA':
            data = computeSMA(bars, ind.period);
            break;
          case 'EMA':
            data = computeEMA(bars, ind.period);
            break;
          case 'RSI':
            data = computeRSI(bars, ind.period);
            break;
          case 'VWAP':
            data = computeVWAP(bars);
            break;
        }
      }
      series.setData(data);
    }

    // ─── Candle pane margins flex when RSI is on ────────────
    const hasRsi = desired.has('RSI');
    candleSeries.priceScale().applyOptions({
      scaleMargins: hasRsi ? CANDLE_SCALE_MARGINS_WITH_RSI : CANDLE_SCALE_MARGINS_DEFAULT,
    });
  }, [indicators, barCount]); // barCount → recompute after fresh data load

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        background: FINOTAUR_DARK_THEME.background,
      }}
    >
      {/* Brand bar — 1px gold accent at the top edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px"
        style={{ background: FINOTAUR_DARK_THEME.brandGold, opacity: 0.5 }}
      />

      {/* Chart canvas mount */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Watermark — subtle Finotaur signature, bottom-right above the timescale */}
      <div
        className="pointer-events-none absolute bottom-7 right-16 z-10 select-none text-[10px] font-bold uppercase tracking-[0.3em]"
        style={{ color: FINOTAUR_DARK_THEME.brandGold, opacity: 0.18 }}
        aria-hidden="true"
      >
        FINOTAUR
      </div>

      {/* Symbol + interval chip — top-left, replaces lightweight-charts' default */}
      {!loading && !error && barCount > 0 && (
        <div
          className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            borderColor: FINOTAUR_DARK_THEME.border,
            background: 'rgba(8,8,10,0.7)',
            color: FINOTAUR_DARK_THEME.text,
            backdropFilter: 'blur(4px)',
          }}
        >
          <span style={{ color: FINOTAUR_DARK_THEME.brandGold }}>{symbol}</span>
          <span className="mx-1.5 opacity-30">·</span>
          <span>{interval}</span>
        </div>
      )}

      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500"
          style={{ background: 'rgba(8,8,10,0.6)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ background: FINOTAUR_DARK_THEME.brandGold }}
            />
            Loading {symbol} {interval} bars…
          </div>
        </div>
      )}

      {!loading && error && (
        <div
          className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-rose-400"
          style={{ background: 'rgba(8,8,10,0.85)' }}
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
