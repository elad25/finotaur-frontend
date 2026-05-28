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

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UTCTimestamp } from 'lightweight-charts';
import { TrendingUp, TrendingDown, X, RotateCcw, Target, Save, Check, AlertCircle, Play, ChevronDown, Sparkles, ArrowLeft } from 'lucide-react';

import { FinotaurChart } from '@/components/charting/FinotaurChart';
import { pickDataSource, isCryptoSymbol } from '@/components/charting/dataSources';
import type { Bar, ChartMarker, Interval } from '@/components/charting/types';
import {
  useBacktestSession,
  computeStatsByStrategy,
  type PaperPosition,
  type PaperSide,
} from '@/hooks/useBacktestSession';
import { useBacktestPersistence } from '@/hooks/useBacktestPersistence';
import { useStrategyLibrary } from '@/hooks/useStrategyLibrary';
import { runStrategy } from '@/core/backtest/runStrategy';
import { BacktestReplayChart } from './BacktestReplayChart';
import { DateTimePicker } from './DateTimePicker';

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
  const { state, openPosition, closePosition, updateStopLoss, updateTakeProfit, reset, loadTrades } = session;

  // Phase 2: Supabase persistence for "Save Session" button.
  const persistence = useBacktestPersistence();
  type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Phase 3: rule-based strategy executor.
  const strategyLib = useStrategyLibrary();
  type RunStatus = 'idle' | 'running' | 'done' | 'error';
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [runError, setRunError] = useState<string | null>(null);
  const [runSummary, setRunSummary] = useState<string | null>(null);
  const [strategyPickerOpen, setStrategyPickerOpen] = useState(false);

  const navigate = useNavigate();

  // Phase 4: Live ↔ Replay mode toggle. In Replay mode, the chart is
  // BacktestReplayChart (cursor-controlled). In Live mode it's the
  // current FinotaurChart with manual current-price input.
  // Phase 5: Replay is the default — Elad: "תדאג שהIMERSSIVE יעבוד חלק כמו REPLAY"
  type ChartMode = 'live' | 'replay';
  const [chartMode, setChartMode] = useState<ChartMode>('replay');

  // Phase 5: Chart link goes straight to fullscreen immersive — covers
  // app topnav + journal sub-nav. Exit button returns user to backtest
  // overview (= the dashboard listing). Toggle exists for power users who
  // want a windowed view (rare).
  const [isFullScreen, setIsFullScreen] = useState(true);

  // Phase 5: inline error message replaces the blocking alert() calls.
  // Native alert() freezes the renderer in browser-automation contexts
  // and is poor UX. This shows below the trade buttons for ~3s.
  const [tradeError, setTradeError] = useState<string | null>(null);
  const flashTradeError = useCallback((msg: string) => {
    setTradeError(msg);
    setTimeout(() => setTradeError(null), 3000);
  }, []);

  // Phase 4: replay start moment. Defaults to "now − 4 hours" so the trader
  // immediately sees recent history with room to PLAY forward.
  const [replayStart, setReplayStart] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getTime() - 4 * 60 * 60 * 1000);
  });

  // Phase 4: active strategy tag. Every trade opened while this is set will
  // be attributed to the strategy in stats breakdown + saved session record.
  const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null);
  const activeStrategy = useMemo(
    () => strategyLib.strategies.find((s) => s.id === activeStrategyId) ?? null,
    [strategyLib.strategies, activeStrategyId],
  );

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
      flashTradeError('Enter a valid current price before opening a position.');
      return;
    }
    openPosition({
      side,
      price,
      time: Math.floor(Date.now() / 1000),
      size,
      stopLoss: slInput ? parseFloat(slInput) : undefined,
      takeProfit: tpInput ? parseFloat(tpInput) : undefined,
      strategyId: activeStrategyId,
    });
    setSlInput('');
    setTpInput('');
  };

  // ─── Phase 4 handlers ──────────────────────────────────────
  // Replay: open a position at the clicked bar's close. SL/TP come from the
  // side-panel inputs, size from the size input. Strategy tag from active.
  const handleReplayBarClick = useCallback((bar: Bar) => {
    if (state.activePosition) {
      // Single-position-at-a-time invariant — don't auto-stack. UI just
      // ignores the click; trader closes or waits for SL/TP first.
      return;
    }
    // Default to LONG on bar click. Future tweak: shift+click for SHORT.
    openPosition({
      side: 'LONG',
      price: bar.close,
      time: bar.time as number,
      size,
      stopLoss: slInput ? parseFloat(slInput) : undefined,
      takeProfit: tpInput ? parseFloat(tpInput) : undefined,
      strategyId: activeStrategyId,
    });
    setLivePrice(bar.close.toString());
  }, [state.activePosition, openPosition, size, slInput, tpInput, activeStrategyId]);

  // Replay: each bar revealed by the playback cursor — check SL/TP against
  // any active position. Same-bar-as-entry skip mirrors runStrategy.ts to
  // avoid phantom stopouts on the entry bar.
  const handleReplayBarReveal = useCallback((bar: Bar) => {
    const pos = state.activePosition;
    if (!pos) return;
    if ((pos.entryTime as number) === (bar.time as number)) return; // same-bar skip

    if (pos.side === 'LONG') {
      if (pos.stopLoss != null && bar.low <= pos.stopLoss) {
        closePosition({ price: pos.stopLoss, time: bar.time as number, reason: 'sl' });
        return;
      }
      if (pos.takeProfit != null && bar.high >= pos.takeProfit) {
        closePosition({ price: pos.takeProfit, time: bar.time as number, reason: 'tp' });
        return;
      }
    } else {
      if (pos.stopLoss != null && bar.high >= pos.stopLoss) {
        closePosition({ price: pos.stopLoss, time: bar.time as number, reason: 'sl' });
        return;
      }
      if (pos.takeProfit != null && bar.low <= pos.takeProfit) {
        closePosition({ price: pos.takeProfit, time: bar.time as number, reason: 'tp' });
        return;
      }
    }
  }, [state.activePosition, closePosition]);

  // Stats breakdown by strategy — only show panel when ≥1 trade has been
  // tagged with a (non-manual) strategy id, so live-only sessions stay clean.
  const statsByStrategy = useMemo(
    () => computeStatsByStrategy(state.closedPositions, state.startingBalance),
    [state.closedPositions, state.startingBalance],
  );
  const strategyBreakdown = useMemo(() => {
    const rows: Array<{ key: string; label: string; trades: number; winRate: number; netPnl: number }> = [];
    for (const [key, stats] of statsByStrategy) {
      const label = key === 'manual'
        ? 'Manual'
        : strategyLib.strategies.find((s) => s.id === key)?.name ?? 'Unknown';
      rows.push({ key, label, trades: stats.totalTrades, winRate: stats.winRate, netPnl: stats.netPnl });
    }
    // Largest contributor first.
    rows.sort((a, b) => Math.abs(b.netPnl) - Math.abs(a.netPnl));
    return rows;
  }, [statsByStrategy, strategyLib.strategies]);

  const handleClose = (reason: 'manual' | 'sl' | 'tp' = 'manual') => {
    const price = parseFloat(livePrice);
    if (!price || isNaN(price) || price <= 0) {
      flashTradeError('Enter the exit price before closing the position.');
      return;
    }
    closePosition({ price, time: Math.floor(Date.now() / 1000), reason });
  };

  const handleSaveSession = async () => {
    if (state.closedPositions.length === 0 && !state.activePosition) {
      setSaveError('Nothing to save — open or close a trade first.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2500);
      return;
    }
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const finalBalance = state.startingBalance + state.stats.netPnl;
      await persistence.saveSession({
        symbol,
        interval: barInterval,
        asset_class: assetClass,
        startDate: new Date(from * 1000),
        endDate: new Date(to * 1000),
        initialBalance: state.startingBalance,
        finalBalance,
        statistics: state.stats,
        trades: state.closedPositions,
        // Auto-name: "<symbol> · <interval> · <date>"
        name: `${symbol} · ${barInterval} · ${new Date().toLocaleDateString()}`,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save session');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  const handleRunStrategy = async (strategyId: string) => {
    const strategy = strategyLib.strategies.find((s) => s.id === strategyId);
    if (!strategy) {
      setRunError('Strategy not found');
      setRunStatus('error');
      return;
    }
    setStrategyPickerOpen(false);
    setRunStatus('running');
    setRunError(null);
    setRunSummary(null);
    try {
      // Fetch the same bar window the chart is currently showing.
      const bars = await dataSource.getBars(symbol, barInterval, from as never, to as never);
      if (!bars || bars.length < 2) {
        throw new Error('Not enough bars in window to run strategy');
      }
      const result = runStrategy(strategy, bars);
      loadTrades(result.trades);
      setRunSummary(
        `Ran "${strategy.name}" → ${result.trades.length} trade${result.trades.length === 1 ? '' : 's'} on ${result.barsScanned} bars` +
        (result.unusedRuleIds.length > 0 ? ` (${result.unusedRuleIds.length} rule${result.unusedRuleIds.length === 1 ? '' : 's'} never fired)` : ''),
      );
      setRunStatus('done');
      setTimeout(() => { setRunStatus('idle'); setRunSummary(null); }, 8000);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Strategy run failed');
      setRunStatus('error');
      setTimeout(() => setRunStatus('idle'), 4000);
    }
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
  // Phase 5: fullscreen-by-default. position:fixed inset-0 covers the
  // app-level topnav + journal sub-nav. Exit button returns to overview.
  const containerCls = isFullScreen
    ? 'fixed inset-0 z-[100] flex flex-col bg-[#08080a] text-zinc-100'
    : 'flex h-full w-full flex-col bg-[#08080a] text-zinc-100';

  return (
    <div className={containerCls}>
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        {/* Exit fullscreen — back to backtest overview (only in fullscreen) */}
        {isFullScreen && (
          <button
            onClick={() => navigate('/app/journal/backtest/overview')}
            title="Exit chart — back to Backtest dashboard"
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-[#C9A646]/40 hover:text-[#C9A646]"
          >
            <ArrowLeft size={12} />
            Exit
          </button>
        )}

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

        {/* Live | Replay mode toggle (Phase 4) */}
        <div className="flex rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
          {(['live', 'replay'] as ChartMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setChartMode(mode)}
              className={`px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                chartMode === mode
                  ? 'bg-[#C9A646] text-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={mode === 'live' ? 'Live historical chart with manual price entry' : 'Time-travel replay — pick a moment, PLAY, trade live'}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Date picker — Replay mode only */}
        {chartMode === 'replay' && (
          <DateTimePicker
            value={replayStart}
            interval={barInterval}
            onChange={setReplayStart}
          />
        )}

        {/* Active Strategy dropdown (Phase 4) — both modes */}
        <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1">
          <Sparkles size={12} className="text-[#C9A646]" />
          <select
            value={activeStrategyId ?? ''}
            onChange={(e) => setActiveStrategyId(e.target.value || null)}
            className="bg-transparent text-xs font-medium text-zinc-300 focus:outline-none"
            title="Tag new trades with this strategy for per-strategy stats"
          >
            <option value="">No strategy (Manual)</option>
            {strategyLib.strategies.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
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
          {/* Run Strategy dropdown — Live mode only */}
          {chartMode === 'live' && (
          <div className="relative">
            <button
              onClick={() => setStrategyPickerOpen((v) => !v)}
              disabled={runStatus === 'running'}
              className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                runStatus === 'done'
                  ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
                  : runStatus === 'error'
                  ? 'border-rose-700 bg-rose-950 text-rose-400'
                  : runStatus === 'running'
                  ? 'border-zinc-700 bg-zinc-900 text-zinc-500 cursor-wait'
                  : 'border-emerald-700/40 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/60'
              }`}
              title={runError ?? runSummary ?? 'Run a saved strategy on this chart'}
            >
              <Play size={12} />
              {runStatus === 'running' ? 'Running…' : runStatus === 'done' ? 'Ran' : runStatus === 'error' ? 'Failed' : 'Run Strategy'}
              <ChevronDown size={12} />
            </button>
            {strategyPickerOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-md border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
                {strategyLib.strategies.length === 0 ? (
                  <div className="px-2 py-3 text-center text-xs text-zinc-500">
                    No saved strategies. Build one in the
                    <span className="ml-1 text-[#C9A646]">Builder</span> tab first.
                  </div>
                ) : (
                  <>
                    <div className="mb-1 px-2 text-[10px] uppercase tracking-wider text-zinc-500">
                      Saved strategies ({strategyLib.strategies.length})
                    </div>
                    {strategyLib.strategies.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleRunStrategy(s.id)}
                        className="block w-full rounded px-2 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-900"
                      >
                        {s.name}
                        <span className="ml-2 text-[10px] text-zinc-600">
                          {s.rules.length} rule{s.rules.length !== 1 && 's'}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          )}
          <button
            onClick={handleSaveSession}
            disabled={saveStatus === 'saving'}
            className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              saveStatus === 'saved'
                ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
                : saveStatus === 'error'
                ? 'border-rose-700 bg-rose-950 text-rose-400'
                : saveStatus === 'saving'
                ? 'border-zinc-700 bg-zinc-900 text-zinc-500 cursor-wait'
                : 'border-[#C9A646]/40 bg-[#C9A646]/5 text-[#C9A646] hover:bg-[#C9A646]/10'
            }`}
            title={saveError ?? 'Save this session to your journal'}
          >
            {saveStatus === 'saved' ? (
              <><Check size={12} />Saved</>
            ) : saveStatus === 'error' ? (
              <><AlertCircle size={12} />Error</>
            ) : (
              <><Save size={12} />{saveStatus === 'saving' ? 'Saving…' : 'Save'}</>
            )}
          </button>
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
        {/* Chart — Live (FinotaurChart) or Replay (BacktestReplayChart) */}
        <div className="flex-1 min-w-0 bg-[#08080a]">
          {chartMode === 'live' ? (
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
          ) : (
            <BacktestReplayChart
              symbol={symbol}
              interval={barInterval}
              dataSource={dataSource}
              replayStartTime={Math.floor(replayStart.getTime() / 1000)}
              activePosition={state.activePosition}
              closedPositions={state.closedPositions}
              onBarReveal={handleReplayBarReveal}
              onBarClick={handleReplayBarClick}
              height="100%"
            />
          )}
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
              <div>
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
                {tradeError && (
                  <div className="mt-2 flex items-start gap-2 rounded-md border border-rose-800 bg-rose-950/50 px-2.5 py-1.5 text-xs text-rose-300">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    <span>{tradeError}</span>
                  </div>
                )}
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

            {/* Phase 4: per-strategy breakdown. Shown only when there's ≥1 trade. */}
            {strategyBreakdown.length > 0 && (
              <div className="mt-4 border-t border-zinc-900 pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
                  <Sparkles size={10} className="text-[#C9A646]" />
                  By strategy
                </div>
                <div className="space-y-1.5 text-xs">
                  {strategyBreakdown.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between rounded-md border border-zinc-900 bg-zinc-900/40 px-2 py-1.5"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-zinc-300">{row.label}</span>
                        <span className="text-[10px] text-zinc-600">
                          {row.trades} trade{row.trades !== 1 && 's'} · {row.winRate.toFixed(0)}% win
                        </span>
                      </div>
                      <span className={`font-bold tabular-nums ${row.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {row.netPnl >= 0 ? '+' : ''}${row.netPnl.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
