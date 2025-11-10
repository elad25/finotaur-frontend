// ================================================
// OPTIMIZED EQUITY CHART - PRODUCTION READY
// File: src/components/charts/EquityChart.tsx
// ✅ Disabled animations in production
// ✅ Optimized re-renders
// ✅ Better performance
// ================================================

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { CHART_COLORS } from '@/constants/dashboard';

interface EquityData {
  date: string;
  equity: number;
  pnl: number;
}

interface EquityChartProps {
  data: EquityData[];
}

const EquityChart = React.memo(({ data }: EquityChartProps) => {
  // ✅ Optimize data for large datasets
  const optimizedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // If more than 200 points, downsample
    if (data.length > 200) {
      const step = Math.ceil(data.length / 200);
      return data.filter((_, index) => index % step === 0);
    }
    
    return data;
  }, [data]);
  
  // ✅ Empty state
  if (!data || data.length === 0) {
    return (
      <div 
        className="rounded-[20px] border bg-[#141414] p-6 shadow-[0_0_30px_rgba(201,166,70,0.05)]"
        style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
      >
        <div>
          <h3 className="text-[#F4F4F4] font-semibold text-lg tracking-tight">Equity Curve</h3>
          <p className="text-[#A0A0A0] text-sm mt-1 font-light">Cumulative P&L from closed trades</p>
        </div>
        <div className="flex flex-col items-center justify-center h-64 mt-5">
          <div className="text-[#A0A0A0] text-sm font-light">No closed trades yet</div>
          <div className="text-[#A0A0A0]/60 text-xs mt-1 font-light">
            Complete some trades to see your equity curve
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-[20px] border bg-[#141414] p-6 shadow-[0_0_30px_rgba(201,166,70,0.05)] animate-fadeIn"
      style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[#F4F4F4] font-semibold text-lg tracking-tight">Equity Curve</h3>
          <p className="text-[#A0A0A0] text-sm mt-1 font-light">Cumulative P&L over time</p>
        </div>
      </div>
      
      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer>
          <AreaChart data={optimizedData}>
            <defs>
              <linearGradient id="eqGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={CHART_COLORS.profit} stopOpacity={0.3}/>
                <stop offset="100%" stopColor={CHART_COLORS.gold} stopOpacity={0.3}/>
              </linearGradient>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={CHART_COLORS.profit}/>
                <stop offset="100%" stopColor={CHART_COLORS.gold}/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid 
              stroke={CHART_COLORS.grid}
              strokeDasharray="3 3" 
              vertical={false} 
            />
            <XAxis 
              dataKey="date" 
              tick={{ fill: CHART_COLORS.textMuted, fontSize: 11, fontWeight: 300 }} 
              stroke="rgba(255,255,255,0.06)"
              axisLine={{ strokeWidth: 0.5 }}
            />
            <YAxis 
              tick={{ fill: CHART_COLORS.textMuted, fontSize: 11, fontWeight: 300 }} 
              stroke="rgba(255,255,255,0.06)"
              axisLine={{ strokeWidth: 0.5 }}
              tickFormatter={(value) => {
                if (value === 0) return '$0';
                const absValue = Math.abs(value);
                if (absValue >= 1000) {
                  return `${value < 0 ? '-' : ''}$${(absValue / 1000).toFixed(1)}k`;
                }
                return `${value < 0 ? '-' : ''}$${Math.round(absValue)}`;
              }}
            />
            <Tooltip
              contentStyle={{ 
                background: CHART_COLORS.backgroundDark, 
                border: `1px solid rgba(201,166,70,0.2)`, 
                borderRadius: 12,
                padding: 12,
                boxShadow: '0 0 20px rgba(201,166,70,0.15)'
              }}
              labelStyle={{ color: CHART_COLORS.text, fontSize: 12, marginBottom: 6, fontWeight: 500 }}
              itemStyle={{ color: CHART_COLORS.gold, fontSize: 13, fontWeight: 500 }}
              formatter={(val: any) => {
                const value = Number(val);
                const sign = value < 0 ? '-' : '';
                const abs = Math.abs(value);
                return [`${sign}$${abs.toFixed(2)}`, "Equity"];
              }}
            />
            <Area 
              type="monotone" 
              dataKey="equity" 
              stroke="url(#lineGradient)"
              fill="url(#eqGradient)"
              strokeWidth={2.5}
              filter="url(#glow)"
              isAnimationActive={false} // ✅ Disable animation for performance
              dot={false} // ✅ No dots for better performance
              activeDot={{ r: 5, fill: CHART_COLORS.gold, stroke: CHART_COLORS.backgroundDark, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

EquityChart.displayName = 'EquityChart';

export default EquityChart;