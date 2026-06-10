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

/**
 * A single take-profit leg.
 *
 * Phase 7 extended version: includes `id` + `sizePercent` + `filled` flag.
 * Backward-compatible addition — the old `portion` field is preserved as an
 * alias that runStrategy.ts may still produce; new code uses `sizePercent`.
 */
export interface TakeProfitLeg {
  /** Unique id generated at creation (e.g. `tp_<timestamp>_<random>`). */
  id: string;
  /** Trigger price for this leg. */
  price: number;
  /**
   * Percentage of the ORIGINAL position size to close on fill (0–100).
   * Fractions allowed; sum of all legs in one position must be ≤ 100.
   */
  sizePercent: number;
  /** True once the leg has been partially filled and the qty removed. */
  filled?: boolean;
  /**
   * Legacy alias kept for backward compat with runStrategy.ts objects that
   * carry `portion` (0–1 fraction). The reducer normalises via migratePosition
   * which converts portion → sizePercent. New code uses `sizePercent` only.
   * @deprecated use sizePercent
   */
  portion?: number;
}

// ─── CommissionConfig ────────────────────────────────────────────

/**
 * Session-level fee and slippage model. All fields default to 0 so existing
 * sessions behave identically to before this feature was added.
 *
 * commissionPerOrder — flat dollar amount charged per fill event.
 * commissionPercent  — percentage of fill notional charged per fill (0.1 = 0.1%).
 * slippagePercent    — worsens fill price for market + stop fills only;
 *                      limit fills execute at the limit price (no slippage
 *                      applied — standard simulation convention).
 *
 * Both commission fields stack: totalFee = commissionPerOrder + (notional * commissionPercent/100).
 */
export interface CommissionConfig {
  commissionPerOrder: number;
  commissionPercent: number;
  slippagePercent: number;
}

export const DEFAULT_COMMISSION_CONFIG: CommissionConfig = {
  commissionPerOrder: 0,
  commissionPercent: 0,
  slippagePercent: 0,
};

// ─── FillRecord ─────────────────────────────────────────────────

/**
 * Audit record for one fill event on a position (entry, partial exit,
 * final exit). Attached as `fills` on PaperPosition.
 */
export interface FillRecord {
  /** 'entry' | 'partial_exit' | 'final_exit' */
  kind: 'entry' | 'partial_exit' | 'final_exit';
  price: number;
  qty: number;
  /** Gross PnL for this fill (0 for entries). */
  grossPnl: number;
  /** Total fees charged for this fill. */
  fees: number;
  /** Net PnL = grossPnl - fees (negative for entries = entry fee deducted). */
  netPnl: number;
  time: number;
  /** Exit reason; only present on exit fills. */
  reason?: 'manual' | 'sl' | 'tp' | 'flatten' | 'reverse';
}

// ─── partialCloseSize ────────────────────────────────────────────

/**
 * Compute the number of units to close given either a direct quantity or a
 * percentage of the CURRENT open qty.
 *
 * @param currentQty   Currently open quantity (must be > 0).
 * @param percentOrQty If isPercent=true: fraction 0–1 (e.g. 0.5 = 50%).
 *                     If isPercent=false: absolute unit count.
 * @param isPercent    When true, percentOrQty is a fraction 0–1.
 * @returns            Clamped close qty in (0, currentQty].
 */
export function partialCloseSize(
  currentQty: number,
  percentOrQty: number,
  isPercent: boolean,
): number {
  if (currentQty <= 0) return 0;
  const raw = isPercent ? currentQty * Math.min(percentOrQty, 1) : percentOrQty;
  return Math.min(Math.max(raw, 0), currentQty);
}

/**
 * Breakeven stop = entry price ± optional offset in the favorable direction.
 *
 * @param entryPrice   Average entry price of the position.
 * @param side         Position side — determines which direction is "above entry".
 * @param offset       Optional price offset (defaults to 0). Positive offset moves
 *                     SL slightly into profit: LONG → entryPrice + offset,
 *                     SHORT → entryPrice - offset.
 * @returns            Break-even stop price.
 */
export function breakevenStop(
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  offset: number = 0,
): number {
  return side === 'LONG'
    ? entryPrice + offset
    : entryPrice - offset;
}

// ─── validateTakeProfitLegs ──────────────────────────────────────

export type LegValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Validate a take-profit leg array:
 *   - Each leg must have price > 0 and sizePercent in (0, 100].
 *   - Sum of all sizePercent values must be ≤ 100.
 *   - No duplicate prices.
 */
export function validateTakeProfitLegs(legs: TakeProfitLeg[]): LegValidationResult {
  if (legs.length === 0) return { ok: true };

  let sum = 0;
  const prices = new Set<number>();

  for (const leg of legs) {
    if (leg.price <= 0) {
      return { ok: false, reason: `Leg ${leg.id}: price must be > 0` };
    }
    if (leg.sizePercent <= 0 || leg.sizePercent > 100) {
      return { ok: false, reason: `Leg ${leg.id}: sizePercent must be in (0, 100]` };
    }
    if (prices.has(leg.price)) {
      return { ok: false, reason: `Duplicate take-profit price: ${leg.price}` };
    }
    prices.add(leg.price);
    sum += leg.sizePercent;
  }

  if (sum > 100 + Number.EPSILON) {
    return { ok: false, reason: `Total leg sizePercent (${sum.toFixed(2)}) exceeds 100` };
  }

  return { ok: true };
}

// ─── applySlippage ───────────────────────────────────────────────

/**
 * Adjust a fill price for slippage on market/stop orders.
 * Limit orders are always filled at their limit price (no slippage).
 *
 * Slippage worsens the fill in the direction of the trade:
 *   - Long entry  → fill price HIGHER (pay more)
 *   - Short entry → fill price LOWER  (receive less)
 *   - Long exit   → fill price LOWER  (receive less on sell)
 *   - Short exit  → fill price HIGHER (pay more on buy-to-cover)
 *
 * @param rawPrice      Nominal fill price before slippage.
 * @param side          Position side ('LONG' | 'SHORT').
 * @param isEntry       True for entries, false for exits.
 * @param orderType     Only MARKET and STOP fills incur slippage.
 * @param config        Session commission/slippage config.
 * @returns             Adjusted fill price.
 */
export function applySlippage(
  rawPrice: number,
  side: 'LONG' | 'SHORT',
  isEntry: boolean,
  orderType: 'MARKET' | 'LIMIT' | 'STOP',
  config: CommissionConfig,
): number {
  // Limit fills: no slippage by convention.
  if (orderType === 'LIMIT' || config.slippagePercent <= 0) {
    return rawPrice;
  }

  const slippageFactor = config.slippagePercent / 100;
  // Entry: long fills higher, short fills lower.
  // Exit:  long exits lower (selling into slippage), short exits higher.
  const worsens: boolean = isEntry
    ? side === 'LONG'     // long entry → price goes up
    : side === 'SHORT';   // short exit  → price goes up (buy-to-cover costs more)

  return worsens
    ? rawPrice * (1 + slippageFactor)
    : rawPrice * (1 - slippageFactor);
}

// ─── applyCommission ─────────────────────────────────────────────

/**
 * Compute the total fee for a single fill event.
 *
 * @param fillPrice  The (already slippage-adjusted) fill price.
 * @param qty        Number of units in this fill.
 * @param config     Session commission config.
 * @returns          Dollar amount to deduct from PnL as fees.
 */
export function applyCommission(
  fillPrice: number,
  qty: number,
  config: CommissionConfig,
): number {
  const notional = fillPrice * qty;
  return config.commissionPerOrder + notional * (config.commissionPercent / 100);
}
