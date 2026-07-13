/**
 * JournalReportSlides — content for the 6 Journal Report slides.
 * Consumed by JournalReportPage.tsx, each wrapped in <ReportSlideFrame>.
 * Pure presentation over `JournalReportData` (src/lib/reports/journalReportData.ts).
 */
import { useState, useMemo, type ReactNode } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  AreaChart,
  Area,
  ReferenceArea,
} from 'recharts';
import { Target, TrendingUp, Scale, TrendingDown, HelpCircle, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Change, Price } from '@/components/ds/NumberDisplay';
import { AIArenaTabNav } from '@/components/ai-arena/AIArenaTabNav';
import { cn } from '@/lib/utils';
import type {
  AdvancedStatTile,
  ConsistencyStatCard,
  DayOfWeekRow,
  EdgeScoreMetric,
  JournalReportData,
  PatternClassification,
  StatusBadge,
} from '@/lib/reports/reportTypes';
import { pickWorstDay } from '@/lib/reports/journalReportData';

export const JOURNAL_SLIDE_PILLS: Record<string, string> = {
  consistency: 'TRADING CONSISTENCY',
  'edge-score': 'PERFORMANCE METRICS',
  'day-of-week': 'PATTERN DETECTED',
  patterns: 'TRADING PATTERNS',
  'risk-drawdown': 'RISK PROFILE',
  discipline: 'DISCIPLINE',
};

const CARD_ICON: Record<string, typeof Target> = {
  'win-rate': Target,
  'profit-factor': TrendingUp,
  'avg-win-loss': Scale,
  'max-drawdown': TrendingDown,
};

function statusBadgeClasses(status: StatusBadge): string {
  switch (status) {
    case 'GREAT':
    case 'GOOD':
      return 'bg-gold-primary/15 text-gold-primary';
    case 'NEEDS WORK':
      return 'bg-status-warning/15 text-status-warning';
    case 'WATCH OUT':
    default:
      return 'bg-num-negative/15 text-num-negative';
  }
}

/** Tiny uppercase panel/column caption — the report's shared label voice. */
const CAPTION_CLASS = 'text-[10px] uppercase tracking-[0.15em] text-ink-tertiary';

function statusValueClasses(status: StatusBadge): string {
  switch (status) {
    case 'GREAT':
    case 'GOOD':
      return 'text-gold-primary';
    case 'NEEDS WORK':
      return 'text-status-warning';
    case 'WATCH OUT':
    default:
      return 'text-num-negative';
  }
}

// ---------------------------------------------------------------------------
// 1. Consistency Dashboard — Essential / Advanced / Graphs tabs
// ---------------------------------------------------------------------------

const CONSISTENCY_TABS = [
  { id: 'essential', label: 'Essential Stats' },
  { id: 'advanced', label: 'Advanced Stats' },
  { id: 'graphs', label: 'Graphs' },
];

export function ConsistencySlideContent({ data }: { data: JournalReportData }) {
  const [activeTab, setActiveTab] = useState<string>('essential');

  return (
    <div className="space-y-ds-4">
      {/* Trade count + range live in the page-level subtitle (ReportShell) —
          repeating them inside the slide was duplicate chrome. */}
      <AIArenaTabNav items={CONSISTENCY_TABS} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === 'essential' && (
        <div className="grid grid-cols-1 gap-ds-3 pt-ds-1 sm:grid-cols-2">
          {data.consistency.map((card) => (
            <ConsistencyMetricCard key={card.key} card={card} />
          ))}
        </div>
      )}

      {activeTab === 'advanced' && <AdvancedStatsGrid tiles={data.advancedStats} />}

      {activeTab === 'graphs' && <ConsistencyGraphs data={data} />}
    </div>
  );
}

function ConsistencyMetricCard({ card }: { card: ConsistencyStatCard }) {
  const Icon = CARD_ICON[card.key] ?? Target;
  return (
    <div className="relative overflow-hidden rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-4">
      <div className="flex items-center justify-between gap-ds-2">
        <div className="flex min-w-0 items-center gap-ds-2">
          <Icon className="h-4 w-4 flex-shrink-0 text-gold-primary" aria-hidden="true" />
          <span className="truncate text-sm text-ink-secondary">{card.label}</span>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={card.tooltip}
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex flex-shrink-0 items-center justify-center"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-ink-tertiary hover:text-gold-primary" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                {card.tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className={cn('inline-flex flex-shrink-0 rounded-sm px-2 py-0.5 text-[10px] font-semibold tracking-wide', statusBadgeClasses(card.status))}>
          {card.status}
        </span>
      </div>

      <div className="mt-ds-3">
        <span className={cn('font-mono text-3xl tabular-nums leading-none', statusValueClasses(card.status))}>
          {card.displayValue}
        </span>
      </div>

      <p className="mt-ds-3 text-xs leading-snug text-ink-secondary">{card.explanation}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1b. Advanced Stats tab
// ---------------------------------------------------------------------------

function AdvancedStatsGrid({ tiles }: { tiles: AdvancedStatTile[] }) {
  if (tiles.length === 0) {
    return (
      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-5 text-center text-sm text-ink-secondary">
        Not enough data yet to compute advanced stats.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-ds-5 gap-y-0 pt-ds-1 sm:grid-cols-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.key} className="border-b border-border-ds-subtle py-ds-2">
          <div className="flex items-center gap-1.5">
            <span className={cn('truncate', CAPTION_CLASS)}>{tile.label}</span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={tile.tooltip}
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex flex-shrink-0 items-center justify-center"
                  >
                    <HelpCircle className="h-3 w-3 text-ink-tertiary hover:text-gold-primary" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  {tile.tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="mt-ds-1 flex items-center gap-ds-2">
            <span className={cn('font-mono text-sm tabular-nums', tile.status ? statusValueClasses(tile.status) : 'text-ink-primary')}>
              {tile.displayValue}
            </span>
            {tile.status && (
              <span className={cn('rounded-sm px-1.5 py-0.5 text-[9px] font-semibold tracking-wide', statusBadgeClasses(tile.status))}>
                {tile.status}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1c. Graphs tab
// ---------------------------------------------------------------------------

function ConsistencyGraphs({ data }: { data: JournalReportData }) {
  const ddRange = useMemo(() => {
    const inDd = data.risk.equityCurve.filter((p) => p.inDrawdown);
    if (inDd.length === 0) return null;
    return { x1: inDd[0].date, x2: inDd[inDd.length - 1].date };
  }, [data.risk.equityCurve]);

  return (
    <div className="space-y-ds-4 pt-ds-1">
      <div className="grid grid-cols-1 gap-ds-4 md:grid-cols-2">
        <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-3">
          <p className={cn('mb-ds-2', CAPTION_CLASS)}>Cumulative equity curve</p>
          {data.risk.equityCurve.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-xs text-ink-tertiary">Not enough closed trades.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.risk.equityCurve} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="consistencyEquityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A646" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#C9A646" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 9 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} minTickGap={40} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 9 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} width={44} tickFormatter={(v: number) => `$${v}`} />
                <RTooltip contentStyle={{ background: 'rgba(20,20,20,0.98)', border: '1px solid rgba(201,166,70,0.3)', borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative P&L']} />
                {ddRange && <ReferenceArea x1={ddRange.x1} x2={ddRange.x2} fill="#E24B4A" fillOpacity={0.08} />}
                <Area type="monotone" dataKey="cumulativePnl" stroke="#C9A646" strokeWidth={2} fill="url(#consistencyEquityGradient)" isAnimationActive={false} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-3">
          <p className={cn('mb-ds-2', CAPTION_CLASS)}>R-multiple distribution</p>
          {data.graphs.rDistribution.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-xs text-ink-tertiary">Not enough R data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.graphs.rDistribution} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 8 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={40} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 9 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} width={28} allowDecimals={false} />
                <RTooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: 'rgba(20,20,20,0.98)', border: '1px solid rgba(201,166,70,0.3)', borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`${value} trades`, 'Count']} />
                <Bar dataKey="count" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                  {data.graphs.rDistribution.map((b, i) => (
                    <Cell key={i} fill={b.isNegative ? '#E24B4A' : 'rgba(255,255,255,0.7)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-3">
        <p className={cn('mb-ds-2', CAPTION_CLASS)}>Daily P&amp;L</p>
        {data.graphs.dailyPnl.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-xs text-ink-tertiary">Not enough dated trades yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.graphs.dailyPnl} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 9 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} minTickGap={40} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 9 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} width={48} tickFormatter={(v: number) => `$${v}`} />
              <RTooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: 'rgba(20,20,20,0.98)', border: '1px solid rgba(201,166,70,0.3)', borderRadius: 8, fontSize: 12 }} labelFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']} />
              <Bar dataKey="pnl" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                {data.graphs.dailyPnl.map((p, i) => (
                  <Cell key={i} fill={p.pnl < 0 ? '#E24B4A' : 'rgba(255,255,255,0.7)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. FINO Edge Score
// ---------------------------------------------------------------------------

const EDGE_METRIC_TOOLTIP: Record<string, string> = {
  winRate: 'Share of trades that closed as winners.',
  profitFactor: 'Gross profit divided by gross loss.',
  avgWinLoss: 'Average R of winning trades divided by average R of losing trades.',
  maxDrawdown: 'Largest peak-to-trough decline, normalized 0-100 (lower drawdown scores higher).',
  recoveryFactor: 'Net P&L divided by your max drawdown in dollars.',
  consistency: 'How stable your R-multiples are trade to trade.',
};

function scoreStatus(score: number): StatusBadge {
  if (score >= 66) return 'GREAT';
  if (score >= 50) return 'GOOD';
  if (score >= 33) return 'NEEDS WORK';
  return 'WATCH OUT';
}

/** English verdict word per metric, colored to match the ledger's status language. */
function metricVerdict(status: StatusBadge): { word: string; className: string } {
  switch (status) {
    case 'GREAT':
      return { word: 'Strength', className: 'text-gold-primary' };
    case 'GOOD':
      return { word: 'Solid', className: 'text-gold-primary' };
    case 'NEEDS WORK':
      return { word: 'Weak', className: 'text-status-warning' };
    case 'WATCH OUT':
    default:
      return { word: 'Critical', className: 'text-num-negative' };
  }
}

/** Position vs. the pro benchmark zone — score >= 66 is the pro zone. */
function vsProLabel(score: number): string {
  if (score >= 66) return 'Above';
  if (score >= 33) return 'Below';
  return 'Far below';
}

const OVERALL_VERDICT: Record<StatusBadge, string> = {
  GREAT: 'Durable edge — protect it with the same risk discipline.',
  GOOD: 'A real edge is forming — tighten the weak metrics.',
  'NEEDS WORK': 'The edge is fragile — the weak metrics are erasing it.',
  'WATCH OUT': 'No durable edge yet — risk control comes first.',
};

/** Mini benchmark bar fill color per status — matches the ledger's verdict colors. */
function scoreBarFillClass(status: StatusBadge): string {
  switch (status) {
    case 'GREAT':
    case 'GOOD':
      return 'bg-gold-primary/80';
    case 'NEEDS WORK':
      return 'bg-status-warning/80';
    case 'WATCH OUT':
    default:
      return 'bg-num-negative/80';
  }
}

const EDGE_LEDGER_HEADERS = [
  { label: 'METRIC', className: 'col-span-4' },
  { label: 'VALUE', className: 'col-span-2 text-right' },
  { label: 'SCORE', className: 'col-span-2 text-right' },
  { label: 'VS PRO', className: 'col-span-2 text-right' },
  { label: 'VERDICT', className: 'col-span-2 text-right' },
];

/** One ledger row — metric label + tooltip, raw value, mini benchmark bar +
 *  score, position vs. the pro zone, and a one-word verdict. */
function EdgeLedgerRow({ metric, isLast }: { metric: EdgeScoreMetric; isLast: boolean }) {
  const status = scoreStatus(metric.score);
  const tooltipCopy = EDGE_METRIC_TOOLTIP[metric.key] ?? metric.label;
  const verdict = metricVerdict(status);
  const clampedScore = Math.max(0, Math.min(100, metric.score));

  return (
    <div className={cn('grid grid-cols-12 items-center gap-ds-2 py-ds-3', !isLast && 'border-b border-border-ds-subtle')}>
      <div className="col-span-4 flex min-w-0 items-center gap-1.5">
        <span className="truncate text-sm text-ink-primary">{metric.label}</span>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={tooltipCopy}
                onClick={(e) => e.preventDefault()}
                className="inline-flex flex-shrink-0 items-center justify-center"
              >
                <HelpCircle className="h-3 w-3 text-ink-tertiary hover:text-gold-primary" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">
              {tooltipCopy}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="col-span-2 text-right">
        <span className="font-mono text-sm tabular-nums text-ink-primary">{metric.rawLabel}</span>
      </div>

      <div className="col-span-2 flex items-center justify-end gap-ds-2">
        <span className="relative hidden h-1 w-12 overflow-hidden rounded-full bg-white/[0.06] sm:inline-block">
          <span className={cn('absolute left-0 top-0 h-full rounded-full', scoreBarFillClass(status))} style={{ width: `${clampedScore}%` }} />
          <span className="absolute left-[66%] top-0 h-full w-px bg-white/20" />
        </span>
        <span className="font-mono text-sm tabular-nums text-ink-primary">{Math.round(metric.score)}</span>
      </div>

      <div className="col-span-2 text-right">
        <span className="text-xs text-ink-secondary">{vsProLabel(metric.score)}</span>
      </div>

      <div className="col-span-2 text-right">
        <span className={cn('text-xs font-semibold tracking-wide', verdict.className)}>{verdict.word}</span>
      </div>
    </div>
  );
}

export function EdgeScoreSlideContent({ data }: { data: JournalReportData }) {
  const overallStatus = scoreStatus(data.edgeScore.overall);

  return (
    <div className="grid grid-cols-1 gap-ds-6 md:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]">
      <div className="flex flex-col items-center justify-center text-center md:border-r md:border-border-ds-subtle md:pr-ds-6">
        <p className="font-mono text-7xl font-light tabular-nums leading-none text-ink-primary">{data.edgeScore.overall.toFixed(1)}</p>
        <p className="mt-ds-2 text-[10px] uppercase tracking-[0.2em] text-ink-tertiary">Edge Score &middot; of 100</p>
        <span className={cn('mt-ds-3 rounded-full px-ds-3 py-1 text-[11px] font-semibold tracking-wide', statusBadgeClasses(overallStatus))}>
          {overallStatus}
        </span>
        <p className="mt-ds-4 max-w-[220px] text-sm leading-snug text-ink-secondary">{OVERALL_VERDICT[overallStatus]}</p>
      </div>

      <div>
        <div className="grid grid-cols-12 items-center gap-ds-2 border-b border-border-ds-subtle pb-ds-2">
          {EDGE_LEDGER_HEADERS.map((h) => (
            <span key={h.label} className={cn('text-[10px] uppercase tracking-[0.15em] text-ink-tertiary', h.className)}>
              {h.label}
            </span>
          ))}
        </div>
        {data.edgeScore.metrics.map((m, i) => (
          <EdgeLedgerRow key={m.key} metric={m} isLast={i === data.edgeScore.metrics.length - 1} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Day of Week Performance
// ---------------------------------------------------------------------------

export function DayOfWeekSlideContent({ data }: { data: JournalReportData }) {
  const [selectedDay, setSelectedDay] = useState<string>(() => pickWorstDay(data.dayOfWeek));
  const hourBuckets = data.entryHourByDay[selectedDay] ?? [];

  return (
    <div className="grid grid-cols-1 gap-ds-5 md:grid-cols-2">
      <div>
        <div className="flex items-center justify-between px-ds-1 pb-ds-2">
          <p className={CAPTION_CLASS}>By Day of Week</p>
          <span className="text-[10px] uppercase tracking-[0.1em] text-gold-primary">Click on each day</span>
        </div>
        <div className="flex items-center justify-between border-b border-border-ds-subtle px-ds-2 pb-ds-1">
          <span className={CAPTION_CLASS}>DAY</span>
          <div className="flex items-center gap-ds-3">
            <span className={CAPTION_CLASS}>RECORD</span>
            <span className={CAPTION_CLASS}>P&amp;L</span>
          </div>
        </div>
        {data.dayOfWeek.map((row) => (
          <DayRow key={row.day} row={row} selected={row.day === selectedDay} onSelect={() => setSelectedDay(row.day)} />
        ))}
      </div>

      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-4">
        <div className="mb-ds-3 flex items-center justify-between gap-ds-2">
          <p className={CAPTION_CLASS}>
            Entry Time on {selectedDay} ({hourBuckets.reduce((s, b) => s + b.trades, 0)} trades)
          </p>
          <div className="flex flex-shrink-0 items-center gap-ds-3 text-[11px]">
            <span className="text-gold-primary">W – Wins</span>
            <span className="text-num-negative">L – Losses</span>
          </div>
        </div>
        {hourBuckets.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-xs text-ink-tertiary">No trades logged on this day.</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourBuckets} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} width={48} />
              <RTooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{ background: 'rgba(20,20,20,0.98)', border: '1px solid rgba(201,166,70,0.3)', borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
              />
              <Bar dataKey="pnl" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                {hourBuckets.map((b, i) => (
                  <Cell key={i} fill={b.pnl < 0 ? '#E24B4A' : 'rgba(255,255,255,0.7)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function DayRow({ row, selected, onSelect }: { row: DayOfWeekRow; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between rounded-none border-b border-l-2 border-border-ds-subtle px-ds-2 py-ds-2 text-left transition-colors duration-base ease-out',
        selected ? 'border-l-gold-primary bg-gold-primary/[0.06]' : 'border-l-transparent hover:bg-white/[0.03]',
      )}
    >
      <span className={cn('text-sm', selected ? 'text-gold-primary' : 'text-ink-primary')}>{row.day}</span>
      <div className="flex items-center gap-ds-3">
        <span className="text-[11px] text-ink-tertiary">
          {row.wins}W {row.losses}L
        </span>
        <Change value={row.pnl} format="currency" decimals={0} />
        <ChevronRight
          className={cn('h-3.5 w-3.5 flex-shrink-0 text-gold-primary transition-opacity duration-base ease-out', selected ? 'opacity-100' : 'opacity-0')}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// 4. Patterns Detected
// ---------------------------------------------------------------------------

const CLASSIFICATION_COLOR: Record<PatternClassification, string> = {
  Strength: '#C9A646',
  'Area to Improve': '#E24B4A',
  Neutral: 'rgba(255,255,255,0.6)',
};

export function PatternsSlideContent({ data }: { data: JournalReportData }) {
  if (data.patterns.length === 0) {
    return (
      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-5 text-center text-sm text-ink-secondary">
        No clear patterns detected yet — log more trades with consistent tagging to unlock pattern detection.
      </div>
    );
  }

  return (
    <div className="space-y-ds-4">
      <div className="flex items-center justify-between gap-ds-3">
        <p className="text-sm text-ink-secondary">
          Top {data.patterns.length} patterns detected across {data.totalTrades} trades
        </p>
        <div className="flex flex-shrink-0 items-center gap-ds-3 text-[11px] text-ink-tertiary">
          {(Object.keys(CLASSIFICATION_COLOR) as PatternClassification[]).map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: CLASSIFICATION_COLOR[c] }} />
              {c}
            </span>
          ))}
        </div>
      </div>

      <div>
        {data.patterns.map((p, i) => (
          <div key={p.key} className={cn('py-ds-3', i !== data.patterns.length - 1 && 'border-b border-border-ds-subtle')}>
            <div className="flex items-center justify-between gap-ds-3">
              <div className="min-w-0">
                <span className="text-sm font-semibold text-ink-primary">{p.name}</span>
                <p className="mt-ds-1 text-xs leading-snug text-ink-tertiary">{p.description}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-[11px] font-semibold" style={{ color: CLASSIFICATION_COLOR[p.classification] }}>
                  {p.classification}
                </p>
                <p className="font-mono text-lg tabular-nums text-ink-primary">{p.pct}%</p>
                <p className="text-[11px] text-ink-tertiary">{p.count} trades</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Risk & Drawdown
// ---------------------------------------------------------------------------

export function RiskDrawdownSlideContent({ data }: { data: JournalReportData }) {
  const { risk } = data;
  const ddRange = useMemo(() => {
    const inDd = risk.equityCurve.filter((p) => p.inDrawdown);
    if (inDd.length === 0) return null;
    return { x1: inDd[0].date, x2: inDd[inDd.length - 1].date };
  }, [risk.equityCurve]);

  return (
    <div className="space-y-ds-4">
      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-4">
        {risk.equityCurve.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-ink-tertiary">Not enough closed trades to plot an equity curve.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={risk.equityCurve} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="journalEquityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A646" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#C9A646" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} minTickGap={40} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} width={56} tickFormatter={(v: number) => `$${v}`} />
              <RTooltip
                contentStyle={{ background: 'rgba(20,20,20,0.98)', border: '1px solid rgba(201,166,70,0.3)', borderRadius: 8, fontSize: 12 }}
                labelFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative P&L']}
              />
              {ddRange && <ReferenceArea x1={ddRange.x1} x2={ddRange.x2} fill="#E24B4A" fillOpacity={0.08} />}
              <Area type="monotone" dataKey="cumulativePnl" stroke="#C9A646" strokeWidth={2} fill="url(#journalEquityGradient)" isAnimationActive={false} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-border-ds-subtle sm:grid-cols-4">
        <RiskStat label="Max Drawdown">
          <Change value={-Math.abs(risk.maxDrawdown)} format="currency" decimals={0} />
        </RiskStat>
        <RiskStat label="Recovery Factor">
          <Price value={risk.recoveryFactor} format="plain" decimals={2} size="small" />
        </RiskStat>
        <RiskStat label="Largest Loss">
          <Change value={-Math.abs(risk.largestLoss)} format="currency" decimals={0} />
        </RiskStat>
        <RiskStat label="Longest Losing Streak">
          <Price value={risk.longestLosingStreak} format="plain" decimals={0} size="small" />
        </RiskStat>
      </div>
    </div>
  );
}

function RiskStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-ds-3 py-ds-2">
      <p className={CAPTION_CLASS}>{label}</p>
      <div className="mt-ds-1">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Discipline
// ---------------------------------------------------------------------------

export function DisciplineSlideContent({ data }: { data: JournalReportData }) {
  const { discipline } = data;
  const maxCount = Math.max(1, ...discipline.mistakeTags.map((t) => t.count));

  return (
    <div className="space-y-ds-5">
      <div>
        <p className={cn('mb-ds-2', CAPTION_CLASS)}>Mistake tag breakdown</p>
        {discipline.mistakeTags.length === 0 ? (
          <div className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-4 text-center text-xs text-ink-tertiary">
            No trades have been tagged with a mistake yet.
          </div>
        ) : (
          <div>
            {discipline.mistakeTags.slice(0, 6).map((t, i, arr) => (
              <div key={t.tag} className={cn('py-ds-3', i !== arr.length - 1 && 'border-b border-border-ds-subtle')}>
                <div className="flex items-center justify-between gap-ds-2">
                  <span className="truncate text-sm text-ink-primary">{t.tag}</span>
                  <div className="flex flex-shrink-0 items-center gap-ds-3">
                    <span className="font-mono text-xs tabular-nums text-ink-tertiary">{t.count}&times;</span>
                    <Change value={t.avgPnlImpact} format="currency" decimals={0} />
                  </div>
                </div>
                <div className="mt-ds-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-num-negative/70" style={{ width: `${(t.count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(discipline.bestSession || discipline.worstSession) && (
        <div>
          <p className={cn('mb-ds-2', CAPTION_CLASS)}>Best vs. worst session</p>
          <div className="grid grid-cols-1 divide-y divide-border-ds-subtle sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {discipline.bestSession && <SessionCard label="Best session" session={discipline.bestSession} />}
            {discipline.worstSession && <SessionCard label="Worst session" session={discipline.worstSession} />}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionCard({ label, session }: { label: string; session: { label: string; winRate: number; netPnl: number; trades: number } }) {
  return (
    <div className="px-ds-3 py-ds-2">
      <p className={CAPTION_CLASS}>{label}</p>
      <p className="mt-ds-1 text-sm font-semibold text-ink-primary">{session.label}</p>
      <div className="mt-ds-2 flex items-center justify-between">
        <span className="text-xs text-ink-secondary">{session.winRate.toFixed(1)}% win &middot; {session.trades} trades</span>
        <Change value={session.netPnl} format="currency" decimals={0} />
      </div>
    </div>
  );
}
