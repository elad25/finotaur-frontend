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
  | 'no_trade';

/** OHLC price bar. t = ms epoch. */
export interface PriceBar { t: number; o: number; h: number; l: number; c: number; }

export interface ActualExit { price: number; qty: number; time: number; }

/** Forward-only stop/target modification history. May be empty for historical trades. */
export interface OrderModification { time: number; kind: 'stop' | 'target'; price: number; }

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
}
