/**
 * Trading Arena — DOM tab (Depth-Of-Market price ladder).
 *
 * Crypto uses useBinanceOrderBook (live L2 book); futures uses the NT8
 * desktop-agent bridge (useNt8OrderBook), mirroring LiquidityTab.tsx's own
 * crypto/futures split — including the futures path owning its OWN contract
 * `root` state rather than trusting the Arena's generic `symbol` prop (which
 * for futures is a Yahoo-universe code like "MNQ=F", not an NT8/Databento
 * contract symbol — see LiquidityTab.tsx's FuturesLiquidityBody for the same
 * reasoning). Stocks/forex have no live depth feed — same TickDataRequiredState
 * empty state LiquidityTab shows.
 *
 * Paper session is LIFTED here (one useBacktestSession('arena-paper')
 * instance) and passed down into BOTH DomLadder (for pendingOrders +
 * place/cancel callbacks) and PaperTradeRail (via its new optional `session`
 * prop — see PaperTradeRail.tsx's header comment) so a ladder click and the
 * rail's own buttons operate on the exact same working orders/position.
 * useBacktestSession already exposes a single-order `cancelPendingOrder` —
 * no change to that hook was needed for this tab.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useBinanceOrderBook } from '@/pages/app/crypto/scanner/useBinanceOrderBook';
import { useBacktestSession } from '@/hooks/useBacktestSession';
import type { AssetClass } from '@/components/backtest/symbolUniverse';
import { useNt8OrderBook } from '../hooks/useNt8OrderBook';
import { useDomPreferences } from '../hooks/useDomPreferences';
import { DomSettingsMenu } from '../components/DomSettingsMenu';
import { DomLadder } from '../components/DomLadder';
import { Nt8ConnectPanel } from '../components/Nt8ConnectPanel';
import { TickDataRequiredState } from '../components/TickDataRequiredState';
import { PaperTradeRail } from '../components/PaperTradeRail';
import { onNt8BridgeStatus, getNt8BridgeStatus, type BridgeStatus } from '@/components/charting/orderflow/nt8Bridge';
import { FUTURES_CONTRACTS, FUTURES_ROOTS, toNt8Symbol, type FuturesRoot } from '@/components/charting/orderflow/futuresContracts';
import type { ArenaInterval } from '../utils/intervals';

interface DomTabProps {
  symbol: string;
  interval: ArenaInterval;
  assetClass: AssetClass;
  /** Wired to the Arena's symbol setter — powers the stocks/forex empty state's quick-switch chips. */
  onSelectSymbol?: (symbol: string) => void;
}

// Paper-trading rail width — same convention as ChartTab.tsx's fixed
// (non-resizable, this tab has no drag-handle requirement in scope) rail.
const RAIL_WIDTH = 320;

export function DomTab({ symbol, interval: _interval, assetClass, onSelectSymbol }: DomTabProps) {
  if (assetClass === 'crypto') {
    // Keyed by symbol — clean remount (fresh WS + fresh ladder accumulators)
    // on symbol change, same technique LiquidityTab.tsx uses.
    return <DomBody key={symbol} symbol={symbol} />;
  }

  if (assetClass === 'futures') {
    return <FuturesDomBody />;
  }

  return (
    <div className="flex flex-1 min-h-0 w-full">
      <div className="flex flex-1 min-w-0">
        <TickDataRequiredState variant="depth" onSelectSymbol={onSelectSymbol} />
      </div>
      <div className="flex-shrink-0 overflow-y-auto border-l border-white/10 bg-[#0A0A0A]" style={{ width: RAIL_WIDTH }}>
        <PaperTradeRail
          symbol={symbol}
          livePrice={null}
          bid={null}
          ask={null}
          enabled={false}
          disabledTitle="Depth feed unavailable"
          disabledDescription="Choose crypto or futures to enable this trading panel."
        />
      </div>
    </div>
  );
}

// ─── Crypto mode ─────────────────────────────────────────────────────────

interface DomBodyProps {
  symbol: string;
}

function DomBody({ symbol }: DomBodyProps) {
  const book = useBinanceOrderBook(symbol);
  const { preferences, update: updateDomPreferences } = useDomPreferences(symbol);
  const session = useBacktestSession(100_000, 'arena-paper');

  const { bid, ask } = useMemo(() => {
    const { bids, asks } = book.getBook();
    let bestBid: number | null = null;
    for (const p of bids.keys()) {
      if (bestBid === null || p > bestBid) bestBid = p;
    }
    let bestAsk: number | null = null;
    for (const p of asks.keys()) {
      if (bestAsk === null || p < bestAsk) bestAsk = p;
    }
    return { bid: bestBid, ask: bestAsk };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.getBook, book.lastPrice]);

  const handlePlaceLimit = useCallback(
    (side: 'LONG' | 'SHORT', price: number) => {
      session.addPendingOrder({
        side,
        type: 'LIMIT',
        triggerPrice: price,
        size: preferences.orderQty,
        time: Math.floor(Date.now() / 1000),
      });
    },
    [session, preferences.orderQty],
  );

  const handleCancelOrder = useCallback((orderId: string) => session.cancelPendingOrder(orderId), [session]);

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      <div className="flex items-center gap-3 px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: 'rgba(201,166,70,0.10)' }}>
        <DomSettingsMenu preferences={preferences} onChange={updateDomPreferences} />

        <span
          className={cn(
            'flex items-center gap-1 text-[10px] font-medium ml-auto',
            book.status === 'live' && 'text-emerald-400',
            book.status === 'connecting' && 'text-[#707070]',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', book.status === 'live' ? 'bg-emerald-400' : 'bg-[#707070]')} />
          {book.status === 'live' ? 'Live' : book.status === 'error' ? 'Feed error' : 'Connecting…'}
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 border-r border-white/10">
          <DomLadder
            getBook={book.getBook}
            drainTrades={book.drainTrades}
            lastPrice={book.lastPrice}
            status={book.status}
            preferences={preferences}
            pendingOrders={session.state.pendingOrders}
            onPlaceLimit={handlePlaceLimit}
            onCancelOrder={handleCancelOrder}
          />
        </div>

        <div className="flex-shrink-0 overflow-y-auto border-l border-white/10 bg-[#0A0A0A]" style={{ width: RAIL_WIDTH }}>
          <PaperTradeRail
            symbol={symbol}
            livePrice={book.lastPrice}
            bid={bid}
            ask={ask}
            enabled
            session={session}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Futures mode (NT8 desktop-agent bridge) ────────────────────────────────

function FuturesDomBody() {
  const [root, setRoot] = useState<FuturesRoot>('NQ');

  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>(() => getNt8BridgeStatus());
  useEffect(() => onNt8BridgeStatus(setBridgeStatus), []);
  const isLive = bridgeStatus === 'live';

  const nt8Symbol = useMemo(() => toNt8Symbol(root), [root]);
  const book = useNt8OrderBook(nt8Symbol);
  const { preferences, update: updateDomPreferences } = useDomPreferences(root);
  const session = useBacktestSession(100_000, 'arena-paper');

  // All 4 supported contracts (NQ/ES/MNQ/MES) share a 0.25 tick — derive
  // display precision from the spec instead of relying purely on the
  // ladder's own book-inference (NT8 depth can be thin right after connect).
  const pricePrecision = useMemo(() => {
    const tickStr = FUTURES_CONTRACTS[root].tickSize.toString();
    const dot = tickStr.indexOf('.');
    return dot === -1 ? 0 : tickStr.length - dot - 1;
  }, [root]);

  const { bid, ask } = useMemo(() => {
    const { bids, asks } = book.getBook();
    let bestBid: number | null = null;
    for (const p of bids.keys()) {
      if (bestBid === null || p > bestBid) bestBid = p;
    }
    let bestAsk: number | null = null;
    for (const p of asks.keys()) {
      if (bestAsk === null || p < bestAsk) bestAsk = p;
    }
    return { bid: bestBid, ask: bestAsk };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.getBook, book.lastPrice]);

  const handlePlaceLimit = useCallback(
    (side: 'LONG' | 'SHORT', price: number) => {
      session.addPendingOrder({
        side,
        type: 'LIMIT',
        triggerPrice: price,
        size: preferences.orderQty,
        time: Math.floor(Date.now() / 1000),
      });
    },
    [session, preferences.orderQty],
  );

  const handleCancelOrder = useCallback((orderId: string) => session.cancelPendingOrder(orderId), [session]);

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      <div className="flex items-center gap-3 flex-wrap px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: 'rgba(201,166,70,0.10)' }}>
        <div className="flex items-center gap-1" role="group" aria-label="Select futures contract">
          {FUTURES_ROOTS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoot(r)}
              className={cn(
                'h-7 min-w-[48px] rounded px-2.5 text-[11px] font-semibold transition-all duration-150 border',
                root === r
                  ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]'
                  : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
              )}
              title={FUTURES_CONTRACTS[r].displayName}
            >
              {r}
            </button>
          ))}
        </div>

        {isLive && <DomSettingsMenu preferences={preferences} onChange={updateDomPreferences} />}

        <span
          className={cn('flex items-center gap-1 text-[10px] font-medium ml-auto', isLive ? 'text-emerald-400' : 'text-[#707070]')}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', isLive ? 'bg-emerald-400' : 'bg-[#707070]')} />
          {isLive ? 'NinjaTrader — live' : 'Not connected'}
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {isLive ? (
          <>
            <div className="flex-1 min-w-0 border-r border-white/10">
              <DomLadder
                getBook={book.getBook}
                drainTrades={book.drainTrades}
                lastPrice={book.lastPrice}
                status={book.status}
                preferences={preferences}
                pendingOrders={session.state.pendingOrders}
                onPlaceLimit={handlePlaceLimit}
                onCancelOrder={handleCancelOrder}
                pricePrecision={pricePrecision}
              />
            </div>

            <div className="flex-shrink-0 overflow-y-auto border-l border-white/10 bg-[#0A0A0A]" style={{ width: RAIL_WIDTH }}>
              <PaperTradeRail
                symbol={nt8Symbol}
                livePrice={book.lastPrice}
                bid={bid}
                ask={ask}
                enabled
                session={session}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <Nt8ConnectPanel variant="depth" />
            </div>

            <div className="flex-shrink-0 overflow-y-auto border-l border-white/10 bg-[#0A0A0A]" style={{ width: RAIL_WIDTH }}>
              <PaperTradeRail
                symbol={nt8Symbol}
                livePrice={book.lastPrice}
                bid={bid}
                ask={ask}
                enabled={false}
                disabledTitle="NinjaTrader not connected"
                disabledDescription="Connect the desktop bridge to enable futures paper trading."
                session={session}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
