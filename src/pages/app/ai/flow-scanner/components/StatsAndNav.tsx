// =====================================================
// 📊 FLOW SCANNER — Stats & Tab Navigation v2
// =====================================================

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Eye, Users, DollarSign, GitMerge, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabType, FlowStats, Direction } from '../shared/types';
import { TABS, COLORS } from '../shared/constants';

// ─────────────────────────────────────────────────────
// Stat Card Meta
// ─────────────────────────────────────────────────────

const STAT_META = [
  {
    key: 'unusualVolume',
    label: 'Unusual Volume',
    sublabel: 'alerts today',
    icon: Activity,
    iconColor: '#F59E0B',
    iconBg:    'rgba(245,158,11,0.12)',
    iconBorder:'rgba(245,158,11,0.25)',
    glowColor: 'rgba(245,158,11,0.08)',
    barColor:  '#F59E0B',
  },
  {
    key: 'darkPoolAlerts',
    label: 'Dark Pool',
    sublabel: 'prints detected',
    icon: Eye,
    iconColor: '#6366F1',
    iconBg:    'rgba(99,102,241,0.12)',
    iconBorder:'rgba(99,102,241,0.25)',
    glowColor: 'rgba(99,102,241,0.08)',
    barColor:  '#6366F1',
  },
  {
    key: 'insiderTrades',
    label: 'Insider Trades',
    sublabel: 'last 24h',
    icon: Users,
    iconColor: '#A855F7',
    iconBg:    'rgba(168,85,247,0.12)',
    iconBorder:'rgba(168,85,247,0.25)',
    glowColor: 'rgba(168,85,247,0.08)',
    barColor:  '#A855F7',
  },
  {
    key: 'confluenceAlerts',
    label: 'Confluence',
    sublabel: '3+ signals',
    icon: GitMerge,
    iconColor: '#EF4444',
    iconBg:    'rgba(239,68,68,0.12)',
    iconBorder:'rgba(239,68,68,0.25)',
    glowColor: 'rgba(239,68,68,0.08)',
    barColor:  '#EF4444',
  },
  {
    key: 'netFlow',
    label: 'Net Flow',
    sublabel: 'market inflow',
    icon: DollarSign,
    iconColor: '#22C55E',
    iconBg:    'rgba(34,197,94,0.12)',
    iconBorder:'rgba(34,197,94,0.25)',
    glowColor: 'rgba(34,197,94,0.08)',
    barColor:  '#22C55E',
    valueColor: '#22C55E',
  },
] as const;

// ─────────────────────────────────────────────────────
// Quick Stat Card
// ─────────────────────────────────────────────────────

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
      transition={{ delay: index * 0.07, ease: 'easeOut' }}
      className="relative group"
    >
      <div
        className="relative overflow-hidden rounded-2xl p-5 h-full cursor-default
                   transition-all duration-300 group-hover:-translate-y-[2px]"
        style={{
          background: 'linear-gradient(145deg, rgba(16,14,10,0.97), rgba(10,9,7,0.99))',
          border: '1px solid rgba(255,255,255,0.055)',
          boxShadow: '0 4px 28px rgba(0,0,0,0.45)',
        }}
      >
        {/* Bottom accent bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] opacity-50
                     group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `linear-gradient(90deg, transparent, ${meta.barColor}, transparent)` }}
        />

        {/* Corner glow */}
        <div
          className="absolute bottom-0 right-0 w-28 h-28 rounded-full blur-2xl pointer-events-none"
          style={{ background: meta.glowColor }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative">
          <span className="text-[10.5px] font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(150,145,135,0.7)' }}>
            {meta.label}
          </span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: meta.iconBg,
              border: `1px solid ${meta.iconBorder}`,
              boxShadow: `0 0 10px ${meta.iconColor}18`,
            }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: meta.iconColor }} />
          </div>
        </div>

        {/* Value */}
        <div
          className="text-[2rem] font-bold leading-none mb-1.5 tabular-nums relative"
          style={{ color: ('valueColor' in meta ? meta.valueColor : '#fff') as string }}
        >
          {value}
        </div>

        {/* Sublabel */}
        <div className="text-[11px] font-medium relative"
          style={{ color: 'rgba(110,105,98,0.8)' }}>
          {meta.sublabel}
        </div>
      </div>
    </motion.div>
  );
});

QuickStatCard.displayName = 'QuickStatCard';

export const QuickStats = memo(({ stats }: { stats: FlowStats }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
    {STAT_META.map((meta, i) => (
      <QuickStatCard
        key={meta.key}
        meta={meta}
        value={stats[meta.key as keyof FlowStats] as string | number}
        index={i}
      />
    ))}
  </div>
));

QuickStats.displayName = 'QuickStats';

// ─────────────────────────────────────────────────────
// Sentiment Badge (above tab nav)
// ─────────────────────────────────────────────────────

export const SentimentBadge = memo(({ sentiment }: { sentiment: Direction }) => {
  const cfg = {
    bullish: { label: 'Risk On',     color: '#22C55E', Icon: TrendingUp   },
    bearish: { label: 'Risk Off',    color: '#EF4444', Icon: TrendingDown },
    neutral: { label: 'Mixed Flow',  color: '#8B8B8B', Icon: Activity     },
  }[sentiment];

  return (
    <div className="flex items-center justify-center mb-4">
      <div
        className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
        style={{
          background: `${cfg.color}12`,
          border: `1px solid ${cfg.color}30`,
          color: cfg.color,
        }}
      >
        <cfg.Icon className="h-3 w-3" />
        Market Sentiment: {cfg.label}
      </div>
    </div>
  );
});

SentimentBadge.displayName = 'SentimentBadge';

// ─────────────────────────────────────────────────────
// Tab Navigation
// ─────────────────────────────────────────────────────

export const TabNav = memo(({ activeTab, onTabChange }: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) => (
  <div
    className="flex items-center gap-1 p-1.5 rounded-xl overflow-x-auto scrollbar-none"
    style={{
      background: 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
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
            'flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 whitespace-nowrap',
            isActive ? 'text-black' : 'text-[#8B8B8B] hover:text-[#C9A646]'
          )}
          style={isActive ? {
            background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
            boxShadow: '0 4px 20px rgba(201,166,70,0.4)',
          } : {}}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">{tab.shortLabel}</span>
        </button>
      );
    })}
  </div>
));

TabNav.displayName = 'TabNav';