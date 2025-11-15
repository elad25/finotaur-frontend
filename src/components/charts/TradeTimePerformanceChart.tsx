// ================================================
// TRADE TIME PERFORMANCE SCATTER CHART - FIXED
// Component: src/components/charts/TradeTimePerformanceChart.tsx
// ✅ Shows all data points with horizontal scroll
// ✅ Fixed: Points no longer cut off at edges
// ✅ Dynamic width based on number of trades
// ================================================

import React from 'react';
import { HelpCircle } from 'lucide-react';

interface DataPoint {
  time: string;
  value: number;
  isProfit: boolean;
}

interface TradeTimePerformanceChartProps {
  data: DataPoint[];
}

export const TradeTimePerformanceChart: React.FC<TradeTimePerformanceChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div 
        className="rounded-2xl border p-5 shadow-lg flex items-center justify-center h-80"
        style={{
          borderColor: 'rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
        }}
      >
        <p className="text-[#666666] text-sm">No trade time data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Math.abs(d.value)), 100);
  
  // ✅ Calculate dynamic width - minimum 25px per data point for readability
  const minWidthPerPoint = 25;
  const calculatedWidth = Math.max(data.length * minWidthPerPoint, 600);
  
  return (
    <div 
      className="rounded-2xl border p-5 shadow-lg"
      style={{
        borderColor: 'rgba(255, 255, 255, 0.08)',
        background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-[#F4F4F4] text-base font-semibold">
            Trade time performance
          </h3>
          <HelpCircle className="w-4 h-4 text-[#808080] cursor-help hover:text-[#C9A646] transition-colors" />
        </div>
        <div className="text-xs text-[#666666]">
          {data.length} trades
        </div>
      </div>

      {/* ✅ Scrollable container with proper overflow handling */}
      <div className="overflow-x-auto overflow-y-visible -mx-5 px-5">
        <div className="relative h-64" style={{ minWidth: `${calculatedWidth}px` }}>
          {/* Y-axis labels - Fixed position with background */}
          <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-[#666666] pr-3 z-10 bg-gradient-to-r from-[#141414] to-transparent w-14">
            <span>${(maxValue).toFixed(0)}</span>
            <span>${(maxValue * 0.75).toFixed(0)}</span>
            <span>${(maxValue * 0.5).toFixed(0)}</span>
            <span>${(maxValue * 0.25).toFixed(0)}</span>
            <span>$0</span>
            <span>-${(maxValue * 0.25).toFixed(0)}</span>
            <span>-${(maxValue * 0.5).toFixed(0)}</span>
          </div>

          {/* Chart area - with padding to prevent clipping */}
          <div className="absolute left-14 right-2 top-2 bottom-10">
            <svg className="w-full h-full" preserveAspectRatio="none">
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
                <line
                  key={`grid-${i}`}
                  x1="0"
                  y1={`${percent * 100}%`}
                  x2="100%"
                  y2={`${percent * 100}%`}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                />
              ))}

              {/* Zero line - emphasized */}
              <line
                x1="0"
                y1="50%"
                x2="100%"
                y2="50%"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1.5"
              />

              {/* Data points - with proper spacing to avoid clipping */}
              {data.map((point, i) => {
                // ✅ Add padding at edges: 2% margin on each side
                const x = 2 + ((i / Math.max(data.length - 1, 1)) * 96);
                // ✅ Limit Y range to 45% (instead of 50%) to add top/bottom padding
                const y = 50 - (point.value / maxValue) * 45;
                
                return (
                  <g key={i}>
                    {/* Outer glow effect */}
                    <circle
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="8"
                      fill={point.isProfit ? '#4AD295' : '#E36363'}
                      opacity="0.15"
                    />
                    {/* Main circle */}
                    <circle
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="5"
                      fill={point.isProfit ? '#4AD295' : '#E36363'}
                      className="transition-all cursor-pointer hover:r-7"
                      opacity="0.9"
                      strokeWidth="2"
                      stroke={point.isProfit ? '#4AD295' : '#E36363'}
                      strokeOpacity="0.3"
                    >
                      <title>{`${point.time}: ${point.value >= 0 ? '+' : ''}$${point.value.toFixed(2)}`}</title>
                    </circle>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* X-axis labels - positioned below chart area */}
          <div className="absolute left-14 right-2 bottom-0 flex justify-between text-[10px] text-[#666666]">
            {data.map((point, i) => {
              // Show label every nth trade based on total count
              const showEvery = Math.max(Math.ceil(data.length / 10), 1);
              if (i % showEvery === 0 || i === data.length - 1) {
                return (
                  <span key={i} className="flex-shrink-0">
                    {point.time}
                  </span>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>

      {/* ✅ Scroll hint for many trades */}
      {data.length > 24 && (
        <div className="text-center text-[10px] text-[#666666] mt-3 flex items-center justify-center gap-2">
          <span className="opacity-70">←</span>
          <span>Scroll to see all trades</span>
          <span className="opacity-70">→</span>
        </div>
      )}
    </div>
  );
};

export default TradeTimePerformanceChart;