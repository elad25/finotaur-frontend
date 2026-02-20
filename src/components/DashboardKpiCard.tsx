// ================================================
// DASHBOARD-SPECIFIC KPI CARD WITH CIRCULAR GAUGES
// Component: src/components/DashboardKpiCard.tsx
// ✅ Separate from existing KpiCard - no conflicts!
// ✅ Half-circle gauges with needle — clean, no badges
// ✅ Used only in the dashboard
// ================================================

import React from 'react';
import { HelpCircle } from 'lucide-react';

interface DashboardKpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  color?: string;
  accentBg?: string;
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
  const winPercent = total > 0 ? (wins / total) * 100 : 0;

  // cx,cy = exact center of the semicircle
  const cx = 60; const cy = 60;
  const R = 46; const SW = 10;

  // Arc endpoints derived FROM cx,cy,R — guarantees needle alignment
  const x1 = cx - R; const y1 = cy; // left tip
  const x2 = cx + R; const y2 = cy; // right tip
  const arcLen = Math.PI * R;

  // Needle: 0%=left(π), 100%=right(0) — same coordinate system as arc
  const needleAngle = Math.PI - (winPercent / 100) * Math.PI;
  const needleLen = R - 6;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);

  const gradId = `sg-grad-${wins}-${losses}`;
  const glowId = `sg-glow-${wins}-${losses}`;

  return (
    <div className="flex flex-col items-center" style={{ width: 124 }}>
      <svg width={124} height={74} viewBox="0 0 124 74">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#E36363" />
            <stop offset="45%"  stopColor="#C9A646" />
            <stop offset="100%" stopColor="#00E676" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path
          d={`M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={SW}
          strokeLinecap="round"
        />

        {/* Fill arc */}
        {total > 0 && (
          <path
            d={`M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={SW}
            strokeLinecap="round"
            strokeDasharray={`${(winPercent / 100) * arcLen} ${arcLen}`}
            filter={`url(#${glowId})`}
            style={{ transition: 'stroke-dasharray 1s ease-out' }}
          />
        )}

        
      </svg>

      {/* Legend */}
      <div className="flex justify-between w-full px-2 -mt-1">
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
          <span className="text-[9px] font-semibold text-[#00E676]">{wins}W</span>
        </div>
        {breakeven > 0 && (
          <div className="flex items-center gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" />
            <span className="text-[9px] font-semibold text-[#C9A646]">{breakeven}BE</span>
          </div>
        )}
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#E36363]" />
          <span className="text-[9px] font-semibold text-[#E36363]">{losses}L</span>
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
  // Log-scale ratio: ratio=1 → 50% (center), ratio=2 → ~67%, ratio=0.5 → ~33%
  const ratio = avgLoss > 0 ? avgWin / Math.abs(avgLoss) : 1;
  const winPercent = Math.min(100, Math.max(0, 50 + 50 * Math.log2(Math.max(ratio, 0.01)) / 3));

  // cx,cy = exact center of the semicircle
  const cx = 60; const cy = 60;
  const R = 46; const SW = 10;

  // Arc endpoints derived FROM cx,cy,R
  const x1 = cx - R; const y1 = cy;
  const x2 = cx + R; const y2 = cy;
  const arcLen = Math.PI * R;

  const needleAngle = Math.PI - (winPercent / 100) * Math.PI;
  const needleLen = R - 6;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);

  const key = `${Math.round(avgWin)}-${Math.round(Math.abs(avgLoss))}`;

  return (
    <div className="flex flex-col items-center" style={{ width: 124 }}>
      <svg width={124} height={74} viewBox="0 0 124 74">
        <defs>
          <linearGradient id={`wl-grad-${key}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#E36363" />
            <stop offset="45%"  stopColor="#C9A646" />
            <stop offset="100%" stopColor="#00E676" />
          </linearGradient>
          <filter id={`wl-glow-${key}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path
          d={`M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={SW}
          strokeLinecap="round"
        />

        {/* Fill arc */}
        {(avgWin > 0 || avgLoss > 0) && (
          <path
            d={`M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`}
            fill="none"
            stroke={`url(#wl-grad-${key})`}
            strokeWidth={SW}
            strokeLinecap="round"
            strokeDasharray={`${(winPercent / 100) * arcLen} ${arcLen}`}
            filter={`url(#wl-glow-${key})`}
            style={{ transition: 'stroke-dasharray 1s ease-out' }}
          />
        )}

        
      </svg>

      {/* Legend */}
      <div className="flex justify-between w-full px-2 -mt-1">
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00E676]" />
          <span className="text-[9px] font-semibold text-[#00E676]">+${Math.abs(avgWin).toFixed(0)}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#E36363]" />
          <span className="text-[9px] font-semibold text-[#E36363]">-${Math.abs(avgLoss).toFixed(0)}</span>
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
  accentBg,
  tooltip,
  showGauge = false,
  gaugeData
}) => {
  const valueColor = color || "text-[#F4F4F4]";

  const glowColor = color?.includes('4AD295') || color?.includes('green') ? '#4AD295'
    : color?.includes('E36363') || color?.includes('red') ? '#E36363'
    : '#C9A646';

  return (
    <div
      className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] group"
      style={{
        background: accentBg || 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: `1px solid ${glowColor}22`,
        boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Ambient glow - top left */}
      <div
        className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `${glowColor}18`, filter: 'blur(28px)' }}
      />

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-4 right-4 h-px opacity-40 pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }}
      />

      <div className="relative p-5 flex items-center justify-between gap-4">
        {/* Left side - Text content */}
        <div className="flex-1 min-w-0">

          {/* Label + tooltip */}
          <div className="flex items-center gap-1.5 mb-3">
            <div
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: '#6A6A6A' }}
            >
              {label}
            </div>
            {tooltip && (
              <div className="relative group/tooltip">
                <HelpCircle className="w-3 h-3 cursor-help transition-colors" style={{ color: `${glowColor}60` }} />
                <div
                  className="absolute left-0 top-5 w-48 rounded-xl p-2.5 text-[10px] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50"
                  style={{
                    background: 'rgba(10,10,10,0.95)',
                    border: `1px solid ${glowColor}25`,
                    color: '#A0A0A0',
                    boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 16px ${glowColor}15`,
                  }}
                >
                  {tooltip}
                </div>
              </div>
            )}
          </div>

          {/* Value */}
          <div
            className={`text-3xl font-bold tracking-tight leading-none mb-2 ${valueColor}`}
            style={{ letterSpacing: '-0.02em' }}
          >
            {value}
          </div>

          {/* Hint */}
          {hint && (
            <div className="text-[10px] font-medium" style={{ color: '#5A5A5A' }}>
              {hint}
            </div>
          )}
        </div>

        {/* Right side - Circular Gauge */}
        {showGauge && gaugeData && (
          <div className="flex-shrink-0 opacity-90 group-hover:opacity-100 transition-opacity duration-300">
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