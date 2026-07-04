// src/pages/app/journal/backtest/components/ResultsSummary.tsx
// ============================================================================
// RESULTS SUMMARY — "The results" section.
// Headline + $-denominated equity curve + stat cards, all derived from the
// REAL trades the engine produced (result.trades: AutoPosition[]). The AI
// never touches these numbers — this is pure arithmetic over engine output.
//
// $ P&L model (futures):
//   pnl$ = (exitPrice - entryPrice) * dirSign * pointValue[symbol] * CONTRACTS
//   dirSign: +1 for 'long', -1 for 'short' (AutoPosition.type)
//   Net P&L = sum(pnl$); equity curve cumulates from ACCOUNT_SIZE.
//   Max DD$ = max peak-to-trough on that $ curve; % = DD$ / ACCOUNT_SIZE.
//
// Crypto fallback (no futures multiplier): pnl per 1 unit =
//   (exitPrice - entryPrice) * dirSign — reasonable, futures is the priority.
// ============================================================================

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
import { Card } from '@/components/ds/Card';
import { cn } from '@/lib/utils';
import {
  useAutoBacktestStore,
  selectAutoResult,
  selectAutoSetup,
} from '@/store/useAutoBacktestStore';
import type { AutoPosition } from '@/core/auto/signalToPosition';

// ---------------------------------------------------------------------------
// Simulation constants
// ---------------------------------------------------------------------------

const ACCOUNT_SIZE = 50_000;
const CONTRACTS = 1;

/** USD value of a 1.0-point move, per contract, for each supported futures symbol. */
const POINT_VALUE: Record<string, number> = {
  MNQ: 2,
  NQ: 20,
  MES: 5,
  ES: 50,
  MYM: 0.5,
  YM: 5,
  M2K: 5,
  RTY: 50,
  MGC: 10,
  GC: 100,
  SIL: 1000,
  SI: 5000,
  MCL: 100,
  CL: 1000,
};

const GREEN = '#4AD295';
const RED = '#E36363';

// ---------------------------------------------------------------------------
// $ P&L derivation
// ---------------------------------------------------------------------------

function dirSign(type: AutoPosition['type']): 1 | -1 {
  return type === 'long' ? 1 : -1;
}

/** Real dollar P&L for one closed trade, using the point-value map when the
 *  symbol is a known futures contract; otherwise a plain per-unit fallback
 *  (used for crypto pairs, which have no fixed contract multiplier here). */
function tradePnlUsd(trade: AutoPosition, symbol: string): number {
  if (trade.exitPrice == null || !Number.isFinite(trade.exitPrice)) return 0;
  const delta = trade.exitPrice - trade.entryPrice;
  const sign = dirSign(trade.type);
  const pointValue = POINT_VALUE[symbol.toUpperCase()];
  if (pointValue != null) {
    return delta * sign * pointValue * CONTRACTS;
  }
  // Crypto fallback: no futures multiplier, treat as 1 unit per contract.
  return delta * sign;
}

interface EquityPoint {
  time: number; // seconds, from the trade's exitTime
  balance: number;
}

interface DollarStats {
  netPnl: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  longCount: number;
  longWinRate: number;
  shortCount: number;
  shortWinRate: number;
  equityCurve: EquityPoint[];
}

function computeDollarStats(
  trades: AutoPosition[],
  symbol: string,
  engineWinRate: number,
  engineProfitFactor: number,
): DollarStats {
  let balance = ACCOUNT_SIZE;
  let peak = ACCOUNT_SIZE;
  let maxDrawdown = 0;
  const equityCurve: EquityPoint[] = [];

  let longCount = 0;
  let longWins = 0;
  let shortCount = 0;
  let shortWins = 0;
  let netPnl = 0;

  for (const trade of trades) {
    const pnl = tradePnlUsd(trade, symbol);
    netPnl += pnl;
    balance += pnl;
    peak = Math.max(peak, balance);
    maxDrawdown = Math.max(maxDrawdown, peak - balance);

    equityCurve.push({ time: trade.exitTime ?? trade.entryTime, balance });

    if (trade.type === 'long') {
      longCount++;
      if (pnl > 0) longWins++;
    } else {
      shortCount++;
      if (pnl > 0) shortWins++;
    }
  }

  return {
    netPnl,
    // Prefer the engine's ratio-based statistics (win rate / profit factor
    // are ratios, not $ amounts, so they don't need the point-value math).
    winRate: engineWinRate,
    profitFactor: engineProfitFactor,
    maxDrawdown,
    maxDrawdownPct: ACCOUNT_SIZE > 0 ? (maxDrawdown / ACCOUNT_SIZE) * 100 : 0,
    longCount,
    longWinRate: longCount > 0 ? (longWins / longCount) * 100 : 0,
    shortCount,
    shortWinRate: shortCount > 0 ? (shortWins / shortCount) * 100 : 0,
    equityCurve,
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function fmtUsd(n: number): string {
  const sign = n < 0 ? '−' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function fmtDateShort(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  subtext,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  subtext?: string;
  tone?: 'positive' | 'negative' | 'neutral';
}) {
  const toneClass =
    tone === 'positive' ? 'text-emerald-500' : tone === 'negative' ? 'text-num-negative' : 'text-ink-primary';
  return (
    <Card padding="compact" className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-[1px] text-ink-tertiary">{label}</span>
      <span className={cn('text-lg font-semibold tabular-nums', toneClass)}>{value}</span>
      {subtext && <span className="text-[11px] text-ink-tertiary">{subtext}</span>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResultsSummary() {
  const result = useAutoBacktestStore(selectAutoResult);
  const setup = useAutoBacktestStore(selectAutoSetup);
  const from = useAutoBacktestStore((s) => s.from);
  const to = useAutoBacktestStore((s) => s.to);

  const symbol = setup.instrument.symbol;
  const timeframe = setup.instrument.timeframe;

  const stats = useMemo(() => {
    if (!result) return null;
    const engineStats = result.statistics as Record<string, unknown>;
    const engineWinRate =
      typeof engineStats.winRate === 'number' && Number.isFinite(engineStats.winRate)
        ? engineStats.winRate
        : 0;
    const engineProfitFactor =
      typeof engineStats.profitFactor === 'number' && Number.isFinite(engineStats.profitFactor)
        ? engineStats.profitFactor
        : 0;
    return computeDollarStats(result.trades, symbol, engineWinRate, engineProfitFactor);
  }, [result, symbol]);

  const chartData = useMemo(() => {
    if (!stats) return [];
    const mapped = stats.equityCurve.map((p) => ({
      date: new Date(p.time * 1000).toISOString(),
      value: p.balance,
    }));
    return [{ date: new Date(from).toISOString(), value: ACCOUNT_SIZE }, ...mapped];
  }, [stats, from]);

  const { minValue, maxValue } = useMemo(() => {
    const values = chartData.map((d) => d.value);
    return {
      minValue: Math.min(ACCOUNT_SIZE, ...values, ACCOUNT_SIZE),
      maxValue: Math.max(ACCOUNT_SIZE, ...values, ACCOUNT_SIZE),
    };
  }, [chartData]);

  if (!result || !stats) return null;

  const tradeCount = result.trades.length;
  const dateRangeLabel = `${fmtDateShort(from)} – ${fmtDateShort(to)}`;
  const isPos = stats.netPnl >= 0;
  const accent = isPos ? GREEN : RED;
  const hasCurve = chartData.length > 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Headline */}
      <div>
        <h2 className="text-xl font-bold text-gold-primary sm:text-2xl">The results</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          $50,000 account, {dateRangeLabel}. {tradeCount.toLocaleString()}{' '}
          {tradeCount === 1 ? 'trade' : 'trades'} — here&apos;s how it held up.
        </p>
      </div>

      {/* Equity curve — green area, $-denominated */}
      <Card padding="default">
        {hasCurve ? (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="resultsEquityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                  <stop offset="60%" stopColor={accent} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                stroke="#666666"
                tick={{ fill: '#888888', fontSize: 11 }}
                tickLine={false}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                minTickGap={48}
              />
              <YAxis
                stroke="#666666"
                tick={{ fill: '#888888', fontSize: 11 }}
                tickLine={false}
                width={56}
                domain={[Math.floor(minValue * 0.99), Math.ceil(maxValue * 1.01)]}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161616',
                  border: '1px solid rgba(74,210,149,0.25)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                }}
                labelFormatter={(v) => new Date(v as string).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                labelStyle={{ color: '#F4F4F4', marginBottom: 4, fontWeight: 600 }}
                itemStyle={{ color: accent }}
                formatter={(value: number) => [fmtUsd(value), 'Balance']}
              />
              <ReferenceLine y={ACCOUNT_SIZE} stroke="#7AB6F4" strokeDasharray="5 5" strokeOpacity={0.45} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={accent}
                strokeWidth={2.6}
                fill="url(#resultsEquityGradient)"
                dot={false}
                activeDot={{ r: 5, fill: accent, stroke: '#0A0A0A', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[200px] w-full items-center justify-center rounded-xl border-[0.5px] border-border-ds-subtle bg-surface-1">
            <p className="text-sm text-ink-tertiary">
              No trades were executed for this setup and range.
            </p>
          </div>
        )}
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Net P&L"
          value={fmtUsd(stats.netPnl)}
          tone={stats.netPnl > 0 ? 'positive' : stats.netPnl < 0 ? 'negative' : 'neutral'}
        />
        <StatCard
          label="Win rate"
          value={`${stats.winRate.toFixed(1)}%`}
          tone={stats.winRate >= 50 ? 'positive' : 'neutral'}
        />
        <StatCard
          label="Profit factor"
          value={stats.profitFactor.toFixed(2)}
          tone={stats.profitFactor >= 1 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Max drawdown"
          value={fmtUsd(-stats.maxDrawdown)}
          subtext={`−${stats.maxDrawdownPct.toFixed(1)}% of starting balance`}
          tone="negative"
        />
        <StatCard
          label="Long trades"
          value={stats.longCount.toLocaleString()}
          subtext={`${stats.longWinRate.toFixed(0)}% win rate`}
        />
        <StatCard
          label="Short trades"
          value={stats.shortCount.toLocaleString()}
          subtext={`${stats.shortWinRate.toFixed(0)}% win rate`}
        />
      </div>

      {/* Disclosure */}
      <p className="text-[12px] text-ink-tertiary">
        Simulated on a $50,000 account, 1 contract — {symbol} {timeframe}.
      </p>
    </div>
  );
}

export default ResultsSummary;
