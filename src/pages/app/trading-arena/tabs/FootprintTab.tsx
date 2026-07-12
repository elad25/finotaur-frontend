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
 * explanation): the Databento futures preview is admin-only, never
 * customer-facing. That gate is preserved here via the `isAdmin` prop — a
 * non-admin on a futures symbol sees the same "no live feed" placeholder as
 * stocks/forex, never the Databento contract selector.
 *
 * Stocks/forex (and futures for non-admins) → a plain English placeholder;
 * no live trades feed exists for those instruments today.
 *
 * No PaperTradeRail on this tab — it's a pure order-flow reading surface.
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import { BinanceSource } from '@/components/charting/dataSources';
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
import type { TradeSourceStatus } from '@/components/charting/orderflow/types';
import {
  FUTURES_CONTRACTS,
  FUTURES_ROOTS,
  frontMonthContract,
  type FuturesRoot,
} from '@/components/charting/orderflow/futuresContracts';
import { useFootprintPreferences } from '../hooks/useFootprintPreferences';
import { footprintSettingsToConfig, resolveEffectiveRowSize } from '../components/footprintSettings';
import { FootprintSettingsMenu, type FootprintSettingsMenuProps } from '../components/FootprintSettingsMenu';
import { CvdSubPane, DeltaSubPane } from '../components/CvdDeltaSubPanes';
import { cn } from '@/lib/utils';

interface FootprintTabProps {
  symbol: string;
  interval: ArenaInterval;
  assetClass: AssetClass;
  /** Gates the futures (Databento) mode — see the compliance note above. */
  isAdmin: boolean;
  /** Active indicator overlays — single source of truth lives in TradingArena.tsx. */
  indicators: Indicator[];
}

// Initial visible bar count — wide enough that candles clear the footprint's
// own 'full'-detail candle-width threshold (50px, see footprintTheme.ts)
// with a comfortable margin on a typical Arena viewport, so the chart opens
// legible without the user needing to zoom in first. forceFullDetail (below)
// keeps the footprint at 'full' regardless of zoom, but the underlying cell
// geometry (row-merge factor, font size) still derives from actual on-screen
// px — this initial framing is what keeps that geometry sane by default.
const INITIAL_VISIBLE_BARS = 20;

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

function quickPillClass(active: boolean): string {
  return cn(
    'h-7 min-w-[32px] rounded px-2 text-[11px] font-semibold transition-all duration-150 border',
    active
      ? 'bg-[rgba(201,166,70,0.18)] text-[#C9A646] border-[rgba(201,166,70,0.45)]'
      : 'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
  );
}

// One module-level singleton per file — BinanceSource is stateless (same
// pattern ChartTab.tsx and LiquidityTab.tsx each follow independently).
const binanceSource = new BinanceSource();

export function FootprintTab({ symbol, interval, assetClass, isAdmin, indicators }: FootprintTabProps) {
  const [futuresRoot, setFuturesRoot] = useState<FuturesRoot>('NQ');

  const isCrypto = assetClass === 'crypto';
  const isFutures = assetClass === 'futures' && isAdmin;

  if (isCrypto) {
    return (
      <CryptoFootprintBody
        symbol={symbol}
        interval={interval}
        indicators={indicators}
      />
    );
  }

  if (isFutures) {
    return (
      <FuturesFootprintBody
        interval={interval}
        root={futuresRoot}
        onRootChange={setFuturesRoot}
        indicators={indicators}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <p className="text-[13px] text-zinc-600 max-w-sm text-center">
        Footprint requires a live trades feed — available for crypto and futures.
      </p>
    </div>
  );
}

// ─── Shared "Settings ▾ + quick toggles" strip ──────────────────────────────

interface FootprintToolbarStripProps {
  settingsMenuProps: FootprintSettingsMenuProps;
  showVolumeProfile: boolean;
  showCvd: boolean;
  showDelta: boolean;
  onToggleVolumeProfile: () => void;
  onToggleCvd: () => void;
  onToggleDelta: () => void;
  statusNote?: string;
  historyLimitedNote?: string;
}

function FootprintToolbarStrip({
  settingsMenuProps,
  showVolumeProfile,
  showCvd,
  showDelta,
  onToggleVolumeProfile,
  onToggleCvd,
  onToggleDelta,
  statusNote,
  historyLimitedNote,
}: FootprintToolbarStripProps) {
  return (
    <div
      className="flex items-center gap-2 flex-wrap px-3 py-1.5 border-b"
      style={{ borderColor: 'rgba(201,166,70,0.10)' }}
      title={historyLimitedNote}
    >
      <FootprintSettingsMenu {...settingsMenuProps} />

      <span className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(201,166,70,0.12)' }} aria-hidden="true" />

      <div className="flex items-center gap-1" role="group" aria-label="Volume profile and sub-pane quick toggles">
        <button
          type="button"
          onClick={onToggleVolumeProfile}
          aria-pressed={showVolumeProfile}
          className={quickPillClass(showVolumeProfile)}
          title="Volume Profile — visible-range volume-by-price with POC/Value Area"
        >
          VP
        </button>
        <button
          type="button"
          onClick={onToggleCvd}
          aria-pressed={showCvd}
          className={quickPillClass(showCvd)}
        >
          CVD
        </button>
        <button
          type="button"
          onClick={onToggleDelta}
          aria-pressed={showDelta}
          className={quickPillClass(showDelta)}
        >
          Delta
        </button>
      </div>

      {statusNote && (
        <span className="text-[10px] text-[#707070] ml-1" aria-live="polite">
          {statusNote}
        </span>
      )}
    </div>
  );
}

// ─── Crypto mode (Binance) ───────────────────────────────────────────────────

interface CryptoFootprintBodyProps {
  symbol: string;
  interval: ArenaInterval;
  indicators: Indicator[];
}

// Binance klines used by useKlineDelta (CVD/Delta sub-panes) only understand
// a small fixed set of native intervals — custom/aggregated timeframes hide
// those sub-panes rather than erroring (mirrors ChartTab.tsx's gating).
const KLINE_DELTA_NATIVE: Interval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

function CryptoFootprintBody({ symbol, interval, indicators }: CryptoFootprintBodyProps) {
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
  const { candleDataSource, candleInterval, klineDeltaInterval } = useMemo(() => {
    const plan = resolveIntervalPlan('binance', interval);
    const resolvedSource = plan.kind === 'native'
      ? binanceSource
      : new AggregatingSource(binanceSource, plan.targetSeconds, plan.baseInterval);
    const resolvedInterval = plan.kind === 'native' ? plan.interval : plan.baseInterval;
    const klineInterval = plan.kind === 'native' && KLINE_DELTA_NATIVE.includes(plan.interval)
      ? plan.interval
      : null;
    return { candleDataSource: resolvedSource, candleInterval: resolvedInterval, klineDeltaInterval: klineInterval };
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

  const { store, status, backfillCoveredFromSec, backfillInFlight } = useOrderFlow({
    symbol,
    intervalSec,
    rowSize,
    source: tradeSource,
    backfillBars: 40,
  });

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

  let statusNote: string | undefined;
  let historyLimitedNote: string | undefined;
  if (status === 'connecting') {
    statusNote = 'Loading order flow…';
  } else if (backfillInFlight) {
    statusNote = 'Loading trade history…';
  }
  if (backfillCoveredFromSec !== null) {
    const requestedFromSec = Math.floor(Date.now() / 1000) - 40 * intervalSec;
    if (backfillCoveredFromSec > requestedFromSec + intervalSec) {
      historyLimitedNote = 'Order flow history limited to the most recent data';
    }
  }

  const showSubPanes = klineDeltaInterval !== null && (settings.showCvd || settings.showDelta);

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      <FootprintToolbarStrip
        settingsMenuProps={{ settings, onChange: updateSettings, tickSize, rowSizeClamped }}
        showVolumeProfile={settings.showVolumeProfile}
        showCvd={settings.showCvd}
        showDelta={settings.showDelta}
        onToggleVolumeProfile={() => updateSettings({ showVolumeProfile: !settings.showVolumeProfile })}
        onToggleCvd={() => updateSettings({ showCvd: !settings.showCvd })}
        onToggleDelta={() => updateSettings({ showDelta: !settings.showDelta })}
        statusNote={statusNote}
        historyLimitedNote={historyLimitedNote}
      />

      <div className="relative flex-1 min-h-0">
        <FinotaurChart
          symbol={symbol}
          interval={candleInterval}
          from={from}
          to={to}
          dataSource={candleDataSource}
          indicators={indicators}
          theme="dark"
          height="100%"
          focusRange={focusRange}
          timeFitToken={timeFitToken}
          onBarsLoad={handleBarsLoad}
          footprint={{
            store,
            config: {
              ...footprintSettingsToConfig(settings),
              forceFullDetail: true,
            },
            visible: true,
          }}
          volumeProfile={{ store, visible: settings.showVolumeProfile }}
        />
      </div>

      {showSubPanes && klineDeltaInterval && (
        <div className="flex-shrink-0 flex flex-col">
          {settings.showCvd && (
            <CvdSubPane symbol={symbol} interval={klineDeltaInterval} showTimeAxis={!settings.showDelta} />
          )}
          {settings.showDelta && (
            <DeltaSubPane symbol={symbol} interval={klineDeltaInterval} showTimeAxis={true} />
          )}
        </div>
      )}
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
  /** Gates the Databento futures source — this body only ever mounts when true (see FootprintTab's isFutures check), but resolveTradeSource still requires it explicitly. */
  isAdmin: boolean;
}

function FuturesFootprintBody({ interval, root, onRootChange, indicators, isAdmin }: FuturesFootprintBodyProps) {
  const contractSymbol = useMemo(() => frontMonthContract(root), [root]);
  // resolveTradeSource('futures', root, ...) only returns null when !isAdmin
  // or `root` isn't a known FuturesRoot — neither can happen here (this body
  // only mounts when isFutures = assetClass==='futures' && isAdmin, and
  // `root` is always a FUTURES_ROOTS member from FootprintTab's own state).
  const { source: tradeSource, tickSize } = resolveTradeSource('futures', root, { isAdmin })!;

  // Persistence key is the CONTRACT ROOT ('NQ'), not the rotating front-month
  // contract code — settings (and any future per-root rowSize override)
  // survive a quarterly rollover instead of resetting every 3 months.
  const { settings, update: updateSettings } = useFootprintPreferences(root);

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

  const { store, status, backfillCoveredFromSec } = useOrderFlow({
    symbol: contractSymbol,
    intervalSec,
    rowSize,
    source: tradeSource,
    backfillBars: 40,
  });

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

  let statusNote: string | undefined;
  let historyLimitedNote: string | undefined;
  if (status === 'connecting' || status === 'reconnecting') {
    statusNote = statusLabel(status);
  }
  if (backfillCoveredFromSec !== null) {
    const requestedFromSec = Math.floor(Date.now() / 1000) - 40 * intervalSec;
    if (backfillCoveredFromSec > requestedFromSec + intervalSec) {
      historyLimitedNote = 'Order flow history limited to the most recent data';
    }
  }

  const feedUnavailable = status === 'error';

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
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

      <FootprintToolbarStrip
        settingsMenuProps={{ settings, onChange: updateSettings, tickSize, rowSizeClamped }}
        showVolumeProfile={settings.showVolumeProfile}
        showCvd={settings.showCvd}
        showDelta={settings.showDelta}
        onToggleVolumeProfile={() => updateSettings({ showVolumeProfile: !settings.showVolumeProfile })}
        onToggleCvd={() => updateSettings({ showCvd: !settings.showCvd })}
        onToggleDelta={() => updateSettings({ showDelta: !settings.showDelta })}
        statusNote={statusNote}
        historyLimitedNote={historyLimitedNote}
      />

      <div className="relative flex-1 min-h-0">
        {feedUnavailable ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm font-semibold text-[#E8E8E8]">Futures feed unavailable</p>
            <p className="text-[12px] text-[#707070] max-w-xs">
              Data key not configured yet.
            </p>
          </div>
        ) : (
          <FinotaurChart
            symbol={contractSymbol}
            interval={DATABENTO_INTERVAL_PLACEHOLDER}
            from={from}
            to={to}
            dataSource={barsSource}
            indicators={indicators}
            theme="dark"
            height="100%"
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
            }}
          />
        )}
      </div>

      {/* CVD/Delta sub-panes: SKIPPED for futures, same as FuturesChartTab.tsx —
          useKlineDelta is Binance-klines-only; TODO(futures-v2): Databento-native.
          The CVD/Delta quick pills above remain visible for parity with the
          crypto body (same as the pre-PR-2 OrderFlowControls strip, which
          rendered the same toggles here even though they were inert). */}
    </div>
  );
}
