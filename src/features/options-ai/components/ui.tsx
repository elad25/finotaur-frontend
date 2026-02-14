// src/features/options-ai/components/ui.tsx

import { memo, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Card ──
export const Card = memo(function Card({ children, className, highlight = false }: { children: ReactNode; className?: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-2xl overflow-hidden', className)} style={{
      background: highlight ? 'linear-gradient(135deg, rgba(201,166,70,0.1), rgba(13,11,8,0.95))' : 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
      border: highlight ? '1px solid rgba(201,166,70,0.3)' : '1px solid rgba(201,166,70,0.15)',
    }}>{children}</div>
  );
});

// ── Section Header ──
const ICON_BG = {
  gold:   { bg:'rgba(201,166,70,0.1)',  border:'rgba(201,166,70,0.2)',  color:'#C9A646' },
  green:  { bg:'rgba(34,197,94,0.1)',   border:'rgba(34,197,94,0.2)',   color:'#22C55E' },
  red:    { bg:'rgba(239,68,68,0.1)',   border:'rgba(239,68,68,0.2)',   color:'#EF4444' },
  orange: { bg:'rgba(245,158,11,0.1)',  border:'rgba(245,158,11,0.2)',  color:'#F59E0B' },
  purple: { bg:'rgba(139,92,246,0.1)',  border:'rgba(139,92,246,0.2)',  color:'#8B5CF6' },
} as const;

export const SectionHeader = memo(function SectionHeader({ icon: Icon, title, subtitle, iconBg = 'gold' }: {
  icon: any; title: string; subtitle?: string; iconBg?: keyof typeof ICON_BG;
}) {
  const c = ICON_BG[iconBg];
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
        <Icon className="w-5 h-5" style={{ color: c.color }} />
      </div>
      <div className="min-w-0">
        <h3 className="text-lg font-semibold text-white truncate">{title}</h3>
        {subtitle && <p className="text-xs text-[#6B6B6B] truncate">{subtitle}</p>}
      </div>
    </div>
  );
});

// ── AI Insight ──
export const AIInsight = memo(function AIInsight({ label = 'AI Interpretation', children }: { label?: string; children: ReactNode }) {
  return (
    <Card highlight>
      <div className="relative p-5">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] to-transparent" />
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-[#C9A646]" />
          <span className="text-sm text-[#C9A646] font-bold">{label}</span>
        </div>
        <p className="text-[#E8DCC4] leading-relaxed">{children}</p>
      </div>
    </Card>
  );
});

// ── Filter Button ──
export const FilterButton = memo(function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300" style={active ? {
      background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)', color: '#000', boxShadow: '0 4px 20px rgba(201,166,70,0.3)',
    } : { background: 'transparent', border: '1px solid rgba(201,166,70,0.2)', color: '#8B8B8B' }}>{children}</button>
  );
});

// ── Sub Tab Button ──
export const SubTab = memo(function SubTab({ active, onClick, children, badge }: { active: boolean; onClick: () => void; children: ReactNode; badge?: number }) {
  return (
    <button onClick={onClick} className="relative px-4 py-2 rounded-lg text-xs font-medium transition-all" style={active ? {
      background: 'rgba(201,166,70,0.15)', border: '1px solid rgba(201,166,70,0.3)', color: '#C9A646',
    } : { background: 'transparent', border: '1px solid rgba(255,255,255,0.05)', color: '#6B6B6B' }}>
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center bg-[#EF4444] text-white">{badge}</span>
      )}
    </button>
  );
});

// ── Metric Card ──
export const MetricCard = memo(function MetricCard({ label, value, suffix = '', color, percentage }: {
  label: string; value: string | number; suffix?: string; color: string; percentage?: number;
}) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.03] text-center">
      <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-3">{label}</div>
      {percentage !== undefined ? (
        <div className="relative w-16 h-16 mx-auto mb-2">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
            <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(percentage/100)*175.9} 175.9`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center"><span className="text-lg font-bold" style={{ color }}>{value}{suffix}</span></div>
        </div>
      ) : (<div className="text-2xl font-bold" style={{ color }}>{value}{suffix}</div>)}
    </div>
  );
});

// ── Status Badge ──
export const StatusBadge = memo(function StatusBadge({ label, color }: { label: string; color: string }) {
  return <span className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider" style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>{label}</span>;
});

// ── Skeletons ──
export const Skeleton = memo(function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg', className)} style={{ background: 'linear-gradient(90deg, rgba(201,166,70,0.05) 0%, rgba(201,166,70,0.1) 50%, rgba(201,166,70,0.05) 100%)', backgroundSize: '200% 100%' }} />;
});

export const SkeletonCard = memo(function SkeletonCard({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn('rounded-2xl p-6', className)} style={{ background: 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))', border: '1px solid rgba(201,166,70,0.15)' }}>{children}</div>;
});
