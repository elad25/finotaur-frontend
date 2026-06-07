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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { UTCTimestamp } from 'lightweight-charts';
import { X, RotateCcw, Save, Check, AlertCircle, Play, ChevronDown, ArrowLeft, Star } from 'lucide-react';
import { toast } from 'sonner';
import { PlaceOrderPanel, type PlaceOrderDraft, type PlaceOrderSubmit } from '@/components/backtest/PlaceOrderPanel';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { saveBacktestTradesToJournal } from '@/lib/backtest/journaling';
import type { BacktestSession } from '@/types/backtestSession';

import { pickDataSource } from '@/components/charting/dataSources';
import type { Bar, ChartMarker, Interval } from '@/components/charting/types';
import type { PositionBoxModel } from '@/components/charting/PositionBox';
import { displaySymbol } from '@/utils/displaySymbol';
import {
  useBacktestSession,
  computeStatsByStrategy,
  type PaperPosition,
  type PaperSide,
  type PendingOrder,
  type PendingOrderType,
} from '@/hooks/useBacktestSession';
import { useBacktestPersistence } from '@/hooks/useBacktestPersistence';
import { useQueryClient } from '@tanstack/react-query';
import { backtestStatsKeys } from '@/hooks/useBacktestStats';
import { useStrategyLibrary } from '@/hooks/useStrategyLibrary';
import { runStrategy } from '@/core/backtest/runStrategy';
import { BacktestReplayChart, type ContextMenuPriceInfo } from './BacktestReplayChart';
import { DateTimePicker } from './DateTimePicker';
import { SymbolAutocomplete } from './SymbolAutocomplete';
import { detectAssetClass, type AssetClass } from './symbolUniverse';


// ─── Interval selector config ──────────────────────────────────
// All intervals that chart-bars/Yahoo supports, grouped for the dropdown.
// '60m' is the canonical hour value in this codebase (toYahooInterval maps it
// to '1h' before hitting Yahoo); '1h' is also in the Interval type but we use
// '60m' here to match the existing state default and persistence format.
interface IntervalOption {
  value: Interval;
  label: string;
}
const INTERVAL_GROUPS: { heading: string; items: IntervalOption[] }[] = [
  {
    heading: 'Minutes',
    items: [
      { value: '1m',  label: '1m'  },
      { value: '2m',  label: '2m'  },
      { value: '5m',  label: '5m'  },
      { value: '15m', label: '15m' },
      { value: '30m', label: '30m' },
    ],
  },
  {
    heading: 'Hours',
    items: [
      { value: '60m', label: '1h' },
      { value: '4h',  label: '4h' },
    ],
  },
  {
    heading: 'Days',
    items: [
      { value: '1d',  label: '1D'  },
      { value: '1wk', label: '1W'  },
    ],
  },
];

const DEFAULT_FAVORITES: Interval[] = ['1m', '5m', '15m', '60m', '4h', '1d'];
const LS_FAVORITES_KEY = 'finotaur.backtest.intervalFavorites';

function loadFavorites(): Interval[] {
  try {
    const raw = localStorage.getItem(LS_FAVORITES_KEY);
    if (!raw) return DEFAULT_FAVORITES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as Interval[];
  } catch {
    // ignore parse errors
  }
  return DEFAULT_FAVORITES;
}

function saveFavorites(favs: Interval[]): void {
  try {
    localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify(favs));
  } catch {
    // ignore storage errors
  }
}

// Display label for an interval value (e.g. '60m' → '1h', '1wk' → '1W').
function intervalLabel(iv: Interval): string {
  for (const group of INTERVAL_GROUPS) {
    const opt = group.items.find((o) => o.value === iv);
    if (opt) return opt.label;
  }
  return iv;
}

// Lookback windows tuned to Yahoo's per-barInterval limits (1m → 7d, 5m → 60d,
// 1d → unlimited). Crypto from Binance has no equivalent ceiling but we keep
// the same windows for UX consistency.
function lookbackSeconds(barInterval: Interval): number {
  switch (barInterval) {
    case '1m': return 7 * 24 * 60 * 60;        // 7 days
    case '2m': return 14 * 24 * 60 * 60;        // 14 days
    case '5m': return 30 * 24 * 60 * 60;        // 30 days
    case '15m': return 60 * 24 * 60 * 60;       // 60 days
    case '30m': return 90 * 24 * 60 * 60;       // 90 days
    case '60m':
    case '1h':
    case '4h': return 180 * 24 * 60 * 60;       // 180 days
    case '1d':
    case '1wk':
    case '1mo': return 5 * 365 * 24 * 60 * 60;  // 5 years
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


// ─── IntervalSelector — TradingView-style favorites row + categorized dropdown ─
// Favorites row shows starred intervals as small buttons (selected one gold).
// Chevron button at the end opens a dropdown grouped by Minutes / Hours / Days.
// Each row in the dropdown: click label → select; click star → toggle favorite.
// Favorites persist in localStorage under LS_FAVORITES_KEY.
function IntervalSelector({
  value,
  onChange,
}: {
  value: Interval;
  onChange: (iv: Interval) => void;
}) {
  const [favorites, setFavorites] = useState<Interval[]>(loadFavorites);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click or Escape (mirrors SymbolAutocomplete pattern).
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggleFavorite = (iv: Interval, e: { stopPropagation(): void }) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(iv)
        ? prev.filter((f) => f !== iv)
        : [...prev, iv];
      saveFavorites(next);
      return next;
    });
  };

  const selectInterval = (iv: Interval) => {
    onChange(iv);
    setOpen(false);
  };

  // Preserve the order from INTERVAL_GROUPS for display.
  const allOrderedIntervals = INTERVAL_GROUPS.flatMap((g) => g.items.map((i) => i.value));
  const favoritesOrdered = allOrderedIntervals.filter((iv) => favorites.includes(iv));

  return (
    <div className="relative flex items-center" ref={containerRef}>
      {/* Favorites row + chevron — unified rounded pill container (brand gold) */}
      <div className="flex items-center gap-0.5 rounded-lg border border-[#C9A646]/20 bg-zinc-900/80 p-1">
        {favoritesOrdered.map((iv) => (
          <button
            key={iv}
            type="button"
            onClick={() => selectInterval(iv)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
              value === iv
                ? 'bg-gradient-to-b from-[#D9B65A] to-[#C9A646] font-semibold text-black shadow-[0_0_10px_rgba(201,166,70,0.45)]'
                : 'text-zinc-400 hover:bg-[#C9A646]/10 hover:text-[#C9A646]'
            }`}
          >
            {intervalLabel(iv)}
          </button>
        ))}
        {/* Chevron toggle button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="More intervals"
          className={`flex items-center justify-center rounded-md px-2 py-1.5 transition-colors hover:bg-[#C9A646]/10 hover:text-[#C9A646] ${
            open ? 'text-[#C9A646]' : 'text-zinc-400'
          }`}
        >
          <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown panel — styled to match Run Strategy / ActiveStrategy dropdowns */}
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[160px] rounded-md border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
          {INTERVAL_GROUPS.map((group) => (
            <div key={group.heading} className="mb-1 last:mb-0">
              <div className="mb-1 px-2 text-[10px] uppercase tracking-wider text-zinc-500">
                {group.heading}
              </div>
              {group.items.map(({ value: iv, label }) => {
                const isSelected = value === iv;
                const isFav = favorites.includes(iv);
                return (
                  <div
                    key={iv}
                    className={`flex items-center justify-between rounded px-2 py-1 ${
                      isSelected ? 'bg-[#C9A646]/10' : 'hover:bg-zinc-900'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectInterval(iv)}
                      className={`flex-1 text-left text-sm font-medium ${
                        isSelected ? 'text-[#C9A646]' : 'text-zinc-300'
                      }`}
                    >
                      {label}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(iv, e)}
                      aria-label={isFav ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
                      className="ml-2 flex-shrink-0 p-0.5"
                    >
                      <Star
                        size={12}
                        className={
                          isFav
                            ? 'fill-[#C9A646] text-[#C9A646]'
                            : 'fill-none text-zinc-600 hover:text-zinc-400'
                        }
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── Component ─────────────────────────────────────────────────
export interface BacktestChartProps {
  initialSymbol?: string;
  initialInterval?: Interval;
  startingBalance?: number;
  /** Active session id — scopes persisted paper-trading state per session. */
  sessionId?: string;
  theme?: 'dark' | 'light';
}

export function BacktestChart({
  initialSymbol = 'MNQ=F',
  initialInterval = '5m',
  startingBalance = 10000,
  sessionId,
  theme = 'dark',
}: BacktestChartProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  // Asset class is derived from the symbol — no separate user control.
  const assetClass = useMemo<AssetClass>(() => detectAssetClass(symbol), [symbol]);
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

  // Live market price, updated from currentBarRef on each bar change.
  const [marketPrice, setMarketPrice] = useState(0);

  // Live draft from PlaceOrderPanel — lets right-click and click-to-place use
  // the panel's current size/SL/TP without duplicating input state here.
  const [orderDraft, setOrderDraft] = useState<PlaceOrderDraft>({ size: 0, stopLoss: null, takeProfit: null });

  // Click-to-place LIMIT armed toggle. When true, left-click on the chart drops
  // a LIMIT order at that price instead of opening/jumping.
  const [placeArmed, setPlaceArmed] = useState(false);

  // Journal save state
  const [isSaving, setIsSaving] = useState(false);

  const { id: userId } = useEffectiveUser();

  const session = useBacktestSession(startingBalance, sessionId);
  const {
    state,
    openPosition,
    closePosition,
    updateStopLoss,
    updateTakeProfit,
    reset,
    loadTrades,
    loadSession,
    addPendingOrder,
    cancelPendingOrder,
    fillPendingOrder,
    updatePendingRisk,
  } = session;

  // Phase 2: Supabase persistence for "Save Session" button.
  const persistence = useBacktestPersistence();
  const queryClient = useQueryClient();
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

  // Floating stats popup collapse state — starts open.
  const [statsPanelOpen, setStatsPanelOpen] = useState(true);

  // Phase 6: right-click context menu for pending order types. Position
  // captured from the chart click; menu closes on outside click or after
  // a selection is made.
  const [contextMenu, setContextMenu] = useState<ContextMenuPriceInfo | null>(null);

  // Phase 4: replay start moment. Defaults to "now − 4 hours" so the trader
  // immediately sees recent history with room to PLAY forward.
  const [replayStart, setReplayStart] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getTime() - 4 * 60 * 60 * 1000);
  });

  // Phase 4: active strategy tag. Every trade opened while this is set will
  // be attributed to the strategy in stats breakdown + saved session record.
  const [activeStrategyId] = useState<string | null>(null);
  const activeStrategy = useMemo(
    () => strategyLib.strategies.find((s) => s.id === activeStrategyId) ?? null,
    [strategyLib.strategies, activeStrategyId],
  );

  const dataSource = useMemo(() => pickDataSource(symbol), [symbol]);

  // Bar window for the Run Strategy fetch (data-driven, mode-independent).
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

  // Holds the most-recent cursor bar reported by BacktestReplayChart — used to
  // fill MARKET orders at the correct close price without requiring manual input.
  const currentBarRef = useRef<Bar | null>(null);

  // Phase 7: load a saved session from the URL ?sessionId= param.
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');
  const hydratedRef = useRef<string | null>(null);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionIdParam) return;
    if (hydratedRef.current === sessionIdParam) return; // prevent double-hydrate
    hydratedRef.current = sessionIdParam;
    let cancelled = false;
    (async () => {
      try {
        const detail = await persistence.loadSession(sessionIdParam);
        if (cancelled) return;
        // 1. Restore chart context (asset/symbol/interval).
        setSymbol(detail.session.symbol);
        setBarInterval(detail.session.interval as Interval);
        // 2. Map DB rows (snake_case) → in-memory shapes (camelCase).
        const closedPositions: PaperPosition[] = detail.trades.map((t) => ({
          id: t.id,
          side: t.side,
          entryTime: Math.floor(new Date(t.entry_time).getTime() / 1000),
          entryPrice: t.entry_price,
          size: t.size,
          stopLoss: t.stop_loss ?? undefined,
          takeProfit: t.take_profit ?? undefined,
          exitTime: t.exit_time != null ? Math.floor(new Date(t.exit_time).getTime() / 1000) : undefined,
          exitPrice: t.exit_price ?? undefined,
          pnl: t.pnl ?? undefined,
          pnlPercent: t.pnl_percent ?? undefined,
          exitReason: t.exit_reason ?? undefined,
          strategyId: t.strategy_id ?? null,
        }));
        // D8 (Sprint D, 2026-05-30): anchor the replay window to the first
        // trade rather than the session's start_date — otherwise the markers
        // can land outside the initially-loaded bar window and look missing.
        // Falls back to the session start_date when there are no trades.
        const firstTradeTime = closedPositions.reduce<number | null>(
          (min, p) => (min === null || p.entryTime < min ? p.entryTime : min),
          null,
        );
        setReplayStart(
          firstTradeTime !== null
            ? new Date(firstTradeTime * 1000)
            : new Date(detail.session.start_date),
        );
        const pendingOrders: PendingOrder[] = (detail.session.pending_orders ?? []).map((o) => ({
          id: o.id,
          side: o.side,
          type: o.type,
          triggerPrice: o.trigger_price,
          size: o.size,
          stopLoss: o.stop_loss ?? undefined,
          takeProfit: o.take_profit ?? undefined,
          strategyId: o.strategy_id ?? null,
          createdAt: o.created_at,
        }));
        // 3. Hydrate the session reducer.
        loadSession({
          startingBalance: detail.session.initial_balance,
          closedPositions,
          pendingOrders,
        });
        setHydrateError(null);
      } catch (err) {
        if (!cancelled) setHydrateError(err instanceof Error ? err.message : 'Failed to load saved session');
      }
    })();
    return () => { cancelled = true; };
  }, [sessionIdParam, persistence, loadSession]);

  // ─── Handlers ────────────────────────────────────────────────
  const handleOpen = (side: PaperSide) => {
    const cur = currentBarRef.current;
    const manual = parseFloat(livePrice);
    const price = (!isNaN(manual) && manual > 0) ? manual : cur?.close;
    if (price == null || !(price > 0)) {
      flashTradeError('No price yet — let the replay chart load a bar first.');
      return;
    }
    openPosition({
      side,
      price,
      time: (cur?.time as number) ?? Math.floor(Date.now() / 1000),
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

  // Replay: each bar revealed by the playback cursor.
  //   Phase 4: check SL/TP for any active position; auto-close on hit.
  //   Phase 6: check pending order triggers (LIMIT/STOP); auto-fill on hit
  //            ONLY when no position is open (single-position invariant).
  // Same-bar-as-entry skip mirrors runStrategy.ts to avoid phantom stopouts
  // on the entry bar.
  const handleReplayBarReveal = useCallback((bar: Bar) => {
    // Phase 6: pending order fills come FIRST. If a fill happens, the new
    // position is the entry bar — same-bar skip prevents same-bar SL/TP.
    if (!state.activePosition && state.pendingOrders.length > 0) {
      for (const order of state.pendingOrders) {
        let triggered = false;
        let fillPrice = order.triggerPrice;
        if (order.type === 'LIMIT') {
          if (order.side === 'LONG' && bar.low <= order.triggerPrice) {
            triggered = true; fillPrice = order.triggerPrice;
          } else if (order.side === 'SHORT' && bar.high >= order.triggerPrice) {
            triggered = true; fillPrice = order.triggerPrice;
          }
        } else { // STOP
          if (order.side === 'LONG' && bar.high >= order.triggerPrice) {
            triggered = true; fillPrice = order.triggerPrice;
          } else if (order.side === 'SHORT' && bar.low <= order.triggerPrice) {
            triggered = true; fillPrice = order.triggerPrice;
          }
        }
        if (triggered) {
          fillPendingOrder(order.id, fillPrice, bar.time as number);
          return; // single-position invariant — skip SL/TP this bar
        }
      }
    }

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
  }, [state.activePosition, state.pendingOrders, closePosition, fillPendingOrder]);

  // Phase 6: place a pending order from the context-menu selection. Size/SL/TP
  // come from the PlaceOrderPanel draft (orderDraft), falling back to the legacy
  // input state so existing behaviour is preserved when the panel has no values.
  const handlePlacePendingOrder = useCallback((side: PaperSide, type: PendingOrderType, info: ContextMenuPriceInfo) => {
    addPendingOrder({
      side,
      type,
      triggerPrice: info.price,
      size: orderDraft.size > 0 ? orderDraft.size : size,
      stopLoss: orderDraft.stopLoss ?? (slInput ? parseFloat(slInput) : undefined),
      takeProfit: orderDraft.takeProfit ?? (tpInput ? parseFloat(tpInput) : undefined),
      strategyId: activeStrategyId,
      time: Math.floor(Date.now() / 1000),
    });
    setContextMenu(null);
  }, [addPendingOrder, orderDraft, size, slInput, tpInput, activeStrategyId]);

  // Click-to-place LIMIT: the trader arms a mode, then clicks a price level.
  // Below current price → BUY LIMIT (buy the dip); above → SELL LIMIT (sell the rip).
  const handlePlaceLimitAtPrice = useCallback((price: number, currentPrice: number) => {
    if (state.activePosition) {
      flashTradeError('Position already open — close it or wait for SL/TP.');
      return;
    }
    const side: PaperSide = price <= currentPrice ? 'LONG' : 'SHORT';
    addPendingOrder({
      side,
      type: 'LIMIT',
      triggerPrice: price,
      size: orderDraft.size > 0 ? orderDraft.size : size,
      stopLoss: orderDraft.stopLoss ?? undefined,
      takeProfit: orderDraft.takeProfit ?? undefined,
      strategyId: activeStrategyId,
      time: (currentBarRef.current?.time as number) ?? Math.floor(Date.now() / 1000),
    });
    // Auto-disarm after placing so the next click is a normal bar-click.
    setPlaceArmed(false);
  }, [state.activePosition, addPendingOrder, orderDraft, size, activeStrategyId, flashTradeError]);

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


  const handleClose = useCallback((reason: 'manual' | 'sl' | 'tp' = 'manual') => {
    // Prefer the replay cursor price (currentBarRef); fall back to manually
    // typed livePrice; fail clearly if neither is available.
    const cursorPrice = currentBarRef.current?.close;
    const manualPrice = parseFloat(livePrice);
    const price = (cursorPrice && cursorPrice > 0) ? cursorPrice : (!isNaN(manualPrice) && manualPrice > 0) ? manualPrice : null;
    if (price == null) {
      flashTradeError('No price yet — wait for the replay chart to reveal a bar.');
      return;
    }
    closePosition({
      price,
      time: (currentBarRef.current?.time as number) ?? Math.floor(Date.now() / 1000),
      reason,
    });
  }, [currentBarRef, livePrice, flashTradeError, closePosition]);

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
        pendingOrders: state.pendingOrders,
        // Auto-name: "<symbol> · <interval> · <date>" (display ticker, no =F/=X)
        name: `${displaySymbol(symbol)} · ${barInterval} · ${new Date().toLocaleDateString()}`,
        // Session-level strategy link — last active strategy at save time.
        // Per-trade strategy_id is already persisted via trades[].strategy_id.
        // Enables FINOTAUR AI Phase F compare_live_vs_backtest. 2026-05-29.
        strategyId: activeStrategyId,
      });
      // Refresh the aggregated backtest dashboard / My-Trades table so the
      // just-saved session's trades appear immediately (they're React-Query
      // cached with a 60s staleTime; without this they'd lag until refetch).
      queryClient.invalidateQueries({ queryKey: backtestStatsKeys.all });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save session');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  // ─── PlaceOrderPanel adapter ──────────────────────────────────
  // Translates PlaceOrderPanel's submit payload into useBacktestSession actions.
  const handlePanelSubmit = useCallback((order: PlaceOrderSubmit) => {
    if (state.activePosition) {
      flashTradeError('Position already open — close it or wait for SL/TP.');
      return;
    }
    const time = (currentBarRef.current?.time as number) ?? Math.floor(Date.now() / 1000);
    const sl = order.stopLoss ?? undefined;
    const tp = order.takeProfit ?? undefined;
    const side: PaperSide = order.side === 'buy' ? 'LONG' : 'SHORT';
    if (order.kind === 'market') {
      openPosition({
        side,
        price: order.price,
        time,
        size: order.size,
        stopLoss: sl,
        takeProfit: tp,
        strategyId: activeStrategyId,
      });
    } else {
      addPendingOrder({
        side,
        type: order.kind === 'limit' ? 'LIMIT' : 'STOP',
        triggerPrice: order.price,
        size: order.size,
        stopLoss: sl,
        takeProfit: tp,
        strategyId: activeStrategyId,
        time,
      });
    }
  }, [state.activePosition, openPosition, addPendingOrder, activeStrategyId, flashTradeError]);

  // ─── Save-to-journal handler ──────────────────────────────────
  const handleSaveToJournal = useCallback(async () => {
    if (!userId) {
      toast.error('Sign in to save trades to your journal');
      return;
    }
    // Map closed PaperPositions to BacktestPositionLike for journaling.ts
    const closed = state.closedPositions.filter((p) => p.exitPrice != null);
    if (closed.length === 0) {
      toast.info('No closed trades to save yet');
      return;
    }
    setIsSaving(true);
    try {
      // Reconstruct a minimal BacktestSession from available state.
      const sessionObj: BacktestSession = {
        id: `chart:${symbol}:${barInterval}`,
        name: `${displaySymbol(symbol)} · ${barInterval} · ${new Date().toLocaleDateString()}`,
        symbol,
        timeframe: barInterval,
        assetType: assetClass,
        startBalance: state.startingBalance,
        leverage: 1,
        strategyId: activeStrategyId ?? null,
        strategyName: activeStrategy?.name ?? null,
        dateRange: {
          from: new Date(from * 1000).toISOString().slice(0, 10),
          to: new Date(to * 1000).toISOString().slice(0, 10),
        },
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const res = await saveBacktestTradesToJournal(
        // PaperPosition is a superset of BacktestPositionLike — safe cast; any
        // unrecognised fields are ignored by the journal function.
        closed as Parameters<typeof saveBacktestTradesToJournal>[0],
        sessionObj,
        userId,
      );
      if (res.errors > 0) {
        toast.error('Failed to save some trades to journal');
      } else {
        toast.success(
          `Saved ${res.saved} trade${res.saved === 1 ? '' : 's'} to journal${activeStrategy ? ` · ${activeStrategy.name}` : ''}`,
        );
      }
    } catch {
      toast.error('Failed to save trades to journal');
    } finally {
      setIsSaving(false);
    }
  }, [userId, state.closedPositions, state.startingBalance, symbol, barInterval, assetClass, activeStrategyId, activeStrategy, from, to]);

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

  // ─── Draggable risk/reward position box ──────────────────────
  // Built from the active position, or — when none is open — the first pending
  // (limit/stop) order so the box shows BEFORE the order fills. Dragging the
  // stop/target handles commits the real SL/TP back to state. currentPrice is
  // injected by BacktestReplayChart from the live cursor bar.
  const positionOverlay = useMemo<
    | {
        model: PositionBoxModel;
        onStopLossChange: (price: number) => void;
        onTakeProfitChange: (price: number) => void;
        onEntryChange?: (price: number) => void;
      }
    | undefined
  >(() => {
    const tickSize = assetClass === 'futures' ? 0.25 : 0.01;
    if (state.activePosition) {
      const p = state.activePosition;
      return {
        model: {
          side: p.side,
          entryPrice: p.entryPrice,
          entryTime: p.entryTime as number,
          size: p.size,
          stopLoss: p.stopLoss,
          takeProfit: p.takeProfit,
          isPending: false,
          tickSize,
        },
        onStopLossChange: (price: number) => updateStopLoss(price),
        onTakeProfitChange: (price: number) => updateTakeProfit(price),
        // No onEntryChange — entry price is fixed after fill.
      };
    }
    const pending = state.pendingOrders[0];
    if (pending) {
      return {
        model: {
          side: pending.side,
          entryPrice: pending.triggerPrice,
          entryTime: pending.createdAt,
          size: pending.size,
          stopLoss: pending.stopLoss,
          takeProfit: pending.takeProfit,
          isPending: true,
          tickSize,
        },
        onStopLossChange: (price: number) => updatePendingRisk(pending.id, { stopLoss: price }),
        onTakeProfitChange: (price: number) => updatePendingRisk(pending.id, { takeProfit: price }),
        onEntryChange: (price: number) => updatePendingRisk(pending.id, { triggerPrice: price }),
      };
    }
    return undefined;
  }, [state.activePosition, state.pendingOrders, assetClass, updateStopLoss, updateTakeProfit, updatePendingRisk]);

  // ─── Render ──────────────────────────────────────────────────
  // Phase 5: fullscreen-by-default. position:fixed inset-0 covers the
  // app-level topnav + journal sub-nav. Exit button returns to overview.
  const containerCls = isFullScreen
    ? 'fixed inset-0 z-[100] flex flex-col bg-[#08080a] text-zinc-100'
    : 'flex h-full w-full flex-col bg-[#08080a] text-zinc-100';

  return (
    <div className={containerCls}>
      {/* Session hydration error — shown when ?sessionId= fetch fails */}
      {hydrateError && (
        <div className="mx-4 mt-2 flex items-center justify-between gap-3 rounded-md border border-rose-800 bg-rose-950/60 px-3 py-2 text-xs text-rose-300">
          <span><AlertCircle size={12} className="mr-1.5 inline" />Failed to load saved session: {hydrateError}</span>
          <button onClick={() => setHydrateError(null)} className="shrink-0 text-rose-400 hover:text-rose-200"><X size={12} /></button>
        </div>
      )}
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

        {/* Symbol picker — type-ahead autocomplete across all asset classes
            (Tier 1 2026-05-30). Asset class auto-detected from chosen symbol. */}
        <SymbolAutocomplete
          symbol={symbol}
          assetClass={assetClass}
          onSelect={(next) => { setSymbol(next); setLivePrice(''); }}
        />

        {/* Interval picker — TradingView-style favorites row + categorized dropdown */}
        <IntervalSelector value={barInterval} onChange={setBarInterval} />

        {/* Date picker */}
        <DateTimePicker
          value={replayStart}
          interval={barInterval}
          onChange={setReplayStart}
        />

        {/* Run Strategy — moved left (after DateTimePicker) so balance group stays clean */}
        <div className="relative">
          <button
            onClick={() => setStrategyPickerOpen((v) => !v)}
            disabled={runStatus === 'running'}
            className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
              runStatus === 'done'
                ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
                : runStatus === 'error'
                ? 'border-rose-700 bg-rose-950 text-rose-400'
                : runStatus === 'running'
                ? 'border-zinc-700 bg-zinc-900 text-zinc-500 cursor-wait'
                : 'border-[#C9A646]/50 bg-gradient-to-b from-[#D9B65A] to-[#C9A646] text-black shadow-[0_0_12px_rgba(201,166,70,0.4)] hover:shadow-[0_0_16px_rgba(201,166,70,0.55)]'
            }`}
            title={runError ?? runSummary ?? 'Run a saved strategy on this chart'}
          >
            <Play size={12} />
            {runStatus === 'running' ? 'Running…' : runStatus === 'done' ? 'Ran' : runStatus === 'error' ? 'Failed' : 'Run Strategy'}
            <ChevronDown size={12} />
          </button>
          {strategyPickerOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
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

        {/* Balance display */}
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            {/* Starting balance is fixed to the value set in the create-session
                popup — locked (read-only) for the whole session. */}
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Starting</div>
            <div
              className="text-sm font-semibold text-zinc-200"
              title="Set when you created the session"
            >
              ${state.startingBalance.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Net P&L</div>
            <div className={`text-sm font-semibold ${state.stats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {state.stats.netPnl >= 0 ? '+' : ''}${state.stats.netPnl.toFixed(2)}
            </div>
          </div>
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

      {/* Main: chart area + right-rail PlaceOrderPanel. The inner container
          reserves pr-80 (= w-80 = 320px) so BacktestReplayChart renders in
          the left portion while the right rail overlays the reserved space. */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="relative flex-1 min-w-0 bg-[#08080a] pr-80">
          <BacktestReplayChart
            symbol={symbol}
            interval={barInterval}
            dataSource={dataSource}
            replayStartTime={Math.floor(replayStart.getTime() / 1000)}
            activePosition={state.activePosition}
            closedPositions={state.closedPositions}
            pendingOrders={state.pendingOrders}
            onBarReveal={handleReplayBarReveal}
            onBarClick={handleReplayBarClick}
            onCurrentBarChange={(b) => { currentBarRef.current = b; if (b) setMarketPrice(b.close); }}
            onContextMenu={(info) => setContextMenu(info)}
            onJumpToTime={(date) => setReplayStart(date)}
            showReplayCursor
            height="100%"
            positionOverlay={positionOverlay}
            placeOrderArmed={placeArmed}
            onPlaceLimitAtPrice={handlePlaceLimitAtPrice}
            onCancelPending={cancelPendingOrder}
            onUpdateSL={updateStopLoss}
            onUpdateTP={updateTakeProfit}
            onUpdatePendingPrice={(orderId, price) => updatePendingRisk(orderId, { triggerPrice: price })}
          />
          {/* Right rail — PlaceOrderPanel + open-position card + Save to journal */}
          <div className="absolute right-0 top-0 bottom-0 z-30 w-80 overflow-y-auto border-l border-white/10 bg-[#0A0A0A]/95 p-3 flex flex-col gap-3">
            <PlaceOrderPanel
              marketPrice={marketPrice}
              symbol={displaySymbol(symbol)}
              currentBalance={state.startingBalance + state.stats.netPnl}
              initialBalance={state.startingBalance}
              onSubmit={handlePanelSubmit}
              onDraftChange={setOrderDraft}
            />

            {/* Open position card — only when a position is live */}
            {state.activePosition && (
              <div className={`rounded-xl border p-3 ${state.activePosition.side === 'LONG' ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-rose-500/30 bg-rose-950/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">Open Position</span>
                  <span className={`flex items-center gap-1.5 text-xs font-bold ${state.activePosition.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${state.activePosition.side === 'LONG' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {state.activePosition.side}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs mb-3">
                  <div>
                    <span className="text-gray-500">Size</span>
                    <span className="ml-2 font-mono text-white">{state.activePosition.size}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Entry</span>
                    <span className="ml-2 font-mono text-white">${state.activePosition.entryPrice.toFixed(2)}</span>
                  </div>
                  {state.activePosition.stopLoss != null && (
                    <div>
                      <span className="text-rose-400/70">SL</span>
                      <span className="ml-2 font-mono text-rose-400">${state.activePosition.stopLoss.toFixed(2)}</span>
                    </div>
                  )}
                  {state.activePosition.takeProfit != null && (
                    <div>
                      <span className="text-emerald-400/70">TP</span>
                      <span className="ml-2 font-mono text-emerald-400">${state.activePosition.takeProfit.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleClose('manual')}
                  className="w-full rounded-lg border border-zinc-700 bg-black py-2 text-xs font-bold text-white transition-colors hover:border-zinc-500 hover:bg-zinc-900"
                >
                  Close Position
                </button>
              </div>
            )}

            {/* Session Stats — compact in-rail panel */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setStatsPanelOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#C9A646] hover:bg-zinc-900/60"
              >
                <span>Session Stats</span>
                <ChevronDown size={13} className={`transition-transform ${statsPanelOpen ? '' : '-rotate-90'}`} />
              </button>
              {statsPanelOpen && (
                <div className="border-t border-zinc-800 p-2.5">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
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
                  {strategyBreakdown.length > 0 && (
                    <div className="mt-2 border-t border-zinc-800 pt-2.5">
                      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#C9A646]">By Strategy</h3>
                      <div className="space-y-1 text-[11px]">
                        {strategyBreakdown.map((row) => (
                          <div
                            key={row.key}
                            className="flex items-center justify-between rounded-md border border-zinc-900 bg-zinc-900/40 px-2 py-1"
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
              )}
            </div>

            {/* Trade error display */}
            {tradeError && (
              <p className="rounded-md border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-400">{tradeError}</p>
            )}

            {/* Save to journal */}
            <button
              onClick={handleSaveToJournal}
              disabled={isSaving}
              className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-[#C9A646]/40 bg-[#C9A646]/5 py-2.5 text-xs font-semibold text-[#C9A646] transition-colors hover:bg-[#C9A646]/10 disabled:cursor-wait disabled:opacity-60"
            >
              <Save size={13} />
              {isSaving ? 'Saving…' : 'Save to journal'}
            </button>

            {/* Click-to-place LIMIT toggle */}
            <button
              type="button"
              onClick={() => setPlaceArmed((v) => !v)}
              className={`w-full rounded-xl border py-2 text-xs font-semibold transition-colors ${
                placeArmed
                  ? 'border-[#C9A646]/60 bg-[#C9A646]/10 text-[#C9A646]'
                  : 'border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-[#C9A646]/30 hover:text-zinc-200'
              }`}
            >
              {placeArmed ? 'Armed — click a price' : 'Click-to-place limit'}
            </button>

            {/* Contextual hint */}
            {placeArmed ? (
              <p className="text-center text-[10px] text-[#C9A646]/80">
                Click a price on the chart to drop a LIMIT order.
              </p>
            ) : (
              <p className="text-center text-[10px] text-zinc-600">Right-click the chart for <span className="text-zinc-500">LIMIT</span> / <span className="text-zinc-500">STOP</span> orders</p>
            )}
          </div>
        </div>
      </div>

      {/* Phase 6: right-click context menu for pending order types.
          Position is fixed to the screen coords from the click. Two options
          are valid depending on price vs current: above current → BUY STOP
          + SELL LIMIT; below current → BUY LIMIT + SELL STOP. */}
      {contextMenu && (
        <>
          {/* Backdrop catches outside clicks to close the menu */}
          <div
            className="fixed inset-0 z-[110]"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div
            className="fixed z-[120] min-w-[200px] rounded-md border border-zinc-700 bg-zinc-950 p-1 shadow-2xl"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 220),
              top: Math.min(contextMenu.y, window.innerHeight - 160),
            }}
          >
            <div className="mb-1 border-b border-zinc-800 px-2 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
              Place order @ <span className="font-mono text-[#C9A646]">${contextMenu.price.toFixed(2)}</span>
            </div>
            {contextMenu.price > contextMenu.currentPrice ? (
              <>
                <button
                  onClick={() => handlePlacePendingOrder('LONG', 'STOP', contextMenu)}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-emerald-400 hover:bg-emerald-950/60"
                >
                  <span className="font-bold">BUY STOP</span>
                  <span className="ml-2 text-[10px] text-zinc-500">(breakout buy)</span>
                </button>
                <button
                  onClick={() => handlePlacePendingOrder('SHORT', 'LIMIT', contextMenu)}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-rose-400 hover:bg-rose-950/60"
                >
                  <span className="font-bold">SELL LIMIT</span>
                  <span className="ml-2 text-[10px] text-zinc-500">(sell into rally)</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handlePlacePendingOrder('LONG', 'LIMIT', contextMenu)}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-emerald-400 hover:bg-emerald-950/60"
                >
                  <span className="font-bold">BUY LIMIT</span>
                  <span className="ml-2 text-[10px] text-zinc-500">(buy the dip)</span>
                </button>
                <button
                  onClick={() => handlePlacePendingOrder('SHORT', 'STOP', contextMenu)}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm text-rose-400 hover:bg-rose-950/60"
                >
                  <span className="font-bold">SELL STOP</span>
                  <span className="ml-2 text-[10px] text-zinc-500">(breakdown short)</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
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
