/**
 * BacktestChart — interactive paper-trading chart for the Backtest tab.
 *
 * Wraps the FinotaurChart primitive (futures via Yahoo, equities via Yahoo,
 * crypto via Binance) and layers a paper-trading panel on top. Position
 * entry/exit markers paint directly on candles via lightweight-charts native
 * setMarkers().
 *
 * Phase 1 scope:
 *   - Symbol + barInterval pickers (3 asset classes)
 *   - Manual LONG / SHORT with SL/TP
 *   - Live unrealized P&L tracker for the open position
 *   - Side panel: stats summary + recent trade history
 *   - Markers: entry arrow (green up / red down) + exit dot (P&L-colored)
 *
 * Out of Phase 1 scope (Phase 2/3):
 *   - Playback / replay (open question if needed — current chart shows live
 *     historical, latest candle = "now". Replay still available via the
 *     Immersive Mode button which loads the legacy ReplayChart.)
 *   - Save session to Supabase (Phase 2)
 *   - Rule-based strategy executor (Phase 3)
 */

import { useMemo, useState } from 'react';
import type { UTCTimestamp } from 'lightweight-charts';
import { TrendingUp, TrendingDown, X, RotateCcw, Target } from 'lucide-react';

import { FinotaurChart } from '@/components/charting/FinotaurChart';
import { pickDataSource, isCryptoSymbol } from '@/components/charting/dataSources';
import type { ChartMarker, Interval } from '@/components/charting/types';
import {
  useBacktestSession,
  type PaperPosition,
  type PaperSide,
} from '@/hooks/useBacktestSession';

// ─── Asset class presets ────────────────────────────────────────
// Each preset resolves to a source-native symbol. Yahoo handles futures
// (continuous front-month via =F suffix) and equities (bare ticker). Binance
// handles crypto. Pickers default to the most common contracts/tickers per
// class — power users can type freely.
type AssetClass = 'futures' | 'stocks' | 'crypto';

const PRESETS: Record<AssetClass, Array<{ label: string; symbol: string }>> = {
  futures: [
    { label: 'Micro Nasdaq (MNQ)', symbol: 'MNQ=F' },
    { label: 'Micro S&P (MES)', symbol: 'MES=F' },
    { label: 'E-mini Nasdaq (NQ)', symbol: 'NQ=F' },
    { label: 'E-mini S&P (ES)', symbol: 'ES=F' },
    { label: 'Gold (GC)', symbol: 'GC=F' },
    { label: 'Crude Oil (CL)', symbol: 'CL=F' },
  ],
  stocks: [
    { label: 'Apple (AAPL)', symbol: 'AAPL' },
    { label: 'Nvidia (NVDA)', symbol: 'NVDA' },
    { label: 'Tesla (TSLA)', symbol: 'TSLA' },
    { label: 'Microsoft (MSFT)', symbol: 'MSFT' },
    { label: 'S&P 500 (^GSPC)', symbol: '^GSPC' },
    { label: 'Nasdaq 100 (^NDX)', symbol: '^NDX' },
  ],
  crypto: [
    { label: 'Bitcoin (BTCUSDT)', symbol: 'BTCUSDT' },
    { label: 'Ethereum (ETHUSDT)', symbol: 'ETHUSDT' },
    { label: 'Solana (SOLUSDT)', symbol: 'SOLUSDT' },
    { label: 'BNB (BNBUSDT)', symbol: 'BNBUSDT' },
  ],
};

const INTERVALS: Interval[] = ['1m', '5m', '15m', '60m', '1d'];

// Lookback windows tuned to Yahoo's per-barInterval limits (1m → 7d, 5m → 60d,
// 1d → unlimited). Crypto from Binance has no equivalent ceiling but we keep
// the same windows for UX consistency.
function lookbackSeconds(barInterval: Interval): number {
  switch (barInterval) {
    case '1m': return 7 * 24 * 60 * 60;       // 7 days
    case '5m': return 30 * 24 * 60 * 60;      // 30 days
    case '15m': return 60 * 24 * 60 * 60;     // 60 days
    case '60m':
    case '1h':
    case '4h': return 180 * 24 * 60 * 60;     // 180 days
    case '1d':
    case '1wk':
    case '1mo': return 5 * 365 * 24 * 60 * 60; // 5 years
    default: return 30 * 24 * 60 * 60;
  }
}

// ─── Markers ───────────────────────────────────────────────────
function positionToMarkers(p: PaperPosition): ChartMarker[] {
  const entryMarker: ChartMarker = {
    time: p.entryTime as UTCTimestamp,
    position: p.side === 'LONG' ? 'belowBar' : 'aboveBar',
    shape: p.side === 'LONG' ? 'arrowUp' : 'arrowDown',
    color: p.side === 'LONG' ? '#22c55e' : '#dc2626',
    text: `${p.side} ${p.entryPrice.toFixed(2)}`,
  };
  if (p.exitTime != null && p.exitPrice != null) {
    const exitMarker: ChartMarker = {
      time: p.exitTime as UTCTimestamp,
      position: 'aboveBar',
      shape: 'circle',
      color: (p.pnl ?? 0) >= 0 ? '#22c55e' : '#dc2626',
      text: `EXIT ${p.exitPrice.toFixed(2)}`,
    };
    return [entryMarker, exitMarker];
  }
  return [entryMarker];
}

// ─── Component ─────────────────────────────────────────────────
export interface BacktestChartProps {
  initialSymbol?: string;
  initialInterval?: Interval;
  startingBalance?: number;
  theme?: 'dark' | 'light';
}

export function BacktestChart({
  initialSymbol = 'MNQ=F',
  initialInterval = '5m',
  startingBalance = 10000,
  theme = 'dark',
}: BacktestChartProps) {
  const [assetClass, setAssetClass] = useState<AssetClass>(
    isCryptoSymbol(initialSymbol) ? 'crypto'
      : initialSymbol.endsWith('=F') ? 'futures'
      : 'stocks',
  );
  const [symbol, setSymbol] = useState(initialSymbol);
  // Avoid shadowing the global setInterval — use barInterval / setBarInterval.
  const [barInterval, setBarInterval] = useState<Interval>(initialInterval);
  const [size, setSize] = useState(1);
  const [slInput, setSlInput] = useState('');
  const [tpInput, setTpInput] = useState('');
  // Current price tracked from the chart by listening to the last fetched bar
  // — but FinotaurChart doesn't expose hover/last-bar yet. For Phase 1 we use
  // a manual "current price" input that the user types or accepts the default.
  // The chart visualizes; the trader picks the entry price.
  const [livePrice, setLivePrice] = useState('');

  const session = useBacktestSession(startingBalance);
  const { state, openPosition, closePosition, updateStopLoss, updateTakeProfit, reset } = session;

  const dataSource = useMemo(() => pickDataSource(symbol), [symbol]);

  const { from, to } = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return { from: now - lookbackSeconds(barInterval), to: now };
  }, [barInterval]);

  const markers = useMemo(() => {
    const all: ChartMarker[] = [];
    for (const p of state.closedPositions) all.push(...positionToMarkers(p));
    if (state.activePosition) all.push(...positionToMarkers(state.activePosition));
    return all.sort((a, b) => (a.time as number) - (b.time as number));
  }, [state.activePosition, state.closedPositions]);

  // ─── Handlers ────────────────────────────────────────────────
  const handleAssetClassChange = (next: AssetClass) => {
    setAssetClass(next);
    setSymbol(PRESETS[next][0].symbol);
    setLivePrice('');
  };

  const handleOpen = (side: PaperSide) => {
    const price = parseFloat(livePrice);
    if (!price || isNaN(price) || price <= 0) {
      alert('Enter a valid current price before opening a position.');
      return;
    }
    openPosition({
      side,
      price,
      time: Math.floor(Date.now() / 1000),
      size,
      stopLoss: slInput ? parseFloat(slInput) : undefined,
      takeProfit: tpInput ? parseFloat(tpInput) : undefined,
    });
    setSlInput('');
    setTpInput('');
  };

  const handleClose = (reason: 'manual' | 'sl' | 'tp' = 'manual') => {
    const price = parseFloat(livePrice);
    if (!price || isNaN(price) || price <= 0) {
      alert('Enter the exit price before closing the position.');
      return;
    }
    closePosition({ price, time: Math.floor(Date.now() / 1000), reason });
  };

  const activePos = state.activePosition;
  const unrealizedPnl = useMemo(() => {
    if (!activePos) return null;
    const exit = parseFloat(livePrice);
    if (!exit || isNaN(exit)) return null;
    const direction = activePos.side === 'LONG' ? 1 : -1;
    return (exit - activePos.entryPrice) * direction * activePos.size;
  }, [activePos, livePrice]);

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col bg-[#08080a] text-zinc-100">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        {/* Asset class tabs */}
        <div className="flex rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
          {(['futures', 'stocks', 'crypto'] as AssetClass[]).map((ac) => (
            <button
              key={ac}
              onClick={() => handleAssetClassChange(ac)}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                assetClass === ac
                  ? 'bg-[#C9A646] text-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {ac}
            </button>
          ))}
        </div>

        {/* Symbol picker */}
        <select
          value={symbol}
          onChange={(e) => { setSymbol(e.target.value); setLivePrice(''); }}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 focus:border-[#C9A646] focus:outline-none"
        >
          {PRESETS[assetClass].map((p) => (
            <option key={p.symbol} value={p.symbol}>{p.label}</option>
          ))}
        </select>

        {/* Interval picker */}
        <div className="flex rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              onClick={() => setBarInterval(iv)}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                barInterval === iv
                  ? 'bg-[#C9A646] text-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {iv}
            </button>
          ))}
        </div>

        {/* Balance display */}
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Starting</div>
            <div className="text-sm font-semibold text-zinc-200">${state.startingBalance.toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Net P&L</div>
            <div className={`text-sm font-semibold ${state.stats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {state.stats.netPnl >= 0 ? '+' : ''}${state.stats.netPnl.toFixed(2)}
            </div>
          </div>
          <button
            onClick={() => reset()}
            className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-rose-700 hover:text-rose-400"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Main split: chart + side panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chart */}
        <div className="flex-1 min-w-0 bg-[#08080a]">
          <FinotaurChart
            symbol={symbol}
            interval={barInterval}
            from={from}
            to={to}
            dataSource={dataSource}
            markers={markers}
            theme={theme}
            height="100%"
            onError={(err) => console.warn('[BacktestChart] data fetch failed', err)}
          />
        </div>

        {/* Side panel — paper trading + stats + history */}
        <aside className="flex w-80 flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-950">
          {/* Paper trading panel */}
          <div className="border-b border-zinc-800 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#C9A646]">
              Paper Trading
            </h3>

            <label className="mb-3 block">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Current price</span>
              <input
                type="number"
                value={livePrice}
                onChange={(e) => setLivePrice(e.target.value)}
                placeholder="e.g. 20425.50"
                step="0.01"
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm focus:border-[#C9A646] focus:outline-none"
              />
            </label>

            <label className="mb-3 block">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Size (contracts)</span>
              <input
                type="number"
                value={size}
                onChange={(e) => setSize(Math.max(0.01, Number(e.target.value)))}
                min="0.01"
                step="0.1"
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm focus:border-[#C9A646] focus:outline-none"
              />
            </label>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Stop loss</span>
                <input
                  type="number"
                  value={slInput}
                  onChange={(e) => setSlInput(e.target.value)}
                  placeholder="optional"
                  step="0.01"
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm focus:border-rose-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Take profit</span>
                <input
                  type="number"
                  value={tpInput}
                  onChange={(e) => setTpInput(e.target.value)}
                  placeholder="optional"
                  step="0.01"
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </label>
            </div>

            {!activePos ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleOpen('LONG')}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  <TrendingUp size={16} />
                  LONG
                </button>
                <button
                  onClick={() => handleOpen('SHORT')}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
                >
                  <TrendingDown size={16} />
                  SHORT
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-md border border-[#C9A646]/30 bg-[#C9A646]/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      activePos.side === 'LONG' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-rose-600/20 text-rose-400'
                    }`}>
                      {activePos.side}
                    </span>
                    <span className="text-xs text-zinc-500">{activePos.size}× @ ${activePos.entryPrice.toFixed(2)}</span>
                  </div>
                  {unrealizedPnl != null && (
                    <div className="mt-2">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500">Unrealized</div>
                      <div className={`text-lg font-bold ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {(activePos.stopLoss || activePos.takeProfit) && (
                    <div className="mt-2 flex gap-3 text-[10px] text-zinc-500">
                      {activePos.stopLoss && <span>SL ${activePos.stopLoss.toFixed(2)}</span>}
                      {activePos.takeProfit && <span>TP ${activePos.takeProfit.toFixed(2)}</span>}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {slInput && (
                    <button
                      onClick={() => updateStopLoss(parseFloat(slInput))}
                      className="rounded-md border border-rose-700 bg-rose-950 px-2 py-1.5 text-[10px] font-semibold text-rose-400 hover:bg-rose-900"
                    >
                      Set SL
                    </button>
                  )}
                  {tpInput && (
                    <button
                      onClick={() => updateTakeProfit(parseFloat(tpInput))}
                      className="rounded-md border border-emerald-700 bg-emerald-950 px-2 py-1.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-900"
                    >
                      Set TP
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleClose('manual')}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#C9A646] px-3 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#D4B55E]"
                >
                  <X size={16} />
                  Close at ${livePrice || '—'}
                </button>
              </div>
            )}
          </div>

          {/* Stats panel */}
          <div className="border-b border-zinc-800 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#C9A646]">
              Session Stats
            </h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <StatRow label="Trades" value={state.stats.totalTrades.toString()} />
              <StatRow
                label="Win rate"
                value={`${state.stats.winRate.toFixed(1)}%`}
                tone={state.stats.winRate >= 50 ? 'positive' : 'neutral'}
              />
              <StatRow label="Winners" value={state.stats.winners.toString()} tone="positive" />
              <StatRow label="Losers" value={state.stats.losers.toString()} tone="negative" />
              <StatRow
                label="Profit factor"
                value={state.stats.profitFactor === Infinity ? '∞' : state.stats.profitFactor.toFixed(2)}
                tone="brand"
              />
              <StatRow
                label="Avg R:R"
                value={state.stats.avgRR > 0 ? `1:${state.stats.avgRR.toFixed(2)}` : '—'}
                tone="brand"
              />
              <StatRow
                label="Avg win"
                value={`$${state.stats.avgWin.toFixed(2)}`}
                tone="positive"
              />
              <StatRow
                label="Avg loss"
                value={`$${state.stats.avgLoss.toFixed(2)}`}
                tone="negative"
              />
              <StatRow
                label="Largest win"
                value={`$${state.stats.largestWin.toFixed(2)}`}
                tone="positive"
              />
              <StatRow
                label="Largest loss"
                value={`$${state.stats.largestLoss.toFixed(2)}`}
                tone="negative"
              />
              <StatRow label="Win streak" value={state.stats.longestWinStreak.toString()} />
              <StatRow label="Loss streak" value={state.stats.longestLossStreak.toString()} />
            </div>
          </div>

          {/* Trade history */}
          <div className="flex-1 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C9A646]">
              <Target size={12} />
              History ({state.closedPositions.length})
            </h3>
            {state.closedPositions.length === 0 ? (
              <div className="rounded-md border border-dashed border-zinc-800 px-3 py-6 text-center text-xs text-zinc-600">
                No closed trades yet.
              </div>
            ) : (
              <div className="space-y-2">
                {state.closedPositions.slice().reverse().map((trade, i) => {
                  const idx = state.closedPositions.length - i;
                  const pnl = trade.pnl ?? 0;
                  return (
                    <div
                      key={trade.id}
                      className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2.5 text-xs"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500">#{idx}</span>
                          <span className={`font-semibold ${trade.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trade.side}
                          </span>
                        </div>
                        <span className={`font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>${trade.entryPrice.toFixed(2)} → ${trade.exitPrice?.toFixed(2)}</span>
                        <span>{trade.size}×</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Local helpers ───────────────────────────────────────────────
interface StatRowProps {
  label: string;
  value: string;
  tone?: 'positive' | 'negative' | 'brand' | 'neutral';
}

function StatRow({ label, value, tone = 'neutral' }: StatRowProps) {
  const toneClass =
    tone === 'positive' ? 'text-emerald-400'
    : tone === 'negative' ? 'text-rose-400'
    : tone === 'brand' ? 'text-[#C9A646]'
    : 'text-zinc-200';
  return (
    <div className="flex justify-between border-b border-zinc-900 pb-1">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

export default BacktestChart;
