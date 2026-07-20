/**
 * Trading Arena — Liquidity tab (Bookmap-style resting-order heatmap)
 *
 * Crypto only — Binance is the only live order-book source wired in today.
 *
 * Reuses the SAME rendering approach as the Market Scanner
 * (src/pages/app/crypto/scanner/MarketScanner.tsx): FinotaurChart with
 * `wallRenderMode="matrix"` (DepthMatrixLayer, painted behind candles),
 * fed by `useDepthSlices` (the scanner's own depth-slice client — historical
 * backfill + 5s live-edge appends).
 *
 * Phase 1 "no manual thresholds" overhaul: this tab no longer has a manual
 * floor/size-filter toolbar. The data now carries (almost) every resting
 * order — only technical dust is removed at the sampling layer
 * (useDepthSlices.ts) — and DepthMatrixLayer's continuous significance
 * mapping (soft-knee alpha, see depthSignificance.ts) replaces the old
 * binary floor/size dimming. There is no adaptive-floor seeding from wall
 * history anymore either.
 *
 * Deliberately NOT reused from MarketScanner.tsx (do not modify that file —
 * task constraint): the wall-lifecycle tracking (tracked/dead WallSegment
 * stripes rendered via WallHeatLayer) is a ~700-line stateful subsystem in
 * MarketScanner.tsx that exists to also drive the scanner's alive/dead wall
 * *lines*, on top of the depth matrix. This tab only needs the matrix
 * heatmap itself (the "Bookmap-style liquidity chart" the task asks for), so
 * that subsystem is intentionally NOT duplicated here (intervalMs below is
 * copied, not imported, so MarketScanner.tsx itself is completely
 * untouched).
 *
 * Crypto layout mirrors ChartTab.tsx's right rail: a resizable (280-560px,
 * persisted to localStorage under its own key) PaperTradeRail, fed by this
 * tab's existing useBinanceOrderBook(symbol) instance (same book — no new
 * socket). The futures (NT8) branch does not get a rail in this pass — see
 * FuturesLiquidityBody, unchanged.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBinanceOrderBook } from '@/pages/app/crypto/scanner/useBinanceOrderBook';
import { useDepthSlices } from '@/pages/app/crypto/scanner/useDepthSlices';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import { BinanceSource } from '@/components/charting/dataSources';
import { AggregatingSource } from '@/components/charting/dataSources/AggregatingSource';
import type { AssetClass } from '@/components/backtest/symbolUniverse';
import type { Interval } from '@/components/charting/types';
import { cn } from '@/lib/utils';
import { intervalToSeconds, resolveIntervalPlan, type ArenaInterval } from '../utils/intervals';
import { useLiquidityPreferences } from '../hooks/useLiquidityPreferences';
import { buildViewSyncKey } from '../hooks/arenaViewState';
import { TickDataRequiredState } from '../components/TickDataRequiredState';
import { Nt8ConnectPanel } from '../components/Nt8ConnectPanel';
import { useNt8OrderBook } from '../hooks/useNt8OrderBook';
import { useLiveDepthColumns } from '../hooks/useLiveDepthColumns';
import { resolveTradeSource } from '@/components/charting/orderflow/sourceRegistry';
import { useOrderFlow } from '@/components/charting/orderflow/useOrderFlow';
import { FlowBinStore } from '@/components/charting/orderflow/flowBinStore';
import { DatabentoBarsSource } from '@/components/charting/orderflow/DatabentoBarsSource';
import { onNt8BridgeStatus, getNt8BridgeStatus, type BridgeStatus } from '@/components/charting/orderflow/nt8Bridge';
import {
  FUTURES_CONTRACTS,
  FUTURES_ROOTS,
  toNt8Symbol,
  type FuturesRoot,
} from '@/components/charting/orderflow/futuresContracts';
import { LiquiditySettingsMenu } from '../components/LiquiditySettingsMenu';
import { PaperTradeRail } from '../components/PaperTradeRail';
import { PaperTradeRailShell } from '../components/PaperTradeRailShell';

interface LiquidityTabProps {
  symbol: string;
  interval: ArenaInterval;
  assetClass: AssetClass;
  /** Wired to the Arena's symbol setter — powers the stocks/forex empty state's quick-switch chips. */
  onSelectSymbol?: (symbol: string) => void;
}

// One module-level singleton per file — BinanceSource is stateless (same
// pattern ChartTab.tsx / FootprintTab.tsx each follow independently).
const binanceSource = new BinanceSource();

// Bar-interval helpers — `intervalSeconds`/`intervalMs` now delegate to the
// arbitrary-interval-capable `intervalToSeconds` (utils/intervals.ts) instead
// of a fixed switch, so custom Trading Arena timeframes size the lookback
// window and DepthMatrixLayer's column width correctly. Kept as thin local
// wrappers (same names MarketScanner.tsx's own copy uses) to minimize the
// diff against that file's pattern.
function intervalSeconds(iv: ArenaInterval): number {
  return intervalToSeconds(iv);
}

function intervalMs(iv: ArenaInterval): number {
  return intervalSeconds(iv) * 1000;
}

// Lookback window (seconds) per interval — Binance klines with startTime
// returns the FIRST 1000 bars after `from`, so the window MUST stay under
// the 1000-bar cap or the chart shows stale history instead of the present.
const BARS_LOOKBACK = 600;
function lookbackSeconds(iv: ArenaInterval): number {
  return BARS_LOOKBACK * intervalSeconds(iv);
}

// Visible window on open — 120 bars, matching MarketScanner's own default framing.
const VISIBLE_BARS = 120;

// View-sync bounded-restore bound (viewSyncRestoreMaxBars — see
// FinotaurChart's prop doc comment) for the CRYPTO liquidity body only:
// lets a fresh sync window from Chart/CVD win over this tab's own
// depth-coverage-driven focusRange on the INITIAL mount. A heatmap
// tolerates a much wider window than a footprint chart (no per-cell text
// legibility constraint), hence the looser cap than Footprint's 120.
const VIEW_SYNC_RESTORE_MAX_BARS = 500;

// Approximate bar-spacing px used only to pick the depth-slice resolution
// tier (5s vs 1m) — same conservative constant MarketScanner uses.
const APPROX_BAR_SPACING_PX = 8;

// Depth-slice history is far sparser than candle history — historical
// requests are chunked into 960-row pages via chunked fetch in
// useDepthSlices.ts (CHUNK_SPAN_1M), and the crypto_depth_slices tables are UNLOGGED
// (wiped on every DB restart), so depth data older than ~48h realistically
// never exists. The candle lookback, however, is 600 bars — up to 6.25
// DAYS at 15m. Feeding that full candle window straight into useDepthSlices
// as fromMs/toMs forced a 4-chunk historical fetch (+ worker decode +
// full-grid rebuild over thousands of columns) on every mount and, before
// the gap-based coverage fix in useDepthSlices.ts, on every ~30s slide
// tick too — the busy-loop / frozen-heatmap bug on this tab. Cap the DEPTH
// request window only; the candle series itself keeps its full lookback.
const MAX_DEPTH_WINDOW_SEC = 48 * 60 * 60; // 48h

// Re-slide the candle window every 30s so the chart keeps up with "now"
// (same cadence MarketScanner uses).
const SLIDE_INTERVAL_MS = 30_000;

// ── Resizable right rail — same convention as ChartTab.tsx's PaperTradeRail
// rail (280-560px, dragged from the left edge, persisted to localStorage),
// mirrored here rather than extracted into a shared hook (ChartTab.tsx
// itself implements this inline, not via a reusable hook/component — see
// the task's own note). Own storage key so this tab's width doesn't fight
// the Chart tab's.
const RAIL_MIN_WIDTH = 280;
const RAIL_MAX_WIDTH = 560;
const RAIL_DEFAULT_WIDTH = 320;
const RAIL_WIDTH_STORAGE_KEY = 'arena-liquidity-rail-width';

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

export function LiquidityTab({ symbol, interval, assetClass, onSelectSymbol }: LiquidityTabProps) {
  if (assetClass === 'crypto') {
    // Keyed by symbol — forces a clean remount (and therefore a clean WS
    // reconnect + wall-history refetch) on symbol change, same technique
    // MarketScanner.tsx uses for its own WorkstationInner.
    return (
      <LiquidityBody
        key={symbol}
        symbol={symbol}
        interval={interval}
        viewSyncKey={buildViewSyncKey(assetClass, symbol, interval)}
      />
    );
  }

  if (assetClass === 'futures') {
    // NT8 bridge path, available to ALL users — mirrors FootprintTab.tsx's
    // futures rewire. No admin gate (Databento never had a depth/L2 feed;
    // this is exclusively an NT8-bridge surface).
    return <FuturesLiquidityBody interval={interval} />;
  }

  return (
    <div className="flex flex-1 min-h-0 w-full">
      <div className="flex flex-1 min-w-0">
        <TickDataRequiredState variant="depth" onSelectSymbol={onSelectSymbol} />
      </div>
      <PaperTradeRailShell width={320}>
        <PaperTradeRail
          symbol={symbol}
          livePrice={null}
          bid={null}
          ask={null}
          enabled={false}
          disabledTitle="Depth feed unavailable"
          disabledDescription="Choose crypto or futures to enable this trading panel."
        />
      </PaperTradeRailShell>
    </div>
  );
}

// ─── Futures mode (NT8 desktop-agent bridge) ────────────────────────────────

// Placeholder Interval passed to FinotaurChart — the actual bucket size
// comes from DatabentoBarsSource's intervalSecOverride (below), same
// convention as FootprintTab.tsx's DATABENTO_INTERVAL_PLACEHOLDER.
const NT8_INTERVAL_PLACEHOLDER: Interval = '1m';

// NT8 futures resting size has no natural USD notional (it's in contracts,
// not base-asset units) — approximate one via the contract's point value so
// the existing DepthMatrixLayer floor/color pipeline (which decodes q as
// USD via qToUsd) still produces a sane heatmap. See
// useLiveDepthColumns.ts's header comment for the full tradeoff writeup.
const FUTURES_LOOKBACK_BARS = 600;
const FUTURES_VISIBLE_BARS = 120;

function FuturesLiquidityBody({ interval }: { interval: ArenaInterval }) {
  const [root, setRoot] = useState<FuturesRoot>('NQ');

  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>(() => getNt8BridgeStatus());
  useEffect(() => onNt8BridgeStatus(setBridgeStatus), []);
  const isLive = bridgeStatus === 'live';

  const nt8Symbol = useMemo(() => toNt8Symbol(root), [root]);
  const intervalSec = intervalToSeconds(interval);

  // resolveTradeSource('futures', root, { nt8Connected: true }) never
  // returns null for a known FUTURES_ROOTS member (see its doc comment).
  const { source: tradeSource, tickSize } = resolveTradeSource('futures', root, {
    isAdmin: false,
    nt8Connected: true,
  })!;

  // Candles are derived from the SAME trade store the (separate) NT8
  // footprint tab uses, purely to feed FinotaurChart's candlestick series
  // under the depth heatmap — no footprint overlay is rendered here.
  const { store } = useOrderFlow({
    symbol: nt8Symbol,
    intervalSec,
    rowSize: tickSize,
    source: tradeSource,
    backfillBars: FUTURES_LOOKBACK_BARS,
  });

  const barsSource = useMemo(() => new DatabentoBarsSource(store, intervalSec), [store, intervalSec]);

  const [barsRefreshToken, setBarsRefreshToken] = useState(0);
  useEffect(() => {
    let lastBump = 0;
    let pendingTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastTradesIngested = store.getTradesIngested();
    const bump = () => {
      lastBump = Date.now();
      lastTradesIngested = store.getTradesIngested();
      setBarsRefreshToken((n) => n + 1);
    };
    const unsubscribe = store.onChange(() => {
      if (store.getTradesIngested() <= lastTradesIngested) return;
      const elapsed = Date.now() - lastBump;
      if (elapsed >= 2000) {
        bump();
      } else if (!pendingTimeout) {
        pendingTimeout = setTimeout(() => {
          pendingTimeout = null;
          bump();
        }, 2000 - elapsed);
      }
    });
    return () => {
      unsubscribe();
      if (pendingTimeout) clearTimeout(pendingTimeout);
    };
  }, [store]);

  const book = useNt8OrderBook(nt8Symbol);
  const pointValue = FUTURES_CONTRACTS[root].pointValue;
  const depth = useLiveDepthColumns({
    getBook: book.getBook,
    isLive: book.status === 'live',
    notionalMultiplier: pointValue,
    persistKey: `nt8|${root}`,
  });

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

  // Persisted per-contract-root (Task S2 restyle) — mirrors FootprintTab.tsx's
  // FuturesFootprintBody, which persists footprint settings by root too (a
  // quarterly front-month rollover shouldn't reset the user's chosen look).
  const { preferences, update: updateLiquidityPreferences } = useLiquidityPreferences(root);

  // Right-edge depth-profile gutter snapshot — same 5s poll cadence as the
  // crypto body above; `book` here is the NT8 bridge's own local order book
  // (useNt8OrderBook), no new network activity.
  const [restingBookSnapshot, setRestingBookSnapshot] = useState(() => book.getBook());
  useEffect(() => {
    const id = setInterval(() => setRestingBookSnapshot(book.getBook()), 5_000);
    return () => clearInterval(id);
    // book.getBook is useCallback-stable ([] deps in useNt8OrderBook.ts) —
    // [] is intentional, not stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const { from, to } = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return { from: now - FUTURES_LOOKBACK_BARS * intervalSec, to: now };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timeTick intentionally drives recompute
  }, [intervalSec, timeTick]);

  const focusRange = useMemo(() => ({ from: to - FUTURES_VISIBLE_BARS * intervalSec, to }), [to, intervalSec]);

  // ATAS-parity "synced price scale" (arenaViewState.ts). Keyed by the
  // CONTRACT ROOT ('NQ'), not the Arena's top-level symbol selection — this
  // body's futures contract picker (FUTURES_ROOTS pills below) is its own
  // independent instrument selection, unrelated to whatever top-level
  // symbol ChartTab happens to show. Using the top-level symbol here would
  // risk associating a saved price/time window with the WRONG instrument.
  const viewSyncKey = useMemo(() => buildViewSyncKey('futures', root, interval), [root, interval]);

  const [timeFitToken, setTimeFitToken] = useState(0);
  useEffect(() => {
    setTimeFitToken((t) => t + 1);
  }, [root, interval]);

  const recordingLabel = depth.recordingSinceMs
    ? new Date(depth.recordingSinceMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

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

        {isLive && recordingLabel && (
          <span className="text-[10px] text-[#707070]" aria-live="polite">
            {depth.restoredFromMs
              ? `Depth history restored · since ${recordingLabel}`
              : `Recording depth since ${recordingLabel} — depth history starts at connection`}
          </span>
        )}

        {isLive && <LiquiditySettingsMenu preferences={preferences} onChange={updateLiquidityPreferences} />}

        <span
          className={cn('flex items-center gap-1 text-[10px] font-medium ml-auto', isLive ? 'text-emerald-400' : 'text-[#707070]')}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', isLive ? 'bg-emerald-400' : 'bg-[#707070]')} />
          {isLive ? 'NinjaTrader — live' : 'Not connected'}
        </span>
      </div>

      <div className="flex flex-1 min-h-0 w-full">
        <div className="flex-1 min-w-0">
          {isLive ? (
            <FinotaurChart
              hideCursor
              freeVerticalCrosshair
              symbol={nt8Symbol}
              interval={NT8_INTERVAL_PLACEHOLDER}
              from={from}
              to={to}
              dataSource={barsSource}
              theme="dark"
              height="100%"
              showRefocusButton
              focusRange={focusRange}
              timeFitToken={timeFitToken}
              refreshToken={barsRefreshToken}
              wallRenderMode="matrix"
              depthMatrixColumns={depth.columns}
              depthMatrixBinSize={depth.binSize}
              depthMatrixCandleIntervalMs={intervalSec * 1000}
              depthMatrixPalette={preferences.palette}
              depthMatrixSmoothing={preferences.smoothing}
              depthMatrixSensitivity={preferences.sensitivity}
              volumeBubbles={{
                store,
                visible: preferences.bubbles,
                thresholdSetting: preferences.bubbleThreshold,
              }}
              depthProfile={{
                bids: restingBookSnapshot.bids,
                asks: restingBookSnapshot.asks,
                binSize: depth.binSize,
                visible: preferences.sideProfile,
              }}
              viewSyncKey={viewSyncKey}
            />
          ) : (
            <Nt8ConnectPanel variant="depth" />
          )}
        </div>

        <PaperTradeRailShell width={320}>
          <PaperTradeRail
            symbol={nt8Symbol}
            livePrice={book.lastPrice}
            bid={bid}
            ask={ask}
            enabled={isLive}
            disabledTitle="NinjaTrader not connected"
            disabledDescription="Connect the desktop bridge to enable futures paper trading."
          />
        </PaperTradeRailShell>
      </div>
    </div>
  );
}

interface LiquidityBodyProps {
  symbol: string;
  interval: ArenaInterval;
  /** ATAS-parity "synced price scale" (arenaViewState.ts) — see FinotaurChart's `viewSyncKey` prop doc comment. */
  viewSyncKey: string;
}

function LiquidityBody({ symbol, interval, viewSyncKey }: LiquidityBodyProps) {
  const book = useBinanceOrderBook(symbol);

  // Best bid/ask for PaperTradeRail's "Buy Bid" / "Sell Ask" limit orders —
  // same derivation ChartTab.tsx/DomTab.tsx use, reading the top of book from
  // this tab's existing useBinanceOrderBook(symbol) instance (no new socket).
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

  // ── Resizable right rail (mirrors ChartTab.tsx) ────────────────────────
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

  // Persisted per-symbol (PR 3, task K.1) — this component is already
  // remounted per-symbol (see the `key={symbol}` in LiquidityTab above), so
  // the hook's lazy initializer alone is enough to pick up the right record
  // — no extra resync needed.
  const { preferences, update: updateLiquidityPreferences } = useLiquidityPreferences(symbol);

  // Executed-aggression trade feed (Task S2 — "Arena WOW" volume bubbles).
  // 🔴 Deliberately NOT useOrderFlow/BinanceTradeSource here — that would open
  // a SECOND WebSocket subscribed to the same `<symbol>@aggTrade` stream
  // useBinanceOrderBook(symbol) above already has open (it subscribes to the
  // combined `@depth@100ms/@aggTrade` stream and buffers trades internally —
  // see useBinanceOrderBook.ts's `drainTrades()`). Instead, this store is fed
  // directly from that SAME connection's trade ring buffer on a 1s drain —
  // "one shared feed, no extra sockets" per the task spec. No historical
  // backfill (bubbles only need live/recent prints, not full history), and no
  // flowStoreCache warm-start either (that cache is for the Footprint tab's
  // own useOrderFlow instances) — an intentional v1 tradeoff to avoid any new
  // network activity from this tab.
  const flowStoreRef = useRef(
    new FlowBinStore({ intervalSec: intervalSeconds(interval), rowSize: 1 }),
  );
  useEffect(() => {
    flowStoreRef.current.clear();
  }, [symbol]);
  useEffect(() => {
    const id = setInterval(() => {
      const trades = book.drainTrades();
      if (trades.length === 0) return;
      flowStoreRef.current.applyTrades(
        trades.map((t) => ({ time: t.time, price: t.price, qty: t.qty, buyerAggressor: !t.isBuyerMaker })),
      );
    }, 1_000);
    return () => clearInterval(id);
    // book.drainTrades is useCallback-stable for the lifetime of this
    // useBinanceOrderBook(symbol) instance (see that hook's own deps=[] on
    // drainTrades); this component itself remounts on symbol change (see
    // `key={symbol}` in LiquidityTab above) — `[]` is correct, not stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sliding candle window — recomputed every 30s so the chart keeps pace
  // with "now" (matches MarketScanner.tsx's timeTick pattern).
  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const { from, to } = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return { from: now - lookbackSeconds(interval), to: now };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timeTick intentionally drives recompute
  }, [interval, timeTick]);

  // Depth-slice coverage is frequently much shorter than the natural
  // VISIBLE_BARS window (the server serves recent windows fine but times
  // out on older ones), so the natural window opens on a heatmap sliver at
  // its right edge. `depthSnapFromSec` holds a one-time correction (an
  // absolute `from`, seconds) once we've observed how far back real depth
  // data actually goes — null means "no correction yet / not needed".
  const [depthSnapFromSec, setDepthSnapFromSec] = useState<number | null>(null);
  const depthSnapAttemptedRef = useRef(false);

  const focusRange = useMemo(
    () => ({
      from: depthSnapFromSec ?? to - VISIBLE_BARS * intervalSeconds(interval),
      to,
    }),
    [to, interval, depthSnapFromSec],
  );

  // Snap the time axis to focusRange once per interval change (NOT on every
  // 30s slide — that would fight the user's pan). Symbol change already
  // re-mounts this whole component via the `key=` in LiquidityTab above.
  const [timeFitToken, setTimeFitToken] = useState(0);
  // Status chip (PR 3, task K.2) — true while the depth-slice backfill for
  // the current (symbol, interval) hasn't produced any real (non-synthetic,
  // flags-bit-0-clear — see useDepthSlices.ts) column yet. Reset alongside
  // depthSnapAttemptedRef on interval change; cleared by the coverage-snap
  // effect below the first time real depth data shows up — which, since
  // phase 2 (depthHistoryStore.ts), can be a restored-from-IndexedDB column
  // just as easily as a fresh server one; the chip below distinguishes the
  // two via depthMatrix.restoredFromMs.
  const [depthHistoryLoading, setDepthHistoryLoading] = useState(true);
  useEffect(() => {
    setTimeFitToken((t) => t + 1);
    // Interval changed — re-arm the depth-coverage snap for the new interval.
    depthSnapAttemptedRef.current = false;
    setDepthSnapFromSec(null);
    setDepthHistoryLoading(true);
  }, [interval]);

  // Native-vs-aggregate resolution for the candlestick series (see
  // utils/intervals.ts) — arbitrary custom timeframes Binance doesn't serve
  // natively are wrapped in AggregatingSource.
  const { candleDataSource, candleInterval } = useMemo(() => {
    const plan = resolveIntervalPlan('binance', interval);
    if (plan.kind === 'native') {
      return { candleDataSource: binanceSource, candleInterval: plan.interval };
    }
    return {
      candleDataSource: new AggregatingSource(binanceSource, plan.targetSeconds, plan.baseInterval),
      candleInterval: plan.baseInterval,
    };
  }, [interval]);

  // Depth-only window, capped to MAX_DEPTH_WINDOW_SEC — see comment above
  // the constant. Candles (candleDataSource/from/to below) are unaffected.
  const depthFromSec = Math.max(from, to - MAX_DEPTH_WINDOW_SEC);

  const depthMatrix = useDepthSlices({
    symbol,
    fromMs: depthFromSec * 1000,
    toMs: to * 1000,
    barSpacingPx: APPROX_BAR_SPACING_PX,
    candleIntervalMs: intervalMs(interval),
    getBook: book.getBook,
    // No floorUsd — dust-only removal now happens unconditionally inside
    // useDepthSlices.ts (its own default). See depthSignificance.ts.
    isLive: book.status === 'live',
  });

  // Keep flowStoreRef's bin config in sync with the depth matrix's own
  // adaptive binSize (so bubble price levels line up with the heatmap's
  // rows) and the current candle interval. FlowBinStore.setConfig() only
  // re-bins its (small, live-only) raw ring when the config actually
  // changes — cheap even on every render.
  useEffect(() => {
    flowStoreRef.current.setConfig({
      intervalSec: intervalSeconds(interval),
      rowSize: depthMatrix.binSize > 0 ? depthMatrix.binSize : 1,
    });
  }, [interval, depthMatrix.binSize]);

  // Right-edge depth-profile gutter — a snapshot of the current resting book,
  // refreshed on the SAME 5s cadence the depth-slice live edge already uses
  // (SLIDE_INTERVAL_MS's own timeTick effect above already re-renders this
  // component every 30s for the candle window; the gutter needs a tighter
  // cadence, so it gets its own lightweight 5s poll of book.getBook() — no
  // new network/WS activity, `book` already streams live via useBinanceOrderBook).
  const [restingBookSnapshot, setRestingBookSnapshot] = useState(() => book.getBook());
  useEffect(() => {
    const id = setInterval(() => setRestingBookSnapshot(book.getBook()), 5_000);
    return () => clearInterval(id);
    // book.getBook is useCallback-stable for this component's lifetime — see
    // the drainTrades effect's identical note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Snap the initial visible window to where depth-slice data actually
  // exists. The server serves recent depth windows fine but times out
  // (query_failed) on older ones, so coverage is usually much shorter than
  // VISIBLE_BARS — without this the heatmap opens as a thin sliver at the
  // pane's right edge. Runs at most once per (symbol, interval): symbol
  // change re-mounts this component (key= in LiquidityTab), and the
  // interval-change effect above re-arms depthSnapAttemptedRef. Once
  // decided (snap or no-op), it never fires again — so it never fights a
  // user's subsequent pan.
  useEffect(() => {
    const firstReal = depthMatrix.columns.find((col) => (col.flags & 1) === 0);

    // Status chip: the first real column we ever see for this (symbol,
    // interval) clears the "loading" state, independent of whether a snap
    // is also warranted below.
    if (firstReal && depthHistoryLoading) setDepthHistoryLoading(false);

    if (depthSnapAttemptedRef.current) return;
    if (!firstReal) return; // no decoded depth data yet — wait for more

    depthSnapAttemptedRef.current = true;

    const ivSeconds = intervalSeconds(interval);
    const naturalFromSec = to - VISIBLE_BARS * ivSeconds;
    const earliestSec = Math.floor(firstReal.t / 1000);
    if (earliestSec <= naturalFromSec) return; // depth already covers the natural window

    const marginBars = 3;
    const minBars = 20; // never zoom tighter than ~20 bars
    const flooredFromSec = to - minBars * ivSeconds;
    const snappedFromSec = Math.min(flooredFromSec, earliestSec - marginBars * ivSeconds);

    setDepthSnapFromSec(snappedFromSec);
    setTimeFitToken((t) => t + 1);
  }, [depthMatrix.columns, to, interval, depthHistoryLoading]);

  if (book.status === 'error') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-semibold text-red-400">Live data unavailable</p>
        <p className="text-[12px] text-white/40 max-w-sm">
          Could not connect to the Binance market data stream. Check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      {/* Phase 1 "no manual thresholds" overhaul: the floor + size-filter
          segmented controls are gone — the heatmap now shows (almost) the
          whole book with a continuous significance mapping (see
          depthSignificance.ts). Only the settings menu + status chips remain. */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: 'rgba(201,166,70,0.10)' }}>
        <LiquiditySettingsMenu preferences={preferences} onChange={updateLiquidityPreferences} />

        {depthHistoryLoading && (
          <span className="text-[10px] text-[#707070] ml-auto" aria-live="polite">
            {depthMatrix.restoredFromMs != null ? 'Depth history restored locally' : 'Loading depth history…'}
          </span>
        )}

        <span
          className={cn(
            'flex items-center gap-1 text-[10px] font-medium',
            !depthHistoryLoading && 'ml-auto',
            book.status === 'live' && 'text-emerald-400',
            book.status === 'connecting' && 'text-[#707070]',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', book.status === 'live' ? 'bg-emerald-400' : 'bg-[#707070]')} />
          {book.status === 'live' ? 'Live' : 'Connecting…'}
        </span>
      </div>

      <div className="flex flex-1 min-h-0 w-full">
        {/* Chart pane */}
        <div className="relative flex flex-1 min-w-0 flex-col">
          <div className="relative flex-1 min-h-0">
            <FinotaurChart
              hideCursor
              freeVerticalCrosshair
              symbol={symbol}
              interval={candleInterval}
              from={from}
              to={to}
              dataSource={candleDataSource}
              theme="dark"
              height="100%"
              showRefocusButton
              focusRange={focusRange}
              timeFitToken={timeFitToken}
              wallRenderMode="matrix"
              depthMatrixColumns={depthMatrix.columns}
              depthMatrixBinSize={depthMatrix.binSize}
              depthMatrixCandleIntervalMs={intervalMs(interval)}
              depthMatrixPalette={preferences.palette}
              depthMatrixSmoothing={preferences.smoothing}
              depthMatrixSensitivity={preferences.sensitivity}
              volumeBubbles={{
                store: flowStoreRef.current,
                visible: preferences.bubbles,
                thresholdSetting: preferences.bubbleThreshold,
              }}
              depthProfile={{
                bids: restingBookSnapshot.bids,
                asks: restingBookSnapshot.asks,
                binSize: depthMatrix.binSize,
                visible: preferences.sideProfile,
              }}
              viewSyncKey={viewSyncKey}
              viewSyncRestoreMaxBars={VIEW_SYNC_RESTORE_MAX_BARS}
            />
          </div>
        </div>

        {/* Paper-trading rail — same resizable drag-handle pattern as
            ChartTab.tsx's crypto-only rail. This tab's crypto branch always
            has a live Binance book (see the `book.status === 'error'` early
            return above), so the rail is unconditional here. */}
        <PaperTradeRailShell
          width={railWidth}
          resizeHandle={
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panel"
              onMouseDown={handleRailHandleMouseDown}
              className={`w-1.5 flex-shrink-0 cursor-col-resize transition-colors ${
                isDraggingRail ? 'bg-[#C9A646]/60' : 'bg-transparent hover:bg-[#C9A646]/30'
              }`}
            />
          }
        >
          <PaperTradeRail
            key={symbol}
            symbol={symbol}
            livePrice={book.lastPrice}
            bid={bid}
            ask={ask}
            enabled
          />
        </PaperTradeRailShell>
      </div>
    </div>
  );
}
