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
import { BinanceTradeSource } from '@/components/charting/orderflow/BinanceTradeSource';
import { DatabentoTradeSource } from '@/components/charting/orderflow/DatabentoTradeSource';
import { DatabentoBarsSource } from '@/components/charting/orderflow/DatabentoBarsSource';
import { useOrderFlow } from '@/components/charting/orderflow/useOrderFlow';
import { FlowBinStore } from '@/components/charting/orderflow/flowBinStore';
import { DEFAULT_FOOTPRINT_CONFIG, type TradeSourceStatus } from '@/components/charting/orderflow/types';
import { resolveImbalancePreset } from '@/components/charting/orderflow/footprintRender';
import {
  FUTURES_CONTRACTS,
  FUTURES_ROOTS,
  frontMonthContract,
  type FuturesRoot,
} from '@/components/charting/orderflow/futuresContracts';
import {
  OrderFlowControls,
  DEFAULT_ORDER_FLOW_CONTROLS,
  type OrderFlowControlsState,
  type RowDensity,
} from '../components/OrderFlowControls';
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

function densityMultiplier(density: RowDensity): number {
  if (density === 'x2') return 2;
  if (density === 'x4') return 4;
  return 1;
}

// Fallback tick size for crypto when no bars are loaded yet — matches
// FlowBinStore's own minimum-tick floor so suggestRowSize never divides by zero.
const FALLBACK_TICK_SIZE = 0.01;

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

// One module-level singleton per file — BinanceSource is stateless (same
// pattern ChartTab.tsx and LiquidityTab.tsx each follow independently).
const binanceSource = new BinanceSource();

export function FootprintTab({ symbol, interval, assetClass, isAdmin, indicators }: FootprintTabProps) {
  // Footprint is the entire point of this tab — the master "Order Flow"
  // on/off toggle from OrderFlowControls is locked ON by always forcing
  // `enabled: true` back in on every change, rather than modifying the
  // shared OrderFlowControls component just for this one caller.
  const [controls, setControls] = useState<OrderFlowControlsState>(DEFAULT_ORDER_FLOW_CONTROLS);
  const handleControlsChange = useCallback((next: OrderFlowControlsState) => {
    setControls({ ...next, enabled: true });
  }, []);

  const [futuresRoot, setFuturesRoot] = useState<FuturesRoot>('NQ');

  const isCrypto = assetClass === 'crypto';
  const isFutures = assetClass === 'futures' && isAdmin;

  if (isCrypto) {
    return (
      <CryptoFootprintBody
        symbol={symbol}
        interval={interval}
        controls={controls}
        onControlsChange={handleControlsChange}
        indicators={indicators}
      />
    );
  }

  if (isFutures) {
    return (
      <FuturesFootprintBody
        interval={interval}
        controls={controls}
        onControlsChange={handleControlsChange}
        root={futuresRoot}
        onRootChange={setFuturesRoot}
        indicators={indicators}
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

// ─── Crypto mode (Binance) ───────────────────────────────────────────────────

interface CryptoFootprintBodyProps {
  symbol: string;
  interval: ArenaInterval;
  controls: OrderFlowControlsState;
  onControlsChange: (next: OrderFlowControlsState) => void;
  indicators: Indicator[];
}

// Binance klines used by useKlineDelta (CVD/Delta sub-panes) only understand
// a small fixed set of native intervals — custom/aggregated timeframes hide
// those sub-panes rather than erroring (mirrors ChartTab.tsx's gating).
const KLINE_DELTA_NATIVE: Interval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

function CryptoFootprintBody({ symbol, interval, controls, onControlsChange, indicators }: CryptoFootprintBodyProps) {
  const { from, to } = useMemo(nowWindowCrypto, [symbol, interval]);
  const focusRange = useMemo(
    () => ({ from: to - INITIAL_VISIBLE_BARS * intervalToSeconds(interval), to }),
    [to, interval],
  );

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
  // for why avgBarRange, not the window-spanning high/low, feeds suggestRowSize).
  const [suggestedRowSize, setSuggestedRowSize] = useState<number>(FALLBACK_TICK_SIZE);
  const handleBarsLoad = useCallback(
    (range: { high: number; low: number; avgBarRange: number } | null) => {
      if (!range) return;
      const next = FlowBinStore.suggestRowSize(
        [{ high: range.avgBarRange, low: 0 }],
        FALLBACK_TICK_SIZE,
      );
      setSuggestedRowSize(next);
    },
    [],
  );

  const rowSize = Math.max(suggestedRowSize, FALLBACK_TICK_SIZE) * densityMultiplier(controls.rowDensity);
  const intervalSec = intervalToSeconds(interval);

  const { store, status, backfillCoveredFromSec } = useOrderFlow({
    symbol,
    intervalSec,
    rowSize,
    source: BinanceTradeSource,
    backfillBars: 40,
  });

  let statusNote: string | undefined;
  let historyLimitedNote: string | undefined;
  if (status === 'connecting') {
    statusNote = 'Loading order flow…';
  }
  if (backfillCoveredFromSec !== null) {
    const requestedFromSec = Math.floor(Date.now() / 1000) - 40 * intervalSec;
    if (backfillCoveredFromSec > requestedFromSec + intervalSec) {
      historyLimitedNote = 'Order flow history limited to the most recent data';
    }
  }

  const showSubPanes = klineDeltaInterval !== null && (controls.showCvd || controls.showDelta);

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      <OrderFlowControls
        state={controls}
        onChange={onControlsChange}
        disabled={false}
        statusNote={statusNote}
        historyLimitedNote={historyLimitedNote}
        hideHeatmapToggle
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
          onBarsLoad={handleBarsLoad}
          footprint={{
            store,
            config: {
              ...DEFAULT_FOOTPRINT_CONFIG,
              cellMode: controls.cellMode,
              imbalancePreset: controls.imbalancePreset,
              ...resolveImbalancePreset(controls.imbalancePreset),
              showStats: controls.showStats,
              magnifierEnabled: controls.magnifierEnabled,
              forceFullDetail: true,
            },
            visible: true,
          }}
          volumeProfile={{ store, visible: controls.showVolumeProfile }}
        />
      </div>

      {showSubPanes && klineDeltaInterval && (
        <div className="flex-shrink-0 flex flex-col">
          {controls.showCvd && (
            <CvdSubPane symbol={symbol} interval={klineDeltaInterval} showTimeAxis={!controls.showDelta} />
          )}
          {controls.showDelta && (
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
  controls: OrderFlowControlsState;
  onControlsChange: (next: OrderFlowControlsState) => void;
  root: FuturesRoot;
  onRootChange: (root: FuturesRoot) => void;
  indicators: Indicator[];
}

function FuturesFootprintBody({ interval, controls, onControlsChange, root, onRootChange, indicators }: FuturesFootprintBodyProps) {
  const contractSymbol = useMemo(() => frontMonthContract(root), [root]);
  const spec = FUTURES_CONTRACTS[root];

  const { from, to } = useMemo(nowWindowFutures, [contractSymbol]);
  const focusRange = useMemo(
    () => ({ from: to - INITIAL_VISIBLE_BARS * intervalToSeconds(interval), to }),
    [to, interval],
  );

  // Row size: same auto-suggest + one-shot-per-root guard as FuturesChartTab.tsx
  // (see that file's header comment for why the guard exists — prevents a
  // render loop between bars loading, row-size suggestion, and store re-bin).
  const [suggestedRowSize, setSuggestedRowSize] = useState<number>(spec.tickSize);
  const hasSuggestedRef = useRef(false);
  useEffect(() => {
    setSuggestedRowSize(spec.tickSize);
    hasSuggestedRef.current = false;
  }, [spec.tickSize]);

  const handleBarsLoad = useCallback(
    (range: { high: number; low: number; avgBarRange: number } | null) => {
      if (!range) return;
      if (hasSuggestedRef.current) return;
      const next = FlowBinStore.suggestRowSize(
        [{ high: range.avgBarRange, low: 0 }],
        spec.tickSize,
      );
      hasSuggestedRef.current = true;
      setSuggestedRowSize((prev) => (next === prev ? prev : next));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [spec.tickSize],
  );

  const rowSize = Math.max(suggestedRowSize, spec.tickSize) * densityMultiplier(controls.rowDensity);
  const intervalSec = intervalToSeconds(interval);

  const { store, status, backfillCoveredFromSec } = useOrderFlow({
    symbol: contractSymbol,
    intervalSec,
    rowSize,
    source: DatabentoTradeSource,
    backfillBars: 40,
  });

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

      <OrderFlowControls
        state={controls}
        onChange={onControlsChange}
        disabled={false}
        statusNote={statusNote}
        historyLimitedNote={historyLimitedNote}
        hideHeatmapToggle
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
                ...DEFAULT_FOOTPRINT_CONFIG,
                cellMode: controls.cellMode,
                imbalancePreset: controls.imbalancePreset,
                ...resolveImbalancePreset(controls.imbalancePreset),
                showStats: controls.showStats,
                magnifierEnabled: controls.magnifierEnabled,
                forceFullDetail: true,
              },
              visible: true,
            }}
          />
        )}
      </div>

      {/* CVD/Delta sub-panes: SKIPPED for futures, same as FuturesChartTab.tsx —
          useKlineDelta is Binance-klines-only; TODO(futures-v2): Databento-native. */}
    </div>
  );
}
