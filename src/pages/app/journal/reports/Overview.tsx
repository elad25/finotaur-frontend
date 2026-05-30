/**
 * JournalReportsOverview — Tradezella-parity overview tab.
 *
 * Layout:
 *  1. "Your Stats" section — best/lowest/avg month cards at top
 *  2. Two-column stats table (Trades column | Days column) with ALL metrics
 *  3. Two cumulative charts below
 *
 * NOTE: <ReportsTabsNav> is mounted ABOVE this component by the route parent.
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

function fmtInt(v: number): string {
  return String(Math.round(v));
}

// ---------------------------------------------------------------------------
// Month summary card (Best / Lowest / Average)
// ---------------------------------------------------------------------------

interface MonthCardProps {
  label: string;
  sublabel: string;
  pnl: number;
  /** When true, color is gold; when false, uses standard change coloring */
  neutral?: boolean;
}

function MonthCard({ label, sublabel, pnl, neutral }: MonthCardProps) {
  return (
    <Card padding="compact" className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] font-medium tracking-[0.8px] uppercase text-ink-tertiary">
        {label}
      </span>
      <div className="text-lg font-semibold tabular-nums leading-tight">
        {neutral
          ? <span className="text-gold-primary"><Change value={pnl} format="currency" decimals={2} showSign /></span>
          : <Change value={pnl} format="currency" decimals={2} showSign />
        }
      </div>
      {sublabel && (
        <span className="text-[11px] text-ink-tertiary truncate">{sublabel}</span>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stats row — used inside the two-column table
// ---------------------------------------------------------------------------

interface StatRowProps {
  label: string;
  value: React.ReactNode;
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <tr className="border-b border-border-ds-subtle last:border-b-0">
      <td className="py-2 pr-3 text-[12px] text-ink-secondary leading-snug w-[58%]">{label}</td>
      <td className="py-2 text-right text-[12px] font-medium tabular-nums leading-snug">{value}</td>
    </tr>
  );
}

interface SectionLabelProps {
  children: React.ReactNode;
}

function SectionLabel({ children }: SectionLabelProps) {
  return (
    <tr>
      <td
        colSpan={2}
        className="pt-4 pb-1 text-[10px] font-semibold tracking-[1.2px] uppercase text-gold-primary border-b border-gold-border/40"
      >
        {children}
      </td>
    </tr>
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
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonTile key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-[12px] bg-surface-1 border-[0.5px] border-border-ds-subtle p-4 h-64 animate-pulse" />
          <div className="rounded-[12px] bg-surface-1 border-[0.5px] border-border-ds-subtle p-4 h-64 animate-pulse" />
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
  // Destructure all metrics
  // ---------------------------------------------------------------------------

  const {
    netPnl, tradeCount, winRatePct, profitFactor, tradeExpectancy,
    avgTradeWinLoss, avgNetTradePnl, avgHoldTimeMs,
    avgPlannedR, avgRealizedR,
    largestProfitableDay, largestLosingDay,
    // new trade-level counts
    winningTrades, losingTrades, breakevenTrades, openTrades,
    // new streaks
    maxConsecutiveWins, maxConsecutiveLosses,
    // new trade extremes
    largestProfit, largestLoss,
    // new fees
    totalFees, totalCommissions, totalSwap,
    // new hold-time split
    avgHoldWinningMs, avgHoldLosingMs, avgHoldScratchMs,
    // daily-level
    loggedDays, avgDailyNetPnl, avgDailyWinPct,
    avgDailyVolume,
    maxDailyNetDrawdown, avgDailyNetDrawdown,
    // new day-level counts
    totalTradingDays, winningDays, losingDays, breakevenDays,
    // new day streaks
    maxConsecutiveWinningDays, maxConsecutiveLosingDays,
    // new day averages
    avgWinningDayPnl, avgLosingDayPnl,
    // drawdown aliases
    maxDrawdown, avgDrawdown,
    // month stats
    bestMonthPnl, lowestMonthPnl, avgMonthlyPnl,
    bestMonthLabel, lowestMonthLabel,
    // chart series
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

      {/* ── YOUR STATS ── */}
      <section>
        <h3 className="text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-primary mb-3">
          Your Stats
        </h3>

        {/* Month summary row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <MonthCard
            label="Best Month"
            sublabel={bestMonthLabel || '—'}
            pnl={bestMonthPnl}
          />
          <MonthCard
            label="Lowest Month"
            sublabel={lowestMonthLabel || '—'}
            pnl={lowestMonthPnl}
          />
          <MonthCard
            label="Average Month"
            sublabel="Mean monthly P&L"
            pnl={avgMonthlyPnl}
            neutral
          />
        </div>

        {/* Two-column stats table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── LEFT COLUMN — Trades ── */}
          <Card padding="default">
            <p className="text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-primary mb-2">
              Trades
            </p>
            <table className="w-full">
              <tbody>

                <SectionLabel>P&amp;L</SectionLabel>
                <StatRow
                  label="Net P&L"
                  value={<Change value={netPnl} format="currency" decimals={2} showSign={false} />}
                />
                <StatRow
                  label="Avg Net Trade P&L"
                  value={<Change value={avgNetTradePnl} format="currency" decimals={2} showSign />}
                />
                <StatRow
                  label="Trade Expectancy"
                  value={<Change value={tradeExpectancy} format="currency" decimals={2} showSign />}
                />

                <SectionLabel>Counts</SectionLabel>
                <StatRow label="Total Trades" value={<span className="text-ink-primary">{fmtInt(tradeCount)}</span>} />
                <StatRow label="Winning Trades" value={<span className="text-[#4AD295]">{fmtInt(winningTrades)}</span>} />
                <StatRow label="Losing Trades" value={<span className="text-num-negative">{fmtInt(losingTrades)}</span>} />
                <StatRow label="Breakeven Trades" value={<span className="text-ink-secondary">{fmtInt(breakevenTrades)}</span>} />
                <StatRow label="Open Trades" value={<span className="text-ink-secondary">{fmtInt(openTrades)}</span>} />
                <StatRow
                  label="Win Rate"
                  value={
                    <span className={winRatePct >= 50 ? 'text-[#4AD295]' : 'text-num-negative'}>
                      {fmtPercent(winRatePct)}
                    </span>
                  }
                />

                <SectionLabel>Streaks</SectionLabel>
                <StatRow label="Max Consecutive Wins" value={<span className="text-[#4AD295]">{fmtInt(maxConsecutiveWins)}</span>} />
                <StatRow label="Max Consecutive Losses" value={<span className="text-num-negative">{fmtInt(maxConsecutiveLosses)}</span>} />

                <SectionLabel>Hold Times</SectionLabel>
                <StatRow label="Avg Hold Time (All)" value={<span className="text-ink-primary">{fmtHoldTime(avgHoldTimeMs)}</span>} />
                <StatRow label="Avg Hold Time (Wins)" value={<span className="text-ink-primary">{fmtHoldTime(avgHoldWinningMs)}</span>} />
                <StatRow label="Avg Hold Time (Losses)" value={<span className="text-ink-primary">{fmtHoldTime(avgHoldLosingMs)}</span>} />
                <StatRow label="Avg Hold Time (Scratch)" value={<span className="text-ink-primary">{fmtHoldTime(avgHoldScratchMs)}</span>} />

                <SectionLabel>Ratios &amp; Factors</SectionLabel>
                <StatRow
                  label="Profit Factor"
                  value={
                    <span className={profitFactor >= 1 ? 'text-[#4AD295]' : 'text-num-negative'}>
                      {fmtRatio(profitFactor === Infinity ? null : profitFactor)}
                      {profitFactor === Infinity ? '∞' : ''}
                    </span>
                  }
                />
                <StatRow
                  label="Avg Trade Win/Loss"
                  value={
                    <span className={avgTradeWinLoss >= 1 ? 'text-[#4AD295]' : 'text-num-negative'}>
                      {fmtRatio(isFinite(avgTradeWinLoss) ? avgTradeWinLoss : null)}
                      {!isFinite(avgTradeWinLoss) ? '∞' : ''}
                    </span>
                  }
                />

                <SectionLabel>Largest Trade</SectionLabel>
                <StatRow
                  label="Largest Profit"
                  value={<span className="text-[#4AD295]"><Price value={largestProfit} format="currency" /></span>}
                />
                <StatRow
                  label="Largest Loss"
                  value={<Change value={largestLoss} format="currency" decimals={2} showSign={false} />}
                />

                <SectionLabel>Costs</SectionLabel>
                <StatRow
                  label="Total Fees"
                  value={<Change value={-totalFees} format="currency" decimals={2} showSign={false} />}
                />
                <StatRow
                  label="Total Commissions"
                  value={<span className="text-ink-tertiary">{fmtCurrency(totalCommissions)}</span>}
                />
                <StatRow
                  label="Total Swap"
                  value={<span className="text-ink-tertiary">{fmtCurrency(totalSwap)}</span>}
                />

                <SectionLabel>R-Multiple</SectionLabel>
                <StatRow label="Avg Planned R" value={<span className="text-ink-primary">{fmtR(avgPlannedR)}</span>} />
                <StatRow
                  label="Avg Realized R"
                  value={
                    <span className={
                      avgRealizedR === null ? 'text-ink-tertiary' :
                      avgRealizedR >= 0 ? 'text-[#4AD295]' : 'text-num-negative'
                    }>
                      {fmtR(avgRealizedR)}
                    </span>
                  }
                />

              </tbody>
            </table>
          </Card>

          {/* ── RIGHT COLUMN — Days ── */}
          <Card padding="default">
            <p className="text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-primary mb-2">
              Days
            </p>
            <table className="w-full">
              <tbody>

                <SectionLabel>Day Counts</SectionLabel>
                <StatRow label="Total Trading Days" value={<span className="text-ink-primary">{fmtInt(totalTradingDays)}</span>} />
                <StatRow label="Logged Days" value={<span className="text-ink-primary">{fmtInt(loggedDays)}</span>} />
                <StatRow label="Winning Days" value={<span className="text-[#4AD295]">{fmtInt(winningDays)}</span>} />
                <StatRow label="Losing Days" value={<span className="text-num-negative">{fmtInt(losingDays)}</span>} />
                <StatRow label="Breakeven Days" value={<span className="text-ink-secondary">{fmtInt(breakevenDays)}</span>} />
                <StatRow
                  label="Avg Daily Win %"
                  value={
                    <span className={avgDailyWinPct >= 50 ? 'text-[#4AD295]' : 'text-num-negative'}>
                      {fmtPercent(avgDailyWinPct)}
                    </span>
                  }
                />

                <SectionLabel>Day Streaks</SectionLabel>
                <StatRow label="Max Consecutive Winning Days" value={<span className="text-[#4AD295]">{fmtInt(maxConsecutiveWinningDays)}</span>} />
                <StatRow label="Max Consecutive Losing Days" value={<span className="text-num-negative">{fmtInt(maxConsecutiveLosingDays)}</span>} />

                <SectionLabel>Daily P&amp;L</SectionLabel>
                <StatRow label="Avg Daily Net P&L" value={<Change value={avgDailyNetPnl} format="currency" decimals={2} showSign />} />
                <StatRow
                  label="Avg Winning Day P&L"
                  value={<span className="text-[#4AD295]"><Price value={avgWinningDayPnl} format="currency" /></span>}
                />
                <StatRow
                  label="Avg Losing Day P&L"
                  value={<Change value={avgLosingDayPnl} format="currency" decimals={2} showSign />}
                />

                <SectionLabel>Largest Day</SectionLabel>
                <StatRow
                  label="Largest Profitable Day"
                  value={<span className="text-[#4AD295]"><Price value={largestProfitableDay} format="currency" /></span>}
                />
                <StatRow
                  label="Largest Losing Day"
                  value={<Change value={largestLosingDay} format="currency" decimals={2} showSign={false} />}
                />

                <SectionLabel>Volume</SectionLabel>
                <StatRow
                  label="Avg Daily Volume"
                  value={<span className="text-ink-primary">{avgDailyVolume.toFixed(1)}</span>}
                />

                <SectionLabel>R-Multiple</SectionLabel>
                <StatRow label="Avg Planned R" value={<span className="text-ink-primary">{fmtR(avgPlannedR)}</span>} />
                <StatRow
                  label="Avg Realized R"
                  value={
                    <span className={
                      avgRealizedR === null ? 'text-ink-tertiary' :
                      avgRealizedR >= 0 ? 'text-[#4AD295]' : 'text-num-negative'
                    }>
                      {fmtR(avgRealizedR)}
                    </span>
                  }
                />

                <SectionLabel>Drawdown</SectionLabel>
                <StatRow
                  label="Max Drawdown"
                  value={<Change value={maxDrawdown} format="currency" decimals={2} showSign />}
                />
                <StatRow
                  label="Avg Drawdown"
                  value={<Change value={avgDrawdown} format="currency" decimals={2} showSign />}
                />
                <StatRow
                  label="Max Daily Net Drawdown"
                  value={<Change value={maxDailyNetDrawdown} format="currency" decimals={2} showSign />}
                />
                <StatRow
                  label="Avg Daily Net Drawdown"
                  value={<Change value={avgDailyNetDrawdown} format="currency" decimals={2} showSign />}
                />

              </tbody>
            </table>
          </Card>

        </div>
      </section>

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
