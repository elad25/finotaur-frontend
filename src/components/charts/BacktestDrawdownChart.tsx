// ================================================
// BACKTEST DRAWDOWN CHART
// File: src/components/charts/BacktestDrawdownChart.tsx
// ================================================

import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import dayjs from "dayjs";

interface EquityPoint {
  date: string;
  value: number;
  drawdown: number;
}

interface BacktestDrawdownChartProps {
  data: EquityPoint[];
}

const BacktestDrawdownChart: React.FC<BacktestDrawdownChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(point => ({
      date: dayjs(point.date).format('MMM DD'),
      drawdown: point.drawdown,
      displayValue: `${point.drawdown.toFixed(2)}%`
    }));
  }, [data]);

  const maxDrawdown = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return Math.min(...data.map(d => d.drawdown));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[380px] bg-[#0A0A0A] rounded-[20px] flex items-center justify-center border border-white/[0.08]">
        <p className="text-[#666666] text-sm">No drawdown data available</p>
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
            BACKTEST: Drawdown Analysis
          </h3>
          <p className="text-[#666666] text-sm">
            Equity decline from peak values
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#666666] mb-1">Max Drawdown</div>
          <div className="text-xl font-bold text-[#E36363]">
            {Math.abs(maxDrawdown).toFixed(2)}%
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E36363" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#E36363" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
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
            domain={[Math.floor(maxDrawdown * 1.2), 0]}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1A1A1A',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px'
            }}
            labelStyle={{ color: '#F4F4F4', marginBottom: '8px', fontWeight: 600 }}
            itemStyle={{ color: '#E36363' }}
            formatter={(value: any) => [`${value.toFixed(2)}%`, 'Drawdown']}
          />
          <Area 
            type="monotone" 
            dataKey="drawdown" 
            stroke="#E36363" 
            strokeWidth={2}
            fill="url(#drawdownGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BacktestDrawdownChart;