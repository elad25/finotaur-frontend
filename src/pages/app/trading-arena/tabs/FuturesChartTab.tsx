/**
 * Trading Arena — Futures Chart tab (admin-only, dev/trial Databento feed)
 *
 * Parallel to ChartTab, NOT a refactor of it — see the task note in
 * TradingArena.tsx wiring. Structure intentionally mirrors ChartTab:
 *   Left  — FinotaurChart (DatabentoBarsSource) with the footprint overlay
 *           fed by DatabentoTradeSource + useOrderFlow, contract-selector
 *           pills above it.
 *   Right — 320px PaperTradeRail fed the latest polled trade price
 *           (ChartTab feeds it useBinanceOrderBook's tick; here we feed it
 *           the same store's most recent trade price instead).
 *
 * 🔴 COMPLIANCE: this tab and its data sources (DatabentoTradeSource,
 * DatabentoBarsSource) do NOT connect to any Tradovate market-data endpoint.
 * NinjaTrader's written guidance says they don't support market-data
 * WebSocket connections through their API and would disable API access if
 * that came up after the fact; we also have our own written commitment to
 * never pull market data from Tradovate. A prior TradovateTradeSource.ts /
 * TradovateBarsSource.ts pair (md.tradovateapi.com WS) was built and then
 * deleted in full before merge for this reason.
 *
 * Data characteristics (dev-only, accepted trade-offs):
 *   - No live feed. DatabentoTradeSource.subscribe() polls the same
 *     historical backfill endpoint every 15s and delivers unseen trades —
 *     see DatabentoTradeSource.ts. Data is delayed by Databento's historical
 *     ingestion lag. This surface is admin-gated dev/trial only, never
 *     customer-facing, so the delay is accepted — surfaced via the
 *     "Delayed data — development preview" badge below.
 *   - CVD/Delta sub-panes: SKIPPED — useKlineDelta is Binance-klines-only.
 *     TODO(futures-v2): build a Databento-native CVD/Delta hook.
 *   - Bars: derived client-side from the SAME FlowBinStore useOrderFlow
 *     fills for the footprint (DatabentoBarsSource reads the store's raw
 *     trades — single source of truth, see DatabentoBarsSource.ts), not a
 *     separate historical-bars API — see tradesToBars.ts.
 *
 * Feed availability: the server-side Databento data key may not be
 * configured yet. Never render a blank chart with no explanation — the
 * empty-state below surfaces TradeSourceStatus explicitly.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import type { Indicator, Interval } from '@/components/charting/types';
import { DatabentoTradeSource } from '@/components/charting/orderflow/DatabentoTradeSource';
import { DatabentoBarsSource } from '@/components/charting/orderflow/DatabentoBarsSource';
import { useOrderFlow } from '@/components/charting/orderflow/useOrderFlow';
import { FlowBinStore } from '@/components/charting/orderflow/flowBinStore';
import { DEFAULT_FOOTPRINT_CONFIG } from '@/components/charting/orderflow/types';
import type { FootprintDetailLevel } from '@/components/charting/orderflow/footprintRender';
import type { TradeSourceStatus } from '@/components/charting/orderflow/types';
import {
  FUTURES_CONTRACTS,
  FUTURES_ROOTS,
  frontMonthContract,
  type FuturesRoot,
} from '@/components/charting/orderflow/futuresContracts';
import { PaperTradeRail } from '../components/PaperTradeRail';
import {
  OrderFlowControls,
  DEFAULT_ORDER_FLOW_CONTROLS,
  type OrderFlowControlsState,
  type RowDensity,
} from '../components/OrderFlowControls';
import { cn } from '@/lib/utils';

interface FuturesChartTabProps {
  interval: Interval;
  /** Active indicator overlays — single source of truth lives in TradingArena.tsx. */
  indicators: Indicator[];
}

/** Interval → seconds, for the subset of Interval values ARENA_INTERVALS offers. */
const INTERVAL_SECONDS: Partial<Record<Interval, number>> = {
  '1m': 60,
  '5m': 5 * 60,
  '15m': 15 * 60,
  '30m': 30 * 60,
  '60m': 60 * 60,
  '1h': 60 * 60,
  '4h': 4 * 60 * 60,
  '1d': 24 * 60 * 60,
};

function intervalToSec(interval: Interval): number {
  return INTERVAL_SECONDS[interval] ?? 60;
}

function densityMultiplier(density: RowDensity): number {
  if (density === 'x2') return 2;
  if (density === 'x4') return 4;
  return 1;
}

// Rolling 8-hour window — futures tick volume is far lower than crypto, so a
// tighter default window keeps the client-side trade cache (DatabentoBarsSource)
// reasonably sized while still giving useful footprint context.
function nowWindow(): { from: number; to: number } {
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

export function FuturesChartTab({ interval, indicators }: FuturesChartTabProps) {
  const [root, setRoot] = useState<FuturesRoot>('NQ');

  // Front-month contract code (e.g. "NQU6") — recomputed on root change only.
  // Not re-derived every render since the roll boundary only matters at the
  // scale of days, not renders.
  const contractSymbol = useMemo(() => frontMonthContract(root), [root]);
  const spec = FUTURES_CONTRACTS[root];

  const { from, to } = useMemo(nowWindow, [contractSymbol]);

  // ── Order Flow controls state ────────────────────────────────────────────
  const [controls, setControls] = useState<OrderFlowControlsState>(DEFAULT_ORDER_FLOW_CONTROLS);

  // ── Row size: auto-suggested from the loaded window's average PER-BAR
  // high/low range, same approach as ChartTab. FinotaurChart's onBarsLoad
  // reports avgBarRange (average high-low across the individual loaded
  // bars) separately from the window-spanning {high, low} extremes — feeding
  // suggestRowSize the latter as a single synthetic bar produced price bins
  // orders of magnitude too coarse (1-3 bins per bar).
  const [suggestedRowSize, setSuggestedRowSize] = useState<number>(spec.tickSize);

  // Reset the suggestion when the contract root changes (different tick/price scale).
  // Also re-arms the one-shot guard below so a NEW root gets exactly one
  // auto-suggestion again.
  const hasSuggestedRef = useRef(false);
  useEffect(() => {
    setSuggestedRowSize(spec.tickSize);
    hasSuggestedRef.current = false;
  }, [spec.tickSize]);

  // Render-loop fix (2026-07-05): onBarsLoad fires on EVERY bar fetch,
  // including fetches caused by this very state update (bars change →
  // setSuggestedRowSize → rowSize changes → store.setConfig replay → notify →
  // barsRefreshToken bump → bar fetch → onBarsLoad again). Two guards close
  // the loop at its source:
  //   1. Only accept the suggestion ONCE per root/interval change (root reset
  //      above re-arms it) — later onBarsLoad calls (backfill landing,
  //      periodic refresh) must not re-trigger a re-bin from data that may
  //      itself already reflect the pending suggestion.
  //   2. Snap the result to a stable tick-grid step and skip the state update
  //      entirely if it doesn't actually change the current row size — floating
  //      point re-derivation from a `next` that happens to differ by epsilon
  //      is otherwise enough to keep the cycle alive indefinitely.
  const handleBarsLoad = useCallback(
    (range: { high: number; low: number; avgBarRange: number } | null) => {
      if (!range) return;
      if (hasSuggestedRef.current) return;
      // suggestRowSize averages (high - low) across a bars array. Feeding it
      // a single {high: avgBarRange, low: 0} bar reproduces avgRange =
      // avgBarRange without changing suggestRowSize's own contract.
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
  const intervalSec = intervalToSec(interval);

  // ── Order flow data: one DatabentoTradeSource + useOrderFlow per mount ──
  const { store, status, backfillCoveredFromSec } = useOrderFlow({
    symbol: contractSymbol,
    intervalSec,
    rowSize,
    source: DatabentoTradeSource,
    backfillBars: 40,
  });

  // Bars source reads raw trades straight off the SAME store the footprint
  // uses — no separate trade cache/subscription (see DatabentoBarsSource.ts).
  // `store` has a stable identity for the life of this component (useOrderFlow
  // creates it once via useRef), so one DatabentoBarsSource instance per mount
  // is correct — no per-symbol release/teardown needed anymore.
  const barsSourceRef = useRef<DatabentoBarsSource | null>(null);
  if (!barsSourceRef.current) {
    barsSourceRef.current = new DatabentoBarsSource(store);
  }

  // ── Bars refresh token — the store fills asynchronously (the anchor
  // backfill lands 5-15s after mount), but FinotaurChart's bar-fetch effect
  // only re-runs on symbol/interval/from/to change, none of which change once
  // mounted here (see `nowWindow` — a fixed wall-clock window computed once).
  // Without an explicit nudge the chart would fetch bars once (before the
  // store has data) and never again. FlowBinStore already fires onChange on
  // every store mutation (trade apply/rebin/clear) — reuse it, throttled to
  // ≥2s so a burst of polled trades doesn't trigger a refetch per trade.
  const [barsRefreshToken, setBarsRefreshToken] = useState(0);
  useEffect(() => {
    let lastBump = 0;
    let pendingTimeout: ReturnType<typeof setTimeout> | null = null;
    // Belt-and-braces render-loop guard (2026-07-05): store.notify() fires for
    // ANY mutation, including setConfig()'s re-bin replay — which carries no
    // new data. Bumping the refresh token on a replay-only notify would cause
    // FinotaurChart to re-fetch bars, re-derive a row-size suggestion, and
    // potentially setConfig again (see handleBarsLoad's one-shot guard for the
    // other half of this fix). Only bump when the store's ingested-trade count
    // actually grew since the last bump.
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

  // ── Latest trade price — fed to PaperTradeRail (ChartTab's rail hardwire
  // is a `livePrice` PROP, not an internal Binance dependency, so this is a
  // trivial substitution — no PaperTradeRail internals touched). ──────────
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  useEffect(() => {
    const unsubscribe = DatabentoTradeSource.subscribe(contractSymbol, (trades) => {
      if (trades.length === 0) return;
      setLatestPrice(trades[trades.length - 1].price);
    });
    setLatestPrice(null);
    return unsubscribe;
    // Fresh subscription per contract — resets latestPrice on contract switch.
  }, [contractSymbol]);

  const orderFlowActive = controls.enabled;

  // ── Candle dimming: mirror the footprint's zoom-driven stage (same as ChartTab) ─
  const [footprintStage, setFootprintStage] = useState<FootprintDetailLevel>('hidden');
  const handleStageChange = useCallback((stage: FootprintDetailLevel) => {
    setFootprintStage(stage);
  }, []);
  const mutedCandles = orderFlowActive && (footprintStage === 'full' || footprintStage === 'shaded');

  // ── Status / backfill notes ──────────────────────────────────────────────
  let statusNote: string | undefined;
  let historyLimitedNote: string | undefined;
  if (orderFlowActive) {
    if (status === 'connecting' || status === 'reconnecting') {
      statusNote = statusLabel(status);
    }
    if (backfillCoveredFromSec !== null) {
      const requestedFromSec = Math.floor(Date.now() / 1000) - 40 * intervalSec;
      if (backfillCoveredFromSec > requestedFromSec + intervalSec) {
        historyLimitedNote = 'Order flow history limited to the most recent data';
      }
    }
  }

  // Feed unavailable: never render a blank chart — surface a clear DS empty
  // state instead. 'connecting' is excluded (normal transient state on mount).
  const feedUnavailable = status === 'error';

  return (
    <div className="flex flex-1 min-h-0 w-full">
      {/* Chart pane */}
      <div className="relative flex flex-1 min-w-0 flex-col">
        {/* Contract selector pills */}
        <div
          className="flex items-center gap-3 flex-wrap px-3 py-1.5 border-b"
          style={{ borderColor: 'rgba(201,166,70,0.10)' }}
        >
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

          <span className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(201,166,70,0.12)' }} aria-hidden="true" />

          <span className="text-[11px] text-[#707070] font-mono">{contractSymbol}</span>

          {/* Delayed-data badge — this surface has no live feed (15s poll on
              a historical Databento endpoint), never implied as real-time. */}
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
          onChange={setControls}
          disabled={false}
          statusNote={statusNote}
          historyLimitedNote={historyLimitedNote}
        />

        <div className="relative flex-1 min-h-0">
          {feedUnavailable ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="relative">
                <div
                  className="absolute inset-0 blur-2xl opacity-20 rounded-full"
                  style={{ background: 'radial-gradient(circle, #C9A646 0%, transparent 70%)' }}
                  aria-hidden="true"
                />
                <div
                  className="relative flex h-16 w-16 items-center justify-center rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.04) 100%)',
                    border: '1.5px solid rgba(201,166,70,0.28)',
                  }}
                >
                  <AlertTriangle
                    className="h-7 w-7"
                    style={{ color: '#C9A646' }}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <p className="text-sm font-semibold text-[#E8E8E8]">Futures feed unavailable</p>
              <p className="text-[12px] text-[#707070] max-w-xs">
                Data key not configured yet.
              </p>
            </div>
          ) : (
            <FinotaurChart
              symbol={contractSymbol}
              interval={interval}
              from={from}
              to={to}
              dataSource={barsSourceRef.current}
              indicators={indicators}
              theme="dark"
              height="100%"
              showRefocusButton
              refreshToken={barsRefreshToken}
              onBarsLoad={handleBarsLoad}
              footprint={{
                store,
                config: { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: controls.cellMode },
                visible: orderFlowActive,
                onStageChange: handleStageChange,
              }}
              mutedCandles={mutedCandles}
            />
          )}
        </div>

        {/* CVD/Delta sub-panes: SKIPPED for v1 futures — useKlineDelta is
            Binance-klines-only. TODO(futures-v2): Databento-native CVD/Delta. */}
      </div>

      {/* Paper-trading right rail — fed the latest polled trade price */}
      <div className="w-80 flex-shrink-0 border-l border-white/10 bg-[#0A0A0A] overflow-y-auto">
        <PaperTradeRail
          key={contractSymbol}
          symbol={contractSymbol}
          livePrice={latestPrice}
          // No live order book on the Databento polling feed (see file header) —
          // the order panel shows "—" for Bid/Ask and the Buy Bid/Sell Ask
          // limit buttons stay disabled here.
          bid={null}
          ask={null}
          enabled={!feedUnavailable}
        />
      </div>
    </div>
  );
}
