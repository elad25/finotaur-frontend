/**
 * JournalReportsSummary — Tradezella-parity summary tab.
 *
 * Renders a grouped 2-column metrics table covering every metric from
 * computeReportMetrics() + computeGroupStats(), plus an Export PDF button stub.
 *
 * Sections:
 *  1. Performance        — trade-level P&L, win stats, counts, ratios, hold times
 *  2. Daily              — day-level aggregates, streaks, drawdown, month stats
 *  3. Risk / R           — R-multiple metrics
 *  4. Streaks & Extremes — trade/day streaks, largest win/loss per trade and per day
 *  5. Costs              — fees, commissions, swap
 *
 * NOTE: <ReportsTabsNav> is mounted ABOVE this component by the route parent.
 */

import React, { useMemo } from 'react';
import { Printer, Activity } from 'lucide-react';
import { useTrades } from '@/hooks/useTradesData';
import { Card } from '@/components/ds/Card';
import { Price, Change } from '@/components/ds/NumberDisplay';
import { computeReportMetrics } from '@/lib/journal/reportMetrics';
import { computeGroupStats } from '@/lib/journal/groupStats';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtHoldTime(ms: number): string {
  if (ms <= 0) return '—';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

function fmtRatio(v: number | null | typeof Infinity): string {
  if (v === null) return '—';
  if (!isFinite(v as number)) return '∞';
  return (v as number).toFixed(2);
}

function fmtPercent(v: number, decimals = 1): string {
  return `${v.toFixed(decimals)}%`;
}

function fmtR(v: number | null): string {
  if (v === null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
}

function fmtInt(v: number): string {
  return String(Math.round(v));
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
// MetricRow
// ---------------------------------------------------------------------------

interface MetricRowProps {
  label: string;
  value: React.ReactNode;
  /** optional tooltip / explanation */
  note?: string;
}

function MetricRow({ label, value, note }: MetricRowProps) {
  return (
    <tr className="border-b border-border-ds-subtle last:border-b-0">
      <td className="py-2.5 pr-4 text-sm text-ink-secondary w-[55%]">
        {label}
        {note && (
          <span className="ml-1.5 text-[10px] text-ink-tertiary font-normal">({note})</span>
        )}
      </td>
      <td className="py-2.5 text-right text-sm font-medium tabular-nums">
        {value}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td
        colSpan={2}
        className="pt-5 pb-2 text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-primary border-b border-gold-border/40"
      >
        {children}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="border-b border-border-ds-subtle">
      <td className="py-2.5 pr-4">
        <div className="h-4 w-36 rounded bg-white/10 animate-pulse" />
      </td>
      <td className="py-2.5 text-right">
        <div className="h-4 w-20 rounded bg-white/10 animate-pulse ml-auto" />
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function JournalReportsSummary() {
  const { data: trades = [], isLoading } = useTrades();

  const metrics = useMemo(() => computeReportMetrics(trades), [trades]);
  const gs = useMemo(() => computeGroupStats(trades), [trades]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-7 w-40 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-56 rounded bg-white/10 animate-pulse mt-2" />
          </div>
        </div>
        <Card padding="default">
          <table className="w-full">
            <tbody>
              {Array.from({ length: 20 }).map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (trades.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-yellow-100">Summary</h2>
          <p className="text-sm text-zinc-400 mt-1">All metrics in one place.</p>
        </div>
        <Card className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Activity className="w-10 h-10 text-ink-tertiary" />
          <p className="text-ink-secondary text-sm">No trades yet — import or log your first trade to see your summary.</p>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Destructure
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
    loggedDays, avgDailyNetPnl, avgDailyWinPct, avgDailyWinLoss,
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
  } = metrics;

  const { avgWin, avgLoss, largestWin, largestLoss: gsLargestLoss, avgR } = gs;

  // avgLoss from groupStats is already negative
  const avgLossDisplay = avgLoss;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">

      {/* Heading + Export button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-yellow-100">Summary</h2>
          <p className="text-sm text-zinc-400 mt-1">
            All metrics across {tradeCount} trades in {loggedDays} days.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-ds-subtle bg-surface-1 text-sm text-ink-secondary hover:text-ink-primary hover:border-border-ds-default transition-colors shrink-0"
          aria-label="Export PDF"
        >
          <Printer className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Metrics table */}
      <Card padding="default">
        <table className="w-full">
          <tbody>

            {/* ── 1. Performance ── */}
            <SectionHeader>Performance</SectionHeader>

            <MetricRow
              label="Net P&L"
              value={<Change value={netPnl} format="currency" decimals={2} showSign={false} />}
            />
            <MetricRow
              label="Trade Count"
              value={<span className="text-ink-primary">{fmtInt(tradeCount)}</span>}
            />
            <MetricRow
              label="Winning Trades"
              value={<span className="text-[#4AD295]">{fmtInt(winningTrades)}</span>}
            />
            <MetricRow
              label="Losing Trades"
              value={<span className="text-num-negative">{fmtInt(losingTrades)}</span>}
            />
            <MetricRow
              label="Breakeven Trades"
              value={<span className="text-ink-secondary">{fmtInt(breakevenTrades)}</span>}
            />
            <MetricRow
              label="Open Trades"
              value={<span className="text-ink-secondary">{fmtInt(openTrades)}</span>}
            />
            <MetricRow
              label="Win Rate"
              value={
                <span className={winRatePct >= 50 ? 'text-[#4AD295]' : 'text-num-negative'}>
                  {fmtPercent(winRatePct)}
                </span>
              }
            />
            <MetricRow
              label="Profit Factor"
              note="gross wins / gross losses"
              value={
                <span className={profitFactor >= 1 ? 'text-[#4AD295]' : 'text-num-negative'}>
                  {fmtRatio(profitFactor)}
                </span>
              }
            />
            <MetricRow
              label="Trade Expectancy"
              note="per-trade expected value"
              value={<Change value={tradeExpectancy} format="currency" decimals={2} showSign />}
            />
            <MetricRow
              label="Avg Trade Win/Loss"
              note="avg win ÷ |avg loss|"
              value={
                <span className={avgTradeWinLoss >= 1 ? 'text-[#4AD295]' : 'text-num-negative'}>
                  {fmtRatio(avgTradeWinLoss)}
                </span>
              }
            />
            <MetricRow
              label="Avg Net Trade P&L"
              note="per trade"
              value={<Change value={avgNetTradePnl} format="currency" decimals={2} showSign />}
            />
            <MetricRow
              label="Avg Winning Trade"
              value={<Price value={avgWin} format="currency" />}
            />
            <MetricRow
              label="Avg Losing Trade"
              value={<Change value={avgLossDisplay} format="currency" decimals={2} showSign={false} />}
            />
            <MetricRow
              label="Avg Hold Time (All)"
              note="closed trades"
              value={<span className="text-ink-primary">{fmtHoldTime(avgHoldTimeMs)}</span>}
            />
            <MetricRow
              label="Avg Hold Time (Wins)"
              value={<span className="text-ink-primary">{fmtHoldTime(avgHoldWinningMs)}</span>}
            />
            <MetricRow
              label="Avg Hold Time (Losses)"
              value={<span className="text-ink-primary">{fmtHoldTime(avgHoldLosingMs)}</span>}
            />
            <MetricRow
              label="Avg Hold Time (Scratch)"
              value={<span className="text-ink-primary">{fmtHoldTime(avgHoldScratchMs)}</span>}
            />

            {/* ── 2. Daily ── */}
            <SectionHeader>Daily</SectionHeader>

            <MetricRow
              label="Total Trading Days"
              value={<span className="text-ink-primary">{fmtInt(totalTradingDays)}</span>}
            />
            <MetricRow
              label="Logged Days"
              value={<span className="text-ink-primary">{fmtInt(loggedDays)}</span>}
            />
            <MetricRow
              label="Winning Days"
              value={<span className="text-[#4AD295]">{fmtInt(winningDays)}</span>}
            />
            <MetricRow
              label="Losing Days"
              value={<span className="text-num-negative">{fmtInt(losingDays)}</span>}
            />
            <MetricRow
              label="Breakeven Days"
              value={<span className="text-ink-secondary">{fmtInt(breakevenDays)}</span>}
            />
            <MetricRow
              label="Avg Daily Net P&L"
              value={<Change value={avgDailyNetPnl} format="currency" decimals={2} showSign />}
            />
            <MetricRow
              label="Avg Winning Day P&L"
              value={<span className="text-[#4AD295]"><Price value={avgWinningDayPnl} format="currency" /></span>}
            />
            <MetricRow
              label="Avg Losing Day P&L"
              value={<Change value={avgLosingDayPnl} format="currency" decimals={2} showSign />}
            />
            <MetricRow
              label="Avg Daily Win %"
              note="% of green days"
              value={
                <span className={avgDailyWinPct >= 50 ? 'text-[#4AD295]' : 'text-num-negative'}>
                  {fmtPercent(avgDailyWinPct)}
                </span>
              }
            />
            <MetricRow
              label="Avg Daily Win/Loss"
              note="avg green day ÷ |avg red day|"
              value={
                <span className={avgDailyWinLoss >= 1 ? 'text-[#4AD295]' : 'text-num-negative'}>
                  {fmtRatio(avgDailyWinLoss)}
                </span>
              }
            />
            <MetricRow
              label="Avg Daily Volume"
              note="contracts / shares"
              value={<span className="text-ink-primary">{avgDailyVolume.toFixed(1)}</span>}
            />
            <MetricRow
              label="Max Drawdown"
              note="alias for max daily net drawdown"
              value={<Change value={maxDrawdown} format="currency" decimals={2} showSign />}
            />
            <MetricRow
              label="Avg Drawdown"
              note="alias for avg daily net drawdown"
              value={<Change value={avgDrawdown} format="currency" decimals={2} showSign />}
            />
            <MetricRow
              label="Max Daily Net Drawdown"
              note="deepest from peak"
              value={<Change value={maxDailyNetDrawdown} format="currency" decimals={2} showSign />}
            />
            <MetricRow
              label="Avg Daily Net Drawdown"
              note="mean across all days"
              value={<Change value={avgDailyNetDrawdown} format="currency" decimals={2} showSign />}
            />

            {/* Month stats */}
            <MetricRow
              label="Best Month P&L"
              note={bestMonthLabel || undefined}
              value={<span className="text-[#4AD295]"><Price value={bestMonthPnl} format="currency" /></span>}
            />
            <MetricRow
              label="Lowest Month P&L"
              note={lowestMonthLabel || undefined}
              value={<Change value={lowestMonthPnl} format="currency" decimals={2} showSign />}
            />
            <MetricRow
              label="Avg Monthly P&L"
              value={<Change value={avgMonthlyPnl} format="currency" decimals={2} showSign />}
            />

            {/* ── 3. Risk / R ── */}
            <SectionHeader>Risk / R</SectionHeader>

            <MetricRow
              label="Avg Planned R"
              note="user_risk_r → rr proxy"
              value={<span className="text-ink-primary">{fmtR(avgPlannedR)}</span>}
            />
            <MetricRow
              label="Avg Realized R"
              note="actual_user_r → actual_r"
              value={
                <span className={
                  avgRealizedR === null ? 'text-ink-tertiary' :
                  avgRealizedR >= 0 ? 'text-[#4AD295]' : 'text-num-negative'
                }>
                  {fmtR(avgRealizedR)}
                </span>
              }
            />
            <MetricRow
              label="Avg R Multiple"
              note="from groupStats (actual_user_r → actual_r → rr)"
              value={<span className="text-ink-primary">{fmtR(avgR)}</span>}
            />

            {/* ── 4. Streaks & Extremes ── */}
            <SectionHeader>Streaks &amp; Extremes</SectionHeader>

            <MetricRow
              label="Max Consecutive Wins"
              value={<span className="text-[#4AD295]">{fmtInt(maxConsecutiveWins)}</span>}
            />
            <MetricRow
              label="Max Consecutive Losses"
              value={<span className="text-num-negative">{fmtInt(maxConsecutiveLosses)}</span>}
            />
            <MetricRow
              label="Max Consecutive Winning Days"
              value={<span className="text-[#4AD295]">{fmtInt(maxConsecutiveWinningDays)}</span>}
            />
            <MetricRow
              label="Max Consecutive Losing Days"
              value={<span className="text-num-negative">{fmtInt(maxConsecutiveLosingDays)}</span>}
            />
            <MetricRow
              label="Largest Profit (trade)"
              value={<span className="text-[#4AD295]"><Price value={largestProfit} format="currency" /></span>}
            />
            <MetricRow
              label="Largest Loss (trade)"
              value={<Change value={largestLoss} format="currency" decimals={2} showSign={false} />}
            />
            <MetricRow
              label="Largest Winning Trade"
              note="groupStats"
              value={<Price value={largestWin} format="currency" />}
            />
            <MetricRow
              label="Largest Losing Trade"
              note="groupStats"
              value={<Change value={gsLargestLoss} format="currency" decimals={2} showSign={false} />}
            />
            <MetricRow
              label="Largest Profitable Day"
              value={<Price value={largestProfitableDay} format="currency" />}
            />
            <MetricRow
              label="Largest Losing Day"
              value={<Change value={largestLosingDay} format="currency" decimals={2} showSign={false} />}
            />

            {/* ── 5. Costs ── */}
            <SectionHeader>Costs</SectionHeader>

            <MetricRow
              label="Total Fees"
              note="sum of trade.fees"
              value={<Change value={-totalFees} format="currency" decimals={2} showSign={false} />}
            />
            <MetricRow
              label="Total Commissions"
              note="no commission field in Trade — placeholder"
              value={<span className="text-ink-tertiary">{fmtCurrency(totalCommissions)}</span>}
            />
            <MetricRow
              label="Total Swap"
              note="no swap field in Trade — placeholder"
              value={<span className="text-ink-tertiary">{fmtCurrency(totalSwap)}</span>}
            />

          </tbody>
        </table>
      </Card>

    </div>
  );
}
