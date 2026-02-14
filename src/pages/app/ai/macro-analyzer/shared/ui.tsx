// shared/ui.tsx
// =====================================================
// 🧩 SHARED UI PRIMITIVES
// All reusable UI components for the Macro Analyzer
// =====================================================

import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight, ArrowDownRight, Minus, Info,
  CheckCircle, Zap
} from 'lucide-react';

// =====================================================
// UTILITY
// =====================================================

export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// =====================================================
// INTERSECTION OBSERVER HOOK
// =====================================================

export const useInView = (options = {}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.1, rootMargin: '100px', ...options });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isInView };
};

// =====================================================
// SKELETON
// =====================================================

export const Skeleton = memo(({ className }: { className?: string }) => (
  <div
    className={cn("rounded-lg", className)}
    style={{
      background: 'linear-gradient(90deg, rgba(201,166,70,0.05) 0%, rgba(201,166,70,0.15) 50%, rgba(201,166,70,0.05) 100%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.5s ease-in-out infinite'
    }}
  />
));
Skeleton.displayName = 'Skeleton';

// =====================================================
// CARD
// =====================================================

export const Card = memo(({ children, className, highlight = false, onClick }: {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={cn(
      "rounded-2xl overflow-hidden transition-all duration-200",
      onClick && "cursor-pointer hover:scale-[1.01] hover:-translate-y-1",
      className
    )}
    style={{
      background: highlight
        ? 'linear-gradient(135deg, rgba(201,166,70,0.1), rgba(13,11,8,0.95))'
        : 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
      border: highlight ? '1px solid rgba(201,166,70,0.3)' : '1px solid rgba(201,166,70,0.15)',
      willChange: onClick ? 'transform' : 'auto'
    }}
  >
    {children}
  </div>
));
Card.displayName = 'Card';

// =====================================================
// SECTION HEADER
// =====================================================

export const SectionHeader = memo(({ icon: Icon, title, subtitle, action }: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(201,166,70,0.1)', border: '1px solid rgba(201,166,70,0.2)' }}
      >
        <Icon className="w-5 h-5 text-[#C9A646]" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-[#6B6B6B]">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
));
SectionHeader.displayName = 'SectionHeader';

// =====================================================
// PROGRESS BAR
// =====================================================

export const ProgressBar = memo(({ value, color, className, showLabel = false }: {
  value: number;
  color: string;
  className?: string;
  showLabel?: boolean;
}) => (
  <div className={cn("relative", className)}>
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </div>
    {showLabel && (
      <span className="absolute right-0 -top-5 text-xs font-medium" style={{ color }}>{value}%</span>
    )}
  </div>
));
ProgressBar.displayName = 'ProgressBar';

// =====================================================
// BADGE
// =====================================================

export const Badge = memo(({ children, variant = 'default' }: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) => {
  const styles = {
    default: { bg: 'rgba(201,166,70,0.1)', color: '#C9A646' },
    success: { bg: 'rgba(34,197,94,0.1)', color: '#22C55E' },
    warning: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
    danger: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444' },
    info: { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6' },
  }[variant];

  return (
    <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: styles.bg, color: styles.color }}>
      {children}
    </span>
  );
});
Badge.displayName = 'Badge';

// =====================================================
// TREND INDICATOR
// =====================================================

export const TrendIndicator = memo(({ trend, change, unit }: { trend: string; change: number; unit: string }) => {
  const config = useMemo(() => {
    if (trend === 'improving') return { icon: ArrowUpRight, color: '#22C55E', bg: 'rgba(34,197,94,0.1)' };
    if (trend === 'declining') return { icon: ArrowDownRight, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' };
    return { icon: Minus, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' };
  }, [trend]);

  const Icon = config.icon;
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: config.bg }}>
      <Icon className="h-3 w-3" style={{ color: config.color }} />
      <span className="text-xs font-medium" style={{ color: config.color }}>
        {change > 0 ? '+' : ''}{change}{unit}
      </span>
    </div>
  );
});
TrendIndicator.displayName = 'TrendIndicator';

// =====================================================
// SIGNAL DOT
// =====================================================

export const SignalDot = memo(({ signal }: { signal: 'ok' | 'warn' | 'danger' }) => {
  const colors = { ok: '#22C55E', warn: '#F59E0B', danger: '#EF4444' };
  return (
    <span
      className="w-2 h-2 rounded-full inline-block"
      style={{ background: colors[signal], boxShadow: `0 0 8px ${colors[signal]}50` }}
    />
  );
});
SignalDot.displayName = 'SignalDot';

// =====================================================
// INFO TOOLTIP
// =====================================================

export const InfoTooltip = memo(({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1">
    <Info className="w-3 h-3 text-[#6B6B6B] cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1a1a] border border-[#C9A646]/20 rounded-lg text-xs text-[#8B8B8B] whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a1a1a]" />
    </div>
  </div>
));
InfoTooltip.displayName = 'InfoTooltip';

// =====================================================
// SECTION SKELETON
// =====================================================

export const SectionSkeleton = memo(({ height = "h-64" }: { height?: string }) => (
  <div
    className={cn("rounded-2xl p-6", height)}
    style={{ background: 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))', border: '1px solid rgba(201,166,70,0.15)' }}
  >
    <div className="flex items-center gap-3 mb-6">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div>
        <Skeleton className="h-5 w-32 mb-1" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
    <Skeleton className="h-24 w-full rounded-xl mb-4" />
    <div className="grid grid-cols-3 gap-4">
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
    </div>
  </div>
));
SectionSkeleton.displayName = 'SectionSkeleton';

// =====================================================
// LAZY SECTION (loads on scroll)
// =====================================================

export const LazySection = memo(({ children, fallbackHeight = "h-64" }: { children: React.ReactNode; fallbackHeight?: string }) => {
  const { ref, isInView } = useInView();
  return (
    <div ref={ref}>
      {isInView ? children : <SectionSkeleton height={fallbackHeight} />}
    </div>
  );
});
LazySection.displayName = 'LazySection';

// =====================================================
// MINI CHART (SVG sparkline)
// =====================================================

export const MiniChart = memo(({ data, color = '#C9A646', height = 40 }: { data: number[]; color?: string; height?: number }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="100"
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="3"
        fill={color}
      />
    </svg>
  );
});
MiniChart.displayName = 'MiniChart';

// =====================================================
// CYCLE STAGE VISUALIZER (FIXED: line behind circles)
// The line now uses z-index properly so it doesn't
// cut through the circle nodes.
// =====================================================

export const CycleStageVisualizer = memo(({ stages, currentStage }: { stages: string[]; currentStage: number }) => (
  <div className="relative py-4">
    {/* Stage circles + line layout */}
    <div className="flex items-start justify-between relative">
      {/* Progress Line — sits behind circles via z-index */}
      <div className="absolute left-[28px] right-[28px]" style={{ top: '28px', zIndex: 1 }}>
        {/* Gray background track */}
        <div className="h-[3px] w-full bg-[#3B3B3B] rounded-full" />
        {/* Colored progress fill */}
        <div
          className="absolute top-0 left-0 h-[3px] rounded-full transition-all duration-1000"
          style={{
            width: `${(currentStage / (stages.length - 1)) * 100}%`,
            background: 'linear-gradient(90deg, #22C55E, #C9A646)',
          }}
        />
      </div>

      {/* Stage nodes — above the line */}
      {stages.map((stage, idx) => (
        <div key={stage} className="flex flex-col items-center relative" style={{ zIndex: 2 }}>
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center border-2 mb-2 transition-all duration-500",
            idx === currentStage ? "border-[#C9A646] shadow-lg shadow-[#C9A646]/20" :
            idx < currentStage ? "border-[#22C55E]" : "border-[#3B3B3B]"
          )}
          style={{
            background: idx === currentStage
              ? '#0d0b08'
              : idx < currentStage
              ? '#0d0b08'
              : '#0d0b08',
            boxShadow: idx === currentStage
              ? '0 0 20px rgba(201,166,70,0.25), inset 0 0 12px rgba(201,166,70,0.1)'
              : 'none',
          }}
          >
            {/* Inner colored fill */}
            <div className={cn(
              "w-full h-full rounded-full flex items-center justify-center",
            )}
            style={{
              background: idx === currentStage
                ? 'radial-gradient(circle, rgba(201,166,70,0.2), rgba(13,11,8,1))'
                : idx < currentStage
                ? 'radial-gradient(circle, rgba(34,197,94,0.15), rgba(13,11,8,1))'
                : 'rgba(13,11,8,1)',
            }}
            >
              {idx < currentStage ? <CheckCircle className="h-6 w-6 text-[#22C55E]" /> :
               idx === currentStage ? <Zap className="h-6 w-6 text-[#C9A646]" /> :
               <span className="text-sm text-[#6B6B6B] font-medium">{idx + 1}</span>}
            </div>
          </div>
          <span className={cn("text-xs font-medium text-center",
            idx === currentStage ? "text-[#C9A646]" :
            idx < currentStage ? "text-[#22C55E]" : "text-[#6B6B6B]"
          )}>{stage}</span>
          {idx === currentStage && (
            <span className="text-[10px] text-[#C9A646] mt-1">▲ You Are Here</span>
          )}
        </div>
      ))}
    </div>
  </div>
));
CycleStageVisualizer.displayName = 'CycleStageVisualizer';

// =====================================================
// STAT BOX
// =====================================================

export const StatBox = memo(({ label, value, subValue, highlighted = false, valueColor }: {
  label: string;
  value: string | number;
  subValue?: string;
  highlighted?: boolean;
  valueColor?: string;
}) => (
  <div
    className="p-4 rounded-xl"
    style={highlighted
      ? { background: 'rgba(201,166,70,0.05)', border: '1px solid rgba(201,166,70,0.2)' }
      : { background: 'rgba(255,255,255,0.03)' }
    }
  >
    <p className="text-xs text-[#6B6B6B] mb-1">{label}</p>
    <p className="text-2xl font-bold" style={{ color: valueColor || (highlighted ? '#C9A646' : '#fff') }}>{value}</p>
    {subValue && <p className="text-xs text-[#6B6B6B] mt-1">{subValue}</p>}
  </div>
));
StatBox.displayName = 'StatBox';

// =====================================================
// GLOBAL STYLES (inject once)
// =====================================================

export const GlobalStyles = () => (
  <style>{`
    @keyframes skeleton-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `}</style>
);