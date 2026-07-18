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
import type { ChartTheme } from '@/components/charting/types';

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
// Session Volume Profile (Chart tab — ATAS-style, S1 "Arena WOW week")
// ═══════════════════════════════════════════════════════════════
export type SessionVolumeProfilePeriod = 'day' | 'week' | 'month' | 'custom';
export type SessionVolumeProfileAnchorSide = 'left' | 'right';

export interface SessionVolumeProfileSettings {
  enabled: boolean;
  period: SessionVolumeProfilePeriod;
  /** 'HH:MM', only relevant when period === 'custom'. */
  customSessionStart: string;
  /** 'HH:MM', only relevant when period === 'custom'. */
  customSessionEnd: string;
  showVpoc: boolean;
  showVahVal: boolean;
  anchorSide: SessionVolumeProfileAnchorSide;
  /** Max % of a session's horizontal span the histogram may occupy. Range [5, 60]. */
  profileWidthPct: number;
  /** Alpha multiplier applied to the whole overlay. Range [0, 1]. */
  opacity: number;
}

export const DEFAULT_SESSION_VOLUME_PROFILE_SETTINGS: SessionVolumeProfileSettings = {
  enabled: true,
  period: 'day',
  customSessionStart: '09:30',
  customSessionEnd: '16:00',
  showVpoc: true,
  showVahVal: true,
  anchorSide: 'left',
  profileWidthPct: 18,
  opacity: 1,
};

// ═══════════════════════════════════════════════════════════════
// Settings shape
// ═══════════════════════════════════════════════════════════════
export interface ChartStyleSettings {
  // CANDLES
  candleUpColor: string;
  candleDownColor: string;
  candleBordersVisible: boolean;
  candleWicksVisible: boolean;
  /**
   * Optional per-element color overrides (TradingView-style full color
   * freedom) — `undefined` mirrors the body color exactly, reproducing
   * today's behavior (see chartStyleMapping.ts's `?? settings.candleUpColor`
   * fallback). Hex6 or hex8 (with alpha byte) — hex8 comes from
   * ColorSwatchPicker's opacity slider.
   */
  candleBorderUpColor?: string;
  candleBorderDownColor?: string;
  candleWickUpColor?: string;
  candleWickDownColor?: string;

  // CANVAS
  /**
   * Chart theme — 'dark' (FINOTAUR default) or 'light' (TradingView-style
   * white canvas with near-black axis text). Drives FinotaurChart's base
   * theme (pickTheme) via ChartStyleContext; switching remounts the chart.
   */
  theme: ChartTheme;
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

  // SESSION VOLUME PROFILE (Chart tab only — see ChartTab.tsx's wiring)
  volumeProfile: SessionVolumeProfileSettings;

  /**
   * @deprecated Dead field kept ONLY so old persisted localStorage blobs
   * still parse without throwing (see sanitizeChartStyleSettings). The
   * "Auto transform candles to footprint" bridge this used to drive on the
   * plain Chart tab was removed 2026-07-18 — ALL order flow / footprint
   * rendering now lives exclusively on the Order Flow tab (FootprintTab.tsx),
   * per the PR #1435-era product decision. This field has no effect on any
   * rendering and no UI control writes to it anymore.
   */
  footprintOnZoom: boolean;
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

  theme: 'dark',
  backgroundColor: BACKGROUND_PRESETS[0].color,
  gridVerticalVisible: true,
  gridHorizontalVisible: true,
  crosshairStyle: 'dashed',
  watermarkVisible: true,

  lastPriceLineVisible: true,
  priceAxisFontSize: 11,

  timezone: 'local',
  pricePrecision: 'default',

  volumeProfile: DEFAULT_SESSION_VOLUME_PROFILE_SETTINGS,
  // Dead field — see the ChartStyleSettings.footprintOnZoom @deprecated doc
  // comment above. Defaulted off since it no longer drives any rendering.
  footprintOnZoom: false,
};

// ═══════════════════════════════════════════════════════════════
// Theme switch — one-click Dark/Light with TradingView-default colors
// ═══════════════════════════════════════════════════════════════
/**
 * The settings patch applied when the user flips the Canvas-tab Theme
 * control. Per Elad (2026-07-18): Light mode ships TradingView's defaults —
 * white canvas, near-black scales (FinotaurChart's FINOTAUR_LIGHT_THEME),
 * TV teal/red candles. Dark restores the FINOTAUR defaults. Per-element
 * border/wick overrides are cleared on switch so candles snap to the new
 * palette; the user can re-customize afterwards.
 */
export function buildThemeSwitchPatch(theme: ChartTheme): Partial<ChartStyleSettings> {
  if (theme === 'light') {
    return {
      theme,
      backgroundColor: '#ffffff',
      candleUpColor: '#26a69a',
      candleDownColor: '#ef5350',
      candleBorderUpColor: undefined,
      candleBorderDownColor: undefined,
      candleWickUpColor: undefined,
      candleWickDownColor: undefined,
    };
  }
  return {
    theme,
    backgroundColor: BACKGROUND_PRESETS[0].color,
    candleUpColor: CANDLE_COLOR_PRESETS[0].up,
    candleDownColor: CANDLE_COLOR_PRESETS[0].down,
    candleBorderUpColor: undefined,
    candleBorderDownColor: undefined,
    candleWickUpColor: undefined,
    candleWickDownColor: undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// Sanitize — never trust localStorage JSON shape, degrade per-field
// ═══════════════════════════════════════════════════════════════
function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function asHexColor(v: unknown, fallback: string): string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : fallback;
}

/** Optional-field variant — invalid/missing degrades to `undefined` (mirror body color), never to a fallback string. */
function asOptionalHexColor(v: unknown, fallback: string | undefined): string | undefined {
  return typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : fallback;
}

function asOneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

const CHART_THEME_VALUES: ChartTheme[] = ['dark', 'light'];
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

function asClampedNumber(v: unknown, fallback: number, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function asHHMM(v: unknown, fallback: string): string {
  return typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v.trim()) ? v : fallback;
}

const SESSION_VOLUME_PROFILE_PERIOD_VALUES: SessionVolumeProfilePeriod[] = ['day', 'week', 'month', 'custom'];
const SESSION_VOLUME_PROFILE_ANCHOR_SIDE_VALUES: SessionVolumeProfileAnchorSide[] = ['left', 'right'];

/**
 * Validates an arbitrary parsed-JSON value for the nested `volumeProfile`
 * object, field-by-field against `fallback` — same never-trust-the-shape
 * contract as sanitizeChartStyleSettings itself.
 */
export function sanitizeSessionVolumeProfileSettings(
  raw: unknown,
  fallback: SessionVolumeProfileSettings = DEFAULT_SESSION_VOLUME_PROFILE_SETTINGS,
): SessionVolumeProfileSettings {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<SessionVolumeProfileSettings>;
  const profileWidthValue =
    p.anchorSide === undefined && p.profileWidthPct === 30
      ? undefined
      : p.profileWidthPct;

  return {
    enabled: asBool(p.enabled, fallback.enabled),
    period: asOneOf(p.period, SESSION_VOLUME_PROFILE_PERIOD_VALUES, fallback.period),
    customSessionStart: asHHMM(p.customSessionStart, fallback.customSessionStart),
    customSessionEnd: asHHMM(p.customSessionEnd, fallback.customSessionEnd),
    showVpoc: asBool(p.showVpoc, fallback.showVpoc),
    showVahVal: asBool(p.showVahVal, fallback.showVahVal),
    anchorSide: asOneOf(p.anchorSide, SESSION_VOLUME_PROFILE_ANCHOR_SIDE_VALUES, fallback.anchorSide),
    profileWidthPct: asClampedNumber(profileWidthValue, fallback.profileWidthPct, 5, 60),
    opacity: asClampedNumber(p.opacity, fallback.opacity, 0, 1),
  };
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
    candleBorderUpColor: asOptionalHexColor(p.candleBorderUpColor, fallback.candleBorderUpColor),
    candleBorderDownColor: asOptionalHexColor(p.candleBorderDownColor, fallback.candleBorderDownColor),
    candleWickUpColor: asOptionalHexColor(p.candleWickUpColor, fallback.candleWickUpColor),
    candleWickDownColor: asOptionalHexColor(p.candleWickDownColor, fallback.candleWickDownColor),

    theme: asOneOf(p.theme, CHART_THEME_VALUES, fallback.theme),
    backgroundColor: asHexColor(p.backgroundColor, fallback.backgroundColor),
    gridVerticalVisible: asBool(p.gridVerticalVisible, fallback.gridVerticalVisible),
    gridHorizontalVisible: asBool(p.gridHorizontalVisible, fallback.gridHorizontalVisible),
    crosshairStyle: asOneOf(p.crosshairStyle, CROSSHAIR_STYLE_VALUES, fallback.crosshairStyle),
    watermarkVisible: asBool(p.watermarkVisible, fallback.watermarkVisible),

    lastPriceLineVisible: asBool(p.lastPriceLineVisible, fallback.lastPriceLineVisible),
    priceAxisFontSize: asFontSize(p.priceAxisFontSize, fallback.priceAxisFontSize),

    timezone: asOneOf(p.timezone, TIMEZONE_VALUES, fallback.timezone),
    pricePrecision: asPricePrecision(p.pricePrecision, fallback.pricePrecision),

    volumeProfile: sanitizeSessionVolumeProfileSettings(p.volumeProfile, fallback.volumeProfile),
    footprintOnZoom: asBool(p.footprintOnZoom, fallback.footprintOnZoom),
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
