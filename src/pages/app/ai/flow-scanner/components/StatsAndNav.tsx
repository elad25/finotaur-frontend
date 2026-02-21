// =====================================================
// 📊 FLOW SCANNER - Stats & Tab Navigation
// Luxury card style — colored icon badges, gradient bg
// =====================================================

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Building, Users, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabType, FlowStats } from '../shared/types';
import { TABS } from '../shared/constants';
import { Card } from '../shared/Ui';

// =====================================================
// Quick Stat Card — Luxury Style
// =====================================================

const STAT_META = [
  {
    key: 'unusualVolume',
    label: 'Unusual Volume',
    sublabel: 'stocks today',
    icon: Activity,
    // Icon badge: teal/cyan circle
    iconBg: 'rgba(6, 182, 212, 0.15)',
    iconBorder: 'rgba(6, 182, 212, 0.3)',
    iconColor: '#06B6D4',
    // Card accent glow at bottom
    glowColor: 'rgba(6, 182, 212, 0.12)',
    // Value color
    valueColor: '#ffffff',
  },
  {
    key: 'institutional',
    label: 'Institutional',
    sublabel: '13F changes',
    icon: Building,
    iconBg: 'rgba(34, 197, 94, 0.15)',
    iconBorder: 'rgba(34, 197, 94, 0.3)',
    iconColor: '#22C55E',
    glowColor: 'rgba(34, 197, 94, 0.12)',
    valueColor: '#ffffff',
  },
  {
    key: 'insiderTrades',
    label: 'Insider Trades',
    sublabel: 'last 24h',
    icon: Users,
    iconBg: 'rgba(234, 179, 8, 0.15)',
    iconBorder: 'rgba(234, 179, 8, 0.3)',
    iconColor: '#EAB308',
    glowColor: 'rgba(234, 179, 8, 0.12)',
    valueColor: '#ffffff',
  },
  {
    key: 'netFlow',
    label: 'Net Flow',
    sublabel: 'market inflow',
    icon: DollarSign,
    iconBg: 'rgba(168, 85, 247, 0.15)',
    iconBorder: 'rgba(168, 85, 247, 0.3)',
    iconColor: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.12)',
    valueColor: '#22C55E', // net flow always green
  },
] as const;

const QuickStatCard = memo(({ meta, value, index }: {
  meta: typeof STAT_META[number];
  value: string | number;
  index: number;
}) => {
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, ease: 'easeOut' }}
      className="relative group"
    >
      {/* Card shell */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 h-full transition-all duration-300 group-hover:translate-y-[-2px]"
        style={{
          background: 'linear-gradient(145deg, rgba(18,18,22,0.95) 0%, rgba(12,12,16,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Bottom glow accent — matches icon color */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `linear-gradient(90deg, transparent, ${meta.iconColor}, transparent)`,
            opacity: 0.6,
          }}
        />

        {/* Subtle corner radial glow */}
        <div
          className="absolute bottom-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none"
          style={{ background: meta.glowColor }}
        />

        {/* Header: label + icon badge */}
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: 'rgba(160,160,180,0.7)' }}
          >
            {meta.label}
          </span>

          {/* Circular icon badge */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: meta.iconBg,
              border: `1px solid ${meta.iconBorder}`,
              boxShadow: `0 0 12px ${meta.iconColor}20`,
            }}
          >
            <Icon className="h-4 w-4" style={{ color: meta.iconColor }} />
          </div>
        </div>

        {/* Value */}
        <div
          className="text-[2rem] font-bold leading-none mb-2 tabular-nums"
          style={{
            color: meta.valueColor,
            textShadow: meta.valueColor !== '#ffffff'
              ? `0 0 20px ${meta.valueColor}50`
              : undefined,
          }}
        >
          {value}
        </div>

        {/* Sublabel */}
        <div
          className="text-xs font-medium"
          style={{ color: 'rgba(120,120,140,0.8)' }}
        >
          {meta.sublabel}
        </div>
      </div>
    </motion.div>
  );
});

QuickStatCard.displayName = 'QuickStatCard';

export const QuickStats = memo(({ stats }: { stats: FlowStats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
    {STAT_META.map((meta, i) => (
      <QuickStatCard
        key={meta.key}
        meta={meta}
        value={stats[meta.key as keyof FlowStats]}
        index={i}
      />
    ))}
  </div>
));

QuickStats.displayName = 'QuickStats';

// =====================================================
// Tab Navigation
// =====================================================

export const TabNav = memo(({ activeTab, onTabChange }: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) => (
  <div
    className="flex items-center gap-2 p-1.5 rounded-xl"
    style={{
      background: 'linear-gradient(135deg, rgba(13,11,8,0.8), rgba(21,18,16,0.8))',
      border: '1px solid rgba(201,166,70,0.15)',
    }}
  >
    {TABS.map(tab => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-300',
            isActive ? 'text-black' : 'text-[#8B8B8B] hover:text-[#C9A646]'
          )}
          style={isActive ? {
            background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
            boxShadow: '0 4px 20px rgba(201,166,70,0.4)',
          } : {}}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden md:inline text-sm">{tab.label}</span>
        </button>
      );
    })}
  </div>
));

TabNav.displayName = 'TabNav';