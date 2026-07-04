/**
 * PnlHeroChart — the hero "what-if" P&L visualization for the Auto Backtest.
 *
 * Replaces the dense stat-card grid with one impressive gold equity-area chart
 * ("what would have happened if you'd traded this setup") plus a compact strip
 * of the key headline metrics. Reads the run from the store, same as the other
 * result components.
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import dayjs from 'dayjs';
import {
  useAutoBacktestStore,
  selectAutoResult,
  selectAutoSetup,
} from '@/store/useAutoBacktestStore';

const GOLD = '#C9A646';
const GREEN = '#4AD295';
const RED = '#E36363';

function fmtUsd(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** Win rate / drawdown may be stored 0–1 or 0–100; normalise to a percent. */
function asPercent(v: number | undefined): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return v <= 1 && v >= -1 ? v * 100 : v;
}

interface Metric {
  label: string;
  value: string;
  tone?: 'pos' | 'neg' | 'neutral';
}

export function PnlHeroChart() {
  const result = useAutoBacktestStore(selectAutoResult);
  const setup = useAutoBacktestStore(selectAutoSetup);

  const initialCapital = setup.risk.initialBalance;

  const chartData = useMemo(() => {
    if (!result) return [];
    const mapped = result.equityCurve.map((p) => ({
      date: dayjs(new Date(p.time * 1000)).format('MMM DD'),
      value: p.equity,
    }));
    // Baseline point so the curve starts at the starting capital.
    return [{ date: 'Start', value: initialCapital }, ...mapped];
  }, [result, initialCapital]);

  // All hooks must run before any early return (Rules of Hooks).
  const { minValue, maxValue } = useMemo(() => {
    const values = chartData.map((d) => d.value);
    return {
      minValue: Math.min(initialCapital, ...values, initialCapital),
      maxValue: Math.max(initialCapital, ...values, initialCapital),
    };
  }, [chartData, initialCapital]);

  if (!result) return null;

  const stats = result.statistics as Record<string, number>;
  const netPnl = Number(stats.totalPnl ?? 0);
  const isPos = netPnl >= 0;
  const accent = isPos ? GOLD : RED;

  const finalValue = chartData.length ? chartData[chartData.length - 1].value : initialCapital;
  const returnPct = initialCapital > 0 ? (netPnl / initialCapital) * 100 : 0;

  const metrics: Metric[] = [
    { label: 'Win Rate', value: `${asPercent(stats.winRate).toFixed(1)}%`, tone: 'neutral' },
    { label: 'Trades', value: `${Number(stats.totalTrades ?? 0)}`, tone: 'neutral' },
    {
      label: 'Profit Factor',
      value: Number.isFinite(stats.profitFactor) ? Number(stats.profitFactor).toFixed(2) : '—',
      tone: Number(stats.profitFactor) >= 1 ? 'pos' : 'neg',
    },
    {
      label: 'Expectancy',
      value: fmtUsd(Number(stats.expectancy ?? 0)),
      tone: Number(stats.expectancy ?? 0) >= 0 ? 'pos' : 'neg',
    },
    { label: 'Max Drawdown', value: `${asPercent(stats.maxDrawdownPercent).toFixed(1)}%`, tone: 'neg' },
    {
      label: 'Sharpe',
      value: Number.isFinite(stats.sharpeRatio) ? Number(stats.sharpeRatio).toFixed(2) : '—',
      tone: 'neutral',
    },
  ];

  const hasCurve = chartData.length > 1;

  return (
    <div
      className="rounded-2xl border p-6 shadow-lg"
      style={{
        borderColor: 'rgba(201,166,70,0.18)',
        background: 'linear-gradient(135deg, rgba(22,20,14,0.96) 0%, rgba(12,12,12,0.96) 100%)',
      }}
    >
      {/* Headline */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
            What if you had traded this setup
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <span
              className="text-3xl font-bold sm:text-4xl"
              style={{ color: accent }}
            >
              {isPos ? '+' : ''}
              {fmtUsd(netPnl)}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: isPos ? GREEN : RED }}
            >
              {isPos ? '+' : ''}
              {returnPct.toFixed(1)}%
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-tertiary">
            {Number(stats.totalTrades ?? 0)} trades · {asPercent(stats.winRate).toFixed(1)}% win
            rate · {setup.instrument.symbol} {setup.instrument.timeframe}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-ink-tertiary">Final balance</div>
          <div
            className="text-xl font-bold"
            style={{ color: finalValue >= initialCapital ? GREEN : RED }}
          >
            {fmtUsd(finalValue)}
          </div>
          <div className="text-[11px] text-ink-tertiary">from {fmtUsd(initialCapital)}</div>
        </div>
      </div>

      {/* Hero area chart */}
      {hasCurve ? (
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id="pnlHeroGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.42} />
                <stop offset="55%" stopColor={accent} stopOpacity={0.12} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
              <filter id="pnlHeroGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              stroke="#666666"
              tick={{ fill: '#888888', fontSize: 11 }}
              tickLine={false}
              minTickGap={48}
            />
            <YAxis
              stroke="#666666"
              tick={{ fill: '#888888', fontSize: 11 }}
              tickLine={false}
              width={52}
              domain={[Math.floor(minValue * 0.99), Math.ceil(maxValue * 1.01)]}
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161616',
                border: '1px solid rgba(201,166,70,0.25)',
                borderRadius: '12px',
                padding: '10px 12px',
              }}
              labelStyle={{ color: '#F4F4F4', marginBottom: 4, fontWeight: 600 }}
              itemStyle={{ color: accent }}
              formatter={(value: number) => [fmtUsd(value), 'Balance']}
            />
            <ReferenceLine
              y={initialCapital}
              stroke="#7AB6F4"
              strokeDasharray="5 5"
              strokeOpacity={0.45}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={accent}
              strokeWidth={2.6}
              fill="url(#pnlHeroGradient)"
              filter="url(#pnlHeroGlow)"
              dot={false}
              activeDot={{ r: 5, fill: accent, stroke: '#0A0A0A', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[200px] w-full items-center justify-center rounded-xl border-[0.5px] border-border-ds-subtle bg-surface-1">
          <p className="text-sm text-ink-tertiary">
            No trades for this setup and range — adjust the setup and run again.
          </p>
        </div>
      )}

      {/* Compact key-metrics strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border-[0.5px] border-border-ds-subtle bg-surface-1 px-3 py-2.5"
          >
            <div className="text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
              {m.label}
            </div>
            <div
              className="mt-0.5 text-base font-semibold"
              style={{
                color: m.tone === 'pos' ? GREEN : m.tone === 'neg' ? RED : '#F4F4F4',
              }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PnlHeroChart;
