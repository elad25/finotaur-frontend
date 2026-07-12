// src/pages/app/trading-arena/components/chartStyleSettings.ts
//
// TradingView-style "Chart Settings" model for the Trading Arena — a single
// global (not per-symbol) style object persisted to localStorage via
// useChartStylePreferences.ts and applied LIVE to every FinotaurChart mount
// across all 3 Arena tabs (Chart / Order Flow / Liquidity) through
// ChartStyleContext (see below) — no per-tab prop threading required.
//
// DEFAULT_CHART_STYLE is locked to reproduce FinotaurChart's CURRENT
// hardcoded look (FINOTAUR_DARK_THEME + buildChartOptions/addCandlestickSeries
// in FinotaurChart.tsx) byte-for-byte, so an untouched user sees zero visual
// change. Where the product spec's suggested default differs slightly from
// the actual shipped value (documented inline below), the ACTUAL shipped
// value wins — "matching today's exact look" takes priority over the spec's
// approximate hex.

import { createContext } from 'react';

// ═══════════════════════════════════════════════════════════════
// Candle color presets — swatch row, no free color picker (per spec)
// ═══════════════════════════════════════════════════════════════
export type CandleColorPresetId =
  | 'classic'
  | 'finotaur'
  | 'tealCrimson'
  | 'mono'
  | 'blueOrange'
  | 'purpleYellow';

export interface CandleColorPreset {
  id: CandleColorPresetId;
  label: string;
  up: string;
  down: string;
}

export const CANDLE_COLOR_PRESETS: readonly CandleColorPreset[] = [
  // Default — reproduces FINOTAUR_DARK_THEME.candleUp/candleDown exactly
  // (FinotaurChart.tsx lines ~97-98).
  { id: 'classic', label: 'Classic', up: '#22c55e', down: '#dc2626' },
  { id: 'finotaur', label: 'FINOTAUR', up: '#C9A646', down: '#52525b' },
  { id: 'tealCrimson', label: 'Teal / Crimson', up: '#14b8a6', down: '#dc143c' },
  { id: 'mono', label: 'Mono', up: '#e4e4e7', down: '#71717a' },
  { id: 'blueOrange', label: 'Blue / Orange', up: '#3b82f6', down: '#f97316' },
  { id: 'purpleYellow', label: 'Purple / Yellow', up: '#a855f7', down: '#eab308' },
] as const;

// ═══════════════════════════════════════════════════════════════
// Background presets
// ═══════════════════════════════════════════════════════════════
export type BackgroundPresetId = 'pitchBlack' | 'graphite' | 'slate';

export interface BackgroundPreset {
  id: BackgroundPresetId;
  label: string;
  color: string;
}

export const BACKGROUND_PRESETS: readonly BackgroundPreset[] = [
  // Default — reproduces FINOTAUR_DARK_THEME.background exactly (#08080a).
  // Spec suggested '#0a0a0b' as "Pitch black" — kept the label, locked the
  // hex to the value FinotaurChart actually renders today so the default
  // preset is a true no-op.
  { id: 'pitchBlack', label: 'Pitch Black', color: '#08080a' },
  { id: 'graphite', label: 'Graphite', color: '#111214' },
  { id: 'slate', label: 'Slate', color: '#16181d' },
] as const;

// ═══════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════
export type CrosshairStyle = 'solid' | 'dashed' | 'hidden';
export type PriceAxisFontSize = 11 | 12 | 13;
export type PricePrecision = 'default' | 1 | 2;

/**
 * 'local' = browser default (current/original behavior — no localization
 * override at all). 'utc' = exchange default. Named zones use Intl's IANA
 * database (DST-correct per-timestamp — see chartStyleMapping.ts).
 */
export type ChartTimezone =
  | 'local'
  | 'utc'
  | 'America/New_York'
  | 'Europe/London'
  | 'Asia/Jerusalem'
  | 'Asia/Tokyo';

export const TIMEZONE_OPTIONS: ReadonlyArray<{ value: ChartTimezone; label: string }> = [
  { value: 'utc', label: 'Exchange (UTC)' },
  { value: 'local', label: 'Local' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Asia/Jerusalem', label: 'Tel Aviv' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
] as const;

// ═══════════════════════════════════════════════════════════════
// Settings shape
// ═══════════════════════════════════════════════════════════════
export interface ChartStyleSettings {
  // CANDLES
  candleUpColor: string;
  candleDownColor: string;
  candleBordersVisible: boolean;
  candleWicksVisible: boolean;

  // CANVAS
  backgroundColor: string;
  gridVerticalVisible: boolean;
  gridHorizontalVisible: boolean;
  crosshairStyle: CrosshairStyle;
  watermarkVisible: boolean;

  // SCALES & LINES
  lastPriceLineVisible: boolean;
  priceAxisFontSize: PriceAxisFontSize;

  // TIME
  timezone: ChartTimezone;
  pricePrecision: PricePrecision;
}

// ═══════════════════════════════════════════════════════════════
// Defaults — locked to FinotaurChart's current hardcoded behavior
// ═══════════════════════════════════════════════════════════════
// Verified against FinotaurChart.tsx:
//   - grid.vertLines.visible=true, grid.horzLines.visible=true (buildChartOptions)
//   - crosshair vertLine/horzLine style=3 (LargeDashed), mode=Normal
//   - watermark.visible=true (native lw-charts watermark, not a DOM overlay)
//   - candlestick series: no explicit borderVisible/wickVisible → lw-charts
//     defaults (both true); no explicit priceLineVisible → default true
//   - layout.fontSize = FINOTAUR_DARK_THEME.fontSizeAxis = 11
//   - no localization/timeScale formatter override → browser-local time
//   - no priceFormat override → per-symbol default precision
export const DEFAULT_CHART_STYLE: ChartStyleSettings = {
  candleUpColor: CANDLE_COLOR_PRESETS[0].up,
  candleDownColor: CANDLE_COLOR_PRESETS[0].down,
  candleBordersVisible: true,
  candleWicksVisible: true,

  backgroundColor: BACKGROUND_PRESETS[0].color,
  gridVerticalVisible: true,
  gridHorizontalVisible: true,
  crosshairStyle: 'dashed',
  watermarkVisible: true,

  lastPriceLineVisible: true,
  priceAxisFontSize: 11,

  timezone: 'local',
  pricePrecision: 'default',
};

// ═══════════════════════════════════════════════════════════════
// Sanitize — never trust localStorage JSON shape, degrade per-field
// ═══════════════════════════════════════════════════════════════
function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function asHexColor(v: unknown, fallback: string): string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : fallback;
}

function asOneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

const CROSSHAIR_STYLE_VALUES: CrosshairStyle[] = ['solid', 'dashed', 'hidden'];
const FONT_SIZE_VALUES: PriceAxisFontSize[] = [11, 12, 13];
const TIMEZONE_VALUES: ChartTimezone[] = TIMEZONE_OPTIONS.map((o) => o.value);

function asFontSize(v: unknown, fallback: PriceAxisFontSize): PriceAxisFontSize {
  return typeof v === 'number' && (FONT_SIZE_VALUES as number[]).includes(v)
    ? (v as PriceAxisFontSize)
    : fallback;
}

function asPricePrecision(v: unknown, fallback: PricePrecision): PricePrecision {
  if (v === 'default' || v === 1 || v === 2) return v;
  return fallback;
}

/**
 * Validates an arbitrary parsed-JSON value field-by-field against
 * `fallback` (never trusts the shape of `raw` — corrupt/partial/foreign JSON
 * degrades gracefully to `fallback` per field, never throws). Same pattern
 * as sanitizeFootprintSettings (footprintSettings.ts).
 */
export function sanitizeChartStyleSettings(raw: unknown, fallback: ChartStyleSettings = DEFAULT_CHART_STYLE): ChartStyleSettings {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<ChartStyleSettings>;

  return {
    candleUpColor: asHexColor(p.candleUpColor, fallback.candleUpColor),
    candleDownColor: asHexColor(p.candleDownColor, fallback.candleDownColor),
    candleBordersVisible: asBool(p.candleBordersVisible, fallback.candleBordersVisible),
    candleWicksVisible: asBool(p.candleWicksVisible, fallback.candleWicksVisible),

    backgroundColor: asHexColor(p.backgroundColor, fallback.backgroundColor),
    gridVerticalVisible: asBool(p.gridVerticalVisible, fallback.gridVerticalVisible),
    gridHorizontalVisible: asBool(p.gridHorizontalVisible, fallback.gridHorizontalVisible),
    crosshairStyle: asOneOf(p.crosshairStyle, CROSSHAIR_STYLE_VALUES, fallback.crosshairStyle),
    watermarkVisible: asBool(p.watermarkVisible, fallback.watermarkVisible),

    lastPriceLineVisible: asBool(p.lastPriceLineVisible, fallback.lastPriceLineVisible),
    priceAxisFontSize: asFontSize(p.priceAxisFontSize, fallback.priceAxisFontSize),

    timezone: asOneOf(p.timezone, TIMEZONE_VALUES, fallback.timezone),
    pricePrecision: asPricePrecision(p.pricePrecision, fallback.pricePrecision),
  };
}

// ═══════════════════════════════════════════════════════════════
// React context — how ChartStyleSettings reaches FinotaurChart WITHOUT
// per-tab prop threading.
// ═══════════════════════════════════════════════════════════════
// TradingArena.tsx wraps its <main> content in
// `<ChartStyleContext.Provider value={chartStyle}>`. FinotaurChart.tsx reads
// this context as a FALLBACK only when its own `chartStyle` prop is
// undefined (`const effective = chartStyle ?? useContext(ChartStyleContext)`).
// Default value is `undefined` — every caller outside the Arena's provider
// tree (Backtest, Journal, Scanner, Replay, FuturesChartTab, etc.) reads
// `undefined` from this context and the effect in FinotaurChart no-ops,
// exactly like passing no `chartStyle` prop at all. This is what lets
// ArenaToolbar's new Chart Settings menu reach all 3 Arena tabs' FinotaurChart
// call sites (ChartTab / FootprintTab / LiquidityTab) with ZERO edits to
// those 3 files — see the coder handoff notes for the "why" of this choice
// over prop threading.
export const ChartStyleContext = createContext<ChartStyleSettings | undefined>(undefined);
