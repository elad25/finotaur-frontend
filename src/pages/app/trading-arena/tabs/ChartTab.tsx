/**
 * Trading Arena — Chart tab (plain candlestick chart)
 *
 * Layout: two-pane flex row.
 *   Left  — FinotaurChart, routed through the shared data-source router
 *            (`pickDataSource` in src/components/charting/dataSources) —
 *            crypto → BinanceSource, our 14 cached futures roots →
 *            DatabentoCacheSource wrapped in DatabentoYahooFallbackSource
 *            (the cache never covers the last ~24-30h under the CME
 *            license, and this tab always requests a rolling now-24h→now
 *            window — the wrapper falls back to Yahoo for that gap, same
 *            as TradeChart.tsx), everything else (stocks/forex/uncached
 *            futures) → YahooFinanceSource. Indicators come from the
 *            `indicators` prop — a single source of truth held in
 *            TradingArena.tsx (ArenaToolbar's Indicators ▾ picker), shared
 *            across tabs so switching tabs keeps the same selection.
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
 * This tab is intentionally a PLAIN chart — no order flow / footprint
 * overlay, no CVD/Delta sub-panes, no depth-matrix heatmap, EXCEPT for one
 * S1 "Arena WOW week" addition (Volume Profile, default ON, safe no-op
 * unless the user turns it on via the Indicators popup):
 *
 *  Session Volume Profile (ATAS-style, multi-session, OHLCV-bar-derived —
 *  see sessionVolumeProfile.ts). Its detail params (period/custom
 *  session/vPOC/VAH-VAL/width/opacity) still read `chartStyle.volumeProfile`
 *  from ChartStyleContext, but VISIBILITY is now the `volumeProfileEnabled`
 *  prop (single source of truth: TradingArena's
 *  `indicatorsEnabled.volumeProfile`, edited from the Indicators popup —
 *  see indicatorsSettings.ts). Works for every asset class — it only
 *  needs the OHLCV bars the chart already fetches, no new data feed.
 *
 * Order flow / footprint rendering lives EXCLUSIVELY on the Order Flow tab
 * (FootprintTab.tsx). A "footprint-on-zoom" bridge used to exist on this
 * tab but was removed (2026-07-18) so the plain Chart tab never renders
 * footprint cells, matching the PR #1435-era product decision that ALL
 * order flow is stripped from ChartTab. `chartStyle.footprintOnZoom` is
 * kept in the settings type/sanitizer only so old persisted localStorage
 * blobs still parse — the field has no effect anywhere in this tab.
 */

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import {
  pickDataSource,
  isCryptoSymbol,
  isDatabentoCachedSymbol,
  toBinanceSymbol,
  toDatabentoCacheSymbol,
  toYahooSymbol,
  DatabentoYahooFallbackSource,
} from '@/components/charting/dataSources';
import { AggregatingSource } from '@/components/charting/dataSources/AggregatingSource';
import type { ChartDataSource, ChartOrderLine, Indicator } from '@/components/charting/types';
import { useBinanceOrderBook } from '@/pages/app/crypto/scanner/useBinanceOrderBook';
import { useBacktestSession } from '@/hooks/useBacktestSession';
import { resolveFuturesSpec } from '@/components/charting/orderflow/futuresContracts';
import { PaperTradeRail, formatQty } from '../components/PaperTradeRail';
import { ActiveIndicatorsLegend } from '../components/ActiveIndicatorsLegend';
import {
  resolveIntervalPlan,
  intervalToSeconds,
  type ArenaInterval,
  type CandleSourceKind,
} from '../utils/intervals';
import { ChartStyleContext, DEFAULT_CHART_STYLE } from '../components/chartStyleSettings';
import type { SessionVolumeProfileRenderSettings } from '@/components/charting/orderflow/SessionVolumeProfileLayer';
import type { ArenaIndicatorEnabled, ArenaIndicatorKey, ArenaIndicatorParams } from '../components/indicatorsSettings';

interface ChartTabProps {
  symbol: string;
  interval: ArenaInterval;
  /** Detected asset class for the current symbol. Controls chart source and rail enabled state. */
  assetClass: string;
  /** Active indicator overlays — single source of truth lives in TradingArena.tsx. */
  indicators: Indicator[];
  indicatorsEnabled: ArenaIndicatorEnabled;
  indicatorsHidden: Partial<Record<ArenaIndicatorKey, boolean>>;
  indicatorsParams: ArenaIndicatorParams;
  onIndicatorHiddenToggle: (key: ArenaIndicatorKey) => void;
  onIndicatorSettingsOpen: (key: ArenaIndicatorKey) => void;
  onIndicatorRemove: (key: ArenaIndicatorKey) => void;
  /**
   * Session Volume Profile is now modeled as an "indicator" toggle (see
   * indicatorsSettings.ts's ArenaIndicatorEnabled.volumeProfile), edited
   * from the Indicators popup rather than Chart ▾ → Chart Settings. This
   * replaces the old `chartStyle.volumeProfile.enabled` gate — that field
   * still exists on ChartStyleSettings but is no longer read for visibility.
   */
  volumeProfileEnabled: boolean;
  onOpenSettings?: () => void;
}

// Rolling 24-hour window for the chart (from = now − 24h, to = now).
// Used for every NON-crypto asset class (unchanged — futures/stocks/forex
// keep this exact fixed window; see cryptoInitialWindow below for crypto).
function nowWindow(): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 24 * 60 * 60;
  return { from, to };
}

// Crypto-only initial window: a fixed 24h clock window showed almost no
// history on higher timeframes (e.g. ~96 bars on 15m, far fewer on 1h/4h)
// and left the chart empty when panning left. For crypto, size the initial
// request to roughly TARGET_INITIAL_BARS bars of the active interval instead
// — paired with FinotaurChart's left-pan backfill (enableBackfill prop
// below), which fetches further history as the user pans further left.
// Span is capped so extreme combos (e.g. a custom multi-day interval) don't
// request centuries of history in one shot.
const TARGET_INITIAL_BARS = 500;
const MAX_INITIAL_SPAN_SECONDS = 400 * 24 * 60 * 60; // 400 days safety cap

function cryptoInitialWindow(intervalSeconds: number): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const span = Math.min(intervalSeconds * TARGET_INITIAL_BARS, MAX_INITIAL_SPAN_SECONDS);
  const from = to - span;
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

// ── "Delayed data" badge (non-crypto only) ──────────────────────────────
// Clickable badge that opens a small anchored info popover explaining the
// delayed-data model and how to get real-time data (NT8 desktop bridge,
// DOM/Footprint tabs → Connect). Outside-click/Escape idiom mirrors
// LiquiditySettingsMenu.tsx / ToolbarTrigger.tsx elsewhere in the Arena — no
// new deps, no portal.
function DelayedDataBadge() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="absolute left-2 top-2 z-30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors"
        style={{
          color: '#C9A646',
          background: 'rgba(201,166,70,0.12)',
          border: '1px solid rgba(201,166,70,0.28)',
        }}
      >
        Delayed data
        <Info className="h-2.5 w-2.5" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-[calc(100%+6px)] w-[320px] rounded-lg p-3 text-[11px] leading-relaxed text-[#C0C0C0] shadow-lg"
          style={{ background: '#0D0D0F', border: '1px solid rgba(201,166,70,0.25)' }}
        >
          <p className="mb-1.5 text-[12px] font-semibold text-[#E8E8E8]">Delayed market data</p>
          <p className="mb-2">
            FINOTAUR futures charts use delayed exchange data (intraday via a delayed continuous
            feed; full history up to the prior session).
          </p>
          <p className="mb-1.5 font-semibold text-[#E8E8E8]">Want real-time?</p>
          <p className="mb-2">
            Real-time futures data requires your own market-data subscription — exchanges bill this
            per user, so it can&apos;t be included in the platform.
          </p>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              Connect your NinjaTrader desktop feed —{' '}
              <Link
                to="/app/trading-arena/connect-data"
                className="font-semibold text-[#C9A646] underline decoration-[rgba(201,166,70,0.4)] underline-offset-2 transition-colors hover:text-[#F4D87C] hover:decoration-[#F4D87C]"
              >
                set it up on the Market Data page
              </Link>{' '}
              — your data stays on your machine.
            </li>
            <li>Make sure a live market-data subscription is active in your broker account.</li>
          </ul>
          <p className="mt-2 text-[#707070]">
            FINOTAUR Live Data — real-time without NinjaTrader — coming soon.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Chart right-click Buy/Sell/Settings menu ────────────────────────────
// Replaces the browser context menu over the chart pane (see FinotaurChart's
// onChartContextMenu prop). Order actions route into the SAME lifted
// 'arena-paper' session the PaperTradeRail uses, at the rail's current qty.
type ContextOrderType = 'MARKET' | 'LIMIT' | 'STOP';

function formatMenuPrice(p: number): string {
  if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return p.toPrecision(4);
}

/** Rounds a raw coordinateToPrice float to an order-friendly precision. */
function roundOrderPrice(p: number): number {
  if (p >= 1) return Math.round(p * 100) / 100;
  return Number(p.toPrecision(4));
}

const MENU_WIDTH = 200;

function ChartContextMenu({
  x,
  y,
  price,
  qty,
  tradingEnabled,
  livePrice,
  onOrder,
  onOpenSettings,
  onClose,
}: {
  x: number;
  y: number;
  price: number | null;
  qty: number;
  tradingEnabled: boolean;
  livePrice: number | null;
  onOrder: (side: 'LONG' | 'SHORT', type: ContextOrderType) => void;
  onOpenSettings?: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const priceLabel = price != null ? formatMenuPrice(price) : null;
  const marketEnabled = tradingEnabled && livePrice != null;
  const atPriceEnabled = tradingEnabled && price != null;

  const itemClass = (enabled: boolean, tone: 'buy' | 'sell' | 'neutral') =>
    cn(
      'flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-[12px] font-semibold transition-colors',
      enabled
        ? tone === 'buy'
          ? 'text-[#22c55e] hover:bg-[rgba(34,197,94,0.10)]'
          : tone === 'sell'
            ? 'text-[#ef4444] hover:bg-[rgba(239,68,68,0.10)]'
            : 'text-[#E8E8E8] hover:bg-[rgba(255,255,255,0.06)]'
        : 'cursor-not-allowed text-[#4a4a4a]',
    );

  // Clamp inside the viewport so the menu never opens half off-screen.
  const left = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 9999) - MENU_WIDTH - 8);
  const top = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 9999) - 330);

  return (
    <>
      {/* Backdrop — swallows the next click/right-click and closes. */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        aria-hidden="true"
      />
      <div
        role="menu"
        aria-label="Chart actions"
        className="fixed z-[10000] flex flex-col rounded-lg border py-1 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
        style={{ left, top, width: MENU_WIDTH, background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
      >
        {(['MARKET', 'LIMIT', 'STOP'] as const).map((type) => {
          const enabled = type === 'MARKET' ? marketEnabled : atPriceEnabled;
          return (
            <button
              key={`buy-${type}`}
              type="button"
              role="menuitem"
              disabled={!enabled}
              onClick={() => enabled && onOrder('LONG', type)}
              className={itemClass(enabled, 'buy')}
            >
              <span>
                {type === 'MARKET' ? `Buy Market · ${qty}` : type === 'LIMIT' ? 'Buy Limit' : 'Buy Stop'}
              </span>
              {type !== 'MARKET' && priceLabel && (
                <span className="tabular-nums text-[11px] font-medium text-[#909090]">{priceLabel}</span>
              )}
            </button>
          );
        })}

        <div className="my-1 h-px" style={{ background: 'rgba(201,166,70,0.12)' }} aria-hidden="true" />

        {(['MARKET', 'LIMIT', 'STOP'] as const).map((type) => {
          const enabled = type === 'MARKET' ? marketEnabled : atPriceEnabled;
          return (
            <button
              key={`sell-${type}`}
              type="button"
              role="menuitem"
              disabled={!enabled}
              onClick={() => enabled && onOrder('SHORT', type)}
              className={itemClass(enabled, 'sell')}
            >
              <span>
                {type === 'MARKET' ? `Sell Market · ${qty}` : type === 'LIMIT' ? 'Sell Limit' : 'Sell Stop'}
              </span>
              {type !== 'MARKET' && priceLabel && (
                <span className="tabular-nums text-[11px] font-medium text-[#909090]">{priceLabel}</span>
              )}
            </button>
          );
        })}

        {onOpenSettings && (
          <>
            <div className="my-1 h-px" style={{ background: 'rgba(201,166,70,0.12)' }} aria-hidden="true" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className={itemClass(true, 'neutral')}
            >
              Settings…
            </button>
          </>
        )}
      </div>
    </>
  );
}

export function ChartTab({
  symbol,
  interval,
  assetClass,
  indicators,
  indicatorsEnabled,
  indicatorsHidden,
  indicatorsParams,
  onIndicatorHiddenToggle,
  onIndicatorSettingsOpen,
  onIndicatorRemove,
  volumeProfileEnabled,
  onOpenSettings,
}: ChartTabProps) {
  const isCrypto = assetClass === 'crypto';
  // Futures paper trading on delayed data (Task 4) — see the futures spec
  // lookup + `futuresLastClose`/`handleLastBarClose` below for how the rail
  // gets a "current price" proxy without a live tick feed.
  const isFutures = assetClass === 'futures';
  const futuresSpec = useMemo(
    () => (isFutures ? resolveFuturesSpec(symbol) : undefined),
    [isFutures, symbol],
  );

  // `symbol` is kept as a dependency (unused inside the callback itself)
  // deliberately — it re-anchors the window to a fresh "now" on symbol
  // switch, matching this memo's pre-existing intent before this window
  // became interval-aware.
  const { from, to } = useMemo(
    () => (isCrypto ? cryptoInitialWindow(intervalToSeconds(interval)) : nowWindow()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [symbol, interval, isCrypto],
  );

  // Chart ▾ Chart Settings (see chartStyleSettings.ts) — read directly via
  // context (ChartTab sits inside TradingArena.tsx's ChartStyleContext.Provider)
  // rather than threading a prop through TradingArena/ArenaToolbar, mirroring
  // how FinotaurChart itself falls back to this same context. Falls back to
  // DEFAULT_CHART_STYLE outside the provider tree (shouldn't happen in
  // practice — ChartTab only ever renders inside it — but keeps this
  // component safe to unit-test/render in isolation).
  const chartStyle = useContext(ChartStyleContext) ?? DEFAULT_CHART_STYLE;
  // Light Mode extends from the chart canvas to the right-rail's chrome —
  // see chartStyleSettings.ts.
  const light = chartStyle.theme === 'light';

  // Lifted paper-trading session — shared by the PaperTradeRail AND the
  // chart's right-click Buy/Sell menu so both act on the same 'arena-paper'
  // session (mirror of DomTab's lift; balance mirrors the rail's internal
  // PAPER_BALANCE). The rail's own internal hook instance goes unused when
  // this is passed — see PaperTradeRail.tsx's header comment.
  const paperSession = useBacktestSession(100_000, 'arena-paper');
  // Order qty shared between the rail's stepper and the context menu.
  // Crypto uses fractional sizing (default 0.01 BTC-scale units), futures
  // uses whole contracts (default 1) — reset only on the crypto↔futures/
  // stock BOUNDARY crossing (isCrypto flips), so switching between two
  // crypto symbols (or two futures symbols) preserves the user's chosen qty,
  // matching pre-existing behavior for same-mode symbol switches.
  const [orderQty, setOrderQty] = useState(1);
  useEffect(() => {
    setOrderQty(isCrypto ? 0.01 : 1);
  }, [isCrypto]);
  const qtyMode: 'integer' | 'decimal' = isCrypto ? 'decimal' : 'integer';

  // Futures "current price" proxy — FinotaurChart's onLastBarClose fires once
  // per REST bar-fetch resolution (delayed data has no live tick feed; see
  // that prop's doc comment). Reset to null on symbol change so a stale
  // price from the PREVIOUS futures symbol never leaks into the fresh one
  // during the brief window before the new fetch resolves.
  const [futuresLastClose, setFuturesLastClose] = useState<number | null>(null);
  useEffect(() => {
    setFuturesLastClose(null);
  }, [symbol]);
  const handleLastBarClose = useCallback((close: number | null) => {
    setFuturesLastClose(close);
  }, []);
  // Right-click chart menu (viewport coords + series price at the click).
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; price: number | null } | null>(null);

  // Session Volume Profile render settings — pure derivation, memoized so
  // FinotaurChart/SessionVolumeProfileLayer's recompute-gating (keyed on
  // settings field identity, not object identity) doesn't see a new object
  // every render for no reason.
  const sessionVolumeProfileSettings: SessionVolumeProfileRenderSettings = useMemo(() => ({
    period: chartStyle.volumeProfile.period,
    timezone: chartStyle.timezone,
    customSessionStart: chartStyle.volumeProfile.customSessionStart,
    customSessionEnd: chartStyle.volumeProfile.customSessionEnd,
    showVpoc: chartStyle.volumeProfile.showVpoc,
    showVahVal: chartStyle.volumeProfile.showVahVal,
    anchorSide: chartStyle.volumeProfile.anchorSide,
    profileWidthPct: chartStyle.volumeProfile.profileWidthPct,
    opacity: chartStyle.volumeProfile.opacity,
  }), [chartStyle.volumeProfile, chartStyle.timezone]);

  // ── Data-source routing (Task A) — resolves via the shared router
  // (pickDataSource) rather than reimplementing crypto/futures-cache/Yahoo
  // branching here. `symbol` arrives already source-native for its asset
  // class (TradingArena.tsx normalizes crypto to Binance pairs; futures/
  // forex/stocks come pre-resolved from SymbolAutocomplete's SYMBOL_UNIVERSE,
  // e.g. "MNQ=F", "EURUSD=X") — the per-branch mapper calls below are
  // idempotent passthroughs in that case and only do real work for symbols
  // that arrive in a raw/contract-code form.
  const { chartDataSource, chartSymbol, chartInterval } = useMemo(() => {
    let resolvedSymbol: string;
    let kind: CandleSourceKind;
    let source: ChartDataSource;
    if (isCryptoSymbol(symbol)) {
      resolvedSymbol = toBinanceSymbol(symbol) ?? symbol;
      kind = 'binance';
      source = pickDataSource(symbol);
    } else if (isDatabentoCachedSymbol(symbol)) {
      resolvedSymbol = toDatabentoCacheSymbol(symbol) ?? symbol;
      kind = 'databento';
      // Databento's CME license only ever serves bars whose end is >=24h old
      // (daily ingest can lag further), so this tab's rolling "now-24h → now"
      // window NEVER has cache coverage for the newest bars — the RPC would
      // return [] and the chart would show "No bars in window". Wrap in the
      // same Yahoo fallback TradeChart.tsx uses so recent bars still render
      // via Yahoo's near-real-time continuous-front feed; historical/covered
      // ranges keep using the Databento cache transparently.
      const yahooFallback = toYahooSymbol(symbol, assetClass);
      source = yahooFallback
        ? new DatabentoYahooFallbackSource(yahooFallback, Math.floor(Date.now() / 1000))
        : pickDataSource(symbol);
    } else {
      resolvedSymbol = toYahooSymbol(symbol, assetClass) ?? symbol;
      kind = 'yahoo';
      source = pickDataSource(symbol);
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

  // Rail "current price": crypto uses the live Binance tick; futures (no
  // live feed on delayed data) fall back to the freshest loaded bar's close
  // (see handleLastBarClose above). Stocks/forex stay null — the rail is
  // disabled for them (`enabled` below), same as before this change.
  const railLivePrice = isCrypto ? livePrice : (isFutures ? futuresLastClose : null);

  // Paper-trading order/position lines drawn on the chart (Task 2) — active
  // position (solid, entry price, live PnL in the title) + pending orders
  // (dashed, trigger price) + SL/TP legs (dashed). Rebuilds whenever the
  // session state or the rail's live price changes so the position title's
  // PnL stays current; FinotaurChart's orderLines diff updates existing ids
  // in place (see that effect's doc comment) so this never flickers.
  const orderLines = useMemo<ChartOrderLine[]>(() => {
    const lines: ChartOrderLine[] = [];
    const pos = paperSession.state.activePosition;
    if (pos) {
      const dir = pos.side === 'LONG' ? 1 : -1;
      const unrealized = railLivePrice != null
        ? (railLivePrice - pos.entryPrice) * dir * pos.size * (pos.pointValue ?? 1)
        : null;
      const sideColor = pos.side === 'LONG' ? '#3ddc9a' : '#ff6b93';
      const pnlLabel = unrealized != null ? ` ${unrealized >= 0 ? '+' : ''}${unrealized.toFixed(2)}` : '';
      lines.push({
        id: `pos-${pos.id}`,
        price: pos.entryPrice,
        color: sideColor,
        lineStyle: 'solid',
        title: `${pos.side} ${formatQty(pos.size)}${pnlLabel}`,
      });
      if (pos.stopLoss != null) {
        lines.push({ id: `pos-${pos.id}-sl`, price: pos.stopLoss, color: '#ff6b93', lineStyle: 'dashed', title: 'SL' });
      }
      if (pos.takeProfits && pos.takeProfits.length > 0) {
        for (const leg of pos.takeProfits) {
          if (leg.filled) continue;
          lines.push({ id: `pos-${pos.id}-tp-${leg.id}`, price: leg.price, color: '#3ddc9a', lineStyle: 'dashed', title: 'TP' });
        }
      } else if (pos.takeProfit != null) {
        lines.push({ id: `pos-${pos.id}-tp`, price: pos.takeProfit, color: '#3ddc9a', lineStyle: 'dashed', title: 'TP' });
      }
    }
    for (const order of paperSession.state.pendingOrders) {
      const sideColor = order.side === 'LONG' ? '#3ddc9a' : '#ff6b93';
      lines.push({
        id: `ord-${order.id}`,
        price: order.triggerPrice,
        color: sideColor,
        lineStyle: 'dashed',
        title: `${order.type} ${formatQty(order.size)}`,
      });
    }
    return lines;
  }, [paperSession.state.activePosition, paperSession.state.pendingOrders, railLivePrice]);

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

  // Context-menu order routing — MARKET fills at the live tick (same as the
  // rail's Buy/Sell Mkt buttons); LIMIT/STOP become pending orders at the
  // right-clicked price, filled by the rail's live-tick engine.
  const handleContextOrder = (side: 'LONG' | 'SHORT', type: ContextOrderType) => {
    const nowSec = Math.floor(Date.now() / 1000);
    if (type === 'MARKET') {
      if (livePrice != null) {
        paperSession.openPosition({ side, price: livePrice, time: nowSec, size: orderQty, entryOrderType: 'MARKET' });
      }
    } else if (ctxMenu?.price != null) {
      paperSession.addPendingOrder({ side, type, triggerPrice: roundOrderPrice(ctxMenu.price), size: orderQty, time: nowSec });
    }
    setCtxMenu(null);
  };

  return (
    <div className="flex flex-1 min-h-0 w-full" onDoubleClick={onOpenSettings}>
      {/* Chart pane */}
      <div className="relative flex flex-1 min-w-0 flex-col">
        <div className="relative flex-1 min-h-0">
          {!isCrypto && <DelayedDataBadge />}
          <ActiveIndicatorsLegend
            enabled={indicatorsEnabled}
            hidden={indicatorsHidden}
            params={indicatorsParams}
            chartStyle={chartStyle}
            onToggleHidden={onIndicatorHiddenToggle}
            onOpenSettings={onIndicatorSettingsOpen}
            onRemove={onIndicatorRemove}
          />
          <FinotaurChart
            hideCursor
            onChartContextMenu={(info) => setCtxMenu({ x: info.clientX, y: info.clientY, price: info.price })}
            symbol={chartSymbol}
            interval={chartInterval}
            from={from}
            to={to}
            dataSource={chartDataSource}
            indicators={indicators}
            theme="dark"
            height="100%"
            showRefocusButton
            enableBackfill={isCrypto}
            sessionVolumeProfile={{ settings: sessionVolumeProfileSettings, visible: volumeProfileEnabled }}
            orderLines={orderLines}
            onLastBarClose={isFutures ? handleLastBarClose : undefined}
          />
        </div>
      </div>

      {/* Drag handle — keeps the paper-trading rail visible in every symbol mode. */}
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
        className={cn(
          'flex-shrink-0 border-l overflow-y-auto',
          light ? 'border-[#e0e3eb] bg-[#ffffff]' : 'border-white/10 bg-[#0A0A0A]',
        )}
        style={{ width: railWidth }}
      >
        <PaperTradeRail
          key={symbol}
          symbol={symbol}
          livePrice={railLivePrice}
          bid={bid}
          ask={ask}
          enabled={isCrypto || isFutures}
          disabledTitle="Live order entry unavailable"
          disabledDescription="Switch to a crypto or futures symbol to enable paper trading on the chart."
          session={paperSession}
          qty={orderQty}
          onQtyChange={setOrderQty}
          qtyMode={qtyMode}
          delayedData={isFutures}
          pointValue={futuresSpec?.pointValue}
        />
      </div>

      {ctxMenu && (
        <ChartContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          price={ctxMenu.price}
          qty={orderQty}
          tradingEnabled={isCrypto}
          livePrice={livePrice}
          onOrder={handleContextOrder}
          onOpenSettings={onOpenSettings}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

