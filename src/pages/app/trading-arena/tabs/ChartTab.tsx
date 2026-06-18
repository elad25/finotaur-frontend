/**
 * Trading Arena — Chart tab
 *
 * Renders <FinotaurChart> full-bleed using a BinanceSource data source
 * for the selected crypto symbol + interval.
 * Default indicators: EMA 50 + RSI 14.
 */

import { useMemo } from 'react';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import { BinanceSource } from '@/components/charting/dataSources';
import type { Indicator, Interval } from '@/components/charting/types';

interface ChartTabProps {
  symbol: string;
  interval: Interval;
}

// Singleton — BinanceSource is stateless; one instance is fine.
const binanceSource = new BinanceSource();

// Default indicators rendered in the arena chart.
// EMA 50 gives the medium-term trend; RSI 14 gives momentum.
const DEFAULT_INDICATORS: Indicator[] = [
  { type: 'EMA', period: 50 },
  { type: 'RSI', period: 14 },
];

// Rolling 24-hour window for the chart (from = now − 24h, to = now).
function nowWindow(): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 24 * 60 * 60;
  return { from, to };
}

export function ChartTab({ symbol, interval }: ChartTabProps) {
  const { from, to } = useMemo(nowWindow, [symbol, interval]);

  return (
    <div className="flex-1 min-h-0 w-full">
      <FinotaurChart
        symbol={symbol}
        interval={interval}
        from={from}
        to={to}
        dataSource={binanceSource}
        indicators={DEFAULT_INDICATORS}
        theme="dark"
        height="100%"
      />
    </div>
  );
}
