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

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { WallHeatLayer } from '@/components/charting/WallHeatLayer';
import { DepthMatrixLayer } from '@/components/charting/DepthMatrixLayer';
import type { DepthPaletteId } from '@/components/charting/depthPalettes';
import { FootprintLayer } from '@/components/charting/orderflow/FootprintLayer';
import { VolumeBubblesLayer } from '@/components/charting/orderflow/VolumeBubblesLayer';
import type { BubbleThresholdSetting } from '@/components/charting/orderflow/volumeBubbles';
import { VolumeProfileLayer } from '@/components/charting/orderflow/VolumeProfileLayer';
import { SessionVolumeProfileLayer, type SessionVolumeProfileRenderSettings } from '@/components/charting/orderflow/SessionVolumeProfileLayer';
import type { FlowBinStore } from '@/components/charting/orderflow/flowBinStore';
import type { FootprintConfig } from '@/components/charting/orderflow/types';
import type { FootprintDetailLevel } from '@/components/charting/orderflow/footprintRender';
import { computeFootprintBandHeightPx } from '@/components/charting/orderflow/footprintRender';
import type { DecodedColumn } from '@/pages/app/crypto/scanner/depthTypes';
import { ChartStyleContext, type ChartStyleSettings } from '@/pages/app/trading-arena/components/chartStyleSettings';
import { DepthProfileGutter } from '@/pages/app/trading-arena/components/DepthProfileGutter';
import { chartStyleToChartOptions, chartStyleToSeriesOptions } from '@/pages/app/trading-arena/components/chartStyleMapping';
import { MACD_HISTOGRAM_AUTO_COLOR } from '@/pages/app/trading-arena/components/indicatorsSettings';
import { readViewState, writeViewState, type ArenaPriceRange } from '@/pages/app/trading-arena/hooks/arenaViewState';
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
  ChartOrderLine,
  ChartTheme,
  Indicator,
  IndicatorLineStyle,
  IndicatorLineStyles,
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
  // Per Elad (2026-07-18): light mode = "white and black on the scales" —
  // axis tick labels use TV's near-black text, not the softer gray.
  textAxis:          '#131722',
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

// Free cursor mode: do not snap the mouse crosshair to nearby candle OHLC
// values. Footprint reading needs the crosshair to follow the pointer exactly.
const FREE_CROSSHAIR_MODE = CrosshairMode.Normal;

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
  CVD: '#38bdf8',     // sky-400 — cumulative volume delta line (pane or hidden overlay scale)
  DELTA: '#fb923c',   // orange-400 — per-bar histogram base (actual bars colored per-sign, see data-apply switch)
};

// Companion colors for the multi-series indicators
const MACD_SIGNAL_COLOR = '#fbbf24';                 // amber-400, slightly bolder than MACD line
const BBANDS_BAND_COLOR = 'rgba(167, 139, 250, 0.5)'; // violet-400 at 0.5 opacity for upper/lower

// ═══════════════════════════════════════════════════════════════
// Per-line style resolution (Trading Arena's Style tab — see
// IndicatorSettingsDialog.tsx + indicatorsSettings.ts's
// `ArenaIndicatorLineStyle`/`buildIndicatorsFromArenaSettings`, which is the
// ONLY caller that ever sets `Indicator.lineStyles`). Every helper below
// falls back to the EXACT pre-existing hardcoded look when `override` is
// undefined — Journal/Backtest/ReplayChart never set `lineStyles`, so their
// charts are byte-for-byte unaffected.
// ═══════════════════════════════════════════════════════════════

/** Multiplies a `#rrggbb`/`#rgb` color's alpha by `opacity`. Non-hex input (e.g. an already-rgba fallback like BBANDS_BAND_COLOR) is returned unchanged — its alpha is already baked in. */
function applyOpacityToHexColor(color: string, opacity: number): string {
  if (!color.startsWith('#')) return color;
  const clamped = Math.min(1, Math.max(0, opacity));
  const hex = color.slice(1);
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  if (full.length !== 6) return color;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return color;
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

function toLightweightLineStyle(kind: IndicatorLineStyle['lineStyle']): LineStyle {
  switch (kind) {
    case 'dashed':
      return LineStyle.Dashed;
    case 'dotted':
      return LineStyle.Dotted;
    case 'solid':
    default:
      return LineStyle.Solid;
  }
}

interface ResolvedLineOptions {
  color: string;
  lineWidth: 1 | 2 | 3 | 4;
  lineStyle: LineStyle;
  visible: boolean;
}

function resolveLineOptions(
  override: IndicatorLineStyle | undefined,
  fallbackColor: string,
  fallbackWidth: 1 | 2 | 3 | 4,
): ResolvedLineOptions {
  const opacity = override?.opacity ?? 1;
  const rawColor = override?.color ?? fallbackColor;
  return {
    color: applyOpacityToHexColor(rawColor, opacity),
    lineWidth: override?.thickness ?? fallbackWidth,
    lineStyle: toLightweightLineStyle(override?.lineStyle),
    visible: override?.visible ?? true,
  };
}

/** Series index -> `IndicatorLineStyles` slot name, in the same fixed order `createSeriesForType` creates series. */
function styleSlotOrder(type: IndicatorType): (keyof IndicatorLineStyles)[] {
  switch (type) {
    case 'MACD':
      return ['macdLine', 'signalLine', 'histogram'];
    case 'BBANDS':
      return ['basis', 'upper', 'lower'];
    default:
      return ['line'];
  }
}

/** The pre-existing hardcoded fallback color for a given slot (used when `override` is undefined, i.e. every non-Arena caller). */
function legacyFallbackColorForSlot(slot: keyof IndicatorLineStyles, primaryColor: string): string {
  switch (slot) {
    case 'signalLine':
      return MACD_SIGNAL_COLOR;
    case 'upper':
    case 'lower':
      return BBANDS_BAND_COLOR;
    default:
      return primaryColor;
  }
}

function legacyFallbackWidthForSlot(slot: keyof IndicatorLineStyles): 1 | 2 | 3 | 4 {
  return slot === 'upper' || slot === 'lower' ? 1 : 2;
}

/**
 * (Re-)applies per-line style to an already-created series list — called
 * every time the indicators-apply effect runs, so live edits from the Style
 * tab reach the chart without recreating series. Idempotent — also called
 * right after `createSeriesForType` so first paint matches this same logic.
 */
function applyIndicatorLineStyles(
  seriesList: ISeriesApi<'Line' | 'Histogram'>[],
  type: IndicatorType,
  lineStyles: IndicatorLineStyles | undefined,
  primaryColor: string,
): void {
  const slots = styleSlotOrder(type);
  slots.forEach((slot, idx) => {
    const series = seriesList[idx];
    if (!series) return;
    const override = lineStyles?.[slot];
    if (slot === 'histogram') {
      // Histogram bars carry their own per-point `color` (see the MACD data-
      // application switch case) — lineWidth/lineStyle don't apply to bars.
      (series as ISeriesApi<'Histogram'>).applyOptions({ visible: override?.visible ?? true });
      return;
    }
    const resolved = resolveLineOptions(
      override,
      legacyFallbackColorForSlot(slot, primaryColor),
      legacyFallbackWidthForSlot(slot),
    );
    (series as ISeriesApi<'Line'>).applyOptions({
      color: resolved.color,
      lineWidth: resolved.lineWidth,
      lineStyle: resolved.lineStyle,
      visible: resolved.visible,
    });
  });
}

// Subpane price-scale IDs. Each unknown id creates a new overlay scale in
// lightweight-charts. The candle pane uses the built-in `right` scale.
// RSI/MACD/ATR/DELTA (and CVD in 'pane' mode) get a UNIQUE id PER INSTANCE
// (`pane-<key>`, where `key` is `indicator.instanceId ?? indicator.type`) so
// the Trading Arena can add the same type more than once (e.g. RSI 14 + RSI
// 21) with independent panes; every non-Arena caller has no `instanceId`, so
// `key === type` and the id is stable/identical across renders — same
// effective behavior as the old fixed 'rsi'/'macd'/'atr' constants.
//
// CVD is special: in `'overlay'` displayMode it returns the shared
// `'cvd-overlay'` id (a single hidden price scale reused across every CVD
// instance in overlay mode — see the indicators-apply effect's scale
// configuration below) instead of a per-instance pane id.
function resolvePaneScaleId(type: IndicatorType, key: string, displayMode?: 'pane' | 'overlay'): string {
  switch (type) {
    case 'RSI':
    case 'MACD':
    case 'ATR':
    case 'DELTA':
      return `pane-${key}`;
    case 'CVD':
      return displayMode === 'overlay' ? 'cvd-overlay' : `pane-${key}`;
    default:
      return 'right';
  }
}

// ═══════════════════════════════════════════════════════════════
// Pane allocation — dynamic scaleMargins for N active subpanes
// ═══════════════════════════════════════════════════════════════
// `lightweight-charts` v4 has no native multi-pane API (added in v5). We
// approximate panes by giving each subpane its own overlay price scale and
// carving the vertical space via `scaleMargins`. The candle pane shrinks
// as more subpanes activate.
//
// scaleMargins semantics:
//   { top: a, bottom: b }  →  scale occupies y ∈ [a, 1 − b]  (a + b ≤ 1)
//
// Subpane order top→bottom follows `indicators` array order (the Trading
// Arena's INSTANCES model has no fixed RSI/MACD/ATR ordering once multiple
// instances of paned types can coexist) — still deterministic/predictable
// across reload since instance order is stable persisted state.
type ScaleMargins = { top: number; bottom: number };

// Hand-tuned layouts for 1-3 subpanes — UNCHANGED from the pre-instances
// fixed-type version (byte-for-byte same visual result for the common case
// of ≤1 RSI + ≤1 MACD + ≤1 ATR active at once).
const FIXED_PANE_LAYOUTS: Record<1 | 2 | 3, { candle: ScaleMargins; slots: ScaleMargins[] }> = {
  1: {
    candle: { top: 0.05, bottom: 0.3 },
    slots: [{ top: 0.75, bottom: 0.05 }],
  },
  2: {
    candle: { top: 0.05, bottom: 0.5 },
    slots: [
      { top: 0.55, bottom: 0.27 }, // height ≈ 18%
      { top: 0.78, bottom: 0.04 }, // height ≈ 18%
    ],
  },
  3: {
    candle: { top: 0.05, bottom: 0.55 },
    slots: [
      { top: 0.45, bottom: 0.37 }, // y∈[0.45, 0.63]
      { top: 0.63, bottom: 0.19 }, // y∈[0.63, 0.81]
      { top: 0.81, bottom: 0.02 }, // y∈[0.81, 0.98]
    ],
  },
};

/**
 * `paneKeys` — ordered, unique keys (one per active RSI/MACD/ATR instance).
 * Returns candle margins + a per-key margins map. 4-5 keys are only
 * reachable via the Arena's multi-instance model (MAX_ACTIVE_INDICATORS=5)
 * — shrinks slot height uniformly so all panes fit contiguously below the
 * candle (no hand-tuned layout existed pre-instances since the old model
 * capped at 3 possible subpanes, one per type).
 */
function computeDynamicPaneMargins(paneKeys: string[]): { candle: ScaleMargins; panes: Map<string, ScaleMargins> } {
  const count = paneKeys.length;
  const panes = new Map<string, ScaleMargins>();

  if (count === 0) {
    return { candle: { top: 0.1, bottom: 0.1 }, panes };
  }
  const fixed = count <= 3 ? FIXED_PANE_LAYOUTS[count as 1 | 2 | 3] : undefined;
  if (fixed) {
    paneKeys.forEach((key, i) => panes.set(key, fixed.slots[i]));
    return { candle: fixed.candle, panes };
  }

  const candle: ScaleMargins = { top: 0.05, bottom: 0.6 };
  const regionStart = 1 - candle.bottom; // 0.40
  const regionEnd = 0.98;
  const slotHeight = (regionEnd - regionStart) / count;
  paneKeys.forEach((key, i) => {
    const top = regionStart + i * slotHeight;
    const bottom = 1 - (top + slotHeight);
    panes.set(key, { top, bottom });
  });
  return { candle, panes };
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
  /** Resolved via `resolvePaneScaleId` — unique per RSI/MACD/ATR instance, 'right' for every overlay type. */
  paneScaleId: string,
): ISeriesApi<'Line' | 'Histogram'>[] {
  switch (type) {
    case 'RSI': {
      const line = chart.addLineSeries({
        color: primaryColor,
        lineWidth: 2,
        priceScaleId: paneScaleId,
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
        priceScaleId: paneScaleId,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      const signalLine = chart.addLineSeries({
        color: MACD_SIGNAL_COLOR,
        lineWidth: 2,
        priceScaleId: paneScaleId,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      const histogram = chart.addHistogramSeries({
        priceScaleId: paneScaleId,
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
        priceScaleId: paneScaleId,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      return [line];
    }
    case 'CVD': {
      const line = chart.addLineSeries({
        color: primaryColor,
        lineWidth: 2,
        priceScaleId: paneScaleId,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
      });
      // Zero reference line only in 'pane' mode (paneScaleId is a dedicated
      // 'pane-<key>' scale there) — 'overlay' mode shares the hidden
      // 'cvd-overlay' scale with the candle area, where a zero-anchor line
      // would just be a stray horizontal line crossing candles.
      if (paneScaleId !== 'cvd-overlay') {
        line.createPriceLine({
          price: 0,
          color: themeTokens.textAxis,
          lineWidth: 1,
          lineStyle: 1,
          axisLabelVisible: false,
          title: '',
        });
      }
      return [line];
    }
    case 'DELTA': {
      // Per-bar histogram — bars are colored per-point by sign (green up /
      // red down) in the data-apply switch below, same pattern as MACD's
      // histogram series.
      const histogram = chart.addHistogramSeries({
        priceScaleId: paneScaleId,
        priceLineVisible: false,
        lastValueVisible: false,
        base: 0,
      });
      return [histogram];
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
      // Transparent so the behind-candle canvas overlays (DepthMatrixLayer,
      // SessionVolumeProfileLayer — z-index 5, see the containerRef div's
      // z-index 6 below) are actually visible THROUGH the chart's own
      // background instead of being painted over by it. The wrapper div
      // (see the outer `<div>` in the render return below) carries the
      // former solid `t.background` color, so every consumer of
      // FinotaurChart still looks pixel-identical when no behind-layer is
      // mounted.
      background: { type: ColorType.Solid, color: 'transparent' },
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
      mode: FREE_CROSSHAIR_MODE,
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

/**
 * Seconds per `Interval` — used to gauge whether a chart's rolling `to`
 * window sits at the live edge (within ~2 bar-durations of "now") before
 * offering a `dataSource.subscribeBars()` live hookup, and (see the left-pan
 * backfill effect below) to size each backfill chunk's requested span. Each
 * data source keeps its own authoritative interval-seconds mapping (see
 * BinanceSource / AggregatingSource) — this map is only an approximation for
 * gauging/sizing, never load-bearing for correctness of the actual fetch.
 */
const LIVE_EDGE_INTERVAL_SECONDS: Record<Interval, number> = {
  '1s': 1,
  '1m': 60,
  '2m': 120,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '60m': 3600,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1wk': 604800,
  '1mo': 2592000,
};

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
  /**
   * Optional precomputed order-flow series feeding the `'CVD'` / `'DELTA'`
   * indicator types (see `Indicator.type`/`Indicator.displayMode`) — one
   * point per bar, `time` matching a loaded `Bar.time`. `cvd` = cumulative
   * volume delta running total; `delta` = that single bar's own volume
   * delta (buy volume minus sell volume). Callers wire this from their own
   * order-flow aggregation (e.g. FlowBinStore-derived data) — FinotaurChart
   * does no aggregation of its own, it only plots what's given.
   * 🔴 Undefined/empty is a COMPLETE no-op: CVD/DELTA series render empty
   * and are excluded from subpane layout (`paneKeys`) so no blank pane is
   * reserved when this prop isn't wired (e.g. stock symbols).
   */
  orderFlowData?: { time: UTCTimestamp; cvd: number; delta: number }[];
  /** Phase 0 = dark only; light reserved for Phase 1+. */
  theme?: ChartTheme;
  /** Container height. Number = pixels; string = CSS (e.g. '100%', '600px'). */
  height?: number | string;
  /**
   * Hide the OS mouse cursor over the chart pane so only the crosshair is
   * visible (NinjaTrader-style). The price/time axes keep their resize
   * cursors because lightweight-charts sets those as inline styles, which
   * override the inherited `cursor: none`. Used by Trading Arena tabs.
   */
  hideCursor?: boolean;
  /**
   * Fired on right-click over the chart pane INSTEAD of the browser's
   * default context menu (preventDefault is called only when this prop is
   * provided — all other callers keep the native menu). `price` is the
   * series price at the clicked Y coordinate (null when the chart isn't
   * ready or the click is outside the price scale's range); clientX/clientY
   * are viewport coordinates for positioning a caller-rendered menu.
   * Used by Trading Arena's ChartTab for the Buy/Sell/Settings menu.
   */
  onChartContextMenu?: (info: { price: number | null; clientX: number; clientY: number }) => void;
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
  /** Shows a compact NinjaTrader-style "F" button that re-fits the visible chart area. */
  showRefocusButton?: boolean;
  /**
   * Optional overlay price lines drawn on the candle series (e.g. order-book walls).
   * Diffed by `id` on every update — only changed lines are recreated, avoiding flicker.
   * When absent or empty the feature is a complete no-op; backtest/journal callers
   * are unaffected.
   */
  priceLines?: OverlayPriceLine[];
  /**
   * Optional paper-trading order/position lines drawn on the candle series
   * (Trading Arena — active position, pending orders, SL/TP legs). Diffed by
   * `id`: unlike `priceLines`, an existing id whose `price`/`color`/
   * `lineStyle`/`title` changed is updated IN PLACE via `IPriceLine.applyOptions`
   * (not removed/recreated) so a live-ticking PnL title doesn't flicker.
   * When absent or empty the feature is a complete no-op — every other
   * caller (Journal/Backtest/Scanner) is unaffected.
   */
  orderLines?: ChartOrderLine[];
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
  /**
   * Legacy MarketScanner.tsx-compat relative size filter (matrix mode only).
   * Phase 1 "no manual thresholds" overhaul: LiquidityTab.tsx no longer
   * passes this at all — the continuous soft-knee alpha (see
   * depthSignificance.ts) is its only mapping. MarketScanner.tsx still
   * passes its own "Size" toolbar value here; DepthMatrixLayer applies that
   * as an ADDITIONAL legacy binary dimming cap on top of the new soft-knee
   * alpha (see DepthMatrixLayer.tsx's sizeFilterPct prop doc comment), so
   * MarketScanner's own filter keeps working exactly as before. Default
   * `undefined` (not 0/5) so an absent prop is a true no-op for every other
   * caller, including LiquidityTab.tsx.
   */
  depthMatrixSizeFilterPct?: number;
  /**
   * @deprecated Phase 1 "no manual thresholds" overhaul — DepthMatrixLayer no
   * longer accepts a floor prop (dust-only removal now happens upstream at
   * the sampling layer — see useDepthSlices.ts / depthSignificance.ts). Kept
   * here ONLY so MarketScanner.tsx (out of scope for this phase) continues
   * to compile unmodified; it is accepted but NOT forwarded to
   * DepthMatrixLayer, so it is now a no-op. LiquidityTab.tsx no longer
   * passes this at all.
   */
  depthMatrixFloorUsd?: number;
  /** Current candle interval in ms — used to map column→px width (matrix mode). */
  depthMatrixCandleIntervalMs?: number;
  /**
   * Color palette for the depth matrix heatmap (matrix mode only) — see
   * depthPalettes.ts. Default 'classic' (the original navy→cyan→yellow→white
   * ramp) when omitted — MarketScanner.tsx never passes this, so its render
   * is unaffected. LiquidityTab.tsx passes 'finotaur' (new default) or
   * 'thermal' via its settings menu.
   */
  depthMatrixPalette?: DepthPaletteId;
  /**
   * Enables the depth matrix's vertical band-smoothing + hot-wall bloom
   * (matrix mode only — see DepthMatrixLayer.tsx). Default false when
   * omitted (safe no-op for MarketScanner.tsx and every other caller).
   */
  depthMatrixSmoothing?: boolean;
  /**
   * Optional "executed aggression" volume bubbles overlay (ATAS/Bookmap-
   * style sized circles at (time, price) for trade prints whose dominant-
   * side volume clears a threshold — see volumeBubbles.ts). Mounts
   * VolumeBubblesLayer, fed by `store` — pass the SAME FlowBinStore instance
   * a footprint/volumeProfile overlay on this chart already uses to avoid a
   * second aggregation pass over the same trades.
   * 🔴 Undefined (every existing caller) is a COMPLETE no-op.
   */
  volumeBubbles?: {
    store: FlowBinStore;
    visible: boolean;
    thresholdSetting: BubbleThresholdSetting;
  };
  /**
   * Optional right-edge "what's waiting" resting-book gutter (DepthProfileGutter —
   * see that component's header comment). Undefined = zero mount, zero cost.
   */
  depthProfile?: {
    bids: ReadonlyMap<number, number>;
    asks: ReadonlyMap<number, number>;
    binSize: number;
    visible: boolean;
  };
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
   * Fired with the most recently loaded bar's close price whenever the REST
   * bar fetch resolves (`null` if the window returned zero bars). Intended
   * for callers on non-live-tick sources (delayed futures data has no
   * websocket) that need a "current price" proxy — e.g. Trading Arena's
   * futures paper-trading rail treats this as its `livePrice`. Deliberately
   * NOT fired from the live-tick `subscribeBars` path (crypto) — that source
   * already has its own live price via `useBinanceOrderBook`, and firing on
   * every tick would add an unnecessary re-render there. No-op when omitted.
   */
  onLastBarClose?: (close: number | null) => void;
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
   * Optional Volume Profile overlay (ATAS-style volume-by-price with POC +
   * Value Area). When provided, mounts a VolumeProfileLayer canvas fed by
   * `store` (the same FlowBinStore the footprint overlay reads from — pass
   * the same store instance to keep both overlays in sync).
   * Undefined (the default for every existing caller) is a complete no-op.
   */
  volumeProfile?: {
    store: FlowBinStore;
    visible: boolean;
    /**
     * When provided (Unix seconds), the profile is computed over
     * [sessionStartSec, +Inf) from the store — i.e. anchored to a session
     * (the current trading day, by default) instead of the visible chart
     * range, and does NOT change while panning/zooming. Recomputes only when
     * the store's data changes or `sessionStartSec` itself changes (e.g. the
     * calendar day rolls over) — see VolumeProfileLayer.tsx.
     * Undefined (the default) keeps the original visible-range behavior.
     */
    sessionStartSec?: number;
  };
  /**
   * Optional Chart-tab-only SESSION Volume Profile overlay (ATAS-style,
   * multi-session, OHLCV-bar-derived — see sessionVolumeProfile.ts). Distinct
   * from `volumeProfile` above (tick-level, FlowBinStore-fed, visible-range
   * only, Order Flow tab). Reads bars straight from this component's own
   * `barsRef.current` — the caller only supplies render settings + visible.
   * 🔴 Undefined is a COMPLETE no-op — every existing caller (including
   * FootprintTab/LiquidityTab, which never pass this prop) is fully
   * unaffected. Only ChartTab.tsx passes this.
   */
  sessionVolumeProfile?: {
    settings: SessionVolumeProfileRenderSettings;
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
  /**
   * Enables left-pan backfill: as the user pans/zooms toward the left edge
   * of the loaded bars, fetches one further-back chunk from `dataSource`
   * and prepends it, preserving the user's visible logical range.
   *
   * 🔴 Default `false` — a COMPLETE no-op for every existing caller
   * (Backtest/Journal/Scanner/FuturesChartTab). Currently opted into ONLY by
   * Trading Arena's ChartTab for crypto symbols (paired with
   * BinanceSource's chunked getBars() and ChartTab's interval-aware initial
   * window — see that file's header comment). Non-crypto callers keep their
   * existing fixed-window, no-backfill behavior.
   *
   * Stops permanently for the session once a backfill chunk returns 0 bars
   * (no more history) — silent, no UI indicator. Only one backfill request
   * is ever in flight at a time.
   */
  enableBackfill?: boolean;
  /**
   * When true, hides lightweight-charts' NATIVE vertical crosshair line and
   * renders a custom DOM line that follows the mouse pixel-by-pixel instead.
   *
   * Why: lightweight-charts' vertical crosshair line always snaps to the
   * nearest bar's time index even under `CrosshairMode.Normal` — only the
   * horizontal/price line is genuinely pixel-free. That bar-to-bar jump reads
   * as a "magnet" on the Liquidity tab's depth heatmap. The horizontal-line
   * behavior/style (chartStyleMapping.ts, driven by Chart Settings) is
   * completely untouched by this prop either way.
   *
   * 🔴 Default `false` — a COMPLETE no-op for every existing caller. Opted
   * into ONLY by Trading Arena's Liquidity tab (LiquidityTab.tsx). Chart /
   * Order Flow / CVD tabs keep today's native snapping behavior.
   */
  freeVerticalCrosshair?: boolean;
  /**
   * ATAS-parity "synced price scale" (see arenaViewState.ts's header
   * comment). When set, this chart RESTORES its time (and, best-effort,
   * price) window from the last window saved under this key by ANY Arena
   * chart view for the same `${assetClass}|${symbol}|${interval}`, instead
   * of the default fitContent()/focusRange() — and CAPTURES its own
   * pan/zoom back to the same key (throttled 300ms) so switching to
   * another view reopens on the same window.
   *
   * RESTORE precedence: a fresh saved time range wins over `focusRange`/
   * fitContent() when `timeFitToken` is undefined (ChartTab/CVD). For
   * token-driven callers (Footprint/Liquidity tabs), restore can ALSO win —
   * but only on the INITIAL mount, and only when `viewSyncRestoreMaxBars`
   * is set and the saved range is "legible" for this view (see that prop).
   * An explicit `timeFitToken` BUMP (the caller's own re-focus action —
   * "Fit" click, backfill-coverage snap — firing on an ALREADY-mounted
   * chart) always wins over restore; that codepath lives in a separate
   * effect (below) and is untouched by `viewSyncKey`.
   *
   * Price RESTORE is a deliberate v1 simplification (see the candlestick
   * series' `autoscaleInfoProvider`): applied ONCE on the first autoscale
   * recompute after data loads, and ONLY when it differs from what plain
   * autoscale would have picked by more than 2% — otherwise every
   * subsequent bar/tick update reverts to normal autoscale. This avoids
   * permanently pinning the price axis (which would fight the user's next
   * zoom) while still landing the price window close to where they left
   * off.
   *
   * 🔴 Undefined (every existing caller — Journal/Backtest/Scanner/Replay)
   * is a COMPLETE no-op.
   */
  viewSyncKey?: string;
  /**
   * Bounded-restore opt-in for `timeFitToken`-driven callers (Footprint/
   * Liquidity tabs). Without this, those callers NEVER restore from
   * `viewSyncKey` (their own `focusRange` always wins — see that prop's
   * doc comment). Set this to let restore compete with `focusRange` on the
   * INITIAL mount ONLY, gated by legibility: restore is used only when
   * `(saved.timeRange.to - saved.timeRange.from) / <seconds-per-bar> <=
   * viewSyncRestoreMaxBars` — i.e. the saved window isn't so wide it would
   * make this view's cells/heatmap illegible. Otherwise falls back to the
   * existing `focusRange`/`timeFitToken` framing untouched.
   *
   * Suggested values: ~120 for a footprint chart (cells must stay
   * readable), ~500 for a liquidity heatmap (tolerates wider windows).
   *
   * 🔴 Undefined (every existing caller, including ChartTab/CVD which never
   * need this) is a COMPLETE no-op — behavior is exactly the pre-existing
   * `viewSyncKey` contract above.
   */
  viewSyncRestoreMaxBars?: number;
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
  orderFlowData,
  theme: themeProp = 'dark',
  height = 600,
  hideCursor = false,
  onChartContextMenu,
  onError,
  focusRange,
  timeFitToken,
  showRefocusButton = false,
  priceLines,
  orderLines,
  onLastBarClose,
  wallSegments,
  wallRenderMode = 'series',
  depthMatrixColumns,
  depthMatrixBinSize = 1,
  // Default undefined (not 5) — un-deprecated, forwarded again below, but
  // absent-by-default so LiquidityTab.tsx (which never passes this) gets a
  // true no-op on DepthMatrixLayer's own default (0). See this prop's doc
  // comment above and DepthMatrixLayer.tsx's sizeFilterPct prop.
  depthMatrixSizeFilterPct,
  depthMatrixFloorUsd = 1_000,
  depthMatrixCandleIntervalMs = 60_000,
  depthMatrixPalette = 'classic',
  depthMatrixSmoothing = false,
  liquidityBand = null,
  onManualPriceScale,
  onBarsLoad,
  footprint,
  mutedCandles,
  refreshToken,
  volumeProfile,
  sessionVolumeProfile,
  volumeBubbles,
  depthProfile,
  chartStyle,
  enableBackfill = false,
  freeVerticalCrosshair = false,
  viewSyncKey,
  viewSyncRestoreMaxBars,
}: FinotaurChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // Chart Settings (Trading Arena's Chart ▾ menu) — explicit prop wins,
  // otherwise fall back to ChartStyleContext (undefined outside the Arena's
  // provider tree, so this is a no-op for every other caller). See the
  // `chartStyle` prop doc comment above for the full rationale.
  const contextChartStyle = useContext(ChartStyleContext);
  const effectiveChartStyle = chartStyle ?? contextChartStyle;
  // Arena Chart Settings' Dark/Light theme wins over the caller prop —
  // every non-Arena caller (no chartStyle/context) keeps the prop's value
  // (default 'dark') untouched. A change here remounts the chart (see the
  // mount effect's [theme] dep), swapping every base color atomically.
  const theme = effectiveChartStyle?.theme ?? themeProp;
  // Active theme tokens — derived once, used by both JSX and effects.
  const themeTokens = pickTheme(theme);
  // Resolved crosshair LINE style (solid/dashed/hidden) — drives both the
  // native horzLine (chartStyleMapping.ts) and, when freeVerticalCrosshair is
  // on, the custom vertical-line overlay's own dash pattern below, so the two
  // lines always look consistent. Same fallback ('dashed') chartStyleMapping
  // itself falls back to via DEFAULT_CHART_STYLE.
  const crosshairLineStyle = effectiveChartStyle?.crosshairStyle ?? 'dashed';
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
   * Left-pan backfill state (see `enableBackfill` prop). `noMore` is set
   * permanently (per symbol/interval/dataSource) once a backfill chunk
   * returns 0 bars — no further requests are attempted until the dataset
   * changes. `inFlight` guards a single concurrent backfill request;
   * `debounceTimer` coalesces rapid pan/zoom events into one request.
   */
  const backfillNoMoreRef = useRef(false);
  const backfillInFlightRef = useRef(false);
  const backfillDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Active series per indicator INSTANCE — survives bar refetch. Keyed by
   * `indicator.instanceId ?? indicator.type` (see types.ts's `Indicator`
   * doc comment) so the Trading Arena can add the SAME type multiple times
   * (e.g. EMA 9 + EMA 21) as independent series; every non-Arena caller
   * never sets `instanceId`, so the key degrades to the type string and
   * behavior is identical to the old one-series-per-type map.
   * Multi-series indicators (MACD = line+signal+histogram, BBANDS = middle+upper+lower)
   * keep their series in a fixed order; single-series indicators store a length-1 array.
   */
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line' | 'Histogram'>[]>>(
    new Map(),
  );
  /**
   * The `resolvePaneScaleId` result last used to create each key's series —
   * lets the indicators-apply effect detect when an indicator's pane-shape
   * changed (currently only possible via CVD's `displayMode` toggling
   * 'pane' <-> 'overlay') even though its `instanceId ?? type` key stayed
   * the same, so it can tear down and recreate the series on the new scale
   * instead of silently leaving it on the stale one.
   */
  const indicatorScaleIdRef = useRef<Map<string, string>>(new Map());
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
   * Active paper-trading order/position lines keyed by ChartOrderLine.id.
   * Stores the last-applied value alongside the line handle so the diff
   * effect below can detect price/color/lineStyle/title changes and update
   * in place via `applyOptions` (id-only diffing, like overlayPriceLinesRef,
   * would miss a live position's PnL-in-title updating every tick).
   */
  const orderLinesRef = useRef<Map<string, { line: IPriceLine; value: ChartOrderLine }>>(new Map());
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
   * Direct ref to the custom free-moving vertical crosshair line (see
   * `freeVerticalCrosshair` prop). Position/visibility are mutated directly
   * via style in the crosshairMove handler below (no per-frame setState) —
   * same perf pattern as `wallTooltipDivRef` above.
   */
  const freeCrosshairLineRef = useRef<HTMLDivElement | null>(null);

  /**
   * Latest liquidity band — held in a ref so the autoscaleInfoProvider closure
   * always reads the current band without needing to be recreated on every 3s update.
   * Updated synchronously in a useEffect when the `liquidityBand` prop changes.
   */
  const liquidityBandRef = useRef<{ minPrice: number; maxPrice: number } | null>(liquidityBand);

  /**
   * View-sync (`viewSyncKey`) price RESTORE — armed by the bar-load effect
   * right before `series.setData()` (so the very next autoscale recompute
   * that `setData` triggers sees it), consumed ONCE by the candlestick
   * series' `autoscaleInfoProvider` below, then cleared. See the
   * `viewSyncKey` prop doc comment for the full v1 strategy.
   */
  const syncPriceRestoreRef = useRef<ArenaPriceRange | null>(null);

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
    chart.applyOptions({ crosshair: { mode: FREE_CROSSHAIR_MODE } });
    if (freeVerticalCrosshair) {
      // Hide the NATIVE vertical line (it snaps to bar centers even in
      // Normal mode — see the `freeVerticalCrosshair` prop doc comment). The
      // custom DOM line (freeCrosshairLineRef, driven by the crosshairMove
      // subscription below) replaces it. horzLine is untouched — lw-charts
      // deep-merges applyOptions calls, so this never disturbs the
      // horizontal line's color/style/mode set above or by
      // chartStyleToChartOptions (chartStyleMapping.ts) later.
      chart.applyOptions({ crosshair: { vertLine: { visible: false, labelVisible: false } } });
    }

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
        // View-sync price RESTORE (viewSyncKey) — one-shot: consumed on the
        // very FIRST recompute after being armed (see the bar-load effect),
        // then cleared, so every LATER recompute (new bar, live tick,
        // pan/zoom) falls straight through to normal autoscale below. Only
        // overrides when the saved range differs meaningfully (>2% of the
        // base autoscale's width) from what autoscale would have picked
        // anyway — avoids a visible "snap" for a saved range that's
        // basically what autoscale would compute already.
        const pendingSync = syncPriceRestoreRef.current;
        if (pendingSync) {
          syncPriceRestoreRef.current = null;
          const base = baseImpl();
          if (base?.priceRange) {
            const baseWidth = base.priceRange.maxValue - base.priceRange.minValue;
            const baseMid = (base.priceRange.minValue + base.priceRange.maxValue) / 2;
            const savedMid = (pendingSync.min + pendingSync.max) / 2;
            const relDiff = baseWidth > 0 ? Math.abs(savedMid - baseMid) / baseWidth : 1;
            if (relDiff > 0.02) {
              return { priceRange: { minValue: pendingSync.min, maxValue: pendingSync.max } };
            }
            return base;
          }
          return { priceRange: { minValue: pendingSync.min, maxValue: pendingSync.max } };
        }
        return baseImpl();
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Theme-switch remount re-seed: bars already fetched by a previous mount
    // survive in barsRef, but the new series starts empty and the data-load
    // effect doesn't re-run on a theme change — without this the chart
    // renders blank until the next refetch (bug: Light Mode "loads no
    // candles", 2026-07-18).
    if (barsRef.current.length > 0) {
      series.setData(barsRef.current);
      chart.timeScale().fitContent();
    }

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
      indicatorScaleIdRef.current.clear();
      scalesConfiguredRef.current.clear();
      // Overlay price lines are destroyed with the chart — clear the map so
      // the next mount does not try to remove already-gone line handles.
      overlayPriceLinesRef.current.clear();
      // Order/position lines are destroyed with the chart too — same reasoning.
      orderLinesRef.current.clear();
      // Wall segment series belong to the destroyed chart — clear so the next
      // mount starts fresh without stale series handles.
      wallSegmentSeriesRef.current.clear();
    };
    // Re-create when theme changes — full remount swaps the candle palette,
    // background, grid, crosshair, and all subpane scale colors atomically.
    // freeVerticalCrosshair is intentionally omitted: every caller passes it
    // as a fixed literal (true/false) for the component's whole lifetime —
    // it never toggles on an already-mounted chart — so re-running this
    // effect on its change would be a no-op in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const styleChartOptions = chartStyleToChartOptions(effectiveChartStyle);
      chart.applyOptions({
        ...styleChartOptions,
        layout: {
          ...styleChartOptions.layout,
          // The canvas must STAY transparent (see buildChartOptions) so the
          // behind-candle z5 layers remain visible; the user's chosen
          // backgroundColor is carried by the wrapper div in the render
          // return instead of the chart canvas.
          background: { type: ColorType.Solid, color: 'transparent' },
        },
      });
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
        // FootprintLayer, VolumeProfileLayer, and SessionVolumeProfileLayer
        // (when their respective props are provided).
        if (wallRenderMode === 'heatmap' || wallRenderMode === 'matrix' || footprint || volumeProfile || sessionVolumeProfile || volumeBubbles) {
          setContainerSize({ w: Math.floor(w), h: Math.floor(h) });
        }
      }
    });
    ro.observe(el);

    // Seed initial size synchronously — ResizeObserver only fires on *changes*,
    // so if bars load before the first resize the layer would get 0×0 forever.
    if (wallRenderMode === 'heatmap' || wallRenderMode === 'matrix' || footprint || volumeProfile || sessionVolumeProfile || volumeBubbles) {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setContainerSize({ w, h });
    }

    return () => ro.disconnect();
    // footprint/volumeProfile/sessionVolumeProfile/volumeBubbles are object
    // props (new identity every render from most callers); gating on
    // truthiness only (via the `!!` cast) avoids re-running this effect (and
    // re-observing the ResizeObserver) on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallRenderMode, !!footprint, !!volumeProfile, !!sessionVolumeProfile, !!volumeBubbles]);

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

  // ─── Custom free-moving vertical crosshair line (freeVerticalCrosshair) ──
  // `param.point` from lightweight-charts' own crosshairMove event is the
  // raw, UNSNAPPED pixel coordinate under the cursor (the wall-hover tooltip
  // effect above already relies on this for its continuous
  // `coordinateToPrice(param.point.y)` price lookup) — only the library's own
  // rendered crosshair LINE snaps visually, not this event field. So reusing
  // this same subscription gives a genuinely pixel-free vertical line with no
  // extra pointermove wiring. Position is mutated directly on the DOM node
  // (no setState) to avoid a re-render on every mouse move.
  useEffect(() => {
    if (!freeVerticalCrosshair) return;
    const chart = chartRef.current;
    if (!chart) return;

    const handler = (param: { point?: { x: number; y: number } }) => {
      const line = freeCrosshairLineRef.current;
      if (!line) return;
      if (!param.point) {
        line.style.opacity = '0';
        return;
      }
      line.style.opacity = '1';
      line.style.transform = `translateX(${param.point.x}px)`;
      // Stop the line right above the time-axis strip (its height is
      // dynamic — font-size dependent — so read it live rather than
      // hardcoding a px guess).
      line.style.bottom = `${chart.timeScale().height()}px`;
    };

    chart.subscribeCrosshairMove(handler);
    return () => {
      try { chart.unsubscribeCrosshairMove(handler); } catch { /* chart may be gone */ }
    };
  // Re-subscribe when the chart (re)mounts — barCount confirms the series is
  // ready, same convention the wall-tooltip effect above uses.
  }, [freeVerticalCrosshair, barCount]);

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
  // down to a near-invisible thin skeleton — the body fill is almost fully
  // transparent so the bid×ask cluster numbers own the cell visually; the
  // FootprintLayer's own hairline-wick + 2px-body OHLC skeleton strip (drawn
  // at detail === 'full') is the actual OHLC reference while clusters show,
  // not this series (ATAS-style). Toggling off restores the normal theme
  // palette. Undefined/false (every existing caller) never runs this —
  // additive, zero behavior change.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    try {
      if (mutedCandles) {
        series.applyOptions({
          upColor: 'rgba(34, 197, 94, 0.05)',
          downColor: 'rgba(220, 38, 38, 0.05)',
          borderUpColor: 'rgba(34, 197, 94, 0.10)',
          borderDownColor: 'rgba(220, 38, 38, 0.10)',
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

  const refocusChart = useCallback(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart) return;
    try {
      if (focusRange) {
        chart.timeScale().setVisibleRange({
          from: focusRange.from as never,
          to:   focusRange.to   as never,
        });
      } else {
        chart.timeScale().fitContent();
      }
      series?.priceScale().applyOptions({ autoScale: true });
    } catch {
      // Chart may be mid-teardown — ignore.
    }
  }, [focusRange]);

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
    let unsubscribeLive: (() => void) | null = null;
    setLoading(true);
    setError(null);

    dataSource
      .getBars(symbol, interval, from as never, to as never)
      .then((bars: Bar[]) => {
        if (cancelled || !seriesRef.current) return;

        // ─── View-sync (viewSyncKey) RESTORE — read BEFORE setData() so the
        // candlestick series' autoscaleInfoProvider (armed via
        // syncPriceRestoreRef) sees the pending saved price range on the
        // very first recompute, which setData() triggers synchronously
        // below.
        //
        // Non-token callers (ChartTab/CVD, no `timeFitToken`): restore
        // always wins over focusRange/fitContent — see the `viewSyncKey`
        // prop doc comment.
        //
        // Token-driven callers (Footprint/Liquidity tabs pass
        // `timeFitToken`): restore is OFF by default (their own focusRange
        // encodes an explicit legibility/coverage-driven framing). Opting
        // into `viewSyncRestoreMaxBars` lets restore compete with that
        // framing, but ONLY on the INITIAL mount (`!didInitialFitRef.current`
        // — read here, still false the first time this effect resolves for
        // a fresh symbol/interval) and ONLY when the saved window's bar
        // span is within the legibility bound. A LATER explicit
        // `timeFitToken` bump (Fit click / backfill-coverage snap on an
        // already-mounted chart) is handled by the separate token-watching
        // effect below and is untouched by any of this — it always wins.
        const tokenDriven = timeFitToken !== undefined;
        let restoredTimeRange: { from: number; to: number } | null = null;
        if (viewSyncKey) {
          const saved = readViewState(viewSyncKey);
          if (saved) {
            let allowRestore = !tokenDriven;
            if (!allowRestore && viewSyncRestoreMaxBars !== undefined && !didInitialFitRef.current) {
              const intervalSec = LIVE_EDGE_INTERVAL_SECONDS[interval] ?? 60;
              const savedSpanBars = (saved.timeRange.to - saved.timeRange.from) / intervalSec;
              allowRestore = savedSpanBars <= viewSyncRestoreMaxBars;
            }
            if (allowRestore) {
              restoredTimeRange = saved.timeRange;
              if (saved.priceRange) {
                syncPriceRestoreRef.current = saved.priceRange;
              }
            }
          }
        }

        seriesRef.current.setData(bars);
        barsRef.current = bars;
        setBarCount(bars.length);
        onLastBarClose?.(bars.length > 0 ? bars[bars.length - 1].close : null);

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
          if (!tokenDriven || !didInitialFitRef.current) {
            if (restoredTimeRange) {
              // View-sync RESTORE wins over focusRange/fitContent — see the
              // RESTORE read above this promise callback.
              chartRef.current?.timeScale().setVisibleRange({
                from: restoredTimeRange.from as never,
                to: restoredTimeRange.to as never,
              });
            } else if (focusRange) {
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

        // ─── Live last-bar subscription (crypto real-time updates) ──────
        // Only when the source implements it (BinanceSource / an
        // AggregatingSource wrapping it — see ChartDataSource.subscribeBars'
        // doc comment) AND the requested window is a rolling "now" window
        // (its `to` bound sits within ~2 bar-durations of the current wall
        // clock), not a fixed historical range (e.g. a closed trade's detail
        // chart, which must stay frozen at its recorded window). Absent
        // method or a non-live-edge window = zero behavior change for every
        // other caller (Journal/Backtest/Scanner/futures/stocks).
        // Started only AFTER the REST load resolves (never races an
        // in-flight getBars), and torn down by this same effect's cleanup.
        if (dataSource.subscribeBars) {
          const intervalSec = LIVE_EDGE_INTERVAL_SECONDS[interval] ?? 60;
          const nowSec = Math.floor(Date.now() / 1000);
          const isLiveEdge = Number(to) >= nowSec - intervalSec * 2;
          if (isLiveEdge) {
            unsubscribeLive = dataSource.subscribeBars(symbol, interval, (bar: Bar) => {
              if (cancelled || !seriesRef.current) return;
              const liveBars = barsRef.current;
              const lastBar = liveBars.length > 0 ? liveBars[liveBars.length - 1] : null;
              if (lastBar && (bar.time as unknown as number) === (lastBar.time as unknown as number)) {
                // Same candle still forming — replace in place.
                liveBars[liveBars.length - 1] = bar;
                seriesRef.current.update(bar);
              } else if (!lastBar || (bar.time as unknown as number) > (lastBar.time as unknown as number)) {
                // A new candle opened — append.
                liveBars.push(bar);
                seriesRef.current.update(bar);
                setBarCount(liveBars.length);
              }
              // else: older than the last loaded bar — stale/out-of-order tick, ignore.
            });
          }
        }
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
      if (unsubscribeLive) {
        unsubscribeLive();
        unsubscribeLive = null;
      }
    };
    // refreshToken: deliberate extra dep (undefined for every caller except
    // FuturesChartTab) — see the prop doc comment on FinotaurChartProps.
  }, [symbol, interval, from, to, dataSource, onError, focusRange, onBarsLoad, onLastBarClose, refreshToken, viewSyncKey, viewSyncRestoreMaxBars]);

  // ─── View-sync (viewSyncKey) CAPTURE ────────────────────────
  // Writes the current time+price window to arenaViewState.ts (throttled
  // 300ms) whenever the user pans/zooms, so switching to another Arena
  // chart view for the same `${assetClass}|${symbol}|${interval}` reopens
  // on the same window — see RESTORE above + the `viewSyncKey` prop doc
  // comment. No-op entirely when `viewSyncKey` is undefined (every non-Arena
  // caller, and any Arena caller that hasn't opted in).
  useEffect(() => {
    if (!viewSyncKey) return;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingRange: { from: number; to: number } | null = null;

    const flush = () => {
      throttleTimer = null;
      if (!pendingRange) return;
      const range = pendingRange;
      pendingRange = null;

      // Derive the visible PRICE window from the candlestick series' own
      // pixel-to-price mapping — lightweight-charts v4 has no public
      // `priceScale.getVisibleRange()`, so this reads the top/bottom of the
      // chart PANE (not the container — excludes the time-axis strip) via
      // `coordinateToPrice`, mirroring the pattern this file already uses
      // for crosshair price lookups (see `param.point.y` usage elsewhere).
      let priceRange: ArenaPriceRange | null = null;
      try {
        const paneHeight = chart.paneSize().height;
        const topPrice = series.coordinateToPrice(0);
        const bottomPrice = series.coordinateToPrice(paneHeight);
        if (topPrice !== null && bottomPrice !== null) {
          priceRange = {
            min: Math.min(topPrice, bottomPrice),
            max: Math.max(topPrice, bottomPrice),
          };
        }
      } catch {
        // Chart may be mid-teardown — skip price capture this tick; the time range below still saves.
      }

      writeViewState(viewSyncKey, { timeRange: range, priceRange });
    };

    const handleVisibleTimeRangeChange = (range: { from: UTCTimestamp; to: UTCTimestamp } | null) => {
      if (!range) return;
      pendingRange = { from: range.from as unknown as number, to: range.to as unknown as number };
      if (throttleTimer) return;
      throttleTimer = setTimeout(flush, 300);
    };

    chart.timeScale().subscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange);

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer);
      try {
        chart.timeScale().unsubscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange);
      } catch {
        // Chart may already be torn down.
      }
    };
    // Re-subscribe whenever the chart is remounted (theme change rebuilds
    // chartRef/seriesRef — same rationale as the mount effect's own [theme]
    // dep) or the sync key changes (symbol/interval/assetClass switch) —
    // the closure captures `viewSyncKey` for `writeViewState`, so a stale
    // key must never keep receiving writes after a switch.
  }, [viewSyncKey, theme]);

  // ─── Left-pan backfill (older history) — see `enableBackfill` prop ────
  // As the user pans/zooms toward the left edge of the loaded bars, fetches
  // one further-back chunk and prepends it to barsRef.current, preserving
  // the user's current visible logical range (setData resets bar indices to
  // 0..N-1, so the captured range is shifted by however many bars were
  // prepended before being restored).
  //
  // Subscribes once per symbol/interval/dataSource (gated on `barCount > 0`
  // rather than the raw count so it doesn't resubscribe on every subsequent
  // backfill/live-tick bar-count change — same idiom as the sizing effect
  // above). Resets backfill state (noMore / inFlight / debounce) on that
  // same transition, so a fresh dataset always gets a clean slate.
  useEffect(() => {
    if (!enableBackfill) return;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    backfillNoMoreRef.current = false;
    backfillInFlightRef.current = false;
    if (backfillDebounceRef.current) {
      clearTimeout(backfillDebounceRef.current);
      backfillDebounceRef.current = null;
    }

    const BACKFILL_TRIGGER_BARS = 20; // fetch once the left edge is within this many bars
    const BACKFILL_CHUNK_BARS = 500;
    const BACKFILL_DEBOUNCE_MS = 150;
    const intervalSec = LIVE_EDGE_INTERVAL_SECONDS[interval] ?? 60;

    const runBackfill = () => {
      if (backfillInFlightRef.current || backfillNoMoreRef.current) return;
      const bars = barsRef.current;
      const oldest = bars[0];
      if (!oldest) return;
      backfillInFlightRef.current = true;

      const chunkTo = (Number(oldest.time) - 1) as unknown as UTCTimestamp;
      const chunkFrom = (Number(oldest.time) - intervalSec * BACKFILL_CHUNK_BARS) as unknown as UTCTimestamp;

      dataSource
        .getBars(symbol, interval, chunkFrom, chunkTo)
        .then((olderBars: Bar[]) => {
          backfillInFlightRef.current = false;
          if (olderBars.length === 0) {
            // Truly no data returned for the requested range — no more history.
            backfillNoMoreRef.current = true;
            return;
          }
          const currentSeries = seriesRef.current;
          if (!currentSeries) return;

          // Dedupe boundary overlap: drop any older-chunk bar whose time is
          // not strictly before the current oldest loaded bar (a clamped
          // AggregatingSource chunk, or an inclusive endpoint from the base
          // source, can otherwise repeat the boundary bar). A chunk that
          // dedupes down to nothing is NOT the same as "no more history" —
          // only the empty-response case above sets backfillNoMoreRef.
          const existingOldestTime = Number(barsRef.current[0]?.time ?? Infinity);
          const filtered = olderBars.filter((b) => Number(b.time) < existingOldestTime);
          if (filtered.length === 0) return;

          // Capture the visible logical range BEFORE mutating series data —
          // setData re-indexes bars to 0..N-1, so the same logical range
          // would point at different bars unless shifted by the prepend count.
          const beforeRange = chart.timeScale().getVisibleLogicalRange();

          const merged = [...filtered, ...barsRef.current];
          barsRef.current = merged;
          currentSeries.setData(merged);
          setBarCount(merged.length);

          if (beforeRange) {
            const shift = filtered.length;
            chart.timeScale().setVisibleLogicalRange({
              from: beforeRange.from + shift,
              to: beforeRange.to + shift,
            });
          }
        })
        .catch(() => {
          // Silent/best-effort — a network hiccup just means older bars
          // aren't visible yet; the next left-pan retries the same request.
          backfillInFlightRef.current = false;
        });
    };

    const handleRangeChange = (range: { from: number; to: number } | null) => {
      if (!range) return;
      if (range.from > BACKFILL_TRIGGER_BARS) return; // not near the left edge yet
      if (backfillDebounceRef.current) clearTimeout(backfillDebounceRef.current);
      backfillDebounceRef.current = setTimeout(runBackfill, BACKFILL_DEBOUNCE_MS);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      if (backfillDebounceRef.current) {
        clearTimeout(backfillDebounceRef.current);
        backfillDebounceRef.current = null;
      }
    };
    // barCount > 0: subscribe once data first loads for this symbol/interval/
    // dataSource, not on every subsequent bar-count change (backfill prepends
    // and live-tick appends both bump barCount) — mirrors the sizing effect's
    // `!!footprint`-style boolean-gate idiom above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableBackfill, symbol, interval, dataSource, barCount > 0]);

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
  //   - Add series for newly-requested INSTANCES (keyed by
  //     `instanceId ?? type` — multi-series indicators get several series
  //     stored under the same map key, in fixed order).
  //   - Remove every series for instances no longer requested.
  //   - Recompute + setData on every effect run (cheap; runs on bars in memory).
  //   - Re-apply scaleMargins for ALL active scales each run, because pane
  //     allocation depends on how many subpanes are simultaneously active.
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = seriesRef.current;
    if (!chart || !candleSeries) return;

    const desired = new Map<string, Indicator>();
    for (const ind of indicators ?? []) {
      // Last-write-wins on key collision (shouldn't happen — keys are
      // unique per instance/type) — harmless, protects against accidents.
      desired.set(ind.instanceId ?? ind.type, ind);
    }

    const current = indicatorSeriesRef.current;
    const bars = barsRef.current;

    // ─── Remove series no longer requested ──────────────────
    for (const [key, seriesList] of Array.from(current.entries())) {
      if (!desired.has(key)) {
        for (const s of seriesList) {
          try {
            chart.removeSeries(s);
          } catch {
            // Series may already be gone if chart was torn down mid-flight.
          }
        }
        current.delete(key);
        indicatorScaleIdRef.current.delete(key);
      }
    }

    const hasOrderFlowData = !!(orderFlowData && orderFlowData.length > 0);

    // ─── Add / update series for each desired indicator ─────
    for (const [key, ind] of desired.entries()) {
      const type = ind.type;
      const color = ind.color ?? INDICATOR_COLORS[type];
      const paneScaleId = resolvePaneScaleId(type, key, ind.displayMode);

      // ── Create on first sight, or fetch existing ──────────
      let seriesList = current.get(key);
      // A previously-created series whose resolved scale id changed (only
      // reachable via CVD's displayMode toggling 'pane' <-> 'overlay' while
      // keeping the same instanceId) must be torn down and recreated on the
      // new scale — reusing the old series would leave it stuck on its
      // original pane/overlay scale forever.
      if (seriesList && indicatorScaleIdRef.current.get(key) !== paneScaleId) {
        for (const s of seriesList) {
          try {
            chart.removeSeries(s);
          } catch {
            // Series may already be gone if chart was torn down mid-flight.
          }
        }
        current.delete(key);
        seriesList = undefined;
      }
      if (!seriesList) {
        seriesList = createSeriesForType(chart, type, color, pickTheme(theme), paneScaleId);
        current.set(key, seriesList);
        indicatorScaleIdRef.current.set(key, paneScaleId);
      }
      // Re-applies color/thickness/line-style/visibility from `ind.lineStyles`
      // every run (idempotent right after creation too) — this is what makes
      // live edits from the Trading Arena's Style tab reach the chart without
      // recreating series. When `ind.lineStyles` is undefined (every non-
      // Arena caller), every slot falls back to the EXACT pre-existing
      // hardcoded look (see legacyFallbackColorForSlot/legacyFallbackWidthForSlot).
      applyIndicatorLineStyles(seriesList, type, ind.lineStyles, color);

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
          const { macd, signal, histogram } = computeMACD(
            bars,
            ind.macdParams?.fast,
            ind.macdParams?.slow,
            ind.macdParams?.signal,
          );
          (seriesList[0] as ISeriesApi<'Line'>).setData(macd);
          (seriesList[1] as ISeriesApi<'Line'>).setData(signal);
          // Histogram bars default to computeMACD's own per-bar green/red
          // momentum coloring (see indicators.ts). A user-picked flat color
          // from the Style tab (anything other than the
          // MACD_HISTOGRAM_AUTO_COLOR sentinel) overrides every bar to that
          // one color instead.
          const histogramOverride = ind.lineStyles?.histogram;
          const useCustomHistogramColor =
            histogramOverride?.color !== undefined && histogramOverride.color !== MACD_HISTOGRAM_AUTO_COLOR;
          const styledHistogram = useCustomHistogramColor
            ? histogram.map((point) => ({
                ...point,
                color: applyOpacityToHexColor(histogramOverride!.color!, histogramOverride?.opacity ?? 1),
              }))
            : histogram;
          (seriesList[2] as ISeriesApi<'Histogram'>).setData(styledHistogram);
          break;
        }
        case 'BBANDS': {
          const { middle, upper, lower } = computeBollinger(
            bars,
            ind.period,
            ind.bbandsStdDev,
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
        case 'CVD':
          // Precomputed by the caller — see `orderFlowData` prop doc.
          // Empty when the caller hasn't wired order-flow data yet (e.g.
          // stock symbols) — series renders as a no-op line.
          (seriesList[0] as ISeriesApi<'Line'>).setData(
            (orderFlowData ?? []).map((p) => ({ time: p.time, value: p.cvd })),
          );
          break;
        case 'DELTA': {
          // Per-bar sign coloring (green up / red down), same pattern as
          // MACD's histogram — no user override slot for this v1 pass (see
          // indicatorsSettings.ts's defaultStylesForType('delta') doc).
          const t = pickTheme(theme);
          (seriesList[0] as ISeriesApi<'Histogram'>).setData(
            (orderFlowData ?? []).map((p) => ({
              time: p.time,
              value: p.delta,
              color: p.delta >= 0 ? t.candleUp : t.candleDown,
            })),
          );
          break;
        }
      }
    }

    // ─── Paned instances (RSI/MACD/ATR/DELTA, + CVD in 'pane' mode), in
    // `indicators` array order. DELTA and CVD are excluded when there's no
    // `orderFlowData` yet so no blank pane is reserved (e.g. stock symbols
    // that haven't wired order-flow data) — same reasoning as the data-apply
    // switch's empty-array fallback above, but here it also affects the
    // candle pane's compression via computeDynamicPaneMargins.
    const paneKeys: string[] = [];
    for (const [key, ind] of desired.entries()) {
      if (ind.type === 'RSI' || ind.type === 'MACD' || ind.type === 'ATR') {
        paneKeys.push(key);
      } else if (ind.type === 'DELTA' && hasOrderFlowData) {
        paneKeys.push(key);
      } else if (ind.type === 'CVD' && ind.displayMode !== 'overlay' && hasOrderFlowData) {
        paneKeys.push(key);
      }
    }

    // ─── Subpane scale styling (one-time per scale) ─────────
    for (const key of paneKeys) {
      const scaleId = resolvePaneScaleId(desired.get(key)!.type, key, desired.get(key)!.displayMode);
      if (scalesConfiguredRef.current.has(scaleId)) continue;
      chart.priceScale(scaleId).applyOptions({
        borderColor: pickTheme(theme).border,
      });
      scalesConfiguredRef.current.add(scaleId);
    }

    // ─── Pane allocation — scaleMargins for active scales ───
    const { candle, panes } = computeDynamicPaneMargins(paneKeys);
    candleSeries.priceScale().applyOptions({ scaleMargins: candle });
    for (const key of paneKeys) {
      const scaleId = resolvePaneScaleId(desired.get(key)!.type, key, desired.get(key)!.displayMode);
      const margins = panes.get(key);
      if (margins) chart.priceScale(scaleId).applyOptions({ scaleMargins: margins });
    }

    // ─── CVD 'overlay' mode — shared hidden scale on the candle area ───
    // Not part of `paneKeys` (it doesn't reserve subpane space), so it needs
    // its own scaleMargins application here: match the candle's own margins
    // so it autoscales independently over the same vertical span without
    // distorting the visible price axis (kept hidden via `visible: false`).
    const cvdOverlayActive = Array.from(desired.values()).some(
      (ind) => ind.type === 'CVD' && ind.displayMode === 'overlay',
    );
    if (cvdOverlayActive) {
      chart.priceScale('cvd-overlay').applyOptions({
        visible: false,
        borderVisible: false,
        scaleMargins: candle,
      });
    }
  }, [indicators, barCount, theme, orderFlowData]); // barCount → recompute after fresh data load; theme → re-style scales on switch; orderFlowData → feed CVD/DELTA

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

  // ─── Apply paper-trading order/position lines ───────────────────
  // Diffed by id: removed ids are dropped, new ids created, and EXISTING ids
  // whose price/color/lineStyle/title changed are updated in place via
  // applyOptions (not recreated) — a live position's title carries the
  // ticking unrealized PnL, so this must not flicker/recreate every render.
  // No-op when `orderLines` is absent/empty — zero impact on every other caller.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    const nextLines = orderLines ?? [];
    const nextMap = new Map<string, ChartOrderLine>(nextLines.map((l) => [l.id, l]));
    const activeMap = orderLinesRef.current;

    // Remove lines no longer desired.
    for (const [id, entry] of Array.from(activeMap.entries())) {
      if (!nextMap.has(id)) {
        try { series.removePriceLine(entry.line); } catch { /* series already gone */ }
        activeMap.delete(id);
      }
    }

    // Add or update lines.
    for (const [id, spec] of nextMap.entries()) {
      const lwLineStyle = spec.lineStyle === 'dashed' ? LineStyle.Dashed : LineStyle.Solid;
      const existing = activeMap.get(id);
      if (!existing) {
        const line = series.createPriceLine({
          price: spec.price,
          color: spec.color,
          lineWidth: 1,
          lineStyle: lwLineStyle,
          axisLabelVisible: true,
          title: spec.title,
        });
        activeMap.set(id, { line, value: spec });
        continue;
      }
      const prev = existing.value;
      if (
        prev.price !== spec.price
        || prev.color !== spec.color
        || prev.lineStyle !== spec.lineStyle
        || prev.title !== spec.title
      ) {
        try {
          existing.line.applyOptions({
            price: spec.price,
            color: spec.color,
            lineStyle: lwLineStyle,
            title: spec.title,
          });
        } catch {
          // series already gone — ignore, next diff pass will reconcile.
        }
        activeMap.set(id, { line: existing.line, value: spec });
      }
    }
  }, [orderLines]);

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
        // Carries the chart background (canvas itself is transparent so z5
        // behind-candle layers show through) — including the user's Chart
        // Settings backgroundColor when set.
        background: effectiveChartStyle?.backgroundColor ?? themeTokens.background,
      }}
      onContextMenu={
        onChartContextMenu
          ? (e) => {
              e.preventDefault();
              let price: number | null = null;
              try {
                const series = seriesRef.current;
                const rect = containerRef.current?.getBoundingClientRect();
                if (series && rect) {
                  const p = series.coordinateToPrice(e.clientY - rect.top);
                  price = typeof p === 'number' && Number.isFinite(p) ? p : null;
                }
              } catch {
                // Chart mid-teardown — menu still opens, just without a price.
              }
              onChartContextMenu({ price, clientX: e.clientX, clientY: e.clientY });
            }
          : undefined
      }
    >
      {/* Brand bar — 1px gold accent at the top edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px"
        style={{ background: themeTokens.brandGold, opacity: 0.5 }}
      />

      {/* Chart canvas mount — z-index 6 so it paints ABOVE the z-index-5
          behind-layers (DepthMatrixLayer, SessionVolumeProfileLayer) but
          BELOW every above-candle overlay (WallHeatLayer z10, FootprintLayer
          z15, VolumeBubblesLayer z12, VolumeProfileLayer z14). The chart's
          own background is transparent (see buildChartOptions above) so the
          z5 layers are genuinely visible behind the candles. */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ zIndex: 6, ...(hideCursor ? { cursor: 'none' } : null) }}
      />

      {/* Session Volume Profile overlay (Chart tab only) — rendered BEHIND
          candles (z-index 5 vs the chart canvas mount's z-index 6, and the
          chart's background is transparent — see buildChartOptions — so this
          layer is genuinely visible through the candle pane). Fed directly by
          this component's own barsRef.current — see the `sessionVolumeProfile`
          prop's doc comment. Undefined = zero mount, zero cost. */}
      {sessionVolumeProfile &&
       chartRef.current && seriesRef.current &&
       barCount > 0 && (
        <SessionVolumeProfileLayer
          chart={chartRef.current}
          series={seriesRef.current}
          bars={barsRef.current}
          settings={sessionVolumeProfile.settings}
          visible={sessionVolumeProfile.visible}
          width={containerSize.w || (containerRef.current?.clientWidth ?? 0)}
          height={containerSize.h || (containerRef.current?.clientHeight ?? 0)}
        />
      )}

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
          Rendered BEHIND candles (z-index 5 vs the chart canvas mount's
          z-index 6; the chart's layout.background is transparent — see
          buildChartOptions above — so this canvas genuinely shows through
          behind the candles instead of being painted over by them).
          Mounted once chart + series are ready so coordinate APIs are available.
          🔴 depthMatrixFloorUsd is intentionally NOT forwarded — DepthMatrixLayer
          no longer accepts a floor prop (Phase 1 "no manual thresholds" overhaul:
          dust-only removal happens upstream at the sampling layer for
          MarketScanner too — its own floorUsd still reaches useDepthSlices
          directly). depthMatrixSizeFilterPct IS forwarded (legacy
          MarketScanner-compat, default undefined — see its doc comment above and
          DepthMatrixLayer.tsx's sizeFilterPct prop). */}
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
          candleIntervalMs={depthMatrixCandleIntervalMs}
          sizeFilterPct={depthMatrixSizeFilterPct}
          palette={depthMatrixPalette}
          smoothing={depthMatrixSmoothing}
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

      {/* Volume bubbles overlay (ATAS/Bookmap-style executed-aggression
          markers) — only when the `volumeBubbles` prop is provided.
          Undefined `volumeBubbles` = zero mount, zero cost. */}
      {volumeBubbles &&
       chartRef.current && seriesRef.current &&
       barCount > 0 && (
        <VolumeBubblesLayer
          chart={chartRef.current}
          series={seriesRef.current}
          store={volumeBubbles.store}
          visible={volumeBubbles.visible}
          width={containerSize.w || (containerRef.current?.clientWidth ?? 0)}
          height={containerSize.h || (containerRef.current?.clientHeight ?? 0)}
          thresholdSetting={volumeBubbles.thresholdSetting}
        />
      )}

      {/* Right-edge "what's waiting" resting-book gutter — only when the
          `depthProfile` prop is provided. Undefined = zero mount, zero cost. */}
      {depthProfile &&
       chartRef.current && seriesRef.current &&
       barCount > 0 && (
        <DepthProfileGutter
          chart={chartRef.current}
          series={seriesRef.current}
          bids={depthProfile.bids}
          asks={depthProfile.asks}
          binSize={depthProfile.binSize}
          visible={depthProfile.visible}
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
          sessionStartSec={volumeProfile.sessionStartSec}
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

      {/* Custom free-moving vertical crosshair line (freeVerticalCrosshair prop
          — Liquidity tab only). pointer-events:none so chart pan/zoom/click
          and the wall-hover tooltip's own crosshairMove subscription above
          keep working unaffected. Not rendered at all when the user's
          crosshair style is 'hidden' — matches the native crosshair's own
          Hidden-mode behavior instead of showing a line the settings say
          shouldn't exist. */}
      {freeVerticalCrosshair && crosshairLineStyle !== 'hidden' && (
        <div
          ref={freeCrosshairLineRef}
          className="pointer-events-none absolute left-0 top-0 z-20"
          style={{
            width: 0,
            bottom: 0,
            opacity: 0,
            borderLeftWidth: 1,
            borderLeftStyle: crosshairLineStyle === 'solid' ? 'solid' : 'dashed',
            borderLeftColor: themeTokens.crosshair,
            willChange: 'transform, opacity',
          }}
        />
      )}

      {/* Watermark — subtle Finotaur signature, bottom-right above the timescale */}
      <div
        className="pointer-events-none absolute bottom-7 right-16 z-10 select-none text-[10px] font-bold uppercase tracking-[0.3em]"
        style={{ color: themeTokens.brandGold, opacity: 0.18 }}
        aria-hidden="true"
      >
        FINOTAUR
      </div>

      {showRefocusButton && !loading && !error && barCount > 0 && (
        <button
          type="button"
          onClick={refocusChart}
          className="absolute top-2 z-30 flex h-6 w-6 items-center justify-center border text-[13px] font-bold leading-none transition-colors"
          style={{
            right: 74,
            borderColor: theme === 'light' ? '#a8a8a8' : 'rgba(255,255,255,0.22)',
            background: theme === 'light' ? '#6b6b6b' : 'rgba(63,63,70,0.92)',
            color: '#ffffff',
            boxShadow: theme === 'light' ? 'none' : '0 2px 8px rgba(0,0,0,0.35)',
          }}
          title="Refocus chart"
          aria-label="Refocus chart"
        >
          F
        </button>
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
