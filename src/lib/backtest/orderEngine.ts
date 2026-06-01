// ==========================================
// BACKTEST ORDER ENGINE — FOUNDATION (Phase 1)
// ==========================================
// Pure, side-effect-free helpers the Phase 2 "Advanced Order" panel builds on:
// order kinds, risk-based auto position sizing, and reward/risk calculation.
// Kept framework-agnostic so it can be unit-tested and reused by the replay engine.

export type OrderKind = 'market' | 'limit' | 'stop';
export type OrderSide = 'buy' | 'sell';

export interface RiskSizingParams {
  /** Account balance the risk is measured against. */
  balance: number;
  /** Risk as a percent of balance (e.g. 1 => 1%). Mutually exclusive with riskAmount. */
  riskPercent?: number;
  /** Risk as an absolute currency amount. Takes precedence over riskPercent if both set. */
  riskAmount?: number;
  /** Intended entry price. */
  entryPrice: number;
  /** Protective stop price. */
  stopLoss: number;
  /** Contract/point multiplier (futures, FX lots). Defaults to 1. */
  contractMultiplier?: number;
}

export interface RewardRisk {
  /** Reward in account currency (per the supplied size, or per 1 unit if size omitted). */
  reward: number;
  /** Risk in account currency. */
  risk: number;
  /** Reward-to-risk ratio. 0 when risk is 0 (undefined R:R). */
  rr: number;
}

/** Resolve the currency amount being risked from percent/absolute inputs. */
export function resolveRiskAmount(params: Pick<RiskSizingParams, 'balance' | 'riskPercent' | 'riskAmount'>): number {
  if (typeof params.riskAmount === 'number' && params.riskAmount > 0) {
    return params.riskAmount;
  }
  if (typeof params.riskPercent === 'number' && params.riskPercent > 0) {
    return (params.balance * params.riskPercent) / 100;
  }
  return 0;
}

/**
 * Auto position size = riskAmount / (perUnitRisk * multiplier).
 * perUnitRisk is the absolute price distance between entry and stop.
 * Returns 0 when the stop is invalid (no distance) to avoid divide-by-zero / infinite size.
 */
export function calcPositionSize(params: RiskSizingParams): number {
  const multiplier = params.contractMultiplier ?? 1;
  const perUnitRisk = Math.abs(params.entryPrice - params.stopLoss) * multiplier;
  if (perUnitRisk <= 0) return 0;

  const riskAmount = resolveRiskAmount(params);
  if (riskAmount <= 0) return 0;

  return riskAmount / perUnitRisk;
}

/** Validate stop/target placement relative to side. Returns null if valid, else a reason. */
export function validateOrderLevels(
  side: OrderSide,
  entryPrice: number,
  stopLoss?: number | null,
  takeProfit?: number | null
): string | null {
  if (side === 'buy') {
    if (stopLoss != null && stopLoss >= entryPrice) return 'Stop loss must be below entry for a buy';
    if (takeProfit != null && takeProfit <= entryPrice) return 'Profit target must be above entry for a buy';
  } else {
    if (stopLoss != null && stopLoss <= entryPrice) return 'Stop loss must be above entry for a sell';
    if (takeProfit != null && takeProfit >= entryPrice) return 'Profit target must be below entry for a sell';
  }
  return null;
}

/**
 * Reward/risk in account currency. If `size`/`multiplier` are omitted they default to 1,
 * yielding a per-unit reward/risk whose ratio still equals the true R:R.
 */
export function calcRewardRisk(
  side: OrderSide,
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  size = 1,
  contractMultiplier = 1
): RewardRisk {
  const unit = size * contractMultiplier;
  const riskPerUnit = Math.abs(entryPrice - stopLoss);
  const rewardPerUnit = Math.abs(takeProfit - entryPrice);

  const risk = riskPerUnit * unit;
  const reward = rewardPerUnit * unit;
  const rr = risk > 0 ? reward / risk : 0;

  return { reward, risk, rr };
}

// ==========================================
// POSITION MANAGEMENT (Phase 2 — partials / breakeven / multi-TP)
// ==========================================

/** A take-profit leg: close `portion` (0–1 fraction of original size) at `price`. */
export interface TakeProfitLeg {
  price: number;
  /** Fraction of the ORIGINAL position size to close at this leg (0–1). */
  portion: number;
}

/**
 * Compute the size to close for a partial. `percent` is 0–100 of the CURRENT
 * remaining size. Clamped so you can never close more than remains.
 */
export function partialCloseSize(remainingSize: number, percent: number): number {
  const pct = Math.max(0, Math.min(100, percent));
  return (remainingSize * pct) / 100;
}

/**
 * Breakeven stop = entry price (optionally offset by `ticks * tickSize` in the
 * favorable direction to also cover fees/slippage). Returns the new stop price.
 */
export function breakevenStop(
  side: OrderSide,
  entryPrice: number,
  offsetTicks = 0,
  tickSize = 0
): number {
  const offset = offsetTicks * tickSize;
  return side === 'buy' ? entryPrice + offset : entryPrice - offset;
}

/**
 * Validate a set of TP legs: portions must each be >0 and sum to ≤ 1 (≤100%).
 * Returns null if valid, else a reason string.
 */
export function validateTakeProfitLegs(legs: TakeProfitLeg[]): string | null {
  if (legs.length === 0) return null;
  let total = 0;
  for (const leg of legs) {
    if (leg.portion <= 0) return 'Each take-profit portion must be greater than 0';
    total += leg.portion;
  }
  if (total > 1.0001) return 'Take-profit portions cannot exceed 100%';
  return null;
}
