// src/components/charting/orderflow/footprintTheme.ts
// Visual tokens for FootprintLayer — colors, typography, and the readability
// thresholds that drive the zoom-dependent collapse in footprintRender.ts.
//
// Palette is deliberately aligned with the rest of the order-flow suite
// (CvdTab.tsx deltaPos/deltaNeg, TapeTab.tsx buy/sell coloring) so a trader
// switching between the Tape/CVD tabs and the footprint overlay sees the
// same green = buy pressure / red = sell pressure convention everywhere.
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

/** POC (Point of Control) highlight band — FINOTAUR gold, matches brandGold. */
export const FOOTPRINT_POC_COLOR = '#C9A646';
export const FOOTPRINT_POC_BG = 'rgba(201, 166, 70, 0.18)';

/** Imbalance accent — brighter gold outline/text, distinct from POC's fill-only band. */
export const FOOTPRINT_IMBALANCE_ACCENT = '#F4D97B';

/** Stacked-imbalance zone bands — same hue family as the imbalance accent, low alpha. */
export const FOOTPRINT_STACKED_BUY_BAND = 'rgba(34, 197, 94, 0.10)';
export const FOOTPRINT_STACKED_SELL_BAND = 'rgba(220, 38, 38, 0.10)';

/** Totals-row backdrop, pinned above the time axis. */
export const FOOTPRINT_TOTALS_BG = 'rgba(8, 8, 10, 0.85)'; // near-black, matches chart bg

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

/** Base cell font size (px) — scaled down slightly for merged/dense rows. */
export const FOOTPRINT_CELL_FONT_SIZE = 10;
export const FOOTPRINT_TOTALS_FONT_SIZE = 10;

/** Imbalance highlight outline width (px). */
export const FOOTPRINT_IMBALANCE_OUTLINE_WIDTH = 1;

// ─── Volume Profile overlay tokens ──────────────────────────────────────────
// Shares the buy/sell/gold palette above so the profile reads as part of the
// same order-flow family as the footprint clusters, not a separate visual.

/** Max width of the profile histogram as a fraction of the pane width. */
export const VOLUME_PROFILE_MAX_WIDTH_FRAC = 0.18;

/** Row fill alpha (subtle — the profile sits behind/beside candles, not over them). */
export const VOLUME_PROFILE_BUY_FILL = 'rgba(34, 197, 94, 0.30)';
export const VOLUME_PROFILE_SELL_FILL = 'rgba(220, 38, 38, 0.30)';

/** Value Area shading — low-alpha gold band behind VAH/VAL boundary rows. */
export const VOLUME_PROFILE_VA_BG = 'rgba(201, 166, 70, 0.08)';

/** POC line — full-pane-width dashed gold line, matches FOOTPRINT_POC_COLOR. */
export const VOLUME_PROFILE_POC_LINE_WIDTH = 1.5;
export const VOLUME_PROFILE_POC_DASH: [number, number] = [4, 3];

/** VAH/VAL boundary line — thinner, dimmer gold than POC. */
export const VOLUME_PROFILE_VA_BOUNDARY_COLOR = 'rgba(201, 166, 70, 0.55)';
export const VOLUME_PROFILE_VA_BOUNDARY_DASH: [number, number] = [2, 2];

/** Debounce window (ms) for recomputing the profile on visible-range change. */
export const VOLUME_PROFILE_RECOMPUTE_DEBOUNCE_MS = 150;
