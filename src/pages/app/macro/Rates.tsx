'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Globe,
  Calendar,
  BarChart3,
  Zap,
  Target,
  AlertCircle,
  ChevronRight,
  Info,
  Sparkles,
  LineChart,
  ArrowRight,
  RefreshCw,
  Loader2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  ReferenceLine
} from 'recharts';

// ============================================================
// TYPES
// ============================================================

interface CentralBank {
  id: string;
  name: string;
  shortName: string;
  currency: string;
  country: string;
  currentRate: number;
  lowerBound?: number;
  lastChange: number;
  lastChangeDate: string;
  nextMeeting: string;
  decisions: { date: string; change: number; rate: number }[];
  policyBias: string;
  momentumScore: number;
  cyclePhase: string;
  sixMeetingTrend: ('up' | 'down' | 'neutral')[];
  daysUntilMeeting: number;
}

interface RateDifferential {
  pair: string;
  baseCurrency: string;
  quoteCurrency: string;
  differential: number;
  trend: 'up' | 'down' | 'neutral';
  momentum: string;
  tradeBias: string;
  volatility: string;
  carryScore: number;
}

interface GlobalMetrics {
  momentum: string;
  averageRate: number;
  cuttingCount: number;
  hikingCount: number;
  pausedCount: number;
  carryOpportunityScore: number;
}

interface YieldData {
  id: string;
  symbol: string;
  name: string;
  maturity: string;
  current: number;
  previousClose: number;
  change: number;
  changePercent: number;
  history: { date: string; value: number }[];
}

// ============================================================
// API HOOKS
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function useRatesData() {
  const [data, setData] = useState<{
    banks: CentralBank[];
    differentials: RateDifferential[];
    globalMetrics: GlobalMetrics | null;
  }>({ banks: [], differentials: [], globalMetrics: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`${API_BASE}/rates/central-banks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const json = await res.json();
      setData({
        banks: json.banks || [],
        differentials: json.differentials || [],
        globalMetrics: json.globalMetrics || null,
      });
    } catch (e: any) {
      console.error('[rates] fetch error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { ...data, loading, error, refetch: fetchData };
}

function useYieldData(range = '1y') {
  const [yields, setYields] = useState<YieldData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchYields = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/rates/yields?range=${range}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const json = await res.json();
        setYields(json.yields || []);
      } catch (e: any) {
        console.error('[yields] fetch error:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchYields();
  }, [range]);

  return { yields, loading, error };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDateShort = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const getPolicyBiasColor = (bias: string) => {
  if (bias.includes('Hawkish')) return 'text-rose-400';
  if (bias.includes('Dovish')) return 'text-emerald-400';
  return 'text-amber-400';
};

const getMomentumColor = (score: number) => {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-rose-400';
};

const getVolatilityColor = (vol: string) => {
  if (vol === 'Low') return 'text-emerald-400';
  if (vol === 'Medium') return 'text-amber-400';
  return 'text-rose-400';
};

// ============================================================
// COMPONENTS
// ============================================================

const KPICard = ({ 
  title, 
  value, 
  subValue, 
  icon: Icon, 
  trend,
  loading 
}: { 
  title: string; 
  value: string | number; 
  subValue?: string; 
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}) => (
  <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 border border-zinc-800/50 rounded-xl p-5 backdrop-blur-sm hover:border-amber-500/30 transition-all duration-300 group">
    <div className="flex items-start justify-between mb-3">
      <div className="p-2 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
        <Icon className="w-5 h-5 text-amber-500" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${
          trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-zinc-400'
        }`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : 
           trend === 'down' ? <TrendingDown className="w-3 h-3" /> : 
           <Minus className="w-3 h-3" />}
        </div>
      )}
    </div>
    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{title}</p>
    {loading ? (
      <div className="h-8 flex items-center">
        <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
      </div>
    ) : (
      <>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subValue && <p className="text-xs text-zinc-400 mt-1">{subValue}</p>}
      </>
    )}
  </div>
);

const TrendDots = ({ trend }: { trend: ('up' | 'down' | 'neutral')[] }) => (
  <div className="flex items-center gap-1">
    {trend.map((t, i) => (
      <div
        key={i}
        className={`w-2 h-2 rounded-full transition-all ${
          t === 'up' ? 'bg-rose-400' : 
          t === 'down' ? 'bg-emerald-400' : 
          'bg-amber-400/60'
        }`}
        title={t === 'up' ? 'Rate Hike' : t === 'down' ? 'Rate Cut' : 'Hold'}
      />
    ))}
  </div>
);

const ProgressBar = ({ value, max = 100, color = 'amber' }: { value: number; max?: number; color?: string }) => {
  const percentage = (value / max) * 100;
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    blue: 'bg-blue-500'
  };
  
  return (
    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div 
        className={`h-full ${colorClasses[color] || colorClasses.amber} rounded-full transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const SectionHeader = ({ 
  title, 
  subtitle, 
  icon: Icon,
  action
}: { 
  title: string; 
  subtitle?: string; 
  icon: React.ElementType;
  action?: React.ReactNode;
}) => (
  <div className="flex items-start justify-between mb-6">
    <div className="flex items-start gap-3">
      <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20">
        <Icon className="w-5 h-5 text-amber-500" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

// Custom Tooltip for Charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value?.toFixed(2)}%
        </p>
      ))}
    </div>
  );
};

// Rate History Chart Component
const RateHistoryChart = ({ banks }: { banks: CentralBank[] }) => {
  // Build chart data from bank decisions
  const chartData = useMemo(() => {
    // Get all unique dates from all banks
    const allDates = new Set<string>();
    banks.forEach(bank => {
      bank.decisions.forEach(d => allDates.add(d.date));
    });
    
    const sortedDates = Array.from(allDates).sort();
    
    return sortedDates.map(date => {
      const point: any = { date: formatDateShort(date) };
      banks.forEach(bank => {
        const decision = bank.decisions.find(d => d.date === date);
        if (decision) {
          point[bank.shortName] = decision.rate;
        }
      });
      return point;
    }).reverse();
  }, [banks]);

  const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis 
            dataKey="date" 
            stroke="#71717a" 
            tick={{ fill: '#71717a', fontSize: 11 }}
          />
          <YAxis 
            stroke="#71717a" 
            tick={{ fill: '#71717a', fontSize: 11 }}
            domain={['auto', 'auto']}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => <span className="text-zinc-400 text-xs">{value}</span>}
          />
          {banks.slice(0, 6).map((bank, idx) => (
            <Line
              key={bank.id}
              type="stepAfter"
              dataKey={bank.shortName}
              stroke={colors[idx]}
              strokeWidth={2}
              dot={{ r: 3, fill: colors[idx] }}
              connectNulls
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Yield Curve Chart
const YieldCurveChart = ({ yields }: { yields: YieldData[] }) => {
  const chartData = useMemo(() => {
    if (!yields.length) return [];
    
    // Get the last 30 days of data for the main yield (10Y)
    const tenYear = yields.find(y => y.id === 'us10y');
    if (!tenYear?.history) return [];
    
    return tenYear.history.slice(-60).map(h => ({
      date: formatDateShort(h.date),
      value: h.value,
    }));
  }, [yields]);

  if (!chartData.length) return null;

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis 
            dataKey="date" 
            stroke="#71717a" 
            tick={{ fill: '#71717a', fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#71717a" 
            tick={{ fill: '#71717a', fontSize: 11 }}
            domain={['auto', 'auto']}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            name="10Y Yield"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="url(#yieldGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Current Yield Display
const YieldDisplay = ({ yields, loading }: { yields: YieldData[]; loading: boolean }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {yields.map(y => (
        <div key={y.id} className="bg-zinc-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500">{y.maturity}</span>
            <span className={`text-xs font-medium ${
              y.change > 0 ? 'text-rose-400' : y.change < 0 ? 'text-emerald-400' : 'text-zinc-400'
            }`}>
              {y.change > 0 ? '+' : ''}{y.change?.toFixed(2) || '—'}
            </span>
          </div>
          <div className="text-2xl font-bold text-white">
            {y.current?.toFixed(2) || '—'}%
          </div>
          <div className="text-xs text-zinc-500 mt-1">{y.name}</div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MacroRates() {
  const { banks, differentials, globalMetrics, loading, error, refetch } = useRatesData();
  const { yields, loading: yieldsLoading } = useYieldData('1y');
  const [activeTab, setActiveTab] = useState<'overview' | 'differentials' | 'forecast'>('overview');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  // Compute carry opportunities from differentials
  const topCarryOpportunities = useMemo(() => {
    return differentials
      .filter(d => d.tradeBias !== 'None' && d.carryScore >= 60)
      .sort((a, b) => b.carryScore - a.carryScore)
      .slice(0, 3);
  }, [differentials]);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-500 text-sm font-medium mb-3">
                <Globe className="w-4 h-4" />
                <span>Market Intelligence</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Global Interest Rates & Monetary Policy Dashboard
              </h1>
              <p className="text-zinc-400 max-w-3xl">
                Real-time tracking of major central bank rates, policy momentum, interest differentials, and FX carry opportunities.
              </p>
            </div>
            
            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {error && (
            <div className="mt-4 flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2">
              <AlertTriangle className="w-4 h-4" />
              Failed to load data: {error}
            </div>
          )}
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <KPICard
            title="Global Policy Momentum"
            value={globalMetrics?.momentum || '—'}
            subValue="Synchronized easing underway"
            icon={Activity}
            trend={globalMetrics?.momentum === 'Easing' ? 'down' : globalMetrics?.momentum === 'Tightening' ? 'up' : 'neutral'}
            loading={loading}
          />
          <KPICard
            title="Avg. Global Policy Rate"
            value={globalMetrics ? `${globalMetrics.averageRate}%` : '—'}
            subValue="G10 weighted average"
            icon={BarChart3}
            loading={loading}
          />
          <KPICard
            title="Central Bank Stance"
            value={globalMetrics ? `${globalMetrics.cuttingCount} Cutting` : '—'}
            subValue={globalMetrics ? `${globalMetrics.hikingCount} hiking · ${globalMetrics.pausedCount} paused` : '—'}
            icon={Target}
            loading={loading}
          />
          <KPICard
            title="FX Carry Opportunity"
            value={globalMetrics ? `${globalMetrics.carryOpportunityScore}/100` : '—'}
            subValue="Elevated carry conditions"
            icon={Zap}
            trend="up"
            loading={loading}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-8 border-b border-zinc-800 pb-4">
          {[
            { id: 'overview', label: 'Central Banks Overview', icon: Globe },
            { id: 'differentials', label: 'Rate Differentials & Carry', icon: LineChart },
            { id: 'forecast', label: 'Yields & Analysis', icon: Sparkles }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Central Banks Table */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 border-b border-zinc-800/50">
                <SectionHeader
                  title="Global Central Banks Overview"
                  subtitle="Policy rates, decisions, and outlook for major central banks"
                  icon={Globe}
                />
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800/50">
                        <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Bank</th>
                        <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">Currency</th>
                        <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">Current Rate</th>
                        <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">Last Change</th>
                        <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">6-Meeting Trend</th>
                        <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">Policy Bias</th>
                        <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">Next Meeting</th>
                        <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Cycle Phase</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banks.map((bank) => (
                        <tr 
                          key={bank.id}
                          className={`border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer ${
                            selectedBank === bank.id ? 'bg-amber-500/5' : ''
                          }`}
                          onClick={() => setSelectedBank(selectedBank === bank.id ? null : bank.id)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-zinc-700/50">
                                <span className="text-sm font-bold text-amber-500">{bank.shortName}</span>
                              </div>
                              <div>
                                <p className="font-medium text-white text-sm">{bank.name}</p>
                                <p className="text-xs text-zinc-500">{bank.country}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 text-sm font-mono">
                              {bank.currency}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-lg font-bold text-white">{bank.currentRate.toFixed(2)}%</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className={`flex items-center justify-end gap-1 font-medium ${
                              bank.lastChange > 0 ? 'text-rose-400' : 
                              bank.lastChange < 0 ? 'text-emerald-400' : 
                              'text-zinc-400'
                            }`}>
                              {bank.lastChange > 0 ? <ArrowUpRight className="w-4 h-4" /> : 
                               bank.lastChange < 0 ? <ArrowDownRight className="w-4 h-4" /> : null}
                              {bank.lastChange > 0 ? '+' : ''}{bank.lastChange.toFixed(2)}%
                            </span>
                            <span className="text-xs text-zinc-500 block mt-0.5">
                              {formatDate(bank.lastChangeDate)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-center">
                              <TrendDots trend={bank.sixMeetingTrend} />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-sm font-medium ${getPolicyBiasColor(bank.policyBias)}`}>
                              {bank.policyBias}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <p className="text-sm text-white">{formatDate(bank.nextMeeting)}</p>
                              <p className="text-xs text-zinc-500">{bank.daysUntilMeeting} days</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                              bank.cyclePhase === 'Easing Cycle' ? 'bg-emerald-500/10 text-emerald-400' :
                              bank.cyclePhase === 'Hiking Cycle' ? 'bg-rose-500/10 text-rose-400' :
                              bank.cyclePhase === 'Reversal Detected' ? 'bg-amber-500/10 text-amber-400' :
                              'bg-zinc-700/50 text-zinc-400'
                            }`}>
                              {bank.cyclePhase}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rate History Chart */}
            {banks.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm">
                <SectionHeader
                  title="Rate Decision History"
                  subtitle="Recent policy rate changes by central bank"
                  icon={BarChart3}
                />
                <RateHistoryChart banks={banks} />
              </div>
            )}

            {/* Momentum Engine */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm">
                <SectionHeader
                  title="Interest Rate Momentum Engine"
                  subtitle="Policy direction and momentum analysis"
                  icon={Activity}
                />
                
                <div className="space-y-4">
                  {banks.slice(0, 5).map(bank => (
                    <div key={bank.id} className="bg-zinc-800/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-amber-500">{bank.shortName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            bank.cyclePhase === 'Easing Cycle' ? 'bg-emerald-500/10 text-emerald-400' :
                            bank.cyclePhase === 'Hiking Cycle' ? 'bg-rose-500/10 text-rose-400' :
                            bank.cyclePhase === 'Reversal Detected' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-zinc-700/50 text-zinc-400'
                          }`}>
                            {bank.cyclePhase}
                          </span>
                        </div>
                        <span className={`text-lg font-bold ${getMomentumColor(bank.momentumScore)}`}>
                          {bank.momentumScore}
                        </span>
                      </div>
                      <ProgressBar value={bank.momentumScore} color={bank.momentumScore >= 60 ? 'emerald' : 'amber'} />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-zinc-500">Momentum Score</span>
                        <span className="text-xs text-zinc-400">
                          Next: {formatDate(bank.nextMeeting)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Currency Rate Overview */}
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm">
                <SectionHeader
                  title="Currency Rate Overview"
                  subtitle="Quick reference for major currency policy rates"
                  icon={BarChart3}
                />
                
                <div className="grid grid-cols-2 gap-3">
                  {banks.map(bank => (
                    <div key={bank.id} className="bg-zinc-800/30 rounded-xl p-4 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-white">{bank.currency}</span>
                        <span className={`text-xs ${getPolicyBiasColor(bank.policyBias)}`}>
                          {bank.policyBias.replace('Slightly ', '')}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-amber-500">{bank.currentRate.toFixed(2)}</span>
                        <span className="text-sm text-zinc-400">%</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {bank.lastChange !== 0 && (
                          <span className={`text-xs ${bank.lastChange < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {bank.lastChange > 0 ? '↑' : '↓'} {Math.abs(bank.lastChange).toFixed(2)}%
                          </span>
                        )}
                        <TrendDots trend={bank.sixMeetingTrend.slice(-3)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'differentials' && (
          <div className="space-y-8">
            {/* Rate Differentials Table */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 border-b border-zinc-800/50">
                <SectionHeader
                  title="Interest Rate Differentials"
                  subtitle="Cross-currency rate spreads and carry trade indicators"
                  icon={LineChart}
                />
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800/50">
                        <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Pair</th>
                        <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">Rate Diff</th>
                        <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">Trend</th>
                        <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">Momentum</th>
                        <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">Volatility</th>
                        <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">Trade Bias</th>
                        <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Carry Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {differentials.map((rd) => (
                        <tr key={rd.pair} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-mono font-bold text-white">{rd.pair}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className={`text-lg font-bold ${rd.differential > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {rd.differential > 0 ? '+' : ''}{rd.differential.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                              rd.trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' :
                              rd.trend === 'down' ? 'bg-rose-500/10 text-rose-400' :
                              'bg-zinc-700/50 text-zinc-400'
                            }`}>
                              {rd.trend === 'up' ? '↑' : rd.trend === 'down' ? '↓' : '→'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-sm font-medium ${
                              rd.momentum === 'Strong' ? 'text-emerald-400' :
                              rd.momentum === 'Stable' ? 'text-amber-400' :
                              rd.momentum === 'Weak' ? 'text-rose-400' :
                              'text-zinc-400'
                            }`}>
                              {rd.momentum}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-sm ${getVolatilityColor(rd.volatility)}`}>
                              {rd.volatility}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {rd.tradeBias !== 'None' ? (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                rd.tradeBias === 'Long' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              }`}>
                                {rd.tradeBias} {rd.baseCurrency}
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16">
                                <ProgressBar value={rd.carryScore} color={rd.carryScore >= 70 ? 'emerald' : rd.carryScore >= 50 ? 'amber' : 'rose'} />
                              </div>
                              <span className="text-sm font-bold text-white w-8">{rd.carryScore}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Carry Trade Finder */}
            {topCarryOpportunities.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm">
                <SectionHeader
                  title="Top Carry Opportunities"
                  subtitle="Best opportunities based on rate differentials and momentum"
                  icon={Zap}
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {topCarryOpportunities.map((opp, idx) => (
                    <div 
                      key={opp.pair}
                      className={`relative bg-gradient-to-br rounded-xl p-5 border ${
                        idx === 0 
                          ? 'from-amber-500/10 to-amber-600/5 border-amber-500/30' 
                          : 'from-zinc-800/50 to-zinc-900/50 border-zinc-700/50'
                      }`}
                    >
                      {idx === 0 && (
                        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-zinc-900 text-xs font-bold rounded-full">
                          TOP
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold text-white font-mono">{opp.pair}</span>
                        <span className="text-2xl font-bold text-emerald-400">+{opp.differential.toFixed(2)}%</span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500">Momentum</span>
                          <span className={`${
                            opp.momentum === 'Strong' ? 'text-emerald-400' : 'text-amber-400'
                          }`}>{opp.momentum}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500">Volatility</span>
                          <span className={getVolatilityColor(opp.volatility)}>{opp.volatility}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500">Trade Bias</span>
                          <span className="text-emerald-400">{opp.tradeBias} {opp.baseCurrency}</span>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-zinc-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-zinc-500">Carry Score</span>
                          <span className="text-sm font-bold text-amber-500">{opp.carryScore}</span>
                        </div>
                        <ProgressBar value={opp.carryScore} color={opp.carryScore >= 80 ? 'emerald' : 'amber'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'forecast' && (
          <div className="space-y-8">
            {/* Treasury Yields */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm">
              <SectionHeader
                title="US Treasury Yields"
                subtitle="Current yields across the maturity curve"
                icon={BarChart3}
              />
              <YieldDisplay yields={yields} loading={yieldsLoading} />
            </div>

            {/* 10Y Yield Chart */}
            {yields.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm">
                <SectionHeader
                  title="10-Year Treasury Yield History"
                  subtitle="60-day historical performance"
                  icon={LineChart}
                />
                <YieldCurveChart yields={yields} />
              </div>
            )}

            {/* Rate Forecasts Table */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 border-b border-zinc-800/50">
                <SectionHeader
                  title="Policy Rate Summary"
                  subtitle="Current rates and recent decision history"
                  icon={Sparkles}
                />
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800/50">
                        <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Bank</th>
                        <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">Current</th>
                        <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">YTD Change</th>
                        <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">Decisions (2024)</th>
                        <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-4">Momentum</th>
                        <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Bias</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banks.map(bank => {
                        const ytdChange = bank.decisions.reduce((sum, d) => sum + d.change, 0);
                        const decisionCount = bank.decisions.filter(d => d.change !== 0).length;
                        
                        return (
                          <tr key={bank.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-amber-500">{bank.shortName}</span>
                                <span className="text-sm text-zinc-400">{bank.currency}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className="text-lg font-bold text-white">{bank.currentRate.toFixed(2)}%</span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium ${
                                ytdChange < 0 ? 'bg-emerald-500/10 text-emerald-400' :
                                ytdChange > 0 ? 'bg-rose-500/10 text-rose-400' :
                                'bg-zinc-700/50 text-zinc-400'
                              }`}>
                                {ytdChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : 
                                 ytdChange < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                                {ytdChange > 0 ? '+' : ''}{(ytdChange * 100).toFixed(0)} bps
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="text-sm text-zinc-300">
                                {decisionCount} {decisionCount === 1 ? 'move' : 'moves'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-12">
                                  <ProgressBar value={bank.momentumScore} color={bank.momentumScore >= 60 ? 'emerald' : 'amber'} />
                                </div>
                                <span className={`text-sm font-medium ${getMomentumColor(bank.momentumScore)}`}>
                                  {bank.momentumScore}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-sm font-medium ${getPolicyBiasColor(bank.policyBias)}`}>
                                {bank.policyBias}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Summary Footer */}
        <div className="mt-10 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl p-6 border border-amber-500/20">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-500/20">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">Market Intelligence Summary</h3>
              <p className="text-zinc-300 leading-relaxed">
                {globalMetrics?.momentum === 'Easing' 
                  ? 'Global rates are shifting into a synchronized easing cycle led by major central banks. '
                  : globalMetrics?.momentum === 'Tightening'
                  ? 'Global monetary policy remains tight with several central banks maintaining elevated rates. '
                  : 'Mixed signals across central banks with divergent policy paths. '}
                {topCarryOpportunities.length > 0 
                  ? `Carry opportunities emerging in ${topCarryOpportunities.map(o => o.pair).join(' and ')}. `
                  : ''}
                {banks.find(b => b.shortName === 'BOJ')?.cyclePhase === 'Reversal Detected'
                  ? 'BOJ normalization attempt underway while most G10 banks ease. '
                  : ''}
                Monitor upcoming meetings for policy shifts.
              </p>
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-zinc-700/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs text-zinc-500">Updated: {new Date().toLocaleString()}</span>
                </div>
                {banks.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs text-zinc-500">
                      Next: {banks.sort((a, b) => a.daysUntilMeeting - b.daysUntilMeeting)[0]?.shortName} {formatDate(banks.sort((a, b) => a.daysUntilMeeting - b.daysUntilMeeting)[0]?.nextMeeting)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}