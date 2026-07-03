// ============================================================================
// AUTO PATTERN-DETECTION BACKTEST — SERIALIZABLE CONFIG & RESULT TYPES
// ============================================================================
//
// All interfaces here are PLAIN, JSON-safe data (no functions, no classes,
// no Date objects). A `SetupDefinition` is meant to round-trip through
// JSON.stringify / structuredClone so it can be persisted to Supabase and
// posted into a Web Worker without loss.
//
// Look-ahead safety lives in the detectors/engine, not here — this file only
// describes the *shape* of a setup and the *shape* of detector output.
// ============================================================================

/** Supported ICT-style pattern families. */
export type PatternType = 'FVG' | 'IFVG' | 'BREAKER' | 'OB' | 'LIQUIDITY';

/** Trade direction a setup is allowed to take. */
export type Direction = 'long' | 'short' | 'both';

/** How a detected zone must be touched/consumed by price to stay valid. */
export type Mitigation = 'none' | 'partial' | 'full';

// ----------------------------------------------------------------------------
// Per-pattern parameters (discriminated union on `type`)
// ----------------------------------------------------------------------------

export interface FVGParams {
  type: 'FVG';
  /** Minimum gap size as a fraction of price (0.05 = 0.05%). */
  minGapPct: number;
  /** Optional alternative threshold: gap >= minGapAtrMult * ATR. */
  minGapAtrMult?: number;
  /** Require the middle (impulse) candle to be a displacement candle. */
  requireDisplacement: boolean;
  /** Displacement = body >= displacementBodyMult * ATR. */
  displacementBodyMult: number;
  /** How much of the gap price may consume before it is considered dead. */
  mitigation: Mitigation;
  /** Drop the zone after this many bars from formation. */
  maxAgeBars: number;
}

export interface IFVGParams {
  type: 'IFVG';
  /** The base FVG definition (without its own `type` tag). */
  baseFvg: Omit<FVGParams, 'type'>;
  /** Require a candle CLOSE through the far side to confirm inversion. */
  confirmCloseThrough: boolean;
  maxAgeBars: number;
}

export interface BreakerParams {
  type: 'BREAKER';
  swing: { lookback: number };
  requireLiquiditySweep: boolean;
  requireMSS: boolean;
  maxAgeBars: number;
}

export interface OBParams {
  type: 'OB';
  swing: { lookback: number };
  /** Which candle becomes the order block. */
  obKind: 'last-opposite-candle' | 'last-down-before-up';
  /** Require a displacement candle leaving the order block. */
  requireDisplacementOut: boolean;
  displacementBodyMult: number;
  mitigation: Mitigation;
  maxAgeBars: number;
}

export interface LiquidityParams {
  type: 'LIQUIDITY';
  /** 'sweep' = stop-run beyond a swing; 'equal-levels' = liquidity pool. */
  mode: 'sweep' | 'equal-levels';
  swing: { lookback: number };
  /**
   * Tolerance (in %) for clustering equal highs/lows.
   * Applies to 'equal-levels' mode ONLY -- detectSweep() never reads this.
   */
  equalTolerancePct: number;
  /**
   * Minimum touches to qualify as an equal-levels pool.
   * Applies to 'equal-levels' mode ONLY -- detectSweep() never reads this.
   */
  minTouches: number;
  /** Require price to reclaim the swept level (close back inside). */
  requireReclaim: boolean;
  /** Require a market-structure-shift after the sweep. */
  requireMSS: boolean;
}

export type PatternParams =
  | FVGParams
  | IFVGParams
  | BreakerParams
  | OBParams
  | LiquidityParams;

// ----------------------------------------------------------------------------
// Entry / stop / target / filter rules
// ----------------------------------------------------------------------------

export interface EntryRule {
  /**
   * - 'zone-tap'      : limit at the zone edge facing entry
   * - 'zone-50'       : limit at the zone midpoint
   * - 'close-confirm' : market on the next open after a confirming close
   * - 'sweep-then-mss': market on the next open after sweep + MSS
   */
  trigger: 'zone-tap' | 'zone-50' | 'close-confirm' | 'sweep-then-mss';
  orderType: 'limit' | 'market';
  /** How many bars the armed signal stays valid before it expires. */
  validForBars: number;
}

export interface StopRule {
  /**
   * - 'swing'         : just beyond the reference swing
   * - 'zone-far-edge' : just beyond the far edge of the zone
   * - 'atr'           : entry ∓ atrMult * ATR
   * - 'fixed-pct'     : entry ∓ fixedPct%
   */
  basis: 'swing' | 'zone-far-edge' | 'atr' | 'fixed-pct';
  atrMult?: number;
  fixedPct?: number;
  /** Extra padding (in %) added beyond the computed stop. */
  bufferPct?: number;
}

export interface TargetRule {
  /**
   * - 'r-multiple'         : entry ± rMultiple * |entry - stop|
   * - 'opposing-liquidity' : nearest opposing swing/pool (fallback to R)
   * - 'fixed-pct'          : entry ± fixedPct%
   */
  basis: 'r-multiple' | 'opposing-liquidity' | 'fixed-pct';
  rMultiple?: number;
  fixedPct?: number;
  /** Optional scale-out plan (informational for MVP single-exit engine). */
  partials?: Array<{ atR: number; sizePct: number; moveStopToBE?: boolean }>;
}

export interface SessionFilter {
  enabled: boolean;
  /** IANA timezone, e.g. 'America/New_York'. */
  timezone: string;
  /** Allowed intraday windows, 'HH:MM' 24h local to `timezone`. */
  windows: Array<{ start: string; end: string }>;
  /** Allowed weekdays (0=Sun..6=Sat). Omit/empty = all days. */
  days?: number[];
}

export interface BiasFilter {
  enabled: boolean;
  /** Higher-timeframe label, e.g. '4h' or '1d'. */
  htfTimeframe: string;
  method: 'ema' | 'structure';
  emaLength?: number;
}

export interface RiskConfig {
  riskPerTradePct: number;
  /** Max simultaneously-open positions (MVP engine enforces 1). */
  maxConcurrent: number;
  maxTradesPerDay?: number;
  initialBalance: number;
  commissionPct?: number;
  slippagePct?: number;
}

export interface SetupDefinition {
  id: string;
  schemaVersion: 1;
  name: string;
  description?: string;
  direction: Direction;
  patterns: PatternParams[];
  entry: EntryRule;
  stop: StopRule;
  target: TargetRule;
  session: SessionFilter;
  bias: BiasFilter;
  risk: RiskConfig;
  instrument: {
    symbol: string;
    timeframe: string;
    source: 'binance' | 'polygon' | 'udf';
  };
  createdAt: number;
  updatedAt: number;
}

// ----------------------------------------------------------------------------
// Detector output
// ----------------------------------------------------------------------------

/** A price zone (always top >= bottom). */
export interface Zone {
  top: number;
  bottom: number;
}

export interface Detection {
  patternType: PatternType;
  direction: 'long' | 'short';
  /** Bar at which the pattern is fully confirmed using only data <= here. */
  formedAtIndex: number;
  zone: Zone;
  /** Reference swing the zone is anchored to (for stop placement). */
  refSwing?: { index: number; price: number };
  /** Free-form, JSON-safe diagnostic metadata. */
  meta: Record<string, number | string | boolean>;
}

export interface TradeSignal {
  detection: Detection;
  direction: 'long' | 'short';
  /** Earliest bar the signal can be filled (== detection.formedAtIndex). */
  armIndex: number;
  entryPrice: number;
  orderType: 'limit' | 'market';
  stopLoss: number;
  takeProfit: number;
  validForBars: number;
}

// ----------------------------------------------------------------------------
// Sensible defaults
// ----------------------------------------------------------------------------

export const DEFAULT_PATTERN_PARAMS: Record<PatternType, PatternParams> = {
  FVG: {
    type: 'FVG',
    minGapPct: 0.05,
    minGapAtrMult: 0.25,
    requireDisplacement: true,
    displacementBodyMult: 1.5,
    mitigation: 'partial',
    maxAgeBars: 50,
  },
  IFVG: {
    type: 'IFVG',
    baseFvg: {
      minGapPct: 0.05,
      minGapAtrMult: 0.25,
      requireDisplacement: true,
      displacementBodyMult: 1.5,
      mitigation: 'partial',
      maxAgeBars: 50,
    },
    confirmCloseThrough: true,
    maxAgeBars: 50,
  },
  BREAKER: {
    type: 'BREAKER',
    swing: { lookback: 2 },
    requireLiquiditySweep: true,
    requireMSS: true,
    maxAgeBars: 50,
  },
  OB: {
    type: 'OB',
    swing: { lookback: 2 },
    obKind: 'last-opposite-candle',
    requireDisplacementOut: true,
    displacementBodyMult: 1.5,
    mitigation: 'partial',
    maxAgeBars: 50,
  },
  LIQUIDITY: {
    type: 'LIQUIDITY',
    // Default is 'equal-levels', not 'sweep': measured on real Binance data
    // (9-cell grid x 3 slices), minTouches=4 + equalTolerancePct=0.03 cuts
    // over-detection ~85% vs the old minTouches=2 default and roughly doubles
    // profit factor -- the least-bad measured config. It also ensures the two
    // knobs the UI exposes (minTouches, equalTolerancePct) actually govern the
    // default mode instead of sitting inert (see LiquidityParams doc-comments).
    mode: 'equal-levels',
    swing: { lookback: 2 },
    equalTolerancePct: 0.03,
    minTouches: 4,
    requireReclaim: true,
    requireMSS: true,
  },
};

/**
 * Build a ready-to-run default setup for a symbol/timeframe. The caller can
 * mutate the returned object freely (it is a fresh deep copy of the defaults).
 */
export function makeDefaultSetup(
  symbol: string,
  timeframe: string,
): SetupDefinition {
  const now = Date.now();
  return {
    id: `setup_${now.toString(36)}`,
    schemaVersion: 1,
    name: `${symbol} ${timeframe} FVG setup`,
    description: 'Auto-generated default fair-value-gap setup.',
    direction: 'both',
    patterns: [structuredCloneParams(DEFAULT_PATTERN_PARAMS.FVG)],
    entry: { trigger: 'zone-50', orderType: 'limit', validForBars: 20 },
    stop: { basis: 'zone-far-edge', bufferPct: 0.02 },
    target: { basis: 'r-multiple', rMultiple: 2 },
    session: { enabled: false, timezone: 'America/New_York', windows: [] },
    bias: { enabled: false, htfTimeframe: '4h', method: 'ema', emaLength: 50 },
    risk: {
      riskPerTradePct: 1,
      maxConcurrent: 1,
      initialBalance: 10000,
      commissionPct: 0,
      slippagePct: 0,
    },
    instrument: { symbol, timeframe, source: 'binance' },
    createdAt: now,
    updatedAt: now,
  };
}

/** Deep clone of a PatternParams (avoids structuredClone availability quirks). */
function structuredCloneParams(p: PatternParams): PatternParams {
  return JSON.parse(JSON.stringify(p)) as PatternParams;
}
