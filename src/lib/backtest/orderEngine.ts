/**
 * orderEngine — pure helper functions for broker-grade position management.
 *
 * All functions here are pure (no side effects, no imports from React or
 * Supabase). They are called from the useBacktestSession reducer which owns
 * the actual state transitions.
 *
 * Sections:
 *   1. TakeProfitLeg — multi-leg TP model
 *   2. CommissionConfig — session-level fee/slippage config
 *   3. FillRecord — per-fill audit record attached to a position
 *   4. partialCloseSize — quantity helper for partial closes
 *   5. validateTakeProfitLegs — guard for leg array integrity
 *   6. applySlippage — fill-price adjustment for market/stop orders
 *   7. applyCommission — fee computation per fill
 *   8. breakevenStop — compute SL price at break-even
 */

// ─── 1. TakeProfitLeg ────────────────────────────────────────────

/**
 * A single take-profit leg. `sizePercent` is the share of the ORIGINAL
 * position size to close when this leg fills (0–100). All legs in an array
 * must sum ≤ 100; the remaining % is closed by the final exit (SL/manual).
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
}

// ─── 2. CommissionConfig ─────────────────────────────────────────

/**
 * Session-level fee and slippage model. All fields default to 0 so
 * existing sessions behave identically to before this feature was added.
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

// ─── 3. FillRecord ───────────────────────────────────────────────

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
  /** Net PnL = grossPnl - fees (0 for entries after fee deduction). */
  netPnl: number;
  time: number;
  /** Exit reason; only present on exit fills. */
  reason?: 'manual' | 'sl' | 'tp' | 'flatten' | 'reverse';
}

// ─── 4. partialCloseSize ─────────────────────────────────────────

/**
 * Compute the number of units to close given either a direct quantity or a
 * percentage of the CURRENT open qty.
 *
 * @param currentQty   Currently open quantity (must be > 0).
 * @param percentOrQty If > 1 (or exactly 1 with `isPercent=false`), treated
 *                     as an absolute unit count. If ≤ 1 AND `isPercent` is
 *                     true (or value is in (0,1]), treated as a fraction.
 *                     To avoid ambiguity the caller should always pass
 *                     `isPercent` explicitly.
 * @param isPercent    When true, `percentOrQty` is a fraction 0–1 (e.g. 0.5
 *                     = close 50%). When false, it is absolute qty.
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

// ─── 5. validateTakeProfitLegs ───────────────────────────────────

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

// ─── 6. applySlippage ────────────────────────────────────────────

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
  // Determine the direction slippage moves the price.
  // Entry: long fills higher, short fills lower.
  // Exit:  long exits lower (selling into slippage), short exits higher.
  const worsens: boolean = isEntry
    ? side === 'LONG'     // long entry → price goes up
    : side === 'SHORT';   // short exit  → price goes up (buy-to-cover costs more)

  return worsens
    ? rawPrice * (1 + slippageFactor)
    : rawPrice * (1 - slippageFactor);
}

// ─── 7. applyCommission ──────────────────────────────────────────

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

// ─── 8. breakevenStop ────────────────────────────────────────────

/**
 * Compute the stop-loss price that represents break-even for a position.
 *
 * @param entryPrice   Average entry price of the position.
 * @param offset       Optional price offset to move SL slightly beyond
 *                     entry (e.g. +1 tick for LONG). Defaults to 0.
 *                     Positive offset moves SL in the direction that is
 *                     slightly profitable for the holder:
 *                       LONG:  SL = entryPrice + offset  (above entry = small profit locked)
 *                       SHORT: SL = entryPrice - offset  (below entry = small profit locked)
 * @param side         Position side — determines which direction is "above entry".
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
