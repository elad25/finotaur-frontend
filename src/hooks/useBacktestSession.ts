/**
 * useBacktestSession — lightweight paper-trading session state.
 *
 * Phase 1 of the backtest marketing-ready sprint. Owns the in-memory
 * paper-trading state for a single active session: position(s), closed
 * trades, derived statistics. Resets on unmount; persistence lands in Phase 2
 * with Supabase backtest_sessions/backtest_trades tables.
 *
 * Why useReducer and not Zustand: the parallel `useBacktestStore` Zustand
 * implementation in `src/store/` was discovered to be dead code (imports
 * `'../types'` which doesn't exist; never mounted in any route). Rather than
 * resurrect it, Phase 1 ships a focused hook scoped to the chart page. Phase
 * 2 will introduce a single proper store if persistence demands it.
 *
 * Phase 7 additions (broker-grade engine):
 *   - Multi-leg take-profits (TakeProfitLeg[] on PaperPosition)
 *   - Partial close action (PARTIAL_CLOSE)
 *   - Move SL to break-even (BREAKEVEN_STOP)
 *   - Flatten — close position + cancel all pending orders (FLATTEN)
 *   - Reverse — close + open opposite (REVERSE)
 *   - Cancel all pending orders (CANCEL_ALL_PENDING)
 *   - Commission/slippage model (CommissionConfig on SessionState)
 *   - FillRecord per fill event; net PnL = gross - fees
 *   - localStorage hydration normalizer (single TP → one 100% leg)
 */

import { useReducer, useCallback } from 'react';
import {
  type TakeProfitLeg,
  type CommissionConfig,
  type FillRecord,
  DEFAULT_COMMISSION_CONFIG,
  partialCloseSize,
  breakevenStop,
  applySlippage,
  applyCommission,
} from '@/lib/backtest/orderEngine';

// Re-export engine types so callers can import from a single location.
export type { TakeProfitLeg, CommissionConfig, FillRecord };

export type PaperSide = 'LONG' | 'SHORT';
export type ExitReason = 'manual' | 'sl' | 'tp' | 'flatten' | 'reverse';

export interface PaperPosition {
  id: string;
  side: PaperSide;
  entryTime: number;          // unix seconds (matches FinotaurChart UTCTimestamp)
  entryPrice: number;
  /**
   * Original size when the position was opened. Used for leg % calculations.
   * Optional for backward compat with runStrategy.ts minimal objects — the
   * reducer's LOAD_TRADES path normalizes via migratePosition before use.
   */
  originalSize?: number;
  size: number;               // contracts / shares / units — reduced by partial closes
  stopLoss?: number;
  /** Legacy single TP — preserved for backward compat with saved sessions. */
  takeProfit?: number;
  /**
   * Multi-leg take-profits. When a position is opened with a single
   * `takeProfit`, a normalizer converts it to one 100% leg here so all
   * code paths use this field. Legacy sessions loaded from localStorage are
   * also normalized on hydration.
   * Optional: may be absent on minimal objects from runStrategy.ts (normalized
   * by migratePosition in the LOAD_TRADES reducer case).
   */
  takeProfits?: TakeProfitLeg[];
  // Phase 4: optional tag identifying which strategy was active when the trade
  // was opened. `null` / undefined = manual / unattributed. Carried from OPEN
  // through to CLOSE so per-strategy stats can be reconstructed.
  strategyId?: string | null;
  // Phase 6: order type that opened the position. 'MARKET' = entered
  // immediately at user's clicked price. 'LIMIT' / 'STOP' = filled from a
  // pending order whose trigger price was touched by a later bar.
  entryOrderType?: 'MARKET' | 'LIMIT' | 'STOP';
  // Phase 7: fill audit trail. Optional for backward compat with minimal objects.
  fills?: FillRecord[];
  /** Cumulative fees paid across all fills on this position. */
  feesPaid?: number;
  // Filled on close:
  exitTime?: number;
  exitPrice?: number;
  /** Gross PnL (before fees). */
  grossPnl?: number;
  /** Net PnL = grossPnl - feesPaid. Stored as `pnl` for backward compat. */
  pnl?: number;
  pnlPercent?: number;
  exitReason?: ExitReason;
}

// Phase 6: Pending orders — placed via right-click on the replay chart,
// fired automatically when a future bar's range touches the trigger price.
//   LIMIT BUY  fills when bar.low  ≤ triggerPrice   (buy the dip — price came down)
//   LIMIT SELL fills when bar.high ≥ triggerPrice   (sell the rally — price came up)
//   STOP  BUY  fills when bar.high ≥ triggerPrice   (breakout — price broke above)
//   STOP  SELL fills when bar.low  ≤ triggerPrice   (breakdown — price broke below)
export type PendingOrderType = 'LIMIT' | 'STOP';
export interface PendingOrder {
  id: string;
  side: PaperSide;
  type: PendingOrderType;
  triggerPrice: number;
  size: number;
  stopLoss?: number;
  takeProfit?: number;
  strategyId?: string | null;
  createdAt: number;          // unix seconds (bar.time when placed)
}

export interface SessionStats {
  totalTrades: number;
  winners: number;
  losers: number;
  breakeven: number;
  winRate: number;            // 0–100
  /** Net PnL (after all fees). */
  netPnl: number;
  netPnlPercent: number;      // relative to startingBalance
  /** Gross profit across winners (before fees). */
  grossProfit: number;
  /** Absolute gross loss across losers (before fees). */
  grossLoss: number;          // positive number (abs)
  /** Total fees paid across all closed positions. */
  totalFees: number;
  profitFactor: number;       // grossProfit / grossLoss; 0 if no losses
  avgWin: number;
  avgLoss: number;            // positive number (abs)
  largestWin: number;
  largestLoss: number;        // positive number (abs)
  avgRR: number;              // avgWin / avgLoss
  longestWinStreak: number;
  longestLossStreak: number;
}

export interface SessionState {
  startingBalance: number;
  activePosition?: PaperPosition;
  closedPositions: PaperPosition[];
  pendingOrders: PendingOrder[];   // Phase 6
  stats: SessionStats;
  /** Phase 7: commission/slippage config. Defaults to all-zero (no cost). */
  commissionConfig: CommissionConfig;
}

// ─── Action payloads ─────────────────────────────────────────────

interface OpenPayload {
  side: PaperSide;
  price: number;
  time: number;
  size: number;
  stopLoss?: number;
  takeProfit?: number;
  /** Phase 7: multi-leg TPs. If provided, overrides single `takeProfit`. */
  takeProfits?: TakeProfitLeg[];
  /** Phase 4: tag this trade with the active strategy id (null = manual). */
  strategyId?: string | null;
  /** Phase 6: order type that opened this position. Defaults to MARKET. */
  entryOrderType?: 'MARKET' | 'LIMIT' | 'STOP';
}

// Phase 6 payloads
interface AddPendingPayload {
  side: PaperSide;
  type: PendingOrderType;
  triggerPrice: number;
  size: number;
  stopLoss?: number;
  takeProfit?: number;
  strategyId?: string | null;
  time: number;
}
interface CancelPendingPayload { orderId: string; }
interface FillPendingPayload { orderId: string; fillPrice: number; fillTime: number; }

interface ClosePayload {
  price: number;
  time: number;
  reason: ExitReason;
}

// Phase 7 payloads
interface PartialClosePayload {
  /** Fraction 0–1 (e.g. 0.5 = 50%) or absolute unit count. */
  percentOrQty: number;
  /** When true, percentOrQty is a fraction 0–1. When false, it is absolute qty. */
  isPercent: boolean;
  price: number;
  time: number;
}

interface BreakevenStopPayload {
  /** Optional offset in price units. Defaults to 0. */
  offset?: number;
}

interface FlattenPayload {
  price: number;
  time: number;
}

interface ReversePayload {
  price: number;
  time: number;
  size?: number; // defaults to same size as the closed position
}

interface SetCommissionConfigPayload {
  config: Partial<CommissionConfig>;
}

// Phase 8: atomic action to fill one TP leg + perform the partial close.
// Using a single reducer action ensures the leg-filled flag and the
// reduced position size are updated atomically (no mid-render inconsistency).
interface FillTpLegPayload {
  /** ID of the TakeProfitLeg being filled. */
  legId: string;
  /** Fill time (unix seconds — the bar.time when the leg was triggered). */
  time: number;
}

type Action =
  | { type: 'OPEN'; payload: OpenPayload }
  | { type: 'CLOSE'; payload: ClosePayload }
  | { type: 'UPDATE_SL'; payload: { price: number } }
  | { type: 'UPDATE_TP'; payload: { price: number } }
  | { type: 'ADD_TP_LEG'; payload: { leg: TakeProfitLeg } }
  | { type: 'REMOVE_TP_LEG'; payload: { legId: string } }
  | { type: 'RESET'; payload: { startingBalance: number } }
  // Phase 3: bulk-load closed trades from a strategy run, replacing the
  // current session contents (also clears any active position).
  | { type: 'LOAD_TRADES'; payload: { trades: PaperPosition[] } }
  // Phase 6
  | { type: 'ADD_PENDING'; payload: AddPendingPayload }
  | { type: 'CANCEL_PENDING'; payload: CancelPendingPayload }
  | { type: 'FILL_PENDING'; payload: FillPendingPayload }
  // Phase 7
  | { type: 'PARTIAL_CLOSE'; payload: PartialClosePayload }
  | { type: 'BREAKEVEN_STOP'; payload: BreakevenStopPayload }
  | { type: 'FLATTEN'; payload: FlattenPayload }
  | { type: 'REVERSE'; payload: ReversePayload }
  | { type: 'CANCEL_ALL_PENDING' }
  | { type: 'SET_COMMISSION_CONFIG'; payload: SetCommissionConfigPayload }
  // Phase 8: atomic TP-leg fill (partial close at leg price + mark leg filled)
  | { type: 'FILL_TP_LEG'; payload: FillTpLegPayload };

// ─── Constants ───────────────────────────────────────────────────

const EMPTY_STATS: SessionStats = {
  totalTrades: 0,
  winners: 0,
  losers: 0,
  breakeven: 0,
  winRate: 0,
  netPnl: 0,
  netPnlPercent: 0,
  grossProfit: 0,
  grossLoss: 0,
  totalFees: 0,
  profitFactor: 0,
  avgWin: 0,
  avgLoss: 0,
  largestWin: 0,
  largestLoss: 0,
  avgRR: 0,
  longestWinStreak: 0,
  longestLossStreak: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Normalize a single legacy `takeProfit` price into a TakeProfitLeg array.
 * Called during OPEN and during localStorage hydration so the rest of the
 * reducer only ever deals with `takeProfits[]`.
 */
function normalizeTpLegs(
  takeProfit: number | undefined,
  takeProfits: TakeProfitLeg[] | undefined,
  time: number,
): TakeProfitLeg[] {
  // Explicit leg array wins.
  if (takeProfits && takeProfits.length > 0) return takeProfits;
  // Single legacy TP → one 100% leg.
  if (takeProfit != null && takeProfit > 0) {
    return [{
      id: `tp_${time}_${Math.random().toString(36).slice(2, 6)}`,
      price: takeProfit,
      sizePercent: 100,
      filled: false,
    }];
  }
  return [];
}

/**
 * Migrate a PaperPosition loaded from localStorage or produced by runStrategy
 * (old/minimal format) so it has all Phase 7 fields populated with defaults.
 * Additive — never removes existing fields.
 */
export function migratePosition(p: PaperPosition): PaperPosition {
  return {
    ...p,
    originalSize: p.originalSize ?? p.size,
    takeProfits: p.takeProfits?.length
      ? p.takeProfits
      : normalizeTpLegs(p.takeProfit, undefined, p.entryTime),
    fills: p.fills ?? [],
    feesPaid: p.feesPaid ?? 0,
    // Preserve pnl for closed positions; gross = pnl if not separately stored.
    grossPnl: p.grossPnl ?? p.pnl,
  };
}

/**
 * Compute gross PnL for a directional move.
 * Does NOT subtract fees — that is done by the caller.
 */
function computeGrossPnL(
  side: PaperSide,
  entryPrice: number,
  exitPrice: number,
  qty: number,
): { grossPnl: number; pnlPercent: number } {
  const direction = side === 'LONG' ? 1 : -1;
  const grossPnl = (exitPrice - entryPrice) * direction * qty;
  const pnlPercent = (((exitPrice - entryPrice) * direction) / entryPrice) * 100;
  return { grossPnl, pnlPercent };
}

/**
 * Recompute stats over the full closed-position array.
 * Uses net PnL (pnl field) for win/loss classification and profit factor.
 */
function computeStats(closed: PaperPosition[], startingBalance: number): SessionStats {
  if (closed.length === 0) return EMPTY_STATS;

  let winners = 0;
  let losers = 0;
  let breakeven = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalFees = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;

  for (const p of closed) {
    // Use net PnL (after fees) for all metrics.
    const netPnl = p.pnl ?? 0;
    totalFees += p.feesPaid ?? 0;

    if (netPnl > 0) {
      winners++;
      // grossProfit accumulates the NET winner contribution for profit factor.
      grossProfit += netPnl;
      if (netPnl > largestWin) largestWin = netPnl;
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > longestWinStreak) longestWinStreak = currentWinStreak;
    } else if (netPnl < 0) {
      losers++;
      grossLoss += Math.abs(netPnl);
      if (Math.abs(netPnl) > largestLoss) largestLoss = Math.abs(netPnl);
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > longestLossStreak) longestLossStreak = currentLossStreak;
    } else {
      breakeven++;
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  }

  const totalTrades = closed.length;
  const netPnl = grossProfit - grossLoss;
  const avgWin = winners > 0 ? grossProfit / winners : 0;
  const avgLoss = losers > 0 ? grossLoss / losers : 0;

  return {
    totalTrades,
    winners,
    losers,
    breakeven,
    winRate: (winners / totalTrades) * 100,
    netPnl,
    netPnlPercent: startingBalance > 0 ? (netPnl / startingBalance) * 100 : 0,
    grossProfit,
    grossLoss,
    totalFees,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    avgRR: avgLoss > 0 ? avgWin / avgLoss : 0,
    longestWinStreak,
    longestLossStreak,
  };
}

/**
 * Build an entry FillRecord for a new position, including fee computation.
 */
function buildEntryFill(
  price: number,
  qty: number,
  time: number,
  config: CommissionConfig,
): FillRecord {
  const fees = applyCommission(price, qty, config);
  return {
    kind: 'entry',
    price,
    qty,
    grossPnl: 0,
    fees,
    netPnl: -fees, // entry costs fees, no gross gain
    time,
  };
}

/**
 * Build an exit FillRecord (partial or final), including fee computation.
 */
function buildExitFill(
  kind: 'partial_exit' | 'final_exit',
  side: PaperSide,
  entryPrice: number,
  exitPrice: number,
  qty: number,
  time: number,
  reason: ExitReason,
  config: CommissionConfig,
): FillRecord {
  const { grossPnl } = computeGrossPnL(side, entryPrice, exitPrice, qty);
  const fees = applyCommission(exitPrice, qty, config);
  return {
    kind,
    price: exitPrice,
    qty,
    grossPnl,
    fees,
    netPnl: grossPnl - fees,
    time,
    reason,
  };
}

// ─── Reducer ─────────────────────────────────────────────────────

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {

    case 'OPEN': {
      if (state.activePosition) return state;
      const { side, price, time, size, stopLoss, takeProfit, takeProfits: tpLegs, strategyId, entryOrderType } = action.payload;
      const orderType = entryOrderType ?? 'MARKET';
      // Apply slippage to entry price (worsens for market/stop, not limit).
      const fillPrice = applySlippage(price, side, true, orderType, state.commissionConfig);
      const normalizedLegs = normalizeTpLegs(takeProfit, tpLegs, time);
      const entryFill = buildEntryFill(fillPrice, size, time, state.commissionConfig);

      const newPos: PaperPosition = {
        id: `pos_${time}_${Math.random().toString(36).slice(2, 8)}`,
        side,
        entryTime: time,
        entryPrice: fillPrice,
        originalSize: size,
        size,
        stopLoss,
        // Keep legacy single TP for backward compat with persistence layer.
        takeProfit: normalizedLegs.length === 1 && normalizedLegs[0].sizePercent === 100
          ? normalizedLegs[0].price
          : takeProfit,
        takeProfits: normalizedLegs,
        strategyId: strategyId ?? null,
        entryOrderType: orderType,
        fills: [entryFill],
        feesPaid: entryFill.fees,
      };
      return { ...state, activePosition: newPos };
    }

    case 'CLOSE': {
      if (!state.activePosition) return state;
      const pos = state.activePosition;
      const { price, time, reason } = action.payload;
      // Determine fill order type for slippage: SL fills are STOP, manual/flatten/reverse are MARKET, TP is LIMIT.
      const exitOrderType: 'MARKET' | 'LIMIT' | 'STOP' =
        reason === 'tp' ? 'LIMIT' :
        reason === 'sl' ? 'STOP' :
        'MARKET';
      const fillPrice = applySlippage(price, pos.side, false, exitOrderType, state.commissionConfig);
      // Fee invariant: final pnl = totalGross − totalFeesPaid (entry fee + all exit fees).
      // For a simple close with no prior partial exits, this is: grossPnl − (entryFee + exitFees).
      const { grossPnl, pnlPercent } = computeGrossPnL(pos.side, pos.entryPrice, fillPrice, pos.size);
      const exitFees = applyCommission(fillPrice, pos.size, state.commissionConfig);
      const totalFeesPaid = (pos.feesPaid ?? 0) + exitFees;
      // pos.pnl may carry accumulated partial-exit netPnls (gross − exitFees each, entry fee not yet deducted).
      // For a clean (no-partial) CLOSE pos.pnl is undefined. Sum all fill netPnls for the invariant:
      // entry fill netPnl = −entryFee; this exit fill netPnl = grossPnl − exitFees.
      // Total = (pos.pnl ?? 0) + grossPnl − exitFees − entryFee already in pos.feesPaid via fill sums.
      const exitFill = buildExitFill('final_exit', pos.side, pos.entryPrice, fillPrice, pos.size, time, reason, state.commissionConfig);
      const existingFills = pos.fills ?? [];
      // Sum all fills including this exit: entry fill has netPnl = −entryFee, so the sum naturally
      // deducts the entry fee without re-subtracting it per partial.
      const netPnl = existingFills.reduce((acc, f) => acc + f.netPnl, 0) + exitFill.netPnl;
      // pnlPercent: return on original position notional (cumulative across partial fills).
      const originalSz = pos.originalSize ?? pos.size;
      const finalPnlPercent = originalSz > 0 && pos.entryPrice > 0
        ? (netPnl / (originalSz * pos.entryPrice)) * 100
        : pnlPercent;

      const closed: PaperPosition = {
        ...pos,
        exitTime: time,
        exitPrice: fillPrice,
        grossPnl: (pos.grossPnl ?? 0) + grossPnl,
        pnl: netPnl,
        pnlPercent: finalPnlPercent,
        exitReason: reason,
        feesPaid: totalFeesPaid,
        fills: [...existingFills, exitFill],
      };
      const closedPositions = [...state.closedPositions, closed];
      return {
        ...state,
        activePosition: undefined,
        closedPositions,
        stats: computeStats(closedPositions, state.startingBalance),
      };
    }

    case 'UPDATE_SL': {
      if (!state.activePosition) return state;
      return {
        ...state,
        activePosition: { ...state.activePosition, stopLoss: action.payload.price },
      };
    }

    case 'UPDATE_TP': {
      if (!state.activePosition) return state;
      const newTp = action.payload.price;
      // Also update takeProfits: replace with a single 100% leg at the new price
      // when the position currently has zero or one leg (simple case).
      const pos = state.activePosition;
      const existingLegs = pos.takeProfits ?? [];
      let newLegs: TakeProfitLeg[];
      if (existingLegs.length <= 1) {
        newLegs = [{
          id: existingLegs[0]?.id ?? `tp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          price: newTp,
          sizePercent: 100,
          filled: false,
        }];
      } else {
        newLegs = existingLegs;
      }
      return {
        ...state,
        activePosition: { ...pos, takeProfit: newTp, takeProfits: newLegs },
      };
    }

    case 'ADD_TP_LEG': {
      if (!state.activePosition) return state;
      const pos = state.activePosition;
      const newLeg = action.payload.leg;
      return {
        ...state,
        activePosition: {
          ...pos,
          takeProfits: [...(pos.takeProfits ?? []), newLeg],
        },
      };
    }

    case 'REMOVE_TP_LEG': {
      if (!state.activePosition) return state;
      const pos = state.activePosition;
      return {
        ...state,
        activePosition: {
          ...pos,
          takeProfits: (pos.takeProfits ?? []).filter((l) => l.id !== action.payload.legId),
        },
      };
    }

    case 'RESET': {
      return {
        startingBalance: action.payload.startingBalance,
        activePosition: undefined,
        closedPositions: [],
        pendingOrders: [],
        stats: EMPTY_STATS,
        commissionConfig: state.commissionConfig,
      };
    }

    case 'LOAD_TRADES': {
      // Normalize migrated positions (from strategy runs which create minimal PaperPosition objects).
      const closedPositions = action.payload.trades.map(migratePosition);
      return {
        ...state,
        activePosition: undefined,
        closedPositions,
        stats: computeStats(closedPositions, state.startingBalance),
      };
    }

    case 'ADD_PENDING': {
      const { side, type: orderType, triggerPrice, size, stopLoss, takeProfit, strategyId, time } = action.payload;
      const order: PendingOrder = {
        id: `ord_${time}_${Math.random().toString(36).slice(2, 8)}`,
        side,
        type: orderType,
        triggerPrice,
        size,
        stopLoss,
        takeProfit,
        strategyId: strategyId ?? null,
        createdAt: time,
      };
      return { ...state, pendingOrders: [...state.pendingOrders, order] };
    }

    case 'CANCEL_PENDING': {
      return {
        ...state,
        pendingOrders: state.pendingOrders.filter((o) => o.id !== action.payload.orderId),
      };
    }

    case 'FILL_PENDING': {
      // Single-position invariant: if a position is already open, drop the
      // order without filling (it would be safer to keep it, but for
      // Phase 6 MVP we silently cancel — caller decides via gate before
      // dispatching).
      if (state.activePosition) {
        return {
          ...state,
          pendingOrders: state.pendingOrders.filter((o) => o.id !== action.payload.orderId),
        };
      }
      const order = state.pendingOrders.find((o) => o.id === action.payload.orderId);
      if (!order) return state;

      const orderType = order.type; // 'LIMIT' | 'STOP'
      const fillPrice = applySlippage(
        action.payload.fillPrice,
        order.side,
        true,
        orderType,
        state.commissionConfig,
      );
      const normalizedLegs = normalizeTpLegs(order.takeProfit, undefined, action.payload.fillTime);
      const entryFill = buildEntryFill(fillPrice, order.size, action.payload.fillTime, state.commissionConfig);

      const newPos: PaperPosition = {
        id: `pos_${action.payload.fillTime}_${Math.random().toString(36).slice(2, 8)}`,
        side: order.side,
        entryTime: action.payload.fillTime,
        entryPrice: fillPrice,
        originalSize: order.size,
        size: order.size,
        stopLoss: order.stopLoss,
        takeProfit: normalizedLegs.length === 1 && normalizedLegs[0].sizePercent === 100
          ? normalizedLegs[0].price
          : order.takeProfit,
        takeProfits: normalizedLegs,
        strategyId: order.strategyId ?? null,
        entryOrderType: order.type,
        fills: [entryFill],
        feesPaid: entryFill.fees,
      };
      return {
        ...state,
        activePosition: newPos,
        pendingOrders: state.pendingOrders.filter((o) => o.id !== order.id),
      };
    }

    // ─── Phase 7: broker-grade actions ───────────────────────────

    case 'PARTIAL_CLOSE': {
      if (!state.activePosition) return state;
      const pos = state.activePosition;
      const { percentOrQty, isPercent, price, time } = action.payload;

      const closeQty = partialCloseSize(pos.size, percentOrQty, isPercent);
      if (closeQty <= 0) return state;

      // Partial exits use MARKET slippage.
      const fillPrice = applySlippage(price, pos.side, false, 'MARKET', state.commissionConfig);
      const { grossPnl } = computeGrossPnL(pos.side, pos.entryPrice, fillPrice, closeQty);
      const exitFees = applyCommission(fillPrice, closeQty, state.commissionConfig);
      const netPnl = grossPnl - exitFees;

      const partialFill = buildExitFill(
        'partial_exit',
        pos.side,
        pos.entryPrice,
        fillPrice,
        closeQty,
        time,
        'manual',
        state.commissionConfig,
      );

      const remainingQty = pos.size - closeQty;
      const existingFills = pos.fills ?? [];

      if (remainingQty <= 0) {
        // Last partial close — seal the position.
        const totalFeesPaid = (pos.feesPaid ?? 0) + exitFees;
        // Sum all fill netPnls (entry fill has netPnl = −entryFee, previous partials, + this one).
        // This naturally deducts the entry fee exactly once without re-subtracting per fill.
        const allNetPnl = existingFills.reduce((acc, f) => acc + f.netPnl, 0) + partialFill.netPnl;
        const originalSz = pos.originalSize ?? pos.size;
        const closed: PaperPosition = {
          ...pos,
          size: 0,
          exitTime: time,
          exitPrice: fillPrice,
          grossPnl: (pos.grossPnl ?? 0) + grossPnl,
          pnl: allNetPnl,
          // PnL% is return on the original position notional (cumulative across partial fills).
          pnlPercent: originalSz > 0 && pos.entryPrice > 0
            ? (allNetPnl / (originalSz * pos.entryPrice)) * 100
            : 0,
          exitReason: 'manual',
          feesPaid: totalFeesPaid,
          fills: [...existingFills, partialFill],
        };
        const closedPositions = [...state.closedPositions, closed];
        return {
          ...state,
          activePosition: undefined,
          closedPositions,
          stats: computeStats(closedPositions, state.startingBalance),
        };
      }

      // Position still open with reduced size.
      return {
        ...state,
        activePosition: {
          ...pos,
          size: remainingQty,
          feesPaid: (pos.feesPaid ?? 0) + exitFees,
          fills: [...existingFills, partialFill],
          // Accumulate gross/net from partials; will be finalized on full close.
          grossPnl: (pos.grossPnl ?? 0) + grossPnl,
          pnl: (pos.pnl ?? 0) + netPnl,
        },
      };
    }

    case 'BREAKEVEN_STOP': {
      if (!state.activePosition) return state;
      const pos = state.activePosition;
      const offset = action.payload.offset ?? 0;
      const beSL = breakevenStop(pos.entryPrice, pos.side, offset);
      return {
        ...state,
        activePosition: { ...pos, stopLoss: beSL },
      };
    }

    case 'FLATTEN': {
      if (!state.activePosition) return state;
      const { price, time } = action.payload;
      // Close position at market with reason 'flatten', then cancel all pending.
      const pos = state.activePosition;
      const fillPrice = applySlippage(price, pos.side, false, 'MARKET', state.commissionConfig);
      // Fee invariant: final pnl = totalGross − totalFeesPaid (entry fee + all exit fees).
      const { grossPnl } = computeGrossPnL(pos.side, pos.entryPrice, fillPrice, pos.size);
      const exitFees = applyCommission(fillPrice, pos.size, state.commissionConfig);
      const totalFeesPaid = (pos.feesPaid ?? 0) + exitFees;
      const exitFill = buildExitFill('final_exit', pos.side, pos.entryPrice, fillPrice, pos.size, time, 'flatten', state.commissionConfig);
      const existingFills = pos.fills ?? [];
      // Sum all fills: entry fill netPnl = −entryFee deducts the entry fee exactly once.
      const netPnl = existingFills.reduce((acc, f) => acc + f.netPnl, 0) + exitFill.netPnl;
      const originalSz = pos.originalSize ?? pos.size;
      // PnL% is return on the original position notional (cumulative across partial fills).
      const pnlPercent = originalSz > 0 && pos.entryPrice > 0
        ? (netPnl / (originalSz * pos.entryPrice)) * 100
        : 0;

      const closed: PaperPosition = {
        ...pos,
        exitTime: time,
        exitPrice: fillPrice,
        grossPnl: (pos.grossPnl ?? 0) + grossPnl,
        pnl: netPnl,
        pnlPercent,
        exitReason: 'flatten',
        feesPaid: totalFeesPaid,
        fills: [...existingFills, exitFill],
      };
      const closedPositions = [...state.closedPositions, closed];
      return {
        ...state,
        activePosition: undefined,
        // Cancel all pending orders atomically.
        pendingOrders: [],
        closedPositions,
        stats: computeStats(closedPositions, state.startingBalance),
      };
    }

    case 'REVERSE': {
      // Close current position + immediately open opposite at same price.
      if (!state.activePosition) return state;
      const { price, time } = action.payload;
      const pos = state.activePosition;
      const oppositeSide: PaperSide = pos.side === 'LONG' ? 'SHORT' : 'LONG';
      // Opens opposite position with the remaining quantity (pos.size after any partial closes),
      // unless the caller explicitly provides a size override.
      const newSize = action.payload.size ?? pos.size;

      // Close leg — MARKET slippage for exits.
      const closeFillPrice = applySlippage(price, pos.side, false, 'MARKET', state.commissionConfig);
      // Fee invariant: final pnl = totalGross − totalFeesPaid (entry fee + all exit fees).
      const { grossPnl } = computeGrossPnL(pos.side, pos.entryPrice, closeFillPrice, pos.size);
      const closeExitFees = applyCommission(closeFillPrice, pos.size, state.commissionConfig);
      const totalFeesPaid = (pos.feesPaid ?? 0) + closeExitFees;
      const closeExitFill = buildExitFill('final_exit', pos.side, pos.entryPrice, closeFillPrice, pos.size, time, 'reverse', state.commissionConfig);
      const existingFills = pos.fills ?? [];
      // Sum all fills: entry fill netPnl = −entryFee deducts the entry fee exactly once.
      const closedNetPnl = existingFills.reduce((acc, f) => acc + f.netPnl, 0) + closeExitFill.netPnl;
      const originalSz = pos.originalSize ?? pos.size;
      // PnL% is return on the original position notional (cumulative across partial fills).
      const pnlPercent = originalSz > 0 && pos.entryPrice > 0
        ? (closedNetPnl / (originalSz * pos.entryPrice)) * 100
        : 0;

      const closed: PaperPosition = {
        ...pos,
        exitTime: time,
        exitPrice: closeFillPrice,
        grossPnl: (pos.grossPnl ?? 0) + grossPnl,
        pnl: closedNetPnl,
        pnlPercent,
        exitReason: 'reverse',
        feesPaid: totalFeesPaid,
        fills: [...existingFills, closeExitFill],
      };

      // Open leg — MARKET slippage for entry.
      const openFillPrice = applySlippage(price, oppositeSide, true, 'MARKET', state.commissionConfig);
      const openEntryFill = buildEntryFill(openFillPrice, newSize, time, state.commissionConfig);

      const newPos: PaperPosition = {
        id: `pos_${time}_${Math.random().toString(36).slice(2, 8)}`,
        side: oppositeSide,
        entryTime: time,
        entryPrice: openFillPrice,
        originalSize: newSize,
        size: newSize,
        // Fresh position — SL/TP left empty for UI to set.
        takeProfits: [],
        strategyId: pos.strategyId,
        entryOrderType: 'MARKET',
        fills: [openEntryFill],
        feesPaid: openEntryFill.fees,
      };

      const closedPositions = [...state.closedPositions, closed];
      return {
        ...state,
        activePosition: newPos,
        closedPositions,
        stats: computeStats(closedPositions, state.startingBalance),
      };
    }

    case 'CANCEL_ALL_PENDING': {
      return { ...state, pendingOrders: [] };
    }

    case 'SET_COMMISSION_CONFIG': {
      return {
        ...state,
        commissionConfig: { ...state.commissionConfig, ...action.payload.config },
      };
    }

    // ─── Phase 8: atomic TP-leg fill ─────────────────────────────
    case 'FILL_TP_LEG': {
      if (!state.activePosition) return state;
      const pos = state.activePosition;
      const { legId, time } = action.payload;

      const legs = pos.takeProfits ?? [];
      const legIdx = legs.findIndex((l) => l.id === legId);
      if (legIdx === -1) return state; // unknown leg id — no-op

      const leg = legs[legIdx];
      if (leg.filled) return state; // already filled — idempotent

      const originalSize = pos.originalSize ?? pos.size;
      // TP fills are limit-style — no slippage applied. Commission IS charged.
      const fillPrice = leg.price;
      // closeQty is computed as a percent of originalSize; clamp to pos.size so
      // a prior PARTIAL_CLOSE cannot result in closing more than what remains.
      const rawCloseQty = partialCloseSize(originalSize, leg.sizePercent / 100, true);
      const closeQty = Math.min(rawCloseQty, pos.size);
      if (closeQty <= 0) return state;

      const { grossPnl } = computeGrossPnL(pos.side, pos.entryPrice, fillPrice, closeQty);
      const exitFees = applyCommission(fillPrice, closeQty, state.commissionConfig);
      const netPnl = grossPnl - exitFees;

      // Mark this leg as filled in the legs array.
      const updatedLegs: TakeProfitLeg[] = legs.map((l, i) =>
        i === legIdx ? { ...l, filled: true } : l,
      );

      const partialFill = buildExitFill(
        'partial_exit',
        pos.side,
        pos.entryPrice,
        fillPrice,
        closeQty,
        time,
        'tp',
        state.commissionConfig,
      );

      const remainingQty = pos.size - closeQty;
      const existingFills = pos.fills ?? [];
      const totalFeesPaid = (pos.feesPaid ?? 0) + exitFees;

      // Use a small epsilon for float safety when checking if position is fully closed.
      const EPSILON = 1e-9;
      // Check if all legs are now filled OR remaining qty ≤ epsilon → fully close.
      const allLegsFilled = updatedLegs.every((l) => l.filled);

      if (remainingQty <= EPSILON || allLegsFilled) {
        // Final close via TP — sum all fill netPnls for the aggregate.
        // Entry fill has netPnl = −entryFee, so entry fee is deducted exactly once.
        const allNetPnl =
          existingFills.reduce((acc, f) => acc + f.netPnl, 0) + partialFill.netPnl;
        const closed: PaperPosition = {
          ...pos,
          size: 0,
          takeProfits: updatedLegs,
          exitTime: time,
          exitPrice: fillPrice,
          grossPnl: (pos.grossPnl ?? 0) + grossPnl,
          pnl: allNetPnl,
          // PnL% is return on the original position notional (cumulative across partial fills).
          pnlPercent:
            originalSize > 0 && pos.entryPrice > 0
              ? (allNetPnl / (originalSize * pos.entryPrice)) * 100
              : 0,
          exitReason: 'tp',
          feesPaid: totalFeesPaid,
          fills: [...existingFills, partialFill],
        };
        const closedPositions = [...state.closedPositions, closed];
        return {
          ...state,
          activePosition: undefined,
          closedPositions,
          stats: computeStats(closedPositions, state.startingBalance),
        };
      }

      // Position still partially open — reduce size.
      return {
        ...state,
        activePosition: {
          ...pos,
          size: remainingQty,
          takeProfits: updatedLegs,
          feesPaid: totalFeesPaid,
          fills: [...existingFills, partialFill],
          grossPnl: (pos.grossPnl ?? 0) + grossPnl,
          pnl: (pos.pnl ?? 0) + netPnl,
        },
      };
    }

    default:
      return state;
  }
}

// ─── localStorage hydration ──────────────────────────────────────

/**
 * Hydrate a raw SessionState value from localStorage (or any external source)
 * into a fully-typed SessionState, running the migration normalizer so old
 * sessions with no `takeProfits` / `fills` fields don't crash the reducer.
 */
export function hydrateSessionState(raw: unknown): SessionState {
  // Minimal shape check — if it's not an object we return an empty state.
  if (!raw || typeof raw !== 'object') {
    return makeInitialState(10000);
  }
  const r = raw as Record<string, unknown>;

  const closedPositions: PaperPosition[] = Array.isArray(r.closedPositions)
    ? (r.closedPositions as Array<unknown>)
        .filter((p): p is PaperPosition =>
          !!p && typeof p === 'object' && 'id' in (p as object) && 'side' in (p as object))
        .map(migratePosition)
    : [];

  const activePosition: PaperPosition | undefined = r.activePosition &&
    typeof r.activePosition === 'object' && 'id' in (r.activePosition as object)
    ? migratePosition(r.activePosition as PaperPosition)
    : undefined;

  const startingBalance = typeof r.startingBalance === 'number' ? r.startingBalance : 10000;

  return {
    startingBalance,
    activePosition,
    closedPositions,
    pendingOrders: Array.isArray(r.pendingOrders) ? (r.pendingOrders as PendingOrder[]) : [],
    stats: computeStats(closedPositions, startingBalance),
    commissionConfig: {
      ...DEFAULT_COMMISSION_CONFIG,
      ...(r.commissionConfig && typeof r.commissionConfig === 'object'
        ? r.commissionConfig as Partial<CommissionConfig>
        : {}),
    },
  };
}

function makeInitialState(startingBalance: number): SessionState {
  return {
    startingBalance,
    activePosition: undefined,
    closedPositions: [],
    pendingOrders: [],
    stats: EMPTY_STATS,
    commissionConfig: { ...DEFAULT_COMMISSION_CONFIG },
  };
}

// ─── Return type ─────────────────────────────────────────────────

export interface UseBacktestSessionReturn {
  state: SessionState;
  openPosition: (payload: OpenPayload) => void;
  closePosition: (payload: ClosePayload) => void;
  updateStopLoss: (price: number) => void;
  updateTakeProfit: (price: number) => void;
  /** Add a new take-profit leg to the active position. */
  addTpLeg: (leg: TakeProfitLeg) => void;
  /** Remove a take-profit leg by id. */
  removeTpLeg: (legId: string) => void;
  reset: (startingBalance?: number) => void;
  /** Bulk-replace closed trades from a strategy run. Clears active position. */
  loadTrades: (trades: PaperPosition[]) => void;
  // Phase 6
  addPendingOrder: (payload: AddPendingPayload) => void;
  cancelPendingOrder: (orderId: string) => void;
  fillPendingOrder: (orderId: string, fillPrice: number, fillTime: number) => void;
  // Phase 7
  /** Close a fraction of the open position at `price`. */
  partialClose: (percentOrQty: number, isPercent: boolean, price: number, time: number) => void;
  /** Move the open position's SL to break-even (entry price ± offset). */
  moveToBreakeven: (offset?: number) => void;
  /** Close the position + cancel all pending orders atomically. */
  flatten: (price: number, time: number) => void;
  /** Close current position and open opposite at the same price. */
  reverse: (price: number, time: number, size?: number) => void;
  /** Cancel every pending order at once. */
  cancelAllPending: () => void;
  /** Update session-level commission/slippage config. */
  setCommissionConfig: (config: Partial<CommissionConfig>) => void;
  /**
   * Phase 8: atomically fill one TP leg at its leg price (limit-style, no
   * slippage) and reduce the open position size by the leg's sizePercent.
   * If all legs are now filled or remaining qty reaches 0, the position is
   * sealed with exitReason 'tp'.
   */
  fillTpLeg: (legId: string, time: number) => void;
}

/**
 * Phase 4: per-strategy stats breakdown. Returns a map keyed by strategyId
 * (or `'manual'` for unattributed trades). Each value is a full SessionStats
 * computed over only the trades tagged with that strategy.
 */
export function computeStatsByStrategy(
  closed: PaperPosition[],
  startingBalance: number,
): Map<string, SessionStats> {
  const buckets = new Map<string, PaperPosition[]>();
  for (const p of closed) {
    const key = p.strategyId || 'manual';
    const arr = buckets.get(key);
    if (arr) arr.push(p);
    else buckets.set(key, [p]);
  }
  const out = new Map<string, SessionStats>();
  for (const [key, trades] of buckets) {
    out.set(key, computeStats(trades, startingBalance));
  }
  return out;
}

export function useBacktestSession(initialBalance: number = 10000): UseBacktestSessionReturn {
  const [state, dispatch] = useReducer(reducer, makeInitialState(initialBalance));

  const openPosition = useCallback((payload: OpenPayload) => {
    dispatch({ type: 'OPEN', payload });
  }, []);

  const closePosition = useCallback((payload: ClosePayload) => {
    dispatch({ type: 'CLOSE', payload });
  }, []);

  const updateStopLoss = useCallback((price: number) => {
    dispatch({ type: 'UPDATE_SL', payload: { price } });
  }, []);

  const updateTakeProfit = useCallback((price: number) => {
    dispatch({ type: 'UPDATE_TP', payload: { price } });
  }, []);

  const addTpLeg = useCallback((leg: TakeProfitLeg) => {
    dispatch({ type: 'ADD_TP_LEG', payload: { leg } });
  }, []);

  const removeTpLeg = useCallback((legId: string) => {
    dispatch({ type: 'REMOVE_TP_LEG', payload: { legId } });
  }, []);

  const reset = useCallback((startingBalance: number = initialBalance) => {
    dispatch({ type: 'RESET', payload: { startingBalance } });
  }, [initialBalance]);

  const loadTrades = useCallback((trades: PaperPosition[]) => {
    dispatch({ type: 'LOAD_TRADES', payload: { trades } });
  }, []);

  const addPendingOrder = useCallback((payload: AddPendingPayload) => {
    dispatch({ type: 'ADD_PENDING', payload });
  }, []);

  const cancelPendingOrder = useCallback((orderId: string) => {
    dispatch({ type: 'CANCEL_PENDING', payload: { orderId } });
  }, []);

  const fillPendingOrder = useCallback((orderId: string, fillPrice: number, fillTime: number) => {
    dispatch({ type: 'FILL_PENDING', payload: { orderId, fillPrice, fillTime } });
  }, []);

  const partialClose = useCallback((
    percentOrQty: number,
    isPercent: boolean,
    price: number,
    time: number,
  ) => {
    dispatch({ type: 'PARTIAL_CLOSE', payload: { percentOrQty, isPercent, price, time } });
  }, []);

  const moveToBreakeven = useCallback((offset?: number) => {
    dispatch({ type: 'BREAKEVEN_STOP', payload: { offset } });
  }, []);

  const flatten = useCallback((price: number, time: number) => {
    dispatch({ type: 'FLATTEN', payload: { price, time } });
  }, []);

  const reverse = useCallback((price: number, time: number, size?: number) => {
    dispatch({ type: 'REVERSE', payload: { price, time, size } });
  }, []);

  const cancelAllPending = useCallback(() => {
    dispatch({ type: 'CANCEL_ALL_PENDING' });
  }, []);

  const setCommissionConfig = useCallback((config: Partial<CommissionConfig>) => {
    dispatch({ type: 'SET_COMMISSION_CONFIG', payload: { config } });
  }, []);

  const fillTpLeg = useCallback((legId: string, time: number) => {
    dispatch({ type: 'FILL_TP_LEG', payload: { legId, time } });
  }, []);

  return {
    state,
    openPosition,
    closePosition,
    updateStopLoss,
    updateTakeProfit,
    addTpLeg,
    removeTpLeg,
    reset,
    loadTrades,
    addPendingOrder,
    cancelPendingOrder,
    fillPendingOrder,
    partialClose,
    moveToBreakeven,
    flatten,
    reverse,
    cancelAllPending,
    setCommissionConfig,
    fillTpLeg,
  };
}
