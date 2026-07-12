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

import { useContext, useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { WallHeatLayer } from '@/components/charting/WallHeatLayer';
import { DepthMatrixLayer } from '@/components/charting/DepthMatrixLayer';
import { FootprintLayer } from '@/components/charting/orderflow/FootprintLayer';
import { VolumeProfileLayer } from '@/components/charting/orderflow/VolumeProfileLayer';
import type { FlowBinStore } from '@/components/charting/orderflow/flowBinStore';
import type { FootprintConfig } from '@/components/charting/orderflow/types';
import type { FootprintDetailLevel } from '@/components/charting/orderflow/footprintRender';
import { computeFootprintBandHeightPx } from '@/components/charting/orderflow/footprintRender';
import type { DecodedColumn } from '@/pages/app/crypto/scanner/depthTypes';
import { ChartStyleContext, type ChartStyleSettings } from '@/pages/app/trading-arena/components/chartStyleSettings';
import { chartStyleToChartOptions, chartStyleToSeriesOptions } from '@/pages/app/trading-arena/components/chartStyleMapping';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
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
    // Pin locale to en-US regardless of browser locale — verified bug: with a
    // Hebrew-locale browser, the crosshair time tooltip renders Hebrew month
    // names ("יולי") on a customer-facing surface. IRON RULE = English-only UI.
    localization: {
      locale: 'en-US',
    },
    layout: {
      background: { type: ColorType.Solid, color: t.background },
      textColor: t.text,
      fontFamily: t.fontFamily,
      fontSize: t.fontSizeAxis,
      // Removes the TradingView wordmark from the bottom-left corner — this
      // is our own branded chart primitive, not an embedded TV widget.
      attributionLogo: false,
    },
    // Faint centered brand mark. Kept at 5% alpha so it never competes with
    // candles/overlays — "we know the grid exists" territory, same spirit
    // as the dotted grid below. Site-wide: every FinotaurChart gets one.
    watermark: {
      visible: true,
      text: 'FINOTAUR',
      color: 'rgba(201, 166, 70, 0.05)',
      fontSize: 48,
      horzAlign: 'center',
      vertAlign: 'center',
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
// Overlay price lines (e.g. order-book walls)
// ═══════════════════════════════════════════════════════════════
/**
 * Describes a single price-level line rendered on the main candle series.
 * Applied via `series.createPriceLine` / `series.removePriceLine`.
 * The `id` field is used to diff the set on prop changes — callers must
 * provide stable, unique ids so only changed lines are recreated.
 */
export interface OverlayPriceLine {
  /** Stable unique key — used for diffing (add/remove only what changed). */
  id: string;
  price: number;
  title: string;
  color: string;
  lineWidth?: 1 | 2 | 3 | 4;
  /** lightweight-charts LineStyle enum value. 0=Solid, 2=Dashed (default). */
  lineStyle?: number;
}

// ═══════════════════════════════════════════════════════════════
// Wall segments — time-aware liquidity history overlays
// ═══════════════════════════════════════════════════════════════
/**
 * A horizontal segment rendered as a lightweight-charts line series spanning
 * a specific time range at a fixed price level.
 *
 * Alive walls (endTime = null) extend to the newest bar's time each refresh.
 * Dead walls (endTime set) are frozen from birth to death and remain dimmed.
 *
 * Time alignment: caller is responsible for rounding startTime/endTime DOWN
 * to the current bar interval boundary so segments snap to candle edges.
 * If startTime >= endTime after clamping, the segment is silently skipped
 * (lightweight-charts line series requires strictly ascending times).
 */
export interface WallSegment {
  /** Stable unique key — used for add/remove diffing. Must be unique across alive + dead sets. */
  id: string;
  /** Price level for the horizontal segment (pre-rounded to bin boundary by caller). */
  price: number;
  /** Wall birth time in unix SECONDS. Caller rounds down to bar boundary. */
  startTime: number;
  /**
   * Wall death time in unix SECONDS, or null if still alive.
   * null → the segment will be extended to the latest loaded bar's time each render,
   * then 2 bars beyond the live edge so a freshly-born wall is immediately visible.
   * Set value → segment is frozen at that time (dead wall).
   */
  endTime: number | null;
  /**
   * Top-edge / outline color (RGBA string, e.g. 'rgba(34,197,94,0.9)').
   * Used as the baseline series topLineColor.
   */
  color: string;
  /**
   * Fill color for the band area between price and price+bandHeight.
   * RGBA string — caller controls alpha (alive ~0.18-0.60, dead ~cap 0.22).
   */
  fillColor: string;
  /** Height of the band in price units. Typically one bin size. */
  bandHeight: number;
  lineWidth: 1 | 2 | 3 | 4;
  /**
   * Price-axis label. Kept for interface compatibility but no longer used for
   * axis rendering — axis labels are permanently suppressed to avoid stacking.
   * @deprecated pass `tooltip` instead for hover text
   */
  title?: string;
  /**
   * Text shown in the hover tooltip when the user mouses over the wall stripe.
   * Format examples: 'BID $8.2M · since 14:32' (alive) or 'ASK $8.2M · 14:32–14:51' (dead).
   */
  tooltip?: string;
  /**
   * Size intensity in [0, 1] — log-compressed notional ratio used to drive
   * proportional line thickness in heatmap render mode.
   * 0 = weakest, 1 = strongest wall on this side.
   */
  intensity?: number;
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
  /**
   * Bumping token that imperatively re-applies `focusRange` on the time axis.
   * Increment this when the caller wants to re-focus the time window (e.g. after
   * the user clicks "Fit"). Only meaningful when `focusRange` is also provided.
   * Version 0 / undefined is a no-op (avoids double-apply on initial mount,
   * which is already handled by the bar-load effect).
   */
  timeFitToken?: number;
  /**
   * Optional overlay price lines drawn on the candle series (e.g. order-book walls).
   * Diffed by `id` on every update — only changed lines are recreated, avoiding flicker.
   * When absent or empty the feature is a complete no-op; backtest/journal callers
   * are unaffected.
   */
  priceLines?: OverlayPriceLine[];
  /**
   * Optional time-aware wall segments rendered as lightweight-charts line series.
   * Each segment is a horizontal line from startTime to endTime (or to the newest bar
   * if endTime is null — alive wall). Dead walls (endTime set) are frozen and dimmed.
   *
   * Diffed by id + endTime + title: segments whose endTime or title change are
   * updated via setData / applyOptions; ids no longer present are removed.
   * No-op when absent — zero impact on backtest/journal callers.
   */
  wallSegments?: WallSegment[];
  /**
   * How wall segments are rendered.
   * - 'series' (default): the existing Baseline series approach — zero behavior change
   *   for all existing callers (backtest, journal, any caller that doesn't pass this prop).
   * - 'heatmap': renders an absolutely-positioned canvas overlay (WallHeatLayer) instead
   *   of creating Baseline series. Used by MarketScanner v9 for full-book rendering.
   * - 'matrix': renders the DepthMatrixLayer time×price heatmap BEHIND candles.
   *   Requires depthMatrixColumns + depthMatrixBinSize to be provided.
   */
  wallRenderMode?: 'series' | 'heatmap' | 'matrix';
  /**
   * Decoded depth-slice columns for DepthMatrixLayer (wallRenderMode='matrix' only).
   * No-op when wallRenderMode !== 'matrix'.
   */
  depthMatrixColumns?: DecodedColumn[];
  /** Dominant bin size for the depth matrix grid (wallRenderMode='matrix' only). */
  depthMatrixBinSize?: number;
  /** Relative size filter for the depth matrix (matrix mode). 0=All, 1|5|10|25 = ≥N% of p99 reference. Default: 5. */
  depthMatrixSizeFilterPct?: 0 | 1 | 5 | 10 | 25;
  /** Absolute notional floor USD — bins below treated as q=0 (matrix mode). */
  depthMatrixFloorUsd?: number;
  /** Current candle interval in ms — used to map column→px width (matrix mode). */
  depthMatrixCandleIntervalMs?: number;
  /**
   * When provided, the candlestick price scale is auto-fitted to this band
   * instead of the default lw-charts auto-scale (which fits all candles).
   * Used by MarketScanner to focus the visible price range on the ±2% resting
   * liquidity band so the user can see limit orders without manually zooming.
   *
   * - While active, the price axis shows [minPrice, maxPrice] (with 15% padding
   *   already baked in by the caller).
   * - Passing null (or omitting the prop) restores normal auto-scale behaviour.
   * - When the user manually drags the price axis, the caller is expected to
   *   stop passing a band (or set it to null) and this hook becomes a no-op.
   */
  liquidityBand?: { minPrice: number; maxPrice: number } | null;
  /**
   * Called the first time the user interacts with the price-scale axis
   * (pointer-down inside the right-side price-scale column). The scanner uses
   * this to disable auto-fit so manual zoom is respected.
   *
   * Only fired when `liquidityBand` is non-null — no-op otherwise.
   */
  onManualPriceScale?: () => void;
  /**
   * Called once after each bar fetch completes with the high/low extremes of
   * the loaded candles. The scanner uses this to merge the candle range into
   * the liquidity band so price action is always visible in the auto-fit view.
   *
   * `avgBarRange` is the average PER-BAR (high - low) across the same
   * reported bars — distinct from `high - low`, which is the window-spanning
   * extreme. Order-flow row-size suggestion (FlowBinStore.suggestRowSize)
   * needs the former; feeding it the latter produces bins orders of
   * magnitude too coarse (see ChartTab.tsx / FuturesChartTab.tsx callers).
   */
  onBarsLoad?: (range: { high: number; low: number; avgBarRange: number } | null) => void;
  /**
   * Optional footprint overlay (ATAS-style bid/ask clusters). When provided,
   * mounts a FootprintLayer canvas on top of candles, fed by `store`.
   * Undefined (the default for every existing caller) is a complete no-op —
   * zero render cost, zero mount.
   */
  footprint?: {
    store: FlowBinStore;
    config: FootprintConfig;
    visible: boolean;
    /**
     * Fired whenever the zoom-driven detail stage changes (hidden/shaded/full).
     * Threaded straight through to FootprintLayer's `onStageChange` — see that
     * component's doc comment for the hysteresis contract. Callers use this to
     * dim the candlestick series (see `mutedCandles`) while clusters are showing.
     */
    onStageChange?: (stage: FootprintDetailLevel) => void;
  };
  /**
   * When true, renders the candlestick series as a thin, semi-transparent
   * skeleton (dxFeed-style) instead of the normal solid palette — used while
   * the footprint overlay is showing shaded/full clusters so the candles don't
   * visually compete with the cluster numbers. Default/undefined = normal
   * candle colors, zero behavior change for every existing caller.
   */
  mutedCandles?: boolean;
  /**
   * Optional bumping token that forces a bar refetch (re-runs `dataSource.getBars`)
   * without changing symbol/interval/from/to. Undefined (every existing caller) is
   * a complete no-op. Added for FuturesChartTab: DatabentoBarsSource's trade cache
   * fills asynchronously (backfill lands 5-15s after mount) and `from`/`to` are a
   * fixed wall-clock window computed once on mount, so nothing else in the deps
   * array would ever re-run the fetch after the cache populates.
   */
  refreshToken?: number;
  /**
   * Optional Volume Profile overlay (ATAS-style visible-range volume-by-price
   * with POC + Value Area). When provided, mounts a VolumeProfileLayer canvas
   * fed by `store` (the same FlowBinStore the footprint overlay reads from —
   * pass the same store instance to keep both overlays in sync).
   * Undefined (the default for every existing caller) is a complete no-op.
   */
  volumeProfile?: {
    store: FlowBinStore;
    visible: boolean;
  };
  /**
   * Optional TradingView-style chart style overrides (candle colors,
   * canvas/grid/crosshair/watermark, price axis, timezone, price precision —
   * see chartStyleSettings.ts). Mapped to lw-charts options via
   * chartStyleToChartOptions/chartStyleToSeriesOptions (chartStyleMapping.ts)
   * and applied with `applyOptions()` only — never triggers a chart
   * recreate.
   *
   * 🔴 Undefined is a COMPLETE no-op — this is the default for every
   * existing caller (Backtest, Journal, Scanner, Replay, FuturesChartTab):
   * zero behavior change. When undefined, this component still falls back
   * to `ChartStyleContext` (React context, default `undefined`) so the
   * Trading Arena's Chart ▾ settings menu can reach all 3 Arena tabs'
   * FinotaurChart instances (ChartTab / FootprintTab / LiquidityTab)
   * without those 3 files needing to thread this prop through themselves —
   * see chartStyleSettings.ts's ChartStyleContext doc comment for the full
   * rationale. Callers outside the Arena's `<ChartStyleContext.Provider>`
   * tree read `undefined` from the context too, so they remain unaffected
   * either way.
   */
  chartStyle?: ChartStyleSettings;
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
  timeFitToken,
  priceLines,
  wallSegments,
  wallRenderMode = 'series',
  depthMatrixColumns,
  depthMatrixBinSize = 1,
  depthMatrixSizeFilterPct = 5,
  depthMatrixFloorUsd = 1_000,
  depthMatrixCandleIntervalMs = 60_000,
  liquidityBand = null,
  onManualPriceScale,
  onBarsLoad,
  footprint,
  mutedCandles,
  refreshToken,
  volumeProfile,
  chartStyle,
}: FinotaurChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // Active theme tokens — derived once, used by both JSX and effects.
  const themeTokens = pickTheme(theme);
  // Chart Settings (Trading Arena's Chart ▾ menu) — explicit prop wins,
  // otherwise fall back to ChartStyleContext (undefined outside the Arena's
  // provider tree, so this is a no-op for every other caller). See the
  // `chartStyle` prop doc comment above for the full rationale.
  const contextChartStyle = useContext(ChartStyleContext);
  const effectiveChartStyle = chartStyle ?? contextChartStyle;
  /**
   * Mirrors the footprint's zoom-driven detail stage (see FootprintLayer's
   * onStageChange) purely so WallHeatLayer can be told how tall the
   * bottom-pinned totals/stats band currently is (computeFootprintBandHeightPx)
   * and clip its own heat-dot drawing above that rectangle — see the
   * WallHeatLayer bottomClipPx prop below. Not used for anything else;
   * `footprint.onStageChange` (the caller's own callback) still fires
   * unchanged via the wrapper in the FootprintLayer mount below.
   */
  const [footprintDetailStage, setFootprintDetailStage] = useState<FootprintDetailLevel>('hidden');
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
  /**
   * Active overlay price lines keyed by OverlayPriceLine.id.
   * On each prop update we diff against this map: remove stale lines,
   * create new ones. Never accumulates unboundedly — cleaned up on unmount
   * via the chart.remove() call which destroys all series (and their lines).
   */
  const overlayPriceLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  /**
   * Active wall-segment baseline series keyed by WallSegment.id.
   * Each entry is a dedicated ISeriesApi<'Baseline'> spanning startTime→endTime,
   * rendering as a filled horizontal band (Bookmap-style stripe) rather than a
   * thin 1-4 px line. Diff on every wallSegments prop change: update endTime/title
   * if changed, remove ids no longer present, add new ids. Cleared on chart unmount.
   *
   * Also tracks the last-rendered endTime and title per id so we can skip
   * no-op re-renders.
   */
  const wallSegmentSeriesRef = useRef<
    Map<string, {
      series: ISeriesApi<'Baseline'>;
      endTime: number | null;
      title: string | undefined;
      tooltip: string | undefined;
      /** Rendered time span [clampedStart, resolvedEnd] in unix seconds — used for hover hit-test. */
      renderedStart: number;
      renderedEnd: number;
    }>
  >(new Map());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [barCount, setBarCount] = useState(0);
  /**
   * Container pixel dimensions — tracked so WallHeatLayer can resize its canvas.
   * Only populated when wallRenderMode === 'heatmap'.
   */
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  /**
   * Bumping counter that triggers a re-render of the icon overlay whenever
   * the chart viewport changes (pan / zoom / resize). Increment to reposition.
   */
  const [overlayTick, setOverlayTick] = useState(0);

  /**
   * Wall hover tooltip state. When the crosshair moves over a wall stripe,
   * this holds the tooltip text + pixel position. null = hidden.
   * Position/text are mutated directly via the ref to avoid per-frame setState
   * storms; only segment-identity changes trigger a setState.
   */
  const [wallTooltip, setWallTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  /** Tracks which segment id is currently shown in the tooltip to batch updates. */
  const wallTooltipIdRef = useRef<string | null>(null);
  /** Direct ref to the tooltip DOM node — x/y are mutated via style for perf. */
  const wallTooltipDivRef = useRef<HTMLDivElement | null>(null);

  /**
   * Latest liquidity band — held in a ref so the autoscaleInfoProvider closure
   * always reads the current band without needing to be recreated on every 3s update.
   * Updated synchronously in a useEffect when the `liquidityBand` prop changes.
   */
  const liquidityBandRef = useRef<{ minPrice: number; maxPrice: number } | null>(liquidityBand);

  // One-time auto-fit guard: token-driven callers (the scanner) fit the visible
  // time range only on the FIRST load per symbol/interval — NOT on every 30s
  // window slide, which used to snap the view back and fight the user's pan.
  const didInitialFitRef = useRef(false);
  // Tracks whether the liquidity band was active on the previous render so we
  // only RE-enter price auto-scale on activation (null→band), not on every
  // 0.5% band drift — which used to make the price axis jump.
  const bandWasActiveRef = useRef(false);

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
      // Liquidity band auto-fit: when a band is set, override lw-charts'
      // default auto-scale (which would zoom to the entire kline history)
      // and instead fit the price axis to [minPrice, maxPrice].
      // The provider reads from liquidityBandRef so it always has the latest
      // value without the series needing to be recreated on every band update.
      // When the ref is null, pass through to the default implementation.
      autoscaleInfoProvider: (baseImpl) => {
        const band = liquidityBandRef.current;
        if (band) {
          return {
            priceRange: { minValue: band.minPrice, maxValue: band.maxPrice },
          };
        }
        return baseImpl();
      },
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
      // Overlay price lines are destroyed with the chart — clear the map so
      // the next mount does not try to remove already-gone line handles.
      overlayPriceLinesRef.current.clear();
      // Wall segment series belong to the destroyed chart — clear so the next
      // mount starts fresh without stale series handles.
      wallSegmentSeriesRef.current.clear();
    };
    // Re-create when theme changes — full remount swaps the candle palette,
    // background, grid, crosshair, and all subpane scale colors atomically.
  }, [theme]);

  // ─── Apply Chart Settings (Trading Arena's Chart ▾ menu) ────
  // `effectiveChartStyle` undefined (every caller outside the Arena) is a
  // complete no-op — the chart keeps FINOTAUR_DARK_THEME/buildChartOptions'
  // hardcoded look untouched. When present, maps to lw-charts options via
  // the pure chartStyleToChartOptions/chartStyleToSeriesOptions functions
  // (chartStyleMapping.ts) and applies them with `applyOptions()` only —
  // never triggers a chart recreate. Depends on `theme` too so a theme
  // change (which DOES recreate the chart, see the mount effect above)
  // re-applies the user's chart style immediately after remount — this
  // effect is declared after the mount effect, so React always runs it
  // AFTER the new chart/series exist in the same commit.
  useEffect(() => {
    if (!effectiveChartStyle) return;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    try {
      chart.applyOptions(chartStyleToChartOptions(effectiveChartStyle));
      series.applyOptions(chartStyleToSeriesOptions(effectiveChartStyle));
    } catch {
      // Chart/series may be mid-teardown — safe to ignore.
    }
  }, [effectiveChartStyle, theme]);

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
        // Also track size for WallHeatLayer (heatmap), DepthMatrixLayer (matrix),
        // FootprintLayer, and VolumeProfileLayer (when their respective props
        // are provided).
        if (wallRenderMode === 'heatmap' || wallRenderMode === 'matrix' || footprint || volumeProfile) {
          setContainerSize({ w: Math.floor(w), h: Math.floor(h) });
        }
      }
    });
    ro.observe(el);

    // Seed initial size synchronously — ResizeObserver only fires on *changes*,
    // so if bars load before the first resize the layer would get 0×0 forever.
    if (wallRenderMode === 'heatmap' || wallRenderMode === 'matrix' || footprint || volumeProfile) {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setContainerSize({ w, h });
    }

    return () => ro.disconnect();
    // footprint/volumeProfile are object props (new identity every render from
    // most callers); gating on truthiness only (via the `!!` cast) avoids
    // re-running this effect (and re-observing the ResizeObserver) on every
    // parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallRenderMode, !!footprint, !!volumeProfile]);

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

  // ─── Wall hover tooltip — subscribe to crosshairMove ───────
  // Shows a floating tooltip when the crosshair enters a wall stripe.
  // Uses direct DOM mutation for x/y position to avoid per-frame setState;
  // only the matched segment identity triggers a React state update (text change).
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = seriesRef.current;
    if (!chart || !candleSeries || !wallSegments || wallSegments.length === 0) return;

    const handler = (param: { point?: { x: number; y: number }; time?: unknown }) => {
      const tooltipDiv = wallTooltipDivRef.current;

      if (!param.point) {
        // Crosshair left the chart area — hide tooltip
        if (wallTooltipIdRef.current !== null) {
          wallTooltipIdRef.current = null;
          setWallTooltip(null);
        }
        return;
      }

      // Convert y coordinate → price
      const price = candleSeries.coordinateToPrice(param.point.y);
      if (price === null) {
        if (wallTooltipIdRef.current !== null) {
          wallTooltipIdRef.current = null;
          setWallTooltip(null);
        }
        return;
      }

      // Hit-test wall segments: find first segment where price falls in [seg.price, seg.price+bandHeight]
      // and the crosshair time (if available) falls within the rendered span.
      let matchedId: string | null = null;
      let matchedTooltip: string | undefined;

      if (wallRenderMode === 'heatmap' || wallRenderMode === 'matrix') {
        // In heatmap/matrix mode the Baseline series map is empty; hit-test directly
        // against wallSegments data.
        // Both alive and dead walls span seg.startTime → seg.endTime (or +∞ for alive).
        for (const seg of (wallSegments ?? [])) {
          if (price < seg.price || price > seg.price + seg.bandHeight) continue;
          if (param.time !== undefined) {
            const t = param.time as number;
            if (seg.endTime === null) {
              // Alive: hover region is [seg.startTime, +∞)
              if (t < seg.startTime) continue;
            } else {
              // Dead: hover region is [seg.startTime, seg.endTime]
              if (t < seg.startTime || t > seg.endTime) continue;
            }
          }
          matchedId    = seg.id;
          matchedTooltip = seg.tooltip;
          break;
        }
      } else {
        // 'series' mode: use the Baseline series map which carries renderedStart/renderedEnd.
        const activeMap = wallSegmentSeriesRef.current;
        for (const [id, entry] of activeMap.entries()) {
          // Find the WallSegment spec for this entry to get price + bandHeight
          const seg = (wallSegments ?? []).find(s => s.id === id || `dead:${s.id}` === id);
          if (!seg) continue;

          // Price-band hit test
          if (price < seg.price || price > seg.price + seg.bandHeight) continue;

          // Time-range hit test (if time available from crosshair)
          if (param.time !== undefined) {
            const t = param.time as number;
            if (t < entry.renderedStart || t > entry.renderedEnd) continue;
          }

          matchedId = id;
          matchedTooltip = entry.tooltip;
          break;
        }
      }

      if (matchedId === null || !matchedTooltip) {
        // No hit — hide tooltip
        if (wallTooltipIdRef.current !== null) {
          wallTooltipIdRef.current = null;
          setWallTooltip(null);
        }
        return;
      }

      // Compute position — clamp to container bounds (assume 12px margin)
      const container = containerRef.current;
      const maxX = container ? container.clientWidth - 160 : param.point.x + 14;
      const maxY = container ? container.clientHeight - 40 : param.point.y;
      const tooltipX = Math.min(param.point.x + 14, maxX);
      const tooltipY = Math.max(param.point.y - 10, 8);
      const clampedY = Math.min(tooltipY, maxY);

      if (matchedId === wallTooltipIdRef.current) {
        // Same segment — update position only via direct DOM mutation (no re-render)
        if (tooltipDiv) {
          tooltipDiv.style.left = `${tooltipX}px`;
          tooltipDiv.style.top = `${clampedY}px`;
        }
        return;
      }

      // New segment — update state (triggers render with new text)
      wallTooltipIdRef.current = matchedId;
      setWallTooltip({ text: matchedTooltip, x: tooltipX, y: clampedY });
    };

    chart.subscribeCrosshairMove(handler);
    return () => {
      try { chart.unsubscribeCrosshairMove(handler); } catch { /* chart may be gone */ }
    };
  // Re-subscribe when chart mounts or wallSegments list changes (new ids / tooltips).
  // barCount ensures the candle series is ready before we subscribe.
  // wallRenderMode: changes the hit-test branch in the handler.
  }, [barCount, wallSegments, wallRenderMode]);

  // ─── Liquidity band → autoscale sync ───────────────────────
  // When the caller updates `liquidityBand`, write it to the ref so the
  // autoscaleInfoProvider closure on the candlestick series reads the new value
  // on the very next frame.
  //
  // THE CRITICAL FIX (bug from PR #758): `seriesRef.current.applyOptions({})`
  // does NOT force lw-charts to re-apply the band after a manual price-axis drag
  // because the price scale is locked in manual mode (autoScale=false). We must
  // explicitly call `priceScale().applyOptions({ autoScale: true })` when the
  // band is active so lw-charts re-enters auto mode and re-queries every series'
  // autoscaleInfoProvider on the right scale. The candlestick series returns the
  // band range; all wall Baseline series return null — so the band wins.
  //
  // When the band is cleared (null), we only nudge via applyOptions({}) to avoid
  // re-entering auto mode unnecessarily (the user may have manually zoomed, and
  // we want to preserve that state when auto-fit is turned off).
  useEffect(() => {
    liquidityBandRef.current = liquidityBand;
    const series = seriesRef.current;
    if (!series) return;
    try {
      if (liquidityBand) {
        // Only RE-enter auto mode on activation (null→band) or right after a
        // manual deactivation. Re-forcing autoScale on every 0.5% band drift
        // re-snapped the price axis every few seconds and felt like "jumping".
        // While the band stays active, autoScale is already on and lw-charts
        // keeps tracking the band via autoscaleInfoProvider (liquidityBandRef).
        if (!bandWasActiveRef.current) {
          series.priceScale().applyOptions({ autoScale: true });
          bandWasActiveRef.current = true;
        }
      } else {
        // Band deactivated — nudge without re-entering auto mode, and remember
        // so the next activation re-forces a single auto-fit.
        bandWasActiveRef.current = false;
        series.applyOptions({});
      }
    } catch {
      // Series or price scale may have been removed mid-flight — ignore.
    }
  }, [liquidityBand]);

  // ─── Muted candles (footprint overlay dimming) ──────────────
  // When `mutedCandles` toggles on, applyOptions() the candle series colors
  // down to a thin semi-transparent skeleton so the footprint clusters read
  // clearly on top (dxFeed-reference look). Toggling off restores the normal
  // theme palette. Undefined/false (every existing caller) never runs this —
  // additive, zero behavior change.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    try {
      if (mutedCandles) {
        series.applyOptions({
          upColor: 'rgba(34, 197, 94, 0.25)',
          downColor: 'rgba(220, 38, 38, 0.25)',
          borderUpColor: 'rgba(34, 197, 94, 0.35)',
          borderDownColor: 'rgba(220, 38, 38, 0.35)',
          wickUpColor: 'rgba(22, 163, 74, 0.25)',
          wickDownColor: 'rgba(185, 28, 28, 0.25)',
        });
      } else if (effectiveChartStyle) {
        // Chart Settings active (Trading Arena) — restore the user's chosen
        // candle colors instead of the hardcoded theme defaults, so toggling
        // mutedCandles off (e.g. footprint overlay stage change) doesn't
        // clobber a custom candle color preset back to FINOTAUR_DARK_THEME.
        series.applyOptions(chartStyleToSeriesOptions(effectiveChartStyle));
      } else {
        series.applyOptions({
          upColor: themeTokens.candleUp,
          downColor: themeTokens.candleDown,
          borderUpColor: themeTokens.candleBorderUp,
          borderDownColor: themeTokens.candleBorderDown,
          wickUpColor: themeTokens.candleWickUp,
          wickDownColor: themeTokens.candleWickDown,
        });
      }
    } catch {
      // Series may have been removed mid-flight — ignore.
    }
  }, [mutedCandles, themeTokens, effectiveChartStyle]);

  // ─── Imperative time-window re-focus (Fit button) ──────────
  // When `timeFitToken` is bumped by the caller (e.g. scanner "Fit" click),
  // re-apply `focusRange` on the time scale so the visible window snaps back
  // to the last-6h window regardless of where the user has panned/zoomed.
  // Token 0 / undefined is treated as "no-op on first render" — the bar-load
  // effect already handles the initial setVisibleRange.
  useEffect(() => {
    if (!timeFitToken || !focusRange || !chartRef.current) return;
    try {
      chartRef.current.timeScale().setVisibleRange({
        from: focusRange.from as never,
        to:   focusRange.to   as never,
      });
    } catch {
      // Chart may be mid-teardown — ignore.
    }
  // Only re-run when the token changes; focusRange identity changes every 30s
  // with the scanner's timeTick but we must NOT re-apply on every slide —
  // only when the token is explicitly bumped.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFitToken]);

  // ─── Manual price-scale override detection ──────────────────
  // lw-charts v4 has no event for "user dragged the price axis". We detect it
  // via a native pointerdown listener on the right-edge price-scale column
  // (the last ~55px of the container — matching lw-charts' default axis width).
  // When triggered with an active liquidityBand we call onManualPriceScale so
  // the scanner can disable auto-fit and show the "Fit" restore button.
  useEffect(() => {
    if (!onManualPriceScale) return;
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: PointerEvent) => {
      // Only act when the band is active — otherwise the callback is irrelevant.
      if (!liquidityBandRef.current) return;
      // Hit-test: pointer is in the right-side price scale column (approx 55px).
      const rect = el.getBoundingClientRect();
      const xFromRight = rect.right - e.clientX;
      if (xFromRight <= 55) {
        onManualPriceScale();
      }
    };

    el.addEventListener('pointerdown', handler);
    return () => el.removeEventListener('pointerdown', handler);
    // onManualPriceScale identity is expected to be stable (useCallback in caller).
    // Re-attach if the callback reference changes.
  }, [onManualPriceScale]);

  // Reset the one-time auto-fit guard whenever the symbol or interval changes so
  // the new dataset re-fits once. (Window slides keep from/to changing but must
  // NOT re-fit — see the bar-load effect's token-driven guard.)
  useEffect(() => {
    didInitialFitRef.current = false;
  }, [symbol, interval]);

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

        // Report candle hi/low to caller so it can include price action in the
        // liquidity band (makes the band authoritative for the visible candles).
        if (onBarsLoad) {
          if (bars.length > 0) {
            // Only the VISIBLE window's candles define the price band, not the
            // full loaded history (600 bars = ~100 days on 4h). When focusRange
            // is provided (scanner), restrict hi/low to bars inside it so the
            // band frames the on-screen candles. Other callers keep all bars.
            const winFrom = focusRange
              ? (focusRange.from as unknown as number)
              : -Infinity;
            let hi = -Infinity;
            let lo = Infinity;
            let rangeSum = 0;
            let rangeCount = 0;
            for (const b of bars) {
              if ((b.time as unknown as number) < winFrom) continue;
              if (b.high > hi) hi = b.high;
              if (b.low  < lo) lo = b.low;
              rangeSum += b.high - b.low;
              rangeCount += 1;
            }
            // Fallback: if the window filtered everything out, use all bars.
            if (hi === -Infinity) {
              rangeSum = 0;
              rangeCount = 0;
              for (const b of bars) {
                if (b.high > hi) hi = b.high;
                if (b.low  < lo) lo = b.low;
                rangeSum += b.high - b.low;
                rangeCount += 1;
              }
            }
            const avgBarRange = rangeCount > 0 ? rangeSum / rangeCount : 0;
            onBarsLoad({ high: hi, low: lo, avgBarRange });
          } else {
            onBarsLoad(null);
          }
        }

        if (bars.length > 0) {
          // Token-driven callers (the scanner, which passes timeFitToken) fit the
          // visible range only on the FIRST load per symbol/interval; subsequent
          // 30s window slides just refresh the data and leave the user's pan/zoom
          // untouched. The scanner re-centres explicitly via the timeFitToken
          // effect (Fit button / interval change). Non-token callers (journal /
          // backtest) keep the original always-fit behaviour.
          const tokenDriven = timeFitToken !== undefined;
          if (!tokenDriven || !didInitialFitRef.current) {
            if (focusRange) {
              chartRef.current?.timeScale().setVisibleRange({
                from: focusRange.from as never,
                to: focusRange.to as never,
              });
            } else {
              chartRef.current?.timeScale().fitContent();
            }
            didInitialFitRef.current = true;
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
    // refreshToken: deliberate extra dep (undefined for every caller except
    // FuturesChartTab) — see the prop doc comment on FinotaurChartProps.
  }, [symbol, interval, from, to, dataSource, onError, focusRange, onBarsLoad, refreshToken]);

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

  // ─── Apply overlay price lines (order-book walls etc.) ─────
  // Diffed by id: remove lines not in the new set, create lines not yet tracked.
  // No-op when `priceLines` is absent — zero impact on backtest/journal callers.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    const nextLines = priceLines ?? [];
    const nextMap = new Map<string, OverlayPriceLine>(nextLines.map(l => [l.id, l]));
    const activeMap = overlayPriceLinesRef.current;

    // Remove lines no longer in the prop
    for (const [id, line] of Array.from(activeMap.entries())) {
      if (!nextMap.has(id)) {
        try { series.removePriceLine(line); } catch { /* series already gone */ }
        activeMap.delete(id);
      }
    }

    // Add new lines (skip ids already tracked — they're stable)
    for (const [id, spec] of nextMap.entries()) {
      if (!activeMap.has(id)) {
        const line = series.createPriceLine({
          price: spec.price,
          color: spec.color,
          lineWidth: spec.lineWidth ?? 1,
          lineStyle: spec.lineStyle ?? LineStyle.Dashed,
          axisLabelVisible: true,
          title: spec.title,
        });
        activeMap.set(id, line);
      }
    }
  }, [priceLines]);

  // ─── Apply wall segments (time-aware liquidity history) ────────
  // Each segment is a dedicated BASELINE series spanning [startTime, endTime],
  // rendering as a filled horizontal BAND of height bandHeight price units —
  // a Bookmap-style stripe occupying the bin [price, price+bandHeight].
  // Alive walls (endTime=null) are extended 2 bars PAST the live edge so a
  // freshly-born wall is immediately visible as a stripe poking beyond the candle.
  // Dead walls are frozen at their endTime.
  // Segments where clamped start >= end are skipped.
  // No-op when `wallSegments` is absent — zero impact on backtest/journal callers.
  // When wallRenderMode === 'heatmap', this entire effect is bypassed — rendering
  // is handled by WallHeatLayer canvas overlay instead.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    // In heatmap or matrix mode: skip Baseline series creation; clean up any
    // pre-existing series so switching modes doesn't leave stale series behind.
    if (wallRenderMode === 'heatmap' || wallRenderMode === 'matrix') {
      for (const [id, entry] of Array.from(wallSegmentSeriesRef.current.entries())) {
        try { chart.removeSeries(entry.series); } catch { /* chart may be gone */ }
        wallSegmentSeriesRef.current.delete(id);
      }
      return;
    }

    const segments = wallSegments ?? [];
    const nextMap = new Map<string, WallSegment>(segments.map(s => [s.id, s]));
    const activeMap = wallSegmentSeriesRef.current;

    // Determine the time bounds of loaded bars for clamping.
    const bars = barsRef.current;
    if (segments.length === 0 && activeMap.size === 0) return; // fast-path: nothing to do

    const firstBarTime = bars.length > 0 ? (bars[0].time as unknown as number) : null;
    const lastBarTime  = bars.length > 0 ? (bars[bars.length - 1].time as unknown as number) : null;
    const barSpacing   = bars.length > 1
      ? (bars[bars.length - 1].time as unknown as number) - (bars[bars.length - 2].time as unknown as number)
      : null;

    // ── Remove series no longer in the prop ───────────────────
    for (const [id, entry] of Array.from(activeMap.entries())) {
      if (!nextMap.has(id)) {
        try { chart.removeSeries(entry.series); } catch { /* chart may be gone */ }
        activeMap.delete(id);
      }
    }

    // ── Add or update segments ─────────────────────────────────
    for (const [id, seg] of nextMap.entries()) {
      // Resolve effective end time:
      //   Dead walls → frozen at their endTime.
      //   Alive walls → extend 2 bars past the live edge (Bookmap-style: the
      //   stripe pokes beyond the newest candle so it's immediately visible).
      const resolvedEnd = seg.endTime !== null
        ? seg.endTime
        : lastBarTime !== null && barSpacing !== null
          ? lastBarTime + 2 * barSpacing
          : (lastBarTime ?? seg.startTime);

      // Clamp start to the first bar (can't render before loaded history).
      let clampedStart = firstBarTime !== null
        ? Math.max(seg.startTime, firstBarTime)
        : seg.startTime;

      // Enforce a minimum visible span of 3 bars so walls are clearly visible
      // on larger timeframes (1h / 1D) even when born just moments ago.
      // This applies to both alive and dead walls.
      if (barSpacing !== null) {
        const minSpan = 3 * barSpacing;
        if (resolvedEnd - clampedStart < minSpan) {
          // Push start back to satisfy the 3-bar minimum.
          const candidate = resolvedEnd - minSpan;
          // Don't go before the first loaded bar.
          clampedStart = firstBarTime !== null ? Math.max(candidate, firstBarTime) : candidate;
          // Final guard: if clamping to firstBarTime still collapses the span,
          // fall back to a single-bar span at the right edge.
          if (clampedStart >= resolvedEnd && barSpacing !== null) {
            clampedStart = resolvedEnd - barSpacing;
          }
        }
      } else if (clampedStart >= resolvedEnd) {
        // No barSpacing yet (single loaded bar) — keep the legacy 1-bar fallback.
        clampedStart = resolvedEnd - (firstBarTime !== null ? 1 : 0);
      }

      // Skip segments that still degenerate (single loaded bar, etc.) —
      // lightweight-charts requires strictly ascending times in setData.
      if (clampedStart >= resolvedEnd || (firstBarTime !== null && clampedStart < firstBarTime)) {
        // Remove the series if it was previously rendered.
        const existing = activeMap.get(id);
        if (existing) {
          try { chart.removeSeries(existing.series); } catch { /* gone */ }
          activeMap.delete(id);
        }
        continue;
      }

      const existing = activeMap.get(id);
      // The band top = price + bandHeight (the constant horizontal datum for the baseline series).
      const bandTop = seg.price + seg.bandHeight;

      if (!existing) {
        // ── Create new baseline series (fills the band [price, price+bandHeight]) ─
        // baseValue.price = band bottom (seg.price).
        // data value = band top (seg.price + bandHeight) — the area ABOVE baseValue fills.
        // Top fill = colored stripe; bottom fill = transparent (nothing below baseValue).
        const baselineSeries = chart.addBaselineSeries({
          baseValue: { type: 'price', price: seg.price },
          topLineColor:    seg.color,
          topFillColor1:   seg.fillColor,
          topFillColor2:   seg.fillColor,
          bottomLineColor: 'rgba(0,0,0,0)',
          bottomFillColor1:'rgba(0,0,0,0)',
          bottomFillColor2:'rgba(0,0,0,0)',
          lineWidth: 1,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
          // Axis labels permanently off — tooltip replaces axis pills.
          lastValueVisible: false,
          title: '',
          // Use the right price scale (same pane as candles).
          priceScaleId: 'right',
          // Exclude wall series from price-axis autoscaling so deep walls
          // (e.g. a bid at -70% of mid) never squash the candle chart.
          // The axis fits candles only; walls become visible when the user
          // manually scales/zooms the price axis.
          // autoscaleInfoProvider is part of SeriesOptionsCommon in lw-charts v4.
          autoscaleInfoProvider: () => null,
        });
        baselineSeries.setData([
          { time: clampedStart as UTCTimestamp, value: bandTop },
          { time: resolvedEnd   as UTCTimestamp, value: bandTop },
        ]);
        activeMap.set(id, {
          series: baselineSeries,
          // Store the RESOLVED end (seg.endTime stays null for alive walls)
          // so live segments keep extending as new bars arrive.
          endTime: resolvedEnd,
          title: seg.title,
          tooltip: seg.tooltip,
          renderedStart: clampedStart,
          renderedEnd:   resolvedEnd,
        });
      } else {
        // ── Update if the resolved end or tooltip changed ───────
        const endChanged     = existing.endTime  !== resolvedEnd;
        const tooltipChanged = existing.tooltip  !== seg.tooltip;

        if (endChanged) {
          existing.series.setData([
            { time: clampedStart as UTCTimestamp, value: bandTop },
            { time: resolvedEnd   as UTCTimestamp, value: bandTop },
          ]);
          existing.endTime      = resolvedEnd;
          existing.renderedStart = clampedStart;
          existing.renderedEnd   = resolvedEnd;
        }

        if (tooltipChanged) {
          existing.tooltip = seg.tooltip;
        }

        // Ensure axis labels stay off even if options were overwritten externally.
        if (endChanged || tooltipChanged) {
          existing.series.applyOptions({ lastValueVisible: false, title: '' });
        }
        // Keep title field in sync for internal ref tracking (though not rendered).
        existing.title = seg.title;
      }
    }
  // barCount triggers re-evaluation after bars load (lastBarTime shifts).
  // wallSegments triggers on every scanner tick.
  // wallRenderMode: switching modes cleans up Baseline series or re-creates them.
  }, [wallSegments, barCount, wallRenderMode]);

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

      {/* Wall heatmap canvas overlay — only in heatmap mode.
          Mounted unconditionally once the chart + series are ready (barCount > 0)
          so subscriptions + the 500ms safety timer are registered exactly once.
          WallHeatLayer no-ops internally when segments is empty. */}
      {wallRenderMode === 'heatmap' &&
       chartRef.current && seriesRef.current &&
       barCount > 0 && (
        <WallHeatLayer
          chart={chartRef.current}
          series={seriesRef.current}
          segments={wallSegments ?? []}
          width={containerSize.w || (containerRef.current?.clientWidth ?? 0)}
          height={containerSize.h || (containerRef.current?.clientHeight ?? 0)}
          bottomClipPx={
            footprint ? computeFootprintBandHeightPx(footprint.config, footprintDetailStage) : 0
          }
        />
      )}

      {/* Depth matrix heatmap canvas — only in matrix mode.
          Rendered BEHIND candles (z-index 5 vs candle canvas z-index auto/0 — the
          chart canvas is positioned after containerRef so it paints on top).
          Mounted once chart + series are ready so coordinate APIs are available. */}
      {wallRenderMode === 'matrix' &&
       chartRef.current && seriesRef.current &&
       barCount > 0 && (
        <DepthMatrixLayer
          chart={chartRef.current}
          series={seriesRef.current}
          columns={depthMatrixColumns ?? []}
          binSize={depthMatrixBinSize}
          width={containerSize.w || (containerRef.current?.clientWidth ?? 0)}
          height={containerSize.h || (containerRef.current?.clientHeight ?? 0)}
          sizeFilterPct={depthMatrixSizeFilterPct}
          floorUsd={depthMatrixFloorUsd}
          candleIntervalMs={depthMatrixCandleIntervalMs}
        />
      )}

      {/* Footprint overlay (ATAS-style bid/ask clusters) — only when the
          `footprint` prop is provided. Painted above candles (z-index 15,
          see FootprintLayer.tsx) so clusters read clearly over bars.
          Mounted once chart + series are ready, same gating as the other
          canvas overlays above. Undefined `footprint` = zero mount, zero cost. */}
      {footprint &&
       chartRef.current && seriesRef.current &&
       barCount > 0 && (
        <FootprintLayer
          chart={chartRef.current}
          series={seriesRef.current}
          store={footprint.store}
          config={footprint.config}
          visible={footprint.visible}
          width={containerSize.w || (containerRef.current?.clientWidth ?? 0)}
          height={containerSize.h || (containerRef.current?.clientHeight ?? 0)}
          bars={barsRef.current}
          onStageChange={(stage) => {
            // Mirror the stage locally (drives WallHeatLayer's bottomClipPx
            // below) in addition to forwarding to the caller's own callback —
            // see footprintDetailStage's doc comment.
            setFootprintDetailStage(stage);
            footprint.onStageChange?.(stage);
          }}
        />
      )}

      {/* Volume Profile overlay (ATAS-style visible-range histogram + POC/VA)
          — only when the `volumeProfile` prop is provided. Painted above
          candles but below marker icons, same register as the footprint
          overlay. Undefined `volumeProfile` = zero mount, zero cost. */}
      {volumeProfile &&
       chartRef.current && seriesRef.current &&
       barCount > 0 && (
        <VolumeProfileLayer
          chart={chartRef.current}
          series={seriesRef.current}
          store={volumeProfile.store}
          visible={volumeProfile.visible}
          width={containerSize.w || (containerRef.current?.clientWidth ?? 0)}
          height={containerSize.h || (containerRef.current?.clientHeight ?? 0)}
        />
      )}

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

            // Snap marker time to the nearest available bar — lightweight-charts
            // returns null from timeToCoordinate for times that don't EXACTLY
            // match a bar timestamp (fills between bar starts, after-hours
            // executions). Without snapping, the overlay never renders for most
            // real trades. Binary search over barsRef which the chart already
            // keeps up to date.
            const bars = barsRef.current;
            if (bars.length === 0) return null;
            let lo = 0, hi = bars.length - 1;
            const targetTime = icon.time as unknown as number;
            while (lo < hi) {
              const mid = (lo + hi) >> 1;
              if ((bars[mid].time as unknown as number) < targetTime) lo = mid + 1;
              else hi = mid;
            }
            const candidateAfter = bars[lo];
            const candidateBefore = lo > 0 ? bars[lo - 1] : candidateAfter;
            const beforeT = candidateBefore.time as unknown as number;
            const afterT = candidateAfter.time as unknown as number;
            const snappedBar = (
              Math.abs(targetTime - beforeT) <= Math.abs(afterT - targetTime)
                ? candidateBefore
                : candidateAfter
            );

            // Anchor to the candle's high/low (not the fill price) so the
            // marker floats above/below the candle instead of overlapping it.
            const anchorPrice = icon.direction === 'down' ? snappedBar.high : snappedBar.low;
            const x = chart.timeScale().timeToCoordinate(snappedBar.time as UTCTimestamp);
            const y = series.priceToCoordinate(anchorPrice);

            if (x === null || y === null) return null;
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

            // Push the marker clearly off the candle: 28px gap from the high/low.
            const top = icon.direction === 'down' ? (y as number) - 28 : (y as number) + 28;
            const left = x as number;

            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  top: top - 12,   // center the 24px circle vertically
                  left: left - 12, // center the 24px circle horizontally on the bar
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: icon.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                }}
              >
                {icon.direction === 'up'
                  ? <ArrowUp size={14} color="#fff" strokeWidth={3.5} absoluteStrokeWidth />
                  : <ArrowDown size={14} color="#fff" strokeWidth={3.5} absoluteStrokeWidth />
                }
              </div>
            );
          })}
        </div>
      )}

      {/* Wall hover tooltip — floats near the cursor over a wall stripe */}
      {wallTooltip && (
        <div
          ref={wallTooltipDivRef}
          className="pointer-events-none absolute z-30 select-none whitespace-nowrap rounded px-2 py-1 text-xs text-white"
          style={{
            left: wallTooltip.x,
            top: wallTooltip.y,
            background: 'rgba(8,8,10,0.95)',
            border: '1px solid rgba(201,166,70,0.35)',
          }}
        >
          {wallTooltip.text}
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
          className="absolute inset-0 flex items-end justify-around gap-1.5 px-6 pb-6"
          style={{ background: theme === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(8,8,10,0.6)' }}
          aria-hidden="true"
        >
          {[38, 62, 45, 80, 55, 70, 42, 68].map((h, i) => (
            <div
              key={i}
              className="animate-pulse rounded-sm"
              style={{
                flex: 1,
                height: `${h}%`,
                background: theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)',
              }}
            />
          ))}
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
