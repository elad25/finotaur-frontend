// src/pages/app/stocks/MarketPulse.tsx
// =====================================================
// Market Pulse — Breadth · Flows · Sentiment
// Route: /app/stocks/market-pulse
//
// Sections (top-to-bottom):
//   a. Header + MarketStatusBadge inline + "as of" stamp
//   b. Macro strip (2s10s, 10Y, DXY, Crude, Gold, VIX)
//   c. Breadth row (% above MA big-numbers + line chart)
//   d. Advance/Decline line + New Highs/Lows bar chart (half-width)
//   e. Sentiment panel (VIX tiles + Fear & Greed gauge)
//   f. Concentration panel (RSP/SPY line + ratio tiles)
//   g. Fund flows placeholder card (locked/coming-soon state)
//
// Data: useMarketBreadth() → GET /api/market-data/breadth
// All fields null-safe: renders "—" when backend not yet populated.
// Charts: recharts (already a project dependency — matches Compare.tsx / Valuation.tsx)
// =====================================================

import React, { memo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Activity, Lock } from 'lucide-react';
import { useMarketBreadth } from '@/hooks/stocks/useMarketBreadth';
import { useMarketStatus } from '@/lib/marketStatus';
import { SectionSpinner } from '@/components/ds/Spinner';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 2, suffix = ''): string {
  if (n == null || isNaN(n as number)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  return `${sign}${abs.toFixed(decimals)}${suffix}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n as number)) return '—';
  const sign = n >= 0 ? '+' : '−';
  return `${sign}${Math.abs(n).toFixed(1)}%`;
}

function pctClass(n: number | null | undefined): string {
  if (n == null) return 'text-ink-secondary';
  return n < 0 ? 'text-num-negative' : 'text-ink-primary';
}

// Format a date string 'YYYY-MM-DD' to short 'Dec 19' for chart axis labels
function shortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Fear & Greed gauge (pure CSS arc — no new dependency) ───────────────────

/** Map score 0-100 to a Tailwind-safe color string for the gauge needle/fill.
 *  Red band: 0-25, Amber: 26-45, Gold: 46-55, White: 56-100 */
function fearGreedColor(score: number): string {
  if (score <= 25) return '#E24B4A';   // extreme fear — red (num-negative)
  if (score <= 45) return '#C9A646';   // fear — gold-muted
  if (score <= 55) return '#C9A646';   // neutral — gold
  return '#ffffff';                     // greed / extreme greed — white
}

/** Compact gauge that renders a 180° arc filled to score %. */
const FearGreedGauge = memo(function FearGreedGauge({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  // Arc is a 180° semicircle (r=48, center 56,60, stroke path only)
  const r = 44;
  const cx = 56;
  const cy = 56;
  const circ = Math.PI * r; // half-circumference for 180° arc
  // Fraction filled
  const frac = Math.max(0, Math.min(1, score / 100));
  const filled = frac * circ;
  const color = fearGreedColor(score);

  // SVG arc from left (180°) to right (0°) — starts at the leftmost point
  // startX = cx - r, startY = cy; endX = cx + r, endY = cy
  const startX = cx - r;
  const startY = cy;
  const endX = cx + r;
  const endY = cy;

  // Background half-arc path
  const arcPath = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={112} height={68} viewBox="0 0 112 68" fill="none">
        {/* Background track */}
        <path
          d={arcPath}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
        />
        {/* Filled arc via dashoffset trick */}
        <path
          d={arcPath}
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${filled} ${circ}`}
          strokeDashoffset={0}
        />
        {/* Score label */}
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={20}
          fontWeight={700}
          fontFamily="JetBrains Mono, monospace"
          fill={color}
        >
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-xs font-medium tracking-wide" style={{ color }}>
        {label}
      </span>
      <div className="flex justify-between w-full px-2 mt-0.5">
        <span className="text-[10px] text-num-negative font-mono">Fear</span>
        <span className="text-[10px] text-ink-secondary font-mono">Neutral</span>
        <span className="text-[10px] text-ink-primary font-mono">Greed</span>
      </div>
    </div>
  );
});

// ─── Stat tile ────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}

const StatTile = memo(function StatTile({ label, value, sub, valueClass = 'text-ink-primary' }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 p-ds-4 rounded-[12px] border border-border-ds-subtle bg-surface-1 min-w-0">
      <span className="text-[10px] uppercase tracking-widest text-ink-secondary font-sans">
        {label}
      </span>
      <span className={`font-mono tabular-nums text-lg font-semibold leading-tight ${valueClass}`}>
        {value}
      </span>
      {sub && (
        <span className="text-[11px] text-ink-secondary font-mono tabular-nums">
          {sub}
        </span>
      )}
    </div>
  );
});

// ─── Big number with label (breadth row) ─────────────────────────────────────

const BigStat = memo(function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono tabular-nums text-4xl font-bold text-ink-primary leading-none">
        {value}
      </span>
      <span className="text-xs text-ink-secondary uppercase tracking-wider">{label}</span>
    </div>
  );
});

// ─── Chart tooltip ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- recharts tooltip payload type is not exported
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[12px] border border-border-ds-subtle bg-[rgba(14,14,14,0.96)] px-3 py-2 text-xs font-mono">
      <p className="text-ink-secondary mb-1">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- recharts payload entry */}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
        </p>
      ))}
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

const SectionCard = memo(function SectionCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-5 ${className}`}>
      <h2 className="text-[11px] uppercase tracking-widest text-gold-primary font-sans mb-ds-4">
        {title}
      </h2>
      {children}
    </div>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

const MarketPulse = memo(function MarketPulse() {
  const { data, isLoading, error } = useMarketBreadth();
  const marketStatus = useMarketStatus();

  // ── a. Header ──────────────────────────────────────────────────────────────
  const asOfLabel = data?.asOf
    ? `as of ${new Date(data.asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : data?.scannedAt
    ? `scanned ${new Date(data.scannedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : null;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-ink-primary flex items-center gap-2">
            <Activity className="w-7 h-7 text-gold-primary" aria-hidden="true" />
            Market Pulse
          </h1>
          {/* Inline market status badge (not fixed-position — embedded in header) */}
          {!marketStatus.isOpen && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border-ds-subtle bg-surface-1 text-ink-secondary">
              <Lock className="w-3 h-3 text-gold-primary" aria-hidden="true" />
              {marketStatus.status === 'closed-weekend' ? 'Markets Closed — Weekend' :
               marketStatus.status === 'closed-holiday' ? `Closed — ${marketStatus.holidayName ?? 'Holiday'}` :
               marketStatus.status === 'closed-after-hours' ? 'After Hours' : 'Pre-Market'}
              <span className="text-gold-primary">·</span>
              <span className="font-mono">Showing {marketStatus.lastTradingDayLabel}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-ink-secondary text-sm">Breadth · Flows · Sentiment</p>
          {asOfLabel && (
            <span className="text-[11px] font-mono text-ink-secondary tabular-nums">
              {asOfLabel}
              {data?.universe && (
                <span className="ml-2 text-ink-secondary opacity-60">
                  · {data.universe.label} ({data.universe.count.toLocaleString()} stocks)
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && <SectionSpinner />}

      {/* Error state */}
      {error && !isLoading && (
        <p className="text-num-negative text-sm py-8 text-center">
          Market Pulse data unavailable — please try again later.
        </p>
      )}

      {/* Content — render even if data is partial (null-safe throughout) */}
      {!isLoading && !error && (
        <>
          {/* ── b. Macro strip ─────────────────────────────────────────────── */}
          <SectionCard title="Macro">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-ds-3">
              <StatTile
                label="2s10s"
                value={data?.macro?.twos10s != null ? fmt(data.macro.twos10s, 0, 'bp') : '—'}
                valueClass={pctClass(data?.macro?.twos10s)}
              />
              <StatTile
                label="10Y Yield"
                value={data?.macro?.tenY != null ? fmt(data.macro.tenY, 2, '%') : '—'}
              />
              <StatTile
                label="DXY"
                value={data?.macro?.dxy != null ? fmt(data.macro.dxy, 1) : '—'}
              />
              <StatTile
                label="Crude (WTI)"
                value={data?.macro?.crude != null ? `$${fmt(data.macro.crude, 1)}` : '—'}
              />
              <StatTile
                label="Gold"
                value={data?.macro?.gold != null ? `$${fmt(data.macro.gold, 0)}` : '—'}
              />
              <StatTile
                label="VIX"
                value={data?.macro?.vix != null ? fmt(data.macro.vix, 1) : '—'}
                valueClass={data?.macro?.vix != null && data.macro.vix > 25 ? 'text-num-negative' : 'text-ink-primary'}
              />
            </div>
          </SectionCard>

          {/* ── c. Breadth row ─────────────────────────────────────────────── */}
          <SectionCard title="% of Stocks Above Moving Average">
            <div className="flex flex-col gap-ds-5">
              {/* Big numbers */}
              <div className="grid grid-cols-3 gap-ds-4">
                <BigStat
                  label="Above 20-DMA"
                  value={data?.breadth?.pctAbove?.ma20 != null ? `${Math.round(data.breadth.pctAbove.ma20)}%` : '—'}
                />
                <BigStat
                  label="Above 50-DMA"
                  value={data?.breadth?.pctAbove?.ma50 != null ? `${Math.round(data.breadth.pctAbove.ma50)}%` : '—'}
                />
                <BigStat
                  label="Above 200-DMA"
                  value={data?.breadth?.pctAbove?.ma200 != null ? `${Math.round(data.breadth.pctAbove.ma200)}%` : '—'}
                />
              </div>

              {/* History area chart */}
              {data?.breadth?.history && data.breadth.history.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.breadth.history}
                      margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="grad50" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C9A646" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#C9A646" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="grad200" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortDate}
                        tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                        formatter={(value: string) => (
                          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{value}</span>
                        )}
                      />
                      <Area
                        type="monotone"
                        dataKey="pctAbove50"
                        name="% Above 50-DMA"
                        stroke="#C9A646"
                        strokeWidth={1.5}
                        fill="url(#grad50)"
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="pctAbove200"
                        name="% Above 200-DMA"
                        stroke="rgba(255,255,255,0.55)"
                        strokeWidth={1.5}
                        fill="url(#grad200)"
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-ink-secondary text-sm">
                  No history data yet
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── d. A/D line + New Highs/Lows ───────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Advance / Decline line */}
            <SectionCard title="Advance / Decline Line">
              {data?.breadth?.history && data.breadth.history.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.breadth.history}
                      margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortDate}
                        tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) =>
                          v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                        }
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="adCumulative"
                        name="A/D Cumulative"
                        stroke="#C9A646"
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-ds-3 w-full">
                    <StatTile label="Advancers" value={data?.breadth?.advancers != null ? data.breadth.advancers.toLocaleString() : '—'} />
                    <StatTile label="Decliners" value={data?.breadth?.decliners != null ? data.breadth.decliners.toLocaleString() : '—'} />
                    <StatTile label="Unchanged" value={data?.breadth?.unchanged != null ? data.breadth.unchanged.toLocaleString() : '—'} />
                  </div>
                </div>
              )}
              {/* Show today's advancers/decliners below chart when we have both */}
              {data?.breadth?.history && data.breadth.history.length > 0 && data.breadth.advancers != null && (
                <div className="grid grid-cols-3 gap-ds-3 mt-ds-4">
                  <StatTile label="Advancers" value={data.breadth.advancers.toLocaleString()} />
                  <StatTile label="Decliners" value={data.breadth.decliners.toLocaleString()} />
                  <StatTile label="Unchanged" value={data.breadth.unchanged.toLocaleString()} />
                </div>
              )}
            </SectionCard>

            {/* New Highs vs New Lows */}
            <SectionCard title="New Highs vs New Lows">
              {data?.breadth?.history && data.breadth.history.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.breadth.history}
                      margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortDate}
                        tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                        formatter={(value: string) => (
                          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{value}</span>
                        )}
                      />
                      <Bar dataKey="newHighs" name="New Highs" fill="#C9A646" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="newLows" name="New Lows" fill="#E24B4A" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-ds-3 w-full">
                    <StatTile
                      label="New Highs (52w)"
                      value={data?.breadth?.newHighs != null ? data.breadth.newHighs.toLocaleString() : '—'}
                    />
                    <StatTile
                      label="New Lows (52w)"
                      value={data?.breadth?.newLows != null ? data.breadth.newLows.toLocaleString() : '—'}
                      valueClass={data?.breadth?.newLows != null && data.breadth.newLows > 0 ? 'text-num-negative' : 'text-ink-primary'}
                    />
                  </div>
                </div>
              )}
              {/* Show today's highs/lows below chart when we have both */}
              {data?.breadth?.history && data.breadth.history.length > 0 && data.breadth.newHighs != null && (
                <div className="grid grid-cols-2 gap-ds-3 mt-ds-4">
                  <StatTile label="New Highs (today)" value={data.breadth.newHighs.toLocaleString()} />
                  <StatTile
                    label="New Lows (today)"
                    value={data.breadth.newLows.toLocaleString()}
                    valueClass={data.breadth.newLows > 0 ? 'text-num-negative' : 'text-ink-primary'}
                  />
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── e. Sentiment panel ─────────────────────────────────────────── */}
          <SectionCard title="Sentiment">
            <div className="flex flex-col gap-ds-5">
              {/* Sentiment stat tiles row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-ds-3">
                <StatTile
                  label="VIX"
                  value={data?.sentiment?.vix != null ? fmt(data.sentiment.vix, 1) : '—'}
                  valueClass={data?.sentiment?.vix != null && data.sentiment.vix > 25 ? 'text-num-negative' : 'text-ink-primary'}
                />
                <StatTile
                  label="VIX Term Ratio"
                  value={data?.sentiment?.vixTermRatio != null ? fmt(data.sentiment.vixTermRatio, 2) : '—'}
                  sub={data?.sentiment?.vix3m != null ? `VIX3M ${fmt(data.sentiment.vix3m, 1)}` : undefined}
                />
                <StatTile
                  label="Put/Call Ratio"
                  value={data?.sentiment?.putCall != null ? fmt(data.sentiment.putCall, 2) : '—'}
                  valueClass={data?.sentiment?.putCall != null && data.sentiment.putCall > 1.2 ? 'text-num-negative' : 'text-ink-primary'}
                />
                <StatTile
                  label="HY Credit Spread"
                  value={data?.sentiment?.creditSpreadHY != null ? `${fmt(data.sentiment.creditSpreadHY, 0)}bp` : '—'}
                  valueClass={data?.sentiment?.creditSpreadHY != null && data.sentiment.creditSpreadHY > 400 ? 'text-num-negative' : 'text-ink-primary'}
                />
              </div>

              {/* Fear & Greed gauge */}
              {data?.sentiment?.fearGreed != null ? (
                <div className="flex justify-center pt-2">
                  <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-5 w-fit">
                    <p className="text-[10px] uppercase tracking-widest text-ink-secondary text-center mb-ds-3">
                      Fear &amp; Greed Index
                    </p>
                    <FearGreedGauge
                      score={data.sentiment.fearGreed.score}
                      label={data.sentiment.fearGreed.label}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center text-ink-secondary text-sm py-4">
                  Fear &amp; Greed data unavailable
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── f. Concentration panel ─────────────────────────────────────── */}
          <SectionCard title="Concentration &amp; Style">
            <div className="flex flex-col gap-ds-5">
              {/* Ratio tiles */}
              <div className="grid grid-cols-2 gap-ds-3">
                <StatTile
                  label="Growth / Value"
                  value={data?.concentration?.growthValue != null ? fmt(data.concentration.growthValue, 2) : '—'}
                  sub="IWF/IWD ratio"
                />
                <StatTile
                  label="Cyclical / Defensive"
                  value={data?.concentration?.cyclicalDefensive != null ? fmt(data.concentration.cyclicalDefensive, 2) : '—'}
                  sub="XLY+XLI vs XLU+XLP"
                />
              </div>

              {/* RSP/SPY line chart — breadth vs concentration */}
              {data?.concentration?.rspSpy && data.concentration.rspSpy.length > 0 ? (
                <>
                  <p className="text-[10px] uppercase tracking-widest text-ink-secondary">
                    RSP / SPY Ratio — Equal Weight vs Market-Cap Weight
                  </p>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={data.concentration.rspSpy}
                        margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={shortDate}
                          tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) => v.toFixed(2)}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name="RSP/SPY"
                          stroke="#C9A646"
                          strokeWidth={1.5}
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="text-ink-secondary text-sm text-center py-4">
                  RSP/SPY history not yet available
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── g. Fund flows placeholder ──────────────────────────────────── */}
          <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-5">
            <div className="flex items-center gap-2 mb-ds-3">
              <Lock className="w-4 h-4 text-ink-secondary" aria-hidden="true" />
              <h2 className="text-[11px] uppercase tracking-widest text-ink-secondary font-sans">
                Fund Flows
              </h2>
            </div>
            <p className="text-ink-secondary text-sm">
              ETF dollar-flow data (equity vs bond vs money-market) — premium data coming soon.
            </p>
            <p className="text-[11px] text-ink-secondary opacity-60 mt-ds-2">
              This module will show weekly net inflows/outflows across major asset class ETFs
              once the licensed data feed is connected.
            </p>
          </div>
        </>
      )}
    </div>
  );
});

export default MarketPulse;
