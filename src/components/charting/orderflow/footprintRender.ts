// src/components/charting/orderflow/footprintRender.ts
// Pure rendering helpers for FootprintLayer — no React, no DOM lifecycle.
// Mirrors the "pure engine" style of flowBinStore.ts: given a canvas ctx +
// a coordinate projection + prepared per-candle data, draw exactly one
// candle's footprint. All heavy prep (sorting, imbalance detection, row
// merging) happens in `prepareCandleDraw`, which callers invoke ONLY when
// data or config changes — never per pan/zoom frame (see FootprintLayer.tsx).

import type { FlowBin, FlowCandleView, FootprintCellMode, FootprintConfig } from './types';
import {
  FOOTPRINT_BUY_BG,
  FOOTPRINT_BUY_BG_STRONG,
  FOOTPRINT_BUY_COLOR,
  FOOTPRINT_BUY_COLOR_BRIGHT,
  FOOTPRINT_CELL_FONT_SIZE,
  FOOTPRINT_CELL_PADDING_X,
  FOOTPRINT_DELTA_NEUTRAL_DARK,
  FOOTPRINT_FONT_FAMILY,
  FOOTPRINT_IMBALANCE_ACCENT,
  FOOTPRINT_IMBALANCE_OUTLINE_WIDTH,
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
  FOOTPRINT_STACKED_BUY_BAND,
  FOOTPRINT_STACKED_SELL_BAND,
  FOOTPRINT_TOTALS_BG,
  FOOTPRINT_TOTALS_FONT_SIZE,
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
 * Row-merge factor (1, 2, or 4) so rows stay readable when zoomed out.
 * `availableHeightPx` is the candle's total footprint height (all bins);
 * `binCount` is the number of distinct price bins in that candle.
 */
export function computeRowMergeFactor(availableHeightPx: number, binCount: number): 1 | 2 | 4 {
  if (binCount <= 0) return 1;
  const naiveRowHeight = availableHeightPx / binCount;
  if (naiveRowHeight >= FOOTPRINT_MIN_ROW_HEIGHT_FOR_TEXT) return 1;
  if (naiveRowHeight * 2 >= FOOTPRINT_MIN_ROW_HEIGHT_FOR_TEXT) return 2;
  return 4;
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
 */
export function formatCellValue(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
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

// ─── Imbalance detection ────────────────────────────────────────────────────

export type ImbalanceSide = 'buy' | 'sell' | null;

interface RowImbalance {
  /** 'buy' = ask at this level dominates bid one level down; 'sell' = inverse. */
  side: ImbalanceSide;
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
  const out: RowImbalance[] = new Array(merged.length).fill(null).map(() => ({ side: null }));

  for (let i = 0; i < merged.length; i++) {
    const row = merged[i];
    const rowVol = row.buyVol + row.sellVol;
    if (rowVol < minVol) continue;

    // Ask (buyVol) at level i vs bid (sellVol) at level i-1 → buy-side imbalance.
    if (i > 0) {
      const below = merged[i - 1];
      if (below.sellVol > 0 && row.buyVol >= below.sellVol * config.imbalanceRatio) {
        out[i].side = 'buy';
      }
    }
    // Bid (sellVol) at level i vs ask (buyVol) at level i+1 → sell-side imbalance.
    if (i < merged.length - 1) {
      const above = merged[i + 1];
      if (above.buyVol > 0 && row.sellVol >= above.buyVol * config.imbalanceRatio) {
        // A row can only carry one imbalance flag; sell-side check runs second
        // so a row imbalanced on both diagonals (rare, thin books) keeps 'buy'.
        if (out[i].side === null) out[i].side = 'sell';
      }
    }
  }
  return out;
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

  let maxRowVol = 0;
  let pocBinPrice: number | null = null;
  let pocVol = -1;
  for (const row of merged) {
    const rowVol = row.buyVol + row.sellVol;
    if (rowVol > maxRowVol) maxRowVol = rowVol;
    if (rowVol > pocVol) {
      pocVol = rowVol;
      pocBinPrice = row.binPrice;
    }
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

  const showText = detail === 'full';
  const groupSize = rowSize * prepared.mergeFactor;

  if (showText) {
    ctx.font = `${FOOTPRINT_CELL_FONT_SIZE}px ${FOOTPRINT_FONT_FAMILY}`;
    ctx.textBaseline = 'middle';
  }

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
    const imbalance = prepared.imbalances[i]?.side ?? null;

    drawCell(ctx, {
      leftX,
      rightX,
      top: cellTop,
      height: cellHeight,
      row,
      cellMode: config.cellMode,
      maxRowVol: prepared.maxRowVol,
      showText,
      isPoc,
      imbalanceSide: imbalance,
    });
  }

  drawStackedZones(ctx, prepared, projection, extras);
}

interface DrawCellArgs {
  leftX: number;
  rightX: number;
  top: number;
  height: number;
  row: MergedBin;
  cellMode: FootprintCellMode;
  maxRowVol: number;
  showText: boolean;
  isPoc: boolean;
  imbalanceSide: ImbalanceSide;
}

function drawCell(ctx: CanvasRenderingContext2D, args: DrawCellArgs): void {
  const { leftX, rightX, top, height, row, cellMode, maxRowVol, showText, isPoc, imbalanceSide } = args;
  const width = rightX - leftX;
  const midX = leftX + width / 2;
  const delta = row.buyVol - row.sellVol;
  const rowVol = row.buyVol + row.sellVol;
  const magnitude = maxRowVol > 0 ? Math.min(1, Math.abs(delta) / maxRowVol) : 0;

  // ── POC band (drawn first, behind everything else in the cell) ───────────
  // Solid gold top/bottom rule (FOOTPRINT_POC_COLOR) over the tinted fill
  // (FOOTPRINT_POC_BG) so the Point-of-Control row reads as a distinct gold
  // band even when the cell's own delta/volume shading is faint.
  if (isPoc) {
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

  // ── Cell background shading ────────────────────────────────────────────
  // Note: the shaded (zoomed-out) stage never reaches this per-cell function
  // with showText=true — it draws its own delta-shading independently of
  // cellMode upstream in drawCandleFootprint/FootprintLayer. Background
  // shading here (the 'full' stage) still varies by cellMode as before;
  // 'trades' and 'volumeDelta' use the same neutral background as 'volume'
  // since neither is a delta-magnitude-driven mode.
  if (cellMode === 'delta') {
    const bg = delta === 0
      ? FOOTPRINT_DELTA_NEUTRAL_DARK
      : delta > 0
        ? mixAlpha(FOOTPRINT_BUY_BG, FOOTPRINT_BUY_BG_STRONG, magnitude)
        : mixAlpha(FOOTPRINT_SELL_BG, FOOTPRINT_SELL_BG_STRONG, magnitude);
    ctx.fillStyle = bg;
    ctx.fillRect(leftX, top, width, height);
  } else if (cellMode === 'volume' || cellMode === 'trades' || cellMode === 'volumeDelta') {
    ctx.fillStyle = FOOTPRINT_NEUTRAL_BG;
    ctx.fillRect(leftX, top, width, height);
  } else {
    // 'bidAsk' — split background: sell tint left half, buy tint right half.
    ctx.fillStyle = FOOTPRINT_SELL_BG;
    ctx.fillRect(leftX, top, width / 2, height);
    ctx.fillStyle = FOOTPRINT_BUY_BG;
    ctx.fillRect(midX, top, width / 2, height);
  }

  // ── Imbalance accent: bold text handled below; outline here ───────────
  if (imbalanceSide) {
    ctx.strokeStyle = FOOTPRINT_IMBALANCE_ACCENT;
    ctx.lineWidth = FOOTPRINT_IMBALANCE_OUTLINE_WIDTH;
    const outlineX = imbalanceSide === 'buy' ? midX : leftX;
    const outlineW = width / 2;
    ctx.strokeRect(outlineX + 0.5, top + 0.5, outlineW - 1, Math.max(1, height - 1));
  }

  if (!showText || height < FOOTPRINT_MIN_ROW_HEIGHT_FOR_TEXT) return;

  const textY = top + height / 2;
  const boldSuffix = imbalanceSide ? 'bold ' : '';

  if (cellMode === 'bidAsk') {
    ctx.font = `${boldSuffix}${FOOTPRINT_CELL_FONT_SIZE}px ${FOOTPRINT_FONT_FAMILY}`;
    ctx.fillStyle = imbalanceSide === 'sell' ? FOOTPRINT_SELL_COLOR_BRIGHT : FOOTPRINT_SELL_COLOR;
    ctx.textAlign = 'right';
    ctx.fillText(formatCellValue(row.sellVol), midX - FOOTPRINT_CELL_PADDING_X, textY);

    ctx.fillStyle = imbalanceSide === 'buy' ? FOOTPRINT_BUY_COLOR_BRIGHT : FOOTPRINT_BUY_COLOR;
    ctx.textAlign = 'left';
    ctx.fillText(formatCellValue(row.buyVol), midX + FOOTPRINT_CELL_PADDING_X, textY);
  } else if (cellMode === 'delta') {
    ctx.font = `${boldSuffix}${FOOTPRINT_CELL_FONT_SIZE}px ${FOOTPRINT_FONT_FAMILY}`;
    ctx.fillStyle = delta === 0 ? FOOTPRINT_NEUTRAL_TEXT : delta > 0 ? FOOTPRINT_BUY_COLOR_BRIGHT : FOOTPRINT_SELL_COLOR_BRIGHT;
    ctx.textAlign = 'center';
    ctx.fillText(formatCellValue(delta), midX, textY);
  } else if (cellMode === 'trades') {
    // ATAS-style "number of trades" mode — count of prints per level, neutral
    // shading + neutral text (no directional color; a print count has no sign).
    ctx.font = `${FOOTPRINT_CELL_FONT_SIZE}px ${FOOTPRINT_FONT_FAMILY}`;
    ctx.fillStyle = FOOTPRINT_NEUTRAL_TEXT;
    ctx.textAlign = 'center';
    ctx.fillText(formatCellValue(row.trades), midX, textY);
  } else if (cellMode === 'volumeDelta') {
    // Two values per cell: total volume (neutral) on the left half, signed
    // delta (red/green by sign) on the right half — e.g. "153.2  +12.4".
    ctx.font = `${FOOTPRINT_CELL_FONT_SIZE}px ${FOOTPRINT_FONT_FAMILY}`;
    ctx.fillStyle = FOOTPRINT_NEUTRAL_TEXT;
    ctx.textAlign = 'right';
    ctx.fillText(formatCellValue(rowVol), midX - FOOTPRINT_CELL_PADDING_X, textY);

    const deltaSign = delta > 0 ? '+' : '';
    ctx.fillStyle = delta === 0 ? FOOTPRINT_NEUTRAL_TEXT : delta > 0 ? FOOTPRINT_BUY_COLOR_BRIGHT : FOOTPRINT_SELL_COLOR_BRIGHT;
    ctx.textAlign = 'left';
    ctx.fillText(`${deltaSign}${formatCellValue(delta)}`, midX + FOOTPRINT_CELL_PADDING_X, textY);
  } else {
    // 'volume' — neutral shading, delta only via text color.
    ctx.font = `${FOOTPRINT_CELL_FONT_SIZE}px ${FOOTPRINT_FONT_FAMILY}`;
    ctx.fillStyle = delta === 0 ? FOOTPRINT_NEUTRAL_TEXT : delta > 0 ? FOOTPRINT_BUY_COLOR : FOOTPRINT_SELL_COLOR;
    ctx.textAlign = 'center';
    ctx.fillText(formatCellValue(rowVol), midX, textY);
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

// Totals band: two stacked mini-rows (Volume, Delta) pinned above the time
// axis. Kept as a standalone function (`drawTotalsRowAt`) rather than folded
// into `drawCandleFootprint` because it needs an explicit `top` y computed
// from time-axis geometry that the per-row cell loop above doesn't have —
// see FootprintLayer.tsx for how the two calls are sequenced per candle.
const TOTALS_ROW_HEIGHT = 12;
export const FOOTPRINT_TOTALS_BAND_HEIGHT = TOTALS_ROW_HEIGHT * 2;

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

/**
 * Draw stacked-imbalance zone bands: a semi-transparent side-colored band
 * extending right from the candle to the live edge, killed once the latest
 * candle's range has traded back through the zone's price band.
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

  for (const zone of prepared.stackedZones) {
    const fromRow = prepared.merged[zone.fromIdx];
    const toRow = prepared.merged[zone.toIdx];
    if (!fromRow || !toRow) continue;

    const priceLo = Math.min(fromRow.binPrice, toRow.binPrice);
    const priceHi = Math.max(fromRow.binPrice, toRow.binPrice) + groupSize;

    // Kill the zone visually once price has traded back through its band.
    if (extras.latestCandleRange) {
      const { low, high } = extras.latestCandleRange;
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
  }
}
