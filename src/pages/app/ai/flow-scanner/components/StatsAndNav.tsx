// =====================================================
// 📊 FLOW SCANNER - Stats & Tab Navigation
// =====================================================

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Building, Users, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabType, FlowStats } from '../shared/types';
import { TABS } from '../shared/constants';
import { Card } from '../shared/Ui';

// =====================================================
// Quick Stat Card
// =====================================================

const STAT_META = [
  { key: 'unusualVolume', label: 'Unusual Volume', sublabel: 'stocks today', icon: Activity, color: '#F59E0B' },
  { key: 'institutional',  label: 'Institutional',  sublabel: '13F changes',  icon: Building,  color: '#3B82F6' },
  { key: 'insiderTrades',  label: 'Insider Trades', sublabel: 'last 24h',     icon: Users,     color: '#A855F7' },
  { key: 'netFlow',        label: 'Net Flow',        sublabel: 'market inflow', icon: DollarSign, color: '#22C55E' },
] as const;

const QuickStatCard = memo(({ meta, value, index }: {
  meta: typeof STAT_META[number];
  value: string | number;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <Card>
      <div className="relative p-5">
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${meta.color}, ${meta.color}50)` }} />
        <div className="flex items-center gap-2 mb-3">
          <meta.icon className="h-4 w-4" style={{ color: meta.color }} />
          <span className="text-xs text-[#8B8B8B] uppercase tracking-wider">{meta.label}</span>
        </div>
        <div className="text-3xl font-bold mb-1"
          style={{ color: meta.color === '#22C55E' ? meta.color : '#fff' }}>
          {value}
        </div>
        <div className="text-xs text-[#6B6B6B]">{meta.sublabel}</div>
      </div>
    </Card>
  </motion.div>
));

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
