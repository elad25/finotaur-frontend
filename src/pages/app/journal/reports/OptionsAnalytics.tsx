/**
 * JournalReportsOptionsAnalytics — Options-only analytics tab.
 *
 * NOTE: <ReportsTabsNav> is mounted ABOVE this component by the route parent
 * (ReportsLayout). Data source: useTradesByDateRange (same hook the other
 * report tabs use). All numbers are derived from REAL trades — no mock data.
 *
 * Options-only: every section filters to asset_class === 'options' and uses
 * calculatePnL (×100 multiplier) so premium P&L is correct. Table-stakes only:
 * P&L by underlying, options win-rate, DTE buckets. No greeks / IV / payoff.
 */
import { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { useTradesByDateRange } from '@/hooks/useTradesData';
import {
  calculatePnL,
  calculateStats,
  getDTEAtEntry,
  type Trade as CalcTrade,
} from '@/utils/tradeCalculations';

const card = 'rounded-2xl border border-yellow-200/12 bg-[#141414] p-5';
const label = 'text-xs uppercase tracking-wide text-zinc-500';
const valueCls = 'mt-1 text-2xl font-semibold text-zinc-100';

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(v);
}

type RangeKey = '7d' | '30d' | '90d' | 'ytd' | 'all';

function rangeToDates(range: RangeKey): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  switch (range) {
    case '7d': start.setDate(end.getDate() - 7); break;
    case '30d': start.setDate(end.getDate() - 30); break;
    case '90d': start.setDate(end.getDate() - 90); break;
    case 'ytd': start.setMonth(0, 1); break;
    case 'all': start.setFullYear(2000, 0, 1); break;
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

// DTE buckets measured at entry. Trades with no expiration are bucketed as 'Unknown'.
const DTE_BUCKETS: { label: string; test: (dte: number) => boolean }[] = [
  { label: '0 DTE', test: (d) => d <= 0 },
  { label: '1–7 DTE', test: (d) => d >= 1 && d <= 7 },
  { label: '8–30 DTE', test: (d) => d >= 8 && d <= 30 },
  { label: '31–90 DTE', test: (d) => d >= 31 && d <= 90 },
  { label: '90+ DTE', test: (d) => d > 90 },
];

interface GroupStat {
  key: string;
  count: number;
  wins: number;
  pnl: number;
}

function winRate(g: GroupStat): number {
  return g.count > 0 ? (g.wins / g.count) * 100 : 0;
}

export default function JournalReportsOptionsAnalytics() {
  const [range, setRange] = useState<RangeKey>('30d');
  const { start, end } = useMemo(() => rangeToDates(range), [range]);
  const { data: trades = [], isLoading } = useTradesByDateRange(start, end);

  // Options only.
  const optionTrades = useMemo(
    () => (trades as CalcTrade[]).filter((t) => t.asset_class === 'options'),
    [trades],
  );

  // Closed options (have an exit) drive P&L / win-rate.
  const closedOptions = useMemo(
    () => optionTrades.filter((t) => t.exit_price != null && t.exit_price > 0),
    [optionTrades],
  );

  const stats = useMemo(() => calculateStats(optionTrades), [optionTrades]);
  const totalPnL = useMemo(
    () => closedOptions.reduce((sum, t) => sum + calculatePnL(t), 0),
    [closedOptions],
  );

  // P&L by underlying (symbol). Sorted by absolute P&L descending.
  const byUnderlying = useMemo(() => {
    const map = new Map<string, GroupStat>();
    for (const t of closedOptions) {
      const key = t.underlying_symbol || t.symbol || '—';
      const g = map.get(key) ?? { key, count: 0, wins: 0, pnl: 0 };
      const pnl = calculatePnL(t);
      g.count += 1;
      if (pnl > 0) g.wins += 1;
      g.pnl += pnl;
      map.set(key, g);
    }
    return Array.from(map.values()).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
  }, [closedOptions]);

  // DTE buckets (measured at entry).
  const byDTE = useMemo(() => {
    const init: GroupStat[] = DTE_BUCKETS.map((b) => ({ key: b.label, count: 0, wins: 0, pnl: 0 }));
    let unknown: GroupStat = { key: 'Unknown', count: 0, wins: 0, pnl: 0 };
    for (const t of closedOptions) {
      const dte = getDTEAtEntry(t);
      const pnl = calculatePnL(t);
      if (dte == null) {
        unknown = {
          ...unknown,
          count: unknown.count + 1,
          wins: unknown.wins + (pnl > 0 ? 1 : 0),
          pnl: unknown.pnl + pnl,
        };
        continue;
      }
      const idx = DTE_BUCKETS.findIndex((b) => b.test(dte));
      if (idx >= 0) {
        init[idx].count += 1;
        if (pnl > 0) init[idx].wins += 1;
        init[idx].pnl += pnl;
      }
    }
    const rows = init.filter((r) => r.count > 0);
    if (unknown.count > 0) rows.push(unknown);
    return rows;
  }, [closedOptions]);

  if (isLoading) {
    return (
      <div className="px-4 md:px-6 py-6">
        <div className={`${card} animate-pulse h-40`} />
      </div>
    );
  }

  if (!optionTrades.length) {
    return (
      <div className="px-4 md:px-6 py-6">
        <div className={`${card} flex flex-col items-center justify-center py-16 gap-3 text-center`}>
          <Activity className="w-10 h-10 text-zinc-600" />
          <p className="text-zinc-200 text-sm font-medium">No options trades in this range</p>
          <p className="text-zinc-500 text-sm">
            Log an options trade or widen the date range to see options analytics.
          </p>
          <RangeButtons range={range} onChange={setRange} />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Options Analytics</h2>
        <RangeButtons range={range} onChange={setRange} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={card}>
          <div className={label}>Options P&amp;L</div>
          <div className={valueCls}>{fmtCurrency(totalPnL)}</div>
        </div>
        <div className={card}>
          <div className={label}>Win Rate</div>
          <div className={valueCls}>{stats.winRate.toFixed(1)}%</div>
        </div>
        <div className={card}>
          <div className={label}>Options Trades</div>
          <div className={valueCls}>{optionTrades.length}</div>
        </div>
        <div className={card}>
          <div className={label}>Avg R</div>
          <div className={valueCls}>{stats.avgR.toFixed(2)}R</div>
        </div>
      </div>

      {/* P&L by underlying */}
      <div className={card}>
        <h3 className="text-sm font-semibold text-zinc-200 mb-3">P&amp;L by Underlying</h3>
        {byUnderlying.length === 0 ? (
          <p className="text-sm text-zinc-500">No closed options trades in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="py-2 pr-4 font-medium">Underlying</th>
                  <th className="py-2 pr-4 font-medium text-right">Trades</th>
                  <th className="py-2 pr-4 font-medium text-right">Win Rate</th>
                  <th className="py-2 font-medium text-right">P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {byUnderlying.map((g) => (
                  <tr key={g.key} className="border-t border-zinc-800/60">
                    <td className="py-2 pr-4 text-zinc-200 font-medium">{g.key}</td>
                    <td className="py-2 pr-4 text-right text-zinc-400">{g.count}</td>
                    <td className="py-2 pr-4 text-right text-zinc-400">{winRate(g).toFixed(0)}%</td>
                    <td className={`py-2 text-right font-semibold ${g.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmtCurrency(g.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DTE buckets */}
      <div className={card}>
        <h3 className="text-sm font-semibold text-zinc-200 mb-3">Performance by DTE (at entry)</h3>
        {byDTE.length === 0 ? (
          <p className="text-sm text-zinc-500">No closed options trades in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="py-2 pr-4 font-medium">DTE Bucket</th>
                  <th className="py-2 pr-4 font-medium text-right">Trades</th>
                  <th className="py-2 pr-4 font-medium text-right">Win Rate</th>
                  <th className="py-2 font-medium text-right">P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {byDTE.map((g) => (
                  <tr key={g.key} className="border-t border-zinc-800/60">
                    <td className="py-2 pr-4 text-zinc-200 font-medium">{g.key}</td>
                    <td className="py-2 pr-4 text-right text-zinc-400">{g.count}</td>
                    <td className="py-2 pr-4 text-right text-zinc-400">{winRate(g).toFixed(0)}%</td>
                    <td className={`py-2 text-right font-semibold ${g.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmtCurrency(g.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RangeButtons({ range, onChange }: { range: RangeKey; onChange: (r: RangeKey) => void }) {
  const opts: RangeKey[] = ['7d', '30d', '90d', 'ytd', 'all'];
  return (
    <div className="flex gap-1.5">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
            range === o
              ? 'bg-yellow-600/25 text-yellow-100 border border-yellow-500/40'
              : 'text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          {o.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
