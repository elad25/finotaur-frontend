/**
 * StatsGrid — headline metrics for a completed Automated Backtest run.
 *
 * Reads `result.statistics` (a loose `BacktestStatisticsLike`) plus the
 * R-multiple distribution, and renders DS stat tiles. Positive money/edge is
 * shown gold/green, negative red, per the design system.
 */

import { Card } from '@/components/ds/Card';
import { Price } from '@/components/ds/NumberDisplay';
import { cn } from '@/lib/utils';
import {
  useAutoBacktestStore,
  selectAutoResult,
} from '@/store/useAutoBacktestStore';
import type {
  BacktestStatisticsLike,
  RMultipleDistribution,
} from '@/core/auto/AutoBacktestEngine';

// ---------------------------------------------------------------------------
// Typed view of the statistics fields we render (StatisticsEngine produces
// these keys; the engine type is intentionally loose with an index signature).
// ---------------------------------------------------------------------------

interface StatsView {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  avgRR: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  totalPnl: number;
  largestWin: number;
  largestLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

function num(stats: BacktestStatisticsLike, key: keyof StatsView): number {
  const v = stats[key as string];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

type Tone = 'neutral' | 'positive' | 'negative' | 'gold';

const toneClass: Record<Tone, string> = {
  neutral: 'text-ink-primary',
  positive: 'text-emerald-500',
  negative: 'text-num-negative',
  gold: 'text-gold-primary',
};

function StatTile({
  label,
  children,
  tone = 'neutral',
}: {
  label: string;
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <Card padding="compact" className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-[1px] text-ink-tertiary">
        {label}
      </span>
      <span className={cn('text-lg font-semibold tabular-nums', toneClass[tone])}>{children}</span>
    </Card>
  );
}

function moneyTone(v: number): Tone {
  return v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral';
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

function RDistribution({ dist }: { dist: RMultipleDistribution }) {
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

export function StatsGrid() {
  const result = useAutoBacktestStore(selectAutoResult);
  if (!result) return null;

  const stats = result.statistics;
  const totalPnl = num(stats, 'totalPnl');
  const expectancy = num(stats, 'expectancy');
  const winRate = num(stats, 'winRate');
  const profitFactor = num(stats, 'profitFactor');
  const avgRR = num(stats, 'avgRR');
  const maxDdPct = num(stats, 'maxDrawdownPercent');
  const sharpe = num(stats, 'sharpeRatio');
  const largestWin = num(stats, 'largestWin');
  const largestLoss = num(stats, 'largestLoss');
  const maxWinStreak = num(stats, 'maxConsecutiveWins');
  const maxLossStreak = num(stats, 'maxConsecutiveLosses');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Total trades">{num(stats, 'totalTrades').toLocaleString('en-US')}</StatTile>

        <StatTile label="Win rate" tone={winRate >= 50 ? 'positive' : 'neutral'}>
          {winRate.toFixed(1)}%
        </StatTile>

        <StatTile label="Net P&L" tone={moneyTone(totalPnl)}>
          <Price value={totalPnl} format="currency" className={cn('text-lg', toneClass[moneyTone(totalPnl)])} />
        </StatTile>

        <StatTile label="Profit factor" tone={profitFactor >= 1 ? 'gold' : 'negative'}>
          {profitFactor.toFixed(2)}
        </StatTile>

        <StatTile label="Expectancy" tone={moneyTone(expectancy)}>
          <Price value={expectancy} format="currency" className={cn('text-lg', toneClass[moneyTone(expectancy)])} />
        </StatTile>

        <StatTile label="Avg R" tone={avgRR >= 1 ? 'gold' : 'neutral'}>
          {avgRR.toFixed(2)}R
        </StatTile>

        <StatTile label="Max drawdown" tone={maxDdPct > 0 ? 'negative' : 'neutral'}>
          {maxDdPct.toFixed(1)}%
        </StatTile>

        <StatTile label="Sharpe ratio" tone={sharpe >= 1 ? 'positive' : 'neutral'}>
          {sharpe.toFixed(2)}
        </StatTile>

        <StatTile label="Largest win" tone="positive">
          <Price value={largestWin} format="currency" className="text-lg text-emerald-500" />
        </StatTile>

        <StatTile label="Largest loss" tone="negative">
          <Price value={largestLoss} format="currency" className="text-lg text-num-negative" />
        </StatTile>

        <StatTile label="Win streak" tone="positive">
          {maxWinStreak.toLocaleString('en-US')}
        </StatTile>

        <StatTile label="Loss streak" tone="negative">
          {maxLossStreak.toLocaleString('en-US')}
        </StatTile>
      </div>

      <RDistribution dist={result.rMultipleDistribution} />
    </div>
  );
}

export default StatsGrid;
