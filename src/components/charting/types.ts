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

/** Yahoo-style intervals. Binance source maps internally.
 *  '1s' is a Binance-only addition (Trading Arena SECONDS timeframes) — no
 *  other source supports it; see BinanceSource's INTERVAL_MAP. */
export type Interval =
  | '1s'
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
  /**
   * OPTIONAL live last-bar subscription. Only implemented by sources with a
   * real-time feed (BinanceSource — crypto only) and by AggregatingSource
   * when the base source it wraps implements it. Absent (`undefined`) on
   * every other source (YahooFinanceSource, DatabentoCacheSource,
   * DatabentoYahooFallbackSource) — a complete no-op for futures/stocks,
   * zero behavior change there.
   *
   * `onBar` fires on every tick (not only closed candles) with the bar
   * currently forming — callers should replace-or-append against their own
   * last-loaded bar by `time`, never assume one call = one new bar.
   *
   * Returns an unsubscribe function; callers MUST invoke it on cleanup
   * (symbol/interval/source change, unmount) to close the underlying feed.
   */
  subscribeBars?(
    symbol: string,
    interval: Interval,
    onBar: (bar: Bar) => void,
  ): () => void;
}

/** Source provenance — useful for logging + the "cached vs fetched" debugging in Phase 0. */
export interface BarFetchMeta {
  source: 'yahoo' | 'binance';
  cached_count?: number;
  fetched_count?: number;
}

/**
 * A single order/position price-level line drawn on the main candle series
 * (Trading Arena paper-trading overlay — active position, pending orders,
 * SL/TP). Distinct from `OverlayPriceLine` (FinotaurChart.tsx, used for
 * order-book walls) because callers here update `price`/`title`/`color` on
 * an EXISTING `id` every tick (e.g. live unrealized PnL in the title) and
 * expect the line to update in place, not just be added/removed by id.
 */
export interface ChartOrderLine {
  /** Stable unique key — used for diffing (add/update/remove). */
  id: string;
  price: number;
  color: string;
  lineStyle: 'solid' | 'dashed';
  title: string;
}

// ═══════════════════════════════════════════════════════════════
// Indicators (Phase 2 + Phase 2.5)
// ═══════════════════════════════════════════════════════════════

export type IndicatorType =
  | 'SMA'
  | 'EMA'
  | 'RSI'
  | 'VWAP'
  | 'MACD'
  | 'BBANDS'
  | 'ATR';

/**
 * Optional per-line visual style override for one series line of an
 * indicator. Added for the Trading Arena's TradingView-style per-indicator
 * settings dialog (see trading-arena/components/IndicatorSettingsDialog.tsx
 * + indicatorsSettings.ts's `ArenaIndicatorLineStyle`, which is structurally
 * identical). Every field is OPTIONAL — when a caller never sets
 * `Indicator.lineStyles`, FinotaurChart's series creation is byte-for-byte
 * identical to its pre-existing hardcoded appearance (Journal/Backtest/
 * ReplayChart never set this field).
 */
export interface IndicatorLineStyle {
  visible?: boolean;
  color?: string;
  /** 0-1 opacity multiplier applied on top of `color`. */
  opacity?: number;
  thickness?: 1 | 2 | 3 | 4;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
}

/**
 * Named style slots covering every indicator's output line(s):
 *  - single-line indicators (SMA/EMA/VWAP/RSI/ATR) use `line`
 *  - MACD uses `macdLine` / `signalLine` / `histogram`
 *  - BBANDS uses `basis` / `upper` / `lower`
 */
export interface IndicatorLineStyles {
  line?: IndicatorLineStyle;
  macdLine?: IndicatorLineStyle;
  signalLine?: IndicatorLineStyle;
  histogram?: IndicatorLineStyle;
  basis?: IndicatorLineStyle;
  upper?: IndicatorLineStyle;
  lower?: IndicatorLineStyle;
}

/**
 * A single indicator overlay on the chart.
 *
 * Phase 2:
 *  - SMA / EMA / VWAP render as a line on the price pane.
 *  - RSI renders on its own price scale (bottom ~25% via scaleMargins) with
 *    horizontal 30/70 reference lines.
 *
 * Phase 2.5 additions:
 *  - MACD renders in its own subpane (3 series: line, signal, histogram).
 *  - Bollinger Bands render as 3 lines on the price pane (middle solid,
 *    upper/lower dimmed).
 *  - ATR renders in its own subpane (single line, $-valued).
 *
 * `period` semantics:
 *  - SMA / EMA / RSI / BBANDS / ATR: the lookback window (bars).
 *  - VWAP: ignored (always cumulative from the first visible bar).
 *  - MACD: ignored (fast / slow / signal are fixed at 12 / 26 / 9 in Phase 2.5).
 *
 * `color` is optional — when omitted, FinotaurChart picks from its palette.
 *
 * `macdParams` / `bbandsStdDev` (added for the Trading Arena's editable
 * Indicators popup — see trading-arena/components/indicatorsSettings.ts) are
 * OPTIONAL per-indicator overrides for the two parameterized types. When
 * omitted, FinotaurChart's compute calls fall back to their own hardcoded
 * defaults (12/26/9 for MACD, stdDev=2 for BBANDS) — so every existing
 * caller (Journal/Backtest/ReplayChart) that never sets these fields is
 * unaffected.
 */
export interface Indicator {
  type: IndicatorType;
  period: number;
  color?: string;
  /** MACD-only override for the fast/slow/signal EMA periods. */
  macdParams?: { fast: number; slow: number; signal: number };
  /** BBANDS-only override for the standard-deviation multiplier. */
  bbandsStdDev?: number;
  /**
   * Optional per-line style overrides (Trading Arena only — see
   * `IndicatorLineStyles` above). Absent for every non-Arena caller.
   */
  lineStyles?: IndicatorLineStyles;
  /**
   * Stable per-instance id (Trading Arena's INSTANCES model — see
   * indicatorsSettings.ts's `ArenaIndicatorInstance`/
   * `buildIndicatorsFromArenaSettings`) that lets the SAME indicator type be
   * added multiple times (e.g. EMA 9 + EMA 21) as independent series/panes.
   * FinotaurChart.tsx keys its series/pane bookkeeping by
   * `instanceId ?? type` — when absent (every non-Arena caller: Journal/
   * Backtest/ReplayChart), behavior is byte-for-byte identical to before
   * this field existed (one series per type, as always).
   */
  instanceId?: string;
}

/**
 * User-toggleable indicator state, persisted in localStorage.
 *
 * Periods are fixed in Phase 2.5 — see `INDICATOR_PERIODS` below. A future
 * phase may expose a settings menu per chip; until then this shape is a
 * flat boolean record so localStorage migration is trivial.
 *
 * **All defaults are `false`** — preserves the Phase 1 visual appearance
 * until the user opts in. This is a hard requirement: do not flip any
 * default to true without explicit product approval.
 */
export interface IndicatorSettings {
  sma: boolean;
  ema: boolean;
  rsi: boolean;
  vwap: boolean;
  macd: boolean;
  bbands: boolean;
  atr: boolean;
}

/** Fresh state — no indicators active until the user opts in. */
export const INDICATOR_DEFAULTS: IndicatorSettings = {
  sma: false,
  ema: false,
  rsi: false,
  vwap: false,
  macd: false,
  bbands: false,
  atr: false,
};

/**
 * Fixed periods for Phase 2 + Phase 2.5. Scalars for single-period indicators,
 * nested objects for the parameterized ones (MACD / Bollinger).
 */
export const INDICATOR_PERIODS = {
  sma: 20,
  ema: 50,
  rsi: 14,
  macd: { fast: 12, slow: 26, signal: 9 },
  bbands: { period: 20, stdDev: 2 },
  atr: 14,
} as const;
