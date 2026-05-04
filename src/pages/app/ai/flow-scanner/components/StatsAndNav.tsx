// =====================================================
// 📊 FLOW SCANNER — Stats & Tab Navigation v4
// ✅ Luxury color palette — Gold / Teal / Violet / Rose / Emerald
// ✅ SentimentBadge removed
// ✅ Client-side stats fallback from flowData
// =====================================================

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Eye, Users, DollarSign, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabType, FlowStats, FlowItem, Direction } from '../shared/types';
import { TABS, COLORS } from '../shared/constants';

// ─────────────────────────────────────────────────────
// Luxury Color Palette
// Gold / Teal / Violet / Rose-Gold / Emerald
// ─────────────────────────────────────────────────────

const STAT_META = [
  {
    key: 'unusualVolume',
    label: 'UNUSUAL VOLUME',
    sublabelKey: 'unusualVolumeSub',
    defaultSublabel: 'alerts today',
    icon: Activity,
    // Warm gold — luxury accent
    iconColor: '#C9A646',
    iconBg:    'rgba(201,166,70,0.14)',
    iconBorder:'rgba(201,166,70,0.35)',
    cardBg:    'linear-gradient(145deg, rgba(201,166,70,0.09) 0%, rgba(201,166,70,0.03) 45%, rgba(12,11,9,0.97) 100%)',
    barColor:  '#C9A646',
    glowColor: 'rgba(201,166,70,0.10)',
    borderColor: 'rgba(201,166,70,0.16)',
    valueColor: '#E8D5A0',
  },
  {
    key: 'darkPoolAlerts',
    label: 'DARK POOL',
    sublabelKey: 'darkPoolSub',
    defaultSublabel: 'prints detected',
    icon: Eye,
    // Cool teal — institutional, sophisticated
    iconColor: '#2DD4BF',
    iconBg:    'rgba(45,212,191,0.12)',
    iconBorder:'rgba(45,212,191,0.30)',
    cardBg:    'linear-gradient(145deg, rgba(45,212,191,0.08) 0%, rgba(45,212,191,0.025) 45%, rgba(12,11,9,0.97) 100%)',
    barColor:  '#2DD4BF',
    glowColor: 'rgba(45,212,191,0.10)',
    borderColor: 'rgba(45,212,191,0.14)',
    valueColor: '#A8E8DF',
  },
  {
    key: 'insiderTrades',
    label: 'INSIDER TRADES',
    sublabelKey: 'insiderSub',
    defaultSublabel: 'last 24h',
    icon: Users,
    // Soft violet — premium, subtle
    iconColor: '#A78BFA',
    iconBg:    'rgba(167,139,250,0.12)',
    iconBorder:'rgba(167,139,250,0.30)',
    cardBg:    'linear-gradient(145deg, rgba(167,139,250,0.08) 0%, rgba(167,139,250,0.025) 45%, rgba(12,11,9,0.97) 100%)',
    barColor:  '#A78BFA',
    glowColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.14)',
    valueColor: '#C4B5FD',
  },
  {
    key: 'confluenceAlerts',
    label: 'CONFLUENCE',
    sublabelKey: 'confluenceSub',
    defaultSublabel: '3+ signals',
    icon: GitMerge,
    // Rose gold — high-alert but elegant
    iconColor: '#F472B6',
    iconBg:    'rgba(244,114,182,0.12)',
    iconBorder:'rgba(244,114,182,0.30)',
    cardBg:    'linear-gradient(145deg, rgba(244,114,182,0.08) 0%, rgba(244,114,182,0.025) 45%, rgba(12,11,9,0.97) 100%)',
    barColor:  '#F472B6',
    glowColor: 'rgba(244,114,182,0.10)',
    borderColor: 'rgba(244,114,182,0.14)',
    valueColor: '#FBCFE8',
  },
  {
    key: 'netFlow',
    label: 'NET FLOW',
    sublabelKey: 'netFlowSub',
    defaultSublabel: 'market inflow',
    icon: DollarSign,
    // Emerald — wealth, money flow
    iconColor: '#34D399',
    iconBg:    'rgba(52,211,153,0.12)',
    iconBorder:'rgba(52,211,153,0.30)',
    cardBg:    'linear-gradient(145deg, rgba(52,211,153,0.08) 0%, rgba(52,211,153,0.025) 45%, rgba(12,11,9,0.97) 100%)',
    barColor:  '#34D399',
    glowColor: 'rgba(52,211,153,0.10)',
    borderColor: 'rgba(52,211,153,0.14)',
    valueColor: '#34D399',
  },
] as const;

// ─────────────────────────────────────────────────────
// Compute stats client-side from flowData
// ─────────────────────────────────────────────────────

export function computeStatsFromFlowData(flowData: FlowItem[]): FlowStats & {
  unusualVolumeSub: string;
  darkPoolSub: string;
  insiderSub: string;
  confluenceSub: string;
  netFlowSub: string;
} {
  const volumeTypes  = ['unusual_volume', 'block_trade', 'sweep', 'short_squeeze'];
  const dpTypes      = ['dark_pool', 'dark_pool_sweep'];
  const insiderTypes = ['insider_buy', 'insider_sell', 'cluster_insider', 'institutional_new', 'institutional_increase', 'institutional_exit'];

  const unusualVolume    = flowData.filter(i => volumeTypes.includes(i.type)).length;
  const darkPoolAlerts   = flowData.filter(i => dpTypes.includes(i.type)).length;
  const insiderTrades    = flowData.filter(i => insiderTypes.includes(i.type)).length;
  const confluenceAlerts = flowData.filter(i => i.type === 'confluence').length;

  const bullish = flowData.filter(i => i.direction === 'bullish').length;
  const bearish = flowData.filter(i => i.direction === 'bearish').length;

  const netDollar = flowData.reduce((sum, item) => {
    const mult = item.direction === 'bullish' ? 1 : item.direction === 'bearish' ? -1 : 0;
    return sum + ((item.volume || 0) * (item.price || 0) * mult);
  }, 0);

  const absVal = Math.abs(netDollar);
  const netFlow =
    absVal >= 1e9 ? `${netDollar >= 0 ? '+' : '-'}$${(absVal / 1e9).toFixed(1)}B` :
    absVal >= 1e6 ? `${netDollar >= 0 ? '+' : '-'}$${(absVal / 1e6).toFixed(0)}M` :
    absVal >= 1e3 ? `${netDollar >= 0 ? '+' : '-'}$${(absVal / 1e3).toFixed(0)}K` : '—';

  const sentiment: Direction = bullish > bearish * 1.5 ? 'bullish'
                             : bearish > bullish * 1.5 ? 'bearish'
                             : 'neutral';

  const netFlowDirection = netDollar >= 0 ? 'market inflow' : 'market outflow';

  return {
    unusualVolume,
    darkPoolAlerts,
    insiderTrades,
    confluenceAlerts,
    netFlow,
    marketSentiment: sentiment,
    unusualVolumeSub:  'alerts today',
    darkPoolSub:       'prints detected',
    insiderSub:        'last 24h',
    confluenceSub:     confluenceAlerts > 0 ? `${confluenceAlerts} multi-signal` : '3+ signals',
    netFlowSub:        netFlowDirection,
  };
}

// ─────────────────────────────────────────────────────
// Quick Stat Card — Luxury Style
// ─────────────────────────────────────────────────────

const QuickStatCard = memo(({ meta, value, sublabel, index }: {
  meta: typeof STAT_META[number];
  value: string | number;
  sublabel: string;
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
                   transition-all duration-300 group-hover:-translate-y-[2px]
                   group-hover:shadow-lg"
        style={{
          background: meta.cardBg,
          border: `1px solid ${meta.borderColor}`,
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
          className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full blur-3xl pointer-events-none
                     opacity-50 group-hover:opacity-70 transition-opacity duration-300"
          style={{ background: meta.glowColor }}
        />

        {/* Top-left subtle glow */}
        <div
          className="absolute -top-6 -left-6 w-20 h-20 rounded-full blur-2xl pointer-events-none opacity-20"
          style={{ background: meta.glowColor }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative">
          <span className="text-[10.5px] font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(160,155,148,0.75)' }}>
            {meta.label}
          </span>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: meta.iconBg,
              border: `1.5px solid ${meta.iconBorder}`,
              boxShadow: `0 0 12px ${meta.iconColor}18`,
            }}
          >
            <Icon className="h-4 w-4" style={{ color: meta.iconColor }} />
          </div>
        </div>

        {/* Value */}
        <div
          className="text-[2rem] font-bold leading-none mb-1.5 tabular-nums relative"
          style={{ color: meta.valueColor ?? '#ffffff' }}
        >
          {value}
        </div>

        {/* Sublabel */}
        <div className="text-[11px] font-medium relative"
          style={{ color: 'rgba(130,125,118,0.8)' }}>
          {sublabel}
        </div>
      </div>
    </motion.div>
  );
});

QuickStatCard.displayName = 'QuickStatCard';

// ─────────────────────────────────────────────────────
// QuickStats — with flowData fallback
// ─────────────────────────────────────────────────────

interface QuickStatsProps {
  stats: FlowStats;
  flowData?: FlowItem[];
}

export const QuickStats = memo(({ stats, flowData }: QuickStatsProps) => {
  const effectiveStats = useMemo(() => {
    const serverHasData =
      stats.unusualVolume > 0 ||
      stats.darkPoolAlerts > 0 ||
      stats.insiderTrades > 0 ||
      stats.confluenceAlerts > 0 ||
      (stats.netFlow !== '—' && stats.netFlow !== '0');

    if (serverHasData) {
      return {
        ...stats,
        unusualVolumeSub:  'alerts today',
        darkPoolSub:       'prints detected',
        insiderSub:        'last 24h',
        confluenceSub:     stats.confluenceAlerts > 0 ? `${stats.confluenceAlerts} multi-signal` : '3+ signals',
        netFlowSub:        stats.netFlow.startsWith('-') ? 'market outflow' : 'market inflow',
      };
    }

    if (flowData && flowData.length > 0) {
      return computeStatsFromFlowData(flowData);
    }

    return {
      ...stats,
      unusualVolumeSub: 'alerts today',
      darkPoolSub: 'prints detected',
      insiderSub: 'last 24h',
      confluenceSub: '3+ signals',
      netFlowSub: 'market inflow',
    };
  }, [stats, flowData]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
      {STAT_META.map((meta, i) => {
        const value = (effectiveStats[meta.key as keyof FlowStats] ?? 0) as string | number;
        const sublabel = (effectiveStats as any)[meta.sublabelKey] || meta.defaultSublabel;

        return (
          <QuickStatCard
            key={meta.key}
            meta={meta}
            value={value}
            sublabel={sublabel}
            index={i}
          />
        );
      })}
    </div>
  );
});

QuickStats.displayName = 'QuickStats';

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