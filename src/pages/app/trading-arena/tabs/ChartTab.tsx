/**
 * Trading Arena — Chart tab (plain candlestick chart)
 *
 * Layout: two-pane flex row.
 *   Left  — FinotaurChart, routed through the shared data-source router
 *            (`pickDataSource` in src/components/charting/dataSources) —
 *            crypto → BinanceSource, our 14 cached futures roots →
 *            DatabentoCacheSource, everything else (stocks/forex/uncached
 *            futures) → YahooFinanceSource. Default indicators (EMA 50 /
 *            RSI 14) render on top.
 *   Right — Resizable (280-560 px, default 320 px) PaperTradeRail
 *            (paper-trading panel driven by live tick price from
 *            useBinanceOrderBook), crypto only. Non-crypto renders the chart
 *            full-width instead. Width is dragged via a handle on its left
 *            border and persisted to localStorage.
 *
 * useBinanceOrderBook is called unconditionally (rules of hooks). For non-crypto
 * symbols it connects to Binance with a malformed pair and will sit in 'error'
 * or 'connecting' state — livePrice stays null, which disables the rail (the
 * rail itself isn't rendered for non-crypto anyway — see the render below).
 *
 * Non-crypto data (Databento cache / Yahoo) may be delayed relative to a live
 * tick feed — a small "Delayed data" badge is shown near the top of the chart
 * pane whenever the active symbol isn't crypto.
 *
 * This tab is intentionally a PLAIN chart (2026-07 restructure) — no order
 * flow / footprint overlay, no CVD/Delta sub-panes, no depth-matrix heatmap.
 * The full order-flow footprint chart lives on the dedicated Order Flow tab
 * (tabs/FootprintTab.tsx) instead.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import {
  pickDataSource,
  isCryptoSymbol,
  isDatabentoCachedSymbol,
  toBinanceSymbol,
  toDatabentoCacheSymbol,
  toYahooSymbol,
} from '@/components/charting/dataSources';
import { AggregatingSource } from '@/components/charting/dataSources/AggregatingSource';
import type { Indicator } from '@/components/charting/types';
import { useBinanceOrderBook } from '@/pages/app/crypto/scanner/useBinanceOrderBook';
import { PaperTradeRail } from '../components/PaperTradeRail';
import {
  resolveIntervalPlan,
  type ArenaInterval,
  type CandleSourceKind,
} from '../utils/intervals';

interface ChartTabProps {
  symbol: string;
  interval: ArenaInterval;
  /** Detected asset class for the current symbol. Controls chart source and rail enabled state. */
  assetClass: string;
}

// Default indicators rendered in the arena chart.
const DEFAULT_INDICATORS: Indicator[] = [
  { type: 'EMA', period: 50 },
  { type: 'RSI', period: 14 },
];

// Rolling 24-hour window for the chart (from = now − 24h, to = now).
function nowWindow(): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 24 * 60 * 60;
  return { from, to };
}

// ── Resizable right rail (Task 1) ────────────────────────────────────────
const RAIL_MIN_WIDTH = 280;
const RAIL_MAX_WIDTH = 560;
const RAIL_DEFAULT_WIDTH = 320;
const RAIL_WIDTH_STORAGE_KEY = 'arena-rail-width';

function clampRailWidth(width: number): number {
  return Math.min(RAIL_MAX_WIDTH, Math.max(RAIL_MIN_WIDTH, width));
}

// Lazy initializer — localStorage access is guarded since it can throw
// (privacy mode, disabled storage, etc.).
function readStoredRailWidth(): number {
  try {
    const stored = localStorage.getItem(RAIL_WIDTH_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed)) return clampRailWidth(parsed);
    }
  } catch {
    // localStorage unavailable — fall back to the default width.
  }
  return RAIL_DEFAULT_WIDTH;
}

export function ChartTab({ symbol, interval, assetClass }: ChartTabProps) {
  const { from, to } = useMemo(nowWindow, [symbol, interval]);

  const isCrypto = assetClass === 'crypto';

  // ── Data-source routing (Task A) — resolves via the shared router
  // (pickDataSource) rather than reimplementing crypto/futures-cache/Yahoo
  // branching here. `symbol` arrives already source-native for its asset
  // class (TradingArena.tsx normalizes crypto to Binance pairs; futures/
  // forex/stocks come pre-resolved from SymbolAutocomplete's SYMBOL_UNIVERSE,
  // e.g. "MNQ=F", "EURUSD=X") — the per-branch mapper calls below are
  // idempotent passthroughs in that case and only do real work for symbols
  // that arrive in a raw/contract-code form.
  const { chartDataSource, chartSymbol, chartInterval } = useMemo(() => {
    const source = pickDataSource(symbol);
    let resolvedSymbol: string;
    let kind: CandleSourceKind;
    if (isCryptoSymbol(symbol)) {
      resolvedSymbol = toBinanceSymbol(symbol) ?? symbol;
      kind = 'binance';
    } else if (isDatabentoCachedSymbol(symbol)) {
      resolvedSymbol = toDatabentoCacheSymbol(symbol) ?? symbol;
      kind = 'databento';
    } else {
      resolvedSymbol = toYahooSymbol(symbol, assetClass) ?? symbol;
      kind = 'yahoo';
    }

    // Native-vs-aggregate resolution (see utils/intervals.ts) — arbitrary
    // ArenaInterval values (custom timeframes included) that the resolved
    // source can't serve directly are wrapped in AggregatingSource, binning
    // client-side from the finest native base.
    const plan = resolveIntervalPlan(kind, interval);
    const resolvedDataSource = plan.kind === 'native'
      ? source
      : new AggregatingSource(source, plan.targetSeconds, plan.baseInterval);
    const resolvedInterval = plan.kind === 'native' ? plan.interval : plan.baseInterval;

    return {
      chartDataSource: resolvedDataSource,
      chartSymbol: resolvedSymbol,
      chartInterval: resolvedInterval,
    };
  }, [symbol, assetClass, interval]);

  // Always called unconditionally (hooks rule). For non-crypto, the symbol
  // won't match a Binance pair — lastPrice will stay null, disabling the rail.
  const book = useBinanceOrderBook(symbol);
  const livePrice = book.lastPrice;

  // Best bid/ask for the order-entry panel's "Buy Bid" / "Sell Ask" limit
  // orders. useBinanceOrderBook keeps the full depth book in a ref (no
  // per-message re-render — see that hook's header comment), so we read the
  // top of book via its getBook() accessor and recompute whenever the
  // (1x/sec-throttled) lastPrice ticks.
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
  }, [book.getBook, livePrice]);

  // ── Resizable right rail (Task 1) ──────────────────────────────────────
  const [railWidth, setRailWidth] = useState<number>(readStoredRailWidth);
  const [isDraggingRail, setIsDraggingRail] = useState(false);
  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const railWidthRef = useRef(railWidth);
  railWidthRef.current = railWidth;

  const handleRailHandleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragStartRef.current = { startX: e.clientX, startWidth: railWidth };
      setIsDraggingRail(true);
    },
    [railWidth],
  );

  useEffect(() => {
    if (!isDraggingRail) return;

    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      // Rail is on the right — dragging the handle LEFT (clientX decreases)
      // should INCREASE the rail width.
      const next = clampRailWidth(start.startWidth + (start.startX - e.clientX));
      setRailWidth(next);
    };

    const handleMouseUp = () => {
      setIsDraggingRail(false);
      try {
        localStorage.setItem(RAIL_WIDTH_STORAGE_KEY, String(railWidthRef.current));
      } catch {
        // localStorage unavailable — width just won't persist across reloads.
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDraggingRail]);

  return (
    <div className="flex flex-1 min-h-0 w-full">
      {/* Chart pane */}
      <div className="relative flex flex-1 min-w-0 flex-col">
        <div className="relative flex-1 min-h-0">
          {!isCrypto && (
            <div
              className="absolute left-2 top-2 z-30 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                color: '#C9A646',
                background: 'rgba(201,166,70,0.12)',
                border: '1px solid rgba(201,166,70,0.28)',
              }}
              title="This symbol's data comes from a cached/delayed feed, not a live tick stream."
            >
              Delayed data
            </div>
          )}
          <FinotaurChart
            symbol={chartSymbol}
            interval={chartInterval}
            from={from}
            to={to}
            dataSource={chartDataSource}
            indicators={DEFAULT_INDICATORS}
            theme="dark"
            height="100%"
          />
        </div>
      </div>

      {/* Paper-trading rail (crypto only — driven by useBinanceOrderBook's
          live tick price, which has nothing to feed for non-crypto symbols).
          Non-crypto renders the chart pane full-width instead — no broken
          placeholder rail. */}
      {isCrypto && (
        <>
          {/* Drag handle — resizes the paper-trading rail (280-560 px). */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            onMouseDown={handleRailHandleMouseDown}
            className={`w-1.5 flex-shrink-0 cursor-col-resize transition-colors ${
              isDraggingRail ? 'bg-[#C9A646]/60' : 'bg-transparent hover:bg-[#C9A646]/30'
            }`}
          />

          <div
            className="flex-shrink-0 border-l border-white/10 bg-[#0A0A0A] overflow-y-auto"
            style={{ width: railWidth }}
          >
            <PaperTradeRail
              key={symbol}
              symbol={symbol}
              livePrice={livePrice}
              bid={bid}
              ask={ask}
              enabled={isCrypto}
            />
          </div>
        </>
      )}
    </div>
  );
}
