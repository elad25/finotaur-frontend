import { useState } from 'react';
import { JournalPerformanceSkeletonPage } from "@/components/skeletons/JournalPerformanceSkeleton";
import {
  BarChart3,
  DollarSign,
  Target,
  Zap,
  Download,
  TrendingUp,
  TrendingDown,
  Award,
} from 'lucide-react';
import JournalKpiCard from '@/components/journal/ds/JournalKpiCard';
import { EquityCurveOptimized } from '@/components/EquityCurveOptimized';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { type Trade, type StrategyStats } from '@/utils/statsCalculations';
import { downloadCSV } from '@/utils/export';

// ─── Period selector ────────────────────────────────────────────────────────

type Period = 'Week' | 'Month' | 'Quarter';

const PERIOD_TO_TIME_RANGE = {
  Week: '7D',
  Month: '30D',
  Quarter: '90D',
} as const satisfies Record<Period, '7D' | '30D' | '90D'>;

const PERIOD_LABELS: Record<Period, string> = {
  Week: 'Last 7 Days',
  Month: 'Last 30 Days',
  Quarter: 'Last 90 Days',
};

// ─── CSV export helper ───────────────────────────────────────────────────────

function exportTrades(trades: Trade[], period: Period) {
  const today = new Date().toISOString().split('T')[0];
  const filename = `finotaur-performance-${period.toLowerCase()}-${today}.csv`;

  const header = [
    'Date',
    'Symbol',
    'Side',
    'Entry',
    'Exit',
    'P&L',
    'R',
    'Session',
    'Strategy',
    'Outcome',
  ];

  const rows: (string | number | null | undefined)[][] = trades.map((t) => [
    t.open_at ? new Date(t.open_at).toLocaleDateString() : '',
    t.symbol,
    t.side,
    t.entry_price,
    t.exit_price ?? '',
    t.pnl ?? '',
    t.actual_user_r ?? t.actual_r ?? t.rr ?? t.metrics?.actual_r ?? t.metrics?.rr ?? '',
    t.session ?? '',
    t.strategy_name ?? (typeof t.strategy === 'object' ? t.strategy?.name : t.strategy) ?? '',
    t.outcome ?? '',
  ]);

  downloadCSV([header, ...rows], filename);
}

// ─── Breakdown row ────────────────────────────────────────────────────────

function BreakdownRow({
  name,
  stats,
}: {
  name: string;
  stats: StrategyStats;
}) {
  const pnlColor =
    stats.netPnL > 0 ? '#4AD295' : stats.netPnL < 0 ? '#E36363' : '#9A9A9A';
  const wrColor = stats.winRate >= 50 ? '#4AD295' : '#E36363';

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 rounded-lg transition-all hover:scale-[1.01]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span className="text-sm font-medium truncate max-w-[140px]" style={{ color: '#EAEAEA' }}>
        {name}
      </span>
      <div className="flex gap-5 text-xs tabular-nums">
        <span style={{ color: '#6A6A6A' }}>{stats.totalTrades}T</span>
        <span style={{ color: wrColor }}>{stats.winRate.toFixed(0)}%&nbsp;WR</span>
        <span style={{ color: '#C9A646' }}>
          {stats.avgR >= 0 ? '+' : ''}
          {stats.avgR.toFixed(2)}R avg
        </span>
        <span style={{ color: pnlColor }}>
          {stats.netPnL >= 0 ? '+' : ''}${stats.netPnL.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

// ─── Breakdown section ────────────────────────────────────────────────────

function BreakdownSection({
  title,
  data,
}: {
  title: string;
  data: { name: string; stats: StrategyStats }[];
}) {
  const meaningful = data.filter((d) => d.stats.totalTrades > 0);
  if (meaningful.length === 0) return null;

  return (
    <div
      className="rounded-xl p-5 space-y-2"
      style={{
        background: '#101010',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <h3
        className="text-xs uppercase tracking-widest mb-3 font-bold"
        style={{ color: '#C9A646' }}
      >
        {title}
      </h3>
      {meaningful.map((item) => (
        <BreakdownRow key={item.name} name={item.name} stats={item.stats} />
      ))}
    </div>
  );
}

// ─── Best / Worst trade card ─────────────────────────────────────────────

function TradeHighlightCard({
  title,
  trade,
  r,
  date,
  type,
}: {
  title: string;
  trade: Trade;
  r: number;
  date: string;
  type: 'best' | 'worst';
}) {
  const color = type === 'best' ? '#4AD295' : '#E36363';
  const borderAlpha = type === 'best' ? 'rgba(74,210,149,0.2)' : 'rgba(227,99,99,0.2)';

  return (
    <div
      className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.01] group"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: `1px solid ${borderAlpha}`,
        boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 -left-8 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `${color}18`, filter: 'blur(24px)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-4 right-4 h-px opacity-40"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />
      <div className="relative p-4">
        <h4
          className="text-[10px] font-semibold uppercase tracking-widest mb-4 flex items-center gap-1.5"
          style={{ color: '#6A6A6A' }}
        >
          {type === 'best' ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {title}
        </h4>
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-bold" style={{ color: '#EAEAEA' }}>
            {trade.symbol}
          </span>
          <span className="text-2xl font-bold" style={{ color }}>
            {r >= 0 ? '+' : ''}
            {r.toFixed(2)}R
          </span>
        </div>
        <div className="flex items-center justify-between text-xs" style={{ color: '#6A6A6A' }}>
          <span>{trade.side}</span>
          <span>{date}</span>
        </div>
        {(trade.pnl != null) && (
          <div className="mt-2 text-xs" style={{ color }}>
            P&L: {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────

function EmptyState({ period }: { period: Period }) {
  return (
    <div
      className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 flex flex-col items-center gap-4"
    >
      <Award className="w-12 h-12" style={{ color: '#3A3A3A' }} />
      <p className="text-lg font-semibold" style={{ color: '#6A6A6A' }}>
        No trades in the {PERIOD_LABELS[period].toLowerCase()}
      </p>
      <p className="text-sm" style={{ color: '#4A4A4A' }}>
        Log some trades to see your performance report here.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export default function JournalPerformance() {
  const [period, setPeriod] = useState<Period>('Month');

  const timeRange = PERIOD_TO_TIME_RANGE[period];
  const analytics = useAnalyticsData(timeRange);

  const trades = analytics.filteredTrades as Trade[];
  const { stats, breakdown, bestWorst, changes } = analytics;

  // Loading
  if (analytics.isLoading) {
    return <JournalPerformanceSkeletonPage />;
  }

  const hasData = trades.length > 0;

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #121212 100%)' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Header row ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#EAEAEA' }}>
              Performance Report
            </h1>
            <p className="text-sm mt-1" style={{ color: '#9A9A9A' }}>
              {PERIOD_LABELS[period]}
              {hasData && (
                <span className="ml-2" style={{ color: '#6A6A6A' }}>
                  · {stats.totalTrades} trades
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div
              className="flex rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {(['Week', 'Month', 'Quarter'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-4 py-2 text-sm font-medium transition-all"
                  style={{
                    background:
                      period === p
                        ? 'linear-gradient(135deg, #C9A646, #B48C2C)'
                        : 'rgba(20,20,20,0.6)',
                    color: period === p ? '#000' : '#EAEAEA',
                    borderRight: p !== 'Quarter' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Export */}
            {hasData && (
              <button
                onClick={() => exportTrades(trades, period)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{
                  background: 'rgba(20,20,20,0.6)',
                  border: '1px solid rgba(201,166,70,0.3)',
                  color: '#C9A646',
                }}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* ── Period-over-period comparison badge ─────────────────────── */}
        {hasData && (
          <div
            className="flex gap-3 text-xs px-4 py-3 rounded-xl"
            style={{
              background: 'rgba(201,166,70,0.06)',
              border: '1px solid rgba(201,166,70,0.15)',
            }}
          >
            <span style={{ color: '#6A6A6A' }}>vs previous {period.toLowerCase()}:</span>
            <span
              style={{
                color:
                  changes.pnlChange > 0
                    ? '#4AD295'
                    : changes.pnlChange < 0
                    ? '#E36363'
                    : '#9A9A9A',
              }}
            >
              P&L {changes.pnlChange >= 0 ? '+' : ''}${changes.pnlChange.toFixed(0)}
            </span>
            <span
              style={{
                color:
                  changes.winRateChange > 0
                    ? '#4AD295'
                    : changes.winRateChange < 0
                    ? '#E36363'
                    : '#9A9A9A',
              }}
            >
              Win Rate {changes.winRateChange >= 0 ? '+' : ''}
              {changes.winRateChange.toFixed(1)}%
            </span>
            <span
              style={{
                color:
                  changes.avgRChange > 0
                    ? '#4AD295'
                    : changes.avgRChange < 0
                    ? '#E36363'
                    : '#9A9A9A',
              }}
            >
              Avg R {changes.avgRChange >= 0 ? '+' : ''}
              {changes.avgRChange.toFixed(2)}R
            </span>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {!hasData && <EmptyState period={period} />}

        {hasData && (
          <>
            {/* ── KPI cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <JournalKpiCard
                label="Total Trades"
                value={stats.totalTrades.toString()}
                hint={`${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE`}
                accent="blue"
                icon={BarChart3}
              />
              <JournalKpiCard
                label="Win Rate"
                value={`${stats.winRate.toFixed(0)}%`}
                hint={`${stats.wins} of ${stats.totalTrades} trades`}
                accent={stats.winRate >= 50 ? 'green' : 'red'}
                icon={Target}
                trend={changes.winRateChange !== 0 ? changes.winRateChange : undefined}
              />
              <JournalKpiCard
                label="Net P&L"
                value={`${stats.netPnL >= 0 ? '+' : ''}$${stats.netPnL.toFixed(0)}`}
                hint="Total profit / loss"
                accent={stats.netPnL >= 0 ? 'gold' : 'red'}
                icon={DollarSign}
                valueSize="lg"
                trend={changes.pnlChange !== 0 ? changes.pnlChange : undefined}
              />
              <JournalKpiCard
                label="Expectancy"
                value={`${stats.expectancy >= 0 ? '+' : ''}${stats.expectancy.toFixed(2)}R`}
                hint="Per trade, risk-adjusted"
                accent={stats.expectancy >= 0 ? 'green' : 'red'}
                icon={Zap}
                trend={changes.avgRChange !== 0 ? changes.avgRChange : undefined}
              />
            </div>

            {/* ── Secondary KPIs ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <JournalKpiCard
                label="Profit Factor"
                value={stats.profitFactor.toFixed(2)}
                hint="Gross win / gross loss"
                accent={
                  stats.profitFactor >= 1.5
                    ? 'green'
                    : stats.profitFactor >= 1
                    ? 'gold'
                    : 'red'
                }
              />
              <JournalKpiCard
                label="Avg R"
                value={`${stats.avgR >= 0 ? '+' : ''}${stats.avgR.toFixed(2)}R`}
                hint="Average R per trade"
                accent={stats.avgR >= 0 ? 'green' : 'red'}
              />
              <JournalKpiCard
                label="Max Drawdown"
                value={`${(stats.maxDrawdown ?? 0).toFixed(1)}R`}
                hint="From equity peak"
                accent="red"
              />
              <JournalKpiCard
                label="Streak W/L"
                value={`${stats.maxConsecutiveWins ?? 0} / ${stats.maxConsecutiveLosses ?? 0}`}
                hint="Longest win / loss run"
                accent="gold"
              />
            </div>

            {/* ── Equity curve ──────────────────────────────────────────── */}
            <EquityCurveOptimized trades={trades} />

            {/* ── Best & Worst trade ────────────────────────────────────── */}
            {(bestWorst.best || bestWorst.worst) && (
              <div className="grid md:grid-cols-2 gap-4">
                {bestWorst.best && (
                  <TradeHighlightCard
                    title="Best Trade"
                    trade={bestWorst.best.trade}
                    r={bestWorst.best.r}
                    date={bestWorst.best.date}
                    type="best"
                  />
                )}
                {bestWorst.worst && (
                  <TradeHighlightCard
                    title="Worst Trade"
                    trade={bestWorst.worst.trade}
                    r={bestWorst.worst.r}
                    date={bestWorst.worst.date}
                    type="worst"
                  />
                )}
              </div>
            )}

            {/* ── Breakdown grids ───────────────────────────────────────── */}
            <div className="grid md:grid-cols-2 gap-4">
              <BreakdownSection title="By Strategy" data={breakdown.byStrategy} />
              <BreakdownSection title="By Asset" data={breakdown.byAsset} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <BreakdownSection title="By Session" data={breakdown.bySession} />
              <BreakdownSection title="By Day of Week" data={breakdown.byDayOfWeek} />
            </div>
            <BreakdownSection title="By Direction (Long / Short)" data={breakdown.byDirection} />
          </>
        )}
      </div>
    </div>
  );
}
