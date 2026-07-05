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
   */
  backfill(
    symbol: string,
    fromMs: number,
    toMs: number,
    opts?: { maxRequests?: number; signal?: AbortSignal },
  ): Promise<{ trades: FlowTrade[]; coveredFromMs: number }>;
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
 */
export type FootprintCellMode = 'bidAsk' | 'delta' | 'volume';

export interface FootprintConfig {
  cellMode: FootprintCellMode;
  /**
   * Diagonal-imbalance ratio threshold (e.g. 3.0 = ask at level N is >= 300%
   * of bid at level N-1, or the inverse). Compared against consecutive price
   * levels within the same candle.
   */
  imbalanceRatio: number;
  /**
   * Minimum row volume, as a percent of the candle's total volume, required
   * before a row is eligible for imbalance highlighting. Filters out dust
   * rows that would otherwise trip the ratio test trivially.
   */
  imbalanceMinVolPct: number;
  /** Minimum consecutive same-side imbalanced levels to qualify as a "stacked" zone. */
  stackedMin: number;
  /** Render the per-candle Volume/Delta totals row above the time axis. */
  showTotals: boolean;
  /** Highlight the per-candle Point-of-Control (highest-volume bin) with a gold band. */
  showPoc: boolean;
}

export const DEFAULT_FOOTPRINT_CONFIG: FootprintConfig = {
  cellMode: 'bidAsk',
  imbalanceRatio: 3.0,
  imbalanceMinVolPct: 0.5,
  stackedMin: 3,
  showTotals: true,
  showPoc: true,
};
