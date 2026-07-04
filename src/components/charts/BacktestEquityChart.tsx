// ================================================
// BACKTEST EQUITY CURVE CHART
// File: src/components/charts/BacktestEquityChart.tsx
// ================================================

import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import dayjs from "dayjs";

interface EquityPoint {
  date: string;
  value: number;
  drawdown: number;
}

interface BacktestEquityChartProps {
  data: EquityPoint[];
  /** Starting account balance before any trades. Used to prepend the baseline
   *  point so single-trade backtests show a slope instead of a lone dot.
   *  Defaults to 10 000 (the INITIAL_CAPITAL used in the useMockBacktestStats adapter). */
  initialCapital?: number;
}

const BacktestEquityChart: React.FC<BacktestEquityChartProps> = ({ data, initialCapital = 10000 }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const mapped = data.map(point => ({
      date: dayjs(point.date).format('MMM DD'),
      fullDate: point.date,
      value: point.value,
      displayValue: `$${point.value.toLocaleString('en-US')}`
    }));

    // Prepend a synthetic baseline point at INITIAL_CAPITAL so the equity
    // curve always shows a visible slope from baseline → first trade, even
    // when there is only one trade in the data set.  The equity_curve values
    // are INITIAL_CAPITAL + cumulative_pnl, so data[0].value is already
    // post-first-trade.  Inserting a "Start" point at initialCapital gives
    // the correct visual: flat-then-rising-or-falling into the first trade.
    const baselinePoint = {
      date: 'Start',
      fullDate: '',
      value: initialCapital,
      displayValue: `$${initialCapital.toLocaleString('en-US')}`
    };

    return [baselinePoint, ...mapped];
  }, [data, initialCapital]);

  const { minValue, maxValue, initialValue } = useMemo(() => {
    if (!data || data.length === 0) return { minValue: 0, maxValue: 0, initialValue: initialCapital };

    const values = data.map(d => d.value);
    return {
      minValue: Math.min(initialCapital, ...values),
      maxValue: Math.max(initialCapital, ...values),
      // ReferenceLine anchors at the true starting capital, not the first trade value.
      initialValue: initialCapital
    };
  }, [data, initialCapital]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[380px] bg-[#0A0A0A] rounded-[20px] flex items-center justify-center border border-white/[0.08]">
        <p className="text-[#666666] text-sm">No equity data available</p>
      </div>
    );
  }

  return (
    <div 
      className="rounded-2xl border p-6 shadow-lg"
      style={{
        borderColor: 'rgba(255, 255, 255, 0.08)',
        background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[#F4F4F4] text-lg font-semibold mb-1">
            BACKTEST: Equity Curve
          </h3>
          <p className="text-[#666666] text-sm">
            Account value progression over backtest period
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#666666] mb-1">Final Value</div>
          <div className={`text-xl font-bold ${
            data[data.length - 1].value >= initialValue ? 'text-[#4AD295]' : 'text-[#E36363]'
          }`}>
            ${data[data.length - 1].value.toLocaleString('en-US')}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="date" 
            stroke="#666666"
            tick={{ fill: '#666666', fontSize: 11 }}
            tickLine={{ stroke: '#666666' }}
          />
          <YAxis 
            stroke="#666666"
            tick={{ fill: '#666666', fontSize: 11 }}
            tickLine={{ stroke: '#666666' }}
            domain={[Math.floor(minValue * 0.98), Math.ceil(maxValue * 1.02)]}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1A1A1A',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px'
            }}
            labelStyle={{ color: '#F4F4F4', marginBottom: '8px', fontWeight: 600 }}
            itemStyle={{ color: '#4AD295' }}
            formatter={(value: any) => [`$${value.toLocaleString('en-US')}`, 'Equity']}
          />
          <ReferenceLine
            y={initialValue}
            stroke="#7AB6F4"
            strokeDasharray="5 5"
            strokeOpacity={0.5}
            label={{
              value: 'Initial Capital',
              fill: '#7AB6F4',
              fontSize: 11,
              position: 'right'
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#7AB6F4"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#7AB6F4' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BacktestEquityChart;