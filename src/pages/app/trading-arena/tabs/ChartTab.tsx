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
 */

import { useCallback, useMemo, useState } from 'react';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import { BinanceSource } from '@/components/charting/dataSources';
import type { Indicator, Interval } from '@/components/charting/types';
import { useBinanceOrderBook } from '@/pages/app/crypto/scanner/useBinanceOrderBook';
import { BinanceTradeSource } from '@/components/charting/orderflow/BinanceTradeSource';
import { useOrderFlow } from '@/components/charting/orderflow/useOrderFlow';
import { FlowBinStore } from '@/components/charting/orderflow/flowBinStore';
import { DEFAULT_FOOTPRINT_CONFIG } from '@/components/charting/orderflow/types';
import type { FootprintDetailLevel } from '@/components/charting/orderflow/footprintRender';
import { PaperTradeRail } from '../components/PaperTradeRail';
import {
  OrderFlowControls,
  DEFAULT_ORDER_FLOW_CONTROLS,
  type OrderFlowControlsState,
  type RowDensity,
} from '../components/OrderFlowControls';
import { CvdSubPane, DeltaSubPane } from '../components/CvdDeltaSubPanes';

interface ChartTabProps {
  symbol: string;
  interval: Interval;
  /** Detected asset class for the current symbol. Controls chart source and rail enabled state. */
  assetClass: string;
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

/** Row-density multiplier applied on top of FlowBinStore.suggestRowSize(). */
function densityMultiplier(density: RowDensity): number {
  if (density === 'x2') return 2;
  if (density === 'x4') return 4;
  return 1;
}

// Fallback tick size when no bars are loaded yet — matches FlowBinStore's
// own minimum-tick floor so suggestRowSize never divides by zero.
const FALLBACK_TICK_SIZE = 0.01;

export function ChartTab({ symbol, interval, assetClass }: ChartTabProps) {
  const { from, to } = useMemo(nowWindow, [symbol, interval]);

  const isCrypto = assetClass === 'crypto';

  // Always called unconditionally (hooks rule). For non-crypto, the symbol
  // won't match a Binance pair — lastPrice will stay null, disabling the rail.
  const book = useBinanceOrderBook(symbol);
  const livePrice = book.lastPrice;

  // ── Order Flow controls state ────────────────────────────────────────────
  const [controls, setControls] = useState<OrderFlowControlsState>(DEFAULT_ORDER_FLOW_CONTROLS);

  // ── Row size: auto-suggested from the loaded window's high/low range,
  // refined on each bar load (onBarsLoad below), adjusted by the density
  // multiplier. FinotaurChart's onBarsLoad only exposes the whole window's
  // {high, low} extremes (not the raw per-bar array), so suggestRowSize is
  // fed a single synthetic "bar" spanning that range — a reasonable proxy
  // since the goal is just a sensible starting tick, not exact TradingView parity.
  const [suggestedRowSize, setSuggestedRowSize] = useState<number>(FALLBACK_TICK_SIZE);

  const handleBarsLoad = useCallback((range: { high: number; low: number } | null) => {
    if (!range) return;
    const avgRange = range.high - range.low;
    const proxyTick = avgRange > 0 ? Math.max(avgRange / 500, FALLBACK_TICK_SIZE) : FALLBACK_TICK_SIZE;
    const next = FlowBinStore.suggestRowSize([range], proxyTick);
    setSuggestedRowSize(next);
  }, []);

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
        <OrderFlowControls
          state={controls}
          onChange={setControls}
          disabled={!isCrypto}
          statusNote={statusNote}
          historyLimitedNote={historyLimitedNote}
        />

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
                config: { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: controls.cellMode },
                visible: orderFlowActive,
                onStageChange: handleStageChange,
              }}
              mutedCandles={mutedCandles}
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
          enabled={isCrypto}
        />
      </div>
    </div>
  );
}
