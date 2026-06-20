// src/pages/app/journal/TradeCompare.tsx
// =====================================================
// JOURNAL — Trade Compare (What-If Analysis) — "Shadow"
// =====================================================
// Route: /app/journal/trade-compare
// Two tabs:
//   - Total: cumulative P&L line chart across all closed trades, one line per scenario.
//   - Specific trade: trade picker dialog + Price Path chart + planned-level scenario cards.
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
} from 'recharts';
import { useTrades } from '@/hooks/useTradesData';
import type { Trade } from '@/hooks/useTradesData';
import { analyzeWhatIf } from '@/lib/journal/whatIfEngine';
import type { WhatIfScenario, WhatIfResult, PriceBar } from '@/lib/journal/whatIfEngine';
import { useTradeReconcile, useTradeBars } from '@/hooks/useTradeBars';
import { computePlannedScenarios, buildAggregate } from '@/lib/journal/plannedScenarios';
import type { PlannedScenario } from '@/lib/journal/plannedScenarios';
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
} from 'lucide-react';
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ─── Constants ────────────────────────────────────────────────────────────────

/** DS palette — matches stocks/Compare.tsx SERIES_COLORS convention */
const COLOR_GOLD   = '#C9A646';
const COLOR_GREEN  = '#4AD295';
const COLOR_RED    = '#F87171';
const COLOR_BLUE   = '#60A5FA';

/** Matches JOURNAL_PANEL from Overview.tsx */
const JOURNAL_PANEL =
  'relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]';

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

// ─── Price chart (schematic OR real bars) ────────────────────────────────────

interface PriceChartProps {
  trade: Trade;
  bars: PriceBar[];
  mfe: WhatIfResult['mfe'];
  mae: WhatIfResult['mae'];
}

/** Custom tooltip for the price chart */
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

  // ── Build chart data ────────────────────────────────────────────────────────
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

  // ── Y-axis domain ─────────────────────────────────────────────────────────
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

  // ── MFE / MAE x-axis positions ─────────────────────────────────────────────
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
      {/* ── Dashboard-style chart panel header ──────────────────────────────── */}
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
            {/* Selected trade summary */}
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
        {/* Legend */}
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
              <span className="inline-block h-px w-4 border-t-2 border-dashed border-[#F87171]" />
              Stop {fmtPrice(stopPrice)}
            </span>
          )}
          {tpPrice && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-px w-4 border-t-2 border-dashed border-[#4AD295]" />
              Target {fmtPrice(tpPrice)}
            </span>
          )}
        </div>
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────────── */}
      <div className="px-ds-5 pb-ds-5 pt-ds-4" style={{ width: '100%', height: 480 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <defs>
              {/* Gradient fill under the price line — gold fading to transparent */}
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

            {/* Stop loss — dashed red reference line */}
            {stopPrice && (
              <ReferenceLine
                y={stopPrice}
                stroke={COLOR_RED}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: 'Stop', fill: COLOR_RED, fontSize: 10, position: 'right' }}
              />
            )}
            {/* Take profit — dashed green reference line */}
            {tpPrice && (
              <ReferenceLine
                y={tpPrice}
                stroke={COLOR_GREEN}
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{ value: 'Target', fill: COLOR_GREEN, fontSize: 10, position: 'right' }}
              />
            )}
            {/* Entry level — subtle reference line */}
            <ReferenceLine
              y={trade.entry_price}
              stroke="rgba(255,255,255,0.18)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />

            {/* MFE marker — green dot with label (bars mode only) */}
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
            {/* MAE marker — red dot with label (bars mode only) */}
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

            {/* Price area — gradient fill + crisp gold line on top */}
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

      {/* ── Footer note ─────────────────────────────────────────────────────── */}
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
    case 'actual':    return <Activity className={cls} />;
    case 'stop':      return <Shield className={cls} />;
    case 'target':    return <Target className={cls} />;
    case 'breakeven': return <Activity className={cls} />;
    // legacy keys (kept for backwards compat with whatIfEngine usage)
    case 'held_to_plan':   return <Target className={cls} />;
    case 'best_possible':  return <TrendingUp className={cls} />;
    case 'held_stop':      return <Shield className={cls} />;
    default:               return <Activity className={cls} />;
  }
}

// ─── Scenario card ────────────────────────────────────────────────────────────

// Accepts both PlannedScenario and WhatIfScenario — they share the same shape.
interface ScenarioCardProps {
  scenario: PlannedScenario | WhatIfScenario;
  isBaseline: boolean;
  hasBars: boolean;
}

function ScenarioCard({ scenario, isBaseline, hasBars }: ScenarioCardProps) {
  const pnl = scenario.pnl ?? 0;
  const pnlPositive = pnl >= 0;
  const deltaPositive = (scenario.deltaVsActual ?? 0) >= 0;

  // Color logic:
  //   baseline (actual) → gold
  //   other available   → green if positive, red if negative
  //   unavailable       → muted/disabled
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
      {/* Subtle radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_50%,rgba(255,255,255,0.025),transparent_32%)]" />

      <div className="relative flex h-full flex-col gap-ds-2">
        {/* Top row: label + icon */}
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

        {/* Large P&L number */}
        {scenario.available && scenario.pnl != null ? (
          <p
            className={`font-data text-[clamp(22px,1.55vw,28px)] font-semibold leading-none tracking-normal tabular-nums ${valueColor}`}
          >
            {fmtPnl(scenario.pnl)}
          </p>
        ) : (
          <p className="font-data text-[clamp(22px,1.55vw,28px)] font-semibold leading-none text-white/20">—</p>
        )}

        {/* Delta badge */}
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

        {/* Detail line */}
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

// ─── Total tab ────────────────────────────────────────────────────────────────

/** Custom tooltip for the cumulative P&L line chart */
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

function TotalView({ trades }: { trades: Trade[] }) {
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

  // Summary stat cards
  const statCards: Array<{
    label: string;
    value: number;
    caption?: string;
    isGold?: boolean;
  }> = [
    {
      label: 'Actual',
      value: totals.actual,
      isGold: true,
    },
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
    {
      label: 'Break-even baseline',
      value: totals.breakeven,
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
                dataKey="stop"
                name="Held to stop"
                stroke={COLOR_RED}
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
                dataKey="breakeven"
                name="Break-even"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TradeCompare() {
  // Reconcile excursions once on mount — best-effort, no error surfacing.
  useTradeReconcile();

  const { data: allTrades, isLoading } = useTrades();

  // Closed trades only: exit_price must be present
  const closedTrades = useMemo<Trade[]>(() => {
    if (!allTrades) return [];
    return allTrades.filter(
      (t) => t.exit_price != null && t.exit_price > 0 && t.close_at != null,
    );
  }, [allTrades]);

  // Default to the most recent closed trade
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const effectiveId: string | null = selectedId ?? (closedTrades[0]?.id ?? null);

  const selectedTrade = useMemo<Trade | null>(
    () => closedTrades.find((t) => t.id === effectiveId) ?? null,
    [closedTrades, effectiveId],
  );

  // Fetch real price bars for the selected trade (disabled when no trade selected).
  const { bars, isLoading: barsLoading } = useTradeBars(effectiveId ?? undefined);
  const hasBars = bars.length > 0;

  // Run the what-if engine — passes real bars when available (for MFE/MAE on PriceChart).
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

  // Planned-level scenarios for the Specific trade tab (no bars needed).
  const planned = useMemo(
    () => (selectedTrade ? computePlannedScenarios(selectedTrade) : null),
    [selectedTrade],
  );

  // Insight string derived from planned scenarios.
  const plannedInsight = useMemo<string>(() => {
    if (!planned) return '';
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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full py-ds-7 px-ds-4 flex flex-col gap-ds-5">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="pt-0.5">
          <h1 className="text-2xl font-bold text-white">Shadow</h1>
          <p className="mt-1.5 text-[11px] text-white/62">
            See what your trades could have been.
          </p>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="total">
        <TabsList className="bg-[rgba(20,20,20,0.6)] border border-white/[0.08] rounded-[10px] p-1 h-auto">
          <TabsTrigger
            value="total"
            className="data-[state=active]:bg-[#C9A646]/15 data-[state=active]:text-white data-[state=active]:shadow-none text-white/55 rounded-[8px] px-4 py-1.5 text-[13px] font-medium transition-colors"
          >
            Total
          </TabsTrigger>
          <TabsTrigger
            value="specific"
            className="data-[state=active]:bg-[#C9A646]/15 data-[state=active]:text-white data-[state=active]:shadow-none text-white/55 rounded-[8px] px-4 py-1.5 text-[13px] font-medium transition-colors"
          >
            Specific trade
          </TabsTrigger>
        </TabsList>

        {/* ── Total tab ─────────────────────────────────────────────────── */}
        <TabsContent value="total" className="mt-ds-5">
          {isLoading ? (
            <div className={`${JOURNAL_PANEL} p-ds-5`}>
              <p className="text-center text-sm text-white/42 py-8">Loading your trades…</p>
            </div>
          ) : (
            <TotalView trades={closedTrades} />
          )}
        </TabsContent>

        {/* ── Specific trade tab ────────────────────────────────────────── */}
        <TabsContent value="specific" className="mt-ds-5">
          <div className="flex flex-col gap-ds-5">

            {/* Trade picker button — right-aligned, near the top */}
            {!isLoading && (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={closedTrades.length === 0}
                  onClick={() => setDialogOpen(true)}
                  className={[
                    'flex items-center gap-2 rounded-[9px] border px-3 py-2 text-[13px] font-medium transition-colors',
                    closedTrades.length === 0
                      ? 'cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-white/28'
                      : 'border-[#C9A646]/30 bg-[rgba(20,20,20,0.88)] text-white/82 hover:border-[#C9A646]/55 hover:bg-[rgba(30,28,20,0.92)] hover:text-white',
                  ].join(' ')}
                >
                  <ListFilter className="h-3.5 w-3.5 shrink-0 text-[#C9A646]" />
                  {closedTrades.length === 0 ? 'No closed trades' : 'Select trade'}
                </button>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className={`${JOURNAL_PANEL} p-ds-5`}>
                <p className="text-center text-sm text-white/42 py-8">Loading your trades…</p>
              </div>
            )}

            {/* Empty state — no closed trades */}
            {!isLoading && closedTrades.length === 0 && (
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
            )}

            {!isLoading && closedTrades.length > 0 && (
              <>
                {/* Full-width price chart */}
                {selectedTrade && (
                  <PriceChart
                    trade={selectedTrade}
                    bars={bars}
                    mfe={whatIfResult?.mfe ?? null}
                    mae={whatIfResult?.mae ?? null}
                  />
                )}

                {/* Bars loading indicator */}
                {barsLoading && (
                  <p className="text-[11px] text-white/38 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 flex-shrink-0" />
                    Loading price bars…
                  </p>
                )}

                {/* ── Planned scenario cards ──────────────────────────────── */}
                {planned && (
                  <div className="flex flex-col gap-ds-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-white/50">
                        What-if scenarios
                      </span>
                      <ShadowInfoIcon label="Four alternate outcomes computed from your recorded price levels — no price bars required." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-ds-3">
                      {planned.scenarios.map((scenario) => (
                        <ScenarioCard
                          key={scenario.key}
                          scenario={scenario}
                          isBaseline={scenario.key === 'actual'}
                          hasBars={hasBars}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Insight strip ──────────────────────────────────────── */}
                {planned && (
                  <div className={`${JOURNAL_PANEL} grid min-h-[74px] items-center gap-4 px-ds-5 py-ds-4 sm:grid-cols-[minmax(0,1fr)_auto]`}>
                    <div className="flex min-w-0 items-center gap-ds-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C9A646]/18 bg-[#C9A646]/10 text-[#E8C766] shadow-[0_0_26px_rgba(201,166,70,0.18)]">
                        <Lightbulb className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 text-[13px] font-semibold text-[#E8C766]">Key Takeaway</div>
                        <p className="text-[13px] leading-relaxed text-white/78">
                          {plannedInsight}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Trade picker dialog ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-md border-white/[0.08] bg-[rgba(12,12,12,0.97)] p-0 text-white shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        >
          <DialogHeader className="border-b border-white/[0.06] px-5 pb-4 pt-5">
            <DialogTitle className="text-[15px] font-semibold text-white">
              Select a trade
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12px] text-white/50">
              Pick any closed trade from My Trades to run the what-if analysis.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable trade list */}
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
                  {/* Color dot: LONG=blue, SHORT=red */}
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: t.side === 'LONG' ? COLOR_BLUE : COLOR_RED }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="font-data font-semibold text-sm text-white/90">
                      {t.symbol}
                    </span>
                    <span className="ml-1.5 text-xs text-white/42">
                      {t.side}
                    </span>
                    <span className="ml-1.5 text-xs text-white/28">
                      {fmtDate(t.close_at ?? t.open_at)}
                    </span>
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
    </div>
  );
}
