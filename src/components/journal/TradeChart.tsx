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

import { FinotaurChart, type MarkerIcon } from '@/components/charting/FinotaurChart';
import {
  pickDataSource,
  pickInterval,
  toBinanceSymbol,
  toYahooSymbol,
  toDatabentoCacheSymbol,
  isCryptoSymbol,
  isDatabentoCachedSymbol,
} from '@/components/charting/dataSources';
import { isIntradayInterval } from '@/components/charting/indicators';
import { IndicatorToolbar } from '@/components/charting/IndicatorToolbar';
import { useIndicatorPreferences } from '@/components/charting/useIndicatorPreferences';
import { useChartTheme } from '@/components/charting/useChartTheme';
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
  asset_class?: string | null;
}

interface TradeChartProps {
  trade: TradeChartTrade;
  /**
   * Controlled chrome. When `theme` + `onToggleTheme` + `onFullscreenChange`
   * are supplied, the parent owns the theme toggle and fullscreen trigger
   * (rendered up on the tab row), so TradeChart hides its own header row and
   * lets the chart fill the reclaimed vertical space.
   */
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  fullscreen?: boolean;
  onFullscreenChange?: (open: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════
// Marker theme — kept here (NOT in FinotaurChart) because these
// are trade-specific semantics, not generic chart styling.
// ═══════════════════════════════════════════════════════════════
const MARKER_COLORS = {
  // Direction-based markers, FINOTAUR brand palette:
  //   BUY  → gold circle BELOW the bar
  //   SELL → red  circle ABOVE the bar
  // A LONG trade is buy-then-sell; a SHORT trade is sell-then-buy. The
  // direction (not the entry/exit role) drives the marker.
  // Solid trading palette — substantial colors that read as "professional"
  // rather than neon. Chart context overrides the DS no-green rule.
  buy:  '#15803d',  // darker solid green (tailwind green-700) — buy direction
  sell: '#b91c1c',  // darker solid red   (tailwind red-700)   — sell direction
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
// Trade → { markers, markerIcons }
//
// Marker semantics (TradingView convention):
//   - BUY  (LONG entry, SHORT exit) → gold  circle BELOW the bar  + ArrowUp icon
//   - SELL (SHORT entry, LONG exit) → red   circle ABOVE the bar  + ArrowDown icon
// The direction — not the entry/exit role — drives the visual.
// `markers`     → lightweight-charts native colored circles (canvas layer).
// `markerIcons` → HTML overlay arrows centered inside each circle.
// ═══════════════════════════════════════════════════════════════
function tradeToMarkers(trade: TradeChartTrade): {
  markers: ChartMarker[];
  markerIcons: MarkerIcon[];
} {
  const markers: ChartMarker[] = [];
  const markerIcons: MarkerIcon[] = [];

  // Entry direction: LONG opens with a BUY, SHORT opens with a SELL.
  const entryIsBuy = trade.side === 'LONG';

  const entryTime = Math.floor(new Date(trade.open_at).getTime() / 1000) as UTCTimestamp;
  if (Number.isFinite(entryTime as number)) {
    const entryColor = entryIsBuy ? MARKER_COLORS.buy : MARKER_COLORS.sell;
    // Overlay-only — the React overlay positions itself relative to the
    // nearest bar's high/low so it floats above/below the candle, not on it.
    markerIcons.push({
      time: entryTime,
      price: trade.entry_price,  // kept for legacy/Y fallback but overlay uses bar.high/low
      direction: entryIsBuy ? 'up' : 'down',
      color: entryColor,
      offsetY: entryIsBuy ? 18 : -18,
    });
  }

  if (trade.close_at && trade.exit_price != null) {
    // Exit direction is the inverse of the entry.
    const exitIsBuy = !entryIsBuy;
    const exitTime = Math.floor(new Date(trade.close_at).getTime() / 1000) as UTCTimestamp;
    if (Number.isFinite(exitTime as number)) {
      const exitColor = exitIsBuy ? MARKER_COLORS.buy : MARKER_COLORS.sell;
      markerIcons.push({
        time: exitTime,
        price: trade.exit_price,
        direction: exitIsBuy ? 'up' : 'down',
        color: exitColor,
        offsetY: exitIsBuy ? 18 : -18,
      });
    }
  }

  return { markers, markerIcons };
}

// ═══════════════════════════════════════════════════════════════
// Window computation — fetch ≥ 3 days, scale up for longer trades
//
// The DEFAULT viewport is tight (~70 bars via focusRange), but the FETCHED
// window is intentionally generous so the trader can scroll/zoom out and
// see context up to ~3 days back. This is the data range available — not
// what's visible by default.
// ═══════════════════════════════════════════════════════════════
const HOUR_SEC = 60 * 60;
const DAY_SEC = 24 * HOUR_SEC;
const MIN_PAD_BEFORE_SEC = 3 * DAY_SEC;  // 3 full days of pre-entry context
const MIN_PAD_AFTER_SEC = 1 * DAY_SEC;   // 1 day of post-exit follow-through

function computeWindow(trade: TradeChartTrade): { from: number; to: number; durationMs: number } {
  const openMs = new Date(trade.open_at).getTime();
  const closeMs = trade.close_at ? new Date(trade.close_at).getTime() : Date.now();
  const durationMs = Math.max(closeMs - openMs, 0);
  const durationSec = Math.floor(durationMs / 1000);

  let padBefore: number;
  let padAfter: number;

  if (durationSec < DAY_SEC) {
    // Scalps + intra-day trades — fixed 3d / 1d padding so the user can
    // scroll out and see multi-session context.
    padBefore = MIN_PAD_BEFORE_SEC;
    padAfter = MIN_PAD_AFTER_SEC;
  } else if (durationSec < 7 * DAY_SEC) {
    // Multi-day swing — scale 1× duration each side, but never below the
    // 3d / 1d floor.
    padBefore = Math.max(MIN_PAD_BEFORE_SEC, durationSec);
    padAfter = Math.max(MIN_PAD_AFTER_SEC, Math.floor(durationSec * 0.5));
  } else {
    // Position trade (≥7d) — cap at 14d each side so we don't drag in months.
    padBefore = Math.min(14 * DAY_SEC, Math.max(MIN_PAD_BEFORE_SEC, durationSec));
    padAfter = Math.min(14 * DAY_SEC, Math.max(MIN_PAD_AFTER_SEC, Math.floor(durationSec * 0.3)));
  }

  const from = Math.floor(openMs / 1000) - padBefore;
  const to = Math.floor(closeMs / 1000) + padAfter;
  return { from, to, durationMs };
}

// ═══════════════════════════════════════════════════════════════
// Prewarm helper — fire-and-forget bar prefetch on hover
// ═══════════════════════════════════════════════════════════════

/**
 * Fire-and-forget prewarm — fetches the bars this trade's chart will need
 * and populates the client LRU. Safe to call on hover; multiple calls are
 * deduped at the LRU layer.
 */
export function prewarmTradeChart(trade: TradeChartTrade): void {
  try {
    const isCrypto = isCryptoSymbol(trade.symbol ?? '');
    const isDatabentoCached = !isCrypto && isDatabentoCachedSymbol(trade.symbol);
    const resolvedSymbol = isCrypto
      ? toBinanceSymbol(trade.symbol)
      : isDatabentoCached
        ? toDatabentoCacheSymbol(trade.symbol)
        : toYahooSymbol(trade.symbol, trade.asset_class);
    if (!resolvedSymbol) return;
    const dataSource = pickDataSource(trade.symbol);
    const { from, to, durationMs } = computeWindow(trade);
    const interval = pickInterval(durationMs);
    void dataSource.getBars(resolvedSymbol, interval, from as UTCTimestamp, to as UTCTimestamp);
  } catch {
    // Prewarm is best-effort — never throw to the caller.
  }
}

// ═══════════════════════════════════════════════════════════════
// Inner chart body — shared by inline + fullscreen views
// ═══════════════════════════════════════════════════════════════
function ChartBody({
  trade,
  height,
  indicators,
  theme,
}: {
  trade: TradeChartTrade;
  height: number | string;
  indicators?: Indicator[];
  theme: 'light' | 'dark';
}) {
  // Resolve symbol once per render — pure function of raw symbol
  const isCrypto = useMemo(() => isCryptoSymbol(trade.symbol ?? ''), [trade.symbol]);
  const isDatabentoCached = useMemo(
    () => !isCrypto && isDatabentoCachedSymbol(trade.symbol),
    [trade.symbol, isCrypto],
  );
  const resolvedSymbol = useMemo(
    () =>
      isCrypto
        ? toBinanceSymbol(trade.symbol)
        : isDatabentoCached
          ? toDatabentoCacheSymbol(trade.symbol)
          : toYahooSymbol(trade.symbol, trade.asset_class),
    [trade.symbol, isCrypto, isDatabentoCached, trade.asset_class],
  );

  const window = useMemo(() => computeWindow(trade), [trade]);
  const interval = useMemo(() => pickInterval(window.durationMs), [window.durationMs]);
  const { markers, markerIcons } = useMemo(() => tradeToMarkers(trade), [trade]);

  // Route to the right source based on the raw broker symbol (router knows crypto vs equity)
  const dataSource = useMemo(() => pickDataSource(trade.symbol), [trade.symbol]);

  const focusRange = useMemo(() => {
    // Target ~70 bars visible regardless of timeframe — the trader's eye
    // expects roughly that density when reviewing a single trade. The trade
    // itself is centered; for trades shorter than 70 bars the extra width is
    // split evenly around it, for trades longer than 70 bars we just pad a
    // few bars on each side.
    const openSec = Math.floor(new Date(trade.open_at).getTime() / 1000);
    const closeSec = trade.close_at
      ? Math.floor(new Date(trade.close_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000);
    const tradeSpanSec = Math.max(closeSec - openSec, 1);

    // Interval → seconds. Mirrors pickInterval's output mapping plus a few
    // alternates the type allows (2m / 30m / 1h / 4h / 1wk / 1mo).
    const intervalSec =
      interval === '1m'  ? 60 :
      interval === '2m'  ? 120 :
      interval === '5m'  ? 300 :
      interval === '15m' ? 900 :
      interval === '30m' ? 1800 :
      interval === '60m' || interval === '1h' ? 3600 :
      interval === '4h'  ? 14400 :
      interval === '1d'  ? 86400 :
      interval === '1wk' ? 604800 :
      interval === '1mo' ? 2592000 :
      60;

    const TARGET_BARS = 70;
    const targetSpanSec = TARGET_BARS * intervalSec;

    let from: number;
    let to: number;
    if (tradeSpanSec < targetSpanSec) {
      const extra = targetSpanSec - tradeSpanSec;
      from = openSec - Math.floor(extra / 2);
      to = closeSec + Math.ceil(extra / 2);
    } else {
      // Trade longer than the target window — show it plus a 5-bar pad each side.
      const pad = intervalSec * 5;
      from = openSec - pad;
      to = closeSec + pad;
    }
    // Clamp to the fetched data window so setVisibleRange never paints empty
    // space beyond what FinotaurChart actually has bars for.
    return {
      from: Math.max(from, window.from),
      to: Math.min(to, window.to),
    };
  }, [trade.open_at, trade.close_at, interval, window.from, window.to]);

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
      markerIcons={markerIcons}
      indicators={indicators}
      theme={theme}
      focusRange={focusRange}
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
export function TradeChart({ trade, theme, onToggleTheme, fullscreen: fullscreenProp, onFullscreenChange }: TradeChartProps) {
  const controlled = theme !== undefined && !!onToggleTheme && !!onFullscreenChange;
  const [localFullscreen, setLocalFullscreen] = useState(false);
  const [localTheme] = useChartTheme('light');
  const chartTheme = theme ?? localTheme;
  const fullscreen = fullscreenProp ?? localFullscreen;
  const setFullscreen = onFullscreenChange ?? setLocalFullscreen;
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
    <div className={`rounded-xl border border-zinc-700/50 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 p-3 sm:p-4 shadow-2xl ${controlled ? 'flex h-full w-full flex-col' : ''}`}>
      {!controlled && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-300">
            <TrendingUp className="h-5 w-5" />
            Price Chart
          </h3>
          <div className="flex items-center gap-2">
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
        </div>
      )}

      <div className={`w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl ${controlled ? 'min-h-0 flex-1' : 'h-[640px]'}`}>
        <ChartBody trade={trade} height="100%" indicators={indicators} theme={chartTheme} />
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
            <ChartBody trade={trade} height="100%" indicators={indicators} theme={chartTheme} />
          </div>
          <MarkerChips trade={trade} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TradeChart;
