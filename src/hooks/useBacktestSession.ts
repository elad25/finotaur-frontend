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
 * Phase 7 additions:
 *  - CommissionConfig / FillRecord support (slippage + fee simulation)
 *  - Multi-leg take-profit (TakeProfitLeg[])
 *  - Partial close, breakeven stop, flatten, reverse
 *  - FILL_TP_LEG for replay-driven leg fills
 *  - SET_COMMISSION_CONFIG for session-level fee config
 */

import { useReducer, useCallback, useEffect, useRef } from 'react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import {
  type CommissionConfig,
  type FillRecord,
  type TakeProfitLeg,
  DEFAULT_COMMISSION_CONFIG,
  applySlippage,
  applyCommission,
  partialCloseSize,
  breakevenStop,
} from '@/lib/backtest/orderEngine';

// localStorage key prefix — actual key is `<prefix><userId>` so two accounts
// sharing a browser don't see each other's in-flight session.
const STORAGE_PREFIX = 'finotaur:backtest:session:';
const PERSIST_THROTTLE_MS = 500;

// Float tolerance for treating remaining size as zero.
const EPSILON = 1e-9;

export type PaperSide = 'LONG' | 'SHORT';
export type ExitReason = 'manual' | 'sl' | 'tp' | 'flatten' | 'reverse';

export interface PaperPosition {
  id: string;
  side: PaperSide;
  entryTime: number;          // unix seconds (matches FinotaurChart UTCTimestamp)
  entryPrice: number;
  size: number;               // contracts / shares / units — CURRENT remaining size
  /** Original fill size at entry (before any partial closes). */
  originalSize?: number;
  stopLoss?: number;
  takeProfit?: number;        // legacy single TP price (kept for backward compat)
  /** Multi-leg take-profit schedule. Takes precedence over `takeProfit` when set. */
  takeProfits?: TakeProfitLeg[];
  // Phase 4: optional tag identifying which strategy was active when the trade
  // was opened. `null` / undefined = manual / unattributed. Carried from OPEN
  // through to CLOSE so per-strategy stats can be reconstructed.
  strategyId?: string | null;
  // Phase 6: order type that opened the position. 'MARKET' = entered
  // immediately at user's clicked price. 'LIMIT' / 'STOP' = filled from a
  // pending order whose trigger price was touched by a later bar.
  entryOrderType?: 'MARKET' | 'LIMIT' | 'STOP';
  // Phase 7: fee audit trail
  /** Total fees paid so far on this position (entry fee + exit fees). */
  feesPaid?: number;
  /** Gross PnL (before fees). Only set on closed positions. */
  grossPnl?: number;
  /** Per-fill audit trail. Includes entry fill (netPnl = -entryFee) and all exit fills. */
  fills?: FillRecord[];
  // Filled on close:
  exitTime?: number;
  exitPrice?: number;
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
  netPnl: number;
  netPnlPercent: number;      // relative to startingBalance
  grossProfit: number;
  grossLoss: number;          // positive number (abs)
  profitFactor: number;       // grossProfit / grossLoss; 0 if no losses
  avgWin: number;
  avgLoss: number;            // positive number (abs)
  largestWin: number;
  largestLoss: number;        // positive number (abs)
  avgRR: number;              // avgWin / avgLoss
  longestWinStreak: number;
  longestLossStreak: number;
  /** Phase 7: total fees paid across all closed trades. */
  totalFees: number;
}

export interface SessionState {
  startingBalance: number;
  activePosition?: PaperPosition;
  closedPositions: PaperPosition[];
  pendingOrders: PendingOrder[];   // Phase 6
  stats: SessionStats;
  /** Phase 7: session-level fee + slippage config. */
  commissionConfig: CommissionConfig;
}

interface OpenPayload {
  side: PaperSide;
  price: number;
  time: number;
  size: number;
  stopLoss?: number;
  takeProfit?: number;
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
interface UpdatePendingPayload {
  orderId: string;
  stopLoss?: number;
  takeProfit?: number;
  triggerPrice?: number;
}

interface ClosePayload {
  price: number;
  time: number;
  reason: ExitReason;
}

// Phase 7 payloads
interface PartialClosePayload {
  /** Fraction 0–1 (e.g. 0.5 = close 50%) */
  percent: number;
  price: number;
  time: number;
}

interface AddTpLegPayload {
  leg: TakeProfitLeg;
}
interface RemoveTpLegPayload {
  legId: string;
}
interface UpdateTpLegPayload {
  legId: string;
  price: number;
}
interface FillTpLegPayload {
  legId: string;
  time: number;
}
interface SetCommissionConfigPayload {
  config: CommissionConfig;
}

export interface LoadSessionPayload {
  startingBalance: number;
  closedPositions: PaperPosition[];
  pendingOrders: PendingOrder[];
}

type Action =
  | { type: 'OPEN'; payload: OpenPayload }
  | { type: 'CLOSE'; payload: ClosePayload }
  | { type: 'UPDATE_SL'; payload: { price: number } }
  | { type: 'UPDATE_TP'; payload: { price: number } }
  | { type: 'RESET'; payload: { startingBalance: number } }
  // Phase 3: bulk-load closed trades from a strategy run, replacing the
  // current session contents (also clears any active position).
  | { type: 'LOAD_TRADES'; payload: { trades: PaperPosition[] } }
  // Phase 6
  | { type: 'ADD_PENDING'; payload: AddPendingPayload }
  | { type: 'CANCEL_PENDING'; payload: CancelPendingPayload }
  | { type: 'FILL_PENDING'; payload: FillPendingPayload }
  | { type: 'UPDATE_PENDING'; payload: UpdatePendingPayload }
  | { type: 'LOAD_SESSION'; payload: LoadSessionPayload }
  // Replace the entire session state from a persisted/restored snapshot.
  // Used by the localStorage hydration effect once the user key is known.
  | { type: 'HYDRATE'; payload: SessionState }
  // Phase 7 — broker-grade position management
  | { type: 'ADD_TP_LEG'; payload: AddTpLegPayload }
  | { type: 'REMOVE_TP_LEG'; payload: RemoveTpLegPayload }
  | { type: 'UPDATE_TP_LEG'; payload: UpdateTpLegPayload }
  | { type: 'PARTIAL_CLOSE'; payload: PartialClosePayload }
  | { type: 'BREAKEVEN_STOP'; payload?: { offset?: number } }
  | { type: 'FLATTEN'; payload: { price: number; time: number } }
  | { type: 'REVERSE'; payload: { price: number; time: number; newSize: number } }
  | { type: 'CANCEL_ALL_PENDING' }
  | { type: 'SET_COMMISSION_CONFIG'; payload: SetCommissionConfigPayload }
  | { type: 'FILL_TP_LEG'; payload: FillTpLegPayload };

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
  profitFactor: 0,
  avgWin: 0,
  avgLoss: 0,
  largestWin: 0,
  largestLoss: 0,
  avgRR: 0,
  longestWinStreak: 0,
  longestLossStreak: 0,
  totalFees: 0,
};

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Net PnL for a closed position.
 * Phase 7: if fills are present, sum their netPnl (fee-adjusted) for the final
 * figure. Falls back to the legacy gross formula for older positions.
 */
function positionNetPnl(p: PaperPosition): number {
  if (p.fills && p.fills.length > 0) {
    return p.fills.reduce((acc, f) => acc + f.netPnl, 0);
  }
  return p.pnl ?? 0;
}

function computePnL(p: PaperPosition, exitPrice: number): { pnl: number; pnlPercent: number } {
  const direction = p.side === 'LONG' ? 1 : -1;
  const pnl = (exitPrice - p.entryPrice) * direction * p.size;
  const pnlPercent = (((exitPrice - p.entryPrice) * direction) / p.entryPrice) * 100;
  return { pnl, pnlPercent };
}

/** Build a single exit fill record. */
function buildExitFill(
  kind: FillRecord['kind'],
  fillPrice: number,
  qty: number,
  pos: PaperPosition,
  reason: FillRecord['reason'],
  config: CommissionConfig,
  time: number,
): FillRecord {
  const direction = pos.side === 'LONG' ? 1 : -1;
  const grossPnl = (fillPrice - pos.entryPrice) * direction * qty;
  const fees = applyCommission(fillPrice, qty, config);
  return {
    kind,
    price: fillPrice,
    qty,
    grossPnl,
    fees,
    netPnl: grossPnl - fees,
    time,
    reason,
  };
}

export function computeStats(closed: PaperPosition[], startingBalance: number): SessionStats {
  // #6: headline stats reflect only configured trades (a defined SL and/or TP).
  // Purely discretionary trades (neither SL nor TP) are excluded from the metrics.
  const configured = closed.filter((p) => p.stopLoss != null || p.takeProfit != null || (p.takeProfits && p.takeProfits.length > 0));
  if (configured.length === 0) return EMPTY_STATS;

  let winners = 0;
  let losers = 0;
  let breakeven = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let totalFees = 0;

  for (const p of configured) {
    // Phase 7: use net PnL (after fees) for win/loss classification and stats.
    const netPnl = positionNetPnl(p);
    totalFees += p.feesPaid ?? 0;

    if (netPnl > 0) {
      winners++;
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

  const totalTrades = configured.length;
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
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    avgRR: avgLoss > 0 ? avgWin / avgLoss : 0,
    longestWinStreak,
    longestLossStreak,
    totalFees,
  };
}

// ─── Reducer ────────────────────────────────────────────────────

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'OPEN': {
      if (state.activePosition) return state;
      const { side, price, time, size, stopLoss, takeProfit, takeProfits, strategyId, entryOrderType } = action.payload;
      const orderType = entryOrderType ?? 'MARKET';

      // Apply slippage to entry fill price.
      const fillPrice = applySlippage(price, side, true, orderType, state.commissionConfig);
      // Entry fee: charged once at entry. Recorded as an entry FillRecord with netPnl = -entryFee.
      const entryFee = applyCommission(fillPrice, size, state.commissionConfig);
      const entryFill: FillRecord = {
        kind: 'entry',
        price: fillPrice,
        qty: size,
        grossPnl: 0,
        fees: entryFee,
        netPnl: -entryFee,
        time,
      };

      const newPos: PaperPosition = {
        id: `pos_${time}_${Math.random().toString(36).slice(2, 8)}`,
        side,
        entryTime: time,
        entryPrice: fillPrice,
        size,
        originalSize: size,
        stopLoss,
        takeProfit,
        takeProfits: takeProfits ?? [],
        strategyId: strategyId ?? null,
        entryOrderType: orderType,
        feesPaid: entryFee,
        grossPnl: 0,
        fills: [entryFill],
      };
      return { ...state, activePosition: newPos };
    }

    case 'CLOSE': {
      if (!state.activePosition) return state;
      const pos = state.activePosition;
      const { price, time, reason } = action.payload;

      // Determine order type for slippage: SL = stop fill, TP = limit fill, manual = market.
      const orderType = reason === 'sl' ? 'STOP' : reason === 'tp' ? 'LIMIT' : 'MARKET';
      const fillPrice = applySlippage(price, pos.side, false, orderType, state.commissionConfig);

      // Build final_exit fill. Fee invariant: each exit fill's netPnl = gross - its own exit fee only.
      const exitFill = buildExitFill('final_exit', fillPrice, pos.size, pos, reason, state.commissionConfig, time);

      const allFills = [...(pos.fills ?? []), exitFill];
      // Final closed PnL = sum of ALL fills' netPnl (entry fill netPnl = -entryFee).
      const pnl = allFills.reduce((acc, f) => acc + f.netPnl, 0);
      // Accumulate gross across ALL exit fills (matches PARTIAL_CLOSE / FILL_TP_LEG pattern).
      const grossPnl = allFills.filter((f) => f.kind !== 'entry').reduce((acc, f) => acc + f.grossPnl, 0);
      const totalFeesPaid = (pos.feesPaid ?? 0) + exitFill.fees;
      // Use original notional as denominator (matches PARTIAL_CLOSE / FLATTEN / REVERSE / FILL_TP_LEG).
      const pnlPercent = pos.entryPrice > 0 && (pos.originalSize ?? pos.size) > 0
        ? (pnl / (pos.entryPrice * (pos.originalSize ?? pos.size))) * 100
        : 0;

      const closed: PaperPosition = {
        ...pos,
        exitTime: time,
        exitPrice: fillPrice,
        pnl,
        pnlPercent,
        exitReason: reason,
        grossPnl,
        feesPaid: totalFeesPaid,
        fills: allFills,
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
      return {
        ...state,
        activePosition: { ...state.activePosition, takeProfit: action.payload.price },
      };
    }

    case 'UPDATE_PENDING': {
      const { orderId, stopLoss, takeProfit, triggerPrice } = action.payload;
      return {
        ...state,
        pendingOrders: state.pendingOrders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                ...(triggerPrice !== undefined ? { triggerPrice } : {}),
                ...(stopLoss !== undefined ? { stopLoss } : {}),
                ...(takeProfit !== undefined ? { takeProfit } : {}),
              }
            : o,
        ),
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
      const closedPositions = action.payload.trades;
      return {
        ...state,
        activePosition: undefined,
        closedPositions,
        stats: computeStats(closedPositions, state.startingBalance),
      };
    }

    case 'LOAD_SESSION': {
      const { startingBalance, closedPositions, pendingOrders } = action.payload;
      return {
        startingBalance,
        activePosition: undefined,
        closedPositions,
        pendingOrders,
        stats: computeStats(closedPositions, startingBalance),
        commissionConfig: state.commissionConfig,
      };
    }

    case 'HYDRATE': {
      // Full-state replace from a validated persisted snapshot. The payload is
      // already shape-checked + stats-recomputed by loadPersistedState.
      return action.payload;
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

      const fillPrice = applySlippage(
        action.payload.fillPrice,
        order.side,
        true,
        order.type,
        state.commissionConfig,
      );
      const entryFee = applyCommission(fillPrice, order.size, state.commissionConfig);
      const entryFill: FillRecord = {
        kind: 'entry',
        price: fillPrice,
        qty: order.size,
        grossPnl: 0,
        fees: entryFee,
        netPnl: -entryFee,
        time: action.payload.fillTime,
      };

      const newPos: PaperPosition = {
        id: `pos_${action.payload.fillTime}_${Math.random().toString(36).slice(2, 8)}`,
        side: order.side,
        entryTime: action.payload.fillTime,
        entryPrice: fillPrice,
        size: order.size,
        originalSize: order.size,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        takeProfits: [],
        strategyId: order.strategyId ?? null,
        entryOrderType: order.type,
        feesPaid: entryFee,
        grossPnl: 0,
        fills: [entryFill],
      };
      return {
        ...state,
        activePosition: newPos,
        pendingOrders: state.pendingOrders.filter((o) => o.id !== order.id),
      };
    }

    // ─── Phase 7: multi-leg TP management ───────────────────────

    case 'ADD_TP_LEG': {
      if (!state.activePosition) return state;
      const existing = state.activePosition.takeProfits ?? [];
      return {
        ...state,
        activePosition: {
          ...state.activePosition,
          takeProfits: [...existing, action.payload.leg],
        },
      };
    }

    case 'REMOVE_TP_LEG': {
      if (!state.activePosition) return state;
      return {
        ...state,
        activePosition: {
          ...state.activePosition,
          takeProfits: (state.activePosition.takeProfits ?? []).filter(
            (l) => l.id !== action.payload.legId,
          ),
        },
      };
    }

    case 'UPDATE_TP_LEG': {
      if (!state.activePosition) return state;
      return {
        ...state,
        activePosition: {
          ...state.activePosition,
          takeProfits: (state.activePosition.takeProfits ?? []).map((l) =>
            l.id === action.payload.legId ? { ...l, price: action.payload.price } : l,
          ),
        },
      };
    }

    case 'PARTIAL_CLOSE': {
      if (!state.activePosition) return state;
      const pos = state.activePosition;
      const { percent, price, time } = action.payload;

      // Market fill with slippage.
      const fillPrice = applySlippage(price, pos.side, false, 'MARKET', state.commissionConfig);
      const closeQty = partialCloseSize(pos.size, percent, true);
      if (closeQty <= 0) return state;

      const exitFill = buildExitFill('partial_exit', fillPrice, closeQty, pos, 'manual', state.commissionConfig, time);
      const newSize = pos.size - closeQty;
      const newFeesPaid = (pos.feesPaid ?? 0) + exitFill.fees;
      const newFills = [...(pos.fills ?? []), exitFill];

      // If remaining size ≤ EPSILON, treat as full close and seal the position.
      if (newSize <= EPSILON) {
        const pnl = newFills.reduce((acc, f) => acc + f.netPnl, 0);
        const grossPnl = newFills.filter((f) => f.kind !== 'entry').reduce((acc, f) => acc + f.grossPnl, 0);
        const pnlPercent = pos.entryPrice > 0 ? (pnl / (pos.entryPrice * (pos.originalSize ?? pos.size))) * 100 : 0;
        const closed: PaperPosition = {
          ...pos,
          size: 0,
          exitTime: time,
          exitPrice: fillPrice,
          pnl,
          pnlPercent,
          exitReason: 'manual',
          grossPnl,
          feesPaid: newFeesPaid,
          fills: newFills,
        };
        const closedPositions = [...state.closedPositions, closed];
        return {
          ...state,
          activePosition: undefined,
          closedPositions,
          stats: computeStats(closedPositions, state.startingBalance),
        };
      }

      return {
        ...state,
        activePosition: {
          ...pos,
          size: newSize,
          feesPaid: newFeesPaid,
          fills: newFills,
        },
      };
    }

    case 'BREAKEVEN_STOP': {
      if (!state.activePosition) return state;
      const pos = state.activePosition;
      const offset = action.payload?.offset ?? 0;
      const beSl = breakevenStop(pos.entryPrice, pos.side, offset);
      return {
        ...state,
        activePosition: { ...pos, stopLoss: beSl },
      };
    }

    case 'FLATTEN': {
      if (!state.activePosition) return state;
      const pos = state.activePosition;
      const { price, time } = action.payload;

      // Market fill with slippage.
      const fillPrice = applySlippage(price, pos.side, false, 'MARKET', state.commissionConfig);
      const exitFill = buildExitFill('final_exit', fillPrice, pos.size, pos, 'flatten', state.commissionConfig, time);
      const allFills = [...(pos.fills ?? []), exitFill];
      const pnl = allFills.reduce((acc, f) => acc + f.netPnl, 0);
      const direction = pos.side === 'LONG' ? 1 : -1;
      const grossPnl = (fillPrice - pos.entryPrice) * direction * pos.size;
      const totalFeesPaid = (pos.feesPaid ?? 0) + exitFill.fees;
      const pnlPercent = pos.entryPrice > 0 ? (pnl / (pos.entryPrice * (pos.originalSize ?? pos.size))) * 100 : 0;

      const closed: PaperPosition = {
        ...pos,
        exitTime: time,
        exitPrice: fillPrice,
        pnl,
        pnlPercent,
        exitReason: 'flatten',
        grossPnl,
        feesPaid: totalFeesPaid,
        fills: allFills,
        // Cancel all TP legs — position is flat.
        takeProfits: (pos.takeProfits ?? []).map((l) => ({ ...l, filled: true })),
      };
      const closedPositions = [...state.closedPositions, closed];
      return {
        ...state,
        activePosition: undefined,
        closedPositions,
        pendingOrders: [], // flatten cancels ALL pending orders
        stats: computeStats(closedPositions, state.startingBalance),
      };
    }

    case 'REVERSE': {
      if (!state.activePosition) return state;
      const pos = state.activePosition;
      const { price, time, newSize } = action.payload;

      // Close existing at market with slippage.
      const closeFill = applySlippage(price, pos.side, false, 'MARKET', state.commissionConfig);
      const exitFill = buildExitFill('final_exit', closeFill, pos.size, pos, 'reverse', state.commissionConfig, time);
      const allCloseFills = [...(pos.fills ?? []), exitFill];
      const pnl = allCloseFills.reduce((acc, f) => acc + f.netPnl, 0);
      const direction = pos.side === 'LONG' ? 1 : -1;
      const grossPnl = (closeFill - pos.entryPrice) * direction * pos.size;
      const totalFeesPaid = (pos.feesPaid ?? 0) + exitFill.fees;
      const pnlPercent = pos.entryPrice > 0 ? (pnl / (pos.entryPrice * (pos.originalSize ?? pos.size))) * 100 : 0;

      const closedPos: PaperPosition = {
        ...pos,
        exitTime: time,
        exitPrice: closeFill,
        pnl,
        pnlPercent,
        exitReason: 'reverse',
        grossPnl,
        feesPaid: totalFeesPaid,
        fills: allCloseFills,
      };

      // Open opposite position at market with slippage.
      const oppositeSide: PaperSide = pos.side === 'LONG' ? 'SHORT' : 'LONG';
      const entryFillPrice = applySlippage(price, oppositeSide, true, 'MARKET', state.commissionConfig);
      const entryFee = applyCommission(entryFillPrice, newSize, state.commissionConfig);
      const newEntryFill: FillRecord = {
        kind: 'entry',
        price: entryFillPrice,
        qty: newSize,
        grossPnl: 0,
        fees: entryFee,
        netPnl: -entryFee,
        time,
      };

      const newPos: PaperPosition = {
        id: `pos_${time}_${Math.random().toString(36).slice(2, 8)}`,
        side: oppositeSide,
        entryTime: time,
        entryPrice: entryFillPrice,
        size: newSize,
        originalSize: newSize,
        takeProfits: [],
        strategyId: pos.strategyId ?? null,
        entryOrderType: 'MARKET',
        feesPaid: entryFee,
        grossPnl: 0,
        fills: [newEntryFill],
      };

      const closedPositions = [...state.closedPositions, closedPos];
      return {
        ...state,
        activePosition: newPos,
        closedPositions,
        pendingOrders: [], // reverse cancels all pending orders
        stats: computeStats(closedPositions, state.startingBalance),
      };
    }

    case 'CANCEL_ALL_PENDING': {
      return { ...state, pendingOrders: [] };
    }

    case 'SET_COMMISSION_CONFIG': {
      return { ...state, commissionConfig: action.payload.config };
    }

    case 'FILL_TP_LEG': {
      if (!state.activePosition) return state;
      const pos = state.activePosition;
      const { legId, time } = action.payload;

      const legs = pos.takeProfits ?? [];
      const legIndex = legs.findIndex((l) => l.id === legId);
      if (legIndex < 0) return state; // leg not found
      const leg = legs[legIndex];
      if (leg.filled) return state;   // already filled

      // Leg fills at limit price (no slippage — standard TP simulation convention).
      const fillPrice = leg.price;
      // Close qty = sizePercent% of ORIGINAL size, clamped to remaining size.
      const originalSize = pos.originalSize ?? pos.size;
      const closeQty = Math.min(
        (originalSize * leg.sizePercent) / 100,
        pos.size,
      );
      if (closeQty <= EPSILON) return state;

      const exitFee = applyCommission(fillPrice, closeQty, state.commissionConfig);
      const direction = pos.side === 'LONG' ? 1 : -1;
      const grossPnl = (fillPrice - pos.entryPrice) * direction * closeQty;
      const exitFill: FillRecord = {
        kind: 'partial_exit',
        price: fillPrice,
        qty: closeQty,
        grossPnl,
        fees: exitFee,
        netPnl: grossPnl - exitFee,
        time,
        reason: 'tp',
      };

      const newSize = pos.size - closeQty;
      const newFeesPaid = (pos.feesPaid ?? 0) + exitFee;
      const newFills = [...(pos.fills ?? []), exitFill];

      // Mark this leg filled.
      const newLegs = legs.map((l, i) => (i === legIndex ? { ...l, filled: true } : l));

      // If remaining size ≤ EPSILON after this leg, seal the position.
      if (newSize <= EPSILON) {
        const pnl = newFills.reduce((acc, f) => acc + f.netPnl, 0);
        const totalGrossPnl = newFills.filter((f) => f.kind !== 'entry').reduce((acc, f) => acc + f.grossPnl, 0);
        const pnlPercent = pos.entryPrice > 0 ? (pnl / (pos.entryPrice * originalSize)) * 100 : 0;
        const closed: PaperPosition = {
          ...pos,
          size: 0,
          takeProfits: newLegs,
          exitTime: time,
          exitPrice: fillPrice,
          pnl,
          pnlPercent,
          exitReason: 'tp',
          grossPnl: totalGrossPnl,
          feesPaid: newFeesPaid,
          fills: newFills,
        };
        const closedPositions = [...state.closedPositions, closed];
        return {
          ...state,
          activePosition: undefined,
          closedPositions,
          stats: computeStats(closedPositions, state.startingBalance),
        };
      }

      return {
        ...state,
        activePosition: {
          ...pos,
          size: newSize,
          takeProfits: newLegs,
          feesPaid: newFeesPaid,
          fills: newFills,
        },
      };
    }

    default:
      return state;
  }
}

// ─── Public interface ────────────────────────────────────────────

export interface UseBacktestSessionReturn {
  state: SessionState;
  openPosition: (payload: OpenPayload) => void;
  closePosition: (payload: ClosePayload) => void;
  updateStopLoss: (price: number) => void;
  updateTakeProfit: (price: number) => void;
  reset: (startingBalance?: number) => void;
  /** Bulk-replace closed trades from a strategy run. Clears active position. */
  loadTrades: (trades: PaperPosition[]) => void;
  // Phase 6
  addPendingOrder: (payload: AddPendingPayload) => void;
  cancelPendingOrder: (orderId: string) => void;
  fillPendingOrder: (orderId: string, fillPrice: number, fillTime: number) => void;
  /** Update a pending order's SL/TP/trigger (used by the draggable position box). */
  updatePendingRisk: (orderId: string, changes: { stopLoss?: number; takeProfit?: number; triggerPrice?: number }) => void;
  /** Hydrate the full session from a saved record (Phase 7+ load flow). */
  loadSession: (payload: LoadSessionPayload) => void;
  // Phase 7
  addTpLeg: (leg: TakeProfitLeg) => void;
  removeTpLeg: (legId: string) => void;
  updateTpLeg: (legId: string, price: number) => void;
  /** Partial close: close `percent` fraction (0–1) of the active position at market price. */
  partialClose: (percent: number, price: number, time: number) => void;
  /** Move stop loss to entry price ± optional offset (default 0 = exact breakeven). */
  moveToBreakeven: (offset?: number) => void;
  /** Close active position + cancel all pending orders atomically. */
  flatten: (price: number, time: number) => void;
  /** Close active position + immediately open opposite side position. */
  reverse: (price: number, time: number, newSize: number) => void;
  /** Cancel all pending orders atomically. */
  cancelAllPending: () => void;
  /** Update the session-level commission/slippage config. */
  setCommissionConfig: (config: CommissionConfig) => void;
  /**
   * Fill a single TP leg during replay. Closes sizePercent% of original size
   * at the leg's limit price; marks leg filled; seals position when remaining ≤ EPSILON.
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
  const configured = closed.filter((p) => p.stopLoss != null || p.takeProfit != null || (p.takeProfits && p.takeProfits.length > 0));
  for (const p of configured) {
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

function makeEmptyState(initialBalance: number): SessionState {
  return {
    startingBalance: initialBalance,
    activePosition: undefined,
    closedPositions: [],
    pendingOrders: [],
    stats: EMPTY_STATS,
    commissionConfig: { ...DEFAULT_COMMISSION_CONFIG },
  };
}

function storageKeyFor(userId: string | null | undefined, sessionId?: string | null): string | null {
  if (!userId) return null;
  // Session-scoped key: each backtest session persists/restores its own state.
  // Falls back to a user-global key when no sessionId is supplied (legacy callers).
  return sessionId ? `${STORAGE_PREFIX}${userId}:${sessionId}` : STORAGE_PREFIX + userId;
}

// Per-position field validation. A persisted trade from an older schema (or a
// corrupted blob) could carry bad fields that produce NaN P&L or div-by-zero in
// computeStats/computePnL (e.g. entryPrice: 0). Drop anything that doesn't pass.
function isValidPaperPosition(p: unknown): p is PaperPosition {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === 'string'
    && (o.side === 'LONG' || o.side === 'SHORT')
    && typeof o.entryTime === 'number' && Number.isFinite(o.entryTime)
    && typeof o.entryPrice === 'number' && Number.isFinite(o.entryPrice) && o.entryPrice > 0
    && typeof o.size === 'number' && Number.isFinite(o.size) && o.size >= 0
  );
}

/**
 * Normalise a PaperPosition from localStorage, converting legacy fields to
 * current schema so the reducer never encounters missing required fields.
 *
 * - Adds `originalSize` if missing (default = size at load time).
 * - Converts legacy `TakeProfitLeg.portion` (0–1 fraction) → `sizePercent` (0–100).
 * - Initialises `feesPaid`, `fills`, `grossPnl` if absent.
 */
function migratePosition(p: PaperPosition): PaperPosition {
  // Ensure originalSize always present.
  const originalSize = typeof p.originalSize === 'number' ? p.originalSize : p.size;

  // Normalise takeProfits legs.
  const takeProfits: TakeProfitLeg[] = (p.takeProfits ?? []).map((leg) => {
    if (typeof (leg as TakeProfitLeg & { portion?: number }).portion === 'number' && !leg.sizePercent) {
      // Legacy fraction → percent
      const portion = (leg as TakeProfitLeg & { portion: number }).portion;
      return { ...leg, sizePercent: portion * 100, id: leg.id ?? `tp_migrated_${Math.random().toString(36).slice(2, 8)}` };
    }
    // Ensure id present (older records may lack it).
    return { ...leg, id: leg.id ?? `tp_migrated_${Math.random().toString(36).slice(2, 8)}` };
  });

  return {
    ...p,
    originalSize,
    takeProfits,
    feesPaid: p.feesPaid ?? 0,
    fills: p.fills ?? [],
    grossPnl: p.grossPnl ?? p.pnl ?? 0,
  };
}

function loadPersistedState(initialBalance: number, key: string | null): SessionState {
  const empty = makeEmptyState(initialBalance);
  if (!key || typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return empty;
    if (!Array.isArray(parsed.closedPositions) || !Array.isArray(parsed.pendingOrders)) return empty;

    // Field-level sanitization: keep only well-formed positions, validate the
    // active one, and ALWAYS recompute stats from the cleaned set so the
    // persisted `stats` can never disagree with the trades (or carry NaN).
    const startingBalance =
      typeof parsed.startingBalance === 'number' && Number.isFinite(parsed.startingBalance) && parsed.startingBalance > 0
        ? parsed.startingBalance
        : initialBalance;
    const closedPositions = (parsed.closedPositions as unknown[])
      .filter(isValidPaperPosition)
      .map(migratePosition) as PaperPosition[];
    const rawActive = isValidPaperPosition(parsed.activePosition)
      ? migratePosition(parsed.activePosition as PaperPosition)
      : undefined;
    const pendingOrders = (Array.isArray(parsed.pendingOrders) ? parsed.pendingOrders : []).filter(
      (o): o is PendingOrder => {
        if (!o || typeof o !== 'object') return false;
        const r = o as Record<string, unknown>;
        return (
          typeof r.id === 'string'
          && (r.side === 'LONG' || r.side === 'SHORT')
          && (r.type === 'LIMIT' || r.type === 'STOP')
          && typeof r.triggerPrice === 'number' && Number.isFinite(r.triggerPrice)
          && typeof r.size === 'number' && Number.isFinite(r.size) && r.size > 0
          && typeof r.createdAt === 'number' && Number.isFinite(r.createdAt)
        );
      }
    );

    // Restore commissionConfig if saved; fall back to defaults so existing
    // sessions without a stored config continue to work.
    const commissionConfig: CommissionConfig =
      parsed.commissionConfig &&
      typeof parsed.commissionConfig === 'object' &&
      typeof (parsed.commissionConfig as Record<string, unknown>).commissionPerOrder === 'number'
        ? (parsed.commissionConfig as CommissionConfig)
        : { ...DEFAULT_COMMISSION_CONFIG };

    return {
      startingBalance,
      activePosition: rawActive,
      closedPositions,
      pendingOrders,
      stats: computeStats(closedPositions, startingBalance),
      commissionConfig,
    };
  } catch {
    // corrupt JSON / quota / blocked storage — fall through to empty.
  }
  return empty;
}

export function useBacktestSession(initialBalance: number = 10000, sessionId?: string | null): UseBacktestSessionReturn {
  // useEffectiveUser returns the student's id in Mentor View (read-only there).
  const { id: userId } = useEffectiveUser();
  // Session-scoped key so a freshly-opened session starts from its OWN
  // configured balance + empty trades, instead of inheriting the previously
  // opened session's persisted balance/position/P&L (which made every session
  // show the default $10,000 and a stale open position).
  const key = storageKeyFor(userId, sessionId);

  // Initialize empty. The real restore happens in the hydration effect below
  // once `key` is known — `useAuth().user` is frequently null on first render
  // (auth resolves async), and useReducer's lazy initializer runs only ONCE,
  // so loading here would permanently miss the late-arriving user id.
  const [state, dispatch] = useReducer(reducer, null, () => makeEmptyState(initialBalance));

  // Tracks which user key we've already hydrated, so we restore exactly once
  // per key and never re-clobber mid-session. Also gates the write effect.
  const hydratedKeyRef = useRef<string | null>(null);

  // Hydrate from localStorage as soon as the user key becomes available.
  useEffect(() => {
    if (!key) return;
    if (hydratedKeyRef.current === key) return;
    hydratedKeyRef.current = key;
    dispatch({ type: 'HYDRATE', payload: loadPersistedState(initialBalance, key) });
  }, [key, initialBalance]);

  // Throttled persistence: every state change schedules a write ~500ms out; a
  // fresh change before the timer fires resets it (collapses bursts like SL
  // drag into one write). Gated on hydratedKeyRef so the initial empty state
  // never overwrites saved data before the hydration dispatch lands.
  const writeTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!key || typeof window === 'undefined') return;
    if (hydratedKeyRef.current !== key) return;
    if (writeTimerRef.current !== null) {
      window.clearTimeout(writeTimerRef.current);
    }
    writeTimerRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // quota exceeded / private-mode / disabled — silently drop.
      }
      writeTimerRef.current = null;
    }, PERSIST_THROTTLE_MS);
    return () => {
      if (writeTimerRef.current !== null) {
        window.clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
    };
  }, [state, key]);

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

  const updatePendingRisk = useCallback(
    (orderId: string, changes: { stopLoss?: number; takeProfit?: number; triggerPrice?: number }) => {
      dispatch({ type: 'UPDATE_PENDING', payload: { orderId, ...changes } });
    },
    [],
  );

  const loadSession = useCallback((payload: LoadSessionPayload) => {
    dispatch({ type: 'LOAD_SESSION', payload });
  }, []);

  // Phase 7 callbacks
  const addTpLeg = useCallback((leg: TakeProfitLeg) => {
    dispatch({ type: 'ADD_TP_LEG', payload: { leg } });
  }, []);

  const removeTpLeg = useCallback((legId: string) => {
    dispatch({ type: 'REMOVE_TP_LEG', payload: { legId } });
  }, []);

  const updateTpLeg = useCallback((legId: string, price: number) => {
    dispatch({ type: 'UPDATE_TP_LEG', payload: { legId, price } });
  }, []);

  const partialClose = useCallback((percent: number, price: number, time: number) => {
    dispatch({ type: 'PARTIAL_CLOSE', payload: { percent, price, time } });
  }, []);

  const moveToBreakeven = useCallback((offset?: number) => {
    dispatch({ type: 'BREAKEVEN_STOP', payload: { offset } });
  }, []);

  const flatten = useCallback((price: number, time: number) => {
    dispatch({ type: 'FLATTEN', payload: { price, time } });
  }, []);

  const reverse = useCallback((price: number, time: number, newSize: number) => {
    dispatch({ type: 'REVERSE', payload: { price, time, newSize } });
  }, []);

  const cancelAllPending = useCallback(() => {
    dispatch({ type: 'CANCEL_ALL_PENDING' });
  }, []);

  const setCommissionConfig = useCallback((config: CommissionConfig) => {
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
    reset,
    loadTrades,
    addPendingOrder,
    cancelPendingOrder,
    fillPendingOrder,
    updatePendingRisk,
    loadSession,
    addTpLeg,
    removeTpLeg,
    updateTpLeg,
    partialClose,
    moveToBreakeven,
    flatten,
    reverse,
    cancelAllPending,
    setCommissionConfig,
    fillTpLeg,
  };
}
