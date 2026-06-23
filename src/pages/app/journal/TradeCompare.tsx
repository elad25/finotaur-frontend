// src/pages/app/journal/TradeCompare.tsx
// =====================================================
// JOURNAL — Trade Compare (What-If Analysis) — "Shadow"
// =====================================================
// Route: /app/journal/trade-compare
//
// Three tabs — Day · Distribution · Trade
//   Trade        → engine scenarios when bars exist; planned fallback when no bars.
//   Day          → planned cumulative chart + summary cards + Discipline Tax hero card.
//   Distribution → per-rule stat blocks + histogram; building state until N≥20.
// =====================================================

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  LineChart,
  Line,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useTrades } from '@/hooks/useTradesData';
import type { Trade } from '@/hooks/useTradesData';
import { useRegisterJournalFinoContext } from '@/components/fino/useJournalFinoContext';
import { usePortfolios } from '@/hooks/usePortfolios';
import { resolveHiddenPortfolioIds } from '@/lib/journal/hiddenAccounts';
import { analyzeWhatIf, fixedTargetAtR, breakEvenAtR, estimateBreakEvenAtR, recommendRR, riskUsd, resolveMultiplier } from '@/lib/journal/whatIfEngine';
import type { WhatIfScenario, WhatIfResult, PriceBar, WhatIfTrade } from '@/lib/journal/whatIfEngine';
import { useTradeReconcile, useTradeBars, useAllTradeBars } from '@/hooks/useTradeBars';
import { buildAggregate } from '@/lib/journal/plannedScenarios';
import type { PlannedScenario } from '@/lib/journal/plannedScenarios';
import { useShadowTrade, useShadowAggregate } from '@/hooks/useShadow';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FinoExplains } from '@/components/fino/FinoExplains';
import {
  Lightbulb,
  Info,
  Activity,
  Target,
  TrendingUp,
  Shield,
  HelpCircle,
  ListFilter,
  BarChart2,
  Sparkles,
  EyeOff,
} from 'lucide-react';
import { buildShadowInsights } from '@/lib/journal/shadowInsight';
import type { ShadowInsight } from '@/lib/journal/shadowInsight';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { ScenarioResult, ScenarioKey } from '@/lib/shadow/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_GOLD   = '#C9A646';
const COLOR_BLUE   = '#60A5FA';
const COLOR_RED    = '#F87171';
const COLOR_GREEN  = '#4AD295';
const COLOR_SILVER = '#C3C8D1';

/** Matches JOURNAL_PANEL from Overview.tsx */
const JOURNAL_PANEL =
  'relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]';

/** Minimum tracked trades before distribution is considered statistically meaningful. */
const DISTRIBUTION_MIN_N = 20;

// ─── Info icon (matches JournalInfoIcon from Overview.tsx) ───────────────────

function ShadowInfoIcon({ label }: { label: string }) {
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
          className="max-w-[240px] border-[#E8C766]/25 bg-[rgba(10,10,10,0.96)] text-[11px] font-medium leading-snug text-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
        >
          {label}
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtPnl(pnl: number): string {
  const abs = Math.abs(pnl);
  const sign = pnl >= 0 ? '+' : '-';
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDelta(delta: number): string {
  const abs = Math.abs(delta);
  const sign = delta >= 0 ? '+' : '-';
  return `${sign}$${Math.round(abs).toLocaleString('en-US')} vs your exit`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function fmtPrice(v: number): string {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtR(r: number): string {
  return `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`;
}

// ─── Price chart (schematic OR real bars) ────────────────────────────────────

interface PriceChartProps {
  trade: Trade;
  bars: PriceBar[];
  mfe: WhatIfResult['mfe'];
  mae: WhatIfResult['mae'];
  /** Which scenario set to overlay — mirrors the Performance tab's Stop/Target toggle. */
  view: 'stop' | 'target';
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}

function SchematicTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-white/[0.08] bg-[rgba(10,10,10,0.96)] px-3 py-2 text-[12px] shadow-lg space-y-1">
      <p className="text-white/42 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span style={{ color: p.color }} className="font-data font-semibold">
            {p.name}
          </span>
          <span className="font-data text-white/82 tabular-nums">
            {fmtPrice(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Fixed-R multiple used for the single-trade "Let it run" overlay line. */
const TRADE_LET_IT_RUN_R = 2;

function PriceChart({ trade, bars, mfe, mae, view }: PriceChartProps) {
  const hasBars = bars.length > 0;

  const stopPrice = trade.stop_price && trade.stop_price > 0 ? trade.stop_price : null;
  const tpPrice   = trade.take_profit_price && trade.take_profit_price > 0
    ? trade.take_profit_price
    : null;

  // ── Scenario exit LEVELS for this one trade (mirrors the Performance tab) ──
  // Break-even = your entry (scratch the trade). Let-it-run = a fixed-R target
  // measured from the original stop, in the trade's direction. Both derive from
  // recorded levels — no price bars required.
  const breakEvenPrice = view === 'stop' ? trade.entry_price : null;
  const riskPerUnit = stopPrice != null ? Math.abs(trade.entry_price - stopPrice) : null;
  const letRunPrice = view === 'target' && riskPerUnit != null && riskPerUnit > 0
    ? (trade.side === 'LONG'
        ? trade.entry_price + TRADE_LET_IT_RUN_R * riskPerUnit
        : trade.entry_price - TRADE_LET_IT_RUN_R * riskPerUnit)
    : null;

  const chartData: Array<{ time: string; price: number }> = hasBars
    ? bars.map((b) => ({
        time: new Date(b.t).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        price: b.c,
      }))
    : [
        { time: fmtDate(trade.open_at),  price: trade.entry_price },
        { time: fmtDate(trade.close_at ?? trade.open_at), price: trade.exit_price ?? trade.entry_price },
      ];

  const allPrices: number[] = [
    trade.entry_price,
    trade.exit_price ?? trade.entry_price,
    ...(stopPrice    ? [stopPrice]    : []),
    ...(tpPrice      ? [tpPrice]      : []),
    ...(letRunPrice  ? [letRunPrice]  : []),
    ...(mfe          ? [mfe.price]    : []),
    ...(mae          ? [mae.price]    : []),
    ...(hasBars   ? bars.map((b) => b.h) : []),
    ...(hasBars   ? bars.map((b) => b.l) : []),
  ].filter((v): v is number => typeof v === 'number' && v > 0);
  const yMin = Math.min(...allPrices);
  const yMax = Math.max(...allPrices);
  const yPad = (yMax - yMin) * 0.1 || yMax * 0.05;
  const domain: [number, number] = [yMin - yPad, yMax + yPad];

  let mfeIndex: number | null = null;
  let maeIndex: number | null = null;
  if (hasBars && mfe) {
    const isLong = trade.side === 'LONG';
    for (let i = 0; i < bars.length; i++) {
      if (isLong && bars[i].h === mfe.price)  { mfeIndex = i; break; }
      if (!isLong && bars[i].l === mfe.price) { mfeIndex = i; break; }
    }
  }
  if (hasBars && mae) {
    const isLong = trade.side === 'LONG';
    for (let i = 0; i < bars.length; i++) {
      if (isLong && bars[i].l === mae.price)  { maeIndex = i; break; }
      if (!isLong && bars[i].h === mae.price) { maeIndex = i; break; }
    }
  }
  const mfeLabel = chartData[mfeIndex ?? -1]?.time ?? null;
  const maeLabel = chartData[maeIndex ?? -1]?.time ?? null;

  return (
    <div className={`${JOURNAL_PANEL}`}>
      <div className="flex items-start justify-between gap-ds-3 border-b border-white/[0.06] px-ds-5 py-ds-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-white">Price Path</span>
            <ShadowInfoIcon label="Entry → exit with what-if markers. Green dot = maximum favourable excursion (MFE); red dot = maximum adverse excursion (MAE)." />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-white/42">
              {hasBars ? 'Close per bar — real intra-trade path' : 'Entry → exit schematic only'}
            </span>
            <span className="text-[11px] text-white/28">·</span>
            <span className="font-data text-[11px] font-medium text-white/62">
              {trade.symbol}
            </span>
            <span className="text-[11px] text-white/42">{trade.side}</span>
            <span className="text-[11px] text-white/28">
              {new Date(trade.close_at ?? trade.open_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            {trade.pnl != null && (
              <span
                className={`font-data text-[11px] font-semibold tabular-nums ${
                  (trade.pnl ?? 0) >= 0 ? 'text-[#4AD295]' : 'text-[#F87171]'
                }`}
              >
                {fmtPnl(trade.pnl)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-ds-3 text-[11px] text-white/42 flex-wrap justify-end">
          {hasBars && mfe && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#4AD295]" />
              MFE {fmtPrice(mfe.price)}
            </span>
          )}
          {hasBars && mae && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#F87171]" />
              MAE {fmtPrice(mae.price)}
            </span>
          )}
          {/* Actual — always the dominant baseline */}
          <span className="flex items-center gap-1">
            <span className="inline-block h-px w-4 border-t-[3px] border-solid" style={{ borderColor: COLOR_GOLD }} />
            Actual
          </span>
          {/* Stop view: Original stop (red) + Break-even (silver) */}
          {view === 'stop' && stopPrice && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-px w-4 border-t-2 border-dashed" style={{ borderColor: COLOR_RED }} />
              Original stop {fmtPrice(stopPrice)}
            </span>
          )}
          {view === 'stop' && breakEvenPrice && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-px w-4 border-t-2 border-dashed" style={{ borderColor: COLOR_SILVER }} />
              Break-even {fmtPrice(breakEvenPrice)}
            </span>
          )}
          {/* Target view: Target (green) + Let it run (silver) */}
          {view === 'target' && tpPrice && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-px w-4 border-t-2 border-dashed" style={{ borderColor: COLOR_GREEN }} />
              Target {fmtPrice(tpPrice)}
            </span>
          )}
          {view === 'target' && letRunPrice && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-px w-4 border-t-2 border-dashed" style={{ borderColor: COLOR_SILVER }} />
              Let it run ({TRADE_LET_IT_RUN_R}R) {fmtPrice(letRunPrice)}
            </span>
          )}
        </div>
      </div>

      <div className="px-ds-5 pb-ds-5 pt-ds-4" style={{ width: '100%', height: 480 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="shadowPriceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(201,166,70,0.25)" />
                <stop offset="100%" stopColor="rgba(201,166,70,0)" />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="time"
              tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={hasBars && chartData.length > 10 ? Math.floor(chartData.length / 6) : 0}
            />
            <YAxis
              domain={domain}
              tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              width={72}
            />

            {/* ── Scenario exit levels — coloured per the Performance tab, gated by view ── */}
            {/* Stop view: Original stop (red) + Break-even = entry (silver). */}
            {view === 'stop' && stopPrice && (
              <ReferenceLine
                y={stopPrice}
                stroke={COLOR_RED}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: 'Original stop', fill: COLOR_RED, fontSize: 10, position: 'right' }}
              />
            )}
            {view === 'stop' && breakEvenPrice && (
              <ReferenceLine
                y={breakEvenPrice}
                stroke={COLOR_SILVER}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: 'Break-even', fill: COLOR_SILVER, fontSize: 10, position: 'right' }}
              />
            )}
            {/* Target view: Target (green) + Let it run at fixed R (silver). */}
            {view === 'target' && tpPrice && (
              <ReferenceLine
                y={tpPrice}
                stroke={COLOR_GREEN}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: 'Target', fill: COLOR_GREEN, fontSize: 10, position: 'right' }}
              />
            )}
            {view === 'target' && letRunPrice && (
              <ReferenceLine
                y={letRunPrice}
                stroke={COLOR_SILVER}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: `Let it run (${TRADE_LET_IT_RUN_R}R)`, fill: COLOR_SILVER, fontSize: 10, position: 'right' }}
              />
            )}
            {/* Entry — very subtle reference (shown in Target view; Stop view uses the silver Break-even line at entry). */}
            {view === 'target' && (
              <ReferenceLine
                y={trade.entry_price}
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            )}

            {hasBars && mfe && mfeLabel && (
              <ReferenceDot
                x={mfeLabel}
                y={mfe.price}
                r={6}
                fill={COLOR_GREEN}
                stroke="var(--color-surface-1, #111)"
                strokeWidth={2}
                label={{ value: 'MFE', fill: COLOR_GREEN, fontSize: 10, position: 'top' }}
              />
            )}
            {hasBars && mae && maeLabel && (
              <ReferenceDot
                x={maeLabel}
                y={mae.price}
                r={6}
                fill={COLOR_RED}
                stroke="var(--color-surface-1, #111)"
                strokeWidth={2}
                label={{ value: 'MAE', fill: COLOR_RED, fontSize: 10, position: 'bottom' }}
              />
            )}

            <Tooltip content={<SchematicTooltip />} />

            <Area
              type={hasBars ? 'monotone' : 'linear'}
              dataKey="price"
              name="Actual"
              stroke={COLOR_GOLD}
              strokeWidth={hasBars ? 2.5 : 3.5}
              fill="url(#shadowPriceFill)"
              fillOpacity={1}
              dot={hasBars
                ? false
                : (props: { cx?: number; cy?: number; index?: number }) => {
                    const { cx, cy, index } = props;
                    if (cx == null || cy == null) return <g key={`dot-${index}`} />;
                    if (index === 0) {
                      return (
                        <circle
                          key={`entry-dot-${cx}-${cy}`}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill="transparent"
                          stroke={COLOR_GOLD}
                          strokeWidth={2}
                        />
                      );
                    }
                    return (
                      <circle
                        key={`exit-dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={COLOR_GOLD}
                        stroke="var(--color-surface-1, #111)"
                        strokeWidth={2}
                      />
                    );
                  }
              }
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {!hasBars && (
        <p className="mx-ds-5 mb-ds-4 -mt-2 text-[11px] text-white/38">
          Schematic only — entry and exit prices. Enable price tracking to see the full intra-trade path.
        </p>
      )}
    </div>
  );
}

// ─── Scenario icon map ────────────────────────────────────────────────────────

function scenarioIcon(key: string) {
  const cls = 'h-5 w-5';
  switch (key) {
    case 'actual':                    return <Activity className={cls} />;
    case 'held_original_stop':        return <Shield className={cls} />;
    case 'original_target_hit':       return <Target className={cls} />;
    case 'moved_stop_to_breakeven':   return <Activity className={cls} />;
    case 'held_loser_past_stop':      return <TrendingUp className={cls} />;
    case 'no_trade':                  return <Activity className={cls} />;
    // legacy planned keys
    case 'stop':      return <Shield className={cls} />;
    case 'target':    return <Target className={cls} />;
    case 'breakeven': return <Activity className={cls} />;
    case 'held_to_plan':   return <Target className={cls} />;
    case 'best_possible':  return <TrendingUp className={cls} />;
    case 'held_stop':      return <Shield className={cls} />;
    default:               return <Activity className={cls} />;
  }
}

// ─── Planned scenario card (unchanged from v1) ────────────────────────────────

interface PlannedScenarioCardProps {
  scenario: PlannedScenario | WhatIfScenario;
  isBaseline: boolean;
  hasBars: boolean;
}

function PlannedScenarioCard({ scenario, isBaseline, hasBars }: PlannedScenarioCardProps) {
  const pnl = scenario.pnl ?? 0;
  const pnlPositive = pnl >= 0;
  const deltaPositive = (scenario.deltaVsActual ?? 0) >= 0;

  const valueColor = !scenario.available
    ? 'text-white/28'
    : isBaseline
      ? 'text-[#F2C85F]'
      : pnlPositive
        ? 'text-[#3BC76E]'
        : 'text-[#EF4444]';

  return (
    <div
      className={[
        JOURNAL_PANEL,
        'min-h-[110px] px-ds-4 py-ds-4 transition-opacity',
        !scenario.available ? 'opacity-40' : '',
        isBaseline ? 'ring-1 ring-[#C9A646]/30' : '',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_50%,rgba(255,255,255,0.025),transparent_32%)]" />
      <div className="relative flex h-full flex-col gap-ds-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[1.2px] text-white/50 leading-snug">
            {scenario.label}
          </span>
          <div
            className={[
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              isBaseline
                ? 'bg-[#C9A646]/12 text-[#E8C766]'
                : !scenario.available
                  ? 'bg-white/[0.04] text-white/20'
                  : pnlPositive
                    ? 'bg-[#3BC76E]/12 text-[#3BC76E]'
                    : 'bg-[#EF4444]/12 text-[#EF4444]',
            ].join(' ')}
          >
            {scenarioIcon(scenario.key)}
          </div>
        </div>

        {scenario.available && scenario.pnl != null ? (
          <p className={`font-data text-[clamp(22px,1.55vw,28px)] font-semibold leading-none tracking-normal tabular-nums ${valueColor}`}>
            {fmtPnl(scenario.pnl)}
          </p>
        ) : (
          <p className="font-data text-[clamp(22px,1.55vw,28px)] font-semibold leading-none text-white/20">—</p>
        )}

        {!isBaseline && scenario.available && scenario.deltaVsActual != null && (
          <span
            className={[
              'self-start rounded-[6px] px-2 py-0.5 text-[11px] font-medium',
              deltaPositive
                ? 'bg-[#4AD295]/10 text-[#4AD295]'
                : 'bg-[#F87171]/10 text-[#F87171]',
            ].join(' ')}
          >
            {fmtDelta(scenario.deltaVsActual)}
          </span>
        )}
        {isBaseline && (
          <span className="self-start rounded-[4px] bg-[#C9A646]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#E8C766]">
            Your exit
          </span>
        )}

        <p className="text-[11px] text-white/38 leading-relaxed mt-auto">
          {scenario.detail}
          {'requires' in scenario && !scenario.available && scenario.requires && !hasBars && (
            <span className="block mt-0.5 italic text-white/28">
              {scenario.requires === 'bars'
                ? 'Needs price tracking'
                : 'Needs order history'}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── Engine scenario card (v2) ─────────────────────────────────────────────────

interface EngineScenarioCardProps {
  scenario: ScenarioResult;
  isActual: boolean;
  distributionN: number;
}

function EngineScenarioCard({ scenario, isActual, distributionN }: EngineScenarioCardProps) {
  const pnlPositive = (scenario.pnlUsd ?? 0) >= 0;

  const valueColor = !scenario.available
    ? 'text-white/28'
    : isActual
      ? 'text-[#F2C85F]'
      : pnlPositive
        ? 'text-[#3BC76E]'
        : 'text-[#EF4444]';

  return (
    <div
      className={[
        JOURNAL_PANEL,
        'min-h-[120px] px-ds-4 py-ds-4 transition-opacity',
        !scenario.available ? 'opacity-40' : '',
        isActual ? 'ring-1 ring-[#C9A646]/30' : '',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_50%,rgba(255,255,255,0.025),transparent_32%)]" />
      <div className="relative flex h-full flex-col gap-ds-2">

        {/* Label row + icon */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[1.2px] text-white/50 leading-snug">
            {scenario.label}
          </span>
          <div
            className={[
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              isActual
                ? 'bg-[#C9A646]/12 text-[#E8C766]'
                : !scenario.available
                  ? 'bg-white/[0.04] text-white/20'
                  : 'bg-white/[0.06] text-white/50',
            ].join(' ')}
          >
            {scenarioIcon(scenario.key)}
          </div>
        </div>

        {/* P&L number */}
        {scenario.available && scenario.pnlUsd != null ? (
          <p className={`font-data text-[clamp(22px,1.55vw,28px)] font-semibold leading-none tabular-nums ${valueColor}`}>
            {fmtPnl(scenario.pnlUsd)}
          </p>
        ) : (
          <p className="font-data text-[clamp(22px,1.55vw,28px)] font-semibold leading-none text-white/20">—</p>
        )}

        {/* R multiple */}
        {scenario.available && scenario.rMultiple != null && (
          <span className="font-data text-[12px] text-white/50 tabular-nums">
            {fmtR(scenario.rMultiple)}
          </span>
        )}

        {/* Badges row */}
        <div className="flex flex-wrap gap-1 mt-auto">
          {isActual && (
            <span className="rounded-[4px] bg-[#C9A646]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#E8C766]">
              Your exit
            </span>
          )}
          {scenario.confidence === 'ambiguous' && (
            <span className="rounded-[4px] bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white/42">
              Ambiguous
            </span>
          )}
          {scenario.simulated && (
            <span className="rounded-[4px] bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white/42">
              Simulated
            </span>
          )}
        </div>

        {/* Note */}
        <p className="text-[11px] text-white/38 leading-relaxed">
          {scenario.note}
        </p>

        {/* Distribution context — for non-actual, non-no_trade scenarios */}
        {!isActual && scenario.key !== 'no_trade' && scenario.available && (
          <p className="text-[10px] text-white/28 leading-relaxed">
            {distributionN < DISTRIBUTION_MIN_N
              ? `Anecdotal — not enough tracked trades yet (${distributionN}/${DISTRIBUTION_MIN_N} minimum).`
              : `Across your comparable trades`}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Total tooltip ────────────────────────────────────────────────────────────

interface TotalTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}

function TotalTooltip({ active, payload, label }: TotalTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-white/[0.08] bg-[rgba(10,10,10,0.96)] px-3 py-2 text-[12px] shadow-lg space-y-1">
      <p className="text-white/42 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span style={{ color: p.color }} className="font-data font-semibold text-[11px]">
            {p.name}
          </span>
          <span className="font-data tabular-nums text-white/82">
            {fmtPnl(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}


// ─── Static small-multiple card (non-interactive) ────────────────────────────

interface SmallScenarioCardProps {
  label: string;
  subtitle: string;
  total: number;
  curve: number[];
  curveColor: string;
  isBaseline?: boolean;
  delta?: number;
  onClick?: () => void;
  hidden?: boolean;
}

function SmallScenarioCard({
  label,
  subtitle,
  total,
  curve,
  curveColor,
  isBaseline = false,
  delta,
  onClick,
  hidden = false,
}: SmallScenarioCardProps) {
  const totalPositive = total >= 0;
  const deltaPositive = (delta ?? 0) >= 0;
  return (
    <div
      role={onClick ? 'button' : undefined}
      aria-pressed={onClick ? !hidden : undefined}
      onClick={onClick}
      className={`rounded-[14px] border p-ds-4 flex flex-col gap-ds-2 transition-opacity ${
        isBaseline
          ? 'border-2 border-[#C9A646]/40 bg-[rgba(22,22,22,0.90)]'
          : 'border-[0.5px] border-white/[0.08] bg-[rgba(22,22,22,0.90)]'
      } ${onClick ? 'cursor-pointer hover:border-white/[0.18]' : ''} ${hidden ? 'opacity-45' : ''}`}
    >
      <div className="flex items-start justify-between gap-ds-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-[13px] font-semibold text-white leading-snug">{label}</p>
          <p className="text-[11px] text-white/42 leading-relaxed">{subtitle}</p>
        </div>
        {isBaseline && (
          <span className="flex-shrink-0 rounded-[4px] bg-[#C9A646]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#E8C766]">
            Your exit
          </span>
        )}
      </div>

      <MiniCurve data={curve} color={curveColor} />

      <p
        className={`font-data text-xl font-bold tabular-nums ${
          totalPositive ? 'text-[#4AD295]' : 'text-[#F87171]'
        }`}
      >
        {fmtPnl(Math.round(total))}
      </p>

      {!isBaseline && delta != null && (
        <span
          className={`self-start rounded-[6px] px-2 py-0.5 text-[11px] font-medium ${
            deltaPositive
              ? 'bg-[#4AD295]/10 text-[#4AD295]'
              : 'bg-[#F87171]/10 text-[#F87171]'
          }`}
        >
          {fmtDelta(Math.round(delta))}
        </span>
      )}
      {hidden && onClick && (
        <span className="mt-auto flex items-center gap-1 text-[11px] text-white/38">
          <EyeOff className="h-3.5 w-3.5" />
          Hidden — click to show
        </span>
      )}
    </div>
  );
}

// ─── Day tab (Performance) ────────────────────────────────────────────────────
// Layout (top → bottom):
//   1. Combined "Cumulative P&L by scenario" chart (3 lines, incl. BE-stop)
//   2. Per-scenario small-multiples grid (4 cards: Actual,
//      Held to target, Break-even stop [interactive], Target — let it run [interactive])
//   3. RR recommendation panel

type SeriesKey = 'actual' | 'target' | 'breakevenStop' | 'targetScenario' | 'originalStop';

function DayView({ trades, barsByTrade }: { trades: Trade[]; barsByTrade: Map<string, PriceBar[]> }) {
  // Inner Stop / Target switch for the Performance tab.
  const [view, setView] = useState<'stop' | 'target'>('stop');

  // Shared toggle state — lifted so BE-stop card and chart's 4th line stay in sync.
  const [beR, setBeR] = useState<1 | 2 | 3>(1);
  const [targetR, setTargetR] = useState<1 | 2 | 3 | 4>(2);

  // Series visibility — clicking a card hides/shows its line in the main chart.
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());
  const toggle = (key: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const agg = useMemo(() => buildAggregate(trades), [trades]);

  // ── Sorted closed trades (same order as buildAggregate uses) ──────────────
  // buildAggregate sorts by close_at asc — mirror that here for WhatIfTrade alignment.
  const sortedClosed = useMemo(() => {
    return trades
      .filter((t) => t.exit_price != null && t.exit_price > 0 && t.close_at != null)
      .sort(
        (a, b) =>
          new Date(a.close_at ?? a.open_at).getTime() -
          new Date(b.close_at ?? b.open_at).getTime(),
      );
  }, [trades]);

  // ── WhatIfTrade wrappers (parallel to sortedClosed) ───────────────────────
  const allWhatIfTrades = useMemo<WhatIfTrade[]>(() => {
    return sortedClosed.map((t): WhatIfTrade => ({
      side: t.side,
      entry_price: t.entry_price,
      exit_price: t.exit_price ?? t.entry_price,
      quantity: t.quantity,
      multiplier: t.multiplier ?? null,
      symbol: t.symbol,
      stop_price: t.stop_price ?? null,
      take_profit_price: t.take_profit_price ?? null,
      open_at: t.open_at,
      close_at: t.close_at ?? t.open_at,
      mfe_r: t.mfe_r ?? null,
      mae_r: t.mae_r ?? null,
    }));
  }, [sortedClosed]);

  const actualTotal = agg.totals.actual;

  // ── Target-at-R curve (reactive to targetR) ───────────────────────────────
  const targetData = useMemo(() => {
    let cum = 0;
    let hits = 0;
    const curve = sortedClosed.map((t, i) => {
      const wt = allWhatIfTrades[i];
      const result = fixedTargetAtR(wt, targetR);
      let tradePnl: number;
      if (result !== null) {
        tradePnl = result.pnlUsd;
        if (result.resolved === 'target') hits++;
      } else {
        tradePnl = t.pnl ?? 0;
      }
      cum += tradePnl;
      return cum;
    });
    const total = curve[curve.length - 1] ?? 0;
    const hitRate =
      sortedClosed.length > 0 ? Math.round((hits / sortedClosed.length) * 100) : 0;
    return { curve, total, delta: total - actualTotal, hitRate };
  }, [sortedClosed, allWhatIfTrades, targetR, actualTotal]);

  // ── Count indeterminate for targetR card note ─────────────────────────────
  const targetIndeterminateN = useMemo(() => {
    let n = 0;
    for (let i = 0; i < sortedClosed.length; i++) {
      const wt = allWhatIfTrades[i];
      if (!wt) continue;
      const result = fixedTargetAtR(wt, targetR);
      if (result !== null && result.confidence === 'indeterminate') n++;
    }
    return n;
  }, [sortedClosed, allWhatIfTrades, targetR]);

  // ── Break-even stop aggregate (reactive to beR) ───────────────────────────
  // 3-tier: exact (bars) / certain (estimate) / indeterminate (midpoint for curve).
  const beData = useMemo(() => {
    const totalM = sortedClosed.length;
    let exactN = 0;
    let certainN = 0;
    let indetN = 0;
    let knownTotal = 0;
    let indetLowSum = 0;
    let indetHighSum = 0;
    let cumActualSubset = 0;
    const curve: number[] = [];
    let cumCurve = 0;

    for (let i = 0; i < sortedClosed.length; i++) {
      const t = sortedClosed[i];
      const wt = allWhatIfTrades[i];
      if (!wt) continue;

      const bars = barsByTrade.get(t.id);
      const hasBarsForTrade = (bars?.length ?? 0) > 0;
      const actualPnl = t.pnl ?? 0;

      if (hasBarsForTrade) {
        const result = breakEvenAtR(wt, bars!, beR);
        if (result !== null) {
          exactN++;
          knownTotal += result.pnlUsd;
          cumActualSubset += actualPnl;
          cumCurve += result.pnlUsd;
          curve.push(cumCurve);
        }
      } else {
        const est = estimateBreakEvenAtR(wt, beR);
        if (est !== null) {
          if (est.confidence === 'certain' && est.pnlUsd !== null) {
            certainN++;
            knownTotal += est.pnlUsd;
            cumActualSubset += actualPnl;
            cumCurve += est.pnlUsd;
            curve.push(cumCurve);
          } else if (est.confidence === 'indeterminate') {
            indetN++;
            indetLowSum += est.lowUsd;
            indetHighSum += est.highUsd;
            cumActualSubset += actualPnl;
            const mid = (est.lowUsd + est.highUsd) / 2;
            cumCurve += mid;
            curve.push(cumCurve);
          }
        }
      }
    }

    const coveredN = exactN + certainN + indetN;

    if (coveredN === 0) {
      return {
        curve: [] as number[],
        total: null as number | null,
        delta: null as number | null,
        coveredN,
        totalM,
        exactN: 0,
        certainN: 0,
        indetN: 0,
        bandLow: null as number | null,
        bandHigh: null as number | null,
      };
    }

    const bandLow = knownTotal + indetLowSum;
    const bandHigh = knownTotal + indetHighSum;
    const delta = knownTotal - cumActualSubset;

    return {
      curve,
      total: knownTotal,
      delta,
      coveredN,
      totalM,
      exactN,
      certainN,
      indetN,
      bandLow: indetN > 0 ? bandLow : null,
      bandHigh: indetN > 0 ? bandHigh : null,
    };
  }, [sortedClosed, allWhatIfTrades, barsByTrade, beR]);

  // ── RR recommendation ─────────────────────────────────────────────────────
  const recommendation = useMemo(() => recommendRR(allWhatIfTrades), [allWhatIfTrades]);

  // ── Original stop — kept (leave-it baseline) ──────────────────────────────
  // Per trade: if mae_r >= 1, the original stop was hit → outcome = -1R in $.
  // Otherwise the price never reached the stop → actual exit was the result.
  const originalStopData = useMemo(() => {
    let cum = 0;
    const curve: number[] = sortedClosed.map((t, i) => {
      const wt = allWhatIfTrades[i];
      let tradePnl: number;
      if (wt && wt.mae_r != null && wt.mae_r >= 1) {
        // Original stop was hit — a full -1R loss.
        const mult = resolveMultiplier(wt);
        const risk = riskUsd(wt, mult);
        tradePnl = risk !== null ? -risk : (t.pnl ?? 0);
      } else {
        // Stop never hit — kept actual exit.
        tradePnl = t.pnl ?? 0;
      }
      cum += tradePnl;
      return cum;
    });
    const total = curve[curve.length - 1] ?? 0;
    return { curve, total, delta: total - actualTotal };
  }, [sortedClosed, allWhatIfTrades, actualTotal]);

  // ── Combined chart data — align BE-stop series with buildAggregate points ─
  // buildAggregate iterates `sorted` (same as sortedClosed). For each trade,
  // compute a BE-stop value; when not coverable, fall back to actual P&L so
  // the line always has the same number of points as agg.points.
  const chartPoints = useMemo(() => {
    if (agg.points.length === 0) return [];

    let cumBe = 0;
    const beValues: number[] = sortedClosed.map((t, i) => {
      const wt = allWhatIfTrades[i];
      if (!wt) {
        cumBe += t.pnl ?? 0;
        return cumBe;
      }

      const bars = barsByTrade.get(t.id);
      const hasBarsForTrade = (bars?.length ?? 0) > 0;

      if (hasBarsForTrade) {
        const result = breakEvenAtR(wt, bars!, beR);
        if (result !== null) {
          cumBe += result.pnlUsd;
          return cumBe;
        }
      } else {
        const est = estimateBreakEvenAtR(wt, beR);
        if (est !== null) {
          if (est.confidence === 'certain' && est.pnlUsd !== null) {
            cumBe += est.pnlUsd;
            return cumBe;
          } else if (est.confidence === 'indeterminate') {
            const mid = (est.lowUsd + est.highUsd) / 2;
            cumBe += mid;
            return cumBe;
          }
        }
      }
      // Fallback: use actual P&L so the line never gaps.
      cumBe += t.pnl ?? 0;
      return cumBe;
    });

    return agg.points.map((pt, i) => ({
      ...pt,
      breakevenStop: beValues[i] ?? pt.actual,
      targetScenario: targetData.curve[i] ?? pt.actual,
      originalStop: originalStopData.curve[i] ?? pt.actual,
    }));
  }, [agg.points, sortedClosed, allWhatIfTrades, barsByTrade, beR, targetData.curve, originalStopData.curve]);

  if (agg.points.length === 0) {
    return (
      <div className={`${JOURNAL_PANEL} p-ds-5`}>
        <div className="flex flex-col items-center gap-ds-3 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] text-white/28">
            <Info className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium text-white/60">No closed trades yet</p>
          <p className="text-xs text-white/38 max-w-[320px]">
            Close trades in your journal to see the cumulative scenario comparison here.
          </p>
        </div>
      </div>
    );
  }

  const xInterval = agg.points.length > 10 ? Math.floor(agg.points.length / 8) : 0;
  const n = sortedClosed.length;

  // ── Confidence chip for the BE card ──────────────────────────────────────
  const beConfidenceChip = (() => {
    if (beData.coveredN === 0) return null;
    if (beData.indetN > 0) {
      return (
        <span className="rounded-[4px] bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white/42">
          Indeterminate
        </span>
      );
    }
    if (beData.certainN > 0) {
      return (
        <span className="rounded-[4px] bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white/42">
          Estimated
        </span>
      );
    }
    return (
      <span className="rounded-[4px] bg-[#4AD295]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#4AD295]">
        Exact
      </span>
    );
  })();

  return (
    <div className="flex flex-col gap-ds-5">

      {/* ── Inner Stop / Target switch ────────────────────────────────────── */}
      <div className="flex justify-center">
        <div className="flex gap-0.5 rounded-[10px] bg-white/[0.06] p-1">
          {(['stop', 'target'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-[7px] px-5 py-1.5 text-[13px] font-semibold transition-colors ${
                view === v
                  ? 'bg-[rgba(20,20,20,0.88)] text-[#C9A646] shadow-sm'
                  : 'text-white/42 hover:text-white/70'
              }`}
            >
              {v === 'stop' ? 'Stop' : 'Target'}
            </button>
          ))}
        </div>
      </div>

      {/* ── 1. Main combined cumulative P&L chart (full-width, TOP) ──────── */}
      <div className={JOURNAL_PANEL}>
        <div className="flex items-start justify-between gap-ds-3 border-b border-white/[0.06] px-ds-5 py-ds-4">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-white">Cumulative P&amp;L by scenario</span>
            <ShadowInfoIcon label="Each line shows cumulative P&L across all closed trades. When a stop or target is missing for a trade, that trade's actual P&L is used instead so all lines span the same set of trades. The Break-even stop line reflects the R trigger selected in the card below." />
          </div>
        </div>
        <div className="px-ds-5 pb-ds-5 pt-ds-4" style={{ width: '100%', height: 420 }}>
          <ResponsiveContainer>
            <AreaChart data={chartPoints} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="main-grad-actual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_GOLD} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={COLOR_GOLD} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="main-grad-target" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_GREEN} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={COLOR_GREEN} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="main-grad-breakeven" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_SILVER} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={COLOR_SILVER} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="main-grad-letitrun" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_SILVER} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={COLOR_SILVER} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="main-grad-originalstop" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_RED} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={COLOR_RED} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={xInterval}
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
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', paddingTop: 8 }}
              />
              {/* Stop view areas */}
              {view === 'stop' && !hidden.has('originalStop') && (
                <Area
                  type="monotone"
                  dataKey="originalStop"
                  name="Original stop (kept)"
                  stroke={COLOR_RED}
                  strokeWidth={2}
                  fill="url(#main-grad-originalstop)"
                  fillOpacity={1}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {view === 'stop' && !hidden.has('breakevenStop') && (
                <Area
                  type="monotone"
                  dataKey="breakevenStop"
                  name={`Break-even stop (${beR}R)`}
                  stroke={COLOR_SILVER}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  fill="url(#main-grad-breakeven)"
                  fillOpacity={1}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {/* Target view areas */}
              {view === 'target' && !hidden.has('target') && (
                <Area
                  type="monotone"
                  dataKey="target"
                  name="Held to target"
                  stroke={COLOR_GREEN}
                  strokeWidth={2}
                  fill="url(#main-grad-target)"
                  fillOpacity={1}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {view === 'target' && !hidden.has('targetScenario') && (
                <Area
                  type="monotone"
                  dataKey="targetScenario"
                  name={`Let it run (${targetR}R)`}
                  stroke={COLOR_SILVER}
                  strokeWidth={2}
                  fill="url(#main-grad-letitrun)"
                  fillOpacity={1}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {/* Actual — shown in both views. Rendered LAST so the gold line
                  paints ON TOP of every scenario line (dominant baseline),
                  and thicker so it stays readable even when a scenario line
                  overlaps it exactly (e.g. Held-to-target == Actual). */}
              {!hidden.has('actual') && (
                <Area
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke={COLOR_GOLD}
                  strokeWidth={3.5}
                  fill="url(#main-grad-actual)"
                  fillOpacity={1}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {n > 0 && view === 'stop' && (
          <p className="px-ds-5 pb-ds-4 -mt-ds-2 text-[11px] text-white/28 leading-relaxed">
            Break-even stop line uses midpoint for indeterminate trades; falls back to actual when no excursion data.
          </p>
        )}
      </div>

      {/* ── C. Gold conclusion band — view-specific ───────────────────────── */}
      {view === 'stop' ? (() => {
        // Stop view: candidates are originalStop and beData
        const candidates: Array<{ delta: number; phrase: string }> = [
          {
            delta: originalStopData.delta,
            phrase: 'Keeping your original stop untouched',
          },
          ...(beData.delta !== null
            ? [{ delta: beData.delta, phrase: `Moving your stop to break-even at ${beR}R` }]
            : []),
        ];

        if (actualTotal === 0 || candidates.length === 0) {
          return (
            <div className="bg-[#C9A646]/10 border border-[#C9A646]/35 rounded-[14px] px-ds-5 py-ds-4 flex items-start gap-3">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#C9A646]" />
              <p className="text-[15px] text-white/60 leading-relaxed">
                Close more trades with stops to see your highest-impact stop scenario.
              </p>
            </div>
          );
        }

        const best = candidates.reduce((a, b) =>
          Math.abs(b.delta) > Math.abs(a.delta) ? b : a,
        );
        const pct = Math.round((best.delta / Math.abs(actualTotal)) * 100);
        const positive = best.delta > 0;

        return (
          <div className="bg-[#C9A646]/10 border border-[#C9A646]/35 rounded-[14px] px-ds-5 py-ds-4 flex items-start gap-3">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#C9A646]" />
            <p className="text-[15px] text-white leading-relaxed">
              {best.phrase}{' '}
              {positive ? (
                <>
                  would have{' '}
                  <span className="text-[#C9A646] font-semibold">ADDED {pct}% to your return</span>{' '}
                  (<span className="text-[#C9A646] font-semibold">{fmtDelta(Math.round(best.delta))}</span>).
                </>
              ) : (
                <>
                  would have{' '}
                  <span className="text-[#C9A646] font-semibold">COST you {Math.abs(pct)}% of your return</span>{' '}
                  (<span className="text-[#C9A646] font-semibold">{fmtDelta(Math.round(best.delta))}</span>).
                </>
              )}
            </p>
          </div>
        );
      })() : (() => {
        // Target view: candidates are held-to-target and let-it-run
        const candidates: Array<{ delta: number; phrase: string }> = [
          {
            delta: agg.totals.target - actualTotal,
            phrase: 'Holding every trade to your original target',
          },
          {
            delta: targetData.delta,
            phrase: `Letting your winners run to ${targetR}R`,
          },
        ];

        if (actualTotal === 0) {
          return (
            <div className="bg-[#C9A646]/10 border border-[#C9A646]/35 rounded-[14px] px-ds-5 py-ds-4 flex items-start gap-3">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#C9A646]" />
              <p className="text-[15px] text-white/60 leading-relaxed">
                Close more trades with targets to see your highest-impact target scenario.
              </p>
            </div>
          );
        }

        const best = candidates.reduce((a, b) =>
          Math.abs(b.delta) > Math.abs(a.delta) ? b : a,
        );
        const pct = Math.round((best.delta / Math.abs(actualTotal)) * 100);
        const positive = best.delta > 0;

        return (
          <div className="bg-[#C9A646]/10 border border-[#C9A646]/35 rounded-[14px] px-ds-5 py-ds-4 flex items-start gap-3">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#C9A646]" />
            <p className="text-[15px] text-white leading-relaxed">
              {best.phrase}{' '}
              {positive ? (
                <>
                  would have{' '}
                  <span className="text-[#C9A646] font-semibold">ADDED {pct}% to your return</span>{' '}
                  (<span className="text-[#C9A646] font-semibold">{fmtDelta(Math.round(best.delta))}</span>).
                </>
              ) : (
                <>
                  would have{' '}
                  <span className="text-[#C9A646] font-semibold">COST you {Math.abs(pct)}% of your return</span>{' '}
                  (<span className="text-[#C9A646] font-semibold">{fmtDelta(Math.round(best.delta))}</span>).
                </>
              )}
            </p>
          </div>
        );
      })()}

      {/* ── 2. Per-scenario small-multiples grid — view-specific 3 cards ─── */}
      {view === 'stop' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-ds-3">

          {/* Original stop — kept (Leave-it baseline) */}
          <SmallScenarioCard
            label="Original stop — kept"
            subtitle="Leave it — never move your stop"
            total={originalStopData.total}
            curve={originalStopData.curve}
            curveColor={COLOR_RED}
            delta={originalStopData.delta}
            onClick={() => toggle('originalStop')}
            hidden={hidden.has('originalStop')}
          />

          {/* Actual (baseline) */}
          <SmallScenarioCard
            label="Actual"
            subtitle="Your real exits"
            total={agg.totals.actual}
            curve={agg.points.map((p) => p.actual)}
            curveColor={COLOR_GOLD}
            isBaseline
            onClick={() => toggle('actual')}
            hidden={hidden.has('actual')}
          />

          {/* Break-even stop — interactive */}
          <LabCard
            title="Break-even stop"
            subtitle={`Move it — shift stop to entry once price reaches ${beR}R in your favour.`}
            totalPnl={beData.total}
            deltaVsActual={beData.coveredN > 0 ? beData.delta : null}
            curve={beData.curve}
            curveColor={COLOR_SILVER}
            isInert={beData.coveredN === 0}
            inertMessage="Add stops/targets to your trades to unlock this scenario."
            badge={
              beData.coveredN > 0
                ? `Exact ${beData.exactN} · Estimated ${beData.certainN} · Indeterminate ${beData.indetN}`
                : undefined
            }
            onClick={beData.coveredN > 0 ? () => toggle('breakevenStop') : undefined}
            hidden={hidden.has('breakevenStop')}
          >
            {beConfidenceChip && <div className="flex">{beConfidenceChip}</div>}

            {beData.coveredN > 0 &&
              beData.indetN > 0 &&
              beData.bandLow !== null &&
              beData.bandHigh !== null && (
                <p className="text-[11px] text-white/42 leading-relaxed">
                  Range:{' '}
                  <span className="tabular-nums">{fmtPnl(Math.round(beData.bandLow))}</span>
                  {' … '}
                  <span className="tabular-nums">{fmtPnl(Math.round(beData.bandHigh))}</span>
                </p>
              )}

            <div className="mt-auto pt-ds-1">
              <SegmentToggle<1 | 2 | 3>
                options={[1, 2, 3]}
                value={beR}
                onChange={beData.coveredN > 0 ? setBeR : () => { /* inert */ }}
                disabled={beData.coveredN === 0}
              />
            </div>
          </LabCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-ds-3">

          {/* Actual (baseline) */}
          <SmallScenarioCard
            label="Actual"
            subtitle="Your real exits"
            total={agg.totals.actual}
            curve={agg.points.map((p) => p.actual)}
            curveColor={COLOR_GOLD}
            isBaseline
            onClick={() => toggle('actual')}
            hidden={hidden.has('actual')}
          />

          {/* Held to target */}
          <SmallScenarioCard
            label="Held to target"
            subtitle="Exit at your planned target"
            total={agg.totals.target}
            curve={agg.points.map((p) => p.target)}
            curveColor={COLOR_GREEN}
            delta={agg.totals.target - agg.totals.actual}
            onClick={() => toggle('target')}
            hidden={hidden.has('target')}
          />

          {/* Target — let it run — interactive */}
          <LabCard
            title="Target — let it run"
            subtitle={`Exits at ${targetR}R or stops out at −1R.`}
            totalPnl={targetData.total}
            deltaVsActual={targetData.delta}
            curve={targetData.curve}
            curveColor={COLOR_SILVER}
            badge={`Hits the ${targetR}R target ${targetData.hitRate}% of the time.`}
            onClick={() => toggle('targetScenario')}
            hidden={hidden.has('targetScenario')}
          >
            {targetIndeterminateN > 0 && (
              <p className="text-[11px] text-white/42 leading-relaxed">
                {targetIndeterminateN} trade{targetIndeterminateN !== 1 ? 's' : ''} indeterminate — target &amp; stop both touched
              </p>
            )}
            <div className="mt-auto pt-ds-1">
              <SegmentToggle<1 | 2 | 3 | 4>
                options={[1, 2, 3, 4]}
                value={targetR}
                onChange={setTargetR}
              />
            </div>
          </LabCard>
        </div>
      )}

      {/* Tier legend */}
      <p className="text-[11px] text-white/28 leading-relaxed -mt-ds-2">
        Exact = from price bars · Estimated = from your trade&apos;s favorable/adverse extremes · Indeterminate = order unknown without bars
      </p>

      {/* ── 3. RR recommendation panel ───────────────────────────────────── */}
      <div className={`${JOURNAL_PANEL} px-ds-4 py-ds-4`}>
        <div className="flex items-start gap-ds-3">
          <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C9A646]" />
          <div className="flex flex-col gap-ds-1">
            {recommendation ? (
              <>
                <p className="text-sm font-medium text-white leading-relaxed">
                  {recommendation.verdict}
                </p>
                <p className="text-[13px] text-white/70 leading-relaxed">
                  At {targetR}R you&apos;d net{' '}
                  <span className={targetData.total >= 0 ? 'text-[#4AD295]' : 'text-[#F87171]'}>
                    {fmtPnl(Math.round(targetData.total))}
                  </span>{' '}
                  ({fmtDelta(Math.round(targetData.delta))}); expectancy peaks at{' '}
                  {recommendation.recommendedR}R.
                </p>
                <p className="text-[11px] text-white/38 mt-ds-1">
                  Based on {recommendation.sampleSize} trade{recommendation.sampleSize !== 1 ? 's' : ''} with excursion data.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-white leading-relaxed">
                  At {targetR}R you&apos;d net{' '}
                  <span className={targetData.total >= 0 ? 'text-[#4AD295]' : 'text-[#F87171]'}>
                    {fmtPnl(Math.round(targetData.total))}
                  </span>{' '}
                  ({fmtDelta(Math.round(targetData.delta))}) with a {targetData.hitRate}% hit rate.
                </p>
                <p className="text-[11px] text-white/38 mt-ds-1">
                  Add stop prices to your trades to unlock the full R-based expectancy recommendation.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Distribution tab (v2 — beta only) ───────────────────────────────────────

interface DistributionRuleStatProps {
  ruleKey: ScenarioKey;
  label: string;
  description: string;
  tracked: number;
  total: number;
}

/** Mini histogram bar chart — renders the distribution of R deltas. */
function RDeltaHistogram({ deltas }: { deltas: number[] }) {
  if (deltas.length === 0) return null;

  // Build 7 equal-width bins.
  const min = Math.min(...deltas);
  const max = Math.max(...deltas);
  const range = max - min || 1;
  const BIN_COUNT = 7;
  const bins: Array<{ label: string; count: number; positive: boolean }> = Array.from(
    { length: BIN_COUNT },
    (_, i) => {
      const lo = min + (range / BIN_COUNT) * i;
      const hi = min + (range / BIN_COUNT) * (i + 1);
      const count = deltas.filter((d) => d >= lo && (i === BIN_COUNT - 1 ? d <= hi : d < hi)).length;
      return {
        label: `${lo >= 0 ? '+' : ''}${lo.toFixed(1)}R`,
        count,
        positive: lo >= 0,
      };
    },
  );

  return (
    <div style={{ width: '100%', height: 80 }}>
      <ResponsiveContainer>
        <BarChart data={bins} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {bins.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.positive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DistributionRuleStat({
  label,
  description,
  tracked,
  total,
}: DistributionRuleStatProps) {
  const hasEnough = tracked >= DISTRIBUTION_MIN_N;

  return (
    <div className={`${JOURNAL_PANEL} px-ds-4 py-ds-4 flex flex-col gap-ds-3`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_50%,rgba(255,255,255,0.02),transparent_32%)]" />
      <div className="relative flex flex-col gap-ds-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[12px] font-semibold text-white/80">{label}</p>
            <p className="text-[11px] text-white/42 mt-0.5">{description}</p>
          </div>
          {!hasEnough && (
            <span className="shrink-0 rounded-[4px] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-white/38">
              Anecdotal
            </span>
          )}
        </div>

        {hasEnough ? (
          // Real data — not yet populated (no engine results today)
          <div className="flex flex-col gap-ds-2">
            <div className="grid grid-cols-3 gap-ds-2 text-center">
              <div>
                <p className="font-data text-[18px] font-semibold text-white/28">—</p>
                <p className="text-[10px] text-white/38 mt-0.5">Win rate</p>
              </div>
              <div>
                <p className="font-data text-[18px] font-semibold text-white/28">—</p>
                <p className="text-[10px] text-white/38 mt-0.5">Mean R Δ</p>
              </div>
              <div>
                <p className="font-data text-[18px] font-semibold text-white/28">—</p>
                <p className="text-[10px] text-white/38 mt-0.5">Median R Δ</p>
              </div>
            </div>
            <RDeltaHistogram deltas={[]} />
          </div>
        ) : (
          <div className="flex flex-col items-center py-ds-3 text-center gap-1">
            <BarChart2 className="h-8 w-8 text-white/18" />
            <p className="text-[11px] text-white/38">
              Distribution unlocks after ~{DISTRIBUTION_MIN_N} tracked trades.
            </p>
            <p className="text-[11px] text-white/28">
              Tracked so far: {tracked}/{DISTRIBUTION_MIN_N}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shadow Insight Card ──────────────────────────────────────────────────────

const SEVERITY_DOT: Record<ShadowInsight['severity'], string> = {
  high:   '#C9A646',
  medium: 'rgba(255,255,255,0.5)',
  low:    'rgba(255,255,255,0.3)',
};

function ShadowInsightCard({ trades }: { trades: Trade[] }) {
  const insights = useMemo(() => buildShadowInsights(trades), [trades]);

  if (insights.length === 0) {
    return (
      <div className={`${JOURNAL_PANEL} px-ds-5 py-ds-4`}>
        <p className="text-[12px] text-white/38 leading-relaxed">
          Close a few trades with stops and targets and Shadow will read your decisions here.
        </p>
      </div>
    );
  }

  const top3 = insights.slice(0, 3);

  return (
    <div className={`${JOURNAL_PANEL} px-ds-5 py-ds-4`}>
      {/* Subtle gold radial backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_50%,rgba(201,166,70,0.05),transparent_40%)]" />

      <div className="relative flex flex-col gap-ds-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C9A646]/18 bg-[#C9A646]/08 text-[#E8C766]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-white">Shadow Insight</p>
            <p className="text-[12px] text-white/42 mt-0.5">
              Read on your {trades.length} closed-trade decision{trades.length === 1 ? '' : 's'}.
            </p>
          </div>
        </div>

        {/* Insights */}
        <div className="flex flex-col gap-ds-3">
          {top3.map((insight, idx) => (
            <div
              key={`${insight.angle}-${idx}`}
              className="flex gap-3"
              style={
                idx === 0
                  ? { borderLeft: '2px solid #C9A646', paddingLeft: '12px' }
                  : { paddingLeft: '14px' }
              }
            >
              {/* Severity dot — only for non-first items (first uses gold border) */}
              {idx > 0 && (
                <span
                  className="mt-[5px] h-[6px] w-[6px] shrink-0 rounded-full"
                  style={{ backgroundColor: SEVERITY_DOT[insight.severity] }}
                />
              )}
              <div className={idx > 0 ? '' : ''}>
                <p className="text-[13px] font-semibold text-white leading-snug">
                  {insight.headline}
                </p>
                <p className="text-[12px] leading-relaxed text-white/62 mt-0.5">
                  {insight.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DistributionView({ closedTrades }: { tracked: number; total: number; trades: Trade[]; closedTrades: Trade[] }) {
  // ── Combined summary: best fixed-R scenario across all closed trades ────────
  const summary = useMemo(() => {
    const actualTotal = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);

    // Map closedTrades → WhatIfTrade for fixedTargetAtR
    const wits: WhatIfTrade[] = closedTrades.map((t): WhatIfTrade => ({
      side: t.side,
      entry_price: t.entry_price,
      exit_price: t.exit_price ?? t.entry_price,
      quantity: t.quantity,
      multiplier: t.multiplier ?? null,
      symbol: t.symbol,
      stop_price: t.stop_price ?? null,
      take_profit_price: t.take_profit_price ?? null,
      open_at: t.open_at,
      close_at: t.close_at ?? t.open_at,
      mfe_r: t.mfe_r ?? null,
      mae_r: t.mae_r ?? null,
    }));

    // For each R in [1,2,3,4] compute the cumulative total
    const rCandidates = ([1, 2, 3, 4] as const).map((R) => {
      const total = closedTrades.reduce((s, t, i) => {
        const wt = wits[i];
        if (!wt) return s + (t.pnl ?? 0);
        const result = fixedTargetAtR(wt, R);
        return s + (result?.pnlUsd ?? (t.pnl ?? 0));
      }, 0);
      return { R, total };
    });

    const best = rCandidates.reduce((a, b) => (b.total > a.total ? b : a));
    const upside = best.total - actualTotal;
    const pct = actualTotal !== 0 ? Math.round((upside / Math.abs(actualTotal)) * 100) : 0;

    return { actualTotal, bestR: best.R, bestTotal: best.total, upside, pct };
  }, [closedTrades]);

  const VERDICT_MIN_N = 10;
  const n = closedTrades.length;
  const runItPays = summary.upside > 0;

  return (
    <div className="flex flex-col gap-ds-5">
      {n < VERDICT_MIN_N ? (
        // Not enough trades to commit to a verdict — stay quiet, no noise.
        <div className={`${JOURNAL_PANEL} px-ds-5 py-ds-6`}>
          <div className="relative flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C9A646]/18 bg-[#C9A646]/[0.08] text-[#E8C766]">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-semibold text-white">
                Not enough trades for a verdict yet.
              </p>
              <p className="text-[13px] text-white/60 leading-relaxed">
                Shadow gives you a clear do / don&apos;t once you have at least {VERDICT_MIN_N}{' '}
                closed trades. You have {n} so far — keep journaling and your verdict will appear here.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // One decisive verdict: what to do, what not to do.
        <div className="bg-[#C9A646]/10 border border-[#C9A646]/35 rounded-[14px] px-ds-5 py-ds-5 flex flex-col gap-ds-4">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 shrink-0 text-[#C9A646]" />
            <p className="text-[18px] font-semibold text-white leading-snug">
              {runItPays ? 'Let your winners run.' : 'Trust your exits.'}
            </p>
          </div>

          <div className="flex flex-col gap-ds-3">
            {/* DO */}
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-[5px] bg-[#3BC76E]/12 px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#3BC76E]">
                DO
              </span>
              <p className="text-[14px] text-white/85 leading-relaxed">
                {runItPays ? (
                  <>
                    Aim for a <span className="font-semibold text-white">{summary.bestR}R target</span>{' '}
                    and hold your winners to it — across your last {n} closed trades that would have
                    added{' '}
                    <span className="font-semibold text-[#C9A646]">
                      {fmtPnl(Math.round(summary.upside))} (+{summary.pct}%)
                    </span>.
                  </>
                ) : (
                  <>
                    Keep timing your exits the way you do — across your last {n} closed trades they
                    beat every fixed 1R–4R target.
                  </>
                )}
              </p>
            </div>

            {/* DON'T */}
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-[5px] bg-[#EF4444]/12 px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#EF4444]">
                DON&apos;T
              </span>
              <p className="text-[14px] text-white/85 leading-relaxed">
                {runItPays ? (
                  <>
                    Don&apos;t cut your winners early at your current exits — that&apos;s where your
                    edge is leaking.
                  </>
                ) : (
                  <>
                    Don&apos;t force trades to a mechanical {summary.bestR}R target — it would have
                    cost you{' '}
                    <span className="font-semibold text-[#EF4444]">
                      ${Math.round(Math.abs(summary.upside)).toLocaleString('en-US')} ({Math.abs(summary.pct)}%)
                    </span>.
                  </>
                )}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-white/38">Based on your last {n} closed trades.</p>
        </div>
      )}
    </div>
  );
}

// ─── Trade tab — engine view (beta) ────────────────────────────────────────────

interface TradeEngineViewProps {
  trade: Trade;
  bars: PriceBar[];
  mfe: WhatIfResult['mfe'];
  mae: WhatIfResult['mae'];
  distributionTracked: number;
  distributionTotal: number;
}

function TradeEngineView({
  trade,
  bars,
  mfe,
  mae,
  distributionTracked,
  distributionTotal,
}: TradeEngineViewProps) {
  // Stop / Target overlay switch — mirrors the Performance tab, scoped to this trade.
  const [view, setView] = useState<'stop' | 'target'>('stop');
  const shadow = useShadowTrade(trade);
  const { engine, planned, hasPath } = shadow;

  // Planned-level insight (always available).
  const plannedInsight = useMemo<string>(() => {
    const targetSc = planned.scenarios.find((s) => s.key === 'target');
    const stopSc   = planned.scenarios.find((s) => s.key === 'stop');
    if (targetSc?.available && targetSc.deltaVsActual != null) {
      return `Held to your target would have changed this trade by ${fmtDelta(targetSc.deltaVsActual)}.`;
    }
    if (stopSc?.available && stopSc.pnl != null && stopSc.deltaVsActual != null) {
      return `Exiting at your original stop would have been ${fmtPnl(stopSc.pnl)} (${fmtDelta(stopSc.deltaVsActual)}).`;
    }
    return 'Add a stop or target to this trade to compare scenarios.';
  }, [planned]);

  // Engine insight — deterministic template, no LLM call.
  const engineInsight = useMemo<string | null>(() => {
    if (!engine) return null;
    const sortedByPnl = [...engine.scenarios]
      .filter((s) => s.available && s.key !== 'actual' && s.pnlUsd != null)
      .sort((a, b) => (b.pnlUsd ?? 0) - (a.pnlUsd ?? 0));
    const best = sortedByPnl[0];
    const actual = engine.scenarios.find((s) => s.key === 'actual');
    if (!best || !actual) return null;
    const delta = (best.pnlUsd ?? 0) - (actual.pnlUsd ?? 0);
    if (Math.abs(delta) < 0.01) return 'Your actual exit matched the best alternative scenario.';
    if (delta > 0) {
      return `"${best.label}" was the strongest alternative — ${fmtPnl(Math.abs(delta))} better than your exit.`;
    }
    return 'Your actual exit was the best outcome among the computed scenarios.';
  }, [engine]);

  const scenariosToShow = engine
    ? [...engine.scenarios].sort((a, b) => (b.pnlUsd ?? 0) - (a.pnlUsd ?? 0))
    : null;

  return (
    <div className="flex flex-col gap-ds-5">
      {/* Stop / Target overlay switch (same control as the Performance tab) */}
      <div className="flex justify-center">
        <div className="flex gap-0.5 rounded-[10px] bg-white/[0.06] p-1">
          {(['stop', 'target'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-[7px] px-5 py-1.5 text-[13px] font-semibold transition-colors ${
                view === v
                  ? 'bg-[rgba(20,20,20,0.88)] text-[#C9A646] shadow-sm'
                  : 'text-white/42 hover:text-white/70'
              }`}
            >
              {v === 'stop' ? 'Stop' : 'Target'}
            </button>
          ))}
        </div>
      </div>

      {/* Price Path chart */}
      <PriceChart trade={trade} bars={bars} mfe={mfe} mae={mae} view={view} />

      {/* Engine scenarios — when bars exist */}
      {hasPath && scenariosToShow && (
        <div className="flex flex-col gap-ds-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-white/50">
              Intra-trade counterfactuals
            </span>
            <ShadowInfoIcon label="Scenarios computed from the real intra-trade price path. Sorted best → worst by P&L. Gold = your actual result. Simulated = estimated from recorded levels." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-ds-3">
            {scenariosToShow.map((sc) => (
              <EngineScenarioCard
                key={sc.key}
                scenario={sc}
                isActual={sc.key === 'actual'}
                distributionN={distributionTracked}
              />
            ))}
          </div>
        </div>
      )}

      {/* No bars fallback — planned scenarios */}
      {!hasPath && (
        <div className="flex flex-col gap-ds-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-white/50">
              What-if scenarios
            </span>
            <ShadowInfoIcon label="Four alternate outcomes computed from your recorded price levels — no price bars required." />
          </div>
          <p className="text-[11px] text-white/42">
            Full intra-trade replay activates once price tracking captures this trade.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-ds-3">
            {planned.scenarios.map((sc) => (
              <PlannedScenarioCard
                key={sc.key}
                scenario={sc}
                isBaseline={sc.key === 'actual'}
                hasBars={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Coaching verdict / Key Takeaway */}
      <div className={`${JOURNAL_PANEL} grid min-h-[74px] items-center gap-4 px-ds-5 py-ds-4 sm:grid-cols-[minmax(0,1fr)_auto]`}>
        <div className="flex min-w-0 items-center gap-ds-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C9A646]/18 bg-[#C9A646]/10 text-[#E8C766] shadow-[0_0_26px_rgba(201,166,70,0.18)]">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="mb-1 text-[13px] font-semibold text-[#E8C766]">Key Takeaway</div>
            <p className="text-[13px] leading-relaxed text-white/78">
              {engineInsight ?? plannedInsight}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Risk-reward lab ──────────────────────────────────────────────────────────
// Self-contained aggregate section: replays ALL closed trades under fixed
// management rules (target-at-R, break-even stop) and surfaces the best-fit
// R-multiple for this user's historical trade behaviour.

/** Compact sparkline — no axes, just the curve shape. */
interface MiniCurveProps {
  data: number[];
  color: string;
}
function MiniCurve({ data, color }: MiniCurveProps) {
  if (data.length < 2) return <div className="h-14" />;
  const pts = data.map((v, i) => ({ i, v }));
  const gradId = `mini-grad-${color.replace('#', '')}`;
  return (
    <div style={{ width: '100%', height: 56 }}>
      <ResponsiveContainer width="100%" height={56}>
        <AreaChart data={pts} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            dot={false}
            isAnimationActive={false}
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
            formatter={(val: number) => [fmtPnl(Math.round(val)), '']}
            labelFormatter={() => ''}
            cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Segmented R-multiple toggle. */
interface SegmentToggleProps<T extends number> {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  formatLabel?: (v: T) => string;
  disabled?: boolean;
}
function SegmentToggle<T extends number>({
  options,
  value,
  onChange,
  formatLabel = (v) => `${v}R`,
  disabled = false,
}: SegmentToggleProps<T>) {
  return (
    <div className="flex gap-0.5 rounded-[8px] bg-white/[0.06] p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          onClick={(e) => { e.stopPropagation(); onChange(opt); }}
          className={`rounded-[6px] px-2 py-0.5 text-[11px] font-semibold tabular-nums transition-colors ${
            disabled
              ? 'cursor-not-allowed text-white/28'
              : opt === value
                ? 'bg-[rgba(20,20,20,0.88)] text-[#C9A646] shadow-sm'
                : 'text-white/42 hover:text-white/70'
          }`}
        >
          {formatLabel(opt)}
        </button>
      ))}
    </div>
  );
}

/** Lab card — one hypothesis at a time. */
interface LabCardProps {
  title: string;
  subtitle?: string;
  totalPnl: number | null;
  deltaVsActual: number | null;
  curve: number[];
  curveColor: string;
  isBaseline?: boolean;
  isInert?: boolean;
  inertMessage?: string;
  badge?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  hidden?: boolean;
}
function LabCard({
  title,
  subtitle,
  totalPnl,
  deltaVsActual,
  curve,
  curveColor,
  isBaseline = false,
  isInert = false,
  inertMessage,
  badge,
  children,
  onClick,
  hidden = false,
}: LabCardProps) {
  const pnlPositive = (totalPnl ?? 0) >= 0;
  const deltaPositive = (deltaVsActual ?? 0) >= 0;
  return (
    <div
      role={onClick ? 'button' : undefined}
      aria-pressed={onClick ? !hidden : undefined}
      onClick={onClick}
      className={`rounded-[14px] border p-ds-4 flex flex-col gap-ds-3 transition-colors ${
        isInert
          ? 'border-white/[0.06] bg-white/[0.02] opacity-60'
          : isBaseline
            ? 'border-2 border-[#60A5FA]/60 bg-[rgba(22,22,22,0.90)]'
            : 'border-[0.5px] border-white/[0.08] bg-[rgba(22,22,22,0.90)] hover:border-white/[0.14]'
      } ${onClick && !isInert ? 'cursor-pointer' : ''} ${hidden && !isInert ? 'opacity-45' : ''}`}
    >
      <div className="flex items-start justify-between gap-ds-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-[13px] font-semibold text-white leading-snug">{title}</p>
          {subtitle && (
            <p className="text-[11px] text-white/42 leading-relaxed">{subtitle}</p>
          )}
        </div>
        {isBaseline && (
          <span className="flex-shrink-0 rounded-[4px] bg-[#60A5FA]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#60A5FA]">
            Baseline
          </span>
        )}
      </div>

      <MiniCurve data={curve} color={curveColor} />

      {isInert ? (
        <p className="font-data text-xl font-bold text-white/28">—</p>
      ) : totalPnl != null ? (
        <p
          className={`font-data text-xl font-bold tabular-nums ${
            pnlPositive ? 'text-[#4AD295]' : 'text-[#F87171]'
          }`}
        >
          {fmtPnl(totalPnl)}
        </p>
      ) : (
        <p className="font-data text-xl font-bold text-white/28">—</p>
      )}

      {!isBaseline && !isInert && deltaVsActual != null && (
        <span
          className={`self-start rounded-[6px] px-2 py-0.5 text-[11px] font-medium ${
            deltaPositive
              ? 'bg-[#4AD295]/10 text-[#4AD295]'
              : 'bg-[#F87171]/10 text-[#F87171]'
          }`}
        >
          {fmtDelta(deltaVsActual)}
        </span>
      )}

      {isInert && inertMessage && (
        <p className="text-[11px] text-white/38 italic">{inertMessage}</p>
      )}

      {badge && !isInert && (
        <p className="text-[11px] text-white/42">{badge}</p>
      )}
      {hidden && onClick && !isInert && (
        <span className="flex items-center gap-1 text-[11px] text-white/38">
          <EyeOff className="h-3.5 w-3.5" />
          Hidden — click to show
        </span>
      )}
      {children}
    </div>
  );
}

// ─── Trade picker ─────────────────────────────────────────────────────────────

interface TradePickerProps {
  closedTrades: Trade[];
  selectedId: string | null;
  effectiveId: string | null;
  dialogOpen: boolean;
  setDialogOpen: (v: boolean) => void;
  setSelectedId: (id: string) => void;
  disabled: boolean;
}

function TradePicker({
  closedTrades,
  effectiveId,
  dialogOpen,
  setDialogOpen,
  setSelectedId,
  disabled,
}: TradePickerProps) {
  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDialogOpen(true)}
          className={[
            'flex items-center gap-2 rounded-[9px] border px-3 py-2 text-[13px] font-medium transition-colors',
            disabled
              ? 'cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-white/28'
              : 'border-[#C9A646]/30 bg-[rgba(20,20,20,0.88)] text-white/82 hover:border-[#C9A646]/55 hover:bg-[rgba(30,28,20,0.92)] hover:text-white',
          ].join(' ')}
        >
          <ListFilter className="h-3.5 w-3.5 shrink-0 text-[#C9A646]" />
          {disabled ? 'No closed trades' : 'Select trade'}
        </button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md border-white/[0.08] bg-[rgba(12,12,12,0.97)] p-0 text-white shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
          <DialogHeader className="border-b border-white/[0.06] px-5 pb-4 pt-5">
            <DialogTitle className="text-[15px] font-semibold text-white">
              Select a trade
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12px] text-white/50">
              Pick any closed trade from My Trades to run the what-if analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto px-3 py-3 space-y-1">
            {closedTrades.map((t) => {
              const isSelected = t.id === effectiveId;
              const pnl = t.pnl ?? 0;
              const positive = pnl >= 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(t.id);
                    setDialogOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-[#C9A646]/15 ring-1 ring-[#C9A646]/40'
                      : 'hover:bg-white/[0.05]'
                  }`}
                >
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: t.side === 'LONG' ? COLOR_BLUE : COLOR_RED }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="font-data font-semibold text-sm text-white/90">{t.symbol}</span>
                    <span className="ml-1.5 text-xs text-white/42">{t.side}</span>
                    <span className="ml-1.5 text-xs text-white/28">{fmtDate(t.close_at ?? t.open_at)}</span>
                  </span>
                  <span
                    className={`font-data text-xs font-semibold tabular-nums flex-shrink-0 ${
                      positive ? 'text-[#4AD295]' : 'text-[#F87171]'
                    }`}
                  >
                    {fmtPnl(pnl)}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TradeCompare() {
  useTradeReconcile();
  useRegisterJournalFinoContext();

  const { data: allTrades, isLoading } = useTrades();
  const { portfolios } = usePortfolios();

  // Exclude hidden paper accounts (e.g. WHISPER) from Shadow — only the
  // trader's real decisions should be analyzed here.
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const effectiveId: string | null = selectedId ?? (closedTrades[0]?.id ?? null);

  const selectedTrade = useMemo<Trade | null>(
    () => closedTrades.find((t) => t.id === effectiveId) ?? null,
    [closedTrades, effectiveId],
  );

  // Shared bars fetch (used by both beta and non-beta trade tab paths).
  const { bars, isLoading: barsLoading } = useTradeBars(effectiveId ?? undefined);
  const hasBars = bars.length > 0;

  // What-if engine for MFE/MAE markers on the price chart (shared).
  const whatIfResult = useMemo(() => {
    if (!selectedTrade || !selectedTrade.exit_price) return null;
    return analyzeWhatIf(
      {
        side: selectedTrade.side,
        entry_price: selectedTrade.entry_price,
        exit_price: selectedTrade.exit_price,
        quantity: selectedTrade.quantity,
        multiplier: selectedTrade.multiplier,
        symbol: selectedTrade.symbol,
        stop_price: selectedTrade.stop_price,
        take_profit_price: selectedTrade.take_profit_price ?? null,
        open_at: selectedTrade.open_at,
        close_at: selectedTrade.close_at ?? selectedTrade.open_at,
      },
      hasBars ? bars : undefined,
    );
  }, [selectedTrade, bars, hasBars]);

  // Fetch bars for ALL closed trades — used by the Risk-reward Lab (ScenarioLab).
  const closedTradeIds = useMemo(() => closedTrades.map((t) => t.id), [closedTrades]);
  const { barsByTrade } = useAllTradeBars(closedTradeIds);

  // Aggregate for beta Day tab + Distribution tab.
  const aggregate = useShadowAggregate(closedTrades);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  const loadingEl = (
    <div className={`${JOURNAL_PANEL} p-ds-5`}>
      <p className="text-center text-sm text-white/42 py-8">Loading your trades…</p>
    </div>
  );

  // ── Empty trade state (shared) ────────────────────────────────────────────
  const noTradesEl = (
    <div className={`${JOURNAL_PANEL} p-ds-5`}>
      <div className="flex flex-col items-center gap-ds-3 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] text-white/28">
          <Info className="h-7 w-7" />
        </div>
        <p className="text-sm font-medium text-white/60">No closed trades yet</p>
        <p className="text-xs text-white/38 max-w-[320px]">
          Add and close trades in your journal to unlock what-if analysis here.
        </p>
      </div>
    </div>
  );

  // ── Tab config ─────────────────────────────────────────────────────────────
  const triggerClass =
    'data-[state=active]:bg-[#C9A646]/15 data-[state=active]:text-white data-[state=active]:shadow-none text-white/55 rounded-[8px] px-4 py-1.5 text-[13px] font-medium transition-colors';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1200px] mx-auto pt-ds-1 pb-ds-4 px-ds-4 flex flex-col gap-ds-4">

      {/* FINO EXPLAINS — canonical collapsible explainer (top-right) */}
      <div className="flex justify-end -mb-ds-4">
        <FinoExplains title="What is Shadow?" className="w-fit">
          Shadow replays your closed trades as if you had managed each one by a single fixed
          rule — held your target, moved your stop to break-even, or used a set R target — so
          you can see which rule actually makes you more money. It reads the real favorable and
          adverse extremes each trade reached (exact when price bars are stored, otherwise your
          recorded excursion R values), not guesses. Use the toggles in Performance to find the
          risk-reward that fits how your trades actually behave.
        </FinoExplains>
      </div>

      {/* Page header */}
      <div className="flex flex-col items-center text-center gap-1">
        <h1 className="text-3xl font-bold text-white">Shadow</h1>
        <p className="text-[11px] text-white/62">
          See what your trades could have been.
        </p>
      </div>

      {/* Shadow — 3-tab experience */}
      <Tabs defaultValue="day">
        <TabsList className="mx-auto flex w-fit bg-[rgba(20,20,20,0.6)] border border-white/[0.08] rounded-[10px] p-1 h-auto">
          <TabsTrigger value="day" className={triggerClass}>Performance</TabsTrigger>
          <TabsTrigger value="distribution" className={triggerClass}>Summary</TabsTrigger>
          <TabsTrigger value="trade" className={triggerClass}>Trade</TabsTrigger>
        </TabsList>

        {/* ── Trade tab ── */}
        <TabsContent value="trade" className="mt-ds-4">
          <div className="flex flex-col gap-ds-5">
            {!isLoading && (
              <TradePicker
                closedTrades={closedTrades}
                selectedId={selectedId}
                effectiveId={effectiveId}
                dialogOpen={dialogOpen}
                setDialogOpen={setDialogOpen}
                setSelectedId={setSelectedId}
                disabled={closedTrades.length === 0}
              />
            )}
            {isLoading && loadingEl}
            {!isLoading && closedTrades.length === 0 && noTradesEl}
            {!isLoading && closedTrades.length > 0 && selectedTrade && (
              <TradeEngineView
                trade={selectedTrade}
                bars={bars}
                mfe={whatIfResult?.mfe ?? null}
                mae={whatIfResult?.mae ?? null}
                distributionTracked={aggregate.tracked}
                distributionTotal={aggregate.total}
              />
            )}
          </div>
        </TabsContent>

        {/* ── Day tab ── */}
        <TabsContent value="day" className="mt-ds-4">
          {isLoading ? loadingEl : <DayView trades={closedTrades} barsByTrade={barsByTrade} />}
        </TabsContent>

        {/* ── Distribution tab (now "Summary") ── */}
        <TabsContent value="distribution" className="mt-ds-4">
          {isLoading ? loadingEl : (
            <DistributionView
              tracked={aggregate.tracked}
              total={aggregate.total}
              trades={closedTrades}
              closedTrades={closedTrades}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
