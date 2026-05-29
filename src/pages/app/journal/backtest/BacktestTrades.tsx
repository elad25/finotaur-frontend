/**
 * BacktestTrades — table of every closed paper trade across every saved
 * backtest session for the current user.
 *
 * Phase 7 — Backtest equivalent of `/app/journal/trades`. Data source is
 * `useBacktestStats()` (which joins backtest_trades_v2 to its session for
 * symbol/interval/saved_at). Layout mirrors the Journal My Trades UX:
 * KPI strip up top, search + filter bar, sortable table.
 *
 * Intentionally simpler than the Journal version — backtest has no broker
 * connections, no portfolio switcher, no risk-mode toggle, no multi-image
 * screenshots, no R-value override (paper trading PnL is direct $).
 */

import { useMemo, useState } from 'react';
import CftcDisclosureBanner from '@/components/backtest/CftcDisclosureBanner';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, TrendingDown, Search, Filter, ArrowUpDown,
  Layers, AlertCircle, Sparkles, Download,
} from 'lucide-react';
import dayjs from 'dayjs';

import { useBacktestStats, type BacktestTrade } from '@/hooks/useBacktestStats';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ─── Helpers ──────────────────────────────────────────────────
function fmtMoney(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}
function fmtPct(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}
function pnlColor(v: number): string {
  if (v > 0) return 'text-emerald-400';
  if (v < 0) return 'text-rose-400';
  return 'text-zinc-400';
}

// CSV escape: wrap in quotes, double any internal quotes. Per RFC 4180.
function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? String(v) : v;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function tradesToCsv(rows: BacktestTrade[]): string {
  const header = [
    'symbol', 'interval', 'side',
    'entry_time', 'exit_time',
    'entry_price', 'exit_price',
    'size', 'pnl', 'pnl_percent',
    'exit_reason', 'session_name', 'saved_at',
  ];
  const lines = [header.join(',')];
  for (const t of rows) {
    lines.push([
      csvCell(t.symbol),
      csvCell(t.interval),
      csvCell(t.side),
      csvCell(new Date(t.entryTime * 1000).toISOString()),
      csvCell(t.exitTime != null ? new Date(t.exitTime * 1000).toISOString() : ''),
      csvCell(t.entryPrice),
      csvCell(t.exitPrice),
      csvCell(t.size),
      csvCell(t.pnl),
      csvCell(t.pnlPercent),
      csvCell(t.exitReason ?? ''),
      csvCell(t.sessionName ?? ''),
      csvCell(t.savedAt),
    ].join(','));
  }
  return lines.join('\r\n');
}

function downloadCsv(filename: string, csv: string): void {
  // Prepend UTF-8 BOM so Excel auto-detects encoding.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type SortKey = 'savedAt' | 'pnl' | 'symbol' | 'side';
type SideFilter = 'all' | 'LONG' | 'SHORT';
type OutcomeFilter = 'all' | 'WIN' | 'LOSS' | 'BE';

// ─── KPI strip (top) ──────────────────────────────────────────
function KpiTile({ label, value, sub, accent }: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'gold' | 'green' | 'red' | 'neutral';
}) {
  const accentCls =
    accent === 'gold' ? 'text-[#C9A646]'
    : accent === 'green' ? 'text-emerald-400'
    : accent === 'red' ? 'text-rose-400'
    : 'text-zinc-200';
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accentCls}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function BacktestTrades() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useBacktestStats();
  const [search, setSearch] = useState('');
  const [sideFilter, setSideFilter] = useState<SideFilter>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('savedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const stats = data?.stats;
  const trades = useMemo(() => data?.trades ?? [], [data]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = trades.filter((t) => {
      if (q && !t.symbol.toLowerCase().includes(q) && !(t.sessionName ?? '').toLowerCase().includes(q)) {
        return false;
      }
      if (sideFilter !== 'all' && t.side !== sideFilter) return false;
      if (outcomeFilter !== 'all' && t.outcome !== outcomeFilter) return false;
      return true;
    });
    out = out.slice().sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'savedAt') {
        cmp = new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
      } else if (sortKey === 'pnl') {
        cmp = a.pnl - b.pnl;
      } else if (sortKey === 'symbol') {
        cmp = a.symbol.localeCompare(b.symbol);
      } else if (sortKey === 'side') {
        cmp = a.side.localeCompare(b.side);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [trades, search, sideFilter, outcomeFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleExportCsv = () => {
    if (filteredSorted.length === 0) return;
    const csv = tradesToCsv(filteredSorted);
    const filename = `backtest_trades_${dayjs().format('YYYY-MM-DD')}.csv`;
    downloadCsv(filename, csv);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6 text-zinc-100">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 h-9 w-48 animate-pulse rounded-md bg-zinc-900" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-900" />
            ))}
          </div>
          <div className="mt-6 h-96 animate-pulse rounded-xl bg-zinc-900" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6 text-zinc-100">
        <div className="mx-auto max-w-7xl rounded-lg border border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-300">
          <div className="mb-1 flex items-center gap-2 font-semibold"><AlertCircle size={14} /> Failed to load backtest trades</div>
          <div className="text-rose-400">{error instanceof Error ? error.message : String(error)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 text-zinc-100">
      <div className="mx-auto max-w-7xl">
        <CftcDisclosureBanner />
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-[#C9A646]">
              <BarChart3 size={28} />
              My Backtest Trades
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Every closed paper trade across all your saved backtest sessions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={filteredSorted.length === 0}
              title={filteredSorted.length === 0 ? 'No trades to export' : `Export ${filteredSorted.length} trades to CSV`}
            >
              <Download size={14} className="mr-1.5" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => navigate('/app/journal/backtest/results')}>
              <Layers size={14} className="mr-1.5" />
              By Session
            </Button>
            <Button onClick={() => navigate('/app/journal/backtest/chart')}>
              <Sparkles size={14} className="mr-1.5" />
              New Backtest
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            <KpiTile
              label="Net P&L"
              value={fmtMoney(stats.netPnl)}
              sub={fmtPct(stats.netPnlPercent)}
              accent={stats.netPnl >= 0 ? 'green' : 'red'}
            />
            <KpiTile
              label="Trades"
              value={stats.totalTrades.toString()}
              sub={`${data!.sessionCount} session${data!.sessionCount !== 1 ? 's' : ''}`}
            />
            <KpiTile
              label="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              sub={`${stats.winners}W · ${stats.losers}L · ${stats.breakeven}BE`}
              accent={stats.winRate >= 50 ? 'green' : 'neutral'}
            />
            <KpiTile
              label="Profit Factor"
              value={isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}
              accent="gold"
            />
            <KpiTile
              label="Avg Win"
              value={fmtMoney(stats.avgWin)}
              accent="green"
            />
            <KpiTile
              label="Avg Loss"
              value={fmtMoney(-stats.avgLoss)}
              accent="red"
            />
          </div>
        )}

        {/* Filter bar */}
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              type="search"
              placeholder="Search symbol or session name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Filter size={14} className="text-zinc-500" />
          <Select value={sideFilter} onValueChange={(v) => setSideFilter(v as SideFilter)}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Side" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sides</SelectItem>
              <SelectItem value="LONG">LONG</SelectItem>
              <SelectItem value="SHORT">SHORT</SelectItem>
            </SelectContent>
          </Select>
          <Select value={outcomeFilter} onValueChange={(v) => setOutcomeFilter(v as OutcomeFilter)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Outcome" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              <SelectItem value="WIN">Win</SelectItem>
              <SelectItem value="LOSS">Loss</SelectItem>
              <SelectItem value="BE">Break even</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto text-xs text-zinc-500">
            {filteredSorted.length} of {trades.length} trades
          </div>
        </div>

        {/* Trades table */}
        {trades.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950 p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900">
              <BarChart3 className="text-zinc-600" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300">No backtest trades yet</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Open the <span className="text-[#C9A646]">Chart</span> tab, place some paper trades, and click <span className="text-[#C9A646]">Save</span> to start journaling.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
            <Table>
              <TableHeader className="bg-zinc-900">
                <TableRow>
                  <TableHead className="cursor-pointer text-xs uppercase tracking-wider text-zinc-500" onClick={() => toggleSort('symbol')}>
                    <span className="inline-flex items-center gap-1">Symbol <ArrowUpDown size={10} /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer text-xs uppercase tracking-wider text-zinc-500" onClick={() => toggleSort('side')}>
                    <span className="inline-flex items-center gap-1">Side <ArrowUpDown size={10} /></span>
                  </TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wider text-zinc-500">Entry</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wider text-zinc-500">Exit</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wider text-zinc-500">Size</TableHead>
                  <TableHead className="cursor-pointer text-right text-xs uppercase tracking-wider text-zinc-500" onClick={() => toggleSort('pnl')}>
                    <span className="inline-flex items-center justify-end gap-1">Net P&L <ArrowUpDown size={10} /></span>
                  </TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wider text-zinc-500">%</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-zinc-500">Reason</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-zinc-500">Session</TableHead>
                  <TableHead className="cursor-pointer text-xs uppercase tracking-wider text-zinc-500" onClick={() => toggleSort('savedAt')}>
                    <span className="inline-flex items-center gap-1">Saved <ArrowUpDown size={10} /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSorted.map((t) => (
                  <TableRow key={t.id} className="border-zinc-900 hover:bg-zinc-900/40">
                    <TableCell>
                      <span className="font-mono font-semibold text-[#C9A646]">{t.symbol}</span>
                      <span className="ml-1.5 text-[10px] text-zinc-600">· {t.interval}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={t.side === 'LONG'
                          ? 'border-emerald-700/50 bg-emerald-950/50 text-emerald-400'
                          : 'border-rose-700/50 bg-rose-950/50 text-rose-400'}
                      >
                        {t.side === 'LONG' ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                        {t.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">${t.entryPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{t.exitPrice != null ? `$${t.exitPrice.toFixed(2)}` : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-400">{t.size}×</TableCell>
                    <TableCell className={`text-right font-bold tabular-nums ${pnlColor(t.pnl)}`}>{fmtMoney(t.pnl)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${pnlColor(t.pnlPercent)}`}>{fmtPct(t.pnlPercent)}</TableCell>
                    <TableCell>
                      {t.exitReason ? (
                        <Badge variant="outline" className={
                          t.exitReason === 'tp' ? 'border-emerald-700/50 text-emerald-400'
                          : t.exitReason === 'sl' ? 'border-rose-700/50 text-rose-400'
                          : 'border-zinc-700 text-zinc-400'
                        }>
                          {t.exitReason.toUpperCase()}
                        </Badge>
                      ) : <span className="text-zinc-600">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {t.sessionName ?? <span className="italic text-zinc-600">Untitled</span>}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">{dayjs(t.savedAt).format('MMM D, YYYY')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
