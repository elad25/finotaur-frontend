/**
 * EquityCurveCard — renders the Automated Backtest equity curve.
 *
 * Reuses the existing `BacktestEquityChart` (recharts) by adapting the engine's
 * `EquityCurvePoint[]` ({ time: seconds, balance, equity, drawdown }) into the
 * chart's expected `{ date, value, drawdown }[]` shape. The chart prepends its
 * own baseline point, so we pass `initialBalance` as the initialCapital.
 */

import { useMemo } from 'react';
import BacktestEquityChart from '@/components/charts/BacktestEquityChart';
import {
  useAutoBacktestStore,
  selectAutoResult,
  selectAutoSetup,
} from '@/store/useAutoBacktestStore';

export function EquityCurveCard() {
  const result = useAutoBacktestStore(selectAutoResult);
  const setup = useAutoBacktestStore(selectAutoSetup);

  const chartData = useMemo(() => {
    if (!result) return [];
    return result.equityCurve.map((p) => ({
      // engine times are in SECONDS → ms for date parsing.
      date: new Date(p.time * 1000).toISOString(),
      value: p.equity,
      drawdown: p.drawdown,
    }));
  }, [result]);

  if (!result) return null;

  if (chartData.length === 0) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1">
        <p className="text-sm text-ink-tertiary">No equity data for this run.</p>
      </div>
    );
  }

  return (
    <BacktestEquityChart data={chartData} initialCapital={setup.risk.initialBalance} />
  );
}

export default EquityCurveCard;
