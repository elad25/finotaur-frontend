// =====================================================
// 🎨 SECTOR ANALYZER - UI COMPONENTS
// src/components/SectorAnalyzer/ui.tsx
// =====================================================

import { memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import { cn } from './utils';
import type { RiskLevel, ImpactType, SignalType } from './types';

// =====================================================
// 🎨 COLORS — Design tokens used across SectorAnalyzer
// =====================================================

export const colors = {
  gold: {
    primary: '#C9A646',
    light: '#F4D97B',
    dark: '#B8963F',
  },
  positive: '#22C55E',
  negative: '#EF4444',
  warning: '#F59E0B',
  neutral: '#8B8B8B',
  info: '#3B82F6',
  purple: '#A855F7',
} as const;

// =====================================================
// 🔧 HELPER FUNCTIONS
// =====================================================

const getScoreColor = (score: number): string => {
  if (score >= 80) return colors.positive;
  if (score >= 60) return colors.gold.primary;
  if (score >= 40) return colors.warning;
  return colors.negative;
};

const getRiskColor = (level: RiskLevel): string => {
  switch (level) {
    case 'High': return colors.negative;
    case 'Medium':
    case 'Med': return colors.warning;
    case 'Low': return colors.positive;
    default: return colors.neutral;
  }
};

const getImpactColor = (impact: ImpactType): string => {
  switch (impact) {
    case 'Positive': return colors.positive;
    case 'Negative': return colors.negative;
    case 'Neutral': return colors.warning;
    default: return colors.neutral;
  }
};

const getSignalColor = (signal: SignalType): string => {
  switch (signal) {
    case 'BUY':
    case 'OVERWEIGHT': return colors.positive;
    case 'AVOID':
    case 'UNDERWEIGHT': return colors.negative;
    case 'HOLD':
    case 'NEUTRAL': return colors.warning;
    case 'WATCH': return colors.info;
    default: return colors.neutral;
  }
};

// =====================================================
// ⏳ SKELETON
// =====================================================

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export const Skeleton = memo<SkeletonProps>(({ className, width = '100%', height = '20px' }) => (
  <div
    className={cn('animate-pulse rounded-lg', className)}
    style={{ width, height, background: 'rgba(201,166,70,0.08)' }}
  />
));
Skeleton.displayName = 'Skeleton';

// =====================================================
// 📦 CARD
// =====================================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
}

export const Card = memo<CardProps>(({ children, className, highlight = false }) => (
  <div
    className={cn('rounded-2xl overflow-hidden', className)}
    style={{
      background: highlight
        ? 'linear-gradient(135deg, rgba(201,166,70,0.08), rgba(13,11,8,0.95))'
        : 'linear-gradient(145deg, rgba(18,16,12,0.95), rgba(12,10,8,0.98))',
      border: highlight ? '1px solid rgba(201,166,70,0.25)' : '1px solid rgba(201,166,70,0.1)',
    }}
  >
    {children}
  </div>
));
Card.displayName = 'Card';

// =====================================================
// 📊 STAT BOX
// =====================================================

interface StatBoxProps {
  label: string;
  value: string | number;
  color?: string;
}

export const StatBox = memo<StatBoxProps>(({ label, value, color = colors.gold.primary }) => (
  <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.06)' }}>
    <div className="text-[10px] text-[#6B6B6B] mb-1 uppercase tracking-wider">{label}</div>
    <div className="text-lg font-bold" style={{ color }}>{value}</div>
  </div>
));
StatBox.displayName = 'StatBox';

// =====================================================
// 📊 METRIC BOX
// =====================================================

interface MetricBoxProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export const MetricBox = memo<MetricBoxProps>(({ label, value, sub, color = colors.gold.primary }) => (
  <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.08)' }}>
    <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-1">{label}</div>
    <div className="text-xl font-bold" style={{ color }}>{value}</div>
    {sub && <div className="text-[11px] text-[#6B6B6B] mt-0.5">{sub}</div>}
  </div>
));
MetricBox.displayName = 'MetricBox';

// =====================================================
// 🏷️ SECTION HEADER
// =====================================================

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const SectionHeader = memo<SectionHeaderProps>(({ title, subtitle, icon: Icon }) => (
  <div className="flex items-center gap-3 mb-4">
    {Icon && (
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(201,166,70,0.1)', border: '1px solid rgba(201,166,70,0.2)' }}
      >
        <Icon className="h-4 w-4 text-[#C9A646]" />
      </div>
    )}
    <div>
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
      {subtitle && <p className="text-[11px] text-[#6B6B6B]">{subtitle}</p>}
    </div>
  </div>
));
SectionHeader.displayName = 'SectionHeader';

// =====================================================
// 📝 FACT ROW
// =====================================================

interface FactRowProps {
  label: string;
  value: string | number;
  color?: string;
}

export const FactRow = memo<FactRowProps>(({ label, value, color = '#fff' }) => (
  <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
    <span className="text-xs text-[#8B8B8B]">{label}</span>
    <span className="text-xs font-semibold" style={{ color }}>{value}</span>
  </div>
));
FactRow.displayName = 'FactRow';

// =====================================================
// 📊 BAR METER
// =====================================================

interface BarMeterProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
}

export const BarMeter = memo<BarMeterProps>(({ label, value, max = 100, color = colors.gold.primary }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-[#8B8B8B]">{label}</span>
        <span className="text-[11px] font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
});
BarMeter.displayName = 'BarMeter';

// =====================================================
// 🔵 ROC CIRCLE (Rate of Change)
// =====================================================

interface ROCCircleProps {
  value: number;
  label?: string;
  size?: number;
}

export const ROCCircle = memo<ROCCircleProps>(({ value, label, size = 64 }) => {
  const color = value > 0 ? colors.positive : value < 0 ? colors.negative : colors.neutral;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : ArrowRight;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="rounded-full flex items-center justify-center"
        style={{ width: size, height: size, background: `${color}15`, border: `1px solid ${color}30` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{value > 0 ? '+' : ''}{value}%</span>
      {label && <span className="text-[10px] text-[#6B6B6B]">{label}</span>}
    </div>
  );
});
ROCCircle.displayName = 'ROCCircle';

// =====================================================
// 🏷️ STATUS BADGE
// =====================================================

interface StatusBadgeProps {
  label: string;
  variant?: 'positive' | 'negative' | 'warning' | 'neutral' | 'info';
}

export const StatusBadge = memo<StatusBadgeProps>(({ label, variant = 'neutral' }) => {
  const colorMap = {
    positive: colors.positive,
    negative: colors.negative,
    warning: colors.warning,
    neutral: colors.neutral,
    info: colors.info,
  };
  const color = colorMap[variant];
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded"
      style={{ background: `${color}15`, color }}
    >
      {label}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

// =====================================================
// 🏷️ BADGES
// =====================================================

export const RiskBadge = memo<{ level: RiskLevel }>(({ level }) => {
  const color = getRiskColor(level);
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${color}15`, color }}>{level}</span>;
});
RiskBadge.displayName = 'RiskBadge';

export const ImpactBadge = memo<{ impact: ImpactType }>(({ impact }) => {
  const color = getImpactColor(impact);
  const Icon = { Positive: ArrowUpRight, Negative: ArrowDownRight, Neutral: ArrowRight }[impact];
  return <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color }}><Icon className="h-3 w-3" />{impact}</span>;
});
ImpactBadge.displayName = 'ImpactBadge';

export const SignalBadge = memo<{ signal: SignalType; size?: 'sm' | 'md' }>(({ signal, size = 'sm' }) => {
  const color = getSignalColor(signal);
  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1';
  return <span className={cn('font-bold rounded', sizeClasses)} style={{ background: `${color}15`, color }}>{signal}</span>;
});
SignalBadge.displayName = 'SignalBadge';

// =====================================================
// 📊 SCORE BAR
// =====================================================

export const ScoreBar = memo<{ score: number; showLabel?: boolean }>(({ score, showLabel = true }) => {
  const color = getScoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ background: color }} />
      </div>
      {showLabel && <span className="text-xs font-bold min-w-[28px]" style={{ color }}>{score}</span>}
    </div>
  );
});
ScoreBar.displayName = 'ScoreBar';

// =====================================================
// 🔘 TAB BUTTON
// =====================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

export const TabButton = memo<TabButtonProps>(({ active, onClick, children, icon: Icon }) => (
  <button
    onClick={onClick}
    className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap', active ? 'text-black' : 'text-[#8B8B8B] hover:text-[#C9A646]')}
    style={active ? { background: 'linear-gradient(135deg, #C9A646, #F4D97B)', boxShadow: '0 4px 20px rgba(201,166,70,0.3)' } : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,166,70,0.08)' }}
  >
    {Icon && <Icon className="h-4 w-4" />}
    {children}
  </button>
));
TabButton.displayName = 'TabButton';

// =====================================================
// 📊 CORRELATION BAR
// =====================================================

export const CorrelationBar = memo<{ value: number; ticker: string }>(({ value, ticker }) => {
  const isPositive = value >= 0;
  const color = isPositive ? colors.positive : colors.negative;
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <span className="font-bold text-white min-w-[50px]">{ticker}</span>
      <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden relative">
        <div className="absolute inset-y-0 left-1/2 w-px bg-[#6B6B6B]" />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.abs(value) * 50}%` }}
          className={cn('absolute top-0 h-full', isPositive ? 'left-1/2 bg-gradient-to-r from-[#22C55E]/60 to-[#22C55E] rounded-r-full' : 'right-1/2 bg-gradient-to-l from-[#EF4444]/60 to-[#EF4444] rounded-l-full')}
        />
      </div>
      <span className="font-bold min-w-[45px] text-right" style={{ color }}>{value.toFixed(2)}</span>
    </div>
  );
});
CorrelationBar.displayName = 'CorrelationBar';

// =====================================================
// 📊 PROGRESS RING
// =====================================================

export const ProgressRing = memo<{ value: number; max?: number; size?: number; strokeWidth?: number; color?: string; label?: string }>(({ value, max = 100, size = 80, strokeWidth = 6, color = colors.gold.primary, label }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(value / max, 1) * circumference);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 0.8 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white">{value}</span>
        {label && <span className="text-[10px] text-[#6B6B6B]">{label}</span>}
      </div>
    </div>
  );
});
ProgressRing.displayName = 'ProgressRing';