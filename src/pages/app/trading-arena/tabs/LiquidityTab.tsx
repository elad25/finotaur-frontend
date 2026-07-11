/**
 * Trading Arena — Liquidity tab (Bookmap-style resting-order heatmap)
 *
 * Crypto only — Binance is the only live order-book source wired in today.
 *
 * Reuses the SAME rendering approach as the Market Scanner
 * (src/pages/app/crypto/scanner/MarketScanner.tsx): FinotaurChart with
 * `wallRenderMode="matrix"` (DepthMatrixLayer, painted behind candles),
 * fed by `useDepthSlices` (the scanner's own depth-slice client — historical
 * backfill + 5s live-edge appends), with an adaptive ("Auto") floor derived
 * from the symbol's own 72h wall history via the scanner's
 * `fetchWallsHistory` endpoint, plus a manual floor override and a relative
 * size-filter control, matching the scanner's own toolbar.
 *
 * Deliberately NOT reused from MarketScanner.tsx (do not modify that file —
 * task constraint): the wall-lifecycle tracking (tracked/dead WallSegment
 * stripes rendered via WallHeatLayer) is a ~700-line stateful subsystem in
 * MarketScanner.tsx that exists to also drive the scanner's alive/dead wall
 * *lines*, on top of the depth matrix. This tab only needs the matrix
 * heatmap itself (the "Bookmap-style liquidity chart" the task asks for), so
 * that subsystem is intentionally NOT duplicated here — the wall-history
 * fetch below is used ONLY to seed the adaptive floor, exactly like the
 * scanner's own `computeAutoFloor` step. This is a v1 scope decision (the
 * task explicitly allows duplicating vs. extracting the scanner's wiring —
 * see FLOOR_OPTIONS / computeAutoFloor / intervalMs below, copied not
 * imported, so MarketScanner.tsx itself is completely untouched).
 *
 * No PaperTradeRail on this tab — matches MarketScanner, which has none either.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBinanceOrderBook } from '@/pages/app/crypto/scanner/useBinanceOrderBook';
import { useDepthSlices } from '@/pages/app/crypto/scanner/useDepthSlices';
import { fetchWallsHistory } from '@/pages/app/crypto/_shared/api';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import { BinanceSource } from '@/components/charting/dataSources';
import { AggregatingSource } from '@/components/charting/dataSources/AggregatingSource';
import type { AssetClass } from '@/components/backtest/symbolUniverse';
import { cn } from '@/lib/utils';
import { intervalToSeconds, resolveIntervalPlan, type ArenaInterval } from '../utils/intervals';

interface LiquidityTabProps {
  symbol: string;
  interval: ArenaInterval;
  assetClass: AssetClass;
}

// One module-level singleton per file — BinanceSource is stateless (same
// pattern ChartTab.tsx / FootprintTab.tsx each follow independently).
const binanceSource = new BinanceSource();

// ── Floor filter options — copied from MarketScanner.tsx (kept in sync
// manually; MarketScanner.tsx itself is never imported from here). ─────────
const FLOOR_OPTIONS = [
  { label: 'All',   value: 1_000 },
  { label: '$150K', value: 150_000 },
  { label: '$500K', value: 500_000 },
  { label: '$1M',   value: 1_000_000 },
  { label: '$5M',   value: 5_000_000 },
] as const;
const FLOOR_DEFAULT = 500_000; // fallback floor before wall history loads

// Adaptive ("Auto") floor: per-symbol threshold derived from the symbol's own
// 72h wall-history notionals — see MarketScanner.tsx's computeAutoFloor for
// the full rationale (fixed floors hide real walls on low-notional coins).
const AUTO_FLOOR_PCTL = 0.60;
const AUTO_FLOOR_MIN = 50_000;
const AUTO_FLOOR_MAX = 5_000_000;

function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx];
}

function computeAutoFloor(notionals: number[]): number {
  const p = percentile(notionals, AUTO_FLOOR_PCTL);
  if (!Number.isFinite(p)) return FLOOR_DEFAULT;
  return Math.min(AUTO_FLOOR_MAX, Math.max(AUTO_FLOOR_MIN, Math.round(p)));
}

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

// Approximate bar-spacing px used only to pick the depth-slice resolution
// tier (5s vs 1m) — same conservative constant MarketScanner uses.
const APPROX_BAR_SPACING_PX = 8;

// Re-slide the candle window every 30s so the chart keeps up with "now"
// (same cadence MarketScanner uses).
const SLIDE_INTERVAL_MS = 30_000;

export function LiquidityTab({ symbol, interval, assetClass }: LiquidityTabProps) {
  if (assetClass !== 'crypto') {
    return (
      <div className="flex h-full w-full items-center justify-center px-6">
        <p className="text-[13px] text-zinc-600 max-w-sm text-center">
          Liquidity heatmap is available for crypto markets.
        </p>
      </div>
    );
  }

  // Keyed by symbol — forces a clean remount (and therefore a clean WS
  // reconnect + wall-history refetch) on symbol change, same technique
  // MarketScanner.tsx uses for its own WorkstationInner.
  return <LiquidityBody key={symbol} symbol={symbol} interval={interval} />;
}

interface LiquidityBodyProps {
  symbol: string;
  interval: ArenaInterval;
}

function LiquidityBody({ symbol, interval }: LiquidityBodyProps) {
  const book = useBinanceOrderBook(symbol);

  const [floorMode, setFloorMode] = useState<'auto' | number>('auto');
  const [autoFloorUsd, setAutoFloorUsd] = useState<number>(FLOOR_DEFAULT);
  const floorUsd = floorMode === 'auto' ? autoFloorUsd : floorMode;

  const [sizeFilterPct, setSizeFilterPct] = useState<0 | 1 | 5 | 10 | 25>(5);

  // Seed the adaptive floor from server-side 72h wall history on mount
  // (component is keyed by symbol, so this naturally reruns per symbol).
  useEffect(() => {
    const controller = new AbortController();
    fetchWallsHistory(symbol, 72, controller.signal)
      .then((resp) => {
        const notionals = resp.episodes
          .map((ep) => ep.maxNotionalUsd)
          .filter((n): n is number => Number.isFinite(n));
        if (notionals.length > 0) setAutoFloorUsd(computeAutoFloor(notionals));
      })
      .catch(() => {
        // History is enhancement-only — swallow errors silently (matches
        // MarketScanner.tsx's own handling).
      });
    return () => controller.abort();
  }, [symbol]);

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

  const focusRange = useMemo(
    () => ({ from: to - VISIBLE_BARS * intervalSeconds(interval), to }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [to, interval],
  );

  // Snap the time axis to focusRange once per interval change (NOT on every
  // 30s slide — that would fight the user's pan). Symbol change already
  // re-mounts this whole component via the `key=` in LiquidityTab above.
  const [timeFitToken, setTimeFitToken] = useState(0);
  useEffect(() => {
    setTimeFitToken((t) => t + 1);
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

  const depthMatrix = useDepthSlices({
    symbol,
    fromMs: from * 1000,
    toMs: to * 1000,
    barSpacingPx: APPROX_BAR_SPACING_PX,
    candleIntervalMs: intervalMs(interval),
    getBook: book.getBook,
    floorUsd,
    isLive: book.status === 'live',
  });

  const handleFloorSelect = useCallback((mode: 'auto' | number) => {
    setFloorMode(mode);
  }, []);

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
      {/* Floor + size-filter controls — same segmented-control language as
          MarketScanner.tsx's sub-header. */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: 'rgba(201,166,70,0.10)' }}>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleFloorSelect('auto')}
            title={`Adaptive floor — significant walls for this symbol (~$${Math.round(autoFloorUsd / 1000)}K)`}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-semibold transition-colors duration-100 select-none',
              floorMode === 'auto' ? 'text-[#C9A646]' : 'text-white/40 hover:text-white/60',
            )}
          >
            {`Auto · $${Math.round(autoFloorUsd / 1000)}K`}
          </button>
          {FLOOR_OPTIONS.map((opt) => {
            const isActive = floorMode !== 'auto' && opt.value === floorMode;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleFloorSelect(opt.value)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-semibold transition-colors duration-100 select-none',
                  isActive ? 'text-[#C9A646]' : 'text-white/40 hover:text-white/60',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <span className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(201,166,70,0.12)' }} aria-hidden="true" />

        <div className="flex items-center gap-1 select-none">
          <span className="text-[10px] text-white/30 mr-0.5">Size</span>
          {([
            { label: 'All',  value: 0 as const },
            { label: '≥1%',  value: 1 as const },
            { label: '≥5%',  value: 5 as const },
            { label: '≥10%', value: 10 as const },
            { label: '≥25%', value: 25 as const },
          ] as const).map((opt) => {
            const isActive = opt.value === sizeFilterPct;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSizeFilterPct(opt.value)}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors duration-100 select-none',
                  isActive ? 'text-[#C9A646]' : 'text-white/40 hover:text-white/60',
                )}
                title={opt.value === 0 ? 'Show all orders' : `Show orders ≥ ${opt.value}% of the largest visible wall`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <span
          className={cn(
            'flex items-center gap-1 text-[10px] font-medium ml-auto',
            book.status === 'live' && 'text-emerald-400',
            book.status === 'connecting' && 'text-[#707070]',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', book.status === 'live' ? 'bg-emerald-400' : 'bg-[#707070]')} />
          {book.status === 'live' ? 'Live' : 'Connecting…'}
        </span>
      </div>

      <div className="flex-1 min-h-0">
        <FinotaurChart
          symbol={symbol}
          interval={candleInterval}
          from={from}
          to={to}
          dataSource={candleDataSource}
          theme="dark"
          height="100%"
          focusRange={focusRange}
          timeFitToken={timeFitToken}
          wallRenderMode="matrix"
          depthMatrixColumns={depthMatrix.columns}
          depthMatrixBinSize={depthMatrix.binSize}
          depthMatrixSizeFilterPct={sizeFilterPct}
          depthMatrixFloorUsd={floorUsd}
          depthMatrixCandleIntervalMs={intervalMs(interval)}
        />
      </div>
    </div>
  );
}
