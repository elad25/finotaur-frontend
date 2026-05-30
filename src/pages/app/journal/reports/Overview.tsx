/**
 * JournalReportsOverview — Tradezella-parity overview tab.
 *
 * Renders the full KPI grid + two cumulative charts.
 * Charts: recharts (same as Analytics.tsx / EquityChart.tsx in this repo).
 *
 * NOTE: <ReportsTabsNav> is mounted ABOVE this component by the route parent.
 * This component owns only its own heading + content.
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useTrades } from '@/hooks/useTradesData';
import { Card } from '@/components/ds/Card';
import { Price, Change } from '@/components/ds/NumberDisplay';
import { computeReportMetrics } from '@/lib/journal/reportMetrics';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtHoldTime(ms: number): string {
  if (ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const totalMin = Math.floor(totalSec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function fmtRatio(v: number | null): string {
  if (v === null) return '—';
  if (!isFinite(v)) return '∞';
  return v.toFixed(2);
}

function fmtPercent(v: number): string {
  return `${v.toFixed(1)}%`;
}

function fmtR(v: number | null): string {
  if (v === null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
}

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v);
}

// ---------------------------------------------------------------------------
// KPI tile
// ---------------------------------------------------------------------------

interface KpiTileProps {
  label: string;
  children: React.ReactNode;
  sub?: string;
}

function KpiTile({ label, children, sub }: KpiTileProps) {
  return (
    <Card padding="compact" className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] font-medium tracking-[0.8px] uppercase text-ink-tertiary truncate">
        {label}
      </span>
      <div className="text-xl font-semibold tabular-nums leading-tight">{children}</div>
      {sub && (
        <span className="text-[11px] text-ink-tertiary truncate">{sub}</span>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonTile() {
  return (
    <div className="rounded-[12px] bg-surface-1 border-[0.5px] border-border-ds-subtle p-ds-4 flex flex-col gap-2 animate-pulse">
      <div className="h-3 w-16 rounded bg-white/10" />
      <div className="h-6 w-24 rounded bg-white/10" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart helpers
// ---------------------------------------------------------------------------

const CHART_STYLE = {
  tooltip: {
    contentStyle: {
      backgroundColor: 'hsl(var(--surface-1, 220 14% 8%))',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      fontSize: '12px',
      color: '#fff',
    },
  },
  grid: { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.06)' },
  axis: { stroke: 'rgba(255,255,255,0.25)', fontSize: 11 },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function JournalReportsOverview() {
  const { data: trades = [], isLoading } = useTrades();

  const metrics = useMemo(
    () => computeReportMetrics(trades),
    [trades],
  );

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div>
          <div className="h-7 w-40 rounded bg-white/10 animate-pulse" />
          <div className="h-4 w-64 rounded bg-white/10 animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 18 }).map((_, i) => <SkeletonTile key={i} />)}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (trades.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-yellow-100">Overview</h2>
          <p className="text-sm text-zinc-400 mt-1">Your complete performance summary at a glance.</p>
        </div>
        <Card className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Activity className="w-10 h-10 text-ink-tertiary" />
          <p className="text-ink-secondary text-sm">No trades yet — import or log your first trade to see metrics.</p>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const {
    netPnl, tradeCount, winRatePct, profitFactor, tradeExpectancy,
    avgTradeWinLoss, avgNetTradePnl, avgHoldTimeMs,
    avgPlannedR, avgRealizedR,
    largestProfitableDay, largestLosingDay,
    loggedDays, avgDailyNetPnl, avgDailyWinPct, avgDailyWinLoss,
    avgDailyVolume,
    maxDailyNetDrawdown, avgDailyNetDrawdown,
    cumulativePnl, cumulativeAvgDailyWinLoss,
  } = metrics;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-8">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-semibold text-yellow-100">Overview</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Your complete performance summary across {tradeCount} trades in {loggedDays} logged days.
        </p>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">

        {/* Net P&L */}
        <KpiTile label="Net P&L">
          <Change value={netPnl} format="currency" decimals={2} showSign={false} />
        </KpiTile>

        {/* Win % */}
        <KpiTile label="Win %" sub={`${tradeCount} trades`}>
          <span className={winRatePct >= 50 ? 'text-[#4AD295]' : 'text-num-negative'}>
            {fmtPercent(winRatePct)}
          </span>
        </KpiTile>

        {/* Profit Factor */}
        <KpiTile label="Profit Factor" sub="Gross wins / gross losses">
          <span className={profitFactor >= 1 ? 'text-[#4AD295]' : 'text-num-negative'}>
            {fmtRatio(profitFactor === Infinity ? null : profitFactor)}
            {profitFactor === Infinity ? '∞' : ''}
          </span>
        </KpiTile>

        {/* Trade Expectancy */}
        <KpiTile label="Trade Expectancy" sub="Per-trade edge">
          <Change value={tradeExpectancy} format="currency" decimals={2} showSign />
        </KpiTile>

        {/* Trades count */}
        <KpiTile label="Trades" sub={`${loggedDays} days logged`}>
          <span className="text-ink-primary">{tradeCount}</span>
        </KpiTile>

        {/* Avg Daily Net P&L */}
        <KpiTile label="Avg Daily Net P&L">
          <Change value={avgDailyNetPnl} format="currency" decimals={2} showSign />
        </KpiTile>

        {/* Avg Daily Win % */}
        <KpiTile label="Avg Daily Win %" sub="% of green days">
          <span className={avgDailyWinPct >= 50 ? 'text-[#4AD295]' : 'text-num-negative'}>
            {fmtPercent(avgDailyWinPct)}
          </span>
        </KpiTile>

        {/* Avg Trade Win/Loss */}
        <KpiTile label="Avg Trade Win/Loss" sub="Avg win ÷ |avg loss|">
          <span className={avgTradeWinLoss >= 1 ? 'text-[#4AD295]' : 'text-num-negative'}>
            {fmtRatio(isFinite(avgTradeWinLoss) ? avgTradeWinLoss : null)}
            {!isFinite(avgTradeWinLoss) ? '∞' : ''}
          </span>
        </KpiTile>

        {/* Avg Net Trade P&L */}
        <KpiTile label="Avg Net Trade P&L" sub="Per trade">
          <Change value={avgNetTradePnl} format="currency" decimals={2} showSign />
        </KpiTile>

        {/* Avg Hold Time */}
        <KpiTile label="Avg Hold Time" sub="Closed trades only">
          <span className="text-ink-primary">{fmtHoldTime(avgHoldTimeMs)}</span>
        </KpiTile>

        {/* Avg Daily Volume */}
        <KpiTile label="Avg Daily Volume" sub="Contracts/shares per day">
          <span className="text-ink-primary">{avgDailyVolume.toFixed(1)}</span>
        </KpiTile>

        {/* Logged Days */}
        <KpiTile label="Logged Days">
          <span className="text-ink-primary">{loggedDays}</span>
        </KpiTile>

        {/* Avg Planned R */}
        <KpiTile label="Avg Planned R" sub="user_risk_r → rr proxy">
          <span className="text-ink-primary">{fmtR(avgPlannedR)}</span>
        </KpiTile>

        {/* Avg Realized R */}
        <KpiTile label="Avg Realized R" sub="actual_user_r → actual_r">
          <span className={
            avgRealizedR === null ? 'text-ink-tertiary' :
            avgRealizedR >= 0 ? 'text-[#4AD295]' : 'text-num-negative'
          }>
            {fmtR(avgRealizedR)}
          </span>
        </KpiTile>

        {/* Max Daily Net Drawdown */}
        <KpiTile label="Max Daily Drawdown" sub="Deepest from peak">
          <Change value={maxDailyNetDrawdown} format="currency" decimals={2} showSign />
        </KpiTile>

        {/* Avg Daily Net Drawdown */}
        <KpiTile label="Avg Daily Drawdown" sub="Mean across all days">
          <Change value={avgDailyNetDrawdown} format="currency" decimals={2} showSign />
        </KpiTile>

        {/* Largest Profitable Day */}
        <KpiTile label="Largest Profitable Day">
          <span className="text-[#4AD295]">
            <Price value={largestProfitableDay} format="currency" />
          </span>
        </KpiTile>

        {/* Largest Losing Day */}
        <KpiTile label="Largest Losing Day">
          <Change value={largestLosingDay} format="currency" decimals={2} showSign={false} />
        </KpiTile>

      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1: Cumulative Net P&L */}
        <Card padding="default" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gold-primary" />
            <span className="text-sm font-medium text-ink-secondary">Net P&amp;L — Cumulative</span>
          </div>
          {cumulativePnl.length < 2 ? (
            <div className="h-48 flex items-center justify-center text-ink-tertiary text-sm">
              Not enough data for a chart.
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <LineChart data={cumulativePnl} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid {...CHART_STYLE.grid} />
                  <XAxis
                    dataKey="date"
                    tick={{ ...CHART_STYLE.axis }}
                    tickLine={false}
                    tickFormatter={(v: string) => v.slice(5)} // MM-DD
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ ...CHART_STYLE.axis }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => fmtCurrency(v)}
                    width={56}
                  />
                  <Tooltip
                    {...CHART_STYLE.tooltip}
                    formatter={(v: number) => [
                      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v),
                      'Cumulative P&L',
                    ]}
                    labelFormatter={(label: string) => `Date: ${label}`}
                  />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#C9A84C"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Chart 2: Cumulative Avg Daily Win/Loss */}
        <Card padding="default" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-gold-primary" />
            <span className="text-sm font-medium text-ink-secondary">Avg Daily Win/Loss — Cumulative</span>
          </div>
          {cumulativeAvgDailyWinLoss.length < 2 ? (
            <div className="h-48 flex items-center justify-center text-ink-tertiary text-sm">
              Not enough data for a chart.
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <LineChart data={cumulativeAvgDailyWinLoss} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid {...CHART_STYLE.grid} />
                  <XAxis
                    dataKey="date"
                    tick={{ ...CHART_STYLE.axis }}
                    tickLine={false}
                    tickFormatter={(v: string) => v.slice(5)}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ ...CHART_STYLE.axis }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => v >= 9000 ? '∞' : v.toFixed(2)}
                    width={44}
                  />
                  <Tooltip
                    {...CHART_STYLE.tooltip}
                    formatter={(v: number) => [
                      v >= 9000 ? '∞' : v.toFixed(2),
                      'Win/Loss Ratio',
                    ]}
                    labelFormatter={(label: string) => `Date: ${label}`}
                  />
                  <ReferenceLine y={1} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#C9A84C"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
