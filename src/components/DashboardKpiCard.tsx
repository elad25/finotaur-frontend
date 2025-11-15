// ================================================
// DASHBOARD-SPECIFIC KPI CARD WITH CIRCULAR GAUGES
// Component: src/components/DashboardKpiCard.tsx
// ✅ Separate from existing KpiCard - no conflicts!
// ✅ Tradezella-style circular gauges
// ✅ Used only in the dashboard
// ================================================

import React from 'react';
import { HelpCircle } from 'lucide-react';

interface DashboardKpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  color?: string;
  tooltip?: string;
  showGauge?: boolean;
  gaugeData?: {
    wins: number;
    losses: number;
    breakeven?: number;
  } | {
    avgWin: number;
    avgLoss: number;
  };
}

// ================================================
// SEGMENTED CIRCULAR GAUGE (Win/Loss/BE)
// ================================================

const SegmentedGauge: React.FC<{
  wins: number;
  losses: number;
  breakeven?: number;
}> = ({ wins, losses, breakeven = 0 }) => {
  const total = wins + losses + breakeven;
  const radius = 40;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI;
  
  const winPercent = total > 0 ? (wins / total) * 100 : 0;
  const lossPercent = total > 0 ? (losses / total) * 100 : 0;
  const bePercent = total > 0 ? (breakeven / total) * 100 : 0;
  
  const winLength = (winPercent / 100) * circumference;
  const beLength = (bePercent / 100) * circumference;
  const lossLength = (lossPercent / 100) * circumference;
  
  return (
    <div className="relative w-24 h-16">
      <svg 
        width={radius * 2 + strokeWidth} 
        height={radius + strokeWidth + 10}
        viewBox={`0 ${-strokeWidth / 2} ${radius * 2 + strokeWidth} ${radius + strokeWidth + 10}`}
      >
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + strokeWidth / 2} ${radius}`}
          stroke="rgba(255, 255, 255, 0.08)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Win segment */}
        {wins > 0 && (
          <path
            d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + strokeWidth / 2} ${radius}`}
            stroke="#4AD295"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${winLength} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        )}
        
        {/* Breakeven segment */}
        {breakeven > 0 && (
          <path
            d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + strokeWidth / 2} ${radius}`}
            stroke="#C9A646"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${beLength} ${circumference}`}
            strokeDashoffset={-winLength}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        )}
        
        {/* Loss segment */}
        {losses > 0 && (
          <path
            d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + strokeWidth / 2} ${radius}`}
            stroke="#E36363"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${lossLength} ${circumference}`}
            strokeDashoffset={-(winLength + beLength)}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        )}
      </svg>
      
      {/* Numbers below each side of the arc */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] font-semibold" style={{ paddingLeft: '2px', paddingRight: '2px' }}>
        {/* Left bottom - Wins */}
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4AD295]" />
            <span className="text-[#4AD295]">{wins}</span>
          </div>
        </div>
        
        {/* Center bottom - Breakeven (if exists) */}
        {breakeven > 0 && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
              <span className="text-[#C9A646]">{breakeven}</span>
            </div>
          </div>
        )}
        
        {/* Right bottom - Losses */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#E36363]" />
            <span className="text-[#E36363]">{losses}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================================
// WIN/LOSS AMOUNT GAUGE
// ================================================

const WinLossGauge: React.FC<{
  avgWin: number;
  avgLoss: number;
}> = ({ avgWin, avgLoss }) => {
  const total = avgWin + Math.abs(avgLoss);
  const winPercent = total > 0 ? (avgWin / total) * 100 : 50;
  
  const radius = 40;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI;
  
  const winLength = (winPercent / 100) * circumference;
  const lossLength = ((100 - winPercent) / 100) * circumference;
  
  return (
    <div className="relative w-24 h-16">
      <svg 
        width={radius * 2 + strokeWidth} 
        height={radius + strokeWidth + 10}
        viewBox={`0 ${-strokeWidth / 2} ${radius * 2 + strokeWidth} ${radius + strokeWidth + 10}`}
      >
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + strokeWidth / 2} ${radius}`}
          stroke="rgba(255, 255, 255, 0.08)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Loss segment - drawn first, from right side */}
        {lossLength > 0 && (
          <path
            d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + strokeWidth / 2} ${radius}`}
            stroke="#E36363"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`0 ${winLength} ${lossLength} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        )}
        
        {/* Win segment - drawn second, from left side */}
        {winLength > 0 && (
          <path
            d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + strokeWidth / 2} ${radius}`}
            stroke="#4AD295"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${winLength} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        )}
      </svg>
      
      {/* Numbers below each side */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] font-semibold" style={{ paddingLeft: '2px', paddingRight: '2px' }}>
        {/* Left bottom - Avg Win */}
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4AD295]" />
            <span className="text-[#4AD295]">+${Math.abs(avgWin).toFixed(0)}</span>
          </div>
        </div>
        
        {/* Right bottom - Avg Loss */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#E36363]" />
            <span className="text-[#E36363]">-${Math.abs(avgLoss).toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================================
// MAIN COMPONENT
// ================================================

export const DashboardKpiCard: React.FC<DashboardKpiCardProps> = ({
  label,
  value,
  hint,
  color,
  tooltip,
  showGauge = false,
  gaugeData
}) => {
  const valueColor = color || "text-[#F4F4F4]";
  
  return (
    <div 
      className="rounded-2xl border bg-[#141414] p-4 shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(201,166,70,0.15)] transition-all duration-300 group"
      style={{
        borderColor: 'rgba(255, 255, 255, 0.08)',
        background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
      }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left side - Text content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="text-[#808080] text-[10px] uppercase tracking-[0.08em] font-medium">
              {label}
            </div>
            {tooltip && (
              <div className="relative group/tooltip">
                <HelpCircle className="w-3 h-3 text-[#C9A646]/30 hover:text-[#C9A646]/60 cursor-help transition-colors" />
                <div className="absolute left-0 top-5 w-44 bg-[#0A0A0A] border border-[#C9A646]/20 rounded-lg p-2 text-[10px] text-[#A0A0A0] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 shadow-xl">
                  {tooltip}
                </div>
              </div>
            )}
          </div>
          
          {/* Value */}
          <div className={`text-2xl font-bold ${valueColor} transition-all duration-200 tracking-tight leading-none mb-1.5`}>
            {value}
          </div>
          
          {/* Hint */}
          {hint && <div className="text-[#666666] text-[10px] font-normal">{hint}</div>}
        </div>
        
        {/* Right side - Circular Gauge */}
        {showGauge && gaugeData && (
          <div className="flex-shrink-0">
            {'wins' in gaugeData ? (
              <SegmentedGauge 
                wins={gaugeData.wins} 
                losses={gaugeData.losses} 
                breakeven={gaugeData.breakeven}
              />
            ) : (
              <WinLossGauge 
                avgWin={gaugeData.avgWin} 
                avgLoss={gaugeData.avgLoss}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardKpiCard;