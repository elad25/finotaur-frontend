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
export function buildIndicatorsFromArenaSettings(
  enabled: ArenaIndicatorEnabled,
  params: ArenaIndicatorParams,
  interval: string,
): Indicator[] {
  const list: Indicator[] = [];

  if (enabled.sma) list.push({ type: 'SMA', period: params.sma.period });
  if (enabled.ema) list.push({ type: 'EMA', period: params.ema.period });
  if (enabled.rsi) list.push({ type: 'RSI', period: params.rsi.period });
  // VWAP gate: only meaningful on intraday intervals — same belt-and-
  // suspenders guard TradeChart.tsx applies (the dialog also disables the
  // row on non-intraday intervals).
  if (enabled.vwap && isIntradayInterval(interval)) {
    list.push({ type: 'VWAP', period: 0 });
  }
  if (enabled.macd) {
    list.push({
      type: 'MACD',
      period: 0,
      macdParams: { fast: params.macd.fast, slow: params.macd.slow, signal: params.macd.signal },
    });
  }
  if (enabled.bbands) {
    list.push({ type: 'BBANDS', period: params.bbands.period, bbandsStdDev: params.bbands.stdDev });
  }
  if (enabled.atr) list.push({ type: 'ATR', period: params.atr.period });

  return list;
}
