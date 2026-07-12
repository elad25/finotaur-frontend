// src/components/charting/orderflow/types.ts
// Source-agnostic order-flow types. FlowTrade is normalized so any feed
// (Binance today; NinjaTrader/Databento/Rithmic for futures later) can plug
// into the same aggregation store and renderer without those layers ever
// knowing which exchange/broker the ticks came from.

/** A single normalized trade tick, source-agnostic. */
export interface FlowTrade {
  /** Trade time, epoch ms. */
  time: number;
  price: number;
  /** Base-asset quantity (contracts for futures, coins for crypto). */
  qty: number;
  /**
   * true = aggressive buy (taker bought / lifted the offer).
   * Binance aggTrade mapping: buyerAggressor = !m (m = isBuyerMaker).
   */
  buyerAggressor: boolean;
}

export type TradeSourceStatus = 'connecting' | 'live' | 'reconnecting' | 'error';

export interface TradeSource {
  /**
   * Live subscription. Returns an unsubscribe fn.
   * Implementations should batch + deliver trades on an interval (not per
   * tick) to keep consumers (React state, aggregation store) cheap.
   */
  subscribe(
    symbol: string,
    onTrades: (trades: FlowTrade[]) => void,
    onStatus?: (status: TradeSourceStatus) => void,
  ): () => void;

  /**
   * Historical backfill for [fromMs, toMs). Resolves with trades sorted
   * ascending by time. Never throws for partial coverage (rate limits,
   * exhausted request budget) — instead reports the actual `coveredFromMs`
   * so the caller can decide how to present a partially-filled window.
   *
   * `onChunk` (optional) — when the implementation fetches history in
   * multiple paginated round-trips, it MAY invoke this callback with each
   * page's trades (ascending by time, already deduped) as soon as that page
   * is available, instead of making the caller wait for the whole walk to
   * finish. Callers that apply chunks progressively must NOT also re-apply
   * the final resolved `trades` array (would double-count). Implementations
   * that don't support progressive delivery simply never call it — existing
   * callers are unaffected (optional, backward-compatible).
   */
  backfill(
    symbol: string,
    fromMs: number,
    toMs: number,
    opts?: { maxRequests?: number; signal?: AbortSignal; onChunk?: (trades: FlowTrade[]) => void },
  ): Promise<{ trades: FlowTrade[]; coveredFromMs: number }>;
}

/** One price level's aggregate resting quantity — [price, qty]. qty === 0 means "level removed" in a delta message. */
export type DepthLevel = [price: number, qty: number];

/**
 * Full L2 order-book snapshot — the initial payload a DepthSource delivers
 * on subscribe(), before any deltas. `bids`/`asks` are NOT required to be
 * pre-sorted by the source; consumers should sort if presentation order
 * matters (bids descending, asks ascending, by convention).
 */
export interface DepthSnapshot {
  /** Snapshot time, epoch ms. */
  ts: number;
  bids: DepthLevel[];
  asks: DepthLevel[];
}

/**
 * One incremental L2 update — same shape as a snapshot, but each level is a
 * DELTA against the last known state for that side: qty > 0 means "resting
 * quantity at this price is now qty" (replace, not add), qty === 0 means
 * "this price level was removed". Levels not mentioned are unchanged.
 */
export interface DepthDelta {
  ts: number;
  bids: DepthLevel[];
  asks: DepthLevel[];
}

/**
 * Normalized live L2 (order-book depth) source contract — future seam for a
 * NinjaTrader/Rithmic/Databento MBP-10-style feed to plug into the same
 * DOM/heatmap/liquidity-wall renderers (DepthMatrixLayer, WallHeatLayer)
 * without those layers knowing which vendor the levels came from. Mirrors
 * TradeSource's shape deliberately (subscribe + status callback) so a future
 * consumer can hold both a TradeSource and a DepthSource for the same
 * instrument with a consistent mental model.
 *
 * Types only — NOT implemented yet. No concrete DepthSource exists in this
 * codebase; this interface exists so the eventual NinjaTrader/Rithmic
 * integration has a contract to implement against, and so renderer code that
 * wants to be source-agnostic can type against it ahead of time.
 */
export interface DepthSource {
  /**
   * Live subscription. Delivers an initial full snapshot via `onSnapshot`,
   * then incremental deltas via `onDelta` for as long as the subscription is
   * held. Returns an unsubscribe fn (same convention as TradeSource.subscribe).
   */
  subscribe(
    symbol: string,
    handlers: {
      onSnapshot: (snapshot: DepthSnapshot) => void;
      onDelta: (delta: DepthDelta) => void;
      onStatus?: (status: TradeSourceStatus) => void;
    },
  ): () => void;
}

// ─── Aggregation (flowBinStore) types ──────────────────────────────────────

export interface FlowBinStoreConfig {
  /** Candle bucket width, seconds — matches lightweight-charts UTCTimestamp granularity. */
  intervalSec: number;
  /** Price bucket width — "row size" in footprint-chart terminology. */
  rowSize: number;
}

/** Per-price-bin aggregated volume within one candle. */
export interface FlowBin {
  /** Bucketed price = floor(price / rowSize) * rowSize. */
  binPrice: number;
  buyVol: number;
  sellVol: number;
  /** Count of individual prints (aggTrades) that landed in this bin — one aggTrade = 1 print. */
  trades: number;
}

/** Derived, per-candle aggregate. `bins` is a Map keyed by binPrice for O(1) updates. */
export interface FlowCandle {
  /** Bucketed time (seconds) = floor(time/1000/intervalSec) * intervalSec. */
  time: number;
  bins: Map<number, FlowBin>;
  totalVol: number;
  /** buyVol - sellVol across the whole candle. */
  delta: number;
  minDelta: number;
  maxDelta: number;
  /** Price bin with the largest (buyVol + sellVol). Null until any trade lands. */
  poc: number | null;
}

/** Readonly view of a candle's bins, sorted ascending by binPrice — cheap for renderers to iterate. */
export interface FlowCandleView {
  time: number;
  bins: FlowBin[];
  totalVol: number;
  delta: number;
  minDelta: number;
  maxDelta: number;
  poc: number | null;
}

export interface CvdPoint {
  time: number;
  /** Cumulative delta within the loaded window — resets to 0 at the start of the window, not a global CVD. */
  cvd: number;
}

// ─── FootprintLayer config ──────────────────────────────────────────────────

/**
 * Per-row rendering mode for the footprint overlay.
 * - 'bidAsk': two numbers per row — sell-vol left of the candle axis (red),
 *   buy-vol right (green). Bid-left/ask-right is the universal footprint
 *   convention — never flip it.
 * - 'delta': one number per row (buyVol - sellVol), red/green by sign, cell
 *   background shaded by |delta| magnitude.
 * - 'volume': one number per row (buyVol + sellVol), neutral shading; delta
 *   direction is conveyed only via text color, not background.
 * - 'trades': one number per row — count of prints (aggTrades) in the bin,
 *   neutral shading, neutral text (ATAS-style "number of trades" mode).
 * - 'volumeDelta': two numbers per row — total volume (neutral text) and
 *   signed delta (red/green by sign), e.g. "153.2  +12.4".
 */
export type FootprintCellMode = 'bidAsk' | 'delta' | 'volume' | 'trades' | 'volumeDelta';

/**
 * Opinionated imbalance presets (FINOTAUR doctrine: presets over ATAS's
 * ~400-setting maze). Each preset resolves to a concrete
 * (imbalanceRatio, imbalanceMinVolPct, stackedMin, imbalanceStackedOnly)
 * tuple via `resolveImbalancePreset` — see footprintRender.ts.
 * - 'standard': ratio >= 1.5x (150%), dust filter at 0.5% of candle volume,
 *   every qualifying row highlighted (singles included).
 * - 'strict': ratio >= 3.0x (300%), same dust filter, singles included.
 * - 'stacked': same thresholds as 'standard', but ONLY rows that are part of
 *   a run of >= stackedMin consecutive same-side imbalances are highlighted
 *   — isolated single-row imbalances are suppressed (ATAS-style "stacked
 *   imbalance" mode).
 */
export type ImbalancePreset = 'standard' | 'strict' | 'stacked';

/**
 * Cell rendering layout (PR 2 — Unified Footprint Settings). 'numbers' is
 * the only layout footprintRender.ts currently draws; 'histogram' is
 * plumbed here for persistence/UI continuity ahead of PR 3's rendering
 * dispatch — setting it today has no visual effect.
 */
export type FootprintLayout = 'numbers' | 'histogram';

/**
 * Cell color-coding scheme (PR 2 — Unified Footprint Settings). 'delta' is
 * the only scheme footprintRender.ts currently draws (red/green by
 * buy-sell sign, today's only behavior); 'volumeHeat'/'solid' are plumbed
 * here for persistence/UI continuity ahead of PR 3's rendering dispatch —
 * setting them today has no visual effect.
 */
export type FootprintColorScheme = 'delta' | 'volumeHeat' | 'solid';

export interface FootprintConfig {
  cellMode: FootprintCellMode;
  /** Which opinionated imbalance preset is active — drives the fields below. */
  imbalancePreset: ImbalancePreset;
  /**
   * Diagonal-imbalance ratio threshold (e.g. 3.0 = ask at level N is >= 300%
   * of bid at level N-1, or the inverse). Compared against consecutive price
   * levels within the same candle. Derived from `imbalancePreset` by
   * `resolveImbalancePreset` — callers normally don't set this directly.
   */
  imbalanceRatio: number;
  /**
   * Minimum row volume, as a percent of the candle's total volume, required
   * before a row is eligible for imbalance highlighting. Filters out dust
   * rows that would otherwise trip the ratio test trivially. Percent-of-total
   * scales sanely across instruments (crypto's raw-qty magnitude varies
   * wildly by symbol, so an absolute-volume floor would not generalize).
   */
  imbalanceMinVolPct: number;
  /** Minimum consecutive same-side imbalanced levels to qualify as a "stacked" zone. */
  stackedMin: number;
  /**
   * When true (only the 'stacked' preset sets this), per-cell imbalance
   * highlighting is suppressed unless the row is part of a run of
   * >= stackedMin consecutive same-side imbalances — singles are not
   * highlighted even though they still count toward stacked-zone bands.
   */
  imbalanceStackedOnly: boolean;
  /** Render the per-candle Volume/Delta totals row above the time axis. */
  showTotals: boolean;
  /** Highlight the per-candle Point-of-Control (highest-volume bin) with a gold band. */
  showPoc: boolean;
  /**
   * Render the 6-row Cluster Statistics strip (Volume/Delta/Delta%/Max Δ/
   * Min Δ/Session Δ) in place of the compact 2-row totals band. Only takes
   * effect at the 'full' detail stage (same gating as showTotals). Default
   * ON — when false, falls back to the original compact totals row.
   */
  showStats: boolean;
  /**
   * ATAS-style Magnifier: hovering a candle for a short dwell (~150ms) while
   * the footprint is at the 'hidden' or 'shaded' detail stage (i.e. numbers
   * aren't already visible on the chart) shows a floating popup with that
   * candle's full bid×ask detail, without changing chart zoom. Disabled at
   * the 'full' stage (numbers are already on-screen). Default ON.
   */
  magnifierEnabled: boolean;
  /**
   * When true, FootprintLayer skips the zoom-driven `computeDetailLevel`
   * gate entirely and always renders at the 'full' detail stage, regardless
   * of candle width / row height. Used by the Trading Arena's dedicated
   * Footprint tab, where the footprint IS the chart (not a progressive-
   * disclosure overlay revealed by zooming in). Optional, default/undefined
   * = unchanged existing behavior (zoom-driven hidden/shaded/full) for every
   * other caller (ChartTab, FuturesChartTab, Backtest).
   */
  forceFullDetail?: boolean;
  /**
   * Cell rendering layout — see FootprintLayout's doc comment. Default
   * 'numbers' (unchanged behavior). Dispatch for 'histogram' lands in PR 3.
   */
  layout: FootprintLayout;
  /**
   * Cell color scheme — see FootprintColorScheme's doc comment. Default
   * 'delta' (unchanged behavior — footprintRender.ts's only implementation
   * today). Dispatch for 'volumeHeat'/'solid' lands in PR 3.
   */
  colorScheme: FootprintColorScheme;
  /**
   * Render the Value Area band (VAH/VAL) on the volume-profile overlay.
   * Default OFF. Dispatch lands in PR 3 — plumbed here for persistence
   * continuity; setting it today has no visual effect.
   */
  showValueArea: boolean;
  /**
   * Per-row visibility within the 6-row Cluster Statistics strip (only
   * relevant when `showStats` is true). Default ALL true (matches today's
   * unconditional 6-row render). Row-level filtering dispatch lands in
   * PR 3 — footprintRender.ts renders all 6 rows unconditionally today
   * regardless of this field's values.
   */
  statsRows: {
    volume: boolean;
    delta: boolean;
    deltaPct: boolean;
    maxDelta: boolean;
    minDelta: boolean;
    sessionDelta: boolean;
  };
}

/** Standard preset: ratio 1.5x (150%), 0.5% dust filter, singles highlighted. */
export const STANDARD_IMBALANCE_RATIO = 1.5;
/** Strict preset: ratio 3.0x (300%). */
export const STRICT_IMBALANCE_RATIO = 3.0;
/** Shared dust filter for Standard/Strict/Stacked — percent of candle total volume. */
export const DEFAULT_IMBALANCE_MIN_VOL_PCT = 0.5;
/** Stacked preset: minimum run length to qualify as "stacked". */
export const DEFAULT_STACKED_MIN = 3;

export const DEFAULT_FOOTPRINT_CONFIG: FootprintConfig = {
  cellMode: 'bidAsk',
  imbalancePreset: 'standard',
  imbalanceRatio: STANDARD_IMBALANCE_RATIO,
  imbalanceMinVolPct: DEFAULT_IMBALANCE_MIN_VOL_PCT,
  stackedMin: DEFAULT_STACKED_MIN,
  imbalanceStackedOnly: false,
  showTotals: true,
  showPoc: true,
  showStats: true,
  magnifierEnabled: true,
  layout: 'numbers',
  colorScheme: 'delta',
  showValueArea: false,
  statsRows: {
    volume: true,
    delta: true,
    deltaPct: true,
    maxDelta: true,
    minDelta: true,
    sessionDelta: true,
  },
};
