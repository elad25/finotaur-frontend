// src/pages/app/trading-arena/components/indicatorsSettings.ts
//
// Model for the Trading Arena's Indicators POPUP (replaces the old 7-row
// on/off dropdown in ArenaToolbar.tsx). Two concerns live here, separate from
// the shared `IndicatorSettings` (src/components/charting/types.ts, still
// used as-is by Journal/Backtest/ReplayChart):
//
//  1. `ArenaIndicatorEnabled` — the shared on/off booleans PLUS one Arena-only
//     addition, `volumeProfile` (Session Volume Profile is now modeled as an
//     8th "indicator" toggle, counted in the max-5-active limit, instead of
//     living exclusively under Chart ▾ → Chart Settings). Deliberately NOT
//     added as a field on the shared `IndicatorSettings` interface itself —
//     that type is also used by useIndicatorPreferences.ts (Journal/Backtest),
//     which has no Volume Profile concept and would need an unrelated edit
//     to stay in sync. `ArenaIndicatorEnabled` is a structural superset
//     (extends `IndicatorSettings`), so it satisfies that interface anywhere
//     it's needed.
//
//  2. `ArenaIndicatorParams` — user-editable numeric params per indicator
//     (previously hardcoded via `INDICATOR_PERIODS`). `INDICATOR_PERIODS` is
//     kept as-is in types.ts and reused here only as the SOURCE for defaults
//     that don't change (SMA/RSI/MACD/BBANDS/ATR) — EMA's default is
//     deliberately bumped from 50 to 9 (a research-based day-trading default
//     — see ARENA_INDICATOR_PARAM_DEFAULTS below), which is the one place
//     this model intentionally diverges from INDICATOR_PERIODS.

import {
  INDICATOR_DEFAULTS,
  INDICATOR_PERIODS,
  type Indicator,
  type IndicatorLineStyle,
  type IndicatorSettings,
} from '@/components/charting/types';
import { isIntradayInterval } from '@/components/charting/indicators';

// ═══════════════════════════════════════════════════════════════
// Enabled (on/off) — shared IndicatorSettings + volumeProfile
// ═══════════════════════════════════════════════════════════════
export interface ArenaIndicatorEnabled extends IndicatorSettings {
  volumeProfile: boolean;
}

export type ArenaIndicatorKey = keyof ArenaIndicatorEnabled;

export interface ArenaIndicatorDefinition {
  key: ArenaIndicatorKey;
  label: string;
  shortLabel: string;
  description: string;
  section: 'overlays' | 'panes';
}

export const ARENA_INDICATOR_DEFINITIONS: ArenaIndicatorDefinition[] = [
  {
    key: 'vwap',
    label: 'VWAP (Session)',
    shortLabel: 'VWAP',
    description: 'Cumulative volume-weighted average price, resets every session.',
    section: 'overlays',
  },
  {
    key: 'ema',
    label: 'EMA',
    shortLabel: 'EMA',
    description: 'Exponential moving average - weights recent bars more heavily than older ones.',
    section: 'overlays',
  },
  {
    key: 'sma',
    label: 'SMA',
    shortLabel: 'SMA',
    description: 'Simple moving average - arithmetic mean of closing price over the window.',
    section: 'overlays',
  },
  {
    key: 'bbands',
    label: 'Bollinger Bands',
    shortLabel: 'BB',
    description: 'Volatility bands - a moving average plus/minus a standard-deviation multiplier.',
    section: 'overlays',
  },
  {
    key: 'volumeProfile',
    label: 'Volume Profile (Session)',
    shortLabel: 'VP',
    description: 'Horizontal histogram of traded volume by price, for the current session.',
    section: 'overlays',
  },
  {
    key: 'rsi',
    label: 'RSI',
    shortLabel: 'RSI',
    description: 'Momentum oscillator (0-100); reference lines at 70/30 mark overbought/oversold.',
    section: 'panes',
  },
  {
    key: 'macd',
    label: 'MACD',
    shortLabel: 'MACD',
    description: 'Trend-following momentum via two EMAs and a signal line, with a histogram.',
    section: 'panes',
  },
  {
    key: 'atr',
    label: 'ATR',
    shortLabel: 'ATR',
    description: 'Average True Range - volatility measured in price, not percent.',
    section: 'panes',
  },
];

export function getArenaIndicatorDefinition(key: ArenaIndicatorKey): ArenaIndicatorDefinition {
  return ARENA_INDICATOR_DEFINITIONS.find((definition) => definition.key === key)!;
}

/** Session Volume Profile defaults ON (matches the prior chartStyle.volumeProfile.enabled default). */
export const ARENA_INDICATOR_ENABLED_DEFAULTS: ArenaIndicatorEnabled = {
  ...INDICATOR_DEFAULTS,
  volumeProfile: true,
};

// ═══════════════════════════════════════════════════════════════
// Editable params — one shape per parameterized indicator
// ═══════════════════════════════════════════════════════════════
export interface PeriodParam {
  period: number;
}

export interface MacdParams {
  fast: number;
  slow: number;
  signal: number;
}

export interface BbandsParams {
  period: number;
  stdDev: number;
}

export interface ArenaIndicatorParams {
  ema: PeriodParam;
  sma: PeriodParam;
  rsi: PeriodParam;
  macd: MacdParams;
  bbands: BbandsParams;
  atr: PeriodParam;
}

// Numeric ranges — shared by the dialog's NumberField clamps and the
// sanitizer below, same never-drift-apart pattern as footprintSettings.ts's
// FOOTPRINT_*_RANGE constants.
export const EMA_PERIOD_RANGE = { min: 2, max: 500 } as const;
export const SMA_PERIOD_RANGE = { min: 2, max: 500 } as const;
export const RSI_PERIOD_RANGE = { min: 2, max: 100 } as const;
export const MACD_FAST_RANGE = { min: 2, max: 100 } as const;
export const MACD_SLOW_RANGE = { min: 3, max: 200 } as const;
export const MACD_SIGNAL_RANGE = { min: 2, max: 50 } as const;
export const BBANDS_PERIOD_RANGE = { min: 2, max: 200 } as const;
export const BBANDS_STDDEV_RANGE = { min: 0.5, max: 4 } as const;
export const ATR_PERIOD_RANGE = { min: 2, max: 100 } as const;

/**
 * Fixed periods for Phase 2 + Phase 2.5, EXCEPT `ema.period` — bumped from
 * INDICATOR_PERIODS.ema (50, a swing-trading default) to 9, a research-based
 * day-trading default. This is a deliberate divergence from
 * `INDICATOR_PERIODS` and applies to EVERY user, including v1→v2 migrated
 * ones (see useArenaIndicatorPreferences.ts's migrateV1ToV2) — there was no
 * prior EMA-period preference to preserve since v1 had no params at all.
 */
export const ARENA_INDICATOR_PARAM_DEFAULTS: ArenaIndicatorParams = {
  ema: { period: 9 },
  sma: { period: INDICATOR_PERIODS.sma },
  rsi: { period: INDICATOR_PERIODS.rsi },
  macd: { ...INDICATOR_PERIODS.macd },
  bbands: { ...INDICATOR_PERIODS.bbands },
  atr: { period: INDICATOR_PERIODS.atr },
};

// ═══════════════════════════════════════════════════════════════
// Per-indicator STYLE (TradingView-style Inputs/Style/Visibility dialog —
// see IndicatorSettingsDialog.tsx) — colors/opacity/thickness/line-style
// per output line, one entry per indicator EXCEPT `volumeProfile` (its
// styling stays under chartStyleSettings.ts's ChartStyleSettings.volumeProfile,
// unchanged by this feature).
// ═══════════════════════════════════════════════════════════════
export type ArenaLineStyleKind = 'solid' | 'dashed' | 'dotted';

/** Structurally identical to `IndicatorLineStyle` (types.ts) minus optionality — this is the persisted/edited shape; the chart consumes the optional version. */
export interface ArenaIndicatorLineStyle {
  visible: boolean;
  color: string;
  /** 0-1. */
  opacity: number;
  thickness: 1 | 2 | 3 | 4;
  lineStyle: ArenaLineStyleKind;
}

export interface ArenaSingleLineStyle {
  line: ArenaIndicatorLineStyle;
}

export interface ArenaMacdStyle {
  macdLine: ArenaIndicatorLineStyle;
  signalLine: ArenaIndicatorLineStyle;
  histogram: ArenaIndicatorLineStyle;
}

export interface ArenaBbandsStyle {
  basis: ArenaIndicatorLineStyle;
  upper: ArenaIndicatorLineStyle;
  lower: ArenaIndicatorLineStyle;
}

export interface ArenaIndicatorStyles {
  ema: ArenaSingleLineStyle;
  sma: ArenaSingleLineStyle;
  vwap: ArenaSingleLineStyle;
  rsi: ArenaSingleLineStyle;
  atr: ArenaSingleLineStyle;
  macd: ArenaMacdStyle;
  bbands: ArenaBbandsStyle;
}

/**
 * `updateStyles(key, patch)` (see useArenaIndicatorPreferences.ts) deep-merges
 * ONE indicator's line entries — this is the patch shape: every named line
 * slot is optional, and when present is itself a PARTIAL line-style patch
 * (e.g. `{ macdLine: { color: '#fff' } }` touches only macdLine.color).
 */
export type ArenaIndicatorStylePatch<K extends keyof ArenaIndicatorStyles> = {
  [L in keyof ArenaIndicatorStyles[K]]?: Partial<ArenaIndicatorStyles[K][L]>;
};

/**
 * Sentinel value for MACD's histogram color meaning "use the built-in
 * per-bar green/red momentum coloring" (see indicators.ts's computeMACD /
 * MACD_HIST_UP_COLOR / MACD_HIST_DOWN_COLOR) instead of a flat user color.
 * Not a valid CSS color — FinotaurChart checks for this exact string.
 */
export const MACD_HISTOGRAM_AUTO_COLOR = 'auto';

function defaultLineStyle(color: string, opacity = 1, thickness: 1 | 2 | 3 | 4 = 2): ArenaIndicatorLineStyle {
  return { visible: true, color, opacity, thickness, lineStyle: 'solid' };
}

/**
 * Defaults are EXACTLY today's hardcoded FinotaurChart.tsx appearance
 * (INDICATOR_COLORS / MACD_SIGNAL_COLOR / BBANDS_BAND_COLOR, lineWidth 2,
 * solid) — so a fresh user (no styles saved yet) sees a pixel-identical
 * chart to before this feature shipped.
 */
export const DEFAULT_ARENA_INDICATOR_STYLES: ArenaIndicatorStyles = {
  ema: { line: defaultLineStyle('#fcd34d') },
  sma: { line: defaultLineStyle('#7dd3fc') },
  vwap: { line: defaultLineStyle('#c4b5fd') },
  rsi: { line: defaultLineStyle('#d4d4d8') },
  atr: { line: defaultLineStyle('#94a3b8') },
  macd: {
    macdLine: defaultLineStyle('#fcd34d'),
    signalLine: defaultLineStyle('#fbbf24'),
    histogram: defaultLineStyle(MACD_HISTOGRAM_AUTO_COLOR, 1, 2),
  },
  bbands: {
    basis: defaultLineStyle('#a78bfa'),
    upper: defaultLineStyle('#a78bfa', 0.5, 1),
    lower: defaultLineStyle('#a78bfa', 0.5, 1),
  },
};

/** ~20-color swatch palette shown in the Style tab's color popover. */
export const INDICATOR_COLOR_SWATCHES: string[] = [
  '#FFFFFF', '#D4D4D8', '#94A3B8', '#707070',
  '#7DD3FC', '#38BDF8', '#0EA5E9',
  '#FCD34D', '#FBBF24', '#F59E0B',
  '#C4B5FD', '#A78BFA', '#8B5CF6',
  '#F87171', '#EF4444', '#DC2626',
  '#4ADE80', '#22C55E', '#16A34A',
  '#C9A646',
];

// ═══════════════════════════════════════════════════════════════
// GLOBAL visibility config — gates whether ANY Arena indicator renders on
// the current timeframe, bucketed by unit (seconds/minutes/hours/days/
// weeks/months — mirrors utils/intervals.ts's ArenaInterval `<N><unit>`
// encoding). Applies to every indicator uniformly (edited from the
// Visibility tab, see IndicatorSettingsDialog.tsx).
// ═══════════════════════════════════════════════════════════════
export interface ArenaVisibilityBucket {
  enabled: boolean;
  min: number;
  max: number;
}

export type ArenaVisibilityBucketKey = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export interface ArenaIndicatorVisibility {
  seconds: ArenaVisibilityBucket;
  minutes: ArenaVisibilityBucket;
  hours: ArenaVisibilityBucket;
  days: ArenaVisibilityBucket;
  weeks: ArenaVisibilityBucket;
  months: ArenaVisibilityBucket;
}

export const ARENA_VISIBILITY_BUCKET_RANGE: Record<ArenaVisibilityBucketKey, { min: number; max: number }> = {
  seconds: { min: 1, max: 59 },
  minutes: { min: 1, max: 59 },
  hours: { min: 1, max: 24 },
  days: { min: 1, max: 366 },
  weeks: { min: 1, max: 52 },
  months: { min: 1, max: 12 },
};

/** Defaults: every bucket enabled, full range — indistinguishable from "no gating" until the user narrows one. */
export const DEFAULT_ARENA_INDICATOR_VISIBILITY: ArenaIndicatorVisibility = {
  seconds: { enabled: true, min: ARENA_VISIBILITY_BUCKET_RANGE.seconds.min, max: ARENA_VISIBILITY_BUCKET_RANGE.seconds.max },
  minutes: { enabled: true, min: ARENA_VISIBILITY_BUCKET_RANGE.minutes.min, max: ARENA_VISIBILITY_BUCKET_RANGE.minutes.max },
  hours: { enabled: true, min: ARENA_VISIBILITY_BUCKET_RANGE.hours.min, max: ARENA_VISIBILITY_BUCKET_RANGE.hours.max },
  days: { enabled: true, min: ARENA_VISIBILITY_BUCKET_RANGE.days.min, max: ARENA_VISIBILITY_BUCKET_RANGE.days.max },
  weeks: { enabled: true, min: ARENA_VISIBILITY_BUCKET_RANGE.weeks.min, max: ARENA_VISIBILITY_BUCKET_RANGE.weeks.max },
  months: { enabled: true, min: ARENA_VISIBILITY_BUCKET_RANGE.months.min, max: ARENA_VISIBILITY_BUCKET_RANGE.months.max },
};

const ARENA_VISIBILITY_UNIT_TO_BUCKET: Record<string, ArenaVisibilityBucketKey> = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  D: 'days',
  W: 'weeks',
  M: 'months',
};

// Mirrors utils/intervals.ts's INTERVAL_RE — duplicated locally (not
// imported) to avoid this settings module depending on the Arena's
// interval-parsing module; both encode the same `<N><unit>` grammar.
const ARENA_VISIBILITY_INTERVAL_RE = /^(\d+)(s|m|h|D|W|M)$/;

/**
 * Whether Arena indicators should render at all on `interval`, per the
 * GLOBAL visibility config. An unparseable interval string is treated as
 * visible (fail-open — never silently hides indicators on a format this
 * function doesn't recognize).
 */
export function isIntervalVisibleForIndicators(interval: string, visibility: ArenaIndicatorVisibility): boolean {
  const match = ARENA_VISIBILITY_INTERVAL_RE.exec(interval);
  if (!match) return true;
  const count = Number(match[1]);
  const bucketKey = ARENA_VISIBILITY_UNIT_TO_BUCKET[match[2]];
  if (!bucketKey || !Number.isFinite(count)) return true;
  const bucket = visibility[bucketKey];
  if (!bucket.enabled) return false;
  return count >= bucket.min && count <= bucket.max;
}

// ═══════════════════════════════════════════════════════════════
// Combined persisted shape
// ═══════════════════════════════════════════════════════════════
export interface ArenaIndicatorPreferences {
  enabled: ArenaIndicatorEnabled;
  params: ArenaIndicatorParams;
}

export const DEFAULT_ARENA_INDICATOR_PREFERENCES: ArenaIndicatorPreferences = {
  enabled: ARENA_INDICATOR_ENABLED_DEFAULTS,
  params: ARENA_INDICATOR_PARAM_DEFAULTS,
};

/**
 * v3 persisted shape — superset of `ArenaIndicatorPreferences` (v2) adding
 * `styles` + `visibility`. Kept as a SEPARATE type/const (not a mutation of
 * the v2 ones above) so the v2 sanitizers/tests
 * (useArenaIndicatorPreferences.test.ts) stay byte-for-byte unaffected —
 * see useArenaIndicatorPreferences.ts's v2→v3 read/migrate chain.
 */
export interface ArenaIndicatorPreferencesV3 {
  enabled: ArenaIndicatorEnabled;
  params: ArenaIndicatorParams;
  styles: ArenaIndicatorStyles;
  visibility: ArenaIndicatorVisibility;
}

export const DEFAULT_ARENA_INDICATOR_PREFERENCES_V3: ArenaIndicatorPreferencesV3 = {
  enabled: ARENA_INDICATOR_ENABLED_DEFAULTS,
  params: ARENA_INDICATOR_PARAM_DEFAULTS,
  styles: DEFAULT_ARENA_INDICATOR_STYLES,
  visibility: DEFAULT_ARENA_INDICATOR_VISIBILITY,
};

// ═══════════════════════════════════════════════════════════════
// Max active indicators (includes Volume Profile in the count)
// ═══════════════════════════════════════════════════════════════
export const MAX_ACTIVE_INDICATORS = 5;

export function countActiveIndicators(enabled: ArenaIndicatorEnabled): number {
  return (Object.keys(enabled) as (keyof ArenaIndicatorEnabled)[]).filter((key) => enabled[key]).length;
}

// ═══════════════════════════════════════════════════════════════
// Sanitize — never trust localStorage JSON shape, degrade per-field
// ═══════════════════════════════════════════════════════════════
function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function asClampedInt(v: unknown, fallback: number, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.round(Math.min(max, Math.max(min, v)));
}

function asClampedFloat(v: unknown, fallback: number, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

export function sanitizeArenaIndicatorEnabled(
  raw: unknown,
  fallback: ArenaIndicatorEnabled = ARENA_INDICATOR_ENABLED_DEFAULTS,
): ArenaIndicatorEnabled {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<ArenaIndicatorEnabled>;

  return {
    sma: asBool(p.sma, fallback.sma),
    ema: asBool(p.ema, fallback.ema),
    rsi: asBool(p.rsi, fallback.rsi),
    vwap: asBool(p.vwap, fallback.vwap),
    macd: asBool(p.macd, fallback.macd),
    bbands: asBool(p.bbands, fallback.bbands),
    atr: asBool(p.atr, fallback.atr),
    volumeProfile: asBool(p.volumeProfile, fallback.volumeProfile),
  };
}

export function sanitizeArenaIndicatorParams(
  raw: unknown,
  fallback: ArenaIndicatorParams = ARENA_INDICATOR_PARAM_DEFAULTS,
): ArenaIndicatorParams {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<{
    ema: Partial<PeriodParam>;
    sma: Partial<PeriodParam>;
    rsi: Partial<PeriodParam>;
    macd: Partial<MacdParams>;
    bbands: Partial<BbandsParams>;
    atr: Partial<PeriodParam>;
  }>;

  return {
    ema: { period: asClampedInt(p.ema?.period, fallback.ema.period, EMA_PERIOD_RANGE.min, EMA_PERIOD_RANGE.max) },
    sma: { period: asClampedInt(p.sma?.period, fallback.sma.period, SMA_PERIOD_RANGE.min, SMA_PERIOD_RANGE.max) },
    rsi: { period: asClampedInt(p.rsi?.period, fallback.rsi.period, RSI_PERIOD_RANGE.min, RSI_PERIOD_RANGE.max) },
    macd: {
      fast: asClampedInt(p.macd?.fast, fallback.macd.fast, MACD_FAST_RANGE.min, MACD_FAST_RANGE.max),
      slow: asClampedInt(p.macd?.slow, fallback.macd.slow, MACD_SLOW_RANGE.min, MACD_SLOW_RANGE.max),
      signal: asClampedInt(p.macd?.signal, fallback.macd.signal, MACD_SIGNAL_RANGE.min, MACD_SIGNAL_RANGE.max),
    },
    bbands: {
      period: asClampedInt(p.bbands?.period, fallback.bbands.period, BBANDS_PERIOD_RANGE.min, BBANDS_PERIOD_RANGE.max),
      stdDev: asClampedFloat(p.bbands?.stdDev, fallback.bbands.stdDev, BBANDS_STDDEV_RANGE.min, BBANDS_STDDEV_RANGE.max),
    },
    atr: { period: asClampedInt(p.atr?.period, fallback.atr.period, ATR_PERIOD_RANGE.min, ATR_PERIOD_RANGE.max) },
  };
}

export function sanitizeArenaIndicatorPreferences(
  raw: unknown,
  fallback: ArenaIndicatorPreferences = DEFAULT_ARENA_INDICATOR_PREFERENCES,
): ArenaIndicatorPreferences {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<ArenaIndicatorPreferences>;

  return {
    enabled: sanitizeArenaIndicatorEnabled(p.enabled, fallback.enabled),
    params: sanitizeArenaIndicatorParams(p.params, fallback.params),
  };
}

function asColor(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function asThickness(v: unknown, fallback: 1 | 2 | 3 | 4): 1 | 2 | 3 | 4 {
  return v === 1 || v === 2 || v === 3 || v === 4 ? v : fallback;
}

function asLineStyleKind(v: unknown, fallback: ArenaLineStyleKind): ArenaLineStyleKind {
  return v === 'solid' || v === 'dashed' || v === 'dotted' ? v : fallback;
}

function sanitizeArenaLineStyle(raw: unknown, fallback: ArenaIndicatorLineStyle): ArenaIndicatorLineStyle {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<ArenaIndicatorLineStyle>;
  return {
    visible: asBool(p.visible, fallback.visible),
    color: asColor(p.color, fallback.color),
    opacity: asClampedFloat(p.opacity, fallback.opacity, 0, 1),
    thickness: asThickness(p.thickness, fallback.thickness),
    lineStyle: asLineStyleKind(p.lineStyle, fallback.lineStyle),
  };
}

export function sanitizeArenaIndicatorStyles(
  raw: unknown,
  fallback: ArenaIndicatorStyles = DEFAULT_ARENA_INDICATOR_STYLES,
): ArenaIndicatorStyles {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<{
    ema: Partial<ArenaSingleLineStyle>;
    sma: Partial<ArenaSingleLineStyle>;
    vwap: Partial<ArenaSingleLineStyle>;
    rsi: Partial<ArenaSingleLineStyle>;
    atr: Partial<ArenaSingleLineStyle>;
    macd: Partial<ArenaMacdStyle>;
    bbands: Partial<ArenaBbandsStyle>;
  }>;

  const single = (key: 'ema' | 'sma' | 'vwap' | 'rsi' | 'atr'): ArenaSingleLineStyle => ({
    line: sanitizeArenaLineStyle(p[key]?.line, fallback[key].line),
  });

  return {
    ema: single('ema'),
    sma: single('sma'),
    vwap: single('vwap'),
    rsi: single('rsi'),
    atr: single('atr'),
    macd: {
      macdLine: sanitizeArenaLineStyle(p.macd?.macdLine, fallback.macd.macdLine),
      signalLine: sanitizeArenaLineStyle(p.macd?.signalLine, fallback.macd.signalLine),
      histogram: sanitizeArenaLineStyle(p.macd?.histogram, fallback.macd.histogram),
    },
    bbands: {
      basis: sanitizeArenaLineStyle(p.bbands?.basis, fallback.bbands.basis),
      upper: sanitizeArenaLineStyle(p.bbands?.upper, fallback.bbands.upper),
      lower: sanitizeArenaLineStyle(p.bbands?.lower, fallback.bbands.lower),
    },
  };
}

function sanitizeVisibilityBucket(
  raw: unknown,
  fallback: ArenaVisibilityBucket,
  range: { min: number; max: number },
): ArenaVisibilityBucket {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<ArenaVisibilityBucket>;
  const min = asClampedInt(p.min, fallback.min, range.min, range.max);
  // max can't fall below the (already-clamped) min — clamp then re-floor.
  const maxRaw = asClampedInt(p.max, fallback.max, range.min, range.max);
  const max = Math.max(min, maxRaw);
  return { enabled: asBool(p.enabled, fallback.enabled), min, max };
}

export function sanitizeArenaIndicatorVisibility(
  raw: unknown,
  fallback: ArenaIndicatorVisibility = DEFAULT_ARENA_INDICATOR_VISIBILITY,
): ArenaIndicatorVisibility {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<Record<ArenaVisibilityBucketKey, unknown>>;
  const keys: ArenaVisibilityBucketKey[] = ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'];
  const out = {} as ArenaIndicatorVisibility;
  for (const key of keys) {
    out[key] = sanitizeVisibilityBucket(p[key], fallback[key], ARENA_VISIBILITY_BUCKET_RANGE[key]);
  }
  return out;
}

export function sanitizeArenaIndicatorPreferencesV3(
  raw: unknown,
  fallback: ArenaIndicatorPreferencesV3 = DEFAULT_ARENA_INDICATOR_PREFERENCES_V3,
): ArenaIndicatorPreferencesV3 {
  if (!raw || typeof raw !== 'object') return fallback;
  const p = raw as Partial<ArenaIndicatorPreferencesV3>;

  return {
    enabled: sanitizeArenaIndicatorEnabled(p.enabled, fallback.enabled),
    params: sanitizeArenaIndicatorParams(p.params, fallback.params),
    styles: sanitizeArenaIndicatorStyles(p.styles, fallback.styles),
    visibility: sanitizeArenaIndicatorVisibility(p.visibility, fallback.visibility),
  };
}

// ═══════════════════════════════════════════════════════════════
// Pure builder — enabled + params + interval → FinotaurChart's Indicator[]
// ═══════════════════════════════════════════════════════════════
/**
 * Mirrors what TradingArena.tsx used to build inline from the flat boolean
 * `IndicatorSettings` + hardcoded `INDICATOR_PERIODS`. Volume Profile is
 * intentionally OMITTED from the returned array — it renders through
 * FinotaurChart's separate `sessionVolumeProfile` prop, not the indicators
 * array (see ChartTab.tsx).
 */
/** Copies one ArenaIndicatorLineStyle into the optional-fields shape `Indicator.lineStyles` slots use. */
function toChartLineStyle(style: ArenaIndicatorLineStyle): IndicatorLineStyle {
  return {
    visible: style.visible,
    color: style.color,
    opacity: style.opacity,
    thickness: style.thickness,
    lineStyle: style.lineStyle,
  };
}

export function buildIndicatorsFromArenaSettings(
  enabled: ArenaIndicatorEnabled,
  params: ArenaIndicatorParams,
  interval: string,
  /** Per-indicator visual style (Style tab) — optional, purely additive. When omitted, every Indicator is built exactly as before this field existed. */
  styles?: ArenaIndicatorStyles,
): Indicator[] {
  const list: Indicator[] = [];

  if (enabled.sma) {
    list.push({
      type: 'SMA',
      period: params.sma.period,
      color: styles?.sma.line.color,
      lineStyles: styles ? { line: toChartLineStyle(styles.sma.line) } : undefined,
    });
  }
  if (enabled.ema) {
    list.push({
      type: 'EMA',
      period: params.ema.period,
      color: styles?.ema.line.color,
      lineStyles: styles ? { line: toChartLineStyle(styles.ema.line) } : undefined,
    });
  }
  if (enabled.rsi) {
    list.push({
      type: 'RSI',
      period: params.rsi.period,
      color: styles?.rsi.line.color,
      lineStyles: styles ? { line: toChartLineStyle(styles.rsi.line) } : undefined,
    });
  }
  // VWAP gate: only meaningful on intraday intervals — same belt-and-
  // suspenders guard TradeChart.tsx applies (the dialog also disables the
  // row on non-intraday intervals).
  if (enabled.vwap && isIntradayInterval(interval)) {
    list.push({
      type: 'VWAP',
      period: 0,
      color: styles?.vwap.line.color,
      lineStyles: styles ? { line: toChartLineStyle(styles.vwap.line) } : undefined,
    });
  }
  if (enabled.macd) {
    list.push({
      type: 'MACD',
      period: 0,
      macdParams: { fast: params.macd.fast, slow: params.macd.slow, signal: params.macd.signal },
      color: styles?.macd.macdLine.color,
      lineStyles: styles
        ? {
            macdLine: toChartLineStyle(styles.macd.macdLine),
            signalLine: toChartLineStyle(styles.macd.signalLine),
            histogram: toChartLineStyle(styles.macd.histogram),
          }
        : undefined,
    });
  }
  if (enabled.bbands) {
    list.push({
      type: 'BBANDS',
      period: params.bbands.period,
      bbandsStdDev: params.bbands.stdDev,
      color: styles?.bbands.basis.color,
      lineStyles: styles
        ? {
            basis: toChartLineStyle(styles.bbands.basis),
            upper: toChartLineStyle(styles.bbands.upper),
            lower: toChartLineStyle(styles.bbands.lower),
          }
        : undefined,
    });
  }
  if (enabled.atr) {
    list.push({
      type: 'ATR',
      period: params.atr.period,
      color: styles?.atr.line.color,
      lineStyles: styles ? { line: toChartLineStyle(styles.atr.line) } : undefined,
    });
  }

  return list;
}
