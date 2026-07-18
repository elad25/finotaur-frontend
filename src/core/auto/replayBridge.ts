// ============================================================================
// REPLAY BRIDGE — automated → manual replay handoff contract
// ============================================================================
//
// When a user clicks "Inspect in Replay" on a trade produced by the automated
// backtest, the automated page navigates to the manual replay surface and
// hands off the context needed to reconstruct that exact moment: which
// instrument/timeframe, which candle window to load, where to focus the
// cursor, and (optionally) the originating detection + signal so the chart can
// draw the pattern zone.
//
// This type is the single source of truth for that router-state payload. It is
// JSON-safe (it only carries plain serializable data) so it survives a
// react-router `navigate(path, { state })` round-trip.
// ============================================================================

import type { Detection, TradeSignal } from './types';

export interface ReplayHandoff {
  /** Instrument symbol, e.g. 'BTCUSDT'. */
  symbol: string;
  /** Timeframe label, e.g. '15m'. */
  timeframe: string;
  /** Candle data source the automated run used ('binance' | 'polygon' | 'udf'). */
  source: string;
  /** Window start to load, ms (Unix epoch) — passed to loadCandles. */
  windowFrom: number;
  /** Window end to load, ms (Unix epoch) — passed to loadCandles. */
  windowTo: number;
  /** Time to center the replay cursor on, ms (Unix epoch). */
  focusTime: number;
  /** Originating pattern detection (for optional zone overlay on the chart). */
  detection?: Detection;
  /** Armed signal behind the trade (for optional entry/SL/TP overlay). */
  signal?: TradeSignal;
  /**
   * Starting balance the automated run used (RiskConfig.initialBalance), so
   * the manual replay session opens with the same account size instead of
   * the generic $10,000 default. Populated by TradeDetailPanel's
   * handleInspect from `setup.risk.initialBalance`.
   */
  initialBalance?: number;
}
