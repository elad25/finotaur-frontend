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
}

const BacktestEquityChart: React.FC<BacktestEquityChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(point => ({
      date: dayjs(point.date).format('MMM DD'),
      fullDate: point.date,
      value: point.value,
      displayValue: `$${point.value.toLocaleString()}`
    }));
  }, [data]);

  const { minValue, maxValue, initialValue } = useMemo(() => {
    if (!data || data.length === 0) return { minValue: 0, maxValue: 0, initialValue: 0 };
    
    const values = data.map(d => d.value);
    return {
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
      initialValue: data[0]?.value || 0
    };
  }, [data]);

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
            ${data[data.length - 1].value.toLocaleString()}
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
            formatter={(value: any) => [`$${value.toLocaleString()}`, 'Equity']}
          />
          <ReferenceLine 
            y={initialValue} 
            stroke="#C9A646" 
            strokeDasharray="5 5" 
            strokeOpacity={0.5}
            label={{ 
              value: 'Initial Capital', 
              fill: '#C9A646', 
              fontSize: 11,
              position: 'right'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#4AD295" 
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#4AD295' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BacktestEquityChart;