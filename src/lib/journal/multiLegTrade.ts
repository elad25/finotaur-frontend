/**
 * Data-layer module for multi-leg options trades.
 *
 * A multi-leg trade is modeled as:
 *   - ONE parent `trades` row (carries net premium, net P&L, strategy metadata)
 *   - N `trade_legs` rows (one per option leg)
 *
 * Net P&L is computed in the app layer and supplied on the parent row.
 * The handle_trade_changes_unified trigger is bypassed via input_mode='risk-only'
 * so the trigger never attempts its price-based recalculation on credit spreads
 * (where entry_price is negative).
 */

import { supabase } from '@/lib/supabase';
import { buildManualIdempotencyKey } from '@/lib/trades/idempotencyKey';
import {
  type TradeLeg,
  netPremiumPerShare,
  netMultiLegPnl,
  isMultiLegClosed,
  legSignedPnl,
} from '@/utils/tradeCalculations';

// Re-export TradeLeg so callers can import it from here if they prefer.
export type { TradeLeg };

// ---------------------------------------------------------------------------
// Public input type
// ---------------------------------------------------------------------------

export interface NewMultiLegInput {
  userId: string;
  symbol: string;       // underlying ticker (e.g. 'SPY', 'AAPL')
  strategyType: string; // one of OPTION_STRATEGY_TYPES values
  openAt: string;       // ISO timestamp
  closeAt?: string;     // ISO timestamp — required when all legs are closed
  legs: TradeLeg[];     // 2..8 legs
  notes?: string;
  setup?: string;
  strategyId?: string;  // optional FK to strategies table
  portfolioId?: string | null;
}

// ---------------------------------------------------------------------------
// Internal row shapes (typed just enough to avoid `any` where possible)
// ---------------------------------------------------------------------------

interface TradeInsertResult {
  id: string;
}

interface TradeLegInsert {
  trade_id: string;
  user_id: string;
  leg_number: number;
  option_type: 'CALL' | 'PUT';
  strike_price: number;
  expiration_date: string | null;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entry_price: number;
  exit_price: number | null;
  fees: number;
  gross_pnl: number | null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateInput(input: NewMultiLegInput): void {
  const { legs } = input;

  if (legs.length < 2 || legs.length > 8) {
    throw new Error(
      `Multi-leg trade requires 2–8 legs; got ${legs.length}.`,
    );
  }

  legs.forEach((leg, i) => {
    const n = i + 1;
    if (!leg.option_type) throw new Error(`Leg ${n}: option_type is required.`);
    if (!leg.side) throw new Error(`Leg ${n}: side is required.`);
    if (leg.strike_price == null || leg.strike_price <= 0)
      throw new Error(`Leg ${n}: strike_price must be positive.`);
    if (leg.quantity == null || leg.quantity <= 0)
      throw new Error(`Leg ${n}: quantity must be positive.`);
    if (leg.entry_price == null || leg.entry_price < 0)
      throw new Error(`Leg ${n}: entry_price must be ≥ 0.`);
  });
}

// ---------------------------------------------------------------------------
// createMultiLegTrade
// ---------------------------------------------------------------------------

/**
 * Creates a multi-leg options trade:
 *   1. Validates the input (2–8 legs, required fields present).
 *   2. Computes net premium and net P&L via the helpers in tradeCalculations.ts.
 *   3. Inserts one parent `trades` row.
 *   4. Inserts N `trade_legs` rows.
 *   5. On legs-insert failure, deletes the orphaned parent row (best-effort).
 *
 * Returns the new parent trade ID.
 */
export async function createMultiLegTrade(
  input: NewMultiLegInput,
): Promise<{ tradeId: string }> {
  validateInput(input);

  const { userId, symbol, strategyType, openAt, legs, notes, setup, strategyId, portfolioId } =
    input;

  const closed = isMultiLegClosed(legs);

  // Net entry premium per spread, per share (positive = debit, negative = credit).
  const netEntryPremium = netPremiumPerShare(legs);

  // Net exit premium per spread, per share (only meaningful when fully closed).
  const netExitPremium = closed
    ? legs.reduce(
        (sum, l) =>
          sum + (l.side === 'LONG' ? (l.exit_price ?? 0) : -(l.exit_price ?? 0)),
        0,
      )
    : null;

  // Net dollar P&L across all legs (null while any leg is open).
  const pnl = closed ? netMultiLegPnl(legs) : null;

  // Spread quantity = contracts per leg (legs[0].quantity as the spread count).
  const spreadQuantity = legs[0].quantity;

  // close_at: use the supplied value when all legs are closed.
  const closeAt = closed ? (input.closeAt ?? new Date().toISOString()) : null;

  // ---------------------------------------------------------------------------
  // 1. Insert parent trades row
  // ---------------------------------------------------------------------------
  const parentRow = {
    user_id: userId,
    symbol: symbol.toUpperCase(),
    asset_class: 'options' as const,
    // Nominal parent side — individual leg directions live in trade_legs.
    side: 'LONG' as const,
    quantity: spreadQuantity,
    // Net premium per share (can be negative for a net credit position).
    entry_price: netEntryPremium,
    // Net exit premium per share (null while open).
    exit_price: netExitPremium,
    multiplier: 100,
    open_at: openAt,
    close_at: closeAt,
    // CRITICAL: input_mode='risk-only' tells the DB trigger to trust our
    // supplied pnl value and skip its price-based recalculation.  Without this,
    // credit spreads (negative entry_price) would produce a wrong sign.
    input_mode: 'risk-only' as const,
    pnl: pnl ?? null,
    // leg_count and strategy_type are additive columns added in migration
    // 20260531140000_journal_trade_legs.sql.
    leg_count: legs.length,
    strategy_type: strategyType,
    notes: notes ?? null,
    setup: setup ?? null,
    strategy_id: strategyId ?? null,
    portfolio_id: portfolioId ?? null,
    broker: 'manual' as const,
    import_source: 'manual' as const,
    // Fresh idempotency key — same format as manual single-leg trades.
    idempotency_key: buildManualIdempotencyKey(),
    created_via: 'manual' as const,
  };

  const { data: parentData, error: parentError } = await supabase
    .from('trades')
    .insert(parentRow)
    .select('id')
    .single();

  if (parentError || !parentData) {
    throw new Error(
      `Failed to create parent trade: ${parentError?.message ?? 'no data returned'}`,
    );
  }

  const tradeId = (parentData as TradeInsertResult).id;

  // ---------------------------------------------------------------------------
  // 2. Insert trade_legs rows
  // ---------------------------------------------------------------------------
  const legRows: TradeLegInsert[] = legs.map((leg, i) => ({
    trade_id: tradeId,
    user_id: userId,
    leg_number: i + 1,
    option_type: leg.option_type,
    strike_price: leg.strike_price,
    expiration_date: leg.expiration_date ?? null,
    side: leg.side,
    quantity: leg.quantity,
    entry_price: leg.entry_price,
    exit_price: leg.exit_price ?? null,
    fees: leg.fees ?? 0,
    // App-computed signed P&L for this leg (null while leg is open).
    gross_pnl: legSignedPnl(leg),
  }));

  const { error: legsError } = await supabase.from('trade_legs').insert(legRows);

  if (legsError) {
    // Best-effort cleanup: delete the orphaned parent row so the DB stays
    // consistent.  Cascade is not relied upon here because the legs insert
    // failed before any legs existed.
    await supabase.from('trades').delete().eq('id', tradeId).eq('user_id', userId);

    throw new Error(`Failed to insert trade legs: ${legsError.message}`);
  }

  return { tradeId };
}

// ---------------------------------------------------------------------------
// fetchTradeLegs
// ---------------------------------------------------------------------------

/**
 * Fetches all legs for a given trade, ordered by leg_number.
 * Maps the DB row back to the TradeLeg shape (including exit_price and fees).
 */
export async function fetchTradeLegs(tradeId: string): Promise<TradeLeg[]> {
  const { data, error } = await supabase
    .from('trade_legs')
    .select(
      'option_type, strike_price, expiration_date, side, quantity, entry_price, exit_price, fees',
    )
    .eq('trade_id', tradeId)
    .order('leg_number', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch trade legs for trade ${tradeId}: ${error.message}`);
  }

  if (!data) return [];

  return (data as Array<{
    option_type: 'CALL' | 'PUT';
    strike_price: number;
    expiration_date: string | null;
    side: 'LONG' | 'SHORT';
    quantity: number;
    entry_price: number;
    exit_price: number | null;
    fees: number;
  }>).map(row => ({
    option_type: row.option_type,
    strike_price: row.strike_price,
    expiration_date: row.expiration_date ?? undefined,
    side: row.side,
    quantity: row.quantity,
    entry_price: row.entry_price,
    exit_price: row.exit_price ?? undefined,
    fees: row.fees,
  }));
}
