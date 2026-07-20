// src/components/charting/orderflow/footprintTheme.ts
// Visual tokens for FootprintLayer — colors, typography, and the readability
// thresholds that drive the zoom-dependent collapse in footprintRender.ts.
//
// Palette is deliberately aligned with the rest of the order-flow suite
// (the CVD/Delta Arena indicators' deltaPos/deltaNeg, TapeTab.tsx buy/sell
// coloring) so a trader switching between Tape and the footprint overlay
// sees the same green = buy pressure / red = sell pressure convention
// everywhere.
// Gold matches FINOTAUR_DARK_THEME.brandGold family in FinotaurChart.tsx.

/** Aggressive-buy family — matches TapeTab's buy green (#22c55e / #34d399). */
export const FOOTPRINT_BUY_COLOR = '#22c55e';
export const FOOTPRINT_BUY_COLOR_BRIGHT = '#34d399';
export const FOOTPRINT_BUY_BG = 'rgba(34, 197, 94, 0.16)';
export const FOOTPRINT_BUY_BG_STRONG = 'rgba(34, 197, 94, 0.32)';

/** Aggressive-sell family — matches TapeTab's sell red (#dc2626 / #f87171). */
export const FOOTPRINT_SELL_COLOR = '#dc2626';
export const FOOTPRINT_SELL_COLOR_BRIGHT = '#f87171';
export const FOOTPRINT_SELL_BG = 'rgba(220, 38, 38, 0.16)';
export const FOOTPRINT_SELL_BG_STRONG = 'rgba(220, 38, 38, 0.32)';

/** Neutral shading for the 'volume' cell mode (no directional color). */
export const FOOTPRINT_NEUTRAL_BG = 'rgba(161, 161, 170, 0.10)'; // zinc-400 @ 10%
export const FOOTPRINT_NEUTRAL_TEXT = '#a1a1aa'; // zinc-400, matches chart text token

/** Diverging delta cell shading: red <-> neutral-dark <-> green, by |delta| magnitude. */
export const FOOTPRINT_DELTA_NEUTRAL_DARK = 'rgba(24, 24, 27, 0.6)'; // zinc-900 @ 60%

/**
 * Stats-band per-cell heat-chip alpha endpoints (NT: "same gradient strength
 * as the bars") — weak/strong alpha interpolated by |value| relative to the
 * visible-row max, mirroring the bidAsk weak/strong pattern below. Used by
 * drawStatsBandAt via mixAlphaValue for the Volume/Delta/Delta%/Max Δ/Min Δ/
 * Session Δ row cells.
 */
export const FOOTPRINT_STATS_CHIP_WEAK_ALPHA = 0.10;
export const FOOTPRINT_STATS_CHIP_STRONG_ALPHA = 0.30;

/** POC (Point of Control) highlight band — FINOTAUR gold, matches brandGold. */
export const FOOTPRINT_POC_COLOR = '#C9A646';
export const FOOTPRINT_POC_BG = 'rgba(201, 166, 70, 0.18)';

/** Stacked-imbalance zone bands — same buy/sell hue family, low alpha. */
export const FOOTPRINT_STACKED_BUY_BAND = 'rgba(34, 197, 94, 0.10)';
export const FOOTPRINT_STACKED_SELL_BAND = 'rgba(220, 38, 38, 0.10)';

/** Totals-row backdrop, pinned above the time axis. */
export const FOOTPRINT_TOTALS_BG = 'rgba(8, 8, 10, 0.85)'; // near-black, matches chart bg

/**
 * Stats-band legend gutter — fixed-width column at the pane's left edge
 * reserved for row labels (Volume/Delta/.../Session Δ), so labels never
 * collide with the first bar's per-cell heat chips (Exocharts convention:
 * legend column with its own opaque background, not overlapping chart data).
 */
export const FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH = 64;

/**
 * Cell font — tabular-nums so buy/sell columns and totals stay aligned,
 * monospace-safe fallback stack so numbers render consistently even if the
 * primary chart font (Inter) doesn't load. Mirrors FinotaurChart's fontFamily
 * intent but swaps in a numeric-friendly stack for cell text specifically.
 */
export const FOOTPRINT_FONT_FAMILY =
  '"Inter", ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Roboto Mono", monospace';

// ─── Zoom-dependent collapse thresholds ─────────────────────────────────────
// These gate which FootprintDetailLevel (see footprintRender.ts) is used for
// a given candleWidth/rowHeight pair. Values are in CSS px.

/** Minimum row height (px) for numbers to be legible in a cell (entering 'full'). */
export const FOOTPRINT_MIN_ROW_HEIGHT_FOR_TEXT = 11;
/** Row height (px) below which 'full' is exited — lower than the enter threshold (hysteresis). */
export const FOOTPRINT_MIN_ROW_HEIGHT_FOR_TEXT_EXIT = 9;
/**
 * Minimum candle width (px) for numbers to be legible (bid+ask side-by-side),
 * entering 'full'. This is the PRIMARY progressive-disclosure boundary
 * (dxFeed/Motivewave-style): zoomed out = plain candles, zoom in past this =
 * full bid×ask numbers appear over the candles.
 *
 * Also the FALLBACK for `FootprintConfig.minCellPxForText` (ATAS "Width to
 * show text") — see drawCandleFootprint's `showText` gate in
 * footprintRender.ts. Every caller that doesn't set `minCellPxForText`
 * (i.e. every caller from before that field existed) keeps reading this
 * exact constant, so behavior is unchanged.
 */
export const FOOTPRINT_MIN_CANDLE_WIDTH_FOR_TEXT = 50;
/**
 * Candle width (px) below which 'full' is exited — deliberately lower than
 * the enter threshold so pinch/scroll-zoom hovering near the boundary doesn't
 * flicker between 'full' and 'shaded' every frame.
 */
export const FOOTPRINT_MIN_CANDLE_WIDTH_FOR_TEXT_EXIT = 42;
/** Below this candle width, draw nothing — underlying candles remain visible. */
export const FOOTPRINT_MIN_CANDLE_WIDTH_FOR_SHADING = 14;
/** Candle width (px) below which 'shaded' is exited to 'hidden' (hysteresis on the second boundary). */
export const FOOTPRINT_MIN_CANDLE_WIDTH_FOR_SHADING_EXIT = 11;

/** Cell padding (px) reserved on each side when measuring text fit. */
export const FOOTPRINT_CELL_PADDING_X = 3;

/** Totals/stats-band font size (px) — untouched by the per-cell auto-scaling below. */
export const FOOTPRINT_TOTALS_FONT_SIZE = 10;

/**
 * Auto font-size-by-row-height (ATAS/Exocharts parity): cell text scales
 * with the rendered row height instead of a fixed 10px, so dense
 * (small-row) footprints stay legible-but-compact and roomy rows use the
 * extra space. Clamped to [MIN, MAX]; ratio applied to rowHeightPx and
 * rounded — see computeCellFontSize in footprintRender.ts.
 */
export const FOOTPRINT_CELL_FONT_MIN = 9;
export const FOOTPRINT_CELL_FONT_MAX = 13;
export const FOOTPRINT_CELL_FONT_HEIGHT_RATIO = 0.55;

// ─── Auto row-density target band (ATAS/Exocharts parity) ──────────────────
// At the 'full' detail stage, Auto row density should merge price bins so
// each rendered row lands inside this px-height band — professional
// footprint platforms show ~14-25 rows/bar at typical zoom, each row a
// legible 14-20px tall. Below MIN, rows are too cramped for text (already
// enforced by FOOTPRINT_MIN_ROW_HEIGHT_FOR_TEXT); above MAX, rows waste
// vertical space and the POC band reads as an oversized slab instead of a
// single price level — see computeRowMergeFactor in footprintRender.ts.

/** Lower bound (px) of the target auto row-height band. */
export const FOOTPRINT_AUTO_ROW_HEIGHT_MIN = 14;
/** Upper bound (px) of the target auto row-height band. */
export const FOOTPRINT_AUTO_ROW_HEIGHT_MAX = 22;
/**
 * Hysteresis margin (px) applied around the band edges when a previous merge
 * factor is already active — mirrors computeDetailLevel's enter/exit
 * asymmetry so a per-row height hovering exactly at a band edge across
 * consecutive frames (zoom/pan jitter) doesn't oscillate the merge factor
 * every frame.
 */
export const FOOTPRINT_AUTO_ROW_HEIGHT_HYSTERESIS = 3;

/** bidAsk mode: weak/strong alpha endpoints for volume-keyed half-fills — replaces the old fixed 0.16 alpha. */
export const FOOTPRINT_BIDASK_BG_WEAK_ALPHA = 0.16;
export const FOOTPRINT_BIDASK_BG_STRONG_ALPHA = 0.32;

/**
 * Candle skeleton strip (NT/MW convention) — at 'full' detail, a thin
 * open/close body + a hairline high/low wick draw CENTERED on the column's
 * bid|ask seam (the midpoint between the bid and ask half-cells), above the
 * cell backgrounds but beneath the cell text, so the candle TYPE (bullish/
 * bearish, body vs wick) reads clearly without ever competing with the
 * bid/ask numbers. Widths + alphas only — colors reuse the existing
 * FOOTPRINT_BUY_COLOR/FOOTPRINT_SELL_COLOR tokens above (no new hexes),
 * matching the buy/sell family used everywhere else in this theme.
 */
export const FOOTPRINT_SKELETON_WICK_WIDTH_PX = 1;
export const FOOTPRINT_SKELETON_BODY_WIDTH_PX = 5;
/** Body fill alpha — high enough to read as a solid mini-candle against either a red or green cell fill. */
export const FOOTPRINT_SKELETON_BODY_FILL_ALPHA = 0.85;
/** Wick stroke alpha — slightly higher than the body fill (hairline needs full presence to stay visible at 1px). */
export const FOOTPRINT_SKELETON_WICK_ALPHA = 0.9;

/** Stacked-imbalance zone band border — hairline outline at higher alpha than the band fill, same hue. */
export const FOOTPRINT_STACKED_BAND_BORDER_WIDTH_PX = 1;
export const FOOTPRINT_STACKED_BUY_BAND_BORDER = 'rgba(34, 197, 94, 0.45)';
export const FOOTPRINT_STACKED_SELL_BAND_BORDER = 'rgba(220, 38, 38, 0.45)';

/**
 * bidAsk mode: gutter (px) separating the bid (sell) and ask (buy) half-cells
 * at the cell midline — ATAS/Exocharts-style visual seam between the two
 * columns instead of a flush edge-to-edge split. Applied symmetrically: each
 * half's background fill and text anchor inset by half the gutter from the
 * midline.
 */
export const FOOTPRINT_CELL_GUTTER_PX = 4;

/**
 * Inter-bar column gutter (px) — the ABSOLUTE floor/ceiling the "Column
 * spacing" setting's gap fraction is clamped into (see
 * computeFootprintBandWidthPx / resolveColumnSpacingFraction in
 * footprintRender.ts). Fixes the bug where adjacent candles' footprint cells
 * touched and neighboring cell numbers visually mashed together (e.g. "0.12"
 * running into "9.59") — Elad screenshot report, 2026-07-19.
 * MIN keeps a visible seam even at the tightest zoom (a few px/bar, where
 * `gapFraction * candleWidthPx` would otherwise round to ~0); MAX stops a
 * very wide bar from reserving an excessive gutter that eats into legible
 * cell width for no benefit.
 */
export const FOOTPRINT_COLUMN_GAP_MIN_PX = 2;
export const FOOTPRINT_COLUMN_GAP_MAX_PX = 20;

// ─── Histogram-in-cell layout (PR 3, F1) ────────────────────────────────────
// `config.layout === 'histogram'` draws per-row horizontal volume bars BEHIND
// the numbers instead of the flat delta/volumeHeat/solid background tint —
// same buy/sell/neutral hue family as the rest of the footprint, at a modest
// alpha so the numbers on top stay legible.

export const FOOTPRINT_HISTO_BUY_FILL = 'rgba(34, 197, 94, 0.32)';
export const FOOTPRINT_HISTO_SELL_FILL = 'rgba(220, 38, 38, 0.32)';
export const FOOTPRINT_HISTO_NEUTRAL_FILL = 'rgba(161, 161, 170, 0.30)'; // zinc-400 family, matches FOOTPRINT_NEUTRAL_BG's hue

// ─── Color-scheme dispatcher (PR 3, F2) ─────────────────────────────────────
// 'volumeHeat' and 'solid' cell background schemes — see resolveCellBackground
// in footprintRender.ts. 'delta' (default) reuses the existing buy/sell/neutral
// tokens above unchanged.

/** 'volumeHeat' scheme: single neutral/gold heat ramp, independent of buy/sell sign — reuses the FINOTAUR gold (matches FOOTPRINT_POC_COLOR). */
export const FOOTPRINT_VOLUME_HEAT_COLOR = '#C9A646';
export const FOOTPRINT_VOLUME_HEAT_WEAK_ALPHA = 0.08;
export const FOOTPRINT_VOLUME_HEAT_STRONG_ALPHA = 0.35;

/** 'solid' scheme: fixed weak uniform background for every non-empty cell, no magnitude scaling. */
export const FOOTPRINT_SOLID_SCHEME_BG = 'rgba(161, 161, 170, 0.08)';

// ─── Volume Profile overlay tokens ──────────────────────────────────────────
// Shares the buy/sell/gold palette above so the profile reads as part of the
// FINOTAUR-gold volume profile, intentionally neutral instead of buy/sell colors.

/** Max width of the profile histogram as a fraction of the pane width. */
export const VOLUME_PROFILE_MAX_WIDTH_FRAC = 0.13;

/** Row fill alpha (subtle — the profile sits behind/beside candles, not over them). */
export const VOLUME_PROFILE_BUY_FILL = 'rgba(201, 166, 70, 0.20)';
export const VOLUME_PROFILE_SELL_FILL = 'rgba(201, 166, 70, 0.20)';

/** Value Area shading — low-alpha gold band behind VAH/VAL boundary rows. */
export const VOLUME_PROFILE_VA_BG = 'rgba(201, 166, 70, 0.08)';

/** POC line — full-pane-width dashed gold line, matches FOOTPRINT_POC_COLOR. */
export const VOLUME_PROFILE_POC_LINE_WIDTH = 1.5;
export const VOLUME_PROFILE_POC_DASH: [number, number] = [4, 3];

/** VAH/VAL boundary line — thinner, dimmer gold than POC. */
export const VOLUME_PROFILE_VA_BOUNDARY_COLOR = 'rgba(201, 166, 70, 0.55)';
export const VOLUME_PROFILE_VA_BOUNDARY_DASH: [number, number] = [2, 2];

/**
 * PR 3 F4 (per-bar footprint Value Area, `config.showValueArea`): dim overlay
 * for footprint cells OUTSIDE the 70%-volume Value Area band, drawn over the
 * cell's existing background/histogram fill so the VAH/VAL band reads as the
 * "in-focus" price range for that candle. Same near-black family as
 * FOOTPRINT_TOTALS_BG (not the gold VA_BG above, which highlights rather than
 * dims) — part of the Value Area token family by naming/placement.
 */
export const VOLUME_PROFILE_VA_DIM_OUTSIDE_BG = 'rgba(8, 8, 10, 0.35)';

/** Debounce window (ms) for recomputing the profile on visible-range change. */
export const VOLUME_PROFILE_RECOMPUTE_DEBOUNCE_MS = 150;

// ─── Session Volume Profile overlay tokens (Chart tab) ──────────────────────
// Deliberately NOT the buy/sell green/red family above — this profile has no
// aggressor-side data (OHLCV bars only), so it reads as a neutral steel/
// graphite histogram with a gold vPOC, matching ATAS's session profile look
// without borrowing ATAS's blue.

/** Row fill — subtle gold, sits behind candles so it must stay unobtrusive. */
export const SESSION_VP_ROW_FILL = 'rgba(201, 166, 70, 0.16)';
/** Value-Area rows — brighter than the base fill, still behind candles. */
export const SESSION_VP_ROW_FILL_VA = 'rgba(201, 166, 70, 0.28)';

/** vPOC row + its extending ray + label — FINOTAUR gold, matches FOOTPRINT_POC_COLOR. */
export const SESSION_VP_VPOC_COLOR = '#C9A646';
export const SESSION_VP_VPOC_LINE_WIDTH = 1.5;
export const SESSION_VP_LABEL_FONT = '10px "Inter", ui-monospace, SFMono-Regular, monospace';

/** VAH/VAL boundary lines — faint dashed gold, dimmer than the vPOC ray. */
export const SESSION_VP_VAHVAL_COLOR = 'rgba(201, 166, 70, 0.45)';
export const SESSION_VP_VAHVAL_DASH: [number, number] = [3, 3];

/** Session separator — dashed, very low opacity so it never competes with candles. */
export const SESSION_VP_SEPARATOR_COLOR = 'rgba(255, 255, 255, 0.07)';
export const SESSION_VP_SEPARATOR_DASH: [number, number] = [2, 4];

/** Target row count per session (spec: "40-60 rows per typical session range"). */
export const SESSION_VP_TARGET_ROW_COUNT = 90;
