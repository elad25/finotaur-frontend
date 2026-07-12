/**
 * PaperTradeRail — right-rail paper-trading panel for Trading Arena.
 *
 * Self-contained by default: owns a useBacktestSession scoped to
 * `arena-paper`. Receives the live tick price from the parent (ChartTab via
 * useBinanceOrderBook).
 * No balance display, no P&L totals, no save-to-journal.
 *
 * Optional `session` prop (added for the DOM tab — tabs/DomTab.tsx): when a
 * caller has ALREADY lifted its own `useBacktestSession('arena-paper')`
 * instance (so it can also feed the same working orders into a click-to-
 * trade surface like DomLadder.tsx), pass it here and this component uses
 * it INSTEAD of its own. The internal hook is still called unconditionally
 * (rules of hooks) but its state/dispatches are simply unused in that case —
 * harmless (one extra idle reducer + localStorage read under the same key,
 * no double-write since nothing ever dispatches into it). When `session` is
 * omitted (ChartTab's call site — untouched), behavior is 100% unchanged.
 * Either way there is exactly ONE live-tick fill engine running against
 * whichever session is active (`activeSession` below).
 *
 * Live-tick engine (useEffect on livePrice):
 *   - Fills pending LIMIT/STOP orders when the tick crosses their trigger.
 *   - Auto-closes positions on SL/TP hits.
 *
 * Key reducer fact: fillPendingOrder() routes through the OPEN netting logic
 * internally (FILL_PENDING → reducer OPEN). The caller must NOT call openPosition
 * after fillPendingOrder — doing so would double-open the position.
 */

import { useEffect, useState, useMemo } from 'react';
import { useBacktestSession, type UseBacktestSessionReturn } from '@/hooks/useBacktestSession';
import { cn } from '@/lib/utils';
import { CleanSelect, type CleanSelectOption } from './CleanSelect';

// Internal notional only — used as the useBacktestSession starting balance
// so P&L percentages have a denominator. Never displayed to the user.
const PAPER_BALANCE = 100_000;

const TIF_OPTIONS: CleanSelectOption<'GTC' | 'Day'>[] = [
  { value: 'GTC', label: 'GTC' },
  { value: 'Day', label: 'Day' },
];

export interface PaperTradeRailProps {
  symbol: string;
  livePrice: number | null;
  /** Best bid from the live Binance order book. Null until the book connects. */
  bid: number | null;
  /** Best ask from the live Binance order book. Null until the book connects. */
  ask: number | null;
  /** When false (non-crypto), the panel shows a disabled notice instead of the order form. */
  enabled: boolean;
  /** Optional pre-lifted session (DOM tab) — see the file header comment. Defaults to an internal instance when omitted. */
  session?: UseBacktestSessionReturn;
}

export function PaperTradeRail({ symbol, livePrice, bid, ask, enabled, session }: PaperTradeRailProps) {
  // Called unconditionally (rules of hooks) even when a `session` prop is
  // supplied — see the file header comment for why this is safe.
  const internalSession = useBacktestSession(PAPER_BALANCE, 'arena-paper');
  const activeSession = session ?? internalSession;

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
  } = activeSession;

  const activePos = state.activePosition;

  // New NinjaTrader-style order panel local state.
  const [qty, setQty] = useState(1);
  // TIF is cosmetic for paper market/limit orders — display-only, not wired
  // into the engine (paper fills don't distinguish GTC vs Day).
  const [tif, setTif] = useState<'GTC' | 'Day'>('GTC');

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
      {/* NinjaTrader-style order-entry panel — disabled if no live price yet */}
      {livePrice == null ? (
        <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-center">
          <p className="text-[11px] text-zinc-600">Connecting to live feed…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-[#C9A646]/20 bg-[#0A0A0C] p-3">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-white">{symbol}</span>
            <span className="rounded border border-[#C9A646]/30 bg-[#C9A646]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C9A646]">
              Paper
            </span>
          </div>

          {/* Order button grid */}
          <div className="grid grid-cols-2 gap-[7px]">
            <button
              type="button"
              onClick={() => {
                if (livePrice <= 0) return;
                openPosition({ side: 'LONG', price: livePrice, time: nowSec(), size: qty, entryOrderType: 'MARKET' });
              }}
              className="rounded-md border border-[rgba(29,158,117,0.4)] bg-[rgba(29,158,117,0.18)] py-2 text-[12px] font-bold text-[#3ddc9a] transition-colors hover:bg-[rgba(29,158,117,0.28)]"
            >
              Buy Mkt
            </button>
            <button
              type="button"
              onClick={() => {
                if (livePrice <= 0) return;
                openPosition({ side: 'SHORT', price: livePrice, time: nowSec(), size: qty, entryOrderType: 'MARKET' });
              }}
              className="rounded-md border border-[rgba(212,83,126,0.4)] bg-[rgba(212,83,126,0.18)] py-2 text-[12px] font-bold text-[#ff6b93] transition-colors hover:bg-[rgba(212,83,126,0.28)]"
            >
              Sell Mkt
            </button>

            <button
              type="button"
              disabled={bid == null || bid <= 0}
              onClick={() => {
                if (bid == null || bid <= 0) return;
                addPendingOrder({ side: 'LONG', type: 'LIMIT', triggerPrice: bid, size: qty, time: nowSec() });
              }}
              className="flex flex-col items-center rounded-md border border-[rgba(29,158,117,0.2)] bg-[rgba(29,158,117,0.06)] py-1.5 text-[11px] font-semibold text-[#3ddc9a] transition-colors hover:bg-[rgba(29,158,117,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Buy Bid
              <span className="text-[9px] font-normal normal-case text-[#3ddc9a]/60">wait · limit</span>
            </button>
            <button
              type="button"
              disabled={ask == null || ask <= 0}
              onClick={() => {
                if (ask == null || ask <= 0) return;
                addPendingOrder({ side: 'SHORT', type: 'LIMIT', triggerPrice: ask, size: qty, time: nowSec() });
              }}
              className="flex flex-col items-center rounded-md border border-[rgba(212,83,126,0.2)] bg-[rgba(212,83,126,0.06)] py-1.5 text-[11px] font-semibold text-[#ff6b93] transition-colors hover:bg-[rgba(212,83,126,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sell Ask
              <span className="text-[9px] font-normal normal-case text-[#ff6b93]/60">wait · limit</span>
            </button>

            <button
              type="button"
              disabled={!activePos}
              onClick={() => {
                if (!activePos) return;
                reverse(livePrice, nowSec(), activePos.size);
              }}
              className="rounded-md border border-[#C9A646]/40 bg-[#C9A646]/10 py-1.5 text-[11px] font-bold text-[#C9A646] transition-colors hover:bg-[#C9A646]/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reverse
            </button>
            <button
              type="button"
              disabled={!activePos && state.pendingOrders.length === 0}
              onClick={() => {
                if (state.activePosition) {
                  closePosition({ price: livePrice, time: nowSec(), reason: 'manual' });
                }
                cancelAllPending();
              }}
              className="rounded-md border border-zinc-600 bg-black py-1.5 text-[11px] font-bold text-white transition-colors hover:border-zinc-400 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Close
            </button>
          </div>
          <p className="text-[10px] text-zinc-600">
            Close = flatten position + cancel pending
          </p>

          {/* PnL bar */}
          <div className="flex items-center justify-between rounded-md border border-[#C9A646]/15 bg-black px-2.5 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Unrealized PnL
            </span>
            <span
              className={cn(
                'text-[13px] font-bold tabular-nums',
                unrealizedPnl == null
                  ? 'text-zinc-600'
                  : unrealizedPnl >= 0
                    ? 'text-[#3ddc9a]'
                    : 'text-[#ff6b93]',
              )}
            >
              {unrealizedPnl == null ? '—' : `${unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}`}
            </span>
          </div>

          {/* Order qty + TIF */}
          <div className="grid grid-cols-2 gap-[7px]">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Order Qty</p>
              <div className="flex items-center justify-between rounded-md border border-[#C9A646]/20 bg-black/40 px-1 py-1">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="h-5 w-5 rounded text-[13px] font-bold text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  −
                </button>
                <span className="text-[12px] font-semibold text-white tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="h-5 w-5 rounded text-[13px] font-bold text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">TIF</p>
              {/* TIF is cosmetic for paper market orders — display-only, not wired into the engine. */}
              <CleanSelect<'GTC' | 'Day'> value={tif} onChange={setTif} options={TIF_OPTIONS} className="w-full" />
            </div>
          </div>

          {/* Bid / Ask levels */}
          <div className="grid grid-cols-2 gap-[7px]">
            <div className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Bid</p>
              <p className="text-[12px] font-semibold tabular-nums text-[#3ddc9a]">
                {bid != null ? bid.toFixed(2) : '—'}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Ask</p>
              <p className="text-[12px] font-semibold tabular-nums text-[#ff6b93]">
                {ask != null ? ask.toFixed(2) : '—'}
              </p>
            </div>
          </div>
        </div>
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

      {/* Positions + orders counter — what's currently open/working */}
      <div className="grid grid-cols-2 gap-[7px]">
        <div className="rounded-lg border border-[#C9A646]/15 bg-black/30 px-3 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[#6a6a6a]">
            Positions
          </p>
          <p className="text-[13px] font-bold text-[#C9A646] tabular-nums">
            {activePos ? 1 : 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#C9A646]/15 bg-black/30 px-3 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[#6a6a6a]">
            Orders
          </p>
          <p className="text-[13px] font-bold text-[#C9A646] tabular-nums">
            {state.pendingOrders.length}
          </p>
        </div>
      </div>
    </div>
  );
}
