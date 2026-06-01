// ==========================================
// BACKTEST ANALYTICS (Phase 2 — analytics build-out)
// ==========================================
// Two TradeZella-parity reports computed from the user's trades:
//  1. Strategy Performance comparison (win %, net P&L, profit factor, expectancy, trades)
//  2. Performance calendar (monthly net P&L + win rate grid)
// Pure data + Finotaur gold-on-black. Reuses calculateAllStats + existing hooks.

import { useMemo } from 'react';
import { BarChart3, CalendarDays } from 'lucide-react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useTrades } from '@/hooks/useTradesData';
import { useStrategiesOptimized } from '@/hooks/useStrategies';
import { calculateAllStats, type Trade } from '@/utils/statsCalculations';

const GREEN = '#34D399';
const RED = '#E44545';
const GOLD = '#C9A646';

function isClosed(t: any): boolean {
  return t.exit_price != null || (t.outcome != null && t.outcome !== 'OPEN' && t.pnl != null);
}

function fmtUsd(v: number): string {
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function pnlColor(v: number): string {
  return v > 0 ? GREEN : v < 0 ? RED : '#9A9A9A';
}

// ---------- Strategy comparison ----------

interface StrategyRow {
  name: string;
  trades: number;
  winRate: number;
  netPnL: number;
  profitFactor: number;
  expectancy: number;
}

function StrategyComparison({ rows }: { rows: StrategyRow[] }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-[#C9A646]" />
        <h2 className="text-lg font-semibold text-white">Strategy Performance</h2>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/10">
              <th className="px-4 py-3 font-medium">Strategy</th>
              <th className="px-4 py-3 font-medium text-right">Trades</th>
              <th className="px-4 py-3 font-medium text-right">Win %</th>
              <th className="px-4 py-3 font-medium text-right">Net P&amp;L</th>
              <th className="px-4 py-3 font-medium text-right">Profit Factor</th>
              <th className="px-4 py-3 font-medium text-right">Expectancy</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-600">
                  No strategy data yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.name} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-white">{r.name}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{r.trades}</td>
                  <td className="px-4 py-3 text-right" style={{ color: r.winRate >= 50 ? GREEN : RED }}>
                    {r.winRate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: pnlColor(r.netPnL) }}>
                    {fmtUsd(r.netPnL)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {r.profitFactor ? r.profitFactor.toFixed(2) : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: pnlColor(r.expectancy) }}>
                    {fmtUsd(r.expectancy)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- Performance calendar ----------

interface MonthCell {
  key: string; // yyyy-mm
  label: string; // Mon yyyy
  netPnL: number;
  winRate: number;
  trades: number;
}

function tradeDate(t: any): Date | null {
  const raw = t.close_at || t.exit_time || t.created_at || t.open_at;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function buildCalendar(trades: any[]): MonthCell[] {
  const byMonth = new Map<string, any[]>();
  for (const t of trades) {
    const d = tradeDate(t);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(t);
  }
  const cells: MonthCell[] = [];
  for (const [key, monthTrades] of byMonth) {
    const stats = calculateAllStats(monthTrades as Trade[]);
    const [y, m] = key.split('-').map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric',
    });
    cells.push({ key, label, netPnL: stats.netPnL, winRate: stats.winRate, trades: monthTrades.length });
  }
  return cells.sort((a, b) => a.key.localeCompare(b.key));
}

function PerformanceCalendar({ cells }: { cells: MonthCell[] }) {
  const maxAbs = useMemo(
    () => cells.reduce((acc, c) => Math.max(acc, Math.abs(c.netPnL)), 0) || 1,
    [cells]
  );

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="h-5 w-5 text-[#C9A646]" />
        <h2 className="text-lg font-semibold text-white">Performance Calendar</h2>
      </div>
      {cells.length === 0 ? (
        <p className="text-gray-600 text-sm">No trades to chart yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {cells.map((c) => {
            const intensity = Math.min(1, Math.abs(c.netPnL) / maxAbs);
            const base = c.netPnL >= 0 ? '52, 211, 153' : '228, 69, 69';
            return (
              <div
                key={c.key}
                className="rounded-xl border border-white/10 p-3"
                style={{ background: `rgba(${base}, ${0.05 + intensity * 0.18})` }}
              >
                <p className="text-xs text-gray-400">{c.label}</p>
                <p className="text-lg font-bold mt-1" style={{ color: pnlColor(c.netPnL) }}>
                  {fmtUsd(c.netPnL)}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {c.trades} trade{c.trades === 1 ? '' : 's'} · {c.winRate.toFixed(0)}% win
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------- Page ----------

export const BacktestAnalytics = () => {
  const { id: userId } = useEffectiveUser();
  const { data: strategies = [], isLoading: stratLoading } = useStrategiesOptimized(userId);
  const { data: allTrades = [], isLoading: tradesLoading } = useTrades(userId);

  const closedTrades = useMemo(
    () => (allTrades as any[]).filter(isClosed),
    [allTrades]
  );

  const strategyRows = useMemo<StrategyRow[]>(() => {
    return (strategies as any[]).map((s) => {
      const trades = closedTrades.filter(
        (t) => t.strategy_id === s.id || t.strategy_name === s.name
      );
      const stats = calculateAllStats(trades as Trade[]);
      return {
        name: s.name,
        trades: trades.length,
        winRate: stats.winRate,
        netPnL: stats.netPnL,
        profitFactor: stats.profitFactor,
        expectancy: stats.expectancy,
      };
    });
  }, [strategies, closedTrades]);

  const calendar = useMemo(() => buildCalendar(closedTrades), [closedTrades]);

  const loading = stratLoading || tradesLoading;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F4F4F4] px-8 py-8 space-y-10">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold" style={{ color: GOLD }}>
          Analytics
        </h1>
        <span className="text-sm text-gray-500">{closedTrades.length} closed trades</span>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20">Loading analytics…</div>
      ) : (
        <>
          <StrategyComparison rows={strategyRows} />
          <PerformanceCalendar cells={calendar} />
        </>
      )}
    </div>
  );
};

export default BacktestAnalytics;
