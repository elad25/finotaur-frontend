// src/pages/app/journal/RevengeRadar.tsx
// =====================================================
// JOURNAL — Revenge Radar
// =====================================================
// Route: /app/journal/revenge-radar
//
// Detects revenge trading from the user's existing closed trades
// (client-side only, no backend changes). Shows a Shadow-style
// cumulative P&L chart (Actual vs Without-Revenge) and a 12-week
// calendar marking revenge-trading days in purple.
// =====================================================

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useTrades } from '@/hooks/useTradesData';
import type { Trade } from '@/hooks/useTradesData';
import { useRegisterJournalFinoContext } from '@/components/fino/useJournalFinoContext';
import { usePortfolios } from '@/hooks/usePortfolios';
import { resolveHiddenPortfolioIds } from '@/lib/journal/hiddenAccounts';
import { useTradeReconcile } from '@/hooks/useTradeBars';
import { detectRevenge } from '@/lib/journal/revengeDetection';
import { HelpCircle, Info, Sparkles } from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import RevengeCalendar from '@/components/journal/RevengeCalendar';
import RevengeRulesInsights from '@/components/journal/RevengeRulesInsights';
import { FinoExplains } from '@/components/fino/FinoExplains';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_GOLD = '#C9A646';
const COLOR_PURPLE = '#A78BFA';
const COLOR_RED = '#F87171';

/** Matches JOURNAL_PANEL from Overview.tsx / TradeCompare.tsx */
const JOURNAL_PANEL =
  'relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]';

// ─── Formatting helpers (copied from TradeCompare's pattern) ─────────────────

function fmtPnl(pnl: number): string {
  const abs = Math.abs(pnl);
  const sign = pnl >= 0 ? '+' : '-';
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtUsd(v: number): string {
  return `$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
}

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${v.toFixed(1)}%`;
}

// ─── Info icon (matches ShadowInfoIcon from TradeCompare.tsx) ────────────────

function RevengeInfoIcon({ label }: { label: string }) {
  return (
    <TooltipProvider delayDuration={120}>
      <UITooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            onClick={(e) => e.preventDefault()}
            className="inline-flex shrink-0 items-center justify-center"
          >
            <HelpCircle
              className="h-3.5 w-3.5 shrink-0 cursor-help text-white/38 transition-colors hover:text-[#E8C766]"
              role="img"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-[280px] border-[#E8C766]/25 bg-[rgba(10,10,10,0.96)] text-[11px] font-medium leading-snug text-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
        >
          {label}
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

const DETECTION_RULES_LABEL =
  'A trade is flagged as revenge trading when any of these fire: (1) Quick re-entry — same symbol, re-opened within 15 minutes of a loss. (2) Rapid fire — any symbol, re-opened within 5 minutes of a loss. (3) Size escalation — re-opened within 30 minutes of a loss with position size at least 1.5x your recent median. (4) Loss-streak chase — opened within 60 minutes after 2 or more consecutive losses.';

// ─── Stat card (small local component) ────────────────────────────────────────

function StatCard({
  label,
  value,
  valueClassName,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  sub?: string;
}) {
  return (
    <div className={`${JOURNAL_PANEL} p-ds-4 flex flex-col gap-1`}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-white/42">{label}</span>
      <span className={`font-mono tabular-nums text-[20px] font-semibold ${valueClassName ?? 'text-white'}`}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-white/38">{sub}</span>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RevengeRadar() {
  useTradeReconcile();
  useRegisterJournalFinoContext();

  const { data: allTrades, isLoading } = useTrades();
  const { portfolios } = usePortfolios();

  const hiddenPortfolioIds = useMemo(
    () => new Set(resolveHiddenPortfolioIds(portfolios)),
    [portfolios],
  );

  const closedTrades = useMemo<Trade[]>(() => {
    if (!allTrades) return [];
    return allTrades.filter(
      (t) =>
        t.exit_price != null && t.exit_price > 0 && t.close_at != null &&
        !(t.portfolio_id != null && hiddenPortfolioIds.has(t.portfolio_id)),
    );
  }, [allTrades, hiddenPortfolioIds]);

  const analysis = useMemo(() => detectRevenge(closedTrades), [closedTrades]);

  const lastPoint = analysis.points[analysis.points.length - 1];
  const costOfRevenge = lastPoint ? lastPoint.clean - lastPoint.actual : 0;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  const loadingEl = (
    <div className={`${JOURNAL_PANEL} p-ds-5`}>
      <p className="text-center text-sm text-white/42 py-8">Loading your trades…</p>
    </div>
  );

  // ── Empty trade state ─────────────────────────────────────────────────────
  const noTradesEl = (
    <div className={`${JOURNAL_PANEL} p-ds-5`}>
      <div className="flex flex-col items-center gap-ds-3 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] text-white/28">
          <Info className="h-7 w-7" />
        </div>
        <p className="text-sm font-medium text-white/60">No closed trades yet</p>
        <p className="text-xs text-white/38 max-w-[320px]">
          Connect a broker or add trades to see your revenge analysis.
        </p>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1200px] mx-auto pt-0 pb-ds-4 px-ds-4 flex flex-col gap-ds-4">

      {/* Page header */}
      <div className="relative flex items-center justify-center">
        <div className="flex flex-col items-center text-center gap-1">
          <h1 className="text-3xl font-bold text-white">Revenge Radar</h1>
          <p className="text-[11px] text-white/62">What revenge trading really costs you.</p>
        </div>
        <div className="absolute right-0">
          <FinoExplains title="What is Revenge Radar?" className="w-fit">
            Revenge trades are the ones you take within minutes of a loss — usually
            bigger and off-plan. Revenge Radar flags those sequences across your real
            trades and tallies exactly what they cost you, so you can see the true
            price of trading on tilt.
          </FinoExplains>
        </div>
      </div>

      {isLoading && loadingEl}

      {!isLoading && closedTrades.length === 0 && noTradesEl}

      {!isLoading && closedTrades.length > 0 && (
        <>
          {analysis.revengeCount === 0 && (
            <div className={`${JOURNAL_PANEL} p-ds-4`}>
              <div className="flex items-center justify-center gap-2 py-2">
                <Sparkles className="h-4 w-4 text-[#C9A646]" />
                <p className="text-sm font-medium text-white/80">
                  No revenge trading detected. Your discipline is holding.
                </p>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-ds-3">
            <StatCard
              label="Revenge trades"
              value={analysis.revengeCount}
              sub={`of ${analysis.totalCount} total`}
            />
            <StatCard
              label="Cost of revenge"
              value={fmtPnl(analysis.revengePnl)}
              valueClassName={analysis.revengePnl < 0 ? 'text-[#F87171]' : 'text-white'}
            />
            <StatCard
              label="Win rate"
              value={
                <span className="flex items-baseline gap-2">
                  <span style={{ color: COLOR_PURPLE }}>{fmtPct(analysis.revengeWinRate)}</span>
                  <span className="text-white/28 text-[13px] font-normal">vs</span>
                  <span className="text-white">{fmtPct(analysis.normalWinRate)}</span>
                </span>
              }
              sub="revenge vs normal"
            />
            <StatCard
              label="Revenge days"
              value={analysis.revengeDays.length}
              sub="all-time"
            />
          </div>

          {/* Personal AI insights — rules vs. reality */}
          <RevengeRulesInsights analysis={analysis} closedTrades={closedTrades} />

          {/* Main chart panel */}
          <div className={JOURNAL_PANEL}>
            <div className="flex items-start justify-between gap-ds-3 border-b border-white/[0.06] px-ds-5 py-ds-4">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-white">Actual vs. Without revenge</span>
                <RevengeInfoIcon label={DETECTION_RULES_LABEL} />
              </div>
            </div>
            {costOfRevenge > 0 && (
              <p className="px-ds-5 pt-ds-4 text-[12px] text-white/62">
                Without revenge trades your P&amp;L would be{' '}
                <span className="font-mono tabular-nums font-semibold" style={{ color: COLOR_PURPLE }}>
                  {fmtUsd(costOfRevenge)}
                </span>{' '}
                higher.
              </p>
            )}
            <div className="px-ds-5 pb-ds-5 pt-ds-4" style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <AreaChart data={analysis.points} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="revenge-grad-actual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLOR_GOLD} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={COLOR_GOLD} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="revenge-grad-clean" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLOR_PURPLE} stopOpacity={0.14} />
                      <stop offset="100%" stopColor={COLOR_PURPLE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      `${v >= 0 ? '+' : '-'}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`
                    }
                    width={72}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(20,20,20,0.95)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 8,
                      fontSize: 11,
                      padding: '4px 8px',
                    }}
                    itemStyle={{ color: 'rgba(255,255,255,0.82)' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.42)' }}
                    formatter={(val: number, name: string) => [fmtPnl(Math.round(val)), name]}
                    cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', paddingTop: 8 }} />
                  {analysis.revengeCount > 0 && (
                    <Area
                      type="monotone"
                      dataKey="clean"
                      name="Without revenge"
                      stroke={COLOR_PURPLE}
                      strokeWidth={2}
                      fill="url(#revenge-grad-clean)"
                      fillOpacity={1}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="Actual"
                    stroke={COLOR_GOLD}
                    strokeWidth={3.5}
                    fill="url(#revenge-grad-actual)"
                    fillOpacity={1}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Calendar */}
          <RevengeCalendar revengeDays={analysis.revengeDays} trades={closedTrades} />
        </>
      )}
    </div>
  );
}
