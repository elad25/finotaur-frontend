// src/pages/app/trading-arena/components/footprintSettings.ts
//
// PR 2 — Unified Footprint Settings model. Replaces the ad-hoc mix of
// `OrderFlowControlsState` (Chart-tab pill strip) + the imbalance-preset enum
// with a single flat settings object that maps cleanly onto the new
// FootprintSettingsMenu UI: numeric imbalance inputs instead of
// Standard/Strict/Stacked presets, a row-size mode with an explicit
// $-per-row/ticks value, and granular per-row Cluster Statistics visibility.
//
// `layout` and `colorScheme` are plumbed end-to-end (persisted, exposed in
// the menu) but NOT yet dispatched by the renderer — footprintRender.ts only
// ever draws the 'numbers'/'delta' behavior today. That dispatch is PR 3's
// job; this PR only has to guarantee the fields round-trip correctly and
// that holding them at their defaults leaves rendering byte-for-byte
// unchanged (see footprintSettingsToConfig's doc comment).

import {
  DEFAULT_FOOTPRINT_CONFIG,
  DEFAULT_IMBALANCE_MIN_VOL_PCT,
  DEFAULT_STACKED_MIN,
  type FootprintCellMode,
  type FootprintColorScheme,
  type FootprintColumnSpacing,
  type FootprintConfig,
  type FootprintLayout,
} from '@/components/charting/orderflow/types';

// FootprintLayout / FootprintColorScheme / FootprintColumnSpacing are defined
// in orderflow/types.ts (they're FootprintConfig fields too — see
// footprintSettingsToConfig below) and re-exported here so UI callers only
// need to import from this module.
export type { FootprintColorScheme, FootprintColumnSpacing, FootprintLayout };

export type FootprintRowSizeMode = 'auto' | 'price' | 'ticks';

/**
 * ATAS "Candle width to auto transform" default (CSS px) — used by the
 * Footprint tab's own autoTransform toggle (below). Formerly also reused by
 * ChartTab's `footprintOnZoom` opt-in bridge (chartStyleSettings.ts); that
 * bridge was removed 2026-07-18 (the plain Chart tab never renders
 * footprint), so this constant is Footprint-tab-only again.
 */
export const DEFAULT_FOOTPRINT_AUTO_TRANSFORM_MIN_PX = 20;
export const FOOTPRINT_AUTO_TRANSFORM_MIN_PX_RANGE = { min: 8, max: 60 } as const;

/** ATAS "Width to show text" — user-facing default/range for the Settings dialog's NumberField. Distinct from the renderer's own fallback constant (FOOTPRINT_MIN_CANDLE_WIDTH_FOR_TEXT, 50px, footprintTheme.ts) — this is the DEFAULT VALUE OF THE SETTING, not the fallback used when the setting is entirely absent. */
export const DEFAULT_FOOTPRINT_MIN_CELL_PX_FOR_TEXT = 40;
export const FOOTPRINT_MIN_CELL_PX_FOR_TEXT_RANGE = { min: 20, max: 80 } as const;

/** ATAS "Proportion Settings" upper percentile — user-facing default/range. */
export const DEFAULT_FOOTPRINT_PROPORTION_UPPER_PERCENTILE = 100;
export const FOOTPRINT_PROPORTION_UPPER_PERCENTILE_RANGE = { min: 90, max: 100 } as const;

/** K-formatting divider for cell numbers (ATAS "Values divider"). 1000 = "5.3K" style compaction (default); 1 = raw un-compacted numbers. */
export type FootprintValuesDivider = 1 | 1000;

export interface FootprintStatsRowsVisibility {
  volume: boolean;
  delta: boolean;
  deltaPct: boolean;
  maxDelta: boolean;
  minDelta: boolean;
  sessionDelta: boolean;
}

export interface FootprintSettings {
  /** Per-row cell content — maps 1:1 onto FootprintConfig.cellMode. */
  content: FootprintCellMode;
  /** Cell rendering layout. Histogram lands in PR 3 — persisted/exposed now. */
  layout: FootprintLayout;
  /** Cell color scheme. Non-'delta' dispatch lands in PR 3 — persisted/exposed now. */
  colorScheme: FootprintColorScheme;
  /**
   * Horizontal gap reserved between adjacent bars' footprint bands — fixes
   * the bug where neighboring candles' cell numbers overlapped/mashed
   * together. Default 'normal'. See FootprintColumnSpacing's doc comment.
   */
  columnSpacing: FootprintColumnSpacing;
  /** Diagonal-imbalance ratio threshold, as a percent (300 = 3.0x / 300%). */
  imbalanceRatioPct: number;
  /** Minimum consecutive same-side imbalanced levels to qualify as a "stacked" zone. */
  imbalanceStackedCount: number;
  /** When true, only stacked runs (>= imbalanceStackedCount) are highlighted — isolated single-row imbalances are suppressed. */
  imbalanceStackedOnly: boolean;
  /** 'auto' = TradingView-style auto-suggest from loaded bar range (today's default). 'price'/'ticks' = user-fixed row size, interpreted via rowSizeValue. */
  rowSizeMode: FootprintRowSizeMode;
  /** $ per row when rowSizeMode==='price'; tick count per row when rowSizeMode==='ticks'. Ignored (null) in 'auto' mode. */
  rowSizeValue: number | null;
  /**
   * ATAS "Auto transform candles to footprint" (S1 "Arena WOW week"). When
   * true, FootprintLayer gates full-detail rendering on
   * `autoTransformMinPx` (bar pixel width) instead of the tab's usual
   * always-full `forceFullDetail`. When false, today's always-full behavior
   * is unchanged. Default true.
   */
  autoTransform: boolean;
  /** Min bar pixel width (CSS px) to reveal full footprint detail when autoTransform is on. Range [8, 60]. Default 20. */
  autoTransformMinPx: number;
  showVolumeProfile: boolean;
  showPoc: boolean;
  showValueArea: boolean;
  magnifierEnabled: boolean;
  /** Per-row visibility within the 6-row Cluster Statistics strip. Row-level filtering dispatch lands in PR 3 — persisted/exposed now (footprintRender.ts renders all 6 rows unconditionally whenever showStats is true, same as before this PR). */
  statsRows: FootprintStatsRowsVisibility;
  /** ATAS "Values divider" — K-formatting of per-cell numbers. See footprintSettingsToConfig / footprintRender.ts's formatCellValue. */
  valuesDivider: FootprintValuesDivider;
  /** ATAS "Width to show text" — minimum candle width (px) before cell numbers paint. Range [20, 80]. */
  minCellPxForText: number;
  /** Extra absolute qty-difference gate on top of imbalanceRatioPct. 0 = off. */
  imbalanceMinDiff: number;
  /** When false, a 0-vs-N opposite-side pair DOES qualify as an imbalance (ATAS "don't ignore zero values"). Default true = today's existing guarded behavior. */
  imbalanceIgnoreZeros: boolean;
  /** Bold the winning number's text on an imbalanced row. Default true. */
  imbalanceBold: boolean;
  /** ATAS "Proportion Settings" upper percentile — clamps per-candle histogram/heat normalization. 100 = off. Range [90, 100]. */
  proportionUpperPercentile: number;
}

/**
 * Defaults for the new settings model. NOTE ON imbalanceRatioPct: the
 * previous 3-preset UI's default ('standard') resolved to a 150% ratio (see
 * STANDARD_IMBALANCE_RATIO in orderflow/types.ts). This PR's numeric-input
 * UI ships with an explicit 300% default per spec — a deliberate default
 * CHANGE from the old preset default, not a translation of it. Flagged here
 * because it's the one place this PR's default visibly diverges from
 * pre-PR-2 rendering behavior; every other field below mirrors
 * DEFAULT_ORDER_FLOW_CONTROLS / DEFAULT_FOOTPRINT_CONFIG exactly.
 */
export const DEFAULT_FOOTPRINT_SETTINGS: FootprintSettings = {
  content: 'bidAsk',
  layout: 'numbers',
  colorScheme: 'delta',
  columnSpacing: 'normal',
  imbalanceRatioPct: 300,
  imbalanceStackedCount: DEFAULT_STACKED_MIN,
  imbalanceStackedOnly: false,
  rowSizeMode: 'auto',
  rowSizeValue: null,
  autoTransform: true,
  autoTransformMinPx: DEFAULT_FOOTPRINT_AUTO_TRANSFORM_MIN_PX,
  showVolumeProfile: false,
  showPoc: true,
  showValueArea: false,
  magnifierEnabled: true,
  statsRows: {
    volume: true,
    delta: true,
    deltaPct: true,
    maxDelta: true,
    minDelta: true,
    sessionDelta: true,
  },
  valuesDivider: 1000,
  minCellPxForText: DEFAULT_FOOTPRINT_MIN_CELL_PX_FOR_TEXT,
  imbalanceMinDiff: 0,
  imbalanceIgnoreZeros: true,
  imbalanceBold: true,
  proportionUpperPercentile: DEFAULT_FOOTPRINT_PROPORTION_UPPER_PERCENTILE,
};

/**
 * Maps a FootprintSettings object onto a FootprintConfig for FinotaurChart's
 * `footprint.config` prop. `base` defaults to DEFAULT_FOOTPRINT_CONFIG so
 * every field this PR doesn't touch (showTotals, forceFullDetail, ...)
 * passes through unchanged.
 *
 * Imbalance semantics are generated directly from the numeric fields — NOT
 * routed back through `resolveImbalancePreset` — but reproduce the exact
 * same shape that preset produced for its 'standard'/'strict'/'stacked'
 * cases: imbalanceMinVolPct always stays at the shared dust filter
 * (DEFAULT_IMBALANCE_MIN_VOL_PCT), which is the one imbalance field the new
 * UI doesn't expose (by design — see PR spec). Render semantics inside
 * footprintRender.ts are unchanged; only how the 4 numeric inputs are
 * produced has moved from preset-lookup to direct user input.
 *
 * `imbalancePreset` itself becomes vestigial once the UI is fully
 * numeric-driven — footprintRender.ts's detectImbalances only ever reads
 * imbalanceRatio/imbalanceMinVolPct/stackedMin/imbalanceStackedOnly, never
 * `imbalancePreset` (see resolveImbalancePreset's callers). It's kept at
 * 'standard' purely to satisfy FootprintConfig's shape.
 */
export function footprintSettingsToConfig(
  settings: FootprintSettings,
  base: FootprintConfig = DEFAULT_FOOTPRINT_CONFIG,
): FootprintConfig {
  return {
    ...base,
    cellMode: settings.content,
    imbalancePreset: 'standard',
    imbalanceRatio: settings.imbalanceRatioPct / 100,
    imbalanceMinVolPct: DEFAULT_IMBALANCE_MIN_VOL_PCT,
    stackedMin: settings.imbalanceStackedCount,
    imbalanceStackedOnly: settings.imbalanceStackedOnly,
    showPoc: settings.showPoc,
    magnifierEnabled: settings.magnifierEnabled,
    layout: settings.layout,
    colorScheme: settings.colorScheme,
    columnSpacing: settings.columnSpacing,
    showValueArea: settings.showValueArea,
    statsRows: settings.statsRows,
    valuesDivider: settings.valuesDivider,
    minCellPxForText: Math.min(
      FOOTPRINT_MIN_CELL_PX_FOR_TEXT_RANGE.max,
      Math.max(FOOTPRINT_MIN_CELL_PX_FOR_TEXT_RANGE.min, settings.minCellPxForText),
    ),
    imbalanceMinDiff: Math.max(0, settings.imbalanceMinDiff),
    imbalanceIgnoreZeros: settings.imbalanceIgnoreZeros,
    imbalanceBold: settings.imbalanceBold,
    proportionUpperPercentile: Math.min(
      FOOTPRINT_PROPORTION_UPPER_PERCENTILE_RANGE.max,
      Math.max(FOOTPRINT_PROPORTION_UPPER_PERCENTILE_RANGE.min, settings.proportionUpperPercentile),
    ),
    // autoTransformMinPx takes priority over forceFullDetail in
    // FootprintLayer (see that file's detail-gate comment) — only set when
    // the user has autoTransform ON, so autoTransform=false reproduces
    // today's always-full behavior byte-for-byte (base.forceFullDetail /
    // the caller's own `forceFullDetail: true` override still applies).
    autoTransformMinPx: settings.autoTransform
      ? Math.min(FOOTPRINT_AUTO_TRANSFORM_MIN_PX_RANGE.max, Math.max(FOOTPRINT_AUTO_TRANSFORM_MIN_PX_RANGE.min, settings.autoTransformMinPx))
      : undefined,
  };
}

// ─── Row-size resolution ────────────────────────────────────────────────────
//
// Row size (FlowBinStoreConfig.rowSize, a PRICE-unit width, not part of
// FootprintConfig) is deliberately NOT produced by footprintSettingsToConfig
// above — FootprintTab.tsx feeds it to useOrderFlow directly. These helpers
// are shared by FootprintSettingsMenu.tsx (input-blur snapping, so the
// persisted value already matches what will render) and FootprintTab.tsx
// (resolving the actual store rowSize every render) so both always agree.

/** Snaps a $-price row-size value to the nearest tick multiple, minimum 1 tick. */
export function snapRowSizePriceToTick(value: number, tickSize: number): number {
  if (!Number.isFinite(value) || tickSize <= 0) return Number.isFinite(value) ? value : tickSize;
  const ticks = Math.max(1, Math.round(value / tickSize));
  return ticks * tickSize;
}

/** Snaps a tick-count row-size value to an integer, minimum 1. */
export function snapRowSizeTicksToInt(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.round(value));
}

/**
 * Resolves the effective FlowBinStoreConfig.rowSize (price units) for the
 * current settings + tickSize:
 *  - 'auto' defers to `suggestedRowSize` (FlowBinStore.suggestRowSize's
 *    output) — the ONLY mode where auto-suggestion may affect the rendered
 *    row size. Matches today's pre-PR-2 behavior exactly (`Math.max(suggested, tickSize)`).
 *  - 'price'/'ticks' are user-fixed: a fresh auto-suggestion must NEVER
 *    override them (FootprintTab.tsx's one-shot suggestion guard keeps
 *    `suggestedRowSize` fresh for when the user switches back to Auto, but
 *    this function simply never reads it in those two modes).
 */
export function resolveEffectiveRowSize(
  settings: Pick<FootprintSettings, 'rowSizeMode' | 'rowSizeValue'>,
  tickSize: number,
  suggestedRowSize: number,
): number {
  if (settings.rowSizeMode === 'price' && settings.rowSizeValue != null) {
    return snapRowSizePriceToTick(settings.rowSizeValue, tickSize);
  }
  if (settings.rowSizeMode === 'ticks' && settings.rowSizeValue != null) {
    return snapRowSizeTicksToInt(settings.rowSizeValue) * tickSize;
  }
  return Math.max(suggestedRowSize, tickSize);
}
