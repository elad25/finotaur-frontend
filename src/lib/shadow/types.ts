// src/lib/shadow/types.ts
// Pure type definitions for the Shadow scenario engine.
// No React, no network, no Supabase.

export type Side = 'LONG' | 'SHORT';
export type Granularity = '1m' | 'tick';
export type Confidence = 'high' | 'ambiguous';

export type ScenarioKey =
  | 'actual'
  | 'held_original_stop'
  | 'original_target_hit'
  | 'held_loser_past_stop'
  | 'moved_stop_to_breakeven'
  | 'no_stop_moves'
  | 'no_target_moves'
  | 'no_trade';

/** OHLC price bar. t = ms epoch. */
export interface PriceBar { t: number; o: number; h: number; l: number; c: number; }

export interface ActualExit { price: number; qty: number; time: number; }

/**
 * Forward-only stop/target modification history. May be empty for
 * historical trades. Maps 1:1 to a row in `shadow_order_modifications`
 * (kind, price, event_time -> time).
 *
 * `fromPrice` is OPTIONAL: the current capture pipeline
 * (migration 20260620130000_shadow_order_modifications.sql) is forward-only
 * and does not record the price an order was modified FROM — only the new
 * `price` it was set to. When a future capture source supplies it directly,
 * the engine will prefer it; otherwise it is derived from the modification
 * chain (see `extractModificationMarkers` / originalStop-target derivation
 * in scenarioEngine.ts), seeded by ShadowTradeInput.originalStop/originalTarget.
 */
export interface OrderModification {
  time: number;
  kind: 'stop' | 'target';
  price: number;
  fromPrice?: number | null;
}

/**
 * UI-facing representation of a single stop/target modification, with the
 * price it moved FROM resolved (either captured directly on the
 * OrderModification, or derived from the modification chain). Sorted by
 * `at` ascending — see `extractModificationMarkers`.
 */
export interface ModificationMarker {
  kind: 'stop' | 'target';
  /** ms epoch — same time base as PriceBar.t. */
  at: number;
  fromPrice: number | null;
  toPrice: number;
}

export interface StrategyRules { stopPrice?: number | null; targetPrice?: number | null; rMultiple?: number | null; }

export interface ShadowTradeInput {
  side: Side;
  entryPrice: number;
  entryTime: number;        // ms epoch
  qty: number;
  multiplier: number;       // contract point value
  actualExits: ActualExit[];
  originalStop?: number | null;    // first stop set at entry
  originalTarget?: number | null;  // first target set at entry
  modifications?: OrderModification[]; // optional, forward-only
  pricePath: PriceBar[];   // bars over the trade lifetime, ascending by t
  granularity: Granularity;
  strategyRules?: StrategyRules | null;
  config?: EngineConfig;
  /**
   * Net P&L as recorded on the trade (fees deducted), when known — typically
   * `trade.pnl` from the journal. Used only to derive a per-trade fee
   * estimate (see `estimateFeeUsd` in lib/journal/fees.ts) that normalizes
   * every hypothetical scenario's USD onto the same net-of-fees basis as the
   * actual trade. Optional — when absent, the fee estimate is 0 and every
   * scenario stays gross (unchanged from pre-fee-normalization behavior).
   */
  netPnlUsd?: number | null;
}

export interface EngineConfig {
  /** R multiple at which the stop moves to breakeven. Default 1.0. */
  breakevenTriggerR?: number;
}

export interface ScenarioResult {
  key: ScenarioKey;
  label: string;
  pnlUsd: number | null;
  rMultiple: number | null;
  exitPrice: number | null;
  exitTime: number | null;
  confidence: Confidence;
  /** One-line plain-English explanation. */
  note: string;
  /** false when required levels are missing for this scenario. */
  available: boolean;
  /** true when the scenario is estimated/simulated rather than derived from real captured data. */
  simulated?: boolean;
}

export interface ShadowEngineResult {
  scenarios: ScenarioResult[];
  /** $ risk used as the R denominator. null when no stop and no strategy. */
  riskUsd: number | null;
  actualPnlUsd: number;
  /** Stop/target modification history, resolved to from/to prices, sorted by time. For UI markers. */
  modificationMarkers: ModificationMarker[];
}
