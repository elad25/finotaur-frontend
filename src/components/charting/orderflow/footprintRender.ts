// src/components/charting/orderflow/footprintRender.ts
// Pure rendering helpers for FootprintLayer — no React, no DOM lifecycle.
// Mirrors the "pure engine" style of flowBinStore.ts: given a canvas ctx +
// a coordinate projection + prepared per-candle data, draw exactly one
// candle's footprint. All heavy prep (sorting, imbalance detection, row
// merging) happens in `prepareCandleDraw`, which callers invoke ONLY when
// data or config changes — never per pan/zoom frame (see FootprintLayer.tsx).

import type {
  FlowBin,
  FlowCandleView,
  FootprintCellMode,
  FootprintColorScheme,
  FootprintConfig,
  FootprintLayout,
  ImbalancePreset,
} from './types';
import {
  DEFAULT_IMBALANCE_MIN_VOL_PCT,
  DEFAULT_STACKED_MIN,
  STANDARD_IMBALANCE_RATIO,
  STRICT_IMBALANCE_RATIO,
} from './types';
import { computeValueArea } from './valueArea';
import {
  FOOTPRINT_AUTO_ROW_HEIGHT_HYSTERESIS,
  FOOTPRINT_AUTO_ROW_HEIGHT_MAX,
  FOOTPRINT_AUTO_ROW_HEIGHT_MIN,
  FOOTPRINT_BIDASK_BG_STRONG_ALPHA,
  FOOTPRINT_BIDASK_BG_WEAK_ALPHA,
  FOOTPRINT_BUY_BG,
  FOOTPRINT_BUY_BG_STRONG,
  FOOTPRINT_BUY_COLOR,
  FOOTPRINT_BUY_COLOR_BRIGHT,
  FOOTPRINT_CELL_FONT_HEIGHT_RATIO,
  FOOTPRINT_CELL_FONT_MAX,
  FOOTPRINT_CELL_FONT_MIN,
  FOOTPRINT_CELL_GUTTER_PX,
  FOOTPRINT_CELL_PADDING_X,
  FOOTPRINT_DELTA_NEUTRAL_DARK,
  FOOTPRINT_FONT_FAMILY,
  FOOTPRINT_HISTO_BUY_FILL,
  FOOTPRINT_HISTO_NEUTRAL_FILL,
  FOOTPRINT_HISTO_SELL_FILL,
  FOOTPRINT_MIN_CANDLE_WIDTH_FOR_SHADING,
  FOOTPRINT_MIN_CANDLE_WIDTH_FOR_SHADING_EXIT,
  FOOTPRINT_MIN_CANDLE_WIDTH_FOR_TEXT,
  FOOTPRINT_MIN_CANDLE_WIDTH_FOR_TEXT_EXIT,
  FOOTPRINT_MIN_ROW_HEIGHT_FOR_TEXT,
  FOOTPRINT_MIN_ROW_HEIGHT_FOR_TEXT_EXIT,
  FOOTPRINT_NEUTRAL_BG,
  FOOTPRINT_NEUTRAL_TEXT,
  FOOTPRINT_POC_BG,
  FOOTPRINT_POC_COLOR,
  FOOTPRINT_SELL_BG,
  FOOTPRINT_SELL_BG_STRONG,
  FOOTPRINT_SELL_COLOR,
  FOOTPRINT_SELL_COLOR_BRIGHT,
  FOOTPRINT_SKELETON_BODY_FILL_ALPHA,
  FOOTPRINT_SKELETON_BODY_WIDTH_PX,
  FOOTPRINT_SKELETON_WICK_ALPHA,
  FOOTPRINT_SKELETON_WICK_WIDTH_PX,
  FOOTPRINT_SOLID_SCHEME_BG,
  FOOTPRINT_STACKED_BAND_BORDER_WIDTH_PX,
  FOOTPRINT_STACKED_BUY_BAND,
  FOOTPRINT_STACKED_BUY_BAND_BORDER,
  FOOTPRINT_STACKED_SELL_BAND,
  FOOTPRINT_STACKED_SELL_BAND_BORDER,
  FOOTPRINT_STATS_CHIP_STRONG_ALPHA,
  FOOTPRINT_STATS_CHIP_WEAK_ALPHA,
  FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH,
  FOOTPRINT_TOTALS_BG,
  FOOTPRINT_TOTALS_FONT_SIZE,
  FOOTPRINT_VOLUME_HEAT_COLOR,
  FOOTPRINT_VOLUME_HEAT_STRONG_ALPHA,
  FOOTPRINT_VOLUME_HEAT_WEAK_ALPHA,
  VOLUME_PROFILE_VA_BOUNDARY_COLOR,
  VOLUME_PROFILE_VA_BOUNDARY_DASH,
  VOLUME_PROFILE_VA_DIM_OUTSIDE_BG,
} from './footprintTheme';

// ─── Zoom-dependent detail level ────────────────────────────────────────────

export type FootprintDetailLevel = 'full' | 'shaded' | 'hidden';

/**
 * Decide how much detail the footprint can render at the current zoom.
 *
 * This is the PRIMARY progressive-disclosure mechanism (dxFeed/Motivewave
 * style), not a degradation fallback: zoomed out renders plain candles
 * ('hidden'), zooming in reveals delta-shaded cells ('shaded'), zooming in
 * further reveals full bid×ask numbers ('full').
 *
 * - 'full': numbers + shading (row height and candle width both above threshold).
 * - 'shaded': delta-shaded cells only, no numbers (candle wide enough to be
 *   visually meaningful but too short/narrow for legible text).
 * - 'hidden': draw nothing — underlying candles remain visible on their own.
 *
 * Hysteresis: each boundary has a separate, lower EXIT threshold than its
 * ENTER threshold. Without this, pinch/scroll-zooming with the candle width
 * hovering exactly at a boundary flickers between stages every frame (each
 * frame's rounding can land a px on either side). The exit threshold must be
 * cleared before dropping down a stage, so the display only transitions once
 * the user has zoomed meaningfully past the boundary in either direction.
 *
 * Pure function of (candleWidthPx, rowHeightPx, previousStage) — cheap,
 * frame-safe (no data scans, only px comparisons).
 */
export function computeDetailLevel(
  candleWidthPx: number,
  rowHeightPx: number,
  previousStage: FootprintDetailLevel = 'hidden',
): FootprintDetailLevel {
  if (previousStage === 'full') {
    // Stay in 'full' until BOTH dimensions drop below their exit thresholds.
    if (
      candleWidthPx >= FOOTPRINT_MIN_CANDLE_WIDTH_FOR_TEXT_EXIT &&
      rowHeightPx >= FOOTPRINT_MIN_ROW_HEIGHT_FOR_TEXT_EXIT
    ) {
      return 'full';
    }
    // Dropped out of 'full' — fall through to re-evaluate 'shaded' vs 'hidden'
    // using the same rules as a cold-start entry into this frame.
    if (candleWidthPx < FOOTPRINT_MIN_CANDLE_WIDTH_FOR_SHADING_EXIT) return 'hidden';
    return 'shaded';
  }

  if (previousStage === 'shaded') {
    // Promote to 'full' once past the (higher) enter thresholds.
    if (
      candleWidthPx >= FOOTPRINT_MIN_CANDLE_WIDTH_FOR_TEXT &&
      rowHeightPx >= FOOTPRINT_MIN_ROW_HEIGHT_FOR_TEXT
    ) {
      return 'full';
    }
    // Stay in 'shaded' until below the (lower) shading-exit threshold.
    if (candleWidthPx < FOOTPRINT_MIN_CANDLE_WIDTH_FOR_SHADING_EXIT) return 'hidden';
    return 'shaded';
  }

  // previousStage === 'hidden' — cold start / zoomed all the way out.
  if (candleWidthPx < FOOTPRINT_MIN_CANDLE_WIDTH_FOR_SHADING) return 'hidden';
  if (
    candleWidthPx >= FOOTPRINT_MIN_CANDLE_WIDTH_FOR_TEXT &&
    rowHeightPx >= FOOTPRINT_MIN_ROW_HEIGHT_FOR_TEXT
  ) {
    return 'full';
  }
  return 'shaded';
}

/**
 * ATAS "Auto transform candles to footprint" gate: a simple BINARY decision
 * (no 'shaded' intermediate stage, no hysteresis) — 'full' detail once the
 * rendered bar pixel width reaches `minPx`, otherwise 'hidden' (plain
 * candles show through). Used by FootprintLayer when
 * `FootprintConfig.autoTransformMinPx` is set — takes priority over both
 * `forceFullDetail` and computeDetailLevel's 3-stage hysteresis. Pure,
 * frame-safe (only a px comparison).
 */
export function resolveAutoTransformDetail(candleWidthPx: number, minPx: number): FootprintDetailLevel {
  return candleWidthPx >= minPx ? 'full' : 'hidden';
}

/**
 * Row-merge factor (1, 2, or 4) targeting a legible on-screen row height —
 * ATAS/Exocharts parity is ~14-25 rows/bar at typical zoom, each row a
 * 14-20px cell (see FOOTPRINT_AUTO_ROW_HEIGHT_MIN/MAX in footprintTheme.ts).
 *
 * `baseRowHeightPx` is the store's OWN single-row pixel height at the
 * current zoom — `priceToCoordinate(rowSize)` distance, i.e. the height ONE
 * un-merged price bin occupies on screen. This must be measured
 * independently of bin count: an earlier version derived "available height"
 * as `binCount * rowHeightPx`, which made the naive-row-height calculation
 * cancel back out to exactly `rowHeightPx` regardless of `binCount` — the
 * function could never detect "too many giant rows," because it was
 * comparing `rowHeightPx` against itself. Root cause was upstream (the
 * store's suggested rowSize was too coarse — see ChartTab.tsx/
 * FuturesChartTab.tsx's suggestRowSize feed), but the merge-factor formula
 * itself was ALSO a no-op and needed fixing independently: it must react to
 * the store's actual per-row px height, not a quantity that always equals it.
 *
 * Picks the SMALLEST factor (1, 2, then 4) whose resulting merged-row height
 * (`baseRowHeightPx * factor`) clears FOOTPRINT_AUTO_ROW_HEIGHT_MIN (cold
 * start / no held factor). `previousFactor` (optional) applies per-boundary
 * hysteresis — mirrors computeDetailLevel's enter/exit asymmetry: a
 * candidate factor is only ESCALATED away from once its held height drops
 * below the exit threshold (min - hysteresis), and only DE-ESCALATED once a
 * smaller factor's height would exceed the enter threshold (min +
 * hysteresis) with margin to spare — so a per-row height hovering exactly at
 * a boundary across frames doesn't flicker the factor every frame. Cold
 * start (previousFactor omitted) always uses the plain (non-relaxed)
 * threshold — hysteresis only applies once a factor is already held.
 */
export function computeRowMergeFactor(
  baseRowHeightPx: number,
  binCount: number,
  previousFactor?: 1 | 2 | 4,
): 1 | 2 | 4 {
  if (binCount <= 0 || baseRowHeightPx <= 0) return 1;

  const min = FOOTPRINT_AUTO_ROW_HEIGHT_MIN;
  const hysteresis = FOOTPRINT_AUTO_ROW_HEIGHT_HYSTERESIS;

  const coldPick = (): 1 | 2 | 4 => {
    if (baseRowHeightPx >= min) return 1;
    if (baseRowHeightPx * 2 >= min) return 2;
    return 4;
  };

  if (previousFactor === undefined) return coldPick();

  // Hysteresis: stay on the previously-held factor as long as its merged
  // height hasn't dropped below the (relaxed) exit threshold. This can only
  // ever EXTEND how long a factor is held, never invent a hold for a factor
  // that wasn't already active — so a factor that never legitimately applied
  // (e.g. the default entry point for a value needing escalation) can't be
  // wrongly sticky.
  const heldHeight = baseRowHeightPx * previousFactor;
  if (heldHeight >= min - hysteresis) return previousFactor;

  // Held factor no longer clears even the relaxed threshold — recompute
  // fresh from the un-relaxed thresholds.
  return coldPick();
}

// ─── Cell font sizing ────────────────────────────────────────────────────────

/**
 * Auto font size (px) for cell text, scaled by the current on-screen row
 * height (ATAS/Exocharts parity) instead of a fixed size — cramped rows get
 * smaller text, roomy rows get larger text, both clamped to a legible range.
 * Pure function of `rowHeightPx`; cheap enough to call once per draw (not
 * per-cell — row height is uniform across a candle's cells at a given zoom).
 */
export function computeCellFontSize(rowHeightPx: number): number {
  const raw = Math.round(rowHeightPx * FOOTPRINT_CELL_FONT_HEIGHT_RATIO);
  return Math.min(FOOTPRINT_CELL_FONT_MAX, Math.max(FOOTPRINT_CELL_FONT_MIN, raw));
}

// ─── Number formatting ──────────────────────────────────────────────────────

/** Abbreviate a volume/delta number: 1.24K, 3.1M. No currency prefix (contracts/coins, not $). */
export function formatCompact(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)}K`;
  if (abs >= 1) return `${sign}${abs.toFixed(abs >= 100 ? 0 : 1)}`;
  return abs === 0 ? '0' : `${sign}${abs.toFixed(2)}`;
}

/**
 * "Values divider" K-formatter used for footprint cell/totals text: numbers
 * >= 1000 render as "1.2K" (one decimal, trailing ".0" stripped — 1000→"1K",
 * 1234→"1.2K", 12345→"12.3K"); numbers < 1000 keep the existing formatCompact
 * behavior (no K-suffix, one decimal below 100, integer at/above 100).
 * Sign is preserved on the outside so negative deltas read "-1.2K".
 *
 * `divider` (ATAS "Values divider" setting, FootprintConfig.valuesDivider):
 * 1000 (default, unchanged) applies the K/M/B compaction above; 1 disables
 * ALL compaction and returns the raw number instead (5300 -> "5300", not
 * "5.3K") — no behavior change for any of the many 1-arg call sites in this
 * file (totals band, stats strip, magnifier) that never pass a second arg.
 */
export function formatCellValue(n: number, divider: 1 | 1000 = 1000): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (divider === 1) {
    if (abs === 0) return '0';
    return `${sign}${abs.toFixed(Number.isInteger(abs) || abs >= 100 ? 0 : 1)}`;
  }
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1000) {
    const k = (abs / 1000).toFixed(1);
    const stripped = k.endsWith('.0') ? k.slice(0, -2) : k;
    return `${sign}${stripped}K`;
  }
  if (abs >= 1) return `${sign}${abs.toFixed(abs >= 100 ? 0 : 1)}`;
  return abs === 0 ? '0' : `${sign}${abs.toFixed(2)}`;
}

/**
 * Nth-percentile value of a numeric array via the nearest-rank method (no
 * interpolation — simple, deterministic, and matches ATAS's own coarse
 * percentile behavior closely enough for a display-only normalization cap).
 * Returns 0 for an empty array. `percentile` is clamped to [0, 100].
 */
export function computePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const clampedPct = Math.min(100, Math.max(0, percentile));
  const rank = Math.ceil((clampedPct / 100) * sorted.length) - 1;
  const idx = Math.min(sorted.length - 1, Math.max(0, rank));
  return sorted[idx];
}

// ─── Merged bin (row-merge prep) ────────────────────────────────────────────

interface MergedBin {
  /** Lowest binPrice contributing to this merged row (used as the sort/draw key). */
  binPrice: number;
  buyVol: number;
  sellVol: number;
  /** Sum of per-bin print counts across all bins merged into this row. */
  trades: number;
}

function mergeBins(bins: FlowBin[], factor: 1 | 2 | 4, rowSize: number): MergedBin[] {
  if (factor === 1) {
    return bins.map((b) => ({ binPrice: b.binPrice, buyVol: b.buyVol, sellVol: b.sellVol, trades: b.trades }));
  }
  const groupSize = rowSize * factor;
  const groups = new Map<number, MergedBin>();
  for (const bin of bins) {
    const groupKey = Math.floor(bin.binPrice / groupSize) * groupSize;
    let group = groups.get(groupKey);
    if (!group) {
      group = { binPrice: groupKey, buyVol: 0, sellVol: 0, trades: 0 };
      groups.set(groupKey, group);
    }
    group.buyVol += bin.buyVol;
    group.sellVol += bin.sellVol;
    group.trades += bin.trades;
  }
  return Array.from(groups.values()).sort((a, b) => a.binPrice - b.binPrice);
}

// ─── Imbalance presets ───────────────────────────────────────────────────────

/** Resolved concrete thresholds for one of the 3 opinionated imbalance presets. */
export interface ResolvedImbalanceConfig {
  imbalanceRatio: number;
  imbalanceMinVolPct: number;
  stackedMin: number;
  imbalanceStackedOnly: boolean;
}

/**
 * Resolve an `ImbalancePreset` name to its concrete threshold tuple. Pure —
 * no data dependency — so callers (OrderFlowControls) can spread the result
 * straight into a `FootprintConfig` update.
 *
 * - 'standard': 1.5x ratio, 0.5% dust filter, singles highlighted.
 * - 'strict': 3.0x ratio, same dust filter, singles highlighted.
 * - 'stacked': same thresholds as 'standard', but only runs of >= stackedMin
 *   consecutive same-side imbalances are highlighted per-cell (isolated
 *   singles are suppressed — see `PreparedCandleDraw.imbalances[i].highlighted`).
 */
export function resolveImbalancePreset(preset: ImbalancePreset): ResolvedImbalanceConfig {
  switch (preset) {
    case 'strict':
      return {
        imbalanceRatio: STRICT_IMBALANCE_RATIO,
        imbalanceMinVolPct: DEFAULT_IMBALANCE_MIN_VOL_PCT,
        stackedMin: DEFAULT_STACKED_MIN,
        imbalanceStackedOnly: false,
      };
    case 'stacked':
      return {
        imbalanceRatio: STANDARD_IMBALANCE_RATIO,
        imbalanceMinVolPct: DEFAULT_IMBALANCE_MIN_VOL_PCT,
        stackedMin: DEFAULT_STACKED_MIN,
        imbalanceStackedOnly: true,
      };
    case 'standard':
    default:
      return {
        imbalanceRatio: STANDARD_IMBALANCE_RATIO,
        imbalanceMinVolPct: DEFAULT_IMBALANCE_MIN_VOL_PCT,
        stackedMin: DEFAULT_STACKED_MIN,
        imbalanceStackedOnly: false,
      };
  }
}

// ─── Imbalance detection ────────────────────────────────────────────────────

export type ImbalanceSide = 'buy' | 'sell' | null;

interface RowImbalance {
  /** 'buy' = ask at this level dominates bid one level down; 'sell' = inverse. */
  side: ImbalanceSide;
  /**
   * Whether this row's imbalance should actually be painted (per-cell
   * outline/bold text). Equal to `side !== null` for Standard/Strict.
   * For the Stacked preset (`config.imbalanceStackedOnly`), this is only
   * true when the row belongs to a run of >= stackedMin consecutive
   * same-side imbalances — set by `applyStackedOnlyFilter` after
   * `detectStackedZones` runs.
   */
  highlighted: boolean;
}

/**
 * Diagonal imbalance: for each row N, compare its buyVol (ask) against row
 * N-1's sellVol (bid) and vice versa. A row qualifies only if its own volume
 * clears the dust filter (imbalanceMinVolPct of the candle's total volume).
 */
function detectImbalances(
  merged: MergedBin[],
  totalVol: number,
  config: FootprintConfig,
): RowImbalance[] {
  const minVol = totalVol * (config.imbalanceMinVolPct / 100);
  // ATAS-parity extras (default values reproduce today's exact behavior —
  // see FootprintConfig's doc comments for imbalanceMinDiff/imbalanceIgnoreZeros):
  const minDiff = config.imbalanceMinDiff ?? 0;
  const ignoreZeros = config.imbalanceIgnoreZeros ?? true;
  const out: RowImbalance[] = new Array(merged.length).fill(null).map(() => ({ side: null, highlighted: false }));

  for (let i = 0; i < merged.length; i++) {
    const row = merged[i];
    const rowVol = row.buyVol + row.sellVol;
    if (rowVol < minVol) continue;

    // Ask (buyVol) at level i vs bid (sellVol) at level i-1 → buy-side imbalance.
    // The zero-opposite-side guard (`ignoreZeros` — default true, today's
    // exact pre-existing behavior): without it, a reference row with zero
    // volume would make ANY buyVol trivially "infinite ratio" and always
    // flag — see imbalancePresets.test.ts. Setting imbalanceIgnoreZeros=false
    // lifts that guard (ATAS "don't ignore zero values"): a fully one-sided
    // level (opposite side exactly 0) now qualifies on its own, subject to
    // the same dust floor (`minVol`, already checked above) and imbalanceMinDiff.
    if (i > 0) {
      const below = merged[i - 1];
      const hasReference = below.sellVol > 0;
      const ratioOk = hasReference
        ? row.buyVol >= below.sellVol * config.imbalanceRatio
        : !ignoreZeros && row.buyVol > 0;
      const diffOk = minDiff <= 0 || Math.abs(row.buyVol - below.sellVol) >= minDiff;
      if (ratioOk && diffOk) {
        out[i].side = 'buy';
      }
    }
    // Bid (sellVol) at level i vs ask (buyVol) at level i+1 → sell-side imbalance.
    if (i < merged.length - 1) {
      const above = merged[i + 1];
      const hasReference = above.buyVol > 0;
      const ratioOk = hasReference
        ? row.sellVol >= above.buyVol * config.imbalanceRatio
        : !ignoreZeros && row.sellVol > 0;
      const diffOk = minDiff <= 0 || Math.abs(row.sellVol - above.buyVol) >= minDiff;
      if (ratioOk && diffOk) {
        // A row can only carry one imbalance flag; sell-side check runs second
        // so a row imbalanced on both diagonals (rare, thin books) keeps 'buy'.
        if (out[i].side === null) out[i].side = 'sell';
      }
    }
  }

  // Standard/Strict: every detected imbalance is highlighted (singles included).
  // Stacked: highlighted is set later by applyStackedOnlyFilter, once the
  // stacked-run membership is known — default false here for that preset.
  if (!config.imbalanceStackedOnly) {
    for (const entry of out) {
      entry.highlighted = entry.side !== null;
    }
  }
  return out;
}

/**
 * For the 'stacked' preset only: mark `highlighted = true` on exactly the
 * rows that belong to a qualifying stacked run (>= stackedMin consecutive
 * same-side imbalances). Isolated singles (runs shorter than stackedMin,
 * including runs of 1) stay `highlighted = false` even though `side` is
 * still set (side is retained for stacked-zone-band computation elsewhere).
 */
function applyStackedOnlyFilter(imbalances: RowImbalance[], zones: StackedZone[]): void {
  for (const zone of zones) {
    for (let i = zone.fromIdx; i <= zone.toIdx; i++) {
      if (imbalances[i]) imbalances[i].highlighted = true;
    }
  }
}

/** A contiguous run of `stackedMin`+ same-side imbalanced rows. */
export interface StackedZone {
  side: 'buy' | 'sell';
  /** Index range (inclusive) into the merged/imbalance arrays. */
  fromIdx: number;
  toIdx: number;
}

function detectStackedZones(imbalances: RowImbalance[], stackedMin: number): StackedZone[] {
  const zones: StackedZone[] = [];
  let runStart = -1;
  let runSide: ImbalanceSide = null;

  const flush = (endIdx: number) => {
    if (runSide && runStart >= 0 && endIdx - runStart + 1 >= stackedMin) {
      zones.push({ side: runSide, fromIdx: runStart, toIdx: endIdx });
    }
    runStart = -1;
    runSide = null;
  };

  for (let i = 0; i < imbalances.length; i++) {
    const side = imbalances[i].side;
    if (side !== null && side === runSide) {
      // continue run
    } else {
      flush(i - 1);
      if (side !== null) {
        runStart = i;
        runSide = side;
      }
    }
  }
  flush(imbalances.length - 1);
  return zones;
}

// ─── Prepared per-candle draw structure ─────────────────────────────────────

export interface PreparedCandleDraw {
  time: number;
  merged: MergedBin[];
  mergeFactor: 1 | 2 | 4;
  imbalances: RowImbalance[];
  stackedZones: StackedZone[];
  totalVol: number;
  delta: number;
  /** binPrice of the merged row containing the candle's POC bin, or null. */
  pocBinPrice: number | null;
  /** Max single-row volume across the (merged) rows — for delta-shading normalization. */
  maxRowVol: number;
  /** Max single-SIDE volume (max(buyVol, sellVol) per row) across the merged rows — histogram-layout bidAsk normalization (F1). */
  maxRowSideVol: number;
  /** Max |delta| across the merged rows — histogram-layout delta/volumeDelta normalization (F1). */
  maxAbsDelta: number;
  /** Max trades count across the merged rows — histogram-layout 'trades' normalization (F1). */
  maxTrades: number;
  /** binPrice of the merged row at the Value Area High boundary, or null (only computed when config.showValueArea — F4). */
  vahBinPrice: number | null;
  /** binPrice of the merged row at the Value Area Low boundary, or null (only computed when config.showValueArea — F4). */
  valBinPrice: number | null;
}

/**
 * Build the prepared draw structure for one candle. Called ONLY on data/config
 * dirty (store.onChange or config change) — never on pan/zoom frames.
 */
export function prepareCandleDraw(
  candle: FlowCandleView,
  rowSize: number,
  mergeFactor: 1 | 2 | 4,
  config: FootprintConfig,
): PreparedCandleDraw {
  const merged = mergeBins(candle.bins, mergeFactor, rowSize);
  const imbalances = detectImbalances(merged, candle.totalVol, config);
  const stackedZones = detectStackedZones(imbalances, config.stackedMin);
  if (config.imbalanceStackedOnly) {
    applyStackedOnlyFilter(imbalances, stackedZones);
  }

  let maxRowVol = 0;
  let maxRowSideVol = 0;
  let maxAbsDelta = 0;
  let maxTrades = 0;
  let pocBinPrice: number | null = null;
  let pocVol = -1;
  for (const row of merged) {
    const rowVol = row.buyVol + row.sellVol;
    if (rowVol > maxRowVol) maxRowVol = rowVol;
    const rowSideVol = Math.max(row.buyVol, row.sellVol);
    if (rowSideVol > maxRowSideVol) maxRowSideVol = rowSideVol;
    const rowAbsDelta = Math.abs(row.buyVol - row.sellVol);
    if (rowAbsDelta > maxAbsDelta) maxAbsDelta = rowAbsDelta;
    if (row.trades > maxTrades) maxTrades = row.trades;
    if (rowVol > pocVol) {
      pocVol = rowVol;
      pocBinPrice = row.binPrice;
    }
  }

  // ATAS "Proportion Settings" upper percentile: clamp the normalization
  // ceilings computed above at the Nth percentile of this candle's OWN row
  // values instead of the raw max, so a single outlier print can't flatten
  // every other row's histogram-bar width / heat alpha (see
  // FootprintConfig.proportionUpperPercentile's doc comment). 100 (default)
  // is a no-op that skips this block entirely — the loop above already IS
  // the raw max, byte-identical to pre-existing behavior.
  if (config.proportionUpperPercentile < 100 && merged.length > 0) {
    const rowVols = merged.map((r) => r.buyVol + r.sellVol);
    const rowSideVols = merged.map((r) => Math.max(r.buyVol, r.sellVol));
    const absDeltas = merged.map((r) => Math.abs(r.buyVol - r.sellVol));
    const tradeCounts = merged.map((r) => r.trades);
    const pct = config.proportionUpperPercentile;
    const clampedRowVol = computePercentile(rowVols, pct);
    const clampedRowSideVol = computePercentile(rowSideVols, pct);
    const clampedAbsDelta = computePercentile(absDeltas, pct);
    const clampedTrades = computePercentile(tradeCounts, pct);
    if (clampedRowVol > 0) maxRowVol = clampedRowVol;
    if (clampedRowSideVol > 0) maxRowSideVol = clampedRowSideVol;
    if (clampedAbsDelta > 0) maxAbsDelta = clampedAbsDelta;
    if (clampedTrades > 0) maxTrades = clampedTrades;
  }

  // Per-bar Value Area (F4) — only computed when the toggle is on, since it's
  // an extra O(rows) walk on top of the loop above. Uses the same shared
  // `computeValueArea` helper as volumeProfile.ts (single source of truth for
  // the 70%-of-volume accumulate-from-POC algorithm).
  let vahBinPrice: number | null = null;
  let valBinPrice: number | null = null;
  if (config.showValueArea && merged.length > 0) {
    const va = computeValueArea(merged.map((r) => ({ price: r.binPrice, vol: r.buyVol + r.sellVol })));
    vahBinPrice = va.vahIdx === null ? null : merged[va.vahIdx].binPrice;
    valBinPrice = va.valIdx === null ? null : merged[va.valIdx].binPrice;
  }

  return {
    time: candle.time,
    merged,
    mergeFactor,
    imbalances,
    stackedZones,
    totalVol: candle.totalVol,
    delta: candle.delta,
    pocBinPrice,
    maxRowVol,
    maxRowSideVol,
    maxAbsDelta,
    maxTrades,
    vahBinPrice,
    valBinPrice,
  };
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

export interface CandleProjection {
  /** Canvas x of the candle's horizontal center. */
  centerX: number;
  /** Candle footprint width in canvas px (both bid+ask columns combined). */
  candleWidthPx: number;
  /** Maps a price to canvas y. Returns null if out of the series' resolvable range. */
  priceToY: (price: number) => number | null;
  /** Canvas y of the row's vertical extent for a given binPrice (top/bottom). */
  rowHeightPx: number;
  rowSize: number;
}

export interface FootprintDrawExtras {
  /** Live-edge canvas x — stacked zones extend right to here (or candle right edge if past it). */
  liveEdgeX: number;
  /** The latest candle's [low, high] — used to "kill" a stacked zone once price trades back through it. */
  latestCandleRange: { low: number; high: number } | null;
  /** Clip boundary — nothing should paint past this x (the price axis). */
  clipRightX: number;
  /**
   * This candle's actual OHLC prices (from the underlying candlestick series,
   * NOT derived from footprint bins) — draws the NT/MW-style skeleton strip
   * (hairline high/low wick + 5px open/close body) CENTERED on the column's
   * bid|ask seam when present. Optional: omitting it (existing callers,
   * magnifier popup) simply skips the skeleton — no behavior change for
   * those call sites.
   */
  ohlc?: { open: number; high: number; low: number; close: number };
  /**
   * F6 (stacked-zone first-revisit kill): given a candle's formation time
   * (seconds), returns the combined [low, high] range touched by ANY candle
   * STRICTLY AFTER that time — not just the single latest candle — so
   * `drawStackedZones` correctly kills a zone the first time price re-enters
   * its band, even when that happens on an older (non-latest) candle. Built
   * ONCE per data-dirty pass by FootprintLayer from the full loaded `bars`
   * array (a suffix hi/lo structure), never recomputed per frame. Optional —
   * callers that omit it (magnifier popup, single-candle draws, existing
   * tests) fall back to the previous "check only `latestCandleRange`"
   * behavior, unchanged.
   */
  touchedRangeSince?: (formationTimeSec: number) => { low: number; high: number } | null;
}

/**
 * Draw one candle's footprint. Caller is responsible for ctx.save/restore and
 * the try/finally transform-reset discipline (see FootprintLayer.tsx) — this
 * function only issues fill/stroke/text calls, no transform mutation.
 */
export function drawCandleFootprint(
  ctx: CanvasRenderingContext2D,
  prepared: PreparedCandleDraw,
  projection: CandleProjection,
  detail: FootprintDetailLevel,
  config: FootprintConfig,
  extras: FootprintDrawExtras,
): void {
  if (detail === 'hidden') return;
  if (prepared.merged.length === 0) return;

  const { centerX, candleWidthPx, priceToY, rowHeightPx, rowSize } = projection;
  const halfWidth = candleWidthPx / 2;
  const leftX = Math.max(0, centerX - halfWidth);
  const rightX = Math.min(extras.clipRightX, centerX + halfWidth);
  if (rightX <= leftX) return;

  // ATAS "Width to show text" (config.minCellPxForText, falls back to the
  // theme constant) — even at 'full' detail (forceFullDetail callers can
  // reach 'full' at ANY zoom), numbers stay hidden until the on-screen
  // candle is wide enough to fit them legibly. Evaluated fresh every draw
  // frame (candleWidthPx is a live projection value, never cached), so this
  // needs no FootprintLayer cache-invalidation wiring.
  const minTextPx = config.minCellPxForText ?? FOOTPRINT_MIN_CANDLE_WIDTH_FOR_TEXT;
  const showText = detail === 'full' && candleWidthPx >= minTextPx;
  const groupSize = rowSize * prepared.mergeFactor;
  // Auto font size by row height (ATAS/Exocharts parity) — computed once per
  // candle draw, not per-cell, since rowHeightPx is uniform across a
  // candle's rows at a given zoom (see computeCellFontSize).
  const cellFontSize = computeCellFontSize(rowHeightPx);

  // Precompute per-row screen geometry ONCE, then render in two passes below
  // (backgrounds, then skeleton, then text) — this guarantees paint order
  // regardless of cellMode, instead of relying on any particular mode's
  // background shape (e.g. bidAsk's center gutter) to keep the skeleton
  // visible.
  const rowGeometries: {
    row: MergedBin;
    top: number;
    height: number;
    isPoc: boolean;
    dimmed: boolean;
    imbalanceSide: ImbalanceSide;
  }[] = [];
  for (let i = 0; i < prepared.merged.length; i++) {
    const row = prepared.merged[i];
    const yTop = priceToY(row.binPrice + groupSize);
    const yBot = priceToY(row.binPrice);
    if (yTop === null || yBot === null) continue;

    const cellTop = Math.min(yTop, yBot);
    const cellHeight = Math.max(1, Math.abs(yBot - yTop));
    // Cull rows fully outside the vertical viewport handled by caller (FootprintLayer
    // culls candles by visible logical range; rows within a visible candle are cheap
    // enough to skip here without an extra viewport-height check).

    const isPoc = config.showPoc && prepared.pocBinPrice === row.binPrice;
    // Only rows marked `highlighted` get the visual accent — for the Stacked
    // preset this excludes isolated singles even though `side` is still set
    // (side stays available for stacked-zone-band computation elsewhere).
    const rowImbalance = prepared.imbalances[i];
    const imbalanceSide: ImbalanceSide = rowImbalance?.highlighted ? rowImbalance.side : null;

    // Value Area dimming (F4) — only meaningful when showValueArea produced
    // boundary indices for this candle; otherwise every row is "in" (no dim).
    const dimmed =
      config.showValueArea && prepared.vahBinPrice !== null && prepared.valBinPrice !== null
        ? row.binPrice < prepared.valBinPrice || row.binPrice > prepared.vahBinPrice
        : false;

    rowGeometries.push({ row, top: cellTop, height: cellHeight, isPoc, dimmed, imbalanceSide });
  }

  // Pass 1 — cell backgrounds (POC bands, histogram/flat fills, VA dimming)
  // for every row.
  for (const rg of rowGeometries) {
    drawCellBackground(ctx, {
      leftX,
      rightX,
      top: rg.top,
      height: rg.height,
      row: rg.row,
      cellMode: config.cellMode,
      layout: config.layout,
      colorScheme: config.colorScheme,
      maxRowVol: prepared.maxRowVol,
      maxRowSideVol: prepared.maxRowSideVol,
      maxAbsDelta: prepared.maxAbsDelta,
      maxTrades: prepared.maxTrades,
      isPoc: rg.isPoc,
      dimmed: rg.dimmed,
    });
  }

  // Candle skeleton strip (NT/MW convention) — drawn AFTER cell backgrounds
  // but BEFORE cell text, centered on the column's bid|ask seam, so it reads
  // as a real mini-candle against the surrounding bid/ask fills (never
  // painted over) while the per-cell numbers stay the topmost layer. Only at
  // 'full' detail (showText) — same gating as the numbers themselves, since
  // the skeleton exists to orient the trader once individual bid/ask cells
  // are legible.
  if (showText && extras.ohlc) {
    drawCandleSkeleton(ctx, extras.ohlc, { centerX, priceToY });
  }

  // Pass 2 — cell text (numbers), on top of both backgrounds and the skeleton.
  for (const rg of rowGeometries) {
    drawCellText(ctx, {
      leftX,
      rightX,
      top: rg.top,
      height: rg.height,
      row: rg.row,
      cellMode: config.cellMode,
      showText,
      imbalanceSide: rg.imbalanceSide,
      fontSize: cellFontSize,
      valuesDivider: config.valuesDivider,
      imbalanceBold: config.imbalanceBold,
    });
  }

  if (config.showValueArea) {
    drawValueAreaHairlines(ctx, prepared, projection, leftX, rightX);
  }

  drawStackedZones(ctx, prepared, projection, extras);
}

/**
 * Draw one candle's skeleton: a hairline high→low wick plus a 5px open/close
 * body strip, both CENTERED on the column's bid|ask seam (NT/MW convention,
 * adapted to sit between the bid and ask columns rather than at the left
 * edge, per Elad's live-view feedback — the seam is where a trader's eye
 * already rests when scanning bid vs ask). Green (#22c55e) when close >=
 * open, red (#dc2626) otherwise — reuses the existing buy/sell theme tokens
 * (no new hexes), rendered at high alpha with a solid-color 1px border so
 * the mini-candle reads clearly against both red and green cell fills.
 */
function drawCandleSkeleton(
  ctx: CanvasRenderingContext2D,
  ohlc: { open: number; high: number; low: number; close: number },
  geo: { centerX: number; priceToY: (price: number) => number | null },
): void {
  const { centerX, priceToY } = geo;
  const yHigh = priceToY(ohlc.high);
  const yLow = priceToY(ohlc.low);
  const yOpen = priceToY(ohlc.open);
  const yClose = priceToY(ohlc.close);
  if (yHigh === null || yLow === null || yOpen === null || yClose === null) return;

  const isUp = ohlc.close >= ohlc.open;
  const baseColor = isUp ? FOOTPRINT_BUY_COLOR : FOOTPRINT_SELL_COLOR;
  const wickColor = mixAlphaValue(baseColor, FOOTPRINT_SKELETON_WICK_ALPHA, FOOTPRINT_SKELETON_WICK_ALPHA, 0);
  const bodyFillColor = mixAlphaValue(baseColor, FOOTPRINT_SKELETON_BODY_FILL_ALPHA, FOOTPRINT_SKELETON_BODY_FILL_ALPHA, 0);

  // Hairline wick spanning the full high→low range, centered on the seam.
  ctx.strokeStyle = wickColor;
  ctx.lineWidth = FOOTPRINT_SKELETON_WICK_WIDTH_PX;
  ctx.beginPath();
  ctx.moveTo(centerX, Math.min(yHigh, yLow));
  ctx.lineTo(centerX, Math.max(yHigh, yLow));
  ctx.stroke();

  // 5px open/close body strip, centered on the same seam — filled at high
  // alpha plus a full-saturation (darker-reading) 1px border.
  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
  const bodyLeft = centerX - FOOTPRINT_SKELETON_BODY_WIDTH_PX / 2;
  ctx.fillStyle = bodyFillColor;
  ctx.fillRect(bodyLeft, bodyTop, FOOTPRINT_SKELETON_BODY_WIDTH_PX, bodyHeight);
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(bodyLeft + 0.5, bodyTop + 0.5, FOOTPRINT_SKELETON_BODY_WIDTH_PX - 1, Math.max(0, bodyHeight - 1));
}

interface DrawCellBackgroundArgs {
  leftX: number;
  rightX: number;
  top: number;
  height: number;
  row: MergedBin;
  cellMode: FootprintCellMode;
  /** Cell rendering layout — 'histogram' replaces the flat background wash with per-row volume bars (F1). */
  layout: FootprintLayout;
  /** Cell background color scheme — 'delta' (default) preserves today's exact per-cellMode shading (F2). */
  colorScheme: FootprintColorScheme;
  maxRowVol: number;
  /** Max single-SIDE volume across the candle's rows — bidAsk histogram normalization (F1). */
  maxRowSideVol: number;
  /** Max |delta| across the candle's rows — delta/volumeDelta histogram normalization (F1). */
  maxAbsDelta: number;
  /** Max trades count across the candle's rows — 'trades' histogram normalization (F1). */
  maxTrades: number;
  isPoc: boolean;
  /** Value Area dimming (F4) — true when this row's price is outside the candle's VAH/VAL band. */
  dimmed: boolean;
}

interface DrawCellTextArgs {
  leftX: number;
  rightX: number;
  top: number;
  height: number;
  row: MergedBin;
  cellMode: FootprintCellMode;
  showText: boolean;
  imbalanceSide: ImbalanceSide;
  /** Auto font size (px) for this draw pass — see computeCellFontSize. */
  fontSize: number;
  /** "Values divider" (config.valuesDivider) — 1000 (default) K-compacts cell numbers, 1 shows raw values. */
  valuesDivider: 1 | 1000;
  /** Bold the winning number's text on an imbalanced row (config.imbalanceBold). Default true. */
  imbalanceBold: boolean;
}

/**
 * Cell BACKGROUND pass only (POC band, histogram/flat fill, Value Area dim).
 * Split from the text pass (`drawCellText` below) so `drawCandleFootprint`
 * can run ALL rows' backgrounds, then the candle skeleton, then ALL rows'
 * text — guaranteeing the skeleton paints above every background and below
 * every number regardless of cellMode (previously relied on the skeleton
 * drawing before the single combined background+text pass, which worked
 * only where the background left a gap, e.g. bidAsk's center gutter).
 */
function drawCellBackground(ctx: CanvasRenderingContext2D, args: DrawCellBackgroundArgs): void {
  const {
    leftX, rightX, top, height, row, cellMode, layout, colorScheme,
    maxRowVol, maxRowSideVol, maxAbsDelta, maxTrades, isPoc, dimmed,
  } = args;
  const width = rightX - leftX;
  const midX = leftX + width / 2;
  // Half the bidAsk center gutter — background fills inset symmetrically
  // from the midline by this amount (see FOOTPRINT_CELL_GUTTER_PX).
  const halfGutter = FOOTPRINT_CELL_GUTTER_PX / 2;
  const delta = row.buyVol - row.sellVol;
  const rowVol = row.buyVol + row.sellVol;
  const isEmpty = rowVol <= 0;

  // ── POC band (drawn first, behind everything else in the cell) ───────────
  // Solid gold top/bottom rule (FOOTPRINT_POC_COLOR) over the tinted fill
  // (FOOTPRINT_POC_BG) so the Point-of-Control row reads as a distinct gold
  // band even when the cell's own delta/volume shading is faint. A
  // zero-volume row can never BE the POC (prepareCandleDraw only assigns
  // pocBinPrice from rows with positive volume), but the guard is kept
  // explicit here so this function's "no fill for empty rows" contract
  // holds even if that upstream invariant ever changes.
  if (isPoc && !isEmpty) {
    ctx.fillStyle = FOOTPRINT_POC_BG;
    ctx.fillRect(leftX, top, width, height);
    ctx.strokeStyle = FOOTPRINT_POC_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftX, top + 0.5);
    ctx.lineTo(rightX, top + 0.5);
    ctx.moveTo(leftX, top + height - 0.5);
    ctx.lineTo(rightX, top + height - 0.5);
    ctx.stroke();
  }

  // ── Cell background: histogram bars (F1) OR flat shading (F2 dispatch) ──
  // Note: the shaded (zoomed-out) stage never reaches this per-cell function
  // with showText=true — it draws its own delta-shading independently of
  // cellMode upstream in drawCandleFootprint/FootprintLayer.
  //
  // Zero-volume rows get NO fill in ANY mode (ATAS parity) — the chart
  // background shows through instead of a wash of neutral/red/green tint.
  // Real footprint data rarely produces a truly empty MERGED row (each row
  // groups >=1 source bin that had a trade), but a merge group spanning a
  // price band with no prints at all (sparse tape, wide rowSize) can still
  // be empty — this guard is what stops those rows from painting.
  if (!isEmpty) {
    if (layout === 'histogram') {
      drawHistogramBar(ctx, {
        leftX, rightX, top, height, row, cellMode, delta, rowVol,
        maxRowSideVol, maxAbsDelta, maxTrades, maxRowVol, midX, halfGutter,
      });
    } else {
      const bg = resolveCellBackground(colorScheme, cellMode, delta, rowVol, maxRowVol);
      if (bg.kind === 'single') {
        ctx.fillStyle = bg.fill;
        ctx.fillRect(leftX, top, width, height);
      } else {
        // 'split' (bidAsk + 'delta' colorScheme only) — sell tint left half,
        // buy tint right half, each inset from the midline by halfGutter so a
        // small visual gutter separates the bid and ask columns
        // (FOOTPRINT_CELL_GUTTER_PX).
        const halfCellWidth = Math.max(0, width / 2 - halfGutter);
        ctx.fillStyle = bg.sellFill;
        ctx.fillRect(leftX, top, halfCellWidth, height);
        ctx.fillStyle = bg.buyFill;
        ctx.fillRect(midX + halfGutter, top, halfCellWidth, height);
      }
    }

    // Value Area dim overlay (F4) — painted over whatever background/bar was
    // just drawn, so rows outside the candle's 70%-volume band read as
    // visually de-emphasized without touching the POC band or imbalance text.
    if (dimmed) {
      ctx.fillStyle = VOLUME_PROFILE_VA_DIM_OUTSIDE_BG;
      ctx.fillRect(leftX, top, width, height);
    }
  }
}

/**
 * Cell TEXT pass only (the numbers) — see `drawCellBackground` above for why
 * this is split out. No outline draw for the imbalance accent (removed — the
 * old gold outline collided with the FINOTAUR gold POC identity); imbalance
 * is communicated purely via bold + recolored NUMBER text on the winning side.
 */
function drawCellText(ctx: CanvasRenderingContext2D, args: DrawCellTextArgs): void {
  const { leftX, rightX, top, height, row, cellMode, showText, imbalanceSide, fontSize, valuesDivider, imbalanceBold } = args;
  const width = rightX - leftX;
  const midX = leftX + width / 2;
  // Half the bidAsk center gutter — text anchors inset symmetrically from
  // the midline by this amount (see FOOTPRINT_CELL_GUTTER_PX).
  const halfGutter = FOOTPRINT_CELL_GUTTER_PX / 2;
  const delta = row.buyVol - row.sellVol;
  const rowVol = row.buyVol + row.sellVol;

  if (!showText || height < FOOTPRINT_MIN_ROW_HEIGHT_FOR_TEXT) return;

  const textY = top + height / 2;
  const boldSuffix = imbalanceSide && imbalanceBold ? 'bold ' : '';

  if (cellMode === 'bidAsk') {
    // Professional convention (ATAS/Exocharts/NinjaTrader): regular numbers
    // render in NEUTRAL text; color+bold is reserved strictly for the
    // imbalanced winning side. Sell (bid) text is only recolored bright-red
    // when THIS row's imbalance side is 'sell'; buy (ask) text only
    // recolored bright-green when the side is 'buy'. Text anchors inset from
    // the midline by halfGutter to match the background gutter.
    ctx.font = `${boldSuffix}${fontSize}px ${FOOTPRINT_FONT_FAMILY}`;
    ctx.fillStyle = imbalanceSide === 'sell' ? FOOTPRINT_SELL_COLOR_BRIGHT : FOOTPRINT_NEUTRAL_TEXT;
    ctx.textAlign = 'right';
    ctx.fillText(formatCellValue(row.sellVol, valuesDivider), midX - halfGutter - FOOTPRINT_CELL_PADDING_X, textY);

    ctx.fillStyle = imbalanceSide === 'buy' ? FOOTPRINT_BUY_COLOR_BRIGHT : FOOTPRINT_NEUTRAL_TEXT;
    ctx.textAlign = 'left';
    ctx.fillText(formatCellValue(row.buyVol, valuesDivider), midX + halfGutter + FOOTPRINT_CELL_PADDING_X, textY);
  } else if (cellMode === 'delta') {
    ctx.font = `${boldSuffix}${fontSize}px ${FOOTPRINT_FONT_FAMILY}`;
    ctx.fillStyle = delta === 0 ? FOOTPRINT_NEUTRAL_TEXT : delta > 0 ? FOOTPRINT_BUY_COLOR_BRIGHT : FOOTPRINT_SELL_COLOR_BRIGHT;
    ctx.textAlign = 'center';
    ctx.fillText(formatCellValue(delta, valuesDivider), midX, textY);
  } else if (cellMode === 'trades') {
    // ATAS-style "number of trades" mode — count of prints per level, neutral
    // shading + neutral text (no directional color; a print count has no sign).
    ctx.font = `${fontSize}px ${FOOTPRINT_FONT_FAMILY}`;
    ctx.fillStyle = FOOTPRINT_NEUTRAL_TEXT;
    ctx.textAlign = 'center';
    ctx.fillText(formatCellValue(row.trades, valuesDivider), midX, textY);
  } else if (cellMode === 'volumeDelta') {
    // Two values per cell: total volume (neutral) on the left half, signed
    // delta (red/green by sign) on the right half — e.g. "153.2  +12.4".
    ctx.font = `${fontSize}px ${FOOTPRINT_FONT_FAMILY}`;
    ctx.fillStyle = FOOTPRINT_NEUTRAL_TEXT;
    ctx.textAlign = 'right';
    ctx.fillText(formatCellValue(rowVol, valuesDivider), midX - FOOTPRINT_CELL_PADDING_X, textY);

    const deltaSign = delta > 0 ? '+' : '';
    ctx.fillStyle = delta === 0 ? FOOTPRINT_NEUTRAL_TEXT : delta > 0 ? FOOTPRINT_BUY_COLOR_BRIGHT : FOOTPRINT_SELL_COLOR_BRIGHT;
    ctx.textAlign = 'left';
    ctx.fillText(`${deltaSign}${formatCellValue(delta, valuesDivider)}`, midX + FOOTPRINT_CELL_PADDING_X, textY);
  } else {
    // 'volume' — neutral shading AND neutral text (pro convention: a plain
    // volume footprint carries no directional signal; delta belongs to the
    // delta-bearing modes above, not to the raw volume count).
    ctx.font = `${fontSize}px ${FOOTPRINT_FONT_FAMILY}`;
    ctx.fillStyle = FOOTPRINT_NEUTRAL_TEXT;
    ctx.textAlign = 'center';
    ctx.fillText(formatCellValue(rowVol, valuesDivider), midX, textY);
  }
  ctx.textAlign = 'left'; // restore canvas default so callers aren't surprised
}

/** Linearly mix two rgba() color strings by `t` in [0,1] — used for delta-magnitude shading. */
function mixAlpha(colorLo: string, colorHi: string, t: number): string {
  // Both inputs are `rgba(r, g, b, a)` with the same r/g/b — only alpha differs
  // in practice (see FOOTPRINT_BUY_BG vs FOOTPRINT_BUY_BG_STRONG), so a cheap
  // alpha-only interpolation avoids a full color-parse for a per-cell hot path.
  const parse = (c: string): [number, number, number, number] => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return [0, 0, 0, 1];
    const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
  };
  const [r, g, b, aLo] = parse(colorLo);
  const [, , , aHi] = parse(colorHi);
  const a = aLo + (aHi - aLo) * t;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Build an rgba() fill from a `#rrggbb` hex color and two alpha endpoints,
 * linearly interpolated by `t` in [0,1] — the bidAsk-mode counterpart to
 * mixAlpha above, used when the base color is a theme hex constant
 * (FOOTPRINT_BUY_COLOR/FOOTPRINT_SELL_COLOR) rather than an existing
 * rgba() pair with only alpha differing.
 */
function mixAlphaValue(hexColor: string, alphaLo: number, alphaHi: number, t: number): string {
  const m = hexColor.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  const r = m ? parseInt(m[1], 16) : 0;
  const g = m ? parseInt(m[2], 16) : 0;
  const b = m ? parseInt(m[3], 16) : 0;
  const a = alphaLo + (alphaHi - alphaLo) * t;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ─── Color-scheme dispatcher (PR 3, F2) ─────────────────────────────────────

type CellBackground =
  | { kind: 'single'; fill: string }
  | { kind: 'split'; sellFill: string; buyFill: string };

/**
 * Resolve one row's cell background per the active `colorScheme`:
 * - 'delta' (default): EXACT pre-PR-3 behavior — background varies by
 *   `cellMode` exactly as it always has (byte-identical decisions, see the
 *   regression test in footprintRender.test.ts). 'bidAsk' is the only mode
 *   that splits into two halves; every other mode fills the whole cell.
 * - 'volumeHeat': single neutral/gold heat ramp, alpha scaled by this row's
 *   total volume relative to the candle's busiest row — independent of
 *   buy/sell sign and of `cellMode` (always a full-cell single fill, even
 *   for 'bidAsk', since the ramp carries no directional meaning to split on).
 * - 'solid': fixed weak uniform background for every non-empty cell,
 *   regardless of `cellMode` or magnitude.
 */
function resolveCellBackground(
  colorScheme: FootprintColorScheme,
  cellMode: FootprintCellMode,
  delta: number,
  rowVol: number,
  maxRowVol: number,
): CellBackground {
  if (colorScheme === 'volumeHeat') {
    const volMagnitude = maxRowVol > 0 ? Math.min(1, rowVol / maxRowVol) : 0;
    return {
      kind: 'single',
      fill: mixAlphaValue(FOOTPRINT_VOLUME_HEAT_COLOR, FOOTPRINT_VOLUME_HEAT_WEAK_ALPHA, FOOTPRINT_VOLUME_HEAT_STRONG_ALPHA, volMagnitude),
    };
  }
  if (colorScheme === 'solid') {
    return { kind: 'single', fill: FOOTPRINT_SOLID_SCHEME_BG };
  }

  // 'delta' — EXACT current per-cellMode behavior (golden path, unchanged).
  const magnitude = maxRowVol > 0 ? Math.min(1, Math.abs(delta) / maxRowVol) : 0;
  const volMagnitude = maxRowVol > 0 ? Math.min(1, rowVol / maxRowVol) : 0;

  if (cellMode === 'delta') {
    const bg = delta === 0
      ? FOOTPRINT_DELTA_NEUTRAL_DARK
      : delta > 0
        ? mixAlpha(FOOTPRINT_BUY_BG, FOOTPRINT_BUY_BG_STRONG, magnitude)
        : mixAlpha(FOOTPRINT_SELL_BG, FOOTPRINT_SELL_BG_STRONG, magnitude);
    return { kind: 'single', fill: bg };
  }
  if (cellMode === 'volume' || cellMode === 'trades' || cellMode === 'volumeDelta') {
    return { kind: 'single', fill: FOOTPRINT_NEUTRAL_BG };
  }
  // 'bidAsk' — split background: sell tint left half, buy tint right half.
  // Alpha keyed by this row's total volume relative to the bar's busiest row
  // (volMagnitude), weak→strong endpoints from the theme.
  return {
    kind: 'split',
    sellFill: mixAlphaValue(FOOTPRINT_SELL_COLOR, FOOTPRINT_BIDASK_BG_WEAK_ALPHA, FOOTPRINT_BIDASK_BG_STRONG_ALPHA, volMagnitude),
    buyFill: mixAlphaValue(FOOTPRINT_BUY_COLOR, FOOTPRINT_BIDASK_BG_WEAK_ALPHA, FOOTPRINT_BIDASK_BG_STRONG_ALPHA, volMagnitude),
  };
}

// ─── Histogram-in-cell layout (PR 3, F1) ────────────────────────────────────

/**
 * Bar width (px) for a histogram cell: |value| as a fraction of `maxAbs`
 * (clamped to [0,1] — a candle's OWN maximum can never be exceeded by
 * construction, but the clamp guards against float drift), scaled to
 * `availWidth`. Pure — exported for direct unit coverage of the
 * proportional + capped contract.
 */
export function histogramBarWidth(value: number, maxAbs: number, availWidth: number): number {
  if (maxAbs <= 0 || availWidth <= 0) return 0;
  const frac = Math.min(1, Math.abs(value) / maxAbs);
  return frac * availWidth;
}

interface DrawHistogramBarArgs {
  leftX: number;
  rightX: number;
  top: number;
  height: number;
  row: MergedBin;
  cellMode: FootprintCellMode;
  delta: number;
  rowVol: number;
  maxRowSideVol: number;
  maxAbsDelta: number;
  maxTrades: number;
  maxRowVol: number;
  midX: number;
  halfGutter: number;
}

/**
 * Draw one row's histogram bar(s), replacing the flat background wash when
 * `config.layout === 'histogram'`. Two shapes:
 * - bidAsk: two-sided — sell bar grows LEFTWARD from the center gutter, buy
 *   bar grows RIGHTWARD, each capped at the half-cell width.
 * - every other cellMode (single-value content): one bar growing from the
 *   cell's LEFT edge. delta/volumeDelta are delta-signed (colored by sign);
 *   volume/trades are neutral (no direction to a raw count).
 */
function drawHistogramBar(ctx: CanvasRenderingContext2D, args: DrawHistogramBarArgs): void {
  const { leftX, rightX, top, height, row, cellMode, delta, rowVol, maxRowSideVol, maxAbsDelta, maxTrades, maxRowVol, midX, halfGutter } = args;

  if (cellMode === 'bidAsk') {
    const halfCellWidth = Math.max(0, (rightX - leftX) / 2 - halfGutter);
    const sellW = histogramBarWidth(row.sellVol, maxRowSideVol, halfCellWidth);
    const buyW = histogramBarWidth(row.buyVol, maxRowSideVol, halfCellWidth);
    ctx.fillStyle = FOOTPRINT_HISTO_SELL_FILL;
    ctx.fillRect(midX - halfGutter - sellW, top, sellW, height);
    ctx.fillStyle = FOOTPRINT_HISTO_BUY_FILL;
    ctx.fillRect(midX + halfGutter, top, buyW, height);
    return;
  }

  const availWidth = rightX - leftX;
  let value: number;
  let maxAbs: number;
  let signed: boolean;
  if (cellMode === 'delta' || cellMode === 'volumeDelta') {
    value = delta;
    maxAbs = maxAbsDelta;
    signed = true;
  } else if (cellMode === 'trades') {
    value = row.trades;
    maxAbs = maxTrades;
    signed = false;
  } else {
    // 'volume'
    value = rowVol;
    maxAbs = maxRowVol;
    signed = false;
  }

  const w = histogramBarWidth(value, maxAbs, availWidth);
  const fill = !signed
    ? FOOTPRINT_HISTO_NEUTRAL_FILL
    : value === 0
      ? FOOTPRINT_HISTO_NEUTRAL_FILL
      : value > 0
        ? FOOTPRINT_HISTO_BUY_FILL
        : FOOTPRINT_HISTO_SELL_FILL;
  ctx.fillStyle = fill;
  ctx.fillRect(leftX, top, w, height);
}

// ─── Per-bar Value Area hairlines (PR 3, F4) ────────────────────────────────

/**
 * Draw subtle VAH/VAL boundary hairlines across a candle's cell columns —
 * dashed gold lines at the top edge of the VAH row and bottom edge of the
 * VAL row, reusing the Volume Profile overlay's own boundary tokens so the
 * per-bar VA reads as part of the same visual family. No-op when the candle
 * has no VA boundary indices (config.showValueArea off, or an empty candle).
 */
function drawValueAreaHairlines(
  ctx: CanvasRenderingContext2D,
  prepared: PreparedCandleDraw,
  projection: CandleProjection,
  leftX: number,
  rightX: number,
): void {
  if (prepared.vahBinPrice === null || prepared.valBinPrice === null) return;
  const { priceToY, rowSize } = projection;
  const groupSize = rowSize * prepared.mergeFactor;

  const yVah = priceToY(prepared.vahBinPrice + groupSize); // top edge of the VAH row
  const yVal = priceToY(prepared.valBinPrice); // bottom edge of the VAL row

  ctx.strokeStyle = VOLUME_PROFILE_VA_BOUNDARY_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash(VOLUME_PROFILE_VA_BOUNDARY_DASH);

  if (yVah !== null) {
    ctx.beginPath();
    ctx.moveTo(leftX, yVah + 0.5);
    ctx.lineTo(rightX, yVah + 0.5);
    ctx.stroke();
  }
  if (yVal !== null) {
    ctx.beginPath();
    ctx.moveTo(leftX, yVal - 0.5);
    ctx.lineTo(rightX, yVal - 0.5);
    ctx.stroke();
  }

  ctx.setLineDash([]); // restore canvas default so callers aren't surprised
}

// Totals band: two stacked mini-rows (Volume, Delta) pinned above the time
// axis. Kept as a standalone function (`drawTotalsRowAt`) rather than folded
// into `drawCandleFootprint` because it needs an explicit `top` y computed
// from time-axis geometry that the per-row cell loop above doesn't have —
// see FootprintLayer.tsx for how the two calls are sequenced per candle.
const TOTALS_ROW_HEIGHT = 12;
export const FOOTPRINT_TOTALS_BAND_HEIGHT = TOTALS_ROW_HEIGHT * 2;

// Stats-band row height — declared here (ahead of computeFootprintBandHeightPx
// below, which reads it via getEnabledStatsRowDefs's row count) rather than
// down by STATS_ROW_DEFS where the rest of the Cluster Statistics section
// lives, purely so the lexical-order lint rule doesn't flag a forward
// reference (the two are otherwise unrelated to placement).
const STATS_ROW_HEIGHT = 12;

/**
 * Shared geometry helper: how tall is the bottom-pinned totals/stats band for
 * a given config + current detail stage, in px — 0 when neither band is
 * rendered this frame. Single source of truth for "how much of the pane's
 * bottom edge is reserved for the band rectangle" so callers that need to
 * avoid painting into it (e.g. WallHeatLayer's heat-dot clip, see FinotaurChart.tsx)
 * never have to re-derive or duplicate FootprintLayer's own show/hide logic.
 */
export function computeFootprintBandHeightPx(
  config: Pick<FootprintConfig, 'showStats' | 'showTotals' | 'statsRows'>,
  detail: FootprintDetailLevel,
): number {
  if (detail !== 'full') return 0;
  if (config.showStats) {
    // F5 (toggleable stats rows): band height tracks the ENABLED row count —
    // default (all 6 enabled) reproduces the pre-PR-3 6-row height exactly
    // (no-op for callers that never touch statsRows). All rows disabled →
    // no stats band at all; falls through to the totals-row height below
    // (same "stats has nothing to show → totals renders instead" rule
    // FootprintLayer's draw loop applies — keeps this height in lockstep
    // with what actually paints, since WallHeatLayer's clip depends on it).
    const enabledCount = getEnabledStatsRowDefs(config.statsRows).length;
    if (enabledCount > 0) return enabledCount * STATS_ROW_HEIGHT;
  }
  if (config.showTotals) return FOOTPRINT_TOTALS_BAND_HEIGHT;
  return 0;
}

/**
 * Draw the pinned totals band (Volume + Delta mini-rows) for one candle at an
 * explicit y position (the caller computes `top` from the time-axis geometry).
 */
export function drawTotalsRowAt(
  ctx: CanvasRenderingContext2D,
  prepared: PreparedCandleDraw,
  bounds: { leftX: number; rightX: number; top: number },
): void {
  const { leftX, rightX, top } = bounds;
  const width = rightX - leftX;
  if (width <= 0) return;
  const midX = leftX + width / 2;

  ctx.fillStyle = FOOTPRINT_TOTALS_BG;
  ctx.fillRect(leftX, top, width, TOTALS_ROW_HEIGHT * 2);

  ctx.font = `${FOOTPRINT_TOTALS_FONT_SIZE}px ${FOOTPRINT_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = FOOTPRINT_NEUTRAL_TEXT;
  ctx.fillText(formatCellValue(prepared.totalVol), midX, top + TOTALS_ROW_HEIGHT / 2);

  ctx.fillStyle =
    prepared.delta === 0
      ? FOOTPRINT_NEUTRAL_TEXT
      : prepared.delta > 0
        ? FOOTPRINT_BUY_COLOR_BRIGHT
        : FOOTPRINT_SELL_COLOR_BRIGHT;
  ctx.fillText(
    formatCellValue(prepared.delta),
    midX,
    top + TOTALS_ROW_HEIGHT + TOTALS_ROW_HEIGHT / 2,
  );
}

// ─── Cluster Statistics strip (ATAS-style, 6 rows) ──────────────────────────
// Extends the compact 2-row totals band above into a per-bar statistics
// table: Volume, Delta, Delta%, Max Δ, Min Δ, Session Δ — one column per
// visible bar, a left-edge label gutter naming each row. Gated behind
// config.showStats; when false, callers keep using drawTotalsRowAt (the
// original compact behavior is untouched — see FootprintLayer.tsx wiring).

/** One bar's derived statistics row — computed once per candle (cached alongside PreparedCandleDraw), never per-frame. */
export interface ClusterStatsRow {
  volume: number;
  delta: number;
  /** delta / volume, as a fraction (e.g. -0.0769 for -7.7%) — 0 when volume is 0. */
  deltaPct: number;
  /** Pre-formatted "±N.N%" label (1 decimal), guarded against div-by-zero. */
  deltaPctLabel: string;
  maxDelta: number;
  minDelta: number;
  /** Running cumulative delta across all loaded candles up to and including this one (caller-supplied — see getCvdSeries). */
  sessionDelta: number;
}

/**
 * Derive one bar's 6-row statistics from its FlowCandleView plus a
 * caller-supplied running session delta (from FlowBinStore.getCvdSeries —
 * NOT recomputed here, so this stays a cheap per-candle O(1) derivation with
 * no scan over other candles).
 */
export function buildClusterStatsRow(
  candle: Pick<FlowCandleView, 'totalVol' | 'delta' | 'minDelta' | 'maxDelta'>,
  sessionDelta: number,
): ClusterStatsRow {
  const volume = candle.totalVol;
  const delta = candle.delta;
  const deltaPct = volume > 0 ? delta / volume : 0;
  const deltaPctLabel = `${(deltaPct * 100).toFixed(1)}%`;
  return {
    volume,
    delta,
    deltaPct,
    deltaPctLabel,
    maxDelta: candle.maxDelta,
    minDelta: candle.minDelta,
    sessionDelta,
  };
}

/** Per-row maxima (computed once per draw over the visible bars) driving the heat-shading alpha — see drawStatsBandAt. */
export interface ClusterStatsRowMaxima {
  volume: number;
  delta: number;
  deltaPct: number;
  maxDelta: number;
  minDelta: number;
  sessionDelta: number;
}

const STATS_ROW_COUNT = 6;
/** Extra label-gutter is handled by the caller's leftX offset — band height is just row-count * row-height. */
export const FOOTPRINT_STATS_BAND_HEIGHT = STATS_ROW_HEIGHT * STATS_ROW_COUNT;

export interface StatsRowDef {
  key: keyof ClusterStatsRow & keyof ClusterStatsRowMaxima;
  label: string;
  /** Pre-formatted label for this row's value, or undefined to use formatCellValue(value). */
  formatValue: (stats: ClusterStatsRow) => string;
  /** true = color the value text by sign (Delta/Delta%/Max Δ/Min Δ/Session Δ); false = neutral (Volume). */
  colorBySign: boolean;
}

const STATS_ROW_DEFS: StatsRowDef[] = [
  { key: 'volume', label: 'Volume', formatValue: (s) => formatCellValue(s.volume), colorBySign: false },
  { key: 'delta', label: 'Delta', formatValue: (s) => formatCellValue(s.delta), colorBySign: true },
  { key: 'deltaPct', label: 'Delta%', formatValue: (s) => s.deltaPctLabel, colorBySign: true },
  { key: 'maxDelta', label: 'Max Δ', formatValue: (s) => formatCellValue(s.maxDelta), colorBySign: true },
  { key: 'minDelta', label: 'Min Δ', formatValue: (s) => formatCellValue(s.minDelta), colorBySign: true },
  { key: 'sessionDelta', label: 'Session Δ', formatValue: (s) => formatCellValue(s.sessionDelta), colorBySign: true },
];

/** All 6 rows enabled — the pre-PR-3 default, used whenever a caller omits `statsRows` (backward compatible). */
const ALL_STATS_ROWS_ENABLED: FootprintConfig['statsRows'] = {
  volume: true,
  delta: true,
  deltaPct: true,
  maxDelta: true,
  minDelta: true,
  sessionDelta: true,
};

/**
 * F5 (toggleable stats rows): the subset of STATS_ROW_DEFS enabled by
 * `statsRows`, in the SAME fixed order as today (Volume/Delta/Delta%/Max Δ/
 * Min Δ/Session Δ) — disabled rows are simply absent, never reordered.
 * `statsRows` defaults to all-enabled when omitted, so existing callers that
 * never pass it keep today's unconditional 6-row render.
 */
export function getEnabledStatsRowDefs(statsRows?: FootprintConfig['statsRows']): StatsRowDef[] {
  const enabled = statsRows ?? ALL_STATS_ROWS_ENABLED;
  return STATS_ROW_DEFS.filter((def) => enabled[def.key]);
}

/** One bar's column input to drawStatsBandAt. */
export interface StatsBarColumn {
  prepared: PreparedCandleDraw;
  stats: ClusterStatsRow;
  leftX: number;
  rightX: number;
}

/**
 * Draw the 6-row Cluster Statistics strip across all visible bars in one
 * call. `bounds.rowMaxima` must be computed ONCE per draw by the caller
 * (see computeRowMaxima in the test file / FootprintLayer.tsx) — this
 * function never scans other bars' data itself, keeping it a pure
 * per-frame-cheap render step (no per-frame data scans, per the task's
 * hard constraint).
 *
 * Per-cell heat chips (NT parity — "same gradient strength as the bars"):
 * each bar/row cell gets a background chip tinted green (positive) or red
 * (negative), alpha interpolated between the weak/strong theme endpoints by
 * |value| relative to that row's visible-range max. The unsigned Volume row
 * uses a neutral (zinc) tint scaled the same way, since volume carries no
 * direction. Row labels draw in a fixed-width legend gutter
 * (`bounds.labelGutterWidth`, typically FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH)
 * whose own opaque backdrop is painted LAST, after every bar's chips — the
 * simplest way to guarantee labels never collide with the first bar's cells
 * without having to reflow each bar's leftX/rightX around the gutter.
 */
export function drawStatsBandAt(
  ctx: CanvasRenderingContext2D,
  bars: StatsBarColumn[],
  bounds: { top: number; labelGutterWidth: number; rowMaxima: ClusterStatsRowMaxima; statsRows?: FootprintConfig['statsRows'] },
): void {
  const { top, labelGutterWidth, rowMaxima, statsRows } = bounds;
  // F5 (toggleable stats rows): only the enabled defs render, in their fixed
  // order — `statsRows` omitted (existing callers/tests) = all 6, identical
  // to pre-PR-3 behavior. Band height shrinks with the row count.
  const enabledDefs = getEnabledStatsRowDefs(statsRows);
  const bandHeight = enabledDefs.length * STATS_ROW_HEIGHT;
  if (bandHeight <= 0) return; // all rows disabled — nothing to draw

  ctx.font = `${FOOTPRINT_TOTALS_FONT_SIZE}px ${FOOTPRINT_FONT_FAMILY}`;
  ctx.textBaseline = 'middle';

  // Backdrop across the whole strip (label gutter + all bar columns).
  const rightmostX = bars.reduce((max, b) => Math.max(max, b.rightX), labelGutterWidth);
  ctx.fillStyle = FOOTPRINT_TOTALS_BG;
  ctx.fillRect(0, top, rightmostX, bandHeight);

  for (let rowIdx = 0; rowIdx < enabledDefs.length; rowIdx++) {
    const def = enabledDefs[rowIdx];
    const rowTop = top + rowIdx * STATS_ROW_HEIGHT;
    const rowMid = rowTop + STATS_ROW_HEIGHT / 2;
    const rowMax = rowMaxima[def.key];

    for (const bar of bars) {
      const width = bar.rightX - bar.leftX;
      if (width <= 0) continue;
      const value = bar.stats[def.key];
      const magnitude = rowMax > 0 ? Math.min(1, Math.abs(value) / rowMax) : 0;

      // Per-cell heat chip: green/red tint for signed rows (Delta/Delta%/
      // Max Δ/Min Δ/Session Δ), neutral zinc tint for the unsigned Volume
      // row — alpha always interpolated by this row's relative magnitude
      // via the shared weak/strong endpoints (mirrors the bidAsk cell
      // pattern in drawCellBackground above).
      if (magnitude > 0) {
        const chipHex = !def.colorBySign
          ? FOOTPRINT_NEUTRAL_TEXT
          : value > 0
            ? FOOTPRINT_BUY_COLOR
            : value < 0
              ? FOOTPRINT_SELL_COLOR
              : null;
        if (chipHex) {
          ctx.fillStyle = mixAlphaValue(chipHex, FOOTPRINT_STATS_CHIP_WEAK_ALPHA, FOOTPRINT_STATS_CHIP_STRONG_ALPHA, magnitude);
          ctx.fillRect(bar.leftX, rowTop, width, STATS_ROW_HEIGHT);
        }
      }

      const midX = bar.leftX + width / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = !def.colorBySign
        ? FOOTPRINT_NEUTRAL_TEXT
        : value === 0
          ? FOOTPRINT_NEUTRAL_TEXT
          : value > 0
            ? FOOTPRINT_BUY_COLOR_BRIGHT
            : FOOTPRINT_SELL_COLOR_BRIGHT;
      ctx.fillText(def.formatValue(bar.stats), midX, rowMid);
    }
  }

  // Legend gutter — opaque backdrop drawn LAST (on top of every bar's heat
  // chips painted above) so row labels stay legible regardless of how hot
  // the first visible bar's cells are, then the labels themselves.
  if (labelGutterWidth > 0) {
    ctx.fillStyle = FOOTPRINT_TOTALS_BG;
    ctx.fillRect(0, top, labelGutterWidth, bandHeight);
  }
  for (let rowIdx = 0; rowIdx < enabledDefs.length; rowIdx++) {
    const def = enabledDefs[rowIdx];
    const rowTop = top + rowIdx * STATS_ROW_HEIGHT;
    const rowMid = rowTop + STATS_ROW_HEIGHT / 2;
    ctx.fillStyle = FOOTPRINT_NEUTRAL_TEXT;
    ctx.textAlign = 'left';
    ctx.fillText(def.label, FOOTPRINT_CELL_PADDING_X, rowMid);
  }

  ctx.textAlign = 'left'; // restore canvas default so callers aren't surprised
}

/**
 * Draw stacked-imbalance zone bands: a semi-transparent side-colored band
 * extending right from the candle to the live edge, killed the first time
 * price trades back through the zone's price band.
 *
 * F6: prefers `extras.touchedRangeSince(prepared.time)` — the combined range
 * touched by ANY candle strictly after this zone's formation candle — over
 * the legacy `extras.latestCandleRange` (which only checked the single
 * newest candle, so a zone revisited by an OLDER candle incorrectly
 * persisted). Falls back to `latestCandleRange` when `touchedRangeSince` is
 * not provided (magnifier popup, single-candle draws, existing tests) —
 * unchanged behavior for those callers.
 */
function drawStackedZones(
  ctx: CanvasRenderingContext2D,
  prepared: PreparedCandleDraw,
  projection: CandleProjection,
  extras: FootprintDrawExtras,
): void {
  if (prepared.stackedZones.length === 0) return;
  const { priceToY, rowSize } = projection;
  const groupSize = rowSize * prepared.mergeFactor;
  const touchedRange = extras.touchedRangeSince
    ? extras.touchedRangeSince(prepared.time)
    : extras.latestCandleRange;

  for (const zone of prepared.stackedZones) {
    const fromRow = prepared.merged[zone.fromIdx];
    const toRow = prepared.merged[zone.toIdx];
    if (!fromRow || !toRow) continue;

    const priceLo = Math.min(fromRow.binPrice, toRow.binPrice);
    const priceHi = Math.max(fromRow.binPrice, toRow.binPrice) + groupSize;

    // Kill the zone visually once price has traded back through its band.
    if (touchedRange) {
      const { low, high } = touchedRange;
      if (high >= priceLo && low <= priceHi) continue; // price re-entered the zone — dead
    }

    const yTop = priceToY(priceHi);
    const yBot = priceToY(priceLo);
    if (yTop === null || yBot === null) continue;

    const bandTop = Math.min(yTop, yBot);
    const bandHeight = Math.max(1, Math.abs(yBot - yTop));

    const zoneStartX = projection.centerX + projection.candleWidthPx / 2;
    const zoneEndX = Math.min(extras.clipRightX, extras.liveEdgeX);
    if (zoneEndX <= zoneStartX) continue;

    ctx.fillStyle = zone.side === 'buy' ? FOOTPRINT_STACKED_BUY_BAND : FOOTPRINT_STACKED_SELL_BAND;
    ctx.fillRect(zoneStartX, bandTop, zoneEndX - zoneStartX, bandHeight);

    // Hairline top/bottom border, same hue at higher alpha, so the extending
    // band reads as a deliberate zone rather than a soft background wash —
    // no other behavior change (band fill/kill logic above is untouched).
    ctx.strokeStyle = zone.side === 'buy' ? FOOTPRINT_STACKED_BUY_BAND_BORDER : FOOTPRINT_STACKED_SELL_BAND_BORDER;
    ctx.lineWidth = FOOTPRINT_STACKED_BAND_BORDER_WIDTH_PX;
    const borderInset = FOOTPRINT_STACKED_BAND_BORDER_WIDTH_PX / 2;
    ctx.beginPath();
    ctx.moveTo(zoneStartX, bandTop + borderInset);
    ctx.lineTo(zoneEndX, bandTop + borderInset);
    ctx.moveTo(zoneStartX, bandTop + bandHeight - borderInset);
    ctx.lineTo(zoneEndX, bandTop + bandHeight - borderInset);
    ctx.stroke();
  }
}

// ─── Magnifier (ATAS-style hover popup) ─────────────────────────────────────
// At the 'hidden'/'shaded' detail stages (see computeDetailLevel), hovering a
// candle for a short dwell time shows a small floating popup rendering that
// ONE candle's full footprint at a fixed, comfortable cell size — without
// changing chart zoom. This section is pure layout math only; the popup's
// canvas painting reuses prepareCandleDraw + drawCandleFootprint exactly as
// the main chart does (see MagnifierPopup.tsx), never reimplementing cell
// drawing.

/** Fixed row height (px) used inside the magnifier popup — independent of the host chart's zoom. */
export const MAGNIFIER_ROW_HEIGHT = 18;
/** Totals band height (px) reserved at the bottom of the popup for Volume/Delta. */
export const MAGNIFIER_TOTALS_BAND_HEIGHT = FOOTPRINT_TOTALS_BAND_HEIGHT;
/** Hard cap on popup canvas height — beyond this, rows are merged (2x, then 4x) to fit. */
export const MAGNIFIER_MAX_HEIGHT = 480;
/** Minimum popup canvas width — wide enough for two formatted bid×ask numbers side by side. */
export const MAGNIFIER_MIN_WIDTH = 96;
/** Per-character width estimate (px) used to widen the popup for wider formatted numbers. */
const MAGNIFIER_CHAR_WIDTH_PX = 7;

export interface MagnifierLayout {
  /** Number of rows actually rendered (after any row-merging needed to fit MAGNIFIER_MAX_HEIGHT). */
  rowCount: number;
  /** Row-merge factor applied ON TOP OF the candle's existing prepared mergeFactor, to fit the height cap. */
  mergeFactor: 1 | 2 | 4;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Pure layout computation for the magnifier popup: given a candle's already-
 * prepared draw structure (raw/mergeFactor=1 bins are fine — this decides its
 * OWN additional merge on top, same pattern as FootprintLayer's computeRowMergeFactor
 * for the main chart), return the popup canvas dimensions and effective row count.
 *
 * - rowCount = prepared.merged.length when no further merging is needed.
 * - height = rowCount * MAGNIFIER_ROW_HEIGHT + MAGNIFIER_TOTALS_BAND_HEIGHT, clamped
 *   at MAGNIFIER_MAX_HEIGHT — clamping is achieved by merging rows (2x, then 4x)
 *   rather than shrinking row height, so text stays legible even for candles
 *   with a large number of price levels (>40).
 */
export function computeMagnifierLayout(prepared: PreparedCandleDraw): MagnifierLayout {
  const rawRowCount = Math.max(1, prepared.merged.length);

  let mergeFactor: 1 | 2 | 4 = 1;
  let rowCount = rawRowCount;
  let canvasHeight = rowCount * MAGNIFIER_ROW_HEIGHT + MAGNIFIER_TOTALS_BAND_HEIGHT;

  if (canvasHeight > MAGNIFIER_MAX_HEIGHT) {
    mergeFactor = 2;
    rowCount = Math.ceil(rawRowCount / 2);
    canvasHeight = rowCount * MAGNIFIER_ROW_HEIGHT + MAGNIFIER_TOTALS_BAND_HEIGHT;
  }
  if (canvasHeight > MAGNIFIER_MAX_HEIGHT) {
    mergeFactor = 4;
    rowCount = Math.ceil(rawRowCount / 4);
    canvasHeight = rowCount * MAGNIFIER_ROW_HEIGHT + MAGNIFIER_TOTALS_BAND_HEIGHT;
  }
  // Still over the cap even at 4x (extremely dense candle) — clamp height and
  // let the popup scroll/clip rather than growing further; row count reflects
  // what's actually drawable, canvasHeight is the hard visual cap.
  canvasHeight = Math.min(canvasHeight, MAGNIFIER_MAX_HEIGHT);

  // Width: wide enough for the longest formatted bid/ask value in this candle,
  // doubled (bid + ask columns) plus padding, floored at MAGNIFIER_MIN_WIDTH.
  let maxLabelLen = 0;
  for (const row of prepared.merged) {
    maxLabelLen = Math.max(
      maxLabelLen,
      formatCellValue(row.buyVol).length,
      formatCellValue(row.sellVol).length,
    );
  }
  const estimatedWidth = maxLabelLen * MAGNIFIER_CHAR_WIDTH_PX * 2 + FOOTPRINT_CELL_PADDING_X * 6;
  const canvasWidth = Math.max(MAGNIFIER_MIN_WIDTH, estimatedWidth);

  return { rowCount, mergeFactor, canvasWidth, canvasHeight };
}
