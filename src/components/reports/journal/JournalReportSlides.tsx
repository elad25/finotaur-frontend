/**
 * JournalReportSlides — content for the 6 Journal Report slides.
 * Consumed by JournalReportPage.tsx, each wrapped in <ReportSlideFrame>.
 * Pure presentation over `JournalReportData` (src/lib/reports/journalReportData.ts).
 */
import { useState, useMemo, type ReactNode } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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
import { Target, TrendingUp, Scale, TrendingDown, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Change, Price } from '@/components/ds/NumberDisplay';
import { cn } from '@/lib/utils';
import type {
  ConsistencyStatCard,
  DayOfWeekRow,
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

// ---------------------------------------------------------------------------
// 1. Consistency Dashboard
// ---------------------------------------------------------------------------

export function ConsistencySlideContent({ data }: { data: JournalReportData }) {
  return (
    <div className="space-y-ds-4">
      <p className="text-sm text-ink-secondary">
        {data.totalTrades} trades &bull; {data.dateRangeLabel}
      </p>
      <div className="grid grid-cols-1 gap-ds-4 sm:grid-cols-2">
        {data.consistency.map((card) => (
          <ConsistencyCard key={card.key} card={card} />
        ))}
      </div>
    </div>
  );
}

function ConsistencyCard({ card }: { card: ConsistencyStatCard }) {
  const Icon = CARD_ICON[card.key] ?? Target;
  return (
    <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-4">
      <div className="flex items-center justify-between gap-ds-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 flex-shrink-0 text-gold-primary" aria-hidden="true" />
          <span className="truncate text-xs text-ink-secondary">{card.label}</span>
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
        <span className={cn('flex-shrink-0 rounded-sm px-2 py-0.5 text-[10px] font-semibold tracking-wide', statusBadgeClasses(card.status))}>
          {card.status}
        </span>
      </div>
      <p className="mt-ds-2 font-mono text-2xl tabular-nums text-ink-primary">{card.displayValue}</p>
      <p className="mt-ds-1 text-xs leading-snug text-ink-secondary">{card.explanation}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. FINO Edge Score
// ---------------------------------------------------------------------------

export function EdgeScoreSlideContent({ data }: { data: JournalReportData }) {
  const radarData = data.edgeScore.metrics.map((m) => ({ label: m.label, value: m.score }));

  return (
    <div className="grid grid-cols-1 gap-ds-5 md:grid-cols-2">
      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-4">
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={radarData} outerRadius="72%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <PolarGrid stroke="rgba(255,255,255,0.10)" />
            <PolarAngleAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.62)', fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke="#C9A646" strokeWidth={2} fill="#C9A646" fillOpacity={0.28} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-ds-3">
        {data.edgeScore.metrics.map((m) => (
          <div key={m.key} className="flex items-center justify-between rounded-[8px] bg-surface-2 px-ds-3 py-ds-2">
            <span className="text-xs text-ink-secondary">{m.label}</span>
            <div className="flex items-center gap-ds-2">
              <span className="font-mono text-xs tabular-nums text-ink-tertiary">{m.rawLabel}</span>
              <span
                className={cn(
                  'rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  m.score >= 66 ? 'bg-gold-primary/15 text-gold-primary' : m.score >= 33 ? 'bg-status-warning/15 text-status-warning' : 'bg-num-negative/15 text-num-negative',
                )}
              >
                {Math.round(m.score)}
              </span>
            </div>
          </div>
        ))}

        <div className="pt-ds-2">
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span>Overall Edge Score</span>
            <span className="font-mono tabular-nums text-gold-primary font-semibold">{data.edgeScore.overall.toFixed(1)}</span>
          </div>
          <div
            className="mt-ds-1 h-2 w-full overflow-hidden rounded-full"
            style={{ background: 'linear-gradient(90deg, #E24B4A 0%, #eab308 50%, #C9A646 100%)' }}
          >
            <div className="relative h-full w-full">
              <div
                className="absolute top-0 h-full w-[3px] bg-ink-primary"
                style={{ left: `${Math.max(0, Math.min(100, data.edgeScore.overall))}%` }}
              />
            </div>
          </div>
        </div>
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
      <div className="space-y-ds-2">
        {data.dayOfWeek.map((row) => (
          <DayRow key={row.day} row={row} selected={row.day === selectedDay} onSelect={() => setSelectedDay(row.day)} />
        ))}
      </div>

      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-4">
        <p className="mb-ds-3 text-xs text-ink-secondary">
          {selectedDay} — P&amp;L by entry hour ({hourBuckets.reduce((s, b) => s + b.trades, 0)} trades)
        </p>
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
        'flex w-full items-center justify-between rounded-[8px] border-[0.5px] px-ds-3 py-ds-2 text-left transition-colors duration-base ease-out',
        selected ? 'border-gold-border bg-gold-primary/[0.06]' : 'border-border-ds-subtle bg-surface-base hover:border-border-ds-default',
      )}
    >
      <span className="text-sm text-ink-primary">{row.day}</span>
      <div className="flex items-center gap-ds-3">
        <span className="text-[11px] text-ink-tertiary">
          {row.wins}W {row.losses}L
        </span>
        <Change value={row.pnl} format="currency" decimals={0} />
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
  Neutral: 'rgba(255,255,255,0.5)',
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
      <p className="text-sm text-ink-secondary">Top patterns detected across {data.totalTrades} trades</p>

      <div className="space-y-ds-3">
        {data.patterns.map((p) => (
          <div key={p.key} className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-3">
            <div className="flex items-center justify-between gap-ds-2">
              <span className="text-sm font-medium text-ink-primary">{p.name}</span>
              <span className="font-mono text-xs tabular-nums text-ink-secondary">
                {p.pct}% &middot; {p.count} trades
              </span>
            </div>
            <p className="mt-ds-1 text-xs leading-snug text-ink-secondary">{p.description}</p>
            <div className="mt-ds-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, p.pct)}%`, background: CLASSIFICATION_COLOR[p.classification] }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-ds-4 pt-ds-1 text-[11px] text-ink-tertiary">
        {(Object.keys(CLASSIFICATION_COLOR) as PatternClassification[]).map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: CLASSIFICATION_COLOR[c] }} />
            {c}
          </span>
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

      <div className="grid grid-cols-2 gap-ds-3 sm:grid-cols-4">
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
    <div className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-3">
      <p className="text-[11px] text-ink-tertiary">{label}</p>
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
        <p className="mb-ds-2 text-xs text-ink-secondary">Mistake tag breakdown</p>
        {discipline.mistakeTags.length === 0 ? (
          <div className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-4 text-center text-xs text-ink-tertiary">
            No trades have been tagged with a mistake yet.
          </div>
        ) : (
          <div className="space-y-ds-2">
            {discipline.mistakeTags.slice(0, 6).map((t) => (
              <div key={t.tag} className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-3">
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
          <p className="mb-ds-2 text-xs text-ink-secondary">Best vs. worst session</p>
          <div className="grid grid-cols-1 gap-ds-3 sm:grid-cols-2">
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
    <div className="rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-base p-ds-3">
      <p className="text-[11px] uppercase tracking-[1px] text-ink-tertiary">{label}</p>
      <p className="mt-ds-1 text-sm font-semibold text-ink-primary">{session.label}</p>
      <div className="mt-ds-2 flex items-center justify-between">
        <span className="text-xs text-ink-secondary">{session.winRate.toFixed(1)}% win &middot; {session.trades} trades</span>
        <Change value={session.netPnl} format="currency" decimals={0} />
      </div>
    </div>
  );
}
