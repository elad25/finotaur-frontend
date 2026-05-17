/**
 * FinotaurChart — types and contracts
 *
 * The charting system is intentionally generic: it knows nothing about Trade,
 * Backtest, or any business object. Callers (TradeChart, ReplayChart, Live tab,
 * etc.) translate their domain objects into the primitives below.
 *
 * Bar = single OHLCV candle, compatible with lightweight-charts CandlestickData.
 * Marker = single visual annotation on a candle (entry arrow, exit arrow, etc.).
 * ChartDataSource = pluggable interface for fetching bars from any backend
 *   (Yahoo via Edge Function, Binance direct, future TwelveData, Polygon, etc.).
 */

import type { UTCTimestamp } from 'lightweight-charts';

/** A single OHLCV candle. `time` is Unix seconds (UTC) — matches lightweight-charts. */
export interface Bar {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** Yahoo-style intervals. Binance source maps internally. */
export type Interval =
  | '1m'
  | '2m'
  | '5m'
  | '15m'
  | '30m'
  | '60m'
  | '1h'
  | '4h'
  | '1d'
  | '1wk'
  | '1mo';

export type ChartTheme = 'dark' | 'light';

/** Visual annotation on a candle. Mirrors lightweight-charts SeriesMarker. */
export interface ChartMarker {
  /** Unix seconds (UTC). Must match a bar's `time` for clean alignment. */
  time: UTCTimestamp;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  /** Any CSS color string. Kept open-ended; theme tokens live in caller. */
  color: string;
  /** Optional label rendered next to the marker. Keep under ~15 chars to avoid clipping. */
  text?: string;
  /** Pixel size. lightweight-charts default is 1; we typically use 1-2. */
  size?: number;
}

/**
 * Pluggable bar fetch contract.
 *
 * Implementations: YahooFinanceSource (via Edge Function), BinanceSource (direct).
 * Future: TwelveDataSource, PolygonSource, etc.
 *
 * Contract:
 * - `symbol` is already resolved to the source's native format (Yahoo: `MNQ=F`,
 *   Binance: `BTCUSDT`). Resolution happens in the caller via `toYahooSymbol`
 *   / `toBinanceSymbol`.
 * - `from` / `to` are Unix seconds (UTC), inclusive.
 * - Returned bars are strictly ascending by `time`, deduplicated, within [from, to].
 * - Errors thrown as `Error` with a meaningful message — callers surface via
 *   FinotaurChart's `onError` callback.
 */
export interface ChartDataSource {
  getBars(
    symbol: string,
    interval: Interval,
    from: UTCTimestamp,
    to: UTCTimestamp,
  ): Promise<Bar[]>;
}

/** Source provenance — useful for logging + the "cached vs fetched" debugging in Phase 0. */
export interface BarFetchMeta {
  source: 'yahoo' | 'binance';
  cached_count?: number;
  fetched_count?: number;
}

// ═══════════════════════════════════════════════════════════════
// Indicators (Phase 2)
// ═══════════════════════════════════════════════════════════════

export type IndicatorType = 'SMA' | 'EMA' | 'RSI' | 'VWAP';

/**
 * A single indicator overlay on the chart.
 *
 * - SMA / EMA / VWAP render as a line on the price pane.
 * - RSI renders on its own price scale (bottom ~25% via scaleMargins) with
 *   horizontal 30/70 reference lines.
 *
 * `period` is ignored for VWAP (always cumulative from the first visible bar,
 * not a rolling window in Phase 2).
 * `color` is optional — when omitted, FinotaurChart picks from its palette.
 */
export interface Indicator {
  type: IndicatorType;
  period: number;
  color?: string;
}

/**
 * User-toggleable indicator state, persisted in localStorage.
 *
 * Periods are fixed in Phase 2 (SMA 20, EMA 50, RSI 14). A future phase may
 * expose a settings menu per chip; until then this shape is intentionally a
 * flat 4-boolean record so localStorage migration is trivial.
 */
export interface IndicatorSettings {
  sma: boolean;
  ema: boolean;
  rsi: boolean;
  vwap: boolean;
}

/** Fresh state — no indicators active until the user opts in. */
export const INDICATOR_DEFAULTS: IndicatorSettings = {
  sma: false,
  ema: false,
  rsi: false,
  vwap: false,
};

/** Fixed periods for Phase 2. */
export const INDICATOR_PERIODS = {
  sma: 20,
  ema: 50,
  rsi: 14,
} as const;
