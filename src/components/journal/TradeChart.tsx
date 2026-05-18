/**
 * TradeChart — domain adapter that maps a Trade into the FinotaurChart primitive.
 *
 * Owns:
 *   - Symbol resolution (raw broker → Yahoo/Binance format via dataSources router)
 *   - Window computation (open_at - padding, close_at + padding / now)
 *   - Interval selection (pickInterval based on duration)
 *   - Marker construction (entry + exit arrows)
 *   - Chip row UI (LONG/SHORT/EXIT/OPEN visual context below the chart)
 *   - Fullscreen Dialog
 *
 * What it does NOT own:
 *   - Bar fetch (FinotaurChart + the injected ChartDataSource handle it)
 *   - Chart rendering (FinotaurChart handles createChart/setMarkers/resize)
 *   - Cache (Edge Function + chart_bars_cache table handle it server-side)
 */

import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock, Maximize2, TrendingUp, X } from 'lucide-react';
import type { UTCTimestamp } from 'lightweight-charts';

import { FinotaurChart } from '@/components/charting/FinotaurChart';
import {
  pickDataSource,
  pickInterval,
  toBinanceSymbol,
  toYahooSymbol,
  isCryptoSymbol,
} from '@/components/charting/dataSources';
import { isIntradayInterval } from '@/components/charting/indicators';
import { IndicatorToolbar } from '@/components/charting/IndicatorToolbar';
import { useIndicatorPreferences } from '@/components/charting/useIndicatorPreferences';
import type { ChartMarker, Indicator } from '@/components/charting/types';
import { INDICATOR_PERIODS } from '@/components/charting/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

// ═══════════════════════════════════════════════════════════════
// Trade shape consumed by TradeChart
// ═══════════════════════════════════════════════════════════════
export interface TradeChartTrade {
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price?: number | null;
  open_at: string;
  close_at?: string | null;
  outcome?: 'WIN' | 'LOSS' | 'BE' | 'OPEN' | null;
  pnl?: number | null;
}

interface TradeChartProps {
  trade: TradeChartTrade;
}

// ═══════════════════════════════════════════════════════════════
// Marker theme — kept here (NOT in FinotaurChart) because these
// are trade-specific semantics, not generic chart styling.
// ═══════════════════════════════════════════════════════════════
const MARKER_COLORS = {
  long: '#10b981',   // emerald-500
  short: '#ef4444',  // rose-500
  exit: '#0ea5e9',   // sky-500
} as const;

// ═══════════════════════════════════════════════════════════════
// Formatters
// ═══════════════════════════════════════════════════════════════
function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPnl(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(openAt: string, closeAt: string | null | undefined): string {
  const start = new Date(openAt).getTime();
  const end = closeAt ? new Date(closeAt).getTime() : Date.now();
  const ms = Math.max(end - start, 0);
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ═══════════════════════════════════════════════════════════════
// Trade → ChartMarker[] (entry + exit arrows)
//
// Marker semantics:
//   - Entry: arrow points INTO the trade direction (LONG = arrowUp from
//     below, SHORT = arrowDown from above). Colored by side.
//   - Exit:  square shape on the opposite side. Sky-blue to be visually
//     distinct from entry arrows. Square (not arrow) reinforces "this is
//     the close, not another entry."
// ═══════════════════════════════════════════════════════════════
function tradeToMarkers(trade: TradeChartTrade): ChartMarker[] {
  const out: ChartMarker[] = [];

  const entryTime = Math.floor(new Date(trade.open_at).getTime() / 1000) as UTCTimestamp;
  if (Number.isFinite(entryTime as number)) {
    // Defensive: entry_price is typed `number` but real data sometimes nulls it
    const entryPriceStr =
      trade.entry_price != null && Number.isFinite(trade.entry_price)
        ? trade.entry_price.toFixed(2)
        : '—';
    out.push({
      time: entryTime,
      position: trade.side === 'LONG' ? 'belowBar' : 'aboveBar',
      shape: trade.side === 'LONG' ? 'arrowUp' : 'arrowDown',
      color: trade.side === 'LONG' ? MARKER_COLORS.long : MARKER_COLORS.short,
      // ▲ prefix telegraphs "this is the open" before the eye reaches the text
      text: `▲ ${trade.side} @ ${entryPriceStr}`,
      size: 2,
    });
  }

  if (trade.close_at && trade.exit_price != null) {
    const exitTime = Math.floor(new Date(trade.close_at).getTime() / 1000) as UTCTimestamp;
    if (Number.isFinite(exitTime as number)) {
      // P&L hint in the text — green/red comes from the color, this just numerifies it
      const pnlSign = trade.pnl != null && trade.pnl > 0 ? '+' : '';
      const pnlSuffix = trade.pnl != null ? ` (${pnlSign}${trade.pnl.toFixed(2)})` : '';
      out.push({
        time: exitTime,
        position: trade.side === 'LONG' ? 'aboveBar' : 'belowBar',
        shape: 'square', // distinct from entry's arrow
        color: MARKER_COLORS.exit,
        text: `■ EXIT @ ${trade.exit_price.toFixed(2)}${pnlSuffix}`,
        size: 2,
      });
    }
  }

  return out;
}

// ═══════════════════════════════════════════════════════════════
// Window computation — Option B: ASYMMETRIC hybrid (per Elad 2026-05-17)
//
// PHILOSOPHY: a journal chart needs:
//   - ENOUGH context BEFORE the entry to see the setup (min 3 days)
//   - ENOUGH context AFTER the exit / now to see immediate aftermath (min 1 day)
//   - For longer trades, scale the PRE-entry padding 1:1 so a 7-day swing
//     still shows the structure that led into it (capped at 14 days)
//   - POST-exit padding scales gentler (0.3x) — once the trade is over,
//     traders care more about "what happened immediately after" than
//     extended weeks of follow-through
//
// Output guarantees:
//   - Scalp (30 min): window = 3d + 30m + 1d = ~4 days
//   - Day trade (4h): window = 3d + 4h + 1d = ~4.2 days
//   - Swing (5d):     window = 5d + 5d + 1.5d = ~11.5 days
//   - Position (14d): window = 14d + 14d + 4.2d = ~32 days
//   - Position (30d): window = 14d + 30d + 9d = ~53 days (cap kicks in)
//
// For OPEN trades, close_at = now(), so `to` = now + ~1 day — Yahoo returns
// no future bars, lightweight-charts renders the empty space as "live edge".
// ═══════════════════════════════════════════════════════════════
const MIN_PADDING_BEFORE_SEC = 3 * 24 * 60 * 60;  // 3 days minimum before entry
const MIN_PADDING_AFTER_SEC = 1 * 24 * 60 * 60;   // 1 day minimum after exit
const PADDING_BEFORE_FRACTION = 1.0;              // 100% of trade duration before
const PADDING_AFTER_FRACTION = 0.3;               // 30% of trade duration after
const MAX_PADDING_SEC = 14 * 24 * 60 * 60;        // cap at 2 weeks per side

function computeWindow(trade: TradeChartTrade): { from: number; to: number; durationMs: number } {
  const openMs = new Date(trade.open_at).getTime();
  const closeMs = trade.close_at ? new Date(trade.close_at).getTime() : Date.now();
  const durationMs = Math.max(closeMs - openMs, 0);
  const durationSec = Math.floor(durationMs / 1000);

  const paddingBefore = Math.min(
    MAX_PADDING_SEC,
    Math.max(MIN_PADDING_BEFORE_SEC, Math.floor(durationSec * PADDING_BEFORE_FRACTION)),
  );
  const paddingAfter = Math.min(
    MAX_PADDING_SEC,
    Math.max(MIN_PADDING_AFTER_SEC, Math.floor(durationSec * PADDING_AFTER_FRACTION)),
  );

  const from = Math.floor(openMs / 1000) - paddingBefore;
  const to = Math.floor(closeMs / 1000) + paddingAfter;
  return { from, to, durationMs };
}

// ═══════════════════════════════════════════════════════════════
// Inner chart body — shared by inline + fullscreen views
// ═══════════════════════════════════════════════════════════════
function ChartBody({
  trade,
  height,
  indicators,
}: {
  trade: TradeChartTrade;
  height: number | string;
  indicators?: Indicator[];
}) {
  // Resolve symbol once per render — pure function of raw symbol
  const isCrypto = useMemo(() => isCryptoSymbol(trade.symbol ?? ''), [trade.symbol]);
  const resolvedSymbol = useMemo(
    () => (isCrypto ? toBinanceSymbol(trade.symbol) : toYahooSymbol(trade.symbol)),
    [trade.symbol, isCrypto],
  );

  const window = useMemo(() => computeWindow(trade), [trade]);
  const interval = useMemo(() => pickInterval(window.durationMs), [window.durationMs]);
  const markers = useMemo(() => tradeToMarkers(trade), [trade]);

  // Route to the right source based on the raw broker symbol (router knows crypto vs equity)
  const dataSource = useMemo(() => pickDataSource(trade.symbol), [trade.symbol]);

  if (!resolvedSymbol) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-sm text-zinc-500">
        Symbol not available for charting: {trade.symbol}
      </div>
    );
  }

  return (
    <FinotaurChart
      symbol={resolvedSymbol}
      interval={interval}
      from={window.from}
      to={window.to}
      dataSource={dataSource}
      markers={markers}
      indicators={indicators}
      theme="dark"
      height={height}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// Chip row — entry + (exit OR open) summary below the chart
// ═══════════════════════════════════════════════════════════════
function MarkerChips({ trade }: { trade: TradeChartTrade }) {
  const isOpen = !trade.close_at || trade.outcome === 'OPEN';
  const sideColor = trade.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400';
  const SideIcon = trade.side === 'LONG' ? ArrowUpRight : ArrowDownRight;
  const sideBorder =
    trade.side === 'LONG'
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : 'border-rose-500/30 bg-rose-500/10';

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Entry chip — always shown */}
      <div className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${sideBorder}`}>
        <SideIcon className={`h-3.5 w-3.5 ${sideColor}`} />
        <span className={`font-semibold uppercase ${sideColor}`}>{trade.side}</span>
        <span className="text-zinc-300">{formatPrice(trade.entry_price)}</span>
        <span className="text-zinc-500">·</span>
        <span className="text-zinc-400">{formatTimestamp(trade.open_at)}</span>
      </div>

      {/* Exit chip OR Open label */}
      {isOpen ? (
        <div className="inline-flex items-center gap-1.5 rounded-md border border-zinc-600/40 bg-zinc-700/20 px-2.5 py-1">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          <span className="font-semibold uppercase text-zinc-300">OPEN</span>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-400">{formatDuration(trade.open_at, trade.close_at)}</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1">
          <X className="h-3.5 w-3.5 text-sky-300" />
          <span className="font-semibold uppercase text-sky-300">EXIT</span>
          <span className="text-zinc-300">{formatPrice(trade.exit_price)}</span>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-400">{formatTimestamp(trade.close_at)}</span>
          {trade.pnl != null && (
            <>
              <span className="text-zinc-500">·</span>
              <span
                className={
                  trade.pnl >= 0
                    ? 'font-semibold text-emerald-400'
                    : 'font-semibold text-rose-400'
                }
              >
                {formatPnl(trade.pnl)}
              </span>
            </>
          )}
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-400">{formatDuration(trade.open_at, trade.close_at)}</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════
export function TradeChart({ trade }: TradeChartProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [indicatorSettings, setIndicatorSettings] = useIndicatorPreferences();

  // Interval is the same calculation ChartBody does internally — recomputed
  // here so the toolbar can gate VWAP on intraday intervals only.
  const window = useMemo(() => computeWindow(trade), [trade]);
  const interval = useMemo(() => pickInterval(window.durationMs), [window.durationMs]);

  const indicators = useMemo<Indicator[]>(() => {
    const list: Indicator[] = [];
    if (indicatorSettings.sma) list.push({ type: 'SMA', period: INDICATOR_PERIODS.sma });
    if (indicatorSettings.ema) list.push({ type: 'EMA', period: INDICATOR_PERIODS.ema });
    if (indicatorSettings.rsi) list.push({ type: 'RSI', period: INDICATOR_PERIODS.rsi });
    // VWAP gate: only meaningful on intraday intervals. The toolbar disables
    // the chip too — this is a belt-and-suspenders guard.
    if (indicatorSettings.vwap && isIntradayInterval(interval)) {
      list.push({ type: 'VWAP', period: 0 });
    }
    // Phase 2.5 additions — each works across all intervals:
    //  - MACD: fast/slow/signal baked into computeMACD defaults, period ignored
    //  - BBANDS: rolling window of `period` close prices
    //  - ATR: Wilder-smoothed True Range over `period` bars
    if (indicatorSettings.macd) {
      list.push({ type: 'MACD', period: 0 });
    }
    if (indicatorSettings.bbands) {
      list.push({ type: 'BBANDS', period: INDICATOR_PERIODS.bbands.period });
    }
    if (indicatorSettings.atr) {
      list.push({ type: 'ATR', period: INDICATOR_PERIODS.atr });
    }
    return list;
  }, [indicatorSettings, interval]);

  return (
    <div className="rounded-xl border-2 border-zinc-700/50 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 p-6 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-300">
          <TrendingUp className="h-5 w-5" />
          Price Chart
        </h3>
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700/60 bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-yellow-500/40 hover:bg-zinc-800 hover:text-yellow-300"
          aria-label="Expand chart"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Fullscreen
        </button>
      </div>

      <div className="mb-3">
        <IndicatorToolbar
          settings={indicatorSettings}
          onChange={setIndicatorSettings}
          interval={interval}
        />
      </div>

      <div className="h-[600px] w-full overflow-hidden rounded-xl border-2 border-zinc-800 bg-zinc-950 shadow-2xl">
        <ChartBody trade={trade} height="100%" indicators={indicators} />
      </div>

      <div className="mt-4">
        <MarkerChips trade={trade} />
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="flex h-[95vh] w-[95vw] max-w-none flex-col gap-3 border-zinc-700 bg-zinc-950 p-4">
          <DialogTitle className="sr-only">{trade.symbol} chart</DialogTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-200">
              <TrendingUp className="h-5 w-5" />
              {trade.symbol} · Price Chart
            </div>
            <IndicatorToolbar
              settings={indicatorSettings}
              onChange={setIndicatorSettings}
              interval={interval}
            />
          </div>
          <div className="flex-1 overflow-hidden rounded-xl border-2 border-zinc-800 bg-zinc-950">
            <ChartBody trade={trade} height="100%" indicators={indicators} />
          </div>
          <MarkerChips trade={trade} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TradeChart;
