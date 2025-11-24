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
    if (!rValues || rValues.length === 0) return [];
    
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
    
    const rVals = chartData.map(d => d.r);
    const maxR = Math.max(...rVals, 0);
    const minR = Math.min(...rVals, 0);
    const totalR = rVals[rVals.length - 1];
    
    const range = Math.max(maxR - minR, 10);
    const padding = range * 0.15;
    
    // Round to nice numbers
    const yMin = Math.floor((minR - padding) / 5) * 5;
    const yMax = Math.ceil((maxR + padding) / 5) * 5;
    
    return { yMin, yMax, totalR };
  }, [chartData]);

  // No data state
  if (!rValues || rValues.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-sm" style={{ color: '#6a6a6a' }}>
          No trades to display
        </p>
      </div>
    );
  }

  const isProfitable = totalR >= 0;

  return (
    <div className="relative w-full h-full">
      {/* Chart Container */}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={chartData}
          margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
        >
          <defs>
            {/* Gradient for positive */}
            <linearGradient id="areaGradientPositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00C46C" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#00C46C" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#00C46C" stopOpacity={0} />
            </linearGradient>

            {/* Gradient for negative */}
            <linearGradient id="areaGradientNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E44545" stopOpacity={0} />
              <stop offset="50%" stopColor="#E44545" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#E44545" stopOpacity={0.4} />
            </linearGradient>

            {/* Line glow effect */}
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
            stroke="rgba(201,166,70,0.08)" 
            strokeDasharray="3 3" 
            vertical={false}
          />

          {/* Zero Line */}
          <ReferenceLine 
            y={0} 
            stroke="rgba(201,166,70,0.4)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />

          {/* X Axis */}
          <XAxis 
            dataKey="trade"
            tick={{ 
              fill: '#7A7A7A', 
              fontSize: 10,
            }}
            stroke="rgba(201,166,70,0.15)"
            tickLine={false}
            axisLine={{ stroke: 'rgba(201,166,70,0.15)' }}
            interval="preserveStartEnd"
          />

          {/* Y Axis */}
          <YAxis 
            domain={[yMin, yMax]}
            tick={{ 
              fill: '#7A7A7A', 
              fontSize: 10,
            }}
            stroke="rgba(201,166,70,0.15)"
            tickLine={false}
            axisLine={{ stroke: 'rgba(201,166,70,0.15)' }}
            tickFormatter={(value) => `${value >= 0 ? '+' : ''}${value}R`}
            width={55}
          />

          {/* Tooltip */}
          <Tooltip
            cursor={{ stroke: 'rgba(201,166,70,0.3)', strokeWidth: 1 }}
            contentStyle={{
              background: 'rgba(20,20,20,0.98)',
              border: '1px solid rgba(201,166,70,0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            }}
            labelStyle={{
              color: '#9A9A9A',
              fontSize: '11px',
              marginBottom: '4px',
            }}
            itemStyle={{
              color: isProfitable ? '#00C46C' : '#E44545',
              fontSize: '13px',
              fontWeight: '600',
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
            stroke={isProfitable ? '#00C46C' : '#E44545'}
            strokeWidth={2.5}
            fill={isProfitable ? 'url(#areaGradientPositive)' : 'url(#areaGradientNegative)'}
            filter="url(#lineGlow)"
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
            dot={false}
            activeDot={{
              r: 5,
              fill: isProfitable ? '#00C46C' : '#E44545',
              stroke: '#0A0A0A',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Summary Badge - Positioned absolutely within relative container */}
      <div 
        className="absolute top-2 right-2 px-3 py-2 rounded-lg"
        style={{
          background: 'rgba(15,15,15,0.95)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${isProfitable ? 'rgba(0,196,108,0.3)' : 'rgba(228,69,69,0.3)'}`,
          boxShadow: `0 4px 12px ${isProfitable ? 'rgba(0,196,108,0.15)' : 'rgba(228,69,69,0.15)'}`,
        }}
      >
        <div 
          className="text-xs mb-1"
          style={{ 
            color: '#7A7A7A',
            fontWeight: '600',
            letterSpacing: '0.5px',
          }}
        >
          TOTAL GROWTH
        </div>
        <div 
          className="text-xl font-bold"
          style={{ 
            color: isProfitable ? '#00C46C' : '#E44545',
            letterSpacing: '-0.5px',
          }}
        >
          {totalR >= 0 ? '+' : ''}{totalR.toFixed(2)}R
        </div>
        <div 
          className="text-xs mt-1"
          style={{ color: '#6A6A6A' }}
        >
          {chartData.length} trades
        </div>
      </div>
    </div>
  );
});

EquityCurveChart.displayName = 'EquityCurveChart';

export default EquityCurveChart;