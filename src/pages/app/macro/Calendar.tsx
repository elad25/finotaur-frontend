'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calendar, Clock, TrendingUp, Bell, ChevronLeft, ChevronRight,
  Filter, Globe, Building2, BarChart3, Users, DollarSign, Flame, Eye,
  AlertTriangle, Zap, Star, Activity, Target, Layers, Map, Info,
  ArrowRight, Sparkles, CircleDot
} from 'lucide-react';

// ============================================================
// TYPES & INTERFACES
// ============================================================

type ImpactLevel = 'high' | 'medium' | 'low';
type EventCategory = 'inflation' | 'growth' | 'employment' | 'central_bank' | 'earnings' | 'global_macro';
type Region = 'US' | 'EU' | 'UK' | 'JP' | 'CN' | 'AU' | 'CA' | 'Global';
type ViewMode = 'today' | 'week' | 'month' | 'impact';
type MacroRegime = 'high_volatility' | 'mixed' | 'risk_on' | 'risk_off';

interface EconomicEvent {
  id: string;
  name: string;
  shortName: string;
  country: Region;
  time: string;
  date: string;
  forecast?: string;
  previous?: string;
  actual?: string;
  impact: ImpactLevel;
  category: EventCategory;
  narrative?: string;
  assetsImpacted?: { asset: string; impact: ImpactLevel }[];
  historicalMove?: number;
  sensitivityScore?: number;
}

interface EventCluster {
  name: string;
  events: string[];
  severity: 'extreme' | 'high' | 'moderate';
  description: string;
}

// ============================================================
// MOCK DATA
// ============================================================

const FLAGS: Record<Region, string> = {
  US: '🇺🇸',
  EU: '🇪🇺',
  UK: '🇬🇧',
  JP: '🇯🇵',
  CN: '🇨🇳',
  AU: '🇦🇺',
  CA: '🇨🇦',
  Global: '🌍'
};

const CATEGORY_CONFIG: Record<EventCategory, { icon: React.ReactNode; label: string; color: string }> = {
  inflation: { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Inflation', color: 'text-rose-400' },
  growth: { icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Growth', color: 'text-blue-400' },
  employment: { icon: <Users className="w-3.5 h-3.5" />, label: 'Employment', color: 'text-violet-400' },
  central_bank: { icon: <Building2 className="w-3.5 h-3.5" />, label: 'Central Banks', color: 'text-amber-400' },
  earnings: { icon: <DollarSign className="w-3.5 h-3.5" />, label: 'Earnings', color: 'text-emerald-400' },
  global_macro: { icon: <Globe className="w-3.5 h-3.5" />, label: 'Global Macro', color: 'text-cyan-400' }
};

const mockEvents: EconomicEvent[] = [
  {
    id: '1',
    name: 'Consumer Price Index YoY',
    shortName: 'CPI YoY',
    country: 'US',
    time: '15:30',
    date: '2025-01-15',
    forecast: '3.4%',
    previous: '3.1%',
    impact: 'high',
    category: 'inflation',
    narrative: 'Higher print may pressure yields and hit Big Tech hard. Watch for 10Y reaction.',
    assetsImpacted: [
      { asset: 'S&P 500', impact: 'high' },
      { asset: 'USD', impact: 'high' },
      { asset: 'Gold', impact: 'medium' },
      { asset: 'Yields', impact: 'high' }
    ],
    historicalMove: 1.2,
    sensitivityScore: 92
  },
  {
    id: '2',
    name: 'Core CPI MoM',
    shortName: 'Core CPI',
    country: 'US',
    time: '15:30',
    date: '2025-01-15',
    forecast: '0.3%',
    previous: '0.2%',
    impact: 'high',
    category: 'inflation',
    narrative: 'Core inflation sticky above 0.3% could delay Fed cuts. NASDAQ most exposed.',
    assetsImpacted: [
      { asset: 'NASDAQ', impact: 'high' },
      { asset: 'DXY', impact: 'medium' }
    ],
    historicalMove: 0.9,
    sensitivityScore: 88
  },
  {
    id: '3',
    name: 'Fed Chair Powell Speech',
    shortName: 'Powell Speech',
    country: 'US',
    time: '19:00',
    date: '2025-01-15',
    impact: 'high',
    category: 'central_bank',
    narrative: 'Markets await guidance on rate path. Any hawkish tone could reverse risk-on sentiment.',
    assetsImpacted: [
      { asset: 'All Markets', impact: 'high' }
    ],
    historicalMove: 0.8,
    sensitivityScore: 85
  },
  {
    id: '4',
    name: 'Manufacturing PMI',
    shortName: 'PMI',
    country: 'EU',
    time: '11:00',
    date: '2025-01-15',
    forecast: '47.2',
    previous: '46.8',
    impact: 'medium',
    category: 'growth',
    narrative: 'Europe manufacturing remains in contraction. Watch EUR/USD for breakout.',
    assetsImpacted: [
      { asset: 'EUR/USD', impact: 'medium' },
      { asset: 'DAX', impact: 'medium' }
    ],
    historicalMove: 0.4,
    sensitivityScore: 55
  },
  {
    id: '5',
    name: 'Initial Jobless Claims',
    shortName: 'Claims',
    country: 'US',
    time: '15:30',
    date: '2025-01-15',
    forecast: '215K',
    previous: '211K',
    impact: 'low',
    category: 'employment',
    narrative: 'Weekly claims remain stable. Low market impact unless major deviation.',
    historicalMove: 0.2,
    sensitivityScore: 25
  },
  {
    id: '6',
    name: 'Retail Sales MoM',
    shortName: 'Retail Sales',
    country: 'US',
    time: '15:30',
    date: '2025-01-16',
    forecast: '0.4%',
    previous: '0.7%',
    impact: 'medium',
    category: 'growth',
    narrative: 'Consumer spending gauge. Weakness could signal recession fears returning.',
    assetsImpacted: [
      { asset: 'Consumer Stocks', impact: 'high' },
      { asset: 'S&P 500', impact: 'medium' }
    ],
    historicalMove: 0.5,
    sensitivityScore: 62
  },
  {
    id: '7',
    name: 'Bank of Japan Rate Decision',
    shortName: 'BoJ Rate',
    country: 'JP',
    time: '03:00',
    date: '2025-01-16',
    forecast: '0.25%',
    previous: '0.25%',
    impact: 'high',
    category: 'central_bank',
    narrative: 'YCC policy shift watch. Any hawkish surprise could trigger carry trade unwind.',
    assetsImpacted: [
      { asset: 'USD/JPY', impact: 'high' },
      { asset: 'Nikkei', impact: 'high' },
      { asset: 'JGBs', impact: 'high' }
    ],
    historicalMove: 1.1,
    sensitivityScore: 78
  },
  {
    id: '8',
    name: 'UK CPI YoY',
    shortName: 'UK CPI',
    country: 'UK',
    time: '09:00',
    date: '2025-01-16',
    forecast: '4.1%',
    previous: '3.9%',
    impact: 'high',
    category: 'inflation',
    narrative: 'UK inflation reaccelerating. BoE rate cut expectations may shift.',
    assetsImpacted: [
      { asset: 'GBP/USD', impact: 'high' },
      { asset: 'FTSE 100', impact: 'medium' }
    ],
    historicalMove: 0.7,
    sensitivityScore: 72
  },
  {
    id: '9',
    name: 'ECB Rate Decision',
    shortName: 'ECB Rate',
    country: 'EU',
    time: '14:15',
    date: '2025-01-17',
    forecast: '4.00%',
    previous: '4.25%',
    impact: 'high',
    category: 'central_bank',
    narrative: '25bp cut priced in. Forward guidance on pace of cuts is the key driver.',
    assetsImpacted: [
      { asset: 'EUR/USD', impact: 'high' },
      { asset: 'Euro Stoxx', impact: 'high' },
      { asset: 'Bunds', impact: 'high' }
    ],
    historicalMove: 0.9,
    sensitivityScore: 82
  },
  {
    id: '10',
    name: 'China GDP YoY',
    shortName: 'CN GDP',
    country: 'CN',
    time: '04:00',
    date: '2025-01-17',
    forecast: '5.0%',
    previous: '4.9%',
    impact: 'high',
    category: 'growth',
    narrative: 'China growth stabilizing but property sector remains weak. Commodity currencies in focus.',
    assetsImpacted: [
      { asset: 'Hang Seng', impact: 'high' },
      { asset: 'AUD/USD', impact: 'high' },
      { asset: 'Copper', impact: 'high' }
    ],
    historicalMove: 0.8,
    sensitivityScore: 75
  },
  {
    id: '11',
    name: 'NVIDIA Earnings',
    shortName: 'NVDA',
    country: 'US',
    time: '21:00',
    date: '2025-01-17',
    forecast: '$5.40',
    previous: '$4.93',
    impact: 'high',
    category: 'earnings',
    narrative: 'AI demand bellwether. Guidance critical for entire tech sector momentum.',
    assetsImpacted: [
      { asset: 'NASDAQ', impact: 'high' },
      { asset: 'SMH', impact: 'high' },
      { asset: 'Tech Sector', impact: 'high' }
    ],
    historicalMove: 2.1,
    sensitivityScore: 95
  },
  {
    id: '12',
    name: 'OPEC+ Meeting',
    shortName: 'OPEC+',
    country: 'Global',
    time: '12:00',
    date: '2025-01-18',
    impact: 'high',
    category: 'global_macro',
    narrative: 'Production cuts under review. Oil volatility expected regardless of outcome.',
    assetsImpacted: [
      { asset: 'Crude Oil', impact: 'high' },
      { asset: 'Energy Stocks', impact: 'high' },
      { asset: 'CAD', impact: 'medium' }
    ],
    historicalMove: 1.5,
    sensitivityScore: 80
  },
  {
    id: '13',
    name: 'Non-Farm Payrolls',
    shortName: 'NFP',
    country: 'US',
    time: '15:30',
    date: '2025-01-19',
    forecast: '175K',
    previous: '199K',
    impact: 'high',
    category: 'employment',
    narrative: 'Key Fed input. Strong number = hawkish Fed fears. Weak = recession concerns.',
    assetsImpacted: [
      { asset: 'S&P 500', impact: 'high' },
      { asset: 'USD', impact: 'high' },
      { asset: 'Gold', impact: 'high' },
      { asset: 'Yields', impact: 'high' }
    ],
    historicalMove: 1.3,
    sensitivityScore: 94
  },
  {
    id: '14',
    name: 'Unemployment Rate',
    shortName: 'Unemployment',
    country: 'US',
    time: '15:30',
    date: '2025-01-19',
    forecast: '3.8%',
    previous: '3.7%',
    impact: 'high',
    category: 'employment',
    narrative: 'Rising unemployment triggers recession indicators. Watch for 4.0% threshold.',
    assetsImpacted: [
      { asset: 'USD', impact: 'medium' }
    ],
    historicalMove: 0.6,
    sensitivityScore: 70
  },
  {
    id: '15',
    name: 'FOMC Rate Decision',
    shortName: 'FOMC',
    country: 'US',
    time: '21:00',
    date: '2025-01-22',
    forecast: '5.25%',
    previous: '5.50%',
    impact: 'high',
    category: 'central_bank',
    narrative: 'Dot plot and SEP updates crucial. Market pricing 25bp cut — deviation = volatility.',
    assetsImpacted: [
      { asset: 'All Markets', impact: 'high' }
    ],
    historicalMove: 1.8,
    sensitivityScore: 98
  },
  {
    id: '16',
    name: 'Australia Employment Change',
    shortName: 'AU Jobs',
    country: 'AU',
    time: '02:30',
    date: '2025-01-20',
    forecast: '25.0K',
    previous: '15.3K',
    impact: 'medium',
    category: 'employment',
    narrative: 'RBA watching labor market closely. Strong print could delay rate cuts.',
    assetsImpacted: [
      { asset: 'AUD/USD', impact: 'high' }
    ],
    historicalMove: 0.4,
    sensitivityScore: 48
  }
];

const macroRegime: { regime: MacroRegime; themes: string[]; assetFocus: string } = {
  regime: 'high_volatility',
  themes: [
    'Tech momentum depends on CPI print',
    'USD liquidity tightening ahead of FOMC',
    'Europe macro divergence widening'
  ],
  assetFocus: 'Tech / USD / Bonds'
};

const eventClusters: EventCluster[] = [
  {
    name: 'Inflation + Fed Cluster',
    events: ['CPI', 'Core CPI', 'Powell Speech'],
    severity: 'extreme',
    description: 'Triple threat day — expect elevated VIX'
  },
  {
    name: 'Employment Super Friday',
    events: ['NFP', 'Unemployment Rate'],
    severity: 'high',
    description: 'Fed-watch employment combo'
  },
  {
    name: 'Central Bank Week',
    events: ['BoJ', 'ECB', 'FOMC'],
    severity: 'extreme',
    description: 'Three major central banks — cross-asset volatility'
  }
];

const fedWatchProbabilities = {
  currentRate: '5.25-5.50%',
  nextMeeting: 'January 29, 2025',
  probabilities: [
    { rate: '5.25-5.50%', probability: 12.3 },
    { rate: '5.00-5.25%', probability: 67.8 },
    { rate: '4.75-5.00%', probability: 19.9 }
  ]
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const getImpactDot = (impact: ImpactLevel): string => {
  switch (impact) {
    case 'high': return 'bg-rose-500';
    case 'medium': return 'bg-amber-500';
    case 'low': return 'bg-emerald-500';
  }
};

const getRegimeConfig = (regime: MacroRegime) => {
  switch (regime) {
    case 'high_volatility': return { 
      color: 'text-rose-400', 
      bg: 'bg-rose-500/10', 
      border: 'border-rose-500/30',
      icon: <Activity className="w-4 h-4" />, 
      label: 'High Volatility Week' 
    };
    case 'mixed': return { 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10', 
      border: 'border-amber-500/30',
      icon: <AlertTriangle className="w-4 h-4" />, 
      label: 'Mixed Signals' 
    };
    case 'risk_on': return { 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10', 
      border: 'border-emerald-500/30',
      icon: <TrendingUp className="w-4 h-4" />, 
      label: 'Risk-On Environment' 
    };
    case 'risk_off': return { 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10', 
      border: 'border-blue-500/30',
      icon: <Target className="w-4 h-4" />, 
      label: 'Risk-Off / Defensive' 
    };
  }
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const isToday = (dateStr: string): boolean => {
  const today = new Date('2025-01-15');
  const date = new Date(dateStr);
  return date.toDateString() === today.toDateString();
};

const isTomorrow = (dateStr: string): boolean => {
  const tomorrow = new Date('2025-01-16');
  const date = new Date(dateStr);
  return date.toDateString() === tomorrow.toDateString();
};

// ============================================================
// COMPONENTS
// ============================================================

// Tooltip Component
const Tooltip: React.FC<{ children: React.ReactNode; content: string }> = ({ children, content }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 whitespace-nowrap z-50 animate-in fade-in slide-in-from-bottom-1 duration-150">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
        </div>
      )}
    </div>
  );
};

// Impact Stars Component with Tooltip
const ImpactStars: React.FC<{ impact: ImpactLevel; size?: 'sm' | 'md'; showTooltip?: boolean }> = ({ 
  impact, 
  size = 'md',
  showTooltip = true
}) => {
  const starCount = impact === 'high' ? 3 : impact === 'medium' ? 2 : 1;
  const starSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const gapSize = size === 'sm' ? 'gap-0.5' : 'gap-0.5';
  
  const colorClass = impact === 'high' 
    ? 'text-rose-400' 
    : impact === 'medium' 
      ? 'text-amber-400' 
      : 'text-emerald-400';
  
  const tooltipText = impact === 'high' 
    ? 'High Market Sensitivity — Major price action expected'
    : impact === 'medium'
      ? 'Medium Market Sensitivity — Moderate volatility'
      : 'Low Market Sensitivity — Limited impact';
  
  const stars = (
    <div className={`flex items-center ${gapSize}`}>
      {[1, 2, 3].map((star) => (
        <Star
          key={star}
          className={`${starSize} ${star <= starCount ? colorClass : 'text-zinc-700'} ${star <= starCount ? 'fill-current' : ''}`}
        />
      ))}
    </div>
  );
  
  if (showTooltip) {
    return <Tooltip content={tooltipText}>{stars}</Tooltip>;
  }
  
  return stars;
};

// Sensitivity Bar Component
const SensitivityBar: React.FC<{ score: number }> = ({ score }) => {
  const getBarColor = (score: number) => {
    if (score >= 80) return 'from-rose-500 to-rose-400';
    if (score >= 50) return 'from-amber-500 to-amber-400';
    return 'from-emerald-500 to-emerald-400';
  };
  
  return (
    <Tooltip content={`Market Sensitivity: ${score}%`}>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${getBarColor(score)} rounded-full transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">{score}%</span>
      </div>
    </Tooltip>
  );
};

// Macro Regime Badge
const MacroRegimeBadge: React.FC = () => {
  const config = getRegimeConfig(macroRegime.regime);
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg} ${config.color} border ${config.border}`}>
      {config.icon}
      <span className="font-medium text-sm">{config.label}</span>
    </div>
  );
};

// Region Overview Mini Map
const RegionOverview: React.FC<{ events: EconomicEvent[] }> = ({ events }) => {
  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => {
      counts[e.country] = (counts[e.country] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [events]);
  
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Map className="w-4 h-4 text-zinc-500" />
        <span className="text-zinc-400 text-xs uppercase tracking-wider font-medium">Events by Region</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {regionCounts.slice(0, 6).map(([region, count]) => (
          <div key={region} className="flex items-center justify-between px-2 py-1.5 bg-zinc-800/50 rounded-lg">
            <span className="text-sm">{FLAGS[region as Region]} {region}</span>
            <span className="text-zinc-400 text-sm font-mono">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Event Clusters Card
const EventClustersCard: React.FC = () => {
  const getSeverityColor = (severity: 'extreme' | 'high' | 'moderate') => {
    switch (severity) {
      case 'extreme': return 'border-rose-500/40 bg-rose-500/5';
      case 'high': return 'border-amber-500/40 bg-amber-500/5';
      case 'moderate': return 'border-blue-500/40 bg-blue-500/5';
    }
  };
  
  const getSeverityBadge = (severity: 'extreme' | 'high' | 'moderate') => {
    switch (severity) {
      case 'extreme': return <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 text-[10px] uppercase tracking-wider rounded font-medium">Extreme</span>;
      case 'high': return <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] uppercase tracking-wider rounded font-medium">High</span>;
      case 'moderate': return <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] uppercase tracking-wider rounded font-medium">Moderate</span>;
    }
  };
  
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-rose-400" />
        <span className="text-rose-400 text-xs uppercase tracking-wider font-medium">Event Clusters</span>
        <Tooltip content="Multiple high-impact events concentrated together">
          <Info className="w-3.5 h-3.5 text-zinc-600 cursor-help" />
        </Tooltip>
      </div>
      <div className="space-y-2">
        {eventClusters.map((cluster, i) => (
          <div key={i} className={`p-2.5 rounded-lg border ${getSeverityColor(cluster.severity)}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-zinc-200 text-sm font-medium">{cluster.name}</span>
              {getSeverityBadge(cluster.severity)}
            </div>
            <p className="text-zinc-500 text-xs">{cluster.description}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {cluster.events.map((event, j) => (
                <span key={j} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] rounded">
                  {event}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Week Themes Card (Enhanced)
const WeekThemesCard: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/50 border border-amber-500/20 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-amber-400" />
          <h3 className="text-amber-400 font-semibold tracking-wide text-sm uppercase">Week in One Look</h3>
        </div>
        <MacroRegimeBadge />
      </div>
      
      <div className="space-y-4">
        <div>
          <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1.5">
            <Flame className="w-3 h-3 text-orange-400" />
            Hot Themes
          </span>
          <ul className="mt-2 space-y-1.5">
            {macroRegime.themes.map((theme, i) => (
              <li key={i} className="text-zinc-300 text-sm flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                {theme}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="pt-3 border-t border-zinc-800">
          <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1.5">
            <Target className="w-3 h-3 text-blue-400" />
            Assets in Focus
          </span>
          <p className="text-zinc-200 text-sm mt-1.5 font-medium">{macroRegime.assetFocus}</p>
        </div>
        
        <div className="pt-3 border-t border-zinc-800">
          <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-rose-400" />
            Market Movers
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['CPI', 'ECB', 'NFP', 'NVDA'].map(event => (
              <span key={event} className="px-2 py-1 bg-zinc-800/80 text-zinc-300 text-xs rounded-md border border-zinc-700/50">
                {event}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Fed Watch Card
const FedWatchCard: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/50 border border-blue-500/20 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-blue-400" />
        <h3 className="text-blue-400 font-semibold tracking-wide text-sm uppercase">CME FedWatch</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Current Rate</span>
          <span className="text-zinc-200 font-mono">{fedWatchProbabilities.currentRate}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Next Meeting</span>
          <span className="text-zinc-200 text-xs">{fedWatchProbabilities.nextMeeting}</span>
        </div>
        
        <div className="pt-3 border-t border-zinc-800 space-y-2">
          <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium">Probabilities</span>
          {fedWatchProbabilities.probabilities.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-zinc-400 text-xs font-mono w-24">{p.rate}</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${p.probability}%` }}
                />
              </div>
              <span className="text-zinc-300 text-xs font-mono w-12 text-right">{p.probability}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Today's Summary Card
const TodaysSummaryCard: React.FC<{ events: EconomicEvent[] }> = ({ events }) => {
  const todayEvents = events.filter(e => isToday(e.date));
  const highImpact = todayEvents.filter(e => e.impact === 'high');
  
  const heatLevel = highImpact.length >= 3 ? 'extreme' : highImpact.length >= 2 ? 'high' : highImpact.length === 1 ? 'medium' : 'low';
  const heatConfig = {
    extreme: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'Extreme Volatility Day' },
    high: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'High Impact Day' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Medium Day' },
    low: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Quiet Day' }
  }[heatLevel];
  
  return (
    <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-800/50 border border-zinc-700/50 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="text-amber-400 font-semibold tracking-wide text-sm uppercase">Today's Macro</h3>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${heatConfig.bg} ${heatConfig.color} border ${heatConfig.border}`}>
          <Flame className="w-4 h-4" />
          <span className="font-medium text-sm">{heatConfig.label}</span>
        </div>
      </div>
      
      <ul className="space-y-2.5">
        {highImpact.length > 0 ? (
          highImpact.slice(0, 3).map(event => (
            <li key={event.id} className="flex items-start gap-2">
              <CircleDot className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-zinc-100 text-sm font-medium">{event.shortName}</span>
                <span className="text-zinc-500 text-sm"> at {event.time} ET</span>
                {event.forecast && <span className="text-zinc-600 text-sm"> — Fcst: {event.forecast}</span>}
              </div>
            </li>
          ))
        ) : (
          <li className="text-zinc-400 text-sm">No high-impact events scheduled</li>
        )}
      </ul>
    </div>
  );
};

// Event Card (Enhanced with Narrative)
const EventCard: React.FC<{ event: EconomicEvent; expanded?: boolean; onToggle?: () => void }> = ({ 
  event, 
  expanded = false,
  onToggle 
}) => {
  const categoryConfig = CATEGORY_CONFIG[event.category];
  
  return (
    <div 
      className={`
        relative bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 
        hover:border-amber-500/30 hover:bg-zinc-900/80 transition-all duration-300 cursor-pointer
        ${expanded ? 'border-amber-500/40 ring-1 ring-amber-500/10 bg-zinc-900/90' : ''}
      `}
      onClick={onToggle}
    >
      <div className={`absolute left-0 top-1/2 -translate-x-1/2 w-3 h-3 rounded-full ${getImpactDot(event.impact)} ring-4 ring-zinc-950`} />
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{FLAGS[event.country]}</span>
            <span className="text-zinc-100 font-medium">{event.name}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm mb-2">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono text-xs">{event.time} ET</span>
            </div>
            <div className={`flex items-center gap-1.5 ${categoryConfig.color}`}>
              {categoryConfig.icon}
              <span className="text-xs">{categoryConfig.label}</span>
            </div>
          </div>
          
          {event.narrative && (
            <p className="text-zinc-500 text-sm mb-3 leading-relaxed">{event.narrative}</p>
          )}
          
          {(event.forecast || event.previous) && (
            <div className="flex items-center gap-4 text-sm">
              {event.forecast && (
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 text-xs">Forecast:</span>
                  <span className="text-zinc-200 font-mono text-xs font-medium">{event.forecast}</span>
                </div>
              )}
              {event.previous && (
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600 text-xs">Previous:</span>
                  <span className="text-zinc-400 font-mono text-xs">{event.previous}</span>
                </div>
              )}
              {event.historicalMove && (
                <Tooltip content={`Past 5 releases moved S&P 500 by avg ±${event.historicalMove}%`}>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800/50 rounded">
                    <Activity className="w-3 h-3 text-zinc-500" />
                    <span className="text-amber-400 font-mono text-xs">±{event.historicalMove}%</span>
                  </div>
                </Tooltip>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <ImpactStars impact={event.impact} />
          {event.sensitivityScore && <SensitivityBar score={event.sensitivityScore} />}
        </div>
      </div>
      
      {expanded && event.assetsImpacted && event.assetsImpacted.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-zinc-500 text-xs uppercase tracking-wider font-medium">Assets Impacted</h4>
            <button className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs hover:bg-amber-500/20 transition-colors">
              <Bell className="w-3.5 h-3.5" />
              <span>Set Alert</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {event.assetsImpacted.map((a, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between px-3 py-2 bg-zinc-800/40 border border-zinc-700/50 rounded-lg"
              >
                <span className="text-zinc-300 text-sm">{a.asset}</span>
                <ImpactStars impact={a.impact} size="sm" showTooltip={false} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Filter Bar
const FilterBar: React.FC<{
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  impactFilter: ImpactLevel | 'all';
  setImpactFilter: (filter: ImpactLevel | 'all') => void;
  regionFilter: Region | 'all';
  setRegionFilter: (filter: Region | 'all') => void;
  categoryFilter: EventCategory | 'all';
  setCategoryFilter: (filter: EventCategory | 'all') => void;
}> = ({
  viewMode, setViewMode,
  impactFilter, setImpactFilter,
  regionFilter, setRegionFilter,
  categoryFilter, setCategoryFilter
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 bg-zinc-900/80 rounded-lg border border-zinc-800 w-fit">
        {[
          { id: 'today' as ViewMode, label: 'Today / Week' },
          { id: 'month' as ViewMode, label: 'Month' },
          { id: 'impact' as ViewMode, label: 'Impact View' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              viewMode === tab.id 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-zinc-500">
          <Filter className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider">Filters:</span>
        </div>
        
        <div className="flex items-center gap-1 p-0.5 bg-zinc-900/80 rounded-md border border-zinc-800">
          <button
            onClick={() => setImpactFilter('all')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              impactFilter === 'all' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All
          </button>
          {(['high', 'medium', 'low'] as const).map(level => (
            <Tooltip key={level} content={`${level.charAt(0).toUpperCase() + level.slice(1)} Market Sensitivity`}>
              <button
                onClick={() => setImpactFilter(level)}
                className={`px-2 py-1.5 rounded transition-all ${
                  impactFilter === level 
                    ? level === 'high' ? 'bg-rose-500/20 border border-rose-500/30'
                      : level === 'medium' ? 'bg-amber-500/20 border border-amber-500/30'
                      : 'bg-emerald-500/20 border border-emerald-500/30'
                    : 'hover:bg-zinc-800'
                }`}
              >
                <ImpactStars impact={level} size="sm" showTooltip={false} />
              </button>
            </Tooltip>
          ))}
        </div>
        
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value as Region | 'all')}
          className="px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-md text-sm text-zinc-300 focus:outline-none focus:border-amber-500/50 cursor-pointer"
        >
          <option value="all">All Regions</option>
          {Object.entries(FLAGS).map(([code, flag]) => (
            <option key={code} value={code}>{flag} {code}</option>
          ))}
        </select>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as EventCategory | 'all')}
          className="px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-md text-sm text-zinc-300 focus:outline-none focus:border-amber-500/50 cursor-pointer"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

// Events Timeline Section
const EventsTimeline: React.FC<{ events: EconomicEvent[]; title: string; subtitle?: string }> = ({ events, title, subtitle }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        No events match your filters
      </div>
    );
  }
  
  return (
    <div className="relative">
      <div className="flex items-center gap-3 mb-5">
        <Calendar className="w-5 h-5 text-amber-500" />
        <div>
          <h3 className="text-zinc-100 font-semibold text-lg">{title}</h3>
          {subtitle && <p className="text-zinc-500 text-sm">{subtitle}</p>}
        </div>
        <span className="ml-auto px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded-full font-mono">
          {events.length} events
        </span>
      </div>
      
      <div className="absolute left-0 top-16 bottom-0 w-px bg-gradient-to-b from-amber-500/60 via-zinc-700/50 to-transparent" />
      
      <div className="space-y-3 pl-6">
        {events.map(event => (
          <EventCard 
            key={event.id} 
            event={event}
            expanded={expandedId === event.id}
            onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
          />
        ))}
      </div>
    </div>
  );
};

// Calendar Month View - Global Macro Style
const CalendarMonthView: React.FC<{ events: EconomicEvent[] }> = ({ events }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date('2025-01-15'));
  const [selectedDay, setSelectedDay] = useState<number | null>(15);
  
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const getDayEvents = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };
  
  const getDayHeat = (dayEvents: EconomicEvent[]): 'extreme' | 'high' | 'medium' | 'low' | null => {
    if (dayEvents.length === 0) return null;
    const highCount = dayEvents.filter(e => e.impact === 'high').length;
    if (highCount >= 3) return 'extreme';
    if (highCount >= 2) return 'high';
    if (highCount === 1) return 'medium';
    return 'low';
  };
  
  const getUniqueRegions = (dayEvents: EconomicEvent[]): Region[] => {
    const regions = [...new Set(dayEvents.map(e => e.country))];
    return regions.slice(0, 4) as Region[];
  };
  
  const getUniqueCategories = (dayEvents: EconomicEvent[]): EventCategory[] => {
    return [...new Set(dayEvents.map(e => e.category))].slice(0, 3) as EventCategory[];
  };
  
  const selectedDayEvents = selectedDay ? getDayEvents(selectedDay) : [];
  
  // Calculate monthly stats
  const monthlyStats = useMemo(() => {
    const allMonthEvents = Array.from({ length: daysInMonth }).flatMap((_, i) => getDayEvents(i + 1));
    const regionCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    let highImpactCount = 0;
    
    allMonthEvents.forEach(e => {
      regionCounts[e.country] = (regionCounts[e.country] || 0) + 1;
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
      if (e.impact === 'high') highImpactCount++;
    });
    
    return {
      totalEvents: allMonthEvents.length,
      highImpactCount,
      topRegions: Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).slice(0, 4),
      topCategories: Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
    };
  }, [currentMonth, daysInMonth]);
  
  const heatConfig = {
    extreme: { bg: 'bg-rose-500/20', border: 'border-rose-500/40', glow: 'shadow-rose-500/20 shadow-lg' },
    high: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', glow: '' },
    medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: '' },
    low: { bg: 'bg-zinc-800/50', border: 'border-zinc-700/50', glow: '' }
  };
  
  return (
    <div className="space-y-6">
      {/* Monthly Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Total Events</div>
          <div className="text-2xl font-bold text-zinc-100">{monthlyStats.totalEvents}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">High Impact</div>
          <div className="text-2xl font-bold text-rose-400">{monthlyStats.highImpactCount}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Top Regions</div>
          <div className="flex gap-1 mt-1">
            {monthlyStats.topRegions.map(([region]) => (
              <span key={region} className="text-lg">{FLAGS[region as Region]}</span>
            ))}
          </div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
          <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Focus Areas</div>
          <div className="flex gap-2 mt-1">
            {monthlyStats.topCategories.map(([cat]) => (
              <span key={cat} className={`${CATEGORY_CONFIG[cat as EventCategory].color}`}>
                {CATEGORY_CONFIG[cat as EventCategory].icon}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-400" />
            </button>
            <h3 className="text-xl font-semibold text-zinc-100">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
          
          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-zinc-500 text-xs font-medium py-2 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getDayEvents(day);
              const heat = getDayHeat(dayEvents);
              const isCurrentDay = day === 15;
              const isSelected = selectedDay === day;
              const regions = getUniqueRegions(dayEvents);
              const categories = getUniqueCategories(dayEvents);
              const config = heat ? heatConfig[heat] : null;
              
              return (
                <div 
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`
                    min-h-[80px] p-2 rounded-xl border transition-all cursor-pointer
                    ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-transparent'}
                    ${isCurrentDay && !isSelected ? 'border-amber-500/50' : ''}
                    ${config ? `${config.bg} ${config.border} ${config.glow}` : 'hover:bg-zinc-800/50'}
                  `}
                >
                  {/* Day Number */}
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentDay ? 'text-amber-400' : 
                    isSelected ? 'text-amber-300' :
                    dayEvents.length > 0 ? 'text-zinc-200' : 'text-zinc-500'
                  }`}>
                    {day}
                  </div>
                  
                  {dayEvents.length > 0 && (
                    <>
                      {/* Region Flags */}
                      <div className="flex gap-0.5 mb-1">
                        {regions.map(region => (
                          <span key={region} className="text-xs">{FLAGS[region]}</span>
                        ))}
                      </div>
                      
                      {/* Category Icons */}
                      <div className="flex gap-1">
                        {categories.map(cat => {
                          const config = CATEGORY_CONFIG[cat];
                          return (
                            <span key={cat} className={`${config.color} opacity-70`}>
                              {cat === 'inflation' && <TrendingUp className="w-3 h-3" />}
                              {cat === 'growth' && <BarChart3 className="w-3 h-3" />}
                              {cat === 'employment' && <Users className="w-3 h-3" />}
                              {cat === 'central_bank' && <Building2 className="w-3 h-3" />}
                              {cat === 'earnings' && <DollarSign className="w-3 h-3" />}
                              {cat === 'global_macro' && <Globe className="w-3 h-3" />}
                            </span>
                          );
                        })}
                      </div>
                      
                      {/* Event Count Badge */}
                      {dayEvents.length > 1 && (
                        <div className="mt-1">
                          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                            {dayEvents.length} events
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-rose-500/20 border border-rose-500/40" />
              <span className="text-zinc-500 text-xs">High Volatility</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500/10 border border-amber-500/30" />
              <span className="text-zinc-500 text-xs">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-zinc-800/50 border border-zinc-700/50" />
              <span className="text-zinc-500 text-xs">Low Impact</span>
            </div>
          </div>
        </div>
        
        {/* Day Detail Sidebar */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-zinc-100 font-semibold">
              {selectedDay ? formatDate(`2025-01-${String(selectedDay).padStart(2, '0')}`) : 'Select a day'}
            </h4>
            {selectedDayEvents.length > 0 && (
              <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded-full">
                {selectedDayEvents.length} events
              </span>
            )}
          </div>
          
          {selectedDayEvents.length > 0 ? (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {selectedDayEvents.sort((a, b) => a.time.localeCompare(b.time)).map(event => (
                <div key={event.id} className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{FLAGS[event.country]}</span>
                      <span className="text-zinc-200 text-sm font-medium">{event.shortName}</span>
                    </div>
                    <ImpactStars impact={event.impact} size="sm" />
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                    <Clock className="w-3 h-3" />
                    <span className="font-mono">{event.time} ET</span>
                    <span className="text-zinc-600">•</span>
                    <span className={CATEGORY_CONFIG[event.category].color}>
                      {CATEGORY_CONFIG[event.category].label}
                    </span>
                  </div>
                  
                  {event.narrative && (
                    <p className="text-zinc-500 text-xs leading-relaxed">{event.narrative}</p>
                  )}
                  
                  {(event.forecast || event.previous) && (
                    <div className="flex gap-3 mt-2 pt-2 border-t border-zinc-700/50 text-xs">
                      {event.forecast && (
                        <div>
                          <span className="text-zinc-600">Fcst: </span>
                          <span className="text-zinc-300 font-mono">{event.forecast}</span>
                        </div>
                      )}
                      {event.previous && (
                        <div>
                          <span className="text-zinc-600">Prev: </span>
                          <span className="text-zinc-400 font-mono">{event.previous}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No events scheduled</p>
              <p className="text-xs mt-1 text-zinc-600">Select a highlighted day</p>
            </div>
          )}
          
          {/* Day Region Breakdown */}
          {selectedDayEvents.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">By Region</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  selectedDayEvents.reduce((acc, e) => {
                    acc[e.country] = (acc[e.country] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([region, count]) => (
                  <div key={region} className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded-md">
                    <span className="text-sm">{FLAGS[region as Region]}</span>
                    <span className="text-zinc-400 text-xs">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Market Impact View
const MarketImpactView: React.FC<{ events: EconomicEvent[] }> = ({ events }) => {
  const highImpactEvents = events
    .filter(e => e.impact === 'high' && e.sensitivityScore)
    .sort((a, b) => (b.sensitivityScore || 0) - (a.sensitivityScore || 0));
  
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-rose-500/10 via-zinc-900/50 to-transparent border border-rose-500/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-rose-500/20 rounded-lg">
            <TrendingUp className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-zinc-100">Market Impact Analysis</h3>
            <p className="text-zinc-500 text-sm">Events ranked by market sensitivity score</p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {highImpactEvents.map((event, index) => (
            <div key={event.id} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-mono rounded-bl-lg">
                #{index + 1}
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{FLAGS[event.country]}</span>
                <div>
                  <h4 className="text-zinc-100 font-medium">{event.shortName}</h4>
                  <p className="text-zinc-500 text-xs">{formatDate(event.date)} • {event.time} ET</p>
                </div>
              </div>
              
              {event.narrative && (
                <p className="text-zinc-400 text-sm mb-4 leading-relaxed">{event.narrative}</p>
              )}
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-zinc-500 text-xs uppercase tracking-wider">Market Sensitivity</span>
                  <span className="text-rose-400 font-mono text-sm font-semibold">{event.sensitivityScore}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-700"
                    style={{ width: `${event.sensitivityScore}%` }}
                  />
                </div>
              </div>
              
              {event.historicalMove && (
                <div className="flex items-center justify-between py-2 px-3 bg-zinc-800/50 rounded-lg">
                  <span className="text-zinc-500 text-xs">Past 5 Releases Avg. Move</span>
                  <span className="text-amber-400 font-mono text-sm font-medium">±{event.historicalMove}%</span>
                </div>
              )}
              
              {event.assetsImpacted && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Key Assets</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {event.assetsImpacted.slice(0, 4).map((asset, i) => (
                      <span key={i} className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                        {asset.asset}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MacroCalendar() {
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [impactFilter, setImpactFilter] = useState<ImpactLevel | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState<Region | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');
  
  const filteredEvents = useMemo(() => {
    return mockEvents.filter(event => {
      if (impactFilter !== 'all' && event.impact !== impactFilter) return false;
      if (regionFilter !== 'all' && event.country !== regionFilter) return false;
      if (categoryFilter !== 'all' && event.category !== categoryFilter) return false;
      return true;
    });
  }, [impactFilter, regionFilter, categoryFilter]);
  
  const todayEvents = filteredEvents.filter(e => isToday(e.date)).sort((a, b) => a.time.localeCompare(b.time));
  const tomorrowEvents = filteredEvents.filter(e => isTomorrow(e.date)).sort((a, b) => a.time.localeCompare(b.time));
  const thisWeekEvents = filteredEvents.filter(e => {
    const date = new Date(e.date);
    const today = new Date('2025-01-15');
    const weekEnd = new Date('2025-01-19');
    return date > today && date <= weekEnd && !isTomorrow(e.date);
  }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-zinc-950 to-zinc-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-500/5 blur-[120px] rounded-full" />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl border border-amber-500/30">
              <Globe className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Global Calendar</h1>
              <p className="text-zinc-500">Strategic macro calendar for serious traders</p>
            </div>
          </div>
        </div>
        
        <div className="grid gap-4 lg:grid-cols-3 mb-6">
          <TodaysSummaryCard events={mockEvents} />
          <WeekThemesCard />
          <FedWatchCard />
        </div>
        
        <div className="grid gap-4 lg:grid-cols-3 mb-8">
          <EventClustersCard />
          <RegionOverview events={mockEvents} />
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-zinc-500" />
              <span className="text-zinc-400 text-xs uppercase tracking-wider font-medium">Quick Legend</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <ImpactStars impact="high" />
                <span className="text-zinc-400 text-xs">High Sensitivity — Major moves</span>
              </div>
              <div className="flex items-center justify-between">
                <ImpactStars impact="medium" />
                <span className="text-zinc-400 text-xs">Medium — Moderate volatility</span>
              </div>
              <div className="flex items-center justify-between">
                <ImpactStars impact="low" />
                <span className="text-zinc-400 text-xs">Low — Limited impact</span>
              </div>
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-zinc-400 text-xs">±X% = Historical S&P move</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <FilterBar
            viewMode={viewMode}
            setViewMode={setViewMode}
            impactFilter={impactFilter}
            setImpactFilter={setImpactFilter}
            regionFilter={regionFilter}
            setRegionFilter={setRegionFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
          />
        </div>
        
        {viewMode === 'today' && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-8">
              <EventsTimeline 
                events={todayEvents} 
                title={`Today — ${formatDate('2025-01-15')}`}
                subtitle="All times in ET"
              />
              <EventsTimeline 
                events={tomorrowEvents} 
                title={`Tomorrow — ${formatDate('2025-01-16')}`}
              />
            </div>
            <div>
              <EventsTimeline 
                events={thisWeekEvents} 
                title="This Week"
                subtitle="Upcoming high-impact events"
              />
            </div>
          </div>
        )}
        
        {viewMode === 'month' && (
          <CalendarMonthView events={filteredEvents} />
        )}
        
        {viewMode === 'impact' && (
          <MarketImpactView events={filteredEvents} />
        )}
        
        <div className="mt-12 pt-6 border-t border-zinc-800/50">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500">
            <span>All times in ET (Eastern Time)</span>
            <span className="text-zinc-700">•</span>
            <span>Data for illustration purposes</span>
            <span className="text-zinc-700">•</span>
            <span className="text-amber-500/70">Powered by Finotaur</span>
          </div>
        </div>
      </div>
    </div>
  );
}