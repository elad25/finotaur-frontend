// src/pages/app/journal/backtest/components/ResultsSummary.tsx
// ============================================================================
// RESULTS SUMMARY — "The results" section, driven by StatisticsEngine.
//
// The headline (stat cards, equity curve, monthly P&L, risk/return row,
// direction breakdown, R-multiple distribution) is driven by the run's REAL
// statistics (`result.statistics`, produced by `StatisticsEngine.calculate`
// against the user's actual configured `initialBalance` / `riskPerTradePct`)
// and the run's real closed trades (`result.trades`) — NOT a fixed
// $50,000/1% recompute.
//
// The R:R what-if ladder (fixed $50,000 / 1% risk, fill-anchored re-scoring
// of each real trade's actual fill against real candles at fixed
// reward:risk targets via `core/auto/rLadderAnalysis.ts`) remains as a
// secondary, clearly-labeled normalization tool below the real-stats
// sections — useful for comparing "what if I'd used a different R target",
// not for reporting what actually happened.
// ============================================================================

import { useCallback, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { cn } from '@/lib/utils';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import {
  useAutoBacktestStore,
  selectAutoResult,
  selectAutoSetup,
  selectAutoRunId,
} from '@/store/useAutoBacktestStore';
import type { AutoPosition } from '@/core/auto/signalToPosition';
import {
  R_LADDER_LEVELS,
  type BacktestStatisticsLike,
  type RMultipleDistribution,
} from '@/core/auto/AutoBacktestEngine';
import { saveAutoBacktestTradesToJournal } from '@/lib/backtest/autoJournaling';

// ---------------------------------------------------------------------------
// Secondary R:R what-if model constants (fixed-risk normalization only)
// ---------------------------------------------------------------------------

const WHATIF_ACCOUNT_SIZE = 50_000;
const WHATIF_RISK_PCT = 1; // 1% of account risked per trade
const WHATIF_RISK_PER_TRADE = (WHATIF_ACCOUNT_SIZE * WHATIF_RISK_PCT) / 100; // $500
const DEFAULT_R = 2;

const GREEN = '#4AD295';
const RED = '#E36363';

// ---------------------------------------------------------------------------
// Real-statistics helpers
// ---------------------------------------------------------------------------

/** Read a numeric field off the loose `BacktestStatisticsLike` (index-signature) type. */
function num(stats: BacktestStatisticsLike, key: string): number {
  const v = stats[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

interface DirectionBreakdown {
  longCount: number;
  longWinRate: number;
  shortCount: number;
  shortWinRate: number;
}

/** Long/short trade counts + win rate from the REAL closed trades (realizedPnl-based). */
function computeDirectionBreakdown(trades: AutoPosition[]): DirectionBreakdown {
  let longCount = 0;
  let longWins = 0;
  let longResolved = 0;
  let shortCount = 0;
  let shortWins = 0;
  let shortResolved = 0;

  for (const trade of trades) {
    if (trade.realizedPnl === undefined) continue;
    const win = trade.realizedPnl > 0;
    if (trade.type === 'long') {
      longCount++;
      longResolved++;
      if (win) longWins++;
    } else {
      shortCount++;
      shortResolved++;
      if (win) shortWins++;
    }
  }

  return {
    longCount,
    longWinRate: longResolved > 0 ? (longWins / longResolved) * 100 : 0,
    shortCount,
    shortWinRate: shortResolved > 0 ? (shortWins / shortResolved) * 100 : 0,
  };
}

interface MonthlyPnlPoint {
  month: string; // "YYYY-MM"
  label: string; // "Jan '24"
  pnl: number;
}

/** Monthly P&L, grouped by REAL trade exit month (realizedPnl). */
function computeMonthlyPnl(trades: AutoPosition[]): MonthlyPnlPoint[] {
  const byMonth = new Map<string, number>();

  for (const trade of trades) {
    if (trade.realizedPnl === undefined || trade.exitTime === undefined) continue;
    const date = new Date(trade.exitTime * 1000);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + trade.realizedPnl);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pnl]) => ({
      month,
      label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      }),
      pnl,
    }));
}

// ---------------------------------------------------------------------------
// Secondary R:R what-if model (fixed $50k / 1% risk)
// ---------------------------------------------------------------------------

interface RRow {
  r: number;
  trades: number; // resolved (win+loss) trade count
  winRate: number; // 0-100
  netPnl: number; // $
  expectancy: number; // avg R per resolved trade
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
        netPnl += r * WHATIF_RISK_PER_TRADE;
      } else if (outcome === 'loss') {
        losses++;
        netR -= 1;
        netPnl -= WHATIF_RISK_PER_TRADE;
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

function fmtRatio(n: number): string {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '0.00';
  return n.toFixed(2);
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
// R:R selector (secondary section)
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
        Risk : Reward
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
              1:{r}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// R:R what-if table (secondary section)
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
      <h3 className="text-sm font-semibold text-ink-primary">
        Risk:Reward What-If (normalized $50k / 1% risk)
      </h3>
      <p className="mt-0.5 text-[12px] text-ink-tertiary">
        Same real trades, re-scored at each fixed risk:reward target against real candles — a
        normalization tool, not the actual account result above.
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
                    1:{row.r}
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
// Monthly P&L bar chart
// ---------------------------------------------------------------------------

function MonthlyPnlChart({ data }: { data: MonthlyPnlPoint[] }) {
  return (
    <Card padding="default">
      <h3 className="text-sm font-semibold text-ink-primary">Monthly P&amp;L</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 16, right: 8, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#666666"
              tick={{ fill: '#888888', fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              stroke="#666666"
              tick={{ fill: '#888888', fontSize: 11 }}
              tickLine={false}
              width={56}
              tickFormatter={(v) => fmtUsd(v)}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161616',
                border: '1px solid rgba(74,210,149,0.25)',
                borderRadius: '12px',
                padding: '10px 12px',
              }}
              labelStyle={{ color: '#F4F4F4', marginBottom: 4, fontWeight: 600 }}
              formatter={(value: number) => [fmtUsd(value), 'P&L']}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="pnl" radius={[4, 4, 4, 4]} maxBarSize={40}>
              {data.map((point) => (
                <Cell key={point.month} fill={point.pnl >= 0 ? GREEN : RED} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="mt-4 flex h-[120px] w-full items-center justify-center rounded-xl border-[0.5px] border-border-ds-subtle bg-surface-1">
          <p className="text-sm text-ink-tertiary">No closed trades to break down by month.</p>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// R-multiple distribution bars
// ---------------------------------------------------------------------------

const R_BUCKET_ORDER: ReadonlyArray<keyof RMultipleDistribution> = [
  '< -2R',
  '-2R to -1R',
  '-1R to 0R',
  '0R to 1R',
  '1R to 2R',
  '2R to 3R',
  '> 3R',
];

function RDistributionChart({ dist }: { dist: RMultipleDistribution }) {
  const max = Math.max(1, ...R_BUCKET_ORDER.map((k) => dist[k]));
  const total = R_BUCKET_ORDER.reduce((s, k) => s + dist[k], 0);
  if (total === 0) return null;

  return (
    <Card padding="default">
      <h3 className="mb-4 text-sm font-semibold text-ink-primary">R-multiple distribution</h3>
      <div className="flex h-32 items-end gap-2">
        {R_BUCKET_ORDER.map((bucket) => {
          const count = dist[bucket];
          const positive =
            bucket.startsWith('0R') ||
            bucket.startsWith('1R') ||
            bucket.startsWith('2R') ||
            bucket.startsWith('>');
          return (
            <div key={bucket} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[11px] tabular-nums text-ink-secondary">{count}</span>
              <div
                className={cn(
                  'w-full rounded-t-sm',
                  positive ? 'bg-gold-primary' : 'bg-num-negative',
                )}
                style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? 4 : 0 }}
                aria-hidden
              />
              <span className="text-center text-[10px] leading-tight text-ink-tertiary">
                {bucket}
              </span>
            </div>
          );
        })}
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
  const runId = useAutoBacktestStore(selectAutoRunId);
  const from = useAutoBacktestStore((s) => s.from);
  const to = useAutoBacktestStore((s) => s.to);
  const { id: userId } = useEffectiveUser();

  const [selectedR, setSelectedR] = useState<number>(DEFAULT_R);
  const [isSaving, setIsSaving] = useState(false);

  const closedTrades = useMemo(
    () => (result?.trades ?? []).filter((t) => t.exitPrice != null && t.status === 'closed'),
    [result],
  );

  const handleSaveToJournal = useCallback(async () => {
    if (!userId) {
      toast.error('Sign in to save trades to your journal');
      return;
    }
    if (!runId || closedTrades.length === 0) {
      toast.info('No closed trades to save yet');
      return;
    }
    setIsSaving(true);
    try {
      const res = await saveAutoBacktestTradesToJournal(
        { trades: closedTrades, setup, runId },
        userId,
      );
      if (res.errors > 0) {
        const total = res.saved + res.errors;
        toast.error(`Failed to save ${res.errors} of ${total} trades`, {
          action: {
            label: 'Retry',
            onClick: () => void handleSaveToJournal(),
          },
        });
      } else {
        toast.success(`${res.saved} trade${res.saved === 1 ? '' : 's'} saved to journal`);
      }
    } catch {
      toast.error('Failed to save trades to journal');
    } finally {
      setIsSaving(false);
    }
  }, [userId, runId, closedTrades, setup]);

  const symbol = setup.instrument.symbol;
  const timeframe = setup.instrument.timeframe;
  const initialBalance = setup.risk.initialBalance;

  const stats = result?.statistics ?? null;

  const directionBreakdown = useMemo(() => {
    if (!result) return null;
    return computeDirectionBreakdown(result.trades);
  }, [result]);

  const monthlyPnl = useMemo(() => {
    if (!result) return [];
    return computeMonthlyPnl(result.trades);
  }, [result]);

  const rRows = useMemo(() => {
    if (!result) return [];
    return computeRRows(result.trades);
  }, [result]);

  // Real equity curve, from the engine's own StatisticsEngine output — reflects
  // the configured account size / risk %, not the fixed $50k/1% what-if model.
  const chartData = useMemo(() => {
    if (!stats?.equityCurve) return [];
    return stats.equityCurve.map((p) => ({
      date: new Date(p.time * 1000).toISOString(),
      value: p.balance,
    }));
  }, [stats]);

  const { minValue, maxValue } = useMemo(() => {
    const values = chartData.map((d) => d.value);
    return {
      minValue: Math.min(initialBalance, ...values, initialBalance),
      maxValue: Math.max(initialBalance, ...values, initialBalance),
    };
  }, [chartData, initialBalance]);

  if (!result || !stats || !directionBreakdown) return null;

  const dateRangeLabel = `${fmtDateShort(from)} – ${fmtDateShort(to)}`;
  const totalPnl = num(stats, 'totalPnl');
  const totalTrades = num(stats, 'totalTrades');
  const winRate = num(stats, 'winRate');
  const profitFactor = num(stats, 'profitFactor');
  const avgWin = num(stats, 'avgWin');
  const avgLoss = num(stats, 'avgLoss');
  const expectancy = num(stats, 'expectancy');
  const sharpeRatio = num(stats, 'sharpeRatio');
  const sortinoRatio = num(stats, 'sortinoRatio');
  const calmarRatio = num(stats, 'calmarRatio');
  const maxDrawdown = num(stats, 'maxDrawdown');
  const maxDrawdownPercent = num(stats, 'maxDrawdownPercent');

  const isPos = totalPnl >= 0;
  const accent = isPos ? GREEN : RED;
  const hasCurve = chartData.length > 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Headline */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gold-primary sm:text-2xl">The results</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            ${initialBalance.toLocaleString('en-US')} account, risking{' '}
            {setup.risk.riskPerTradePct}% per trade, {dateRangeLabel}. {totalTrades.toLocaleString()}{' '}
            {totalTrades === 1 ? 'trade' : 'trades'}.
          </p>
        </div>
        <Button
          type="button"
          variant="goldOutline"
          size="compact"
          showArrow={false}
          onClick={handleSaveToJournal}
          disabled={isSaving || !userId || closedTrades.length === 0}
        >
          <Save size={13} />
          {isSaving ? 'Saving…' : 'Save trades to journal'}
        </Button>
      </div>

      {/* Stat cards — real run statistics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Win rate"
          value={`${winRate.toFixed(1)}%`}
          tone={winRate >= 50 ? 'positive' : 'neutral'}
        />
        <StatCard
          label="Profit factor"
          value={Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : '∞'}
          tone={profitFactor >= 1 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Net P&L"
          value={fmtUsd(totalPnl)}
          tone={totalPnl > 0 ? 'positive' : totalPnl < 0 ? 'negative' : 'neutral'}
        />
        <StatCard label="Total trades" value={totalTrades.toLocaleString('en-US')} />
        <StatCard
          label="Avg win / loss"
          value={fmtUsd(avgWin)}
          subtext={`vs ${fmtUsd(-avgLoss)}`}
        />
        <StatCard
          label="Expectancy"
          value={fmtUsd(expectancy)}
          tone={expectancy > 0 ? 'positive' : expectancy < 0 ? 'negative' : 'neutral'}
        />
      </div>

      {/* Equity curve — real balance, from StatisticsEngine */}
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
              <ReferenceLine y={initialBalance} stroke="#7AB6F4" strokeDasharray="5 5" strokeOpacity={0.45} />
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
            <p className="text-sm text-ink-tertiary">No trades resolved for this setup and range.</p>
          </div>
        )}
      </Card>

      {/* Monthly P&L */}
      <MonthlyPnlChart data={monthlyPnl} />

      {/* Risk & Return */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Sharpe ratio"
          value={fmtRatio(sharpeRatio)}
          tone={sharpeRatio >= 1 ? 'positive' : 'neutral'}
        />
        <StatCard
          label="Sortino ratio"
          value={fmtRatio(sortinoRatio)}
          tone={sortinoRatio >= 1 ? 'positive' : 'neutral'}
        />
        <StatCard
          label="Calmar ratio"
          value={fmtRatio(calmarRatio)}
          tone={calmarRatio >= 1 ? 'positive' : 'neutral'}
        />
        <StatCard
          label="Max drawdown"
          value={fmtUsd(-maxDrawdown)}
          subtext={`−${maxDrawdownPercent.toFixed(1)}% of starting balance`}
          tone="negative"
        />
      </div>

      {/* Direction breakdown — real closed trades */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Long trades"
          value={directionBreakdown.longCount.toLocaleString('en-US')}
          subtext={`${directionBreakdown.longWinRate.toFixed(0)}% win rate`}
        />
        <StatCard
          label="Short trades"
          value={directionBreakdown.shortCount.toLocaleString('en-US')}
          subtext={`${directionBreakdown.shortWinRate.toFixed(0)}% win rate`}
        />
      </div>

      {/* R-multiple distribution */}
      <RDistributionChart dist={result.rMultipleDistribution} />

      {/* R:R what-if table — secondary, normalized model */}
      <div className="flex flex-col gap-3">
        <RSelector selected={selectedR} onSelect={setSelectedR} />
        <RLadderTable rows={rRows} selected={selectedR} onSelect={setSelectedR} />
      </div>

      {/* Disclosure */}
      <p className="text-[12px] text-ink-tertiary">
        Results above reflect the actual configured account (${initialBalance.toLocaleString('en-US')},{' '}
        {setup.risk.riskPerTradePct}% risk per trade) for {symbol} {timeframe}. The Risk:Reward
        What-If section below re-scores the same real trades on a normalized $50,000 / 1% account.
      </p>
    </div>
  );
}

export default ResultsSummary;
