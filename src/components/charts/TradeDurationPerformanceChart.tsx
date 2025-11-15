// ================================================
// TRADE DURATION PERFORMANCE WITH LOCK FOR FREE USERS
// Component: src/components/charts/TradeDurationPerformanceChart.tsx
// ✅ Locked for FREE users and users without SnapTrade
// ✅ Fixed: Points no longer cut off at edges
// ✅ Scrollable for many data points
// ================================================

import React from 'react';
import { HelpCircle, Lock, Crown, ArrowRight, CheckCircle2, Zap } from 'lucide-react';

interface DataPoint {
  duration: string;
  value: number;
  isProfit: boolean;
}

interface TradeDurationPerformanceChartProps {
  data: DataPoint[];
  isLocked?: boolean;
  onUpgrade?: () => void;
}

export const TradeDurationPerformanceChart: React.FC<TradeDurationPerformanceChartProps> = ({ 
  data, 
  isLocked = false,
  onUpgrade 
}) => {
  const maxValue = Math.max(...data.map(d => Math.abs(d.value)), 100);
  
  // ✅ LOCKED STATE FOR FREE USERS
  if (isLocked) {
    return (
      <div 
        className="rounded-2xl border p-5 shadow-lg relative overflow-hidden"
        style={{
          borderColor: 'rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-[#F4F4F4] text-base font-semibold">
              Trade duration performance
            </h3>
            <HelpCircle className="w-4 h-4 text-[#808080]" />
          </div>
          <div className="flex items-center gap-1.5 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-lg px-3 py-1.5">
            <Crown className="w-3.5 h-3.5 text-[#C9A646]" />
            <span className="text-[10px] text-[#C9A646] font-semibold uppercase tracking-wider">
              Premium
            </span>
          </div>
        </div>

        {/* Blurred Preview Chart */}
        <div className="relative h-64 w-full blur-[3px] opacity-30">
          <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-[#666666] pr-2">
            <span>$5000</span>
            <span>$3750</span>
            <span>$2500</span>
            <span>$1250</span>
            <span>$0</span>
            <span>-$1250</span>
            <span>-$2500</span>
          </div>

          <div className="absolute left-12 right-0 top-0 bottom-8">
            <svg className="w-full h-full">
              {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={`${percent * 100}%`}
                  x2="100%"
                  y2={`${percent * 100}%`}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                />
              ))}
              
              <line
                x1="0"
                y1="50%"
                x2="100%"
                y2="50%"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1"
              />
              
              {/* Mock data points */}
              {[15, 28, 42, 56, 70, 84].map((x, i) => (
                <circle
                  key={i}
                  cx={`${x}%`}
                  cy={`${25 + Math.random() * 50}%`}
                  r="4"
                  fill={Math.random() > 0.5 ? '#4AD295' : '#E36363'}
                  opacity="0.6"
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Unlock Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0A0A0A]/97 via-[#141414]/95 to-[#0A0A0A]/97 backdrop-blur-sm">
          <div className="text-center max-w-md px-6">
            {/* Lock Icon with Animation */}
            <div className="relative inline-block mb-5">
              <div className="absolute inset-0 bg-[#C9A646] blur-2xl opacity-30 animate-pulse"></div>
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#C9A646]/20 to-[#C9A646]/5 border-2 border-[#C9A646]/40 flex items-center justify-center shadow-[0_0_30px_rgba(201,166,70,0.2)]">
                <Lock className="w-10 h-10 text-[#C9A646]" />
              </div>
            </div>

            <h4 className="text-xl font-bold text-white mb-2">
              Duration Analysis Locked
            </h4>
            
            <p className="text-[#A0A0A0] text-sm mb-6 leading-relaxed">
              This feature requires automatic trade sync with <span className="text-[#C9A646] font-semibold">SnapTrade</span> to accurately track entry and exit times
            </p>

            {/* Info Box */}
            <div className="bg-[#1A1A1A]/80 border border-zinc-800 rounded-xl p-4 mb-5 text-left backdrop-blur-sm">
              <p className="text-xs text-[#C9A646] font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                Unlock with upgrade
              </p>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-[#C9A646] mt-0.5 flex-shrink-0" />
                  <span>Automatic broker connection via SnapTrade</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-[#C9A646] mt-0.5 flex-shrink-0" />
                  <span>Precise entry/exit time tracking</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-[#C9A646] mt-0.5 flex-shrink-0" />
                  <span>Duration-based performance insights</span>
                </li>
              </ul>
            </div>

            {/* Upgrade Button */}
            {onUpgrade && (
              <button
                onClick={onUpgrade}
                className="w-full px-6 py-3.5 bg-gradient-to-r from-[#C9A646] to-[#E5C158] hover:from-[#B39540] hover:to-[#D4B55E] text-black rounded-xl transition-all font-bold shadow-[0_4px_20px_rgba(201,166,70,0.4)] hover:shadow-[0_6px_25px_rgba(201,166,70,0.5)] flex items-center justify-center gap-2 group"
              >
                Upgrade to Premium
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            <p className="text-center text-zinc-500 text-xs mt-3">
              Available on Basic ($15.99/mo) and Premium ($29.99/mo) plans
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ UNLOCKED STATE - SHOW REAL DATA
  if (!data || data.length === 0) {
    return (
      <div 
        className="rounded-2xl border p-5 shadow-lg flex items-center justify-center h-80"
        style={{
          borderColor: 'rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
        }}
      >
        <div className="text-center">
          <Lock className="w-8 h-8 text-[#666666] mx-auto mb-2 opacity-50" />
          <p className="text-[#666666] text-sm">No duration data available</p>
          <p className="text-[#555555] text-xs mt-1">Connect your broker to track trade duration</p>
        </div>
      </div>
    );
  }

  // ✅ Calculate dynamic width - minimum 30px per data point
  const minWidthPerPoint = 30;
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
            Trade duration performance
          </h3>
          <HelpCircle className="w-4 h-4 text-[#808080] cursor-help hover:text-[#C9A646] transition-colors" />
        </div>
        <div className="text-xs text-[#666666]">
          {data.length} trades
        </div>
      </div>

      {/* ✅ Scrollable container with proper overflow */}
      <div className="overflow-x-auto overflow-y-visible -mx-5 px-5">
        <div className="relative h-64" style={{ minWidth: `${calculatedWidth}px` }}>
          {/* Y-axis labels - Fixed with gradient background */}
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

              {/* Data points - with proper spacing */}
              {data.map((point, i) => {
                // ✅ Add 2% padding on each side
                const x = 2 + ((i / Math.max(data.length - 1, 1)) * 96);
                // ✅ Limit Y to 45% range for padding
                const y = 50 - (point.value / maxValue) * 45;
                
                return (
                  <g key={i}>
                    {/* Outer glow */}
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
                      <title>{`${point.duration}: ${point.value >= 0 ? '+' : ''}$${point.value.toFixed(2)}`}</title>
                    </circle>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* X-axis labels - duration labels */}
          <div className="absolute left-14 right-2 bottom-0 flex justify-between text-[10px] text-[#666666]">
            {data.map((point, i) => {
              // Show every nth label based on data count
              const showEvery = Math.max(Math.ceil(data.length / 8), 1);
              if (i % showEvery === 0 || i === data.length - 1) {
                return (
                  <span key={i} className="flex-shrink-0">
                    {point.duration}
                  </span>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>

      {/* ✅ Scroll hint */}
      {data.length > 20 && (
        <div className="text-center text-[10px] text-[#666666] mt-3 flex items-center justify-center gap-2">
          <span className="opacity-70">←</span>
          <span>Scroll to see all trades</span>
          <span className="opacity-70">→</span>
        </div>
      )}
    </div>
  );
};

export default TradeDurationPerformanceChart;