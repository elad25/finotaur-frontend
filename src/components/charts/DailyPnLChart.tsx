// ================================================
// OPTIMIZED DAILY P&L CHART - PRODUCTION READY
// File: src/components/charts/DailyPnLChart.tsx
// ✅ Disabled animations in production
// ✅ Optimized re-renders
// ✅ Better performance
// ================================================

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { CHART_COLORS } from '@/constants/dashboard';

interface DailyPnLData {
  date: string;
  equity: number;
  pnl: number;
}

interface DailyPnLChartProps {
  data: DailyPnLData[];
}

const DailyPnLChart = React.memo(({ data }: DailyPnLChartProps) => {
  // ✅ Optimize data for large datasets
  const optimizedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // If more than 100 bars, downsample
    if (data.length > 100) {
      const step = Math.ceil(data.length / 100);
      return data.filter((_, index) => index % step === 0);
    }
    
    return data;
  }, [data]);
  
  // ✅ Empty state
  if (!data || data.length === 0) {
    return (
      <div 
        className="rounded-[20px] border p-6 shadow-[0_0_30px_rgba(201,166,70,0.05)]"
        style={{ 
          borderColor: 'rgba(255, 215, 0, 0.08)',
          background: 'linear-gradient(135deg, #0A0A0A 0%, #0F0F0F 100%)'
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[#F4F4F4] font-semibold text-lg tracking-tight">Net Daily P&L</h3>
            <p className="text-[#A0A0A0] text-sm font-light">Daily performance tracking</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center h-80">
          <div className="w-16 h-16 rounded-full bg-[#C9A646]/10 flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-[#C9A646]" />
          </div>
          <div className="text-[#F4F4F4] text-base font-medium mb-2">No Trading Data</div>
          <div className="text-[#A0A0A0] text-sm font-light text-center max-w-xs">
            Complete your first trades to see your daily P&L performance
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-[20px] border p-6 shadow-[0_0_30px_rgba(201,166,70,0.05)] animate-fadeIn"
      style={{ 
        borderColor: 'rgba(255, 215, 0, 0.08)',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #0F0F0F 100%)'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[#F4F4F4] font-semibold text-lg tracking-tight">Net Daily P&L</h3>
          </div>
          <p className="text-[#A0A0A0] text-sm font-light">Daily performance tracking (one bar per day)</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#4ADE80]"></div>
            <span className="text-[#A0A0A0] font-light">Profit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#EF4444]"></div>
            <span className="text-[#A0A0A0] font-light">Loss</span>
          </div>
        </div>
      </div>
      
      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer>
          <BarChart 
            data={optimizedData}
            margin={{ top: 20, right: 20, left: 10, bottom: 30 }}
            barGap={3}
            barCategoryGap="25%"
          >
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.profitGradientStart} stopOpacity={1}/>
                <stop offset="100%" stopColor={CHART_COLORS.profitGradientEnd} stopOpacity={0.9}/>
              </linearGradient>
              <linearGradient id="lossGradient" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={CHART_COLORS.lossGradientStart} stopOpacity={1}/>
                <stop offset="100%" stopColor={CHART_COLORS.lossGradientEnd} stopOpacity={0.9}/>
              </linearGradient>
              <filter id="barShadow">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
              </filter>
            </defs>
            <CartesianGrid 
              stroke={CHART_COLORS.gridDark}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis 
              dataKey="date" 
              tick={{ 
                fill: CHART_COLORS.textMuted, 
                fontSize: 10, 
                fontWeight: 400
              }} 
              stroke="rgba(255,255,255,0.1)"
              axisLine={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
              tickLine={false}
              height={50}
            />
            <YAxis 
              tick={{ 
                fill: CHART_COLORS.text, 
                fontSize: 11, 
                fontWeight: 500
              }} 
              stroke="rgba(255,255,255,0.1)"
              axisLine={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
              tickLine={false}
              width={60}
              tickFormatter={(value) => {
                if (value === 0) return '$0';
                const absValue = Math.abs(value);
                if (absValue >= 1000) {
                  const formatted = (absValue / 1000).toFixed(1);
                  return `${value < 0 ? '-' : ''}$${formatted}k`;
                }
                return `${value < 0 ? '-' : ''}$${Math.round(absValue)}`;
              }}
            />
            <ReferenceLine 
              y={0} 
              stroke={CHART_COLORS.gold}
              strokeWidth={1.5}
              strokeOpacity={0.3}
            />
            <Tooltip
              cursor={{ fill: 'rgba(201,166,70,0.05)' }}
              content={({ active, payload, label }: any) => {
                if (active && payload && payload.length) {
                  const value = payload[0].value;
                  const isPositive = value >= 0;
                  const color = isPositive ? CHART_COLORS.profitGradientStart : CHART_COLORS.lossGradientStart;
                  const absValue = Math.abs(value);
                  const formatted = isPositive 
                    ? `+$${absValue.toFixed(2)}`
                    : `-$${absValue.toFixed(2)}`;
                  
                  return (
                    <div 
                      style={{ 
                        background: 'linear-gradient(135deg, #141414 0%, #1A1A1A 100%)', 
                        border: `1.5px solid ${color}`,
                        borderRadius: 12,
                        padding: '12px 14px',
                        boxShadow: `0 8px 24px ${color}40`,
                      }}
                    >
                      <div style={{ 
                        color: CHART_COLORS.textMuted, 
                        fontSize: 10, 
                        fontWeight: 500,
                        marginBottom: 6,
                        textTransform: 'uppercase',
                      }}>
                        {label}
                      </div>
                      <div style={{ 
                        color: color, 
                        fontSize: 15, 
                        fontWeight: 700,
                      }}>
                        {formatted}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="pnl"
              radius={[4, 4, 0, 0]}
              maxBarSize={14}
              filter="url(#barShadow)"
              isAnimationActive={false} // ✅ Disable animation for performance
              shape={(props: any) => {
                const { x, y, width, height, payload } = props;
                const isPositive = payload.pnl >= 0;
                const fillColor = isPositive ? "url(#profitGradient)" : "url(#lossGradient)";
                
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={fillColor}
                    rx={4}
                    ry={4}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

DailyPnLChart.displayName = 'DailyPnLChart';

export default DailyPnLChart;