/**
 * Trading Arena — Footprint tab (dedicated order-flow footprint chart)
 *
 * Unlike ChartTab, where the footprint is a zoom-gated progressive-disclosure
 * overlay (hidden → shaded → full as the user zooms in), THIS tab's footprint
 * IS the chart: it always renders at full bid×ask detail
 * (`FootprintConfig.forceFullDetail`, see orderflow/types.ts +
 * FootprintLayer.tsx), and the chart opens at an initial zoom wide enough for
 * cells to be legible without the user needing to zoom in first.
 *
 * Supports BOTH crypto (Binance) and futures (Databento) — the two sources
 * FINOTAUR has live trade feeds for — switching by the Arena's detected
 * asset class, exactly the same split ChartTab (crypto) and FuturesChartTab
 * (futures) already implement, just consolidated into one tab. Each mode is
 * its own sub-component, conditionally mounted (same pattern TradingArena.tsx
 * itself uses to switch tabs) so only one trade-source connection is ever
 * open at a time.
 *
 * Futures compliance note (see FuturesChartTab.tsx's file header for the full
 * explanation): the Databento futures path is delayed historical data only.
 * Admins get an always-on dev-preview toggle (`isAdmin` prop). Paid
 * customers without a live NT8 bridge get the same Databento body as a
 * "Session Review — last closed session" surface (see
 * FuturesCustomerFootprintBody / useMarketDataEntitled), clearly labeled as
 * delayed. Free users still see the plain "connect NinjaTrader" placeholder,
 * unchanged.
 *
 * Stocks/forex → a plain English placeholder; no live trades feed exists for
 * those instruments today.
 *
 * Includes the same right-side PaperTradeRail workflow used by the regular
 * chart, including a draggable width handle.
 *
 * PR 2 — Unified Footprint Settings: this tab now owns its own settings
 * system (see ../components/footprintSettings.ts +
 * ../hooks/useFootprintPreferences.ts + ../components/FootprintSettingsMenu.tsx)
 * instead of the shared OrderFlowControls pill strip (that component still
 * backs FuturesChartTab.tsx's Chart-tab order-flow overlay unchanged — see
 * OrderFlowControls.tsx). The old ×2/×4 row-density multiplier is retired
 * here in favor of an explicit row-size mode (Auto / $ price / ticks); the
 * auto row-merge logic INSIDE the renderer (footprintRender.ts) is
 * unaffected.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import type { UTCTimestamp } from 'lightweight-charts';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import { BinanceSource } from '@/components/charting/dataSources';
import { useBinanceOrderBook } from '@/pages/app/crypto/scanner/useBinanceOrderBook';
import { AggregatingSource } from '@/components/charting/dataSources/AggregatingSource';
import type { Indicator, Interval } from '@/components/charting/types';
import type { AssetClass } from '@/components/backtest/symbolUniverse';
import {
  intervalToSeconds,
  resolveIntervalPlan,
  type ArenaInterval,
} from '../utils/intervals';
import { resolveTradeSource } from '@/components/charting/orderflow/sourceRegistry';
import { refineCryptoTickSize } from '@/components/charting/orderflow/cryptoTickSizes';
import { DatabentoBarsSource } from '@/components/charting/orderflow/DatabentoBarsSource';
import { useOrderFlow } from '@/components/charting/orderflow/useOrderFlow';
import { FlowBinStore } from '@/components/charting/orderflow/flowBinStore';
import { warmOrderflowCache, getReviewAvailability } from '@/components/charting/orderflow/DatabentoTradeSource';
import { refineNt8TickSize } from '@/components/charting/orderflow/Nt8TradeSource';
import { connectNt8Bridge, onNt8BridgeStatus, getNt8BridgeStatus, type BridgeStatus } from '@/components/charting/orderflow/nt8Bridge';
import { fetchBridgeConfig, type Nt8BridgeDeviceConfig } from '@/components/charting/orderflow/fetchBridgeConfig';
import { saveSnapshot, loadSnapshot } from '@/components/charting/orderflow/flowStorePersistence';
import { useMarketDataEntitled } from '@/lib/marketDataEntitlement';
import type { TradeSourceStatus } from '@/components/charting/orderflow/types';
import type { FootprintDetailLevel } from '@/components/charting/orderflow/footprintRender';
import {
  FUTURES_CONTRACTS,
  FUTURES_ROOTS,
  frontMonthContract,
  toNt8Symbol,
  type FuturesRoot,
} from '@/components/charting/orderflow/futuresContracts';
import { useFootprintPreferences } from '../hooks/useFootprintPreferences';
import { useChartStylePreferences } from '../hooks/useChartStylePreferences';
import { buildViewSyncKey } from '../hooks/arenaViewState';
import { DEFAULT_FOOTPRINT_SETTINGS, footprintSettingsToConfig, resolveEffectiveRowSize } from '../components/footprintSettings';
import { FootprintSettingsDialog } from '../components/FootprintSettingsDialog';
import type { ChartStyleSettings } from '../components/chartStyleSettings';
import { TickDataRequiredState } from '../components/TickDataRequiredState';
import { Nt8ConnectPanel } from '../components/Nt8ConnectPanel';
import { cn } from '@/lib/utils';
import { PaperTradeRail } from '../components/PaperTradeRail';
import { PaperTradeRailShell } from '../components/PaperTradeRailShell';
import { useNt8OrderBook } from '../hooks/useNt8OrderBook';

/** Which futures source is active — 'nt8' is the default for ALL users; 'databento' is an admin-only delayed dev preview (see FuturesFootprintBody's compliance note). */
export type FuturesSourceMode = 'nt8' | 'databento';

interface FootprintTabProps {
  symbol: string;
  interval: ArenaInterval;
  assetClass: AssetClass;
  /** Gates the futures (Databento) mode — see the compliance note above. */
  isAdmin: boolean;
  /** Active indicator overlays — single source of truth lives in TradingArena.tsx. */
  indicators: Indicator[];
  /** Wired to the Arena's symbol setter — powers the stocks/forex empty state's quick-switch chips. */
  onSelectSymbol?: (symbol: string) => void;
}

// Initial visible bar count — wide enough that candles clear the footprint's
// own 'full'-detail candle-width threshold (50px, see footprintTheme.ts)
// with a comfortable margin on a typical Arena viewport, so the chart opens
// legible without the user needing to zoom in first. forceFullDetail (below)
// keeps the footprint at 'full' regardless of zoom, but the underlying cell
// geometry (row-merge factor, font size) still derives from actual on-screen
// px — this initial framing is what keeps that geometry sane by default.
const INITIAL_VISIBLE_BARS = 20;
// View-sync bounded-restore bound (viewSyncRestoreMaxBars — see
// FinotaurChart's prop doc comment) for the crypto footprint body only:
// lets a fresh sync window from the Chart tab win over this tab's own
// legibility-driven focusRange on the INITIAL mount, but only up to ~120
// bars — wider than that and footprint cells would render too narrow to
// read (same rationale as INITIAL_VISIBLE_BARS above, just a looser cap
// since this is a ceiling, not the default framing).
const VIEW_SYNC_RESTORE_MAX_BARS = 120;
const RAIL_WIDTH_STORAGE_KEY = 'arena-footprint-rail-width';
const RAIL_DEFAULT_WIDTH = 320;
const RAIL_MIN_WIDTH = 280;
const RAIL_MAX_WIDTH = 560;

function clampRailWidth(width: number): number {
  return Math.min(RAIL_MAX_WIDTH, Math.max(RAIL_MIN_WIDTH, width));
}

function readInitialRailWidth(): number {
  if (typeof window === 'undefined') return RAIL_DEFAULT_WIDTH;
  try {
    const stored = localStorage.getItem(RAIL_WIDTH_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed)) return clampRailWidth(parsed);
    }
  } catch {
    // Storage can be unavailable in hardened browser modes.
  }
  return RAIL_DEFAULT_WIDTH;
}

function ResizablePaperRail({ children }: { children: ReactNode }) {
  const [railWidth, setRailWidth] = useState(readInitialRailWidth);
  const [isDraggingRail, setIsDraggingRail] = useState(false);
  const railWidthRef = useRef(railWidth);
  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    railWidthRef.current = railWidth;
  }, [railWidth]);

  const handleRailHandleMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingRail(true);
    dragStartRef.current = { startX: event.clientX, startWidth: railWidthRef.current };
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    if (!isDraggingRail) return;

    const handleMouseMove = (event: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      setRailWidth(clampRailWidth(start.startWidth + (start.startX - event.clientX)));
    };

    const handleMouseUp = () => {
      setIsDraggingRail(false);
      dragStartRef.current = null;
      document.body.style.userSelect = '';
      try {
        localStorage.setItem(RAIL_WIDTH_STORAGE_KEY, String(railWidthRef.current));
      } catch {
        // Ignore storage failures; the live resize already succeeded.
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
    <PaperTradeRailShell
      width={railWidth}
      resizeHandle={
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          onMouseDown={handleRailHandleMouseDown}
          className={cn(
            'w-1.5 flex-shrink-0 cursor-col-resize border-l border-r border-transparent bg-[#050505] transition-colors hover:border-[rgba(201,166,70,0.35)] hover:bg-[rgba(201,166,70,0.10)]',
            isDraggingRail && 'border-[rgba(201,166,70,0.55)] bg-[rgba(201,166,70,0.16)]',
          )}
          title="Drag to resize the trading panel"
        />
      }
    >
      {children}
    </PaperTradeRailShell>
  );
}

function nowWindowCrypto(): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 24 * 60 * 60;
  return { from, to };
}

// Rolling 8-hour window for futures — mirrors FuturesChartTab.tsx (futures
// tick volume is far lower than crypto; a tighter window keeps the
// client-side trade cache reasonably sized).
function nowWindowFutures(): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 8 * 60 * 60;
  return { from, to };
}

function statusLabel(status: TradeSourceStatus): string {
  switch (status) {
    case 'connecting':   return 'Loading Databento data…';
    case 'live':         return 'Polling';
    case 'reconnecting': return 'Reconnecting…';
    case 'error':        return 'Feed unavailable';
    default:             return '';
  }
}

// One module-level singleton per file — BinanceSource is stateless (same
// pattern ChartTab.tsx and LiquidityTab.tsx each follow independently).
const binanceSource = new BinanceSource();

// ─── CVD/DELTA order-flow data (C6) ─────────────────────────────────────────
//
// Feeds FinotaurChart's `orderFlowData` prop straight from the SAME
// FlowBinStore instance each body already uses for its footprint/volume-
// profile overlays — source-agnostic (crypto AND futures, unlike
// useKlineDelta which is Binance-klines-only), no extra network call.
// Uses an onChange + steady poll heartbeat subscription pattern, returning
// ONE combined {time,cvd,delta}[] array (FinotaurChart's `orderFlowData`
// shape).
const ORDER_FLOW_WINDOW_SEC = 60 * 60 * 24; // 24h — generous, cheap (getRange scans a sorted array by key).
const ORDER_FLOW_POLL_MS = 1_000; // ~1s recompute cadence.

/**
 * Active only when `enabled` AND `store` is provided — otherwise no
 * subscription is created and the hook returns `undefined` (not an empty
 * array), so FinotaurChart never reserves a CVD/DELTA pane when the data
 * isn't wanted or isn't available. Always called unconditionally (rules of
 * hooks) — callers pass `undefined`/`false` to no-op.
 */
function useFootprintOrderFlowData(
  store: FlowBinStore | undefined,
  enabled: boolean,
): { time: UTCTimestamp; cvd: number; delta: number }[] | undefined {
  const dataRef = useRef<{ time: UTCTimestamp; cvd: number; delta: number }[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || !store) return;

    function recompute() {
      const nowSec = Math.floor(Date.now() / 1000);
      const range = store!.getRange(nowSec - ORDER_FLOW_WINDOW_SEC, nowSec + 3600);
      let running = 0;
      dataRef.current = range.map((c) => {
        running += c.delta;
        return { time: c.time as UTCTimestamp, cvd: running, delta: c.delta };
      });
      setTick((n) => n + 1);
    }

    recompute();
    const unsubscribe = store.onChange(recompute);
    const poll = setInterval(recompute, ORDER_FLOW_POLL_MS);
    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, [store, enabled]);

  // `tick` only keeps the memo dependency honest (data itself lives in the
  // ref, mutated by `recompute` above).
  return useMemo(
    () => (enabled && store ? dataRef.current : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, store, tick],
  );
}

export function FootprintTab({ symbol, interval, assetClass, isAdmin, indicators, onSelectSymbol }: FootprintTabProps) {
  const [futuresRoot, setFuturesRoot] = useState<FuturesRoot>('NQ');
  // Futures now defaults to the NT8 bridge path for ALL users (not
  // admin-gated) — the Databento delayed preview becomes an admin-only
  // toggle rather than the only option. See sourceRegistry.ts's
  // `nt8Connected` opt and Nt8TradeSource.ts.
  const [futuresSourceMode, setFuturesSourceMode] = useState<FuturesSourceMode>('nt8');

  const isCrypto = assetClass === 'crypto';
  const isFutures = assetClass === 'futures';

  // Market-data entitlement (paid Journal OR paid+active platform plan) —
  // same rule MarketDataGate.tsx enforces for /app/trading-arena/connect-data.
  // Only consulted on the futures branch below; admins bypass it entirely.
  const { entitled: paidTier, isLoading: entitlementLoading } = useMarketDataEntitled();

  // Chart-style ("Chart" tab of the new Footprint Settings dialog) — a
  // SEPARATE useChartStylePreferences() instance from ArenaToolbar's own
  // (TradingArena.tsx), reading/writing the same global localStorage key
  // (CHART_STYLE_STORAGE_KEY). Passed explicitly to each body's own
  // <FinotaurChart chartStyle=.../> below so an edit made from THIS dialog
  // is reflected live on THIS tab immediately (explicit prop wins over
  // ChartStyleContext — see FinotaurChart.tsx). Known limitation: because
  // this is a second hook instance, a change made here does not live-push
  // into the Chart tab's own chart (driven by TradingArena's instance)
  // until that tab re-reads localStorage (symbol/interval change or a
  // fresh mount) — the toolbar's own "Chart ▾" quick path is unaffected
  // either way and stays perfectly in sync with the Chart tab as before.
  const { settings: chartStyle, update: updateChartStyle, reset: resetChartStyle } = useChartStylePreferences();

  if (isCrypto) {
    return (
      <CryptoFootprintBody
        symbol={symbol}
        interval={interval}
        indicators={indicators}
        chartStyle={chartStyle}
        onChartStyleChange={updateChartStyle}
        onChartStyleReset={resetChartStyle}
        viewSyncKey={buildViewSyncKey(assetClass, symbol, interval)}
      />
    );
  }

  if (isFutures) {
    if (isAdmin) {
      const sourceToggle = { mode: futuresSourceMode, onChange: setFuturesSourceMode };

      if (futuresSourceMode === 'databento') {
        return (
          <FuturesFootprintBody
            interval={interval}
            root={futuresRoot}
            onRootChange={setFuturesRoot}
            indicators={indicators}
            isAdmin={isAdmin}
            sourceToggle={sourceToggle}
            chartStyle={chartStyle}
            onChartStyleChange={updateChartStyle}
            onChartStyleReset={resetChartStyle}
          />
        );
      }

      return (
        <FuturesNt8FootprintBody
          interval={interval}
          root={futuresRoot}
          onRootChange={setFuturesRoot}
          indicators={indicators}
          sourceToggle={sourceToggle}
          chartStyle={chartStyle}
          onChartStyleChange={updateChartStyle}
          onChartStyleReset={resetChartStyle}
        />
      );
    }

    // Non-admin: paid users (Journal OR platform paid+active) get a
    // Live/Review switcher — Live is the unchanged NT8 flow, Review is the
    // Databento "Session Review" body. Free users fall through unchanged
    // (Nt8ConnectPanel's existing upsell) — see FuturesCustomerFootprintBody.
    return (
      <FuturesCustomerFootprintBody
        interval={interval}
        root={futuresRoot}
        onRootChange={setFuturesRoot}
        indicators={indicators}
        paidTier={paidTier}
        entitlementLoading={entitlementLoading}
        chartStyle={chartStyle}
        onChartStyleChange={updateChartStyle}
        onChartStyleReset={resetChartStyle}
      />
    );
  }

  return (
    <div className="flex flex-1 min-h-0 w-full">
      <div className="flex flex-1 min-w-0">
        <TickDataRequiredState variant="footprint" onSelectSymbol={onSelectSymbol} />
      </div>
      <ResizablePaperRail>
        <PaperTradeRail
          symbol={symbol}
          livePrice={null}
          bid={null}
          ask={null}
          enabled={false}
          disabledTitle="Tick feed unavailable"
          disabledDescription="Choose crypto or futures to enable this trading panel."
        />
      </ResizablePaperRail>
    </div>
  );
}

// ─── Shared futures source toggle (admin-only) ──────────────────────────────

interface FuturesSourceToggleProps {
  mode: FuturesSourceMode;
  onChange: (mode: FuturesSourceMode) => void;
}

function FuturesSourceToggle({ mode, onChange }: FuturesSourceToggleProps) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Select futures data source (admin only)">
      <button
        type="button"
        onClick={() => onChange('nt8')}
        className={cn(
          'h-6 rounded px-2 text-[10px] font-semibold transition-all duration-150 border',
          mode === 'nt8'
            ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]'
            : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
        )}
        title="Live data streamed from your own NinjaTrader via the FINOTAUR desktop agent"
      >
        NinjaTrader (live)
      </button>
      <button
        type="button"
        onClick={() => onChange('databento')}
        className={cn(
          'h-6 rounded px-2 text-[10px] font-semibold transition-all duration-150 border',
          mode === 'databento'
            ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]'
            : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
        )}
        title="Admin-only delayed dev preview — polls historical Databento data every 15s"
      >
        Databento (delayed)
      </button>
    </div>
  );
}

// ─── Customer Live/Review switcher (paid, non-admin futures) ───────────────
//
// Distinct from FuturesSourceToggle above (that one is admin-only NT8 vs
// Databento-dev-preview). This is the paid-customer-facing equivalent:
// Live = the existing NT8 bridge flow (incl. Nt8ConnectPanel when not yet
// connected), Review = the Databento "Session Review" body. Only rendered
// by FuturesCustomerFootprintBody when a bridge device is actually paired
// (see that component) — otherwise there's nothing to switch "Live" to yet.

type LiveReviewMode = 'live' | 'review';

interface LiveReviewToggleProps {
  mode: LiveReviewMode;
  onChange: (mode: LiveReviewMode) => void;
}

function LiveReviewToggle({ mode, onChange }: LiveReviewToggleProps) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Select Live or Session Review">
      <button
        type="button"
        onClick={() => onChange('live')}
        className={cn(
          'h-6 rounded px-2 text-[10px] font-semibold transition-all duration-150 border',
          mode === 'live'
            ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]'
            : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
        )}
        title="Live data streamed from your own NinjaTrader via the FINOTAUR desktop agent"
      >
        Live
      </button>
      <button
        type="button"
        onClick={() => onChange('review')}
        className={cn(
          'h-6 rounded px-2 text-[10px] font-semibold transition-all duration-150 border',
          mode === 'review'
            ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]'
            : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
        )}
        title="Last closed session, delayed historical data"
      >
        Review
      </button>
    </div>
  );
}

// ─── Crypto mode (Binance) ───────────────────────────────────────────────────

interface CryptoFootprintBodyProps {
  symbol: string;
  interval: ArenaInterval;
  indicators: Indicator[];
  /** Chart tab (Footprint Settings dialog) plumbing — see FootprintTab's own useChartStylePreferences() instance. */
  chartStyle: ChartStyleSettings;
  onChartStyleChange: (patch: Partial<ChartStyleSettings>) => void;
  onChartStyleReset: () => void;
  /** ATAS-parity "synced price scale" (arenaViewState.ts) — see FinotaurChart's `viewSyncKey` prop doc comment. */
  viewSyncKey: string;
}

function CryptoFootprintBody({ symbol, interval, indicators, chartStyle, onChartStyleChange, onChartStyleReset, viewSyncKey }: CryptoFootprintBodyProps) {
  // resolveTradeSource('crypto', ...) never returns null (see its doc
  // comment) — the isAdmin opt is only consulted on the 'futures' branch.
  // tickSize here is the synchronous hardcoded-map value (cryptoTickSizes.ts);
  // refined below against Binance's live exchangeInfo.
  const { source: tradeSource, tickSize: staticTickSize } = resolveTradeSource('crypto', symbol, { isAdmin: false })!;

  const [tickSize, setTickSize] = useState<number>(staticTickSize);
  useEffect(() => {
    setTickSize(staticTickSize); // reset to the sync value immediately on symbol change
    let cancelled = false;
    refineCryptoTickSize(symbol).then((refined) => {
      if (!cancelled) setTickSize(refined);
    });
    return () => {
      cancelled = true;
    };
  }, [symbol, staticTickSize]);

  const { settings, update: updateSettings } = useFootprintPreferences(symbol);

  // Footprint Settings dialog — opened via double-click on the chart body
  // (see the outer container's onDoubleClick below), same pattern
  // ChartTab.tsx uses for its own settings dialog.
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const { from, to } = useMemo(nowWindowCrypto, [symbol, interval]);

  // Backfill-coverage snap — mirrors LiquidityTab.tsx's depthSnapFromSec /
  // timeFitToken pattern (PR #1432): the natural INITIAL_VISIBLE_BARS window
  // is often much wider than what the backfill walk actually covers (rate
  // limits / request budget), so the pane would otherwise open on a wide
  // window of mostly-empty footprint candles. Once useOrderFlow reports
  // `backfillCoveredFromSec`, snap the visible window tight around the real
  // coverage span so it opens fully painted. Runs at most once per
  // (symbol, interval) — never fights a user's subsequent pan/zoom.
  const [backfillSnapFromSec, setBackfillSnapFromSec] = useState<number | null>(null);
  const backfillSnapAttemptedRef = useRef(false);

  const focusRange = useMemo(
    () => ({
      from: backfillSnapFromSec ?? to - INITIAL_VISIBLE_BARS * intervalToSeconds(interval),
      to,
    }),
    [to, interval, backfillSnapFromSec],
  );

  // Imperative re-fit token (FinotaurChart's `timeFitToken` prop) — bumped on
  // symbol/interval change (re-arm the snap for the new dataset) and again
  // once the coverage-driven snap fires below.
  const [timeFitToken, setTimeFitToken] = useState(0);
  useEffect(() => {
    setTimeFitToken((t) => t + 1);
    backfillSnapAttemptedRef.current = false;
    setBackfillSnapFromSec(null);
  }, [symbol, interval]);

  // Native-vs-aggregate resolution for the candlestick series (see
  // utils/intervals.ts) — arbitrary custom timeframes the resolved source
  // can't serve directly are wrapped in AggregatingSource.
  const { candleDataSource, candleInterval } = useMemo(() => {
    const plan = resolveIntervalPlan('binance', interval);
    const resolvedSource = plan.kind === 'native'
      ? binanceSource
      : new AggregatingSource(binanceSource, plan.targetSeconds, plan.baseInterval);
    const resolvedInterval = plan.kind === 'native' ? plan.interval : plan.baseInterval;
    return { candleDataSource: resolvedSource, candleInterval: resolvedInterval };
  }, [interval]);

  // Row size: auto-suggested from the loaded window's average PER-BAR
  // high/low range — same approach as ChartTab.tsx (see its header comment
  // for why avgBarRange, not the window-spanning high/low, feeds
  // suggestRowSize). One-shot per (symbol, interval) via hasSuggestedRef —
  // mirrors FuturesFootprintBody's guard below (and FuturesChartTab.tsx)
  // exactly: without it, EVERY bars load (including ones that don't change
  // the effective range) re-suggests and re-bins the store, churning it on
  // every load instead of settling once per dataset. Only feeds the
  // rendered rowSize while settings.rowSizeMode === 'auto' — see
  // resolveEffectiveRowSize's doc comment: a manual price/ticks row size
  // must never be overridden by a fresh auto-suggestion.
  const [suggestedRowSize, setSuggestedRowSize] = useState<number>(tickSize);
  const hasSuggestedRef = useRef(false);
  useEffect(() => {
    setSuggestedRowSize(tickSize);
    hasSuggestedRef.current = false;
  }, [symbol, interval, tickSize]);

  const handleBarsLoad = useCallback(
    (range: { high: number; low: number; avgBarRange: number } | null) => {
      if (!range) return;
      if (hasSuggestedRef.current) return;
      const next = FlowBinStore.suggestRowSize(
        [{ high: range.avgBarRange, low: 0 }],
        tickSize,
      );
      hasSuggestedRef.current = true;
      setSuggestedRowSize((prev) => (next === prev ? prev : next));
    },
    [tickSize],
  );

  const rowSize = resolveEffectiveRowSize(settings, tickSize, suggestedRowSize);
  const intervalSec = intervalToSeconds(interval);

  const { store, backfillCoveredFromSec } = useOrderFlow({
    symbol,
    intervalSec,
    rowSize,
    source: tradeSource,
    backfillBars: 40,
  });

  // CVD/DELTA order-flow indicators (C6) — see useFootprintOrderFlowData's
  // header comment above. Fires only when the user has an active CVD/DELTA
  // indicator instance.
  const wantsOrderFlow = useMemo(
    () => indicators.some((ind) => ind.type === 'CVD' || ind.type === 'DELTA'),
    [indicators],
  );
  const orderFlowData = useFootprintOrderFlowData(store, wantsOrderFlow);

  // Row-size clamp signal — cheapest correct hook point: useOrderFlow's own
  // effect (declared earlier in this component, via the `useOrderFlow` call
  // above) synchronously calls store.setConfig({ rowSize, ... }) whenever
  // `rowSize` changes; effects within one component commit in hook-call
  // order, so this effect always observes the POST-setConfig clamp state.
  const [rowSizeClamped, setRowSizeClamped] = useState(false);
  useEffect(() => {
    setRowSizeClamped(store.wasRowSizeClamped());
  }, [store, rowSize]);

  // Snap the visible window to the backfill's actual coverage once it's
  // known — see the header comment above `backfillSnapFromSec`. Fires at
  // most once per (symbol, interval); re-armed by the effect above.
  useEffect(() => {
    if (backfillSnapAttemptedRef.current) return;
    if (backfillCoveredFromSec === null) return; // backfill hasn't reported yet

    backfillSnapAttemptedRef.current = true;

    const naturalFromSec = to - INITIAL_VISIBLE_BARS * intervalSec;
    if (backfillCoveredFromSec <= naturalFromSec) return; // coverage already spans the natural window — no snap needed

    const marginBars = 3;
    const minBars = 8; // floor — never zoom tighter than ~8 bars
    const flooredFromSec = to - minBars * intervalSec;
    const snappedFromSec = Math.min(flooredFromSec, backfillCoveredFromSec - marginBars * intervalSec);

    setBackfillSnapFromSec(snappedFromSec);
    setTimeFitToken((t) => t + 1);
  }, [backfillCoveredFromSec, to, intervalSec]);

  // Candle dimming: this tab's footprint is always forceFullDetail (cells
  // are permanently visible, see file header) — the thin OHLC skeleton stays
  // on for as long as the footprint pane is mounted, same mechanism
  // FuturesChartTab.tsx uses for its zoom-gated overlay.
  const [footprintStage, setFootprintStage] = useState<FootprintDetailLevel>('hidden');
  const mutedCandles = footprintStage === 'full' || footprintStage === 'shaded';

  const book = useBinanceOrderBook(symbol);
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

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col" onDoubleClick={() => setSettingsDialogOpen(true)}>
      <FootprintSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        settings={settings}
        onChange={updateSettings}
        onReset={() => updateSettings(DEFAULT_FOOTPRINT_SETTINGS)}
        tickSize={tickSize}
        rowSizeClamped={rowSizeClamped}
        chartStyle={chartStyle}
        onChartStyleChange={onChartStyleChange}
        onChartStyleReset={onChartStyleReset}
        assetClass="crypto"
      />

      <div className="flex flex-1 min-h-0 w-full">
        <div className="flex flex-1 min-w-0 flex-col">
          <div className="relative flex-1 min-h-0">
            <FinotaurChart
              hideCursor
              symbol={symbol}
              interval={candleInterval}
              from={from}
              to={to}
              dataSource={candleDataSource}
              indicators={indicators}
              theme="dark"
              height="100%"
              showRefocusButton
              focusRange={focusRange}
              timeFitToken={timeFitToken}
              chartStyle={chartStyle}
              onBarsLoad={handleBarsLoad}
              footprint={{
                store,
                config: {
                  ...footprintSettingsToConfig(settings),
                  forceFullDetail: true,
                },
                visible: true,
                onStageChange: setFootprintStage,
              }}
              volumeProfile={{ store, visible: settings.showVolumeProfile }}
              mutedCandles={mutedCandles}
              viewSyncKey={viewSyncKey}
              viewSyncRestoreMaxBars={VIEW_SYNC_RESTORE_MAX_BARS}
              orderFlowData={orderFlowData}
            />
          </div>
        </div>

        <ResizablePaperRail>
          <PaperTradeRail
            symbol={symbol}
            livePrice={book.lastPrice}
            bid={bid}
            ask={ask}
            enabled
          />
        </ResizablePaperRail>
      </div>
    </div>
  );
}

// ─── Futures mode (Databento, admin-only) ───────────────────────────────────

// Placeholder Interval passed to FinotaurChart for the futures body — the
// actual bucket size comes from DatabentoBarsSource's intervalSecOverride
// (below), so this value is never used for anything besides satisfying
// FinotaurChartProps' `interval: Interval` type.
const DATABENTO_INTERVAL_PLACEHOLDER: Interval = '1m';

interface FuturesFootprintBodyProps {
  interval: ArenaInterval;
  root: FuturesRoot;
  onRootChange: (root: FuturesRoot) => void;
  indicators: Indicator[];
  /** Gates the Databento futures source for the admin dev-preview toggle. See `paidTier` for the paid-customer path. */
  isAdmin: boolean;
  /** True when a non-admin caller has market-data entitlement (useMarketDataEntitled) — unlocks this body as the customer "Session Review" surface. Ignored when isAdmin is true. */
  paidTier?: boolean;
  /**
   * True when this body is being rendered for a paid customer (Session
   * Review), not the admin dev-preview. Swaps the "development preview" pill
   * + admin NT8/Databento toggle for the customer review banner + "Connect
   * live data" link. Defaults to false (unchanged admin rendering).
   */
  customerReview?: boolean;
  /** Admin-only NT8/Databento source toggle, rendered in the header — see FuturesSourceToggle. Ignored when customerReview is true. */
  sourceToggle?: FuturesSourceToggleProps;
  /** Chart tab (Footprint Settings dialog) plumbing — see FootprintTab's own useChartStylePreferences() instance. */
  chartStyle: ChartStyleSettings;
  onChartStyleChange: (patch: Partial<ChartStyleSettings>) => void;
  onChartStyleReset: () => void;
}

// The Databento "Session Review" server route only serves continuous roots
// for these 4 contracts (same set NT8/admin already support) — see
// orderflowRouter.js's /api/orderflow/backfill. FUTURES_ROOTS is currently
// exactly this set too, so this is defensive (currently unreachable given
// `root: FuturesRoot`) rather than live-tested — kept so a future NT8-side
// root addition can't silently imply Review coverage it doesn't have.
const REVIEW_SUPPORTED_ROOTS: readonly FuturesRoot[] = FUTURES_ROOTS;

function FuturesFootprintBody({ interval, root, onRootChange, indicators, isAdmin, paidTier, customerReview, sourceToggle, chartStyle, onChartStyleChange, onChartStyleReset }: FuturesFootprintBodyProps) {
  // Server-side cache warm-up (H5). Originally admin-only; now also fires
  // for the paid-customer Session Review path (same warm-up target root,
  // same fire-and-forget contract) since both paths poll the same backfill
  // endpoint.
  useEffect(() => {
    warmOrderflowCache(root);
  }, [root]);

  const contractSymbol = useMemo(() => frontMonthContract(root), [root]);
  // resolveTradeSource('futures', root, { isAdmin, paidTier }) only returns
  // null when neither isAdmin nor paidTier is true, or `root` isn't a known
  // FuturesRoot — neither can happen here: this body only mounts (a) for
  // admins via FootprintTab's admin dev-preview toggle, or (b) for paid
  // customers via FuturesCustomerFootprintBody, which only renders this body
  // once paidTier is confirmed true. `root` is always a FUTURES_ROOTS member.
  const { source: tradeSource, tickSize } = resolveTradeSource('futures', root, { isAdmin, paidTier })!;

  // Persistence key is the CONTRACT ROOT ('NQ'), not the rotating front-month
  // contract code — settings (and any future per-root rowSize override)
  // survive a quarterly rollover instead of resetting every 3 months.
  const { settings, update: updateSettings } = useFootprintPreferences(root);

  // Footprint Settings dialog — opened via double-click on the chart body
  // (see the outer container's onDoubleClick below), same pattern
  // ChartTab.tsx uses for its own settings dialog.
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const { from, to } = useMemo(nowWindowFutures, [contractSymbol]);
  const focusRange = useMemo(
    () => ({ from: to - INITIAL_VISIBLE_BARS * intervalToSeconds(interval), to }),
    [to, interval],
  );

  // Row size: same auto-suggest + one-shot-per-root guard as FuturesChartTab.tsx
  // (see that file's header comment for why the guard exists — prevents a
  // render loop between bars loading, row-size suggestion, and store re-bin).
  // Only feeds the rendered rowSize while settings.rowSizeMode === 'auto'.
  const [suggestedRowSize, setSuggestedRowSize] = useState<number>(tickSize);
  const hasSuggestedRef = useRef(false);
  useEffect(() => {
    setSuggestedRowSize(tickSize);
    hasSuggestedRef.current = false;
  }, [tickSize]);

  const handleBarsLoad = useCallback(
    (range: { high: number; low: number; avgBarRange: number } | null) => {
      if (!range) return;
      if (hasSuggestedRef.current) return;
      const next = FlowBinStore.suggestRowSize(
        [{ high: range.avgBarRange, low: 0 }],
        tickSize,
      );
      hasSuggestedRef.current = true;
      setSuggestedRowSize((prev) => (next === prev ? prev : next));
    },
    [tickSize],
  );

  const rowSize = resolveEffectiveRowSize(settings, tickSize, suggestedRowSize);
  const intervalSec = intervalToSeconds(interval);

  const { store, status } = useOrderFlow({
    symbol: contractSymbol,
    intervalSec,
    rowSize,
    source: tradeSource,
    backfillBars: 40,
  });

  // CVD/DELTA order-flow indicators (C6) — see useFootprintOrderFlowData's
  // header comment above CryptoFootprintBody's usage.
  const wantsOrderFlow = useMemo(
    () => indicators.some((ind) => ind.type === 'CVD' || ind.type === 'DELTA'),
    [indicators],
  );
  const orderFlowData = useFootprintOrderFlowData(store, wantsOrderFlow);

  // Row-size clamp signal — same hook-ordering rationale as CryptoFootprintBody above.
  const [rowSizeClamped, setRowSizeClamped] = useState(false);
  useEffect(() => {
    setRowSizeClamped(store.wasRowSizeClamped());
  }, [store, rowSize]);

  // Bars source reads raw trades straight off the SAME store the footprint
  // uses — mirrors FuturesChartTab.tsx (see that file's DatabentoBarsSource.ts
  // note: no separate trade cache/subscription). Recreated whenever `store`
  // or `interval` changes — cheap (no side effects in the constructor) and
  // lets the arbitrary custom-interval bucket size (intervalToSeconds(interval))
  // flow straight through without needing the fixed `Interval` union.
  const barsSource = useMemo(
    () => new DatabentoBarsSource(store, intervalToSeconds(interval)),
    [store, interval],
  );

  // Bars refresh token — same throttled onChange→refetch bridge as
  // FuturesChartTab.tsx (copied verbatim; see that file's header comment for
  // why it's needed and the render-loop guards baked into it).
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

  const feedUnavailable = status === 'error';
  const reviewUnsupportedSymbol = customerReview && !REVIEW_SUPPORTED_ROOTS.includes(root);

  // Candle dimming — same forceFullDetail rationale as CryptoFootprintBody above.
  const [footprintStage, setFootprintStage] = useState<FootprintDetailLevel>('hidden');
  const mutedCandles = footprintStage === 'full' || footprintStage === 'shaded';

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col" onDoubleClick={() => setSettingsDialogOpen(true)}>
      {/* Contract selector pills — same FUTURES_ROOTS reuse as FuturesChartTab.tsx */}
      <div
        className="flex items-center gap-3 flex-wrap px-3 py-1.5 border-b"
        style={{ borderColor: 'rgba(201,166,70,0.10)' }}
      >
        <div className="flex items-center gap-1" role="group" aria-label="Select futures contract">
          {FUTURES_ROOTS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRootChange(r)}
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

        <span className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(201,166,70,0.12)' }} aria-hidden="true" />

        <span className="text-[11px] text-[#707070] font-mono">{contractSymbol}</span>

        {customerReview ? (
          <>
            <span
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                color: '#C9A646',
                background: 'rgba(201,166,70,0.12)',
                border: '1px solid rgba(201,166,70,0.28)',
              }}
              title="Delayed historical data from your last closed NinjaTrader session — polls every 15s, not real-time."
            >
              Session Review — last closed session · delayed data
            </span>
            <a
              href="/app/trading-arena/connect-data"
              className="text-[11px] font-semibold text-[#707070] transition-colors duration-150 hover:text-[#C9A646]"
            >
              Connect live data →
            </a>
          </>
        ) : (
          <span
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              color: '#C9A646',
              background: 'rgba(201,166,70,0.12)',
              border: '1px solid rgba(201,166,70,0.28)',
            }}
            title="This admin-only preview polls historical data every 15s — it is not a real-time feed."
          >
            Delayed data — development preview
          </span>
        )}

        {!customerReview && sourceToggle && <FuturesSourceToggle {...sourceToggle} />}

        <span
          className={cn(
            'flex items-center gap-1 text-[10px] font-medium ml-auto',
            status === 'live' && 'text-emerald-400',
            status === 'connecting' && 'text-[#707070]',
            status === 'reconnecting' && 'text-amber-400',
            status === 'error' && 'text-rose-400',
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              status === 'live' && 'bg-emerald-400',
              status === 'connecting' && 'bg-[#707070]',
              status === 'reconnecting' && 'bg-amber-400',
              status === 'error' && 'bg-rose-400',
            )}
          />
          {statusLabel(status)}
        </span>
      </div>

      <FootprintSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        settings={settings}
        onChange={updateSettings}
        onReset={() => updateSettings(DEFAULT_FOOTPRINT_SETTINGS)}
        tickSize={tickSize}
        rowSizeClamped={rowSizeClamped}
        chartStyle={chartStyle}
        onChartStyleChange={onChartStyleChange}
        onChartStyleReset={onChartStyleReset}
        assetClass="futures"
      />

      <div className="flex flex-1 min-h-0 w-full">
        <div className="relative flex-1 min-w-0">
          {reviewUnsupportedSymbol ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm font-semibold text-[#E8E8E8]">Symbol not available for Review</p>
              <p className="text-[12px] text-[#707070] max-w-xs">
                Review is available for NQ, ES, MNQ and MES.
              </p>
            </div>
          ) : feedUnavailable ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm font-semibold text-[#E8E8E8]">Futures feed unavailable</p>
              <p className="text-[12px] text-[#707070] max-w-xs">
                {customerReview
                  ? 'Session Review is temporarily unavailable. Try again shortly.'
                  : 'Data key not configured yet.'}
              </p>
            </div>
          ) : (
            <FinotaurChart
              hideCursor
              symbol={contractSymbol}
              interval={DATABENTO_INTERVAL_PLACEHOLDER}
              chartStyle={chartStyle}
              from={from}
              to={to}
              dataSource={barsSource}
              indicators={indicators}
              theme="dark"
              height="100%"
              showRefocusButton
              focusRange={focusRange}
              refreshToken={barsRefreshToken}
              onBarsLoad={handleBarsLoad}
              footprint={{
                store,
                config: {
                  ...footprintSettingsToConfig(settings),
                  forceFullDetail: true,
                },
                visible: true,
                onStageChange: setFootprintStage,
              }}
              mutedCandles={mutedCandles}
              orderFlowData={orderFlowData}
            />
          )}
        </div>

        <ResizablePaperRail>
          <PaperTradeRail
            symbol={contractSymbol}
            livePrice={null}
            bid={null}
            ask={null}
            enabled={!feedUnavailable && !reviewUnsupportedSymbol}
            disabledTitle="Futures feed unavailable"
            disabledDescription="Order entry will enable when the futures feed is available."
          />
        </ResizablePaperRail>
      </div>
    </div>
  );
}

// ─── Futures mode (NT8 desktop-agent bridge, ALL users) ─────────────────────

interface FuturesNt8FootprintBodyProps {
  interval: ArenaInterval;
  root: FuturesRoot;
  onRootChange: (root: FuturesRoot) => void;
  indicators: Indicator[];
  /** Admin-only NT8/Databento source toggle, rendered in the header — see FuturesSourceToggle. */
  sourceToggle?: FuturesSourceToggleProps;
  /** Chart tab (Footprint Settings dialog) plumbing — see FootprintTab's own useChartStylePreferences() instance. */
  chartStyle: ChartStyleSettings;
  onChartStyleChange: (patch: Partial<ChartStyleSettings>) => void;
  onChartStyleReset: () => void;
}

// How often the live NT8 session is flushed to IndexedDB — see
// flowStorePersistence.ts's header comment for why this recording exists.
const SESSION_RECORD_INTERVAL_MS = 10_000;

/**
 * Gold-muted banner shown in place of Nt8ConnectPanel when the bridge is
 * offline but a recorded session for today+symbol exists (see
 * flowStorePersistence.ts). Lets the user keep reading their own session's
 * footprint after closing NinjaTrader instead of losing the chart outright.
 */
function RecordedSessionBanner({ lastTradeMs, onReconnect, reconnecting }: {
  lastTradeMs: number;
  onReconnect: () => void;
  reconnecting: boolean;
}) {
  const timeLabel = useMemo(
    () => new Date(lastTradeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [lastTradeMs],
  );
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 border-b flex-shrink-0"
      style={{ background: 'rgba(201,166,70,0.08)', borderColor: 'rgba(201,166,70,0.18)' }}
    >
      <span className="text-[11px] font-medium" style={{ color: '#C9A646' }}>
        Agent offline — showing today's recorded session (up to {timeLabel})
      </span>
      <button
        type="button"
        onClick={onReconnect}
        disabled={reconnecting}
        className={cn(
          'ml-auto h-6 rounded px-2.5 text-[10px] font-semibold transition-all duration-150 border',
          'text-[#C9A646] border-[rgba(201,166,70,0.4)] hover:bg-[rgba(201,166,70,0.12)]',
          reconnecting && 'opacity-60',
        )}
        style={{ background: 'rgba(201,166,70,0.10)' }}
      >
        {reconnecting ? 'Reconnecting…' : 'Reconnect'}
      </button>
    </div>
  );
}

/**
 * NT8 bridge (nt8Bridge.ts) equivalent of FuturesFootprintBody, available to
 * ALL users (no isAdmin gate). While the bridge isn't 'live' the chart body
 * is replaced by Nt8ConnectPanel — the trade-source subscription (via
 * useOrderFlow → Nt8TradeSource) stays mounted regardless, so it activates
 * automatically the moment the bridge connects/reconnects (see
 * nt8Bridge.ts's resubscribe-on-welcome design) without remounting hooks.
 *
 * Local Session Recording (flowStorePersistence.ts): while `isLive`, the
 * store's aggregated bins are flushed to IndexedDB roughly every 10s (plus
 * a final flush on tab-hide/unload/bridge-drop). When the bridge is NOT
 * live, today's recording (if any) for this symbol is loaded and hydrated
 * into the SAME store, so the chart shows the recorded session instead of
 * falling straight back to Nt8ConnectPanel — see RecordedSessionBanner.
 */
function FuturesNt8FootprintBody({ interval, root, onRootChange, indicators, sourceToggle, chartStyle, onChartStyleChange, onChartStyleReset }: FuturesNt8FootprintBodyProps) {
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>(() => getNt8BridgeStatus());
  useEffect(() => onNt8BridgeStatus(setBridgeStatus), []);
  const isLive = bridgeStatus === 'live';

  const nt8Symbol = useMemo(() => toNt8Symbol(root), [root]);

  // resolveTradeSource('futures', root, { nt8Connected: true }) never
  // returns null for a known FUTURES_ROOTS member (see its doc comment).
  const { source: tradeSource, tickSize: staticTickSize } = resolveTradeSource('futures', root, {
    isAdmin: false,
    nt8Connected: true,
  })!;

  // Same async-refine pattern as CryptoFootprintBody's refineCryptoTickSize:
  // start from the known static default (FUTURES_CONTRACTS[root].tickSize —
  // already correct for the 4 supported roots), upgrade to the
  // agent-confirmed `sub_ok` tickSize if/when it arrives.
  const [tickSize, setTickSize] = useState<number>(staticTickSize);
  useEffect(() => {
    setTickSize(staticTickSize);
    let cancelled = false;
    refineNt8TickSize(nt8Symbol, staticTickSize).then((refined) => {
      if (!cancelled) setTickSize(refined);
    });
    return () => {
      cancelled = true;
    };
  }, [nt8Symbol, staticTickSize]);

  // Persistence key is the CONTRACT ROOT — same convention as FuturesFootprintBody.
  const { settings, update: updateSettings } = useFootprintPreferences(root);

  // Footprint Settings dialog — opened via double-click on the chart body
  // (see the outer container's onDoubleClick below), same pattern
  // ChartTab.tsx uses for its own settings dialog.
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const { from, to } = useMemo(nowWindowFutures, [nt8Symbol]);
  const focusRange = useMemo(
    () => ({ from: to - INITIAL_VISIBLE_BARS * intervalToSeconds(interval), to }),
    [to, interval],
  );

  const [suggestedRowSize, setSuggestedRowSize] = useState<number>(tickSize);
  const hasSuggestedRef = useRef(false);
  useEffect(() => {
    setSuggestedRowSize(tickSize);
    hasSuggestedRef.current = false;
  }, [tickSize]);

  const handleBarsLoad = useCallback(
    (range: { high: number; low: number; avgBarRange: number } | null) => {
      if (!range) return;
      if (hasSuggestedRef.current) return;
      const next = FlowBinStore.suggestRowSize(
        [{ high: range.avgBarRange, low: 0 }],
        tickSize,
      );
      hasSuggestedRef.current = true;
      setSuggestedRowSize((prev) => (next === prev ? prev : next));
    },
    [tickSize],
  );

  const rowSize = resolveEffectiveRowSize(settings, tickSize, suggestedRowSize);
  const intervalSec = intervalToSeconds(interval);

  const { store } = useOrderFlow({
    symbol: nt8Symbol,
    intervalSec,
    rowSize,
    source: tradeSource,
    backfillBars: 40,
  });

  // CVD/DELTA order-flow indicators (C6) — see useFootprintOrderFlowData's
  // header comment above CryptoFootprintBody's usage.
  const wantsOrderFlow = useMemo(
    () => indicators.some((ind) => ind.type === 'CVD' || ind.type === 'DELTA'),
    [indicators],
  );
  const orderFlowData = useFootprintOrderFlowData(store, wantsOrderFlow);

  const [rowSizeClamped, setRowSizeClamped] = useState(false);
  useEffect(() => {
    setRowSizeClamped(store.wasRowSizeClamped());
  }, [store, rowSize]);

  // ── Local Session Recording (futures NT8 only) ──────────────────────────
  // While the bridge is live, flush the store's aggregated bins to
  // IndexedDB roughly every 10s, plus a final flush whenever this effect
  // tears down (bridge drop, symbol change, or unmount) and whenever the
  // tab is hidden/closed — see flowStorePersistence.ts's header comment.
  useEffect(() => {
    if (!isLive) return;

    const flush = () => {
      const raw = store.getRawTrades();
      if (raw.length === 0) return; // nothing recorded yet this mount
      const lastTradeMs = raw[raw.length - 1].time; // getRawTrades() is ascending by time
      void saveSnapshot(nt8Symbol, store.serialize(), lastTradeMs);
    };

    const intervalId = setInterval(flush, SESSION_RECORD_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', flush);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', flush);
      flush(); // final flush — captures the freshest data on bridge drop too
    };
  }, [isLive, store, nt8Symbol]);

  // While NOT live, check for a recorded session for today+symbol and
  // hydrate the store from it so the chart shows what was captured instead
  // of falling straight back to Nt8ConnectPanel. Re-runs whenever `isLive`
  // flips to false (bridge just dropped — picks up the flush above almost
  // immediately) or the symbol changes.
  const [recordedUpToMs, setRecordedUpToMs] = useState<number | null>(null);
  useEffect(() => {
    if (isLive) {
      setRecordedUpToMs(null);
      return;
    }
    let cancelled = false;
    loadSnapshot(nt8Symbol).then((snapshot) => {
      if (cancelled || !snapshot) return;
      store.hydrate(snapshot.bins);
      setRecordedUpToMs(snapshot.lastTradeMs);
    });
    return () => {
      cancelled = true;
    };
  }, [isLive, nt8Symbol, store]);

  const [reconnecting, setReconnecting] = useState(false);
  const handleReconnect = useCallback(async () => {
    setReconnecting(true);
    try {
      const device = await fetchBridgeConfig();
      if (device) {
        await connectNt8Bridge({ port: device.port, token: device.token });
      }
    } finally {
      setReconnecting(false);
    }
  }, []);

  const showRecordedSession = !isLive && recordedUpToMs !== null;

  // Bars are derived straight from the store's raw trades — same mechanism
  // FuturesFootprintBody uses (DatabentoBarsSource is venue-agnostic despite
  // the name: it only reads off FlowBinStore, never Databento directly —
  // reused as-is rather than duplicated).
  const barsSource = useMemo(
    () => new DatabentoBarsSource(store, intervalToSeconds(interval)),
    [store, interval],
  );

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

  // Candle dimming — same forceFullDetail rationale as CryptoFootprintBody above.
  const [footprintStage, setFootprintStage] = useState<FootprintDetailLevel>('hidden');
  const mutedCandles = footprintStage === 'full' || footprintStage === 'shaded';

  const book = useNt8OrderBook(nt8Symbol);
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

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col" onDoubleClick={() => setSettingsDialogOpen(true)}>
      <div
        className="flex items-center gap-3 flex-wrap px-3 py-1.5 border-b"
        style={{ borderColor: 'rgba(201,166,70,0.10)' }}
      >
        <div className="flex items-center gap-1" role="group" aria-label="Select futures contract">
          {FUTURES_ROOTS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRootChange(r)}
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

        <span className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(201,166,70,0.12)' }} aria-hidden="true" />

        <span className="text-[11px] text-[#707070] font-mono">{nt8Symbol}</span>

        {sourceToggle && <FuturesSourceToggle {...sourceToggle} />}

        <span
          className={cn(
            'flex items-center gap-1 text-[10px] font-medium ml-auto',
            isLive ? 'text-emerald-400' : showRecordedSession ? 'text-[#C9A646]' : 'text-[#707070]',
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              isLive ? 'bg-emerald-400' : showRecordedSession ? 'bg-[#C9A646]' : 'bg-[#707070]',
            )}
          />
          {isLive ? 'NinjaTrader — live' : showRecordedSession ? 'Recorded session' : 'Not connected'}
        </span>
      </div>

      {showRecordedSession && recordedUpToMs !== null && (
        <RecordedSessionBanner lastTradeMs={recordedUpToMs} onReconnect={handleReconnect} reconnecting={reconnecting} />
      )}

      <FootprintSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        settings={settings}
        onChange={updateSettings}
        onReset={() => updateSettings(DEFAULT_FOOTPRINT_SETTINGS)}
        tickSize={tickSize}
        rowSizeClamped={rowSizeClamped}
        chartStyle={chartStyle}
        onChartStyleChange={onChartStyleChange}
        onChartStyleReset={onChartStyleReset}
        assetClass="futures"
      />

      <div className="flex flex-1 min-h-0 w-full">
        <div className="relative flex-1 min-w-0">
          {isLive || showRecordedSession ? (
            <FinotaurChart
              hideCursor
              symbol={nt8Symbol}
              interval={DATABENTO_INTERVAL_PLACEHOLDER}
              from={from}
              to={to}
              dataSource={barsSource}
              chartStyle={chartStyle}
              indicators={indicators}
              theme="dark"
              height="100%"
              showRefocusButton
              focusRange={focusRange}
              refreshToken={barsRefreshToken}
              onBarsLoad={handleBarsLoad}
              footprint={{
                store,
                config: {
                  ...footprintSettingsToConfig(settings),
                  forceFullDetail: true,
                },
                visible: true,
                onStageChange: setFootprintStage,
              }}
              mutedCandles={mutedCandles}
              orderFlowData={orderFlowData}
            />
          ) : (
            <Nt8ConnectPanel variant="footprint" />
          )}
        </div>

        <ResizablePaperRail>
          <PaperTradeRail
            symbol={nt8Symbol}
            livePrice={book.lastPrice}
            bid={bid}
            ask={ask}
            enabled={isLive}
            disabledTitle="NinjaTrader not connected"
            disabledDescription={
              showRecordedSession
                ? 'Reconnect NinjaTrader to enable futures paper trading.'
                : 'Connect the desktop bridge to enable futures paper trading.'
            }
          />
        </ResizablePaperRail>
      </div>
    </div>
  );
}

// ─── Futures mode (non-admin router: Live NT8 vs Session Review) ───────────

interface FuturesCustomerFootprintBodyProps {
  interval: ArenaInterval;
  root: FuturesRoot;
  onRootChange: (root: FuturesRoot) => void;
  indicators: Indicator[];
  /** From useMarketDataEntitled() — paid Journal OR paid+active platform plan. */
  paidTier: boolean;
  /** True while useMarketDataEntitled()'s underlying useSubscription() query is still resolving. */
  entitlementLoading: boolean;
  /** Chart tab (Footprint Settings dialog) plumbing — see FootprintTab's own useChartStylePreferences() instance. */
  chartStyle: ChartStyleSettings;
  onChartStyleChange: (patch: Partial<ChartStyleSettings>) => void;
  onChartStyleReset: () => void;
}

/**
 * Non-admin futures router. Free users get the unchanged NT8-only
 * experience (FuturesNt8FootprintBody, incl. its Nt8ConnectPanel upsell).
 * Paid users (Journal or platform, per useMarketDataEntitled) get a
 * Live/Review switcher:
 *   - Live  → exactly FuturesNt8FootprintBody, unmodified — the bridge
 *     chart when connected, Nt8ConnectPanel when not.
 *   - Review → FuturesFootprintBody in `customerReview` mode — the same
 *     Databento body the admin dev-preview uses, with a customer-facing
 *     "Session Review" banner instead of the admin pill/toggle.
 * The switcher itself is only shown once a bridge device is actually
 * paired (fetchBridgeConfig() resolves non-null) — otherwise there's
 * nothing live to switch to yet, so Review is shown directly (its banner's
 * "Connect live data →" link is the path to pairing).
 */
function FuturesCustomerFootprintBody({
  interval,
  root,
  onRootChange,
  indicators,
  paidTier,
  entitlementLoading,
  chartStyle,
  onChartStyleChange,
  onChartStyleReset,
}: FuturesCustomerFootprintBodyProps) {
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>(() => getNt8BridgeStatus());
  useEffect(() => onNt8BridgeStatus(setBridgeStatus), []);

  // undefined = still resolving; null = no paired NT8 device found.
  const [device, setDevice] = useState<Nt8BridgeDeviceConfig | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    fetchBridgeConfig().then((cfg) => {
      if (!cancelled) setDevice(cfg);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Default: Live when the bridge is already live at mount, Review
  // otherwise — computed once from the synchronous bridge-status snapshot
  // (a 'live' status can only happen for an already-paired, already-running
  // agent, so this doesn't need to wait on the async device fetch above).
  const [mode, setMode] = useState<LiveReviewMode>(() => (getNt8BridgeStatus() === 'live' ? 'live' : 'review'));

  // Review availability probe (getReviewAvailability — DatabentoTradeSource.ts):
  // the server's paid-tier Review gate can ship DISABLED behind an env flag
  // (Databento licensing pending), in which case /api/orderflow/backfill
  // returns 403 subscription_required even for an entitled paid user. Only
  // fires for paid users; null = still probing (or not paid), treated the
  // same as "not available yet" below so Review never flashes before it's
  // confirmed live. One probe per page load — see getReviewAvailability's
  // module-level cache.
  const [reviewAvailable, setReviewAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    if (!paidTier) return;
    let cancelled = false;
    getReviewAvailability(root).then((result) => {
      if (!cancelled) setReviewAvailable(result === 'available');
    });
    return () => {
      cancelled = true;
    };
  }, [paidTier, root]);

  const bridgeAvailable = device != null;

  if (entitlementLoading) {
    return (
      <div className="flex flex-1 min-h-0 w-full items-center justify-center">
        <p className="text-[12px] text-[#707070]">Loading…</p>
      </div>
    );
  }

  if (!paidTier) {
    // Free users — unchanged behavior (Nt8ConnectPanel's existing upsell).
    return (
      <FuturesNt8FootprintBody
        interval={interval}
        root={root}
        onRootChange={onRootChange}
        indicators={indicators}
        chartStyle={chartStyle}
        onChartStyleChange={onChartStyleChange}
        onChartStyleReset={onChartStyleReset}
      />
    );
  }

  if (reviewAvailable !== true) {
    // Review gate not confirmed available yet (still probing) OR confirmed
    // disabled server-side (403 subscription_required — Databento licensing
    // pending). Either way: paid users must get EXACTLY the pre-Review
    // experience — no toggle, no Review body, no banner. This already
    // includes the new local-recording behavior (RecordedSessionBanner)
    // since it lives inside FuturesNt8FootprintBody.
    return (
      <FuturesNt8FootprintBody
        interval={interval}
        root={root}
        onRootChange={onRootChange}
        indicators={indicators}
        chartStyle={chartStyle}
        onChartStyleChange={onChartStyleChange}
        onChartStyleReset={onChartStyleReset}
      />
    );
  }

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      {bridgeAvailable && (
        <div
          className="flex items-center gap-2 px-3 py-1 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(201,166,70,0.10)' }}
        >
          <LiveReviewToggle mode={mode} onChange={setMode} />
          <span className="text-[10px] text-[#5A5A5A]">
            {mode === 'live'
              ? bridgeStatus === 'live'
                ? 'Streaming live from your NinjaTrader agent'
                : 'Live selected — connect your agent below'
              : 'Showing the last closed session (delayed)'}
          </span>
        </div>
      )}

      <div className="flex flex-1 min-h-0 w-full">
        {mode === 'live' ? (
          <FuturesNt8FootprintBody
            interval={interval}
            root={root}
            onRootChange={onRootChange}
            indicators={indicators}
            chartStyle={chartStyle}
            onChartStyleChange={onChartStyleChange}
            onChartStyleReset={onChartStyleReset}
          />
        ) : (
          <FuturesFootprintBody
            interval={interval}
            root={root}
            onRootChange={onRootChange}
            indicators={indicators}
            isAdmin={false}
            paidTier={paidTier}
            customerReview
            chartStyle={chartStyle}
            onChartStyleChange={onChartStyleChange}
            onChartStyleReset={onChartStyleReset}
          />
        )}
      </div>
    </div>
  );
}
