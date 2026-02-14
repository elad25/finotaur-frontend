// src/pages/app/ai/FlowScanner.tsx
// =====================================================
// 🔍 FLOW SCANNER - Premium Gold Design v2.0
// =====================================================
// See what the big money is doing
// Unified design with Stock Analyzer & Options Intelligence
// =====================================================

import { useState, useEffect, useMemo, useCallback, memo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import { 
  Search, TrendingUp, TrendingDown, Activity, Users, Building,
  BarChart3, ArrowUpRight, ArrowDownRight, RefreshCw, Eye,
  DollarSign, Clock, Zap, ChevronRight, Sparkles, X,
  Filter, Loader2, Target, PieChart
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// 🎨 DESIGN SYSTEM - Unified with Stock Analyzer
// =====================================================

const COLORS = {
  gold: '#C9A646',
  goldLight: '#F4D97B',
  goldDark: '#B8963F',
  bgDark: '#0a0a0a',
  bgCard: '#0d0b08',
  bgCardHover: '#151210',
  border: 'rgba(201,166,70,0.15)',
  borderHover: 'rgba(201,166,70,0.3)',
  textPrimary: '#ffffff',
  textSecondary: '#E8DCC4',
  textMuted: '#8B8B8B',
  bullish: '#22C55E',
  bearish: '#EF4444',
  warning: '#F59E0B',
  blue: '#3B82F6',
  purple: '#A855F7',
};

// =====================================================
// 🎯 TYPES
// =====================================================

interface FlowItem {
  id: string;
  ticker: string;
  company: string;
  type: 'unusual_volume' | 'institutional' | 'insider' | 'dark_pool' | 'accumulation';
  direction: 'bullish' | 'bearish' | 'neutral';
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  price: number;
  change: number;
  changePercent: number;
  value: string;
  time: string;
  signal: string;
}

interface SectorFlow {
  sector: string;
  inflow: number;
  outflow: number;
  net: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

type FilterType = 'all' | 'unusual_volume' | 'institutional' | 'insider' | 'dark_pool' | 'accumulation';
type DirectionFilter = 'all' | 'bullish' | 'bearish' | 'neutral';
type TabType = 'all-flow' | 'unusual-volume' | 'institutional' | 'insider' | 'dark-pool' | 'sector-flow';

// =====================================================
// 📊 MOCK DATA
// =====================================================

const mockFlowData: FlowItem[] = [
  {
    id: '1',
    ticker: 'NVDA',
    company: 'NVIDIA Corp',
    type: 'unusual_volume',
    direction: 'bullish',
    volume: 45000000,
    avgVolume: 12000000,
    volumeRatio: 3.75,
    price: 875.50,
    change: 12.30,
    changePercent: 1.42,
    value: '$2.1B',
    time: '10:32 AM',
    signal: 'Volume 3.75x average with price breakout above resistance'
  },
  {
    id: '2',
    ticker: 'AAPL',
    company: 'Apple Inc',
    type: 'institutional',
    direction: 'bullish',
    volume: 28000000,
    avgVolume: 15000000,
    volumeRatio: 1.87,
    price: 182.45,
    change: 2.15,
    changePercent: 1.19,
    value: '$890M',
    time: '11:15 AM',
    signal: 'Berkshire increased position by 2.1M shares in latest 13F'
  },
  {
    id: '3',
    ticker: 'TSLA',
    company: 'Tesla Inc',
    type: 'insider',
    direction: 'bearish',
    volume: 18500000,
    avgVolume: 22000000,
    volumeRatio: 0.84,
    price: 245.80,
    change: -5.40,
    changePercent: -2.15,
    value: '$125M',
    time: '09:45 AM',
    signal: 'CFO sold 50,000 shares at $248 - scheduled sale under 10b5-1'
  },
  {
    id: '4',
    ticker: 'META',
    company: 'Meta Platforms',
    type: 'dark_pool',
    direction: 'bullish',
    volume: 15200000,
    avgVolume: 8500000,
    volumeRatio: 1.79,
    price: 505.20,
    change: 8.75,
    changePercent: 1.76,
    value: '$1.4B',
    time: '12:02 PM',
    signal: '42% of volume in dark pools - institutional accumulation pattern'
  },
  {
    id: '5',
    ticker: 'AMD',
    company: 'Advanced Micro Devices',
    type: 'accumulation',
    direction: 'bullish',
    volume: 32000000,
    avgVolume: 18000000,
    volumeRatio: 1.78,
    price: 178.90,
    change: 4.20,
    changePercent: 2.40,
    value: '$680M',
    time: '11:45 AM',
    signal: '5-day accumulation pattern detected with rising volume'
  },
  {
    id: '6',
    ticker: 'GOOGL',
    company: 'Alphabet Inc',
    type: 'institutional',
    direction: 'neutral',
    volume: 12800000,
    avgVolume: 14000000,
    volumeRatio: 0.91,
    price: 175.30,
    change: 0.45,
    changePercent: 0.26,
    value: '$420M',
    time: '10:58 AM',
    signal: 'ARK sold 120K shares, Vanguard added 85K - mixed signals'
  },
  {
    id: '7',
    ticker: 'MSFT',
    company: 'Microsoft Corp',
    type: 'unusual_volume',
    direction: 'bullish',
    volume: 38000000,
    avgVolume: 22000000,
    volumeRatio: 1.73,
    price: 420.15,
    change: 6.80,
    changePercent: 1.65,
    value: '$1.8B',
    time: '02:15 PM',
    signal: 'Heavy call buying ahead of earnings, volume spike detected'
  },
  {
    id: '8',
    ticker: 'JPM',
    company: 'JPMorgan Chase',
    type: 'insider',
    direction: 'bullish',
    volume: 9500000,
    avgVolume: 8200000,
    volumeRatio: 1.16,
    price: 198.40,
    change: 3.20,
    changePercent: 1.64,
    value: '$245M',
    time: '01:30 PM',
    signal: 'CEO purchased 25,000 shares in open market buy'
  },
];

const sectorFlowData: SectorFlow[] = [
  { sector: 'Technology', inflow: 2.4, outflow: 0.8, net: 1.6, trend: 'bullish' },
  { sector: 'Healthcare', inflow: 0.9, outflow: 1.2, net: -0.3, trend: 'bearish' },
  { sector: 'Financials', inflow: 1.1, outflow: 0.6, net: 0.5, trend: 'bullish' },
  { sector: 'Energy', inflow: 0.4, outflow: 0.9, net: -0.5, trend: 'bearish' },
  { sector: 'Consumer Disc.', inflow: 0.7, outflow: 0.5, net: 0.2, trend: 'neutral' },
  { sector: 'Industrials', inflow: 0.8, outflow: 0.4, net: 0.4, trend: 'bullish' },
  { sector: 'Materials', inflow: 0.3, outflow: 0.4, net: -0.1, trend: 'bearish' },
  { sector: 'Real Estate', inflow: 0.5, outflow: 0.3, net: 0.2, trend: 'bullish' },
  { sector: 'Utilities', inflow: 0.2, outflow: 0.2, net: 0.0, trend: 'neutral' },
];

const quickStats = [
  { label: 'Unusual Volume', value: '47', sublabel: 'stocks today', icon: Activity, color: '#F59E0B' },
  { label: 'Institutional', value: '23', sublabel: '13F changes', icon: Building, color: '#3B82F6' },
  { label: 'Insider Trades', value: '12', sublabel: 'last 24h', icon: Users, color: '#A855F7' },
  { label: 'Net Flow', value: '+$4.2B', sublabel: 'market inflow', icon: DollarSign, color: '#22C55E' },
];

// =====================================================
// 🧩 SKELETON COMPONENTS
// =====================================================

const Skeleton = memo(({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-lg", className)}
    style={{ 
      background: 'linear-gradient(90deg, rgba(201,166,70,0.05) 0%, rgba(201,166,70,0.1) 50%, rgba(201,166,70,0.05) 100%)',
      backgroundSize: '200% 100%',
    }} />
));

const SkeletonCard = memo(({ className, children }: { className?: string; children?: ReactNode }) => (
  <div className={cn("rounded-2xl p-6", className)}
    style={{ 
      background: 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))', 
      border: '1px solid rgba(201,166,70,0.15)' 
    }}>
    {children}
  </div>
));

const LoadingSkeleton = memo(() => (
  <div className="min-h-screen relative overflow-hidden"
    style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0b08 50%, #0a0a0a 100%)' }}>
    
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[10%] left-[5%] w-[800px] h-[800px] rounded-full blur-[180px]"
        style={{ background: 'rgba(201,166,70,0.06)' }} />
      <div className="absolute bottom-[10%] right-[5%] w-[700px] h-[700px] rounded-full blur-[160px]"
        style={{ background: 'rgba(201,166,70,0.04)' }} />
    </div>
    
    <div className="relative z-10 w-full px-6 lg:px-10 py-8 md:py-10">
      <div className="text-center mb-10">
        <Skeleton className="h-10 w-64 mx-auto mb-3" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <SkeletonCard key={i} className="p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-10 w-20 mb-2" />
            <Skeleton className="h-3 w-16" />
          </SkeletonCard>
        ))}
      </div>
      
      <div className="flex justify-center mb-8">
        <Skeleton className="h-12 w-[600px] rounded-xl" />
      </div>
      
      <SkeletonCard className="mb-6">
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-12 flex-1 max-w-sm rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </SkeletonCard>
    </div>
  </div>
));

// =====================================================
// 🧩 UI COMPONENTS
// =====================================================

// Card Component
const Card = memo(({ children, className, highlight = false }: { 
  children: ReactNode; 
  className?: string; 
  highlight?: boolean;
}) => (
  <div className={cn("rounded-2xl overflow-hidden", className)}
    style={{
      background: highlight 
        ? 'linear-gradient(135deg, rgba(201,166,70,0.1), rgba(13,11,8,0.95))'
        : 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
      border: highlight ? '1px solid rgba(201,166,70,0.3)' : '1px solid rgba(201,166,70,0.15)',
    }}>
    {children}
  </div>
));

// Section Header
const SectionHeader = memo(({ icon: Icon, title, subtitle, iconColor = '#C9A646' }: {
  icon: any;
  title: string;
  subtitle?: string;
  iconColor?: string;
}) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
      style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}30` }}>
      <Icon className="w-5 h-5" style={{ color: iconColor }} />
    </div>
    <div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-[#6B6B6B]">{subtitle}</p>}
    </div>
  </div>
));

// Quick Stat Card
const QuickStatCard = memo(({ stat, index }: { stat: typeof quickStats[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <Card>
      <div className="relative p-5">
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${stat.color}, ${stat.color}50)` }} />
        
        <div className="flex items-center gap-2 mb-3">
          <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
          <span className="text-xs text-[#8B8B8B] uppercase tracking-wider">{stat.label}</span>
        </div>
        <div className="text-3xl font-bold mb-1" style={{ color: stat.color === '#22C55E' ? stat.color : '#fff' }}>
          {stat.value}
        </div>
        <div className="text-xs text-[#6B6B6B]">{stat.sublabel}</div>
      </div>
    </Card>
  </motion.div>
));

// Flow Type Config
const getFlowTypeConfig = (type: FlowItem['type']) => {
  const configs = {
    unusual_volume: { label: 'Unusual Volume', color: '#F59E0B', icon: Activity },
    institutional: { label: 'Institutional', color: '#3B82F6', icon: Building },
    insider: { label: 'Insider', color: '#A855F7', icon: Users },
    dark_pool: { label: 'Dark Pool', color: '#8B8B8B', icon: Eye },
    accumulation: { label: 'Accumulation', color: '#22C55E', icon: BarChart3 },
  };
  return configs[type];
};

// Tab Navigation
const TabNav = memo(({ activeTab, onTabChange }: { activeTab: TabType; onTabChange: (tab: TabType) => void }) => {
  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'all-flow', label: 'All Flow', icon: Activity },
    { id: 'unusual-volume', label: 'Unusual', icon: Zap },
    { id: 'institutional', label: 'Institutional', icon: Building },
    { id: 'insider', label: 'Insider', icon: Users },
    { id: 'dark-pool', label: 'Dark Pool', icon: Eye },
    { id: 'sector-flow', label: 'Sectors', icon: PieChart },
  ];
  
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(13,11,8,0.8), rgba(21,18,16,0.8))',
        border: '1px solid rgba(201,166,70,0.15)',
      }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-300",
              isActive ? "text-black" : "text-[#8B8B8B] hover:text-[#C9A646]"
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
  );
});

// Search Bar
const SearchBar = memo(({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div className="relative flex-1 max-w-md">
      <div className={cn(
        "absolute -inset-0.5 rounded-xl transition-opacity duration-300",
        isFocused ? "opacity-100" : "opacity-0"
      )} style={{
        background: 'linear-gradient(135deg, rgba(201,166,70,0.3), rgba(244,217,123,0.1))',
        filter: 'blur(8px)',
      }} />
      
      <div className={cn(
        "relative flex items-center rounded-xl transition-all duration-300",
        isFocused 
          ? "bg-[#151210] border border-[#C9A646]/50" 
          : "bg-[#0d0b08] border border-[#C9A646]/20 hover:border-[#C9A646]/40"
      )}>
        <Search className={cn(
          "absolute left-4 h-4 w-4 transition-colors",
          isFocused ? "text-[#C9A646]" : "text-[#6B6B6B]"
        )} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search ticker or company..."
          className="w-full bg-transparent py-3 pl-11 pr-4 text-white placeholder-[#6B6B6B] focus:outline-none text-sm"
        />
      </div>
    </div>
  );
});

// Filter Select
const FilterSelect = memo(({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all"
        style={{
          background: 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
          border: '1px solid rgba(201,166,70,0.2)',
          color: value === 'all' ? '#8B8B8B' : '#C9A646',
        }}
      >
        <Filter className="h-4 w-4" />
        <span>{selectedOption?.label || placeholder}</span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 min-w-[160px] rounded-xl overflow-hidden z-50"
              style={{
                background: 'linear-gradient(135deg, rgba(13,11,8,0.98), rgba(21,18,16,0.98))',
                border: '1px solid rgba(201,166,70,0.2)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
              }}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => { onChange(option.value); setIsOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 text-left text-sm transition-colors",
                    value === option.value 
                      ? "bg-[#C9A646]/10 text-[#C9A646]" 
                      : "text-[#8B8B8B] hover:bg-white/5 hover:text-white"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});

// Flow Card - Premium Design
const FlowCard = memo(({ item, index, onClick }: { item: FlowItem; index: number; onClick: () => void }) => {
  const typeConfig = getFlowTypeConfig(item.type);
  const TypeIcon = typeConfig.icon;
  const directionColor = item.direction === 'bullish' ? '#22C55E' : item.direction === 'bearish' ? '#EF4444' : '#8B8B8B';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div className="relative p-5 rounded-xl transition-all duration-300 hover:scale-[1.005]"
        style={{ 
          background: 'rgba(255,255,255,0.02)', 
          border: `1px solid ${typeConfig.color}20`,
        }}>
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
          style={{ background: typeConfig.color }} />
        
        <div className="flex items-center gap-6 pl-3">
          {/* Ticker & Company */}
          <div className="min-w-[140px]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold text-white group-hover:text-[#C9A646] transition-colors">
                {item.ticker}
              </span>
              <span className="text-sm text-[#8B8B8B]">${item.price.toFixed(2)}</span>
            </div>
            <p className="text-xs text-[#6B6B6B] truncate max-w-[140px]">{item.company}</p>
          </div>
          
          {/* Type Badge */}
          <div className="flex items-center gap-2 min-w-[130px]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${typeConfig.color}15` }}>
              <TypeIcon className="h-4 w-4" style={{ color: typeConfig.color }} />
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-lg"
              style={{ background: `${typeConfig.color}15`, color: typeConfig.color }}>
              {typeConfig.label}
            </span>
          </div>
          
          {/* Volume Stats */}
          <div className="flex items-center gap-6 flex-1">
            <div>
              <div className="text-xs text-[#6B6B6B] mb-1">Volume</div>
              <div className="text-base font-semibold text-white">
                {(item.volume / 1000000).toFixed(1)}M
              </div>
              <div className={cn("text-xs", item.volumeRatio > 1.5 ? "text-[#F59E0B]" : "text-[#6B6B6B]")}>
                {item.volumeRatio.toFixed(2)}x avg
              </div>
            </div>
            
            <div>
              <div className="text-xs text-[#6B6B6B] mb-1">Value</div>
              <div className="text-base font-semibold text-[#C9A646]">{item.value}</div>
            </div>
            
            <div>
              <div className="text-xs text-[#6B6B6B] mb-1">Time</div>
              <div className="text-base font-semibold text-white">{item.time}</div>
            </div>
          </div>
          
          {/* Direction & Change */}
          <div className="text-right min-w-[100px]">
            <div className="flex items-center justify-end gap-1 mb-2">
              {item.direction === 'bullish' ? (
                <ArrowUpRight className="h-5 w-5 text-[#22C55E]" />
              ) : item.direction === 'bearish' ? (
                <ArrowDownRight className="h-5 w-5 text-[#EF4444]" />
              ) : null}
              <span className="text-lg font-bold" style={{ color: directionColor }}>
                {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
              </span>
            </div>
            <span className="text-xs px-3 py-1 rounded-full capitalize"
              style={{ 
                background: `${directionColor}15`, 
                color: directionColor,
              }}>
              {item.direction}
            </span>
          </div>
          
          <ChevronRight className="h-5 w-5 text-[#6B6B6B] group-hover:text-[#C9A646] group-hover:translate-x-1 transition-all" />
        </div>
        
        {/* Signal - Bottom */}
        <div className="mt-4 pt-4 border-t border-white/5 pl-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-[#C9A646]" />
            <span className="text-xs text-[#A0A0A0]">{item.signal}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// Sector Flow Card
const SectorFlowCard = memo(({ sector, index }: { sector: SectorFlow; index: number }) => {
  const trendColor = sector.trend === 'bullish' ? '#22C55E' : sector.trend === 'bearish' ? '#EF4444' : '#8B8B8B';
  const netPositive = sector.net >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card>
        <div className="relative p-5">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: `linear-gradient(90deg, ${trendColor}, transparent)` }} />
          
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-white">{sector.sector}</span>
            <span className="text-xs px-3 py-1 rounded-full capitalize flex items-center gap-1"
              style={{ background: `${trendColor}15`, color: trendColor }}>
              {sector.trend === 'bullish' ? <TrendingUp className="h-3 w-3" /> : 
               sector.trend === 'bearish' ? <TrendingDown className="h-3 w-3" /> : null}
              {sector.trend}
            </span>
          </div>
          
          {/* Flow Bars */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#6B6B6B]">Inflow</span>
                <span className="text-[#22C55E]">${sector.inflow}B</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#22C55E] rounded-full transition-all"
                  style={{ width: `${(sector.inflow / 3) * 100}%` }} />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#6B6B6B]">Outflow</span>
                <span className="text-[#EF4444]">${sector.outflow}B</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#EF4444] rounded-full transition-all"
                  style={{ width: `${(sector.outflow / 3) * 100}%` }} />
              </div>
            </div>
          </div>
          
          {/* Net Flow */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-[#6B6B6B]">Net Flow</span>
            <span className="text-lg font-bold" style={{ color: netPositive ? '#22C55E' : '#EF4444' }}>
              {netPositive ? '+' : ''}${sector.net}B
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

// Signal Feed Item
const SignalFeedItem = memo(({ item, index }: { item: FlowItem; index: number }) => {
  const directionColor = item.direction === 'bullish' ? '#22C55E' : item.direction === 'bearish' ? '#EF4444' : '#8B8B8B';
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5"
    >
      <div className="flex items-center gap-2 text-[#6B6B6B]">
        <Clock className="h-4 w-4" />
        <span className="text-xs">{item.time}</span>
      </div>
      
      <div className="w-px h-8 bg-[#C9A646]/20" />
      
      <span className="font-bold text-[#C9A646] min-w-[60px]">{item.ticker}</span>
      
      <p className="text-sm text-[#A0A0A0] flex-1 line-clamp-1">{item.signal}</p>
      
      <div className="flex items-center gap-1">
        {item.direction === 'bullish' ? (
          <ArrowUpRight className="h-4 w-4" style={{ color: directionColor }} />
        ) : item.direction === 'bearish' ? (
          <ArrowDownRight className="h-4 w-4" style={{ color: directionColor }} />
        ) : null}
        <span className="text-sm font-semibold" style={{ color: directionColor }}>
          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
        </span>
      </div>
    </motion.div>
  );
});

// Flow Detail Drawer
const FlowDrawer = memo(({ isOpen, onClose, flow }: { 
  isOpen: boolean; 
  onClose: () => void; 
  flow: FlowItem | null;
}) => {
  if (!isOpen || !flow) return null;
  
  const typeConfig = getFlowTypeConfig(flow.type);
  const TypeIcon = typeConfig.icon;
  const directionColor = flow.direction === 'bullish' ? '#22C55E' : flow.direction === 'bearish' ? '#EF4444' : '#8B8B8B';
  
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[998]"
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 bottom-0 w-[500px] z-[999] flex flex-col"
        style={{ 
          background: 'linear-gradient(135deg, #0d0b08, #151210)', 
          borderLeft: '1px solid rgba(201,166,70,0.2)',
        }}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-[#C9A646]/10">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, #C9A646, #F4D97B, #C9A646, transparent)' }} />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))',
                  border: '2px solid rgba(201,166,70,0.3)',
                }}>
                <span className="text-[#C9A646] font-bold text-lg">{flow.ticker.slice(0, 2)}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{flow.ticker}</h3>
                <p className="text-sm text-[#6B6B6B]">{flow.company}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 border border-transparent hover:border-[#C9A646]/30 transition-all"
            >
              <X className="h-5 w-5 text-[#8B8B8B]" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Type & Direction */}
          <div className="flex gap-3">
            <span className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: `${typeConfig.color}15`, color: typeConfig.color }}>
              <TypeIcon className="h-4 w-4" />
              {typeConfig.label}
            </span>
            <span className="px-4 py-2 rounded-xl text-sm font-medium capitalize"
              style={{ background: `${directionColor}15`, color: directionColor }}>
              {flow.direction} Signal
            </span>
          </div>
          
          {/* Price & Change */}
          <Card>
            <div className="p-5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-[#6B6B6B] mb-1">Current Price</div>
                  <div className="text-4xl font-bold text-white">${flow.price.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    {flow.direction === 'bullish' ? (
                      <ArrowUpRight className="h-6 w-6" style={{ color: directionColor }} />
                    ) : flow.direction === 'bearish' ? (
                      <ArrowDownRight className="h-6 w-6" style={{ color: directionColor }} />
                    ) : null}
                    <span className="text-2xl font-bold" style={{ color: directionColor }}>
                      {flow.changePercent >= 0 ? '+' : ''}{flow.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-sm" style={{ color: directionColor }}>
                    {flow.change >= 0 ? '+' : ''}${flow.change.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Volume', value: `${(flow.volume / 1000000).toFixed(1)}M`, icon: BarChart3 },
              { label: 'Vol Ratio', value: `${flow.volumeRatio.toFixed(2)}x`, icon: Activity, color: flow.volumeRatio > 1.5 ? '#F59E0B' : undefined },
              { label: 'Value', value: flow.value, icon: DollarSign, color: '#C9A646' },
              { label: 'Time', value: flow.time, icon: Clock },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="h-4 w-4 text-[#6B6B6B]" />
                  <span className="text-[10px] text-[#6B6B6B] uppercase tracking-wider">{stat.label}</span>
                </div>
                <div className="text-xl font-bold" style={{ color: stat.color || '#fff' }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
          
          {/* Signal - Highlighted */}
          <Card highlight>
            <div className="relative p-5">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] to-transparent" />
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-[#C9A646]" />
                <span className="text-sm text-[#C9A646] font-bold">Signal Analysis</span>
              </div>
              <p className="text-[#E8DCC4] leading-relaxed">{flow.signal}</p>
            </div>
          </Card>
          
          {/* Volume Analysis */}
          <Card>
            <div className="p-5">
              <h4 className="text-sm font-semibold text-white mb-4">Volume Analysis</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-[#6B6B6B]">Today's Volume</span>
                    <span className="text-white">{(flow.volume / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ 
                        width: `${Math.min(flow.volumeRatio * 30, 100)}%`,
                        background: flow.volumeRatio > 2 
                          ? 'linear-gradient(90deg, #F59E0B, #FBBF24)' 
                          : 'linear-gradient(90deg, #C9A646, #F4D97B)',
                      }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-[#6B6B6B]">Average Volume</span>
                    <span className="text-[#8B8B8B]">{(flow.avgVolume / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#6B6B6B] rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-[#C9A646]/10">
          <button className="w-full py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
              color: '#000',
              boxShadow: '0 4px 20px rgba(201,166,70,0.3)',
            }}>
            Add to Watchlist
          </button>
        </div>
      </motion.div>
    </>
  );
});

// =====================================================
// 🚀 MAIN COMPONENT
// =====================================================

function FlowScannerContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDirection, setFilterDirection] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<TabType>('all-flow');
  const [selectedFlow, setSelectedFlow] = useState<FlowItem | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);
  
  // Filtered data
  const filteredData = useMemo(() => {
    let data = mockFlowData;
    
    // Tab filter
    if (activeTab === 'unusual-volume') data = data.filter(i => i.type === 'unusual_volume');
    else if (activeTab === 'institutional') data = data.filter(i => i.type === 'institutional');
    else if (activeTab === 'insider') data = data.filter(i => i.type === 'insider');
    else if (activeTab === 'dark-pool') data = data.filter(i => i.type === 'dark_pool');
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(i => 
        i.ticker.toLowerCase().includes(query) || 
        i.company.toLowerCase().includes(query)
      );
    }
    
    // Type filter
    if (filterType !== 'all') {
      data = data.filter(i => i.type === filterType);
    }
    
    // Direction filter
    if (filterDirection !== 'all') {
      data = data.filter(i => i.direction === filterDirection);
    }
    
    return data;
  }, [activeTab, searchQuery, filterType, filterDirection]);
  
  const handleFlowClick = useCallback((flow: FlowItem) => {
    setSelectedFlow(flow);
  }, []);
  
  const handleCloseDrawer = useCallback(() => {
    setSelectedFlow(null);
  }, []);
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #0d0b08 50%, #0a0a0a 100%)' }}>
      
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-[800px] h-[800px] rounded-full blur-[180px]"
          style={{ background: 'rgba(201,166,70,0.06)' }} />
        <div className="absolute bottom-[10%] right-[5%] w-[700px] h-[700px] rounded-full blur-[160px]"
          style={{ background: 'rgba(201,166,70,0.04)' }} />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px]"
          style={{ background: 'rgba(244,217,123,0.03)' }} />
      </div>
      
      <div className="relative z-10 w-full px-6 lg:px-10 py-8 md:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="text-white">Flow </span>
            <span style={{
              background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Scanner</span>
          </h1>
          <p className="text-[#8B8B8B]">Track institutional moves, insider activity, and unusual volume</p>
        </motion.div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat, idx) => (
            <QuickStatCard key={stat.label} stat={stat} index={idx} />
          ))}
        </div>
        
        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        </motion.div>
        
        {/* Main Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'sector-flow' ? (
            <motion.div
              key="sector-flow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {sectorFlowData.map((sector, idx) => (
                <SectorFlowCard key={sector.sector} sector={sector} index={idx} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="flow-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="mb-8">
                <div className="p-6 md:p-8">
                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />
                    
                    <FilterSelect
                      value={filterType}
                      onChange={setFilterType}
                      placeholder="Flow Type"
                      options={[
                        { value: 'all', label: 'All Types' },
                        { value: 'unusual_volume', label: 'Unusual Volume' },
                        { value: 'institutional', label: 'Institutional' },
                        { value: 'insider', label: 'Insider' },
                        { value: 'dark_pool', label: 'Dark Pool' },
                        { value: 'accumulation', label: 'Accumulation' },
                      ]}
                    />
                    
                    <FilterSelect
                      value={filterDirection}
                      onChange={setFilterDirection}
                      placeholder="Direction"
                      options={[
                        { value: 'all', label: 'All Directions' },
                        { value: 'bullish', label: 'Bullish' },
                        { value: 'bearish', label: 'Bearish' },
                        { value: 'neutral', label: 'Neutral' },
                      ]}
                    />
                    
                    <button className="ml-auto flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-[#C9A646] transition-all hover:bg-[#C9A646]/10"
                      style={{ border: '1px solid rgba(201,166,70,0.2)' }}>
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </button>
                  </div>
                  
                  {/* Flow List */}
                  <div className="space-y-3">
                    {filteredData.length > 0 ? (
                      filteredData.map((item, idx) => (
                        <FlowCard 
                          key={item.id} 
                          item={item} 
                          index={idx}
                          onClick={() => handleFlowClick(item)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Search className="h-12 w-12 text-[#6B6B6B] mx-auto mb-4" />
                        <p className="text-[#8B8B8B]">No flows match your filters</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Live Signal Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <div className="p-6 md:p-8">
              <SectionHeader 
                icon={Zap} 
                title="Live Signal Feed" 
                subtitle="Real-time alerts from flow analysis"
                iconColor="#F59E0B"
              />
              
              <div className="space-y-3">
                {mockFlowData.slice(0, 5).map((item, idx) => (
                  <SignalFeedItem key={item.id} item={item} index={idx} />
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
        
        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center pt-8 mt-8 border-t border-[#C9A646]/10"
        >
          <p className="text-xs text-[#6B6B6B]">
            Data refreshes every 30 seconds
            <span className="mx-2">•</span>
            Last update: {new Date().toLocaleTimeString()}
          </p>
        </motion.div>
      </div>
      
      {/* Flow Detail Drawer */}
      <AnimatePresence>
        <FlowDrawer 
          isOpen={!!selectedFlow} 
          onClose={handleCloseDrawer} 
          flow={selectedFlow}
        />
      </AnimatePresence>
    </div>
  );
}

export default function FlowScanner() {
  const { canAccessPage, loading: accessLoading } = usePlatformAccess();
  const access = canAccessPage('flow_scanner');
  if (accessLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A646]" />
      </div>
    );
  }

  if (!access.hasAccess) {
    return (
      <UpgradeGate
        feature="Flow Scanner"
        reason={access.reason}
        message={access.message}
        upgradeTarget={access.upgradeTarget}
        upgradeDisplayName={access.upgradeDisplayName}
        upgradePrice={access.upgradePrice}
      />
    );
  }
  return <FlowScannerContent />;
}