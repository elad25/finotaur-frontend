import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock, Maximize2, TrendingUp, X } from 'lucide-react';
import { TVChartContainer } from '@/components/backtest/TVChartContainer';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { pickTradeInterval, toTradingViewSymbol } from '@/lib/tradingViewSymbol';

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

function ChartBody({ trade }: { trade: TradeChartTrade }) {
  const mappedSymbol = useMemo(() => toTradingViewSymbol(trade.symbol), [trade.symbol]);
  const interval = useMemo(() => pickTradeInterval(trade.open_at, trade.close_at), [trade.open_at, trade.close_at]);

  if (!mappedSymbol) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-sm text-zinc-500">
        Symbol not available for charting
      </div>
    );
  }

  return <TVChartContainer symbol={mappedSymbol} interval={interval} autosize allowSymbolChange />;
}

function MarkerChips({ trade }: { trade: TradeChartTrade }) {
  const isOpen = !trade.close_at || trade.outcome === 'OPEN';
  const sideColor = trade.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400';
  const SideIcon = trade.side === 'LONG' ? ArrowUpRight : ArrowDownRight;
  const sideBorder = trade.side === 'LONG' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10';

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
              <span className={trade.pnl >= 0 ? 'font-semibold text-emerald-400' : 'font-semibold text-rose-400'}>
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

export function TradeChart({ trade }: TradeChartProps) {
  const [fullscreen, setFullscreen] = useState(false);

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

      <div className="h-[600px] w-full overflow-hidden rounded-xl border-2 border-zinc-800 bg-zinc-950 shadow-2xl">
        <ChartBody trade={trade} />
      </div>

      <div className="mt-4">
        <MarkerChips trade={trade} />
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          className="flex h-[95vh] w-[95vw] max-w-none flex-col gap-3 border-zinc-700 bg-zinc-950 p-4"
        >
          <DialogTitle className="sr-only">{trade.symbol} chart</DialogTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-200">
              <TrendingUp className="h-5 w-5" />
              {trade.symbol} · Price Chart
            </div>
          </div>
          <div className="flex-1 overflow-hidden rounded-xl border-2 border-zinc-800 bg-zinc-950">
            <ChartBody trade={trade} />
          </div>
          <MarkerChips trade={trade} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TradeChart;
