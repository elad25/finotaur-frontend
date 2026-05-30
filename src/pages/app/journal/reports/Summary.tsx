/**
 * JournalReportsSummary — Tradezella-parity summary tab.
 *
 * Renders a grouped 2-column metrics table covering every metric from
 * computeReportMetrics() + computeGroupStats(), plus an Export PDF button stub.
 *
 * Sections:
 *  1. Performance      — trade-level P&L and win stats
 *  2. Daily            — day-level aggregates and drawdown
 *  3. Risk / R         — R-multiple metrics
 *  4. Streaks & Extremes — largest wins/losses per trade and per day
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
  } = metrics;

  const { avgWin, avgLoss, largestWin, largestLoss, avgR } = gs;

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
              value={<span className="text-ink-primary">{tradeCount}</span>}
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
              label="Avg Hold Time"
              note="closed trades"
              value={<span className="text-ink-primary">{fmtHoldTime(avgHoldTimeMs)}</span>}
            />

            {/* ── 2. Daily ── */}
            <SectionHeader>Daily</SectionHeader>

            <MetricRow
              label="Logged Days"
              value={<span className="text-ink-primary">{loggedDays}</span>}
            />
            <MetricRow
              label="Avg Daily Net P&L"
              value={<Change value={avgDailyNetPnl} format="currency" decimals={2} showSign />}
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
              label="Max Daily Net Drawdown"
              note="deepest from peak"
              value={<Change value={maxDailyNetDrawdown} format="currency" decimals={2} showSign />}
            />
            <MetricRow
              label="Avg Daily Net Drawdown"
              note="mean across all days"
              value={<Change value={avgDailyNetDrawdown} format="currency" decimals={2} showSign />}
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
              label="Largest Winning Trade"
              value={<Price value={largestWin} format="currency" />}
            />
            <MetricRow
              label="Largest Losing Trade"
              value={<Change value={largestLoss} format="currency" decimals={2} showSign={false} />}
            />
            <MetricRow
              label="Largest Profitable Day"
              value={<Price value={largestProfitableDay} format="currency" />}
            />
            <MetricRow
              label="Largest Losing Day"
              value={<Change value={largestLosingDay} format="currency" decimals={2} showSign={false} />}
            />

          </tbody>
        </table>
      </Card>

    </div>
  );
}
