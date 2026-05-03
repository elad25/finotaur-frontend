// ============================================================
// GLASSMORPHISM UI PRIMITIVES — Crypto Section
// Shared glass-effect components used across all crypto pages
// ============================================================

import { ReactNode, memo } from 'react';
import { cn } from '@/lib/utils';

// ── Glass Card ───────────────────────────────────────────────
interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'emerald' | 'amber' | 'red' | 'cyan' | 'purple' | 'none';
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const GlassCard = memo(function GlassCard({
  children,
  className,
  hover = false,
  glow = 'none',
  padding = 'md',
  onClick,
}: GlassCardProps) {
  const glowMap = {
    emerald: 'shadow-[0_0_30px_rgba(52,211,153,0.08)] hover:shadow-[0_0_40px_rgba(52,211,153,0.15)]',
    amber: 'shadow-[0_0_30px_rgba(251,191,36,0.08)] hover:shadow-[0_0_40px_rgba(251,191,36,0.15)]',
    red: 'shadow-[0_0_30px_rgba(248,113,113,0.08)] hover:shadow-[0_0_40px_rgba(248,113,113,0.15)]',
    cyan: 'shadow-[0_0_30px_rgba(34,211,238,0.08)] hover:shadow-[0_0_40px_rgba(34,211,238,0.15)]',
    purple: 'shadow-[0_0_30px_rgba(168,85,247,0.08)] hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]',
    none: '',
  };
  const padMap = { sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-5 sm:p-6' };

  return (
    <div
      onClick={onClick}
      className={cn(
        // Glass effect
        'relative rounded-2xl',
        'bg-white/[0.03] dark:bg-white/[0.03]',
        'backdrop-blur-xl',
        'border border-white/[0.06]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.2)]',
        // Gradient border glow
        'before:absolute before:inset-0 before:rounded-2xl before:p-px',
        'before:bg-gradient-to-br before:from-white/[0.08] before:via-transparent before:to-white/[0.03]',
        'before:-z-10 before:pointer-events-none',
        // Padding
        padMap[padding],
        // Glow
        glowMap[glow],
        // Hover
        hover && 'cursor-pointer transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.1] hover:translate-y-[-1px]',
        className
      )}
    >
      {children}
    </div>
  );
});

// ── Glass Stat Card (number + label) ─────────────────────────
interface GlassStatProps {
  label: string;
  value: string;
  subValue?: string;
  change?: number | null;
  icon?: ReactNode;
  className?: string;
  loading?: boolean;
}

export const GlassStat = memo(function GlassStat({
  label,
  value,
  subValue,
  change,
  icon,
  className,
  loading,
}: GlassStatProps) {
  const changeColor = change == null ? '' : change >= 0 ? 'text-emerald-400' : 'text-red-400';
  const changeText = change == null ? '' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;

  if (loading) return <GlassStatSkeleton />;

  return (
    <GlassCard className={cn('min-w-0', className)} padding="sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium truncate">
            {label}
          </p>
          <p className="text-lg sm:text-xl font-bold text-white/90 mt-0.5 truncate font-mono">
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-white/30 mt-0.5 truncate">{subValue}</p>
          )}
          {change != null && (
            <p className={cn('text-xs font-semibold mt-0.5', changeColor)}>
              {changeText}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-white/20 flex-shrink-0">{icon}</div>
        )}
      </div>
    </GlassCard>
  );
});

// ── Signal Badge ─────────────────────────────────────────────
interface SignalBadgeProps {
  signal: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
  label: string;
  value: string;
  description?: string;
  icon?: string;
}

export const SignalBadge = memo(function SignalBadge({
  signal,
  label,
  value,
  description,
  icon,
}: SignalBadgeProps) {
  const colorMap = {
    strong_bullish: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    bullish: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
    neutral: 'border-white/10 bg-white/5 text-white/60',
    bearish: 'border-red-500/20 bg-red-500/5 text-red-300',
    strong_bearish: 'border-red-500/30 bg-red-500/10 text-red-400',
  };
  const dotMap = {
    strong_bullish: 'bg-emerald-400',
    bullish: 'bg-emerald-300',
    neutral: 'bg-white/40',
    bearish: 'bg-red-300',
    strong_bearish: 'bg-red-400',
  };

  return (
    <div className={cn(
      'rounded-xl border px-3 py-2.5 backdrop-blur-sm transition-all duration-200',
      colorMap[signal]
    )}>
      <div className="flex items-center gap-2 mb-1">
        <div className={cn('w-2 h-2 rounded-full animate-pulse', dotMap[signal])} />
        <span className="text-[11px] uppercase tracking-wider font-medium opacity-70">{label}</span>
        {icon && <span className="text-sm">{icon}</span>}
      </div>
      <p className="text-sm font-bold">{value}</p>
      {description && (
        <p className="text-[11px] mt-1 opacity-60 leading-relaxed">{description}</p>
      )}
    </div>
  );
});

// ── Skeletons ────────────────────────────────────────────────
export const GlassStatSkeleton = memo(function GlassStatSkeleton() {
  return (
    <GlassCard padding="sm">
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-16 bg-white/10 rounded" />
        <div className="h-6 w-24 bg-white/10 rounded" />
        <div className="h-3 w-12 bg-white/10 rounded" />
      </div>
    </GlassCard>
  );
});

export const GlassTableSkeleton = memo(function GlassTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2.5 px-3">
          <div className="h-4 w-8 bg-white/10 rounded" />
          <div className="h-4 w-20 bg-white/10 rounded" />
          <div className="h-4 flex-1 bg-white/[0.06] rounded" />
          <div className="h-4 w-16 bg-white/10 rounded" />
          <div className="h-4 w-12 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
});

// ── Section Header ───────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export const SectionHeader = memo(function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between mb-4', className)}>
      <div>
        <h2 className="text-base sm:text-lg font-bold text-white/90">{title}</h2>
        {subtitle && (
          <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
});

// ── Tab Switcher (glass style) ───────────────────────────────
interface GlassTabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export const GlassTabs = memo(function GlassTabs({
  tabs,
  active,
  onChange,
  className,
}: GlassTabsProps) {
  return (
    <div className={cn(
      'inline-flex items-center rounded-xl bg-white/[0.04] border border-white/[0.06] p-1',
      className
    )}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
            active === tab.id
              ? 'bg-white/[0.1] text-white shadow-sm'
              : 'text-white/40 hover:text-white/70'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});

// ── Fear & Greed Gauge ───────────────────────────────────────
interface FearGreedGaugeProps {
  value: number;
  label: string;
  loading?: boolean;
}

export const FearGreedGauge = memo(function FearGreedGauge({
  value,
  label,
  loading,
}: FearGreedGaugeProps) {
  if (loading) return <GlassStatSkeleton />;

  const getColor = (v: number) => {
    if (v <= 25) return { color: 'text-red-400', bg: 'bg-red-400', glow: 'shadow-[0_0_20px_rgba(248,113,113,0.3)]' };
    if (v <= 45) return { color: 'text-orange-400', bg: 'bg-orange-400', glow: 'shadow-[0_0_20px_rgba(251,146,60,0.3)]' };
    if (v <= 55) return { color: 'text-yellow-400', bg: 'bg-yellow-400', glow: 'shadow-[0_0_20px_rgba(250,204,21,0.3)]' };
    if (v <= 75) return { color: 'text-lime-400', bg: 'bg-lime-400', glow: 'shadow-[0_0_20px_rgba(163,230,53,0.3)]' };
    return { color: 'text-emerald-400', bg: 'bg-emerald-400', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.3)]' };
  };

  const { color, bg, glow } = getColor(value);
  const pct = Math.min(100, Math.max(0, value));

  return (
    <GlassCard padding="sm">
      <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium mb-2">
        Fear & Greed
      </p>
      <div className="flex items-center gap-3">
        <div className={cn('text-2xl font-bold font-mono', color)}>{value}</div>
        <div className="flex-1">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', bg, glow)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={cn('text-[10px] mt-1 font-medium', color)}>{label}</p>
        </div>
      </div>
    </GlassCard>
  );
});

// ── Sparkline (mini chart) ───────────────────────────────────
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const Sparkline = memo(function Sparkline({
  data,
  width = 80,
  height = 28,
  color,
  className,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const lineColor = color || (data[data.length - 1] >= data[0] ? '#34d399' : '#f87171');

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

// ── Empty State ──────────────────────────────────────────────
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
}

export const EmptyState = memo(function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <span className="text-3xl mb-3">{icon}</span>}
      <p className="text-sm font-medium text-white/50">{title}</p>
      {description && <p className="text-xs text-white/30 mt-1 max-w-xs">{description}</p>}
    </div>
  );
});
