// ====================================================================
// 📁 src/components/charts/EquityCurveChart.tsx
// 📊 Professional Equity Curve - Recharts Style
// ====================================================================

import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface EquityCurveChartProps {
  rValues: number[];
}

const EquityCurveChart = memo(({ rValues }: EquityCurveChartProps) => {
  const chartData = useMemo(() => {
    if (rValues.length === 0) return [];
    
    let cumulative = 0;
    return rValues.map((r, index) => {
      cumulative += r;
      return {
        trade: `T${index + 1}`,
        r: cumulative,
        label: `Trade ${index + 1}`,
      };
    });
  }, [rValues]);

  const { yMin, yMax, totalR } = useMemo(() => {
    if (chartData.length === 0) return { yMin: -10, yMax: 10, totalR: 0 };
    
    const rValues = chartData.map(d => d.r);
    const maxR = Math.max(...rValues, 0);
    const minR = Math.min(...rValues, 0);
    const totalR = rValues[rValues.length - 1];
    
    const range = Math.max(maxR - minR, 20);
    const padding = range * 0.15;
    
    const yMin = Math.floor((minR - padding) / 10) * 10;
    const yMax = Math.ceil((maxR + padding) / 10) * 10;
    
    return { yMin, yMax, totalR };
  }, [chartData]);

  if (rValues.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: '#6a6a6a' }}>
          No trades to display
        </p>
      </div>
    );
  }

  const isProfitable = totalR >= 0;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            {/* Gradient for positive */}
            <linearGradient id="areaGradientPositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ff99" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#00d67d" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#00d67d" stopOpacity={0} />
            </linearGradient>

            {/* Gradient for negative */}
            <linearGradient id="areaGradientNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4757" stopOpacity={0} />
              <stop offset="50%" stopColor="#d63447" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#ff4757" stopOpacity={0.3} />
            </linearGradient>

            {/* Line gradient */}
            <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={isProfitable ? '#00ff99' : '#ff4757'} />
              <stop offset="100%" stopColor={isProfitable ? '#c9a646' : '#d63447'} />
            </linearGradient>

            {/* Glow effect */}
            <filter id="lineGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Grid */}
          <CartesianGrid 
            stroke="rgba(255,255,255,0.03)" 
            strokeDasharray="3 3" 
            vertical={false}
          />

          {/* Zero Line */}
          <ReferenceLine 
            y={0} 
            stroke="rgba(201,166,70,0.3)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />

          {/* X Axis */}
          <XAxis 
            dataKey="trade"
            tick={{ 
              fill: '#5a5a5a', 
              fontSize: 10,
              fontFamily: "'SF Pro Display', -apple-system, sans-serif"
            }}
            stroke="rgba(255,255,255,0.08)"
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            interval="preserveStartEnd"
          />

          {/* Y Axis */}
          <YAxis 
            domain={[yMin, yMax]}
            tick={{ 
              fill: '#5a5a5a', 
              fontSize: 10,
              fontFamily: "'SF Pro Display', -apple-system, sans-serif"
            }}
            stroke="rgba(255,255,255,0.08)"
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickFormatter={(value) => `${value >= 0 ? '+' : ''}${value}R`}
            width={50}
          />

          {/* Tooltip */}
          <Tooltip
            cursor={{ stroke: 'rgba(201,166,70,0.2)', strokeWidth: 1 }}
            contentStyle={{
              background: 'rgba(20,20,20,0.95)',
              border: '1px solid rgba(201,166,70,0.3)',
              borderRadius: '8px',
              padding: '8px 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
            labelStyle={{
              color: '#9a9a9a',
              fontSize: '10px',
              marginBottom: '4px',
              fontFamily: "'SF Pro Display', -apple-system, sans-serif"
            }}
            itemStyle={{
              color: isProfitable ? '#00ff99' : '#ff4757',
              fontSize: '12px',
              fontWeight: '600',
              fontFamily: "'SF Mono', monospace"
            }}
            formatter={(value: number) => [
              `${value >= 0 ? '+' : ''}${value.toFixed(2)}R`,
              'Cumulative R'
            ]}
          />

          {/* Area */}
          <Area
            type="monotone"
            dataKey="r"
            stroke="url(#strokeGradient)"
            strokeWidth={2}
            fill={isProfitable ? 'url(#areaGradientPositive)' : 'url(#areaGradientNegative)'}
            filter="url(#lineGlow)"
            isAnimationActive={false}
            dot={false}
            activeDot={{
              r: 4,
              fill: isProfitable ? '#00ff99' : '#ff4757',
              stroke: '#0a0a0a',
              strokeWidth: 2
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Summary Badge */}
      <div 
        className="absolute top-4 right-4 px-3 py-2 rounded-lg"
        style={{
          background: 'rgba(15,15,15,0.9)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${isProfitable ? 'rgba(0,255,153,0.2)' : 'rgba(255,71,87,0.2)'}`,
          boxShadow: `0 4px 12px ${isProfitable ? 'rgba(0,255,153,0.1)' : 'rgba(255,71,87,0.1)'}`,
        }}
      >
        <div 
          className="text-xs mb-1"
          style={{ 
            color: '#7a7a7a',
            fontFamily: "'SF Pro Display', -apple-system, sans-serif",
            fontWeight: '600',
            letterSpacing: '0.5px'
          }}
        >
          TOTAL GROWTH
        </div>
        <div 
          className="text-xl font-bold"
          style={{ 
            color: isProfitable ? '#00ff99' : '#ff4757',
            fontFamily: "'SF Mono', monospace",
            letterSpacing: '-0.5px'
          }}
        >
          {totalR >= 0 ? '+' : ''}{totalR.toFixed(2)}R
        </div>
        <div 
          className="text-xs mt-1"
          style={{ 
            color: '#6a6a6a',
            fontFamily: "'SF Pro Display', -apple-system, sans-serif"
          }}
        >
          {chartData.length} trades
        </div>
      </div>
    </div>
  );
});

EquityCurveChart.displayName = 'EquityCurveChart';

export default EquityCurveChart;