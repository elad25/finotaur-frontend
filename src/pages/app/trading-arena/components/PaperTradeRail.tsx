/**
 * PaperTradeRail — right-rail paper-trading panel for Trading Arena.
 *
 * Self-contained: owns a useBacktestSession scoped to `arena-paper`.
 * Receives the live tick price from the parent (ChartTab via useBinanceOrderBook).
 * No balance display, no P&L totals, no save-to-journal.
 *
 * Live-tick engine (useEffect on livePrice):
 *   - Fills pending LIMIT/STOP orders when the tick crosses their trigger.
 *   - Auto-closes positions on SL/TP hits.
 *
 * Key reducer fact: fillPendingOrder() routes through the OPEN netting logic
 * internally (FILL_PENDING → reducer OPEN). The caller must NOT call openPosition
 * after fillPendingOrder — doing so would double-open the position.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useBacktestSession } from '@/hooks/useBacktestSession';
import { PlaceOrderPanel } from '@/components/backtest/PlaceOrderPanel';
import type { PlaceOrderSubmit } from '@/components/backtest/PlaceOrderPanel';
import type { PaperSide } from '@/hooks/useBacktestSession';
import { cn } from '@/lib/utils';

// Internal notional only — used for risk-based sizing math in PlaceOrderPanel.
// Never displayed to the user.
const PAPER_BALANCE = 100_000;

export interface PaperTradeRailProps {
  symbol: string;
  livePrice: number | null;
  /** When false (non-crypto), the panel shows a disabled notice instead of the order form. */
  enabled: boolean;
}

export function PaperTradeRail({ symbol, livePrice, enabled }: PaperTradeRailProps) {
  const {
    state,
    openPosition,
    closePosition,
    addPendingOrder,
    fillPendingOrder,
    cancelAllPending,
    partialClose,
    moveToBreakeven,
    flatten,
    reverse,
  } = useBacktestSession(PAPER_BALANCE, 'arena-paper');

  const activePos = state.activePosition;

  // Unrealized P&L — pure number so we can color it.
  const unrealizedPnl = useMemo(() => {
    if (!activePos || livePrice == null) return null;
    const dir = activePos.side === 'LONG' ? 1 : -1;
    return (livePrice - activePos.entryPrice) * dir * activePos.size;
  }, [activePos, livePrice]);

  // ── Live-tick engine ───────────────────────────────────────────
  useEffect(() => {
    if (livePrice == null) return;
    const nowSec = Math.floor(Date.now() / 1000);

    // 1. Pending order fills (process at most one per tick — conservative).
    for (const order of state.pendingOrders) {
      let triggered = false;
      let fillPrice = order.triggerPrice;

      if (order.type === 'LIMIT') {
        if (order.side === 'LONG' && livePrice <= order.triggerPrice) {
          triggered = true;
          // Limit BUY: get limit price or better (tick may be below limit).
          fillPrice = Math.min(order.triggerPrice, livePrice);
        } else if (order.side === 'SHORT' && livePrice >= order.triggerPrice) {
          triggered = true;
          // Limit SELL: get limit price or better (tick may be above limit).
          fillPrice = Math.max(order.triggerPrice, livePrice);
        }
      } else {
        // STOP order
        if (order.side === 'LONG' && livePrice >= order.triggerPrice) {
          triggered = true;
          fillPrice = order.triggerPrice;
        } else if (order.side === 'SHORT' && livePrice <= order.triggerPrice) {
          triggered = true;
          fillPrice = order.triggerPrice;
        }
      }

      if (triggered) {
        // fillPendingOrder routes through OPEN netting internally — do NOT
        // call openPosition separately after this.
        fillPendingOrder(order.id, fillPrice, nowSec);
        return; // one fill per tick
      }
    }

    // 2. SL / TP auto-close on active position.
    if (!activePos) return;

    // SL check first (conservative — assume worst case on a single tick).
    if (activePos.side === 'LONG') {
      if (activePos.stopLoss != null && livePrice <= activePos.stopLoss) {
        closePosition({ price: activePos.stopLoss, time: nowSec, reason: 'sl' });
        return;
      }
      if (activePos.takeProfit != null && livePrice >= activePos.takeProfit) {
        closePosition({ price: activePos.takeProfit, time: nowSec, reason: 'tp' });
        return;
      }
    } else {
      if (activePos.stopLoss != null && livePrice >= activePos.stopLoss) {
        closePosition({ price: activePos.stopLoss, time: nowSec, reason: 'sl' });
        return;
      }
      if (activePos.takeProfit != null && livePrice <= activePos.takeProfit) {
        closePosition({ price: activePos.takeProfit, time: nowSec, reason: 'tp' });
        return;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePrice]);
  // Note: we intentionally omit state.pendingOrders and activePos from deps to
  // avoid stale-closure issues; the effect reads from `state` via closure but
  // fires on each price tick — this is the same pattern used by BacktestChart.

  // ── Order submit handler ──────────────────────────────────────
  const handleSubmit = useCallback((order: PlaceOrderSubmit) => {
    if (livePrice == null || livePrice <= 0) return;
    const nowSec = Math.floor(Date.now() / 1000);
    const side: PaperSide = order.side === 'buy' ? 'LONG' : 'SHORT';
    const sl = order.stopLoss ?? undefined;
    const tp = order.takeProfit ?? undefined;

    if (order.kind === 'market') {
      openPosition({
        side,
        price: livePrice,
        time: nowSec,
        size: order.size,
        stopLoss: sl,
        takeProfit: tp,
        takeProfits: order.takeProfits,
        entryOrderType: 'MARKET',
      });
    } else {
      addPendingOrder({
        side,
        type: order.kind === 'limit' ? 'LIMIT' : 'STOP',
        triggerPrice: order.price,
        size: order.size,
        stopLoss: sl,
        takeProfit: tp,
        time: nowSec,
      });
    }
  }, [livePrice, openPosition, addPendingOrder]);

  // ── Disabled state (non-crypto or no live price) ──────────────
  if (!enabled) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="text-[12px] font-medium text-zinc-500">
          Live data — crypto only for now
        </p>
        <p className="text-[11px] text-zinc-700">
          Switch to a crypto symbol to enable paper trading.
        </p>
      </div>
    );
  }

  // ── Position card helpers ─────────────────────────────────────
  const nowSec = () => Math.floor(Date.now() / 1000);
  const price = livePrice ?? 0;

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* PlaceOrderPanel — disabled if no live price yet */}
      {livePrice == null ? (
        <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-center">
          <p className="text-[11px] text-zinc-600">Connecting to live feed…</p>
        </div>
      ) : (
        <PlaceOrderPanel
          marketPrice={livePrice}
          symbol={symbol}
          currentBalance={PAPER_BALANCE}
          initialBalance={PAPER_BALANCE}
          onSubmit={handleSubmit}
        />
      )}

      {/* Open position card */}
      {activePos && (
        <div
          className={cn(
            'rounded-xl border p-3',
            activePos.side === 'LONG'
              ? 'border-emerald-500/30 bg-emerald-950/20'
              : 'border-rose-500/30 bg-rose-950/20',
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Open Position
            </span>
            <span
              className={cn(
                'flex items-center gap-1.5 text-xs font-bold',
                activePos.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  activePos.side === 'LONG' ? 'bg-emerald-400' : 'bg-rose-400',
                )}
              />
              {activePos.side}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-xs mb-3">
            <div>
              <span className="text-gray-500">Size</span>
              <span className="ml-2 font-mono text-white">
                {activePos.size}
                {activePos.originalSize && activePos.originalSize !== activePos.size && (
                  <span className="ml-1 text-gray-600">/{activePos.originalSize}</span>
                )}
              </span>
            </div>
            <div>
              <span className="text-gray-500">
                {(activePos.fills ?? []).filter((f) => f.kind === 'entry').length > 1
                  ? 'Avg Entry'
                  : 'Entry'}
              </span>
              <span className="ml-2 font-mono text-white">
                ${activePos.entryPrice.toFixed(2)}
              </span>
            </div>
            {activePos.stopLoss != null && (
              <div>
                <span className="text-rose-400/70">SL</span>
                <span className="ml-2 font-mono text-rose-400">
                  ${activePos.stopLoss.toFixed(2)}
                </span>
              </div>
            )}
            {activePos.takeProfit != null && !activePos.takeProfits?.length && (
              <div>
                <span className="text-emerald-400/70">TP</span>
                <span className="ml-2 font-mono text-emerald-400">
                  ${activePos.takeProfit.toFixed(2)}
                </span>
              </div>
            )}
            {unrealizedPnl != null && (
              <div className="col-span-2">
                <span className="text-gray-500">Unrealized</span>
                <span
                  className={cn(
                    'ml-2 font-mono font-semibold',
                    unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400',
                  )}
                >
                  {unrealizedPnl >= 0 ? '+' : ''}
                  {unrealizedPnl.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Partial-close row */}
          <div className="grid grid-cols-3 gap-1 mb-2">
            {([0.25, 0.5, 0.75] as const).map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => partialClose(pct, price, nowSec())}
                className="rounded-md border border-zinc-700 bg-zinc-900/60 py-1.5 text-[10px] font-semibold text-zinc-300 hover:border-[#C9A646]/40 hover:text-[#C9A646] transition-colors"
              >
                Close {pct * 100}%
              </button>
            ))}
          </div>

          {/* BE Stop / Flatten row */}
          <div className="grid grid-cols-2 gap-1 mb-2">
            <button
              type="button"
              onClick={() => moveToBreakeven()}
              className="rounded-md border border-zinc-700 bg-zinc-900/60 py-1.5 text-[10px] font-semibold text-zinc-300 hover:border-amber-500/40 hover:text-amber-400 transition-colors"
              title="Move stop loss to entry price (breakeven)"
            >
              BE Stop
            </button>
            <button
              type="button"
              onClick={() => flatten(price, nowSec())}
              className="rounded-md border border-zinc-700 bg-zinc-900/60 py-1.5 text-[10px] font-semibold text-zinc-300 hover:border-rose-500/40 hover:text-rose-400 transition-colors"
              title="Close position and cancel all pending orders"
            >
              Flatten
            </button>
          </div>

          {/* Reverse / Close All row */}
          <div className="grid grid-cols-2 gap-1 mb-2">
            <button
              type="button"
              onClick={() => reverse(price, nowSec(), activePos.size)}
              className="rounded-md border border-zinc-700 bg-zinc-900/60 py-1.5 text-[10px] font-semibold text-zinc-300 hover:border-purple-500/40 hover:text-purple-400 transition-colors"
              title="Close position and open opposite at same price"
            >
              Reverse
            </button>
            <button
              type="button"
              onClick={() => closePosition({ price, time: nowSec(), reason: 'manual' })}
              className="rounded-md border border-zinc-700 bg-black py-1.5 text-[10px] font-bold text-white hover:border-zinc-500 hover:bg-zinc-900 transition-colors"
            >
              Close All
            </button>
          </div>
        </div>
      )}

      {/* Cancel all pending */}
      {state.pendingOrders.length > 0 && (
        <button
          type="button"
          onClick={() => cancelAllPending()}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/40 py-2 text-xs font-semibold text-zinc-400 hover:border-rose-700 hover:text-rose-400 transition-colors"
        >
          Cancel All Pending ({state.pendingOrders.length})
        </button>
      )}

      {/* Slim session line — trades count and win rate, no dollar figures */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-1.5">
        <p className="text-[11px] text-zinc-500">
          Trades: {state.stats.totalTrades}
          {state.stats.totalTrades > 0 && (
            <> · Win {state.stats.winRate.toFixed(0)}%</>
          )}
        </p>
      </div>
    </div>
  );
}
