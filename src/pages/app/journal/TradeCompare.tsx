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
import { analyzeWhatIf, fixedTargetAtR, breakEvenAtR, estimateBreakEvenAtR, recommendRR } from '@/lib/journal/whatIfEngine';
import type { WhatIfScenario, WhatIfResult, PriceBar, WhatIfTrade } from '@/lib/journal/whatIfEngine';
import { useTradeReconcile, useTradeBars, useAllTradeBars } from '@/hooks/useTradeBars';
import { buildAggregate } from '@/lib/journal/plannedScenarios';
import type { PlannedScenario } from '@/lib/journal/plannedScenarios';
import { useShadowTrade, useShadowAggregate } from '@/hooks/useShadow';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
const COLOR_SILVER = '#C2C8D2';

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

function PriceChart({ trade, bars, mfe, mae }: PriceChartProps) {
  const hasBars = bars.length > 0;

  const stopPrice = trade.stop_price && trade.stop_price > 0 ? trade.stop_price : null;
  const tpPrice   = trade.take_profit_price && trade.take_profit_price > 0
    ? trade.take_profit_price
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
    ...(stopPrice ? [stopPrice] : []),
    ...(tpPrice   ? [tpPrice]   : []),
    ...(mfe       ? [mfe.price] : []),
    ...(mae       ? [mae.price] : []),
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
          {stopPrice && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-px w-4 border-t-2 border-dashed border-white/40" />
              Stop {fmtPrice(stopPrice)}
            </span>
          )}
          {tpPrice && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-px w-4 border-t-2 border-dashed border-white/40" />
              Target {fmtPrice(tpPrice)}
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

            {/* Stop — dashed neutral line (not red — brand rule: no stoplight on chart lines) */}
            {stopPrice && (
              <ReferenceLine
                y={stopPrice}
                stroke="rgba(255,255,255,0.35)"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: 'Stop', fill: 'rgba(255,255,255,0.5)', fontSize: 10, position: 'right' }}
              />
            )}
            {/* Target — dashed neutral line */}
            {tpPrice && (
              <ReferenceLine
                y={tpPrice}
                stroke="rgba(255,255,255,0.35)"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: 'Target', fill: 'rgba(255,255,255,0.5)', fontSize: 10, position: 'right' }}
              />
            )}
            {/* Entry — very subtle */}
            <ReferenceLine
              y={trade.entry_price}
              stroke="rgba(255,255,255,0.12)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />

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
              name="Price"
              stroke={COLOR_GOLD}
              strokeWidth={hasBars ? 1.5 : 2.5}
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

// ─── Scenario case card (small-multiple for DayView) ─────────────────────────

interface ScenarioCaseCardProps {
  title: string;
  color: string;
  isActual: boolean;
  endValue: number;
  deltaVsActual: number;
  points: Array<{ label: string; actual: number; stop: number; target: number; breakeven: number }>;
  dataKey: 'actual' | 'stop' | 'target' | 'breakeven';
}

function ScenarioCaseCard({
  title,
  color,
  isActual,
  endValue,
  deltaVsActual,
  points,
  dataKey,
}: ScenarioCaseCardProps) {
  return (
    <div className={`${JOURNAL_PANEL} px-ds-4 py-ds-4 flex flex-col gap-ds-3`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-semibold text-white leading-snug">{title}</span>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="font-data text-[13px] font-semibold tabular-nums text-white/82">
            {fmtPnl(endValue)}
          </span>
          {!isActual && (
            <span className="text-[11px] text-white/55">
              {fmtDelta(deltaVsActual)}
            </span>
          )}
        </div>
      </div>

      {/* Mini chart */}
      <div style={{ width: '100%', height: 150 }}>
        <ResponsiveContainer>
          <LineChart data={points} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <XAxis dataKey="label" hide />
            <YAxis hide />
            <Tooltip content={<TotalTooltip />} />
            {/* For non-actual cards: faint gold actual reference line */}
            {!isActual && (
              <Line
                type="monotone"
                dataKey="actual"
                stroke={COLOR_GOLD}
                strokeOpacity={0.28}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={true}
              />
            )}
            {/* The case's own line */}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Day tab (was "Total" — includes Discipline Tax card for beta) ─────────────

function DayView({ trades, barsByTrade }: { trades: Trade[]; barsByTrade: Map<string, PriceBar[]> }) {
  const agg = useMemo(() => buildAggregate(trades), [trades]);

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

  const { totals, coverage, points } = agg;
  const xInterval = points.length > 10 ? Math.floor(points.length / 8) : 0;

  const statCards: Array<{
    label: string;
    value: number;
    caption?: string;
    isGold?: boolean;
  }> = [
    { label: 'Actual', value: totals.actual, isGold: true },
    {
      label: 'If held to stop',
      value: totals.stop,
      caption: `${coverage.withStop} of ${coverage.total} trades have a stop`,
    },
    {
      label: 'If held to target',
      value: totals.target,
      caption: `${coverage.withTarget} of ${coverage.total} have a target`,
    },
  ];

  return (
    <div className="flex flex-col gap-ds-5">
      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-ds-3">
        {statCards.map((card) => {
          const positive = card.value >= 0;
          const valueColor = card.isGold
            ? 'text-[#F2C85F]'
            : positive
              ? 'text-[#3BC76E]'
              : 'text-[#EF4444]';
          return (
            <div
              key={card.label}
              className={[
                JOURNAL_PANEL,
                'min-h-[110px] px-ds-4 py-ds-4',
                card.isGold ? 'ring-1 ring-[#C9A646]/30' : '',
              ].join(' ')}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_50%,rgba(255,255,255,0.025),transparent_32%)]" />
              <div className="relative flex flex-col gap-ds-2">
                <span className="text-[10px] font-semibold uppercase tracking-[1.2px] text-white/50 leading-snug">
                  {card.label}
                </span>
                <p className={`font-data text-[clamp(22px,1.55vw,28px)] font-semibold leading-none tabular-nums ${valueColor}`}>
                  {fmtPnl(card.value)}
                </p>
                {card.caption && (
                  <p className="text-[11px] text-white/38 leading-relaxed mt-auto">
                    {card.caption}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cumulative P&L line chart */}
      <div className={JOURNAL_PANEL}>
        <div className="flex items-start justify-between gap-ds-3 border-b border-white/[0.06] px-ds-5 py-ds-4">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-white">Cumulative P&amp;L by scenario</span>
            <ShadowInfoIcon label="Each line shows cumulative P&L across all closed trades. When a stop or target is missing for a trade, that trade's actual P&L is used instead so all lines span the same set of trades." />
          </div>
        </div>
        <div className="px-ds-5 pb-ds-5 pt-ds-4" style={{ width: '100%', height: 420 }}>
          <ResponsiveContainer>
            <LineChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
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
              <Tooltip content={<TotalTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', paddingTop: 8 }}
              />
              {/* ETF-chart style: solid lines, gold / green / silver. Break-even = faint baseline. */}
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke={COLOR_GOLD}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="target"
                name="Held to target"
                stroke={COLOR_GREEN}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="stop"
                name="Held to stop"
                stroke={COLOR_SILVER}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scenario cases — small-multiples grid */}
      <div className="flex flex-col gap-ds-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white">
            What if you&apos;d managed every trade one way
          </span>
          <ShadowInfoIcon label="Each card replays all your closed trades under a single management rule, against what you actually did." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-4">
          {(
            [
              { key: 'actual',    title: 'What you actually did',       color: COLOR_GOLD,              isActual: true  },
              { key: 'target',    title: 'If you held to target',        color: COLOR_GREEN,             isActual: false },
              { key: 'stop',      title: 'If you held to stop',          color: COLOR_SILVER,            isActual: false },
            ] as Array<{
              key: 'actual' | 'stop' | 'target';
              title: string;
              color: string;
              isActual: boolean;
            }>
          ).map((c) => (
            <ScenarioCaseCard
              key={c.key}
              title={c.title}
              color={c.color}
              isActual={c.isActual}
              endValue={totals[c.key]}
              deltaVsActual={totals[c.key] - totals.actual}
              points={points}
              dataKey={c.key}
            />
          ))}
        </div>
      </div>

      {/* ── Risk-reward lab ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-ds-3">
        <div className="flex items-center gap-2 border-t border-white/[0.06] pt-ds-5">
          <span className="text-[14px] font-semibold text-white">Test a fixed rule</span>
          <ShadowInfoIcon label="Apply a fixed risk-reward rule to all your trades and see what the outcome would have been." />
        </div>
        <ScenarioLab closedTrades={trades} barsByTrade={barsByTrade} />
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

function DistributionView({ tracked, total, trades }: { tracked: number; total: number; trades: Trade[] }) {
  const rules: Array<{ key: ScenarioKey; label: string; description: string }> = [
    {
      key: 'held_original_stop',
      label: 'Held original stop',
      description: 'Did keeping your planned stop improve or cost you vs moving it?',
    },
    {
      key: 'original_target_hit',
      label: 'Held to original target',
      description: 'How often do targets actually get hit vs your early exits?',
    },
    {
      key: 'held_loser_past_stop',
      label: 'Held loser past stop',
      description: 'The cost of ignoring your stop and holding until close.',
    },
  ];

  return (
    <div className="flex flex-col gap-ds-5">
      {/* Shadow Insight coaching card */}
      <ShadowInsightCard trades={trades} />

      {/* Header note */}
      <div className={`${JOURNAL_PANEL} px-ds-5 py-ds-4`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_50%,rgba(201,166,70,0.05),transparent_40%)]" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C9A646]/18 bg-[#C9A646]/08 text-[#E8C766]">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">Across-trade distribution</p>
            <p className="text-[12px] text-white/50 mt-0.5 max-w-[520px]">
              These panels show how each decision rule performed across all your intra-trade tracked trades — not just one.
              Single-trade counterfactuals are anecdotal; patterns emerge at {DISTRIBUTION_MIN_N}+ tracked trades.
            </p>
            <p className="text-[11px] text-white/38 mt-2">
              Currently tracking {tracked} of {total} closed trades with intra-trade price paths.
            </p>
          </div>
        </div>
      </div>

      {/* Per-rule stat blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-ds-4">
        {rules.map((rule) => (
          <DistributionRuleStat
            key={rule.key}
            ruleKey={rule.key}
            label={rule.label}
            description={rule.description}
            tracked={tracked}
            total={total}
          />
        ))}
      </div>
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
      {/* Price Path chart */}
      <PriceChart trade={trade} bars={bars} mfe={mfe} mae={mae} />

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
  return (
    <div style={{ width: '100%', height: 56 }}>
      <ResponsiveContainer width="100%" height={56}>
        <LineChart data={pts} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
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
          onClick={() => onChange(opt)}
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
}: LabCardProps) {
  const pnlPositive = (totalPnl ?? 0) >= 0;
  const deltaPositive = (deltaVsActual ?? 0) >= 0;
  return (
    <div
      className={`rounded-[14px] border p-ds-4 flex flex-col gap-ds-3 transition-colors ${
        isInert
          ? 'border-white/[0.06] bg-white/[0.02] opacity-60'
          : isBaseline
            ? 'border-2 border-[#60A5FA]/60 bg-[rgba(22,22,22,0.90)]'
            : 'border-[0.5px] border-white/[0.08] bg-[rgba(22,22,22,0.90)] hover:border-white/[0.14]'
      }`}
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
      {children}
    </div>
  );
}

/**
 * FINO EXPLAINS — inline branded explainer card.
 * Uses /fino-avatar.png (same asset as FinoExplains.tsx).
 * This is a visual on-page card, distinct from useRegisterJournalFinoContext
 * which feeds data to FINO chat.
 */
function FinoExplainsInline() {
  return (
    <div className={`${JOURNAL_PANEL} px-ds-4 py-ds-4`}>
      <div className="flex items-start gap-ds-3">
        <img
          src="/fino-avatar.png"
          alt="FINO"
          className="h-8 w-8 flex-shrink-0 rounded-full object-cover ring-1 ring-[#C9A646]/50 mt-0.5"
        />
        <div className="flex flex-col gap-ds-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#C9A646]">
            FINO EXPLAINS
          </p>
          <p className="text-[13px] text-white/70 leading-relaxed">
            This lab replays every closed trade as if you had applied one fixed rule — a set
            R target, or a stop moved to break-even — using the real favorable and adverse
            extremes each trade reached. No guesses: if price bars are stored, the replay
            is exact; otherwise it uses your recorded excursion R values. Use the toggles
            to find the risk-reward ratio that fits how your trades actually behave.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * ScenarioLab — aggregate risk-reward lab section.
 * Mounted as a new "Lab" tab on the Shadow page.
 * Does NOT modify or replace any existing tab.
 */
interface ScenarioLabProps {
  closedTrades: Trade[];
  barsByTrade: Map<string, PriceBar[]>;
}

function ScenarioLab({ closedTrades, barsByTrade }: ScenarioLabProps) {
  const [targetR, setTargetR] = useState<1 | 2 | 3 | 4>(2);
  const [beR, setBeR] = useState<1 | 2 | 3>(1);

  // Build WhatIfTrade array (sorted ascending by close time for cumulative curves).
  const allWhatIfTrades = useMemo<WhatIfTrade[]>(() => {
    const sorted = [...closedTrades].sort(
      (a, b) => new Date(a.close_at ?? a.open_at).getTime() - new Date(b.close_at ?? b.open_at).getTime(),
    );
    return sorted.map((t): WhatIfTrade => ({
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
  }, [closedTrades]);

  // Parallel sorted closed list (same order as allWhatIfTrades).
  const sortedClosed = useMemo(() => {
    return [...closedTrades].sort(
      (a, b) => new Date(a.close_at ?? a.open_at).getTime() - new Date(b.close_at ?? b.open_at).getTime(),
    );
  }, [closedTrades]);

  // Actual (baseline) cumulative curve.
  const actualCurve = useMemo<number[]>(() => {
    let cum = 0;
    return sortedClosed.map((t) => {
      cum += t.pnl ?? 0;
      return cum;
    });
  }, [sortedClosed]);
  const actualTotal = actualCurve[actualCurve.length - 1] ?? 0;

  // Target-at-R curve (reactive to targetR toggle).
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
    const hitRate = sortedClosed.length > 0 ? Math.round((hits / sortedClosed.length) * 100) : 0;
    return { curve, total, delta: total - actualTotal, hitRate };
  }, [sortedClosed, allWhatIfTrades, targetR, actualTotal]);

  // Count indeterminate trades for the current targetR (for the note under the card).
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

  // Break-even stop curve — 3-tier fallback per trade:
  //   Tier 1 (exact):         bars stored → breakEvenAtR (bar walk)
  //   Tier 2a (certain):      no bars, estimateBreakEvenAtR = 'certain' → point pnlUsd
  //   Tier 2b (indeterminate):no bars, estimateBreakEvenAtR = 'indeterminate' → band
  //   Tier 3 (skip):          neither computable → not counted
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
      const hasBars = (bars?.length ?? 0) > 0;
      const actualPnl = t.pnl ?? 0;

      if (hasBars) {
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

  // RR recommendation from the engine.
  const recommendation = useMemo(() => recommendRR(allWhatIfTrades), [allWhatIfTrades]);

  const targetColor = targetData.total >= actualTotal ? COLOR_GREEN : COLOR_RED;

  const n = sortedClosed.length;
  if (n === 0) return null;

  return (
    <div className="flex flex-col gap-ds-4">
      {/* Section heading */}
      <div className="flex flex-col gap-ds-1">
        <h2 className="text-[18px] font-semibold text-white leading-snug">
          Risk-reward lab
        </h2>
        <p className="text-[13px] text-white/50">
          Test a fixed rule across your {n} closed trade{n !== 1 ? 's' : ''} — find what actually works for you.
        </p>
      </div>

      {/* FINO EXPLAINS — no existing on-page explainer card in the Shadow page */}
      <FinoExplainsInline />

      {/* 2-card grid: Target card + Break-even stop card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-ds-4">

        {/* Card 1 — Baseline */}
        <LabCard
          title="What you actually did"
          subtitle="Your real exits — the baseline."
          totalPnl={actualTotal}
          deltaVsActual={null}
          curve={actualCurve}
          curveColor={COLOR_GOLD}
          isBaseline
        />

        {/* Card 2 — Target: let it run to fixed R */}
        <LabCard
          title="Target — let it run"
          subtitle={`Exits at ${targetR}R or stops out at −1R.`}
          totalPnl={targetData.total}
          deltaVsActual={targetData.delta}
          curve={targetData.curve}
          curveColor={targetColor}
          badge={`Hits the ${targetR}R target ${targetData.hitRate}% of the time.`}
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

        {/* Card 3 — Break-even stop (3-tier confidence model) */}
        <LabCard
          title="Break-even stop"
          subtitle={`Move stop to entry once price reaches ${beR}R in your favour.`}
          totalPnl={beData.total}
          deltaVsActual={beData.coveredN > 0 ? beData.delta : null}
          curve={beData.curve}
          curveColor={COLOR_GREEN}
          isInert={beData.coveredN === 0}
          inertMessage="Add stops/targets to your trades to unlock this scenario."
        >
          {beData.coveredN > 0 && beData.indetN > 0 && beData.bandLow !== null && beData.bandHigh !== null && (
            <p className="text-[11px] text-white/42 leading-relaxed">
              Range incl. {beData.indetN} indeterminate:{' '}
              <span className="tabular-nums">{fmtPnl(Math.round(beData.bandLow))}</span>
              {' … '}
              <span className="tabular-nums">{fmtPnl(Math.round(beData.bandHigh))}</span>
            </p>
          )}
          {beData.coveredN > 0 && (
            <p className="text-[11px] text-white/42 leading-relaxed">
              <span>Exact {beData.exactN}</span>
              {' · '}
              <span>Estimated {beData.certainN}</span>
              {' · '}
              <span className={beData.indetN > 0 ? 'text-[#C9A646]' : ''}>
                Indeterminate {beData.indetN}
              </span>
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

      {/* Tier legend */}
      <p className="text-[11px] text-white/28 leading-relaxed">
        Exact = from price bars · Estimated = from your trade&apos;s favorable/adverse extremes · Indeterminate = order unknown without bars
      </p>

      {/* RR recommendation panel */}
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
                  ({fmtDelta(Math.round(targetData.delta))}); expectancy peaks at {recommendation.recommendedR}R.
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
    <div className="w-full max-w-[1200px] mx-auto py-ds-7 px-ds-4 flex flex-col gap-ds-5">

      {/* Page header */}
      <div className="flex flex-col items-center text-center gap-1">
        <h1 className="text-2xl font-bold text-white">Shadow</h1>
        <p className="text-[11px] text-white/62">
          See what your trades could have been.
        </p>
      </div>

      {/* Shadow — 3-tab experience */}
      <Tabs defaultValue="day">
        <TabsList className="mx-auto flex w-fit bg-[rgba(20,20,20,0.6)] border border-white/[0.08] rounded-[10px] p-1 h-auto">
          <TabsTrigger value="day" className={triggerClass}>Performance</TabsTrigger>
          <TabsTrigger value="distribution" className={triggerClass}>Distribution</TabsTrigger>
          <TabsTrigger value="trade" className={triggerClass}>Trade</TabsTrigger>
        </TabsList>

        {/* ── Trade tab ── */}
        <TabsContent value="trade" className="mt-ds-5">
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
        <TabsContent value="day" className="mt-ds-5">
          {isLoading ? loadingEl : <DayView trades={closedTrades} barsByTrade={barsByTrade} />}
        </TabsContent>

        {/* ── Distribution tab ── */}
        <TabsContent value="distribution" className="mt-ds-5">
          {isLoading ? loadingEl : (
            <DistributionView
              tracked={aggregate.tracked}
              total={aggregate.total}
              trades={closedTrades}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
