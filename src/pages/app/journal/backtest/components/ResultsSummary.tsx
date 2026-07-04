// src/pages/app/journal/backtest/components/ResultsSummary.tsx
// ============================================================================
// RESULTS SUMMARY — "The results" section (HONEST, R-ladder-driven).
//
// WHY THIS EXISTS (honesty fix)
// ------------------------------
// The engine fills market/limit orders at (or after) the NEXT bar's open,
// which can gap past a take-profit level that was priced off the signal's
// PRE-FILL reference entry. That can record a "win" whose real fill sat on
// the losing side of the actual market path -- an equity curve that only
// declines while individual trades say "take profit". Instead of trusting
// the engine's own exit bookkeeping, this component drives EVERY number here
// (headline P&L, equity curve, all 6 stat cards) from the fill-anchored
// R-ladder (`core/auto/rLadderAnalysis.ts`): for each REAL trade's actual
// fill (entryPrice/stopLoss/direction), re-simulate fixed reward:risk targets
// against the REAL candles and score wins/losses off that, not off the
// engine's own take-profit/stop-loss exit reason.
//
// FIXED-RISK MODEL
// -----------------
//   ACCOUNT = $50,000, RISK_PCT = 1% -> riskPerTrade = $500 per trade.
//   At a selected reward:risk R: resolved trade pnl = win ? +R*500 : -500.
//   'open' trades (never resolved within available candle history) are
//   EXCLUDED from every stat and reported as a footnote count.
//   Equity curve = cumulative from $50,000, trades sorted by entryTime.
//   Max drawdown = max peak-to-trough on that cumulative curve.
// ============================================================================

import { useMemo, useState } from 'react';
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
import { R_LADDER_LEVELS } from '@/core/auto/AutoBacktestEngine';

// ---------------------------------------------------------------------------
// Simulation constants (fixed-risk model)
// ---------------------------------------------------------------------------

const ACCOUNT_SIZE = 50_000;
const RISK_PCT = 1; // 1% of account risked per trade
const RISK_PER_TRADE = (ACCOUNT_SIZE * RISK_PCT) / 100; // $500

const DEFAULT_R = 2;

const GREEN = '#4AD295';
const RED = '#E36363';

// ---------------------------------------------------------------------------
// Fixed-risk R-ladder derivation
// ---------------------------------------------------------------------------

interface EquityPoint {
  time: number; // seconds, from the trade's entryTime
  balance: number;
}

interface RRow {
  r: number;
  trades: number; // resolved (win+loss) trade count
  winRate: number; // 0-100
  netPnl: number; // $
  expectancy: number; // avg R per resolved trade
}

interface SelectedRStats {
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
  openCount: number;
  resolvedCount: number;
}

/** Trades sorted by entryTime, oldest first — shared ordering for equity/DD. */
function sortedByEntry(trades: AutoPosition[]): AutoPosition[] {
  return [...trades].sort((a, b) => a.entryTime - b.entryTime);
}

/** Per-trade pnl at a given R under the fixed-risk model. `null` if 'open'. */
function tradePnlAtR(trade: AutoPosition, r: number): number | null {
  const outcome = trade.rLadder?.[r];
  if (outcome === 'win') return r * RISK_PER_TRADE;
  if (outcome === 'loss') return -RISK_PER_TRADE;
  return null; // 'open' or missing -> excluded
}

/** Full stat set for the currently-selected R, computed from the R-ladder. */
function computeSelectedRStats(trades: AutoPosition[], r: number): SelectedRStats {
  const ordered = sortedByEntry(trades);

  let balance = ACCOUNT_SIZE;
  let peak = ACCOUNT_SIZE;
  let maxDrawdown = 0;
  const equityCurve: EquityPoint[] = [];

  let grossWin = 0;
  let grossLoss = 0;
  let wins = 0;
  let openCount = 0;

  let longCount = 0;
  let longWins = 0;
  let longResolved = 0;
  let shortCount = 0;
  let shortWins = 0;
  let shortResolved = 0;

  for (const trade of ordered) {
    const pnl = tradePnlAtR(trade, r);
    if (pnl === null) {
      openCount++;
      continue;
    }

    balance += pnl;
    peak = Math.max(peak, balance);
    maxDrawdown = Math.max(maxDrawdown, peak - balance);
    equityCurve.push({ time: trade.entryTime, balance });

    if (pnl > 0) {
      grossWin += pnl;
      wins++;
    } else {
      grossLoss += Math.abs(pnl);
    }

    if (trade.type === 'long') {
      longCount++;
      longResolved++;
      if (pnl > 0) longWins++;
    } else {
      shortCount++;
      shortResolved++;
      if (pnl > 0) shortWins++;
    }
  }

  const resolvedCount = ordered.length - openCount;
  const netPnl = grossWin - grossLoss;

  return {
    netPnl,
    winRate: resolvedCount > 0 ? (wins / resolvedCount) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    maxDrawdown,
    maxDrawdownPct: ACCOUNT_SIZE > 0 ? (maxDrawdown / ACCOUNT_SIZE) * 100 : 0,
    longCount,
    longWinRate: longResolved > 0 ? (longWins / longResolved) * 100 : 0,
    shortCount,
    shortWinRate: shortResolved > 0 ? (shortWins / shortResolved) * 100 : 0,
    equityCurve,
    openCount,
    resolvedCount,
  };
}

/** The R:R what-if table rows — one per R_LADDER_LEVELS entry. */
function computeRRows(trades: AutoPosition[]): RRow[] {
  return R_LADDER_LEVELS.map((r) => {
    let wins = 0;
    let losses = 0;
    let netR = 0;
    let netPnl = 0;

    for (const trade of trades) {
      const outcome = trade.rLadder?.[r];
      if (outcome === 'win') {
        wins++;
        netR += r;
        netPnl += r * RISK_PER_TRADE;
      } else if (outcome === 'loss') {
        losses++;
        netR -= 1;
        netPnl -= RISK_PER_TRADE;
      }
    }

    const resolved = wins + losses;
    return {
      r,
      trades: resolved,
      winRate: resolved > 0 ? (wins / resolved) * 100 : 0,
      netPnl,
      expectancy: resolved > 0 ? netR / resolved : 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function fmtUsd(n: number): string {
  if (!Number.isFinite(n)) return n > 0 ? '+$∞' : '$0';
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
// R:R selector
// ---------------------------------------------------------------------------

function RSelector({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (r: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[1px] text-ink-tertiary">
        Reward : Risk
      </span>
      <div className="flex flex-wrap gap-1.5">
        {R_LADDER_LEVELS.map((r) => {
          const isSelected = r === selected;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onSelect(r)}
              className={cn(
                'rounded-lg border-[0.5px] px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors',
                isSelected
                  ? 'border-gold-primary bg-gold-primary/15 text-gold-primary'
                  : 'border-border-ds-subtle bg-surface-1 text-ink-secondary hover:border-gold-primary/40 hover:text-ink-primary',
              )}
            >
              {r}:1
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// R:R what-if table
// ---------------------------------------------------------------------------

function RLadderTable({
  rows,
  selected,
  onSelect,
}: {
  rows: RRow[];
  selected: number;
  onSelect: (r: number) => void;
}) {
  return (
    <Card padding="default">
      <h3 className="text-sm font-semibold text-ink-primary">Reward : Risk — what-if</h3>
      <p className="mt-0.5 text-[12px] text-ink-tertiary">
        Same real trades, re-scored at each fixed reward:risk target against real candles.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-ds-subtle text-left text-[11px] uppercase tracking-[0.5px] text-ink-tertiary">
              <th className="py-2 pr-4 font-medium">R:R</th>
              <th className="py-2 pr-4 font-medium">Trades</th>
              <th className="py-2 pr-4 font-medium">Win Rate</th>
              <th className="py-2 pr-4 font-medium">Net P&amp;L</th>
              <th className="py-2 pr-4 font-medium">Expectancy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = row.r === selected;
              const pnlTone = row.netPnl > 0 ? GREEN : row.netPnl < 0 ? RED : undefined;
              return (
                <tr
                  key={row.r}
                  onClick={() => onSelect(row.r)}
                  className={cn(
                    'cursor-pointer border-b border-border-ds-subtle/60 transition-colors last:border-b-0',
                    isSelected ? 'bg-gold-primary/10' : 'hover:bg-surface-1',
                  )}
                >
                  <td className="py-2.5 pr-4 font-semibold tabular-nums text-ink-primary">
                    {isSelected && <span className="mr-1.5 text-gold-primary">●</span>}
                    {row.r}:1
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-ink-secondary">{row.trades}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-ink-secondary">{row.winRate.toFixed(1)}%</td>
                  <td className="py-2.5 pr-4 font-semibold tabular-nums" style={{ color: pnlTone }}>
                    {fmtUsd(row.netPnl)}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-ink-secondary">{row.expectancy.toFixed(2)}R</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

  const [selectedR, setSelectedR] = useState<number>(DEFAULT_R);

  const symbol = setup.instrument.symbol;
  const timeframe = setup.instrument.timeframe;

  const stats = useMemo(() => {
    if (!result) return null;
    return computeSelectedRStats(result.trades, selectedR);
  }, [result, selectedR]);

  const rRows = useMemo(() => {
    if (!result) return [];
    return computeRRows(result.trades);
  }, [result]);

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

  const dateRangeLabel = `${fmtDateShort(from)} – ${fmtDateShort(to)}`;
  const isPos = stats.netPnl >= 0;
  const accent = isPos ? GREEN : RED;
  const hasCurve = chartData.length > 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Headline */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gold-primary sm:text-2xl">The results</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            $50,000 account, {dateRangeLabel}. {stats.resolvedCount.toLocaleString()}{' '}
            {stats.resolvedCount === 1 ? 'trade' : 'trades'} at {selectedR}:1 reward:risk.
          </p>
        </div>
        <RSelector selected={selectedR} onSelect={setSelectedR} />
      </div>

      {/* Equity curve — green/red area, $-denominated, from the R-ladder */}
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
              No trades resolved for this setup and range at {selectedR}:1.
            </p>
          </div>
        )}
      </Card>

      {/* Stat cards — driven entirely by the selected-R fill-anchored R-ladder */}
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
          value={Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}
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

      {/* R:R what-if table */}
      <RLadderTable rows={rRows} selected={selectedR} onSelect={setSelectedR} />

      {/* Disclosure */}
      <p className="text-[12px] text-ink-tertiary">
        Simulated on a $50,000 account risking 1% per trade at {selectedR}:1 reward:risk —{' '}
        {symbol} {timeframe}. {stats.openCount} trades never resolved (excluded).
      </p>
    </div>
  );
}

export default ResultsSummary;
