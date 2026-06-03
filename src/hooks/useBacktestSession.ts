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
 */

import { useReducer, useCallback } from 'react';

export type PaperSide = 'LONG' | 'SHORT';
export type ExitReason = 'manual' | 'sl' | 'tp';

export interface PaperPosition {
  id: string;
  side: PaperSide;
  entryTime: number;          // unix seconds (matches FinotaurChart UTCTimestamp)
  entryPrice: number;
  size: number;               // contracts / shares / units
  stopLoss?: number;
  takeProfit?: number;
  // Phase 4: optional tag identifying which strategy was active when the trade
  // was opened. `null` / undefined = manual / unattributed. Carried from OPEN
  // through to CLOSE so per-strategy stats can be reconstructed.
  strategyId?: string | null;
  // Phase 6: order type that opened the position. 'MARKET' = entered
  // immediately at user's clicked price. 'LIMIT' / 'STOP' = filled from a
  // pending order whose trigger price was touched by a later bar.
  entryOrderType?: 'MARKET' | 'LIMIT' | 'STOP';
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
}

export interface SessionState {
  startingBalance: number;
  activePosition?: PaperPosition;
  closedPositions: PaperPosition[];
  pendingOrders: PendingOrder[];   // Phase 6
  stats: SessionStats;
}

interface OpenPayload {
  side: PaperSide;
  price: number;
  time: number;
  size: number;
  stopLoss?: number;
  takeProfit?: number;
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
interface UpdatePendingPricePayload { orderId: string; triggerPrice: number; }

interface ClosePayload {
  price: number;
  time: number;
  reason: ExitReason;
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
  // Phase 7: drag-to-reposition
  | { type: 'UPDATE_PENDING_PRICE'; payload: UpdatePendingPricePayload };

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
};

function computePnL(p: PaperPosition, exitPrice: number): { pnl: number; pnlPercent: number } {
  const direction = p.side === 'LONG' ? 1 : -1;
  const pnl = (exitPrice - p.entryPrice) * direction * p.size;
  const pnlPercent = (((exitPrice - p.entryPrice) * direction) / p.entryPrice) * 100;
  return { pnl, pnlPercent };
}

function computeStats(closed: PaperPosition[], startingBalance: number): SessionStats {
  if (closed.length === 0) return EMPTY_STATS;

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

  for (const p of closed) {
    const pnl = p.pnl ?? 0;
    if (pnl > 0) {
      winners++;
      grossProfit += pnl;
      if (pnl > largestWin) largestWin = pnl;
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > longestWinStreak) longestWinStreak = currentWinStreak;
    } else if (pnl < 0) {
      losers++;
      grossLoss += Math.abs(pnl);
      if (Math.abs(pnl) > largestLoss) largestLoss = Math.abs(pnl);
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

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'OPEN': {
      if (state.activePosition) return state;
      const { side, price, time, size, stopLoss, takeProfit, strategyId, entryOrderType } = action.payload;
      const newPos: PaperPosition = {
        id: `pos_${time}_${Math.random().toString(36).slice(2, 8)}`,
        side,
        entryTime: time,
        entryPrice: price,
        size,
        stopLoss,
        takeProfit,
        strategyId: strategyId ?? null,
        entryOrderType: entryOrderType ?? 'MARKET',
      };
      return { ...state, activePosition: newPos };
    }
    case 'CLOSE': {
      if (!state.activePosition) return state;
      const { price, time, reason } = action.payload;
      const { pnl, pnlPercent } = computePnL(state.activePosition, price);
      const closed: PaperPosition = {
        ...state.activePosition,
        exitTime: time,
        exitPrice: price,
        pnl,
        pnlPercent,
        exitReason: reason,
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
    case 'RESET': {
      return {
        startingBalance: action.payload.startingBalance,
        activePosition: undefined,
        closedPositions: [],
        pendingOrders: [],
        stats: EMPTY_STATS,
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
    case 'UPDATE_PENDING_PRICE': {
      const { orderId, triggerPrice } = action.payload;
      return {
        ...state,
        pendingOrders: state.pendingOrders.map((o) =>
          o.id === orderId ? { ...o, triggerPrice } : o,
        ),
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
      const newPos: PaperPosition = {
        id: `pos_${action.payload.fillTime}_${Math.random().toString(36).slice(2, 8)}`,
        side: order.side,
        entryTime: action.payload.fillTime,
        entryPrice: action.payload.fillPrice,
        size: order.size,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        strategyId: order.strategyId ?? null,
        entryOrderType: order.type,
      };
      return {
        ...state,
        activePosition: newPos,
        pendingOrders: state.pendingOrders.filter((o) => o.id !== order.id),
      };
    }
    default:
      return state;
  }
}

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
  // Phase 7: drag-to-reposition
  updatePendingOrderPrice: (orderId: string, triggerPrice: number) => void;
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
  const [state, dispatch] = useReducer(reducer, {
    startingBalance: initialBalance,
    activePosition: undefined,
    closedPositions: [],
    pendingOrders: [],
    stats: EMPTY_STATS,
  });

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

  const updatePendingOrderPrice = useCallback((orderId: string, triggerPrice: number) => {
    dispatch({ type: 'UPDATE_PENDING_PRICE', payload: { orderId, triggerPrice } });
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
    updatePendingOrderPrice,
  };
}
