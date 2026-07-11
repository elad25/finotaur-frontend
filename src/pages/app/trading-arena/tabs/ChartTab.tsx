/**
 * Trading Arena — Chart tab
 *
 * Layout: two-pane flex row.
 *   Left  — FinotaurChart (BinanceSource, crypto only) or a placeholder for
 *            non-crypto symbols, with Order Flow controls above it and
 *            optional CVD/Delta sub-panes below it.
 *   Right — 320 px PaperTradeRail (paper-trading panel driven by live tick
 *            price from useBinanceOrderBook).
 *
 * useBinanceOrderBook is called unconditionally (rules of hooks). For non-crypto
 * symbols it connects to Binance with a malformed pair and will sit in 'error'
 * or 'connecting' state — livePrice stays null, which disables the rail.
 *
 * Order Flow (Phase 3 integration): zoom-driven progressive disclosure on
 * THIS chart — not a separate mode. One BinanceTradeSource + useOrderFlow
 * hook per mount; rowSize auto-suggested from recently loaded bars and
 * adjustable via the row-density control (×2/×4 widen the suggested rowSize).
 * See src/components/charting/orderflow/ for the underlying engine.
 *
 * Heatmap toggle (Bookmap-style liquidity heatmap, Phase 4): reuses
 * DepthMatrixLayer + useDepthSlices EXACTLY as wired in MarketScanner.tsx —
 * not rebuilt. The Arena hardcodes the scanner's floor/size-filter defaults
 * (no floor/size-filter UI here; the scanner owns that control surface) and
 * does NOT seed 72h wall history (fetchWallsHistory) — that seeds the
 * WallHeatLayer wall-stripe feature, which the Arena doesn't use. See the
 * TODOs below for what was intentionally left out.
 *
 * Layer z-order (heatmap + footprint + volume profile can all be on at once):
 *   DepthMatrixLayer (heatmap)   z-index  5  — BELOW candles (as in the scanner)
 *   candlestick series           (base chart canvas, paints above z-index 5)
 *   VolumeProfileLayer           z-index 14  — above candles
 *   FootprintLayer               z-index 15  — above candles, above the profile
 *   marker icons                 z-index 20  — topmost
 */

import { useCallback, useMemo, useState } from 'react';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import { BinanceSource } from '@/components/charting/dataSources';
import type { Indicator, Interval } from '@/components/charting/types';
import { useBinanceOrderBook } from '@/pages/app/crypto/scanner/useBinanceOrderBook';
import { useDepthSlices } from '@/pages/app/crypto/scanner/useDepthSlices';
import { BinanceTradeSource } from '@/components/charting/orderflow/BinanceTradeSource';
import { useOrderFlow } from '@/components/charting/orderflow/useOrderFlow';
import { FlowBinStore } from '@/components/charting/orderflow/flowBinStore';
import { DEFAULT_FOOTPRINT_CONFIG } from '@/components/charting/orderflow/types';
import { resolveImbalancePreset, type FootprintDetailLevel } from '@/components/charting/orderflow/footprintRender';
import { PaperTradeRail } from '../components/PaperTradeRail';
import {
  type OrderFlowControlsState,
  type RowDensity,
} from '../components/OrderFlowControls';
import { CvdSubPane, DeltaSubPane } from '../components/CvdDeltaSubPanes';

interface ChartTabProps {
  symbol: string;
  interval: Interval;
  /** Detected asset class for the current symbol. Controls chart source and rail enabled state. */
  assetClass: string;
  /** Order Flow controls — lifted up to TradingArena (rendered in the Arena
   *  toolbar's "Chart ▾" dropdown), passed down here as a controlled prop. */
  controls: OrderFlowControlsState;
  onControlsChange: (next: OrderFlowControlsState) => void;
}

// Singleton — BinanceSource is stateless; one instance is fine.
const binanceSource = new BinanceSource();

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

/** Interval → seconds, for the subset of Interval values the Arena's ARENA_INTERVALS actually offers. */
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

function intervalToMs(interval: Interval): number {
  return intervalToSec(interval) * 1000;
}

// ── Heatmap defaults (Task 2) ────────────────────────────────────────────
// MarketScanner exposes floor/size-filter as user-adjustable controls (its
// own dedicated toolbar). The Arena's Chart tab does NOT rebuild that UI —
// per the task scope, these are hardcoded to the scanner's own defaults.
// TODO(heatmap-controls): if traders ask for floor/size-filter adjustment
// in the Arena, add a compact control here rather than porting the
// scanner's full toolbar.
const HEATMAP_FLOOR_USD = 1_000;
const HEATMAP_SIZE_FILTER_PCT = 5 as const;
// Conservative default bar-spacing estimate — DepthMatrixLayer/useDepthSlices
// only uses this to pick the 5s vs 1m resolution tier; the scanner passes the
// same conservative constant (see MarketScanner.tsx APPROX_BAR_SPACING_PX).
const HEATMAP_APPROX_BAR_SPACING_PX = 8;

/** Row-density multiplier applied on top of FlowBinStore.suggestRowSize(). */
function densityMultiplier(density: RowDensity): number {
  if (density === 'x2') return 2;
  if (density === 'x4') return 4;
  return 1;
}

// Fallback tick size when no bars are loaded yet — matches FlowBinStore's
// own minimum-tick floor so suggestRowSize never divides by zero.
const FALLBACK_TICK_SIZE = 0.01;

export function ChartTab({ symbol, interval, assetClass, controls, onControlsChange }: ChartTabProps) {
  const { from, to } = useMemo(nowWindow, [symbol, interval]);

  const isCrypto = assetClass === 'crypto';

  // Always called unconditionally (hooks rule). For non-crypto, the symbol
  // won't match a Binance pair — lastPrice will stay null, disabling the rail.
  const book = useBinanceOrderBook(symbol);
  const livePrice = book.lastPrice;

  // Best bid/ask for the order-entry panel's "Buy Bid" / "Sell Ask" limit
  // orders. useBinanceOrderBook keeps the full depth book in a ref (no
  // per-message re-render — see that hook's header comment), so we read the
  // top of book via its getBook() accessor and recompute whenever the
  // (1x/sec-throttled) lastPrice ticks — the same trade-off useDepthSlices
  // makes just above for the heatmap feed.
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

  // ── Row size: auto-suggested from the loaded window's average PER-BAR
  // high/low range, refined on each bar load (onBarsLoad below), adjusted by
  // the density multiplier. FinotaurChart's onBarsLoad reports avgBarRange —
  // the average (high - low) across the individual loaded bars — separately
  // from the window-spanning high/low extremes, so suggestRowSize (which
  // expects a PER-BAR range, per its TradingView-convention doc comment)
  // isn't fed one giant synthetic bar spanning the whole window (that
  // produced price bins orders of magnitude too coarse — 1-3 bins per bar).
  const [suggestedRowSize, setSuggestedRowSize] = useState<number>(FALLBACK_TICK_SIZE);

  const handleBarsLoad = useCallback(
    (range: { high: number; low: number; avgBarRange: number } | null) => {
      if (!range) return;
      // suggestRowSize takes a bars array and averages (high - low) across
      // it. Feeding it a single {high: avgBarRange, low: 0} bar reproduces
      // exactly avgRange = avgBarRange without changing suggestRowSize's
      // contract (which real bar arrays elsewhere still rely on).
      const next = FlowBinStore.suggestRowSize(
        [{ high: range.avgBarRange, low: 0 }],
        FALLBACK_TICK_SIZE,
      );
      setSuggestedRowSize(next);
    },
    [],
  );

  const rowSize = Math.max(suggestedRowSize, FALLBACK_TICK_SIZE) * densityMultiplier(controls.rowDensity);
  const intervalSec = intervalToSec(interval);

  // ── Order flow data: one BinanceTradeSource + useOrderFlow per mount ────
  const { store, status, backfillCoveredFromSec } = useOrderFlow({
    symbol,
    intervalSec,
    rowSize,
    source: BinanceTradeSource,
    backfillBars: 40,
  });

  const orderFlowActive = isCrypto && controls.enabled;
  const volumeProfileActive = isCrypto && controls.showVolumeProfile;
  const heatmapActive = isCrypto && controls.showHeatmap;

  // ── Heatmap data feed (Task 2) — reuses useDepthSlices exactly as
  // MarketScanner.tsx wires it: same hook, same getBook accessor, same
  // conservative bar-spacing constant. Only fetches/decodes when the toggle
  // is on (isLive gates the 5s live-edge sampler; the fetch effect still
  // runs whenever this hook is mounted, which is unconditional per hooks
  // rules — cost is bounded by the same debounce/fetch-window-cache logic
  // useDepthSlices already has for the scanner).
  const depthMatrix = useDepthSlices({
    symbol,
    fromMs: from * 1000,
    toMs: to * 1000,
    barSpacingPx: HEATMAP_APPROX_BAR_SPACING_PX,
    candleIntervalMs: intervalToMs(interval),
    getBook: book.getBook,
    floorUsd: HEATMAP_FLOOR_USD,
    isLive: heatmapActive && book.status === 'live',
  });

  // ── Candle dimming: mirror the footprint's zoom-driven stage ────────────
  const [footprintStage, setFootprintStage] = useState<FootprintDetailLevel>('hidden');
  const handleStageChange = useCallback((stage: FootprintDetailLevel) => {
    setFootprintStage(stage);
  }, []);
  const mutedCandles = orderFlowActive && (footprintStage === 'full' || footprintStage === 'shaded');

  // ── Backfill indicator note ──────────────────────────────────────────────
  let statusNote: string | undefined;
  let historyLimitedNote: string | undefined;
  if (orderFlowActive) {
    if (status === 'connecting') {
      statusNote = 'Loading order flow…';
    }
    if (backfillCoveredFromSec !== null) {
      const requestedFromSec = Math.floor(Date.now() / 1000) - 40 * intervalSec;
      if (backfillCoveredFromSec > requestedFromSec + intervalSec) {
        historyLimitedNote = 'Order flow history limited to the most recent data';
      }
    }
  }

  const showSubPanes = isCrypto && (controls.showCvd || controls.showDelta);

  return (
    <div className="flex flex-1 min-h-0 w-full">
      {/* Chart pane */}
      <div className="relative flex flex-1 min-w-0 flex-col">
        {/* Order Flow controls now live in the Arena toolbar's "Chart ▾"
            dropdown (see ArenaToolbar.tsx) — no longer rendered here. */}
        <div className="relative flex-1 min-h-0">
          {isCrypto ? (
            <FinotaurChart
              symbol={symbol}
              interval={interval}
              from={from}
              to={to}
              dataSource={binanceSource}
              indicators={DEFAULT_INDICATORS}
              theme="dark"
              height="100%"
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
                },
                visible: orderFlowActive,
                onStageChange: handleStageChange,
              }}
              mutedCandles={mutedCandles}
              volumeProfile={{ store, visible: volumeProfileActive }}
              wallRenderMode={heatmapActive ? 'matrix' : 'series'}
              depthMatrixColumns={heatmapActive ? depthMatrix.columns : undefined}
              depthMatrixBinSize={depthMatrix.binSize}
              depthMatrixSizeFilterPct={HEATMAP_SIZE_FILTER_PCT}
              depthMatrixFloorUsd={HEATMAP_FLOOR_USD}
              depthMatrixCandleIntervalMs={intervalToMs(interval)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] text-zinc-600">
                Live chart data — crypto only for now
              </p>
            </div>
          )}
        </div>

        {showSubPanes && (
          <div className="flex-shrink-0 flex flex-col">
            {controls.showCvd && (
              <CvdSubPane symbol={symbol} interval={interval} showTimeAxis={!controls.showDelta} />
            )}
            {controls.showDelta && (
              <DeltaSubPane symbol={symbol} interval={interval} showTimeAxis={true} />
            )}
          </div>
        )}
      </div>

      {/* Paper-trading right rail */}
      <div className="w-80 flex-shrink-0 border-l border-white/10 bg-[#0A0A0A] overflow-y-auto">
        <PaperTradeRail
          key={symbol}
          symbol={symbol}
          livePrice={livePrice}
          bid={bid}
          ask={ask}
          enabled={isCrypto}
        />
      </div>
    </div>
  );
}
