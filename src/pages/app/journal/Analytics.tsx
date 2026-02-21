import { useState, useMemo, memo } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  TrendingUp, TrendingDown, Target, Award, Calendar,
  Activity, Brain, Zap, Clock, DollarSign, Percent,
  AlertTriangle, CheckCircle, XCircle, BarChart3, PieChart, 
  LineChart, Info, Sparkles, ArrowUpRight, ArrowDownRight, 
  Shield, AlertCircle, ChevronUp, ChevronDown, Lightbulb, 
  Heart, Focus, Filter, Download, RefreshCw,
  Flame, BarChart2, Users, Layers, Grid3x3, TrendingUpIcon
} from "lucide-react";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useTimezone } from "@/contexts/TimezoneContext";
import { formatSessionDisplay } from "@/constants/tradingSessions";
import { EquityCurveOptimized } from "@/components/EquityCurveOptimized";
import {
  AreaChart, Area, Line,
  ComposedChart, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { 
  findBestCombinations, 
  getStrategyName,
  calculateAllStats,
  type Trade, 
  type StrategyStats, 
  type AIInsight, 
  type BreakdownData, 
  type BestWorstTrade 
} from "@/utils/statsCalculations";

type TimeRange = '7D' | '30D' | '90D' | 'ALL';

// ==========================================
// 🚀 MAIN COMPONENT
// ==========================================

export default function AnalyticsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');

  // 🚀 שימוש ב-useEffectiveUser במקום useAuth
  const { id: userId, isImpersonating } = useEffectiveUser();

  // 🚀 Timezone context for session display
  const timezone = useTimezone();

  // 🚀 כל הלוגיקה והחישובים במקום אחד
  const analytics = useAnalyticsData(timeRange);
  
  function setTab(tab: string) {
    setSearchParams({ tab });
  }

  if (analytics.isLoading) {
    return <LoadingState />;
  }

  if (analytics.isError || analytics.closedTrades.length === 0) {
    return <EmptyState />;
  }

  return (
    <div 
      className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #121212 100%)' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: '#EAEAEA' }}>
              Analytics Dashboard
            </h1>
            <p className="text-sm" style={{ color: '#9A9A9A' }}>
              {analytics.stats.totalTrades} trades • {timeRange === 'ALL' ? 'All time' : timeRange}
              {isImpersonating && (
                <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ background: '#C9A646', color: '#000' }}>
                  👁️ Viewing as User
                </span>
              )}
            </p>
          </div>
          
          <div className="flex gap-2">
            {(['7D', '30D', '90D', 'ALL'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
                style={{
                  background: timeRange === range 
                    ? 'linear-gradient(135deg, #C9A646, #B48C2C)' 
                    : 'rgba(20,20,20,0.6)',
                  color: timeRange === range ? '#000' : '#EAEAEA',
                  border: timeRange === range ? 'none' : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
            { id: 'breakdown', label: 'Breakdown', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'advanced', label: 'Advanced', icon: <LineChart className="w-4 h-4" /> },
            { id: 'psychology', label: 'Psychology', icon: <Brain className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap hover:scale-105"
              style={{
                background: activeTab === tab.id 
                  ? 'linear-gradient(135deg, #C9A646, #B48C2C)' 
                  : 'rgba(20,20,20,0.6)',
                color: activeTab === tab.id ? '#000' : '#EAEAEA',
                border: activeTab === tab.id ? 'none' : '1px solid rgba(255,255,255,0.05)',
                boxShadow: activeTab === tab.id ? '0 0 20px rgba(201,166,70,0.2)' : 'none',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab 
            stats={analytics.stats}
            insights={analytics.insights}
            trades={analytics.filteredTrades as Trade[]}
            changes={analytics.changes}
            bestWorst={analytics.bestWorst}
            momentum={analytics.momentum}
            byDayOfWeek={analytics.breakdown.byDayOfWeek || []}
          />
        )}
        
        {activeTab === 'breakdown' && (
          <BreakdownTab 
            breakdown={analytics.breakdown}
            trades={analytics.filteredTrades as Trade[]}
            timezone={timezone}
          />
        )}
        
        {activeTab === 'advanced' && (
          <AdvancedTab 
            stats={analytics.stats}
            trades={analytics.filteredTrades as Trade[]}
          />
        )}
        
        {activeTab === 'psychology' && (
          <PsychologyTab 
            stats={analytics.stats}
            trades={analytics.filteredTrades as Trade[]}
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// TAB COMPONENTS
// ==========================================

function OverviewTab({ 
  stats, 
  insights, 
  trades, 
  changes,
  bestWorst,
  momentum,
  byDayOfWeek
}: { 
  stats: StrategyStats; 
  insights: AIInsight[]; 
  trades: Trade[];
  changes: { winRateChange: number; pnlChange: number; avgRChange: number };
  bestWorst: { best: BestWorstTrade | null; worst: BestWorstTrade | null };
  momentum: { score: number; label: string; color: string };
  byDayOfWeek: { name: string; stats: StrategyStats }[];
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBoxCompact
          label="Total Trades"
          value={stats.totalTrades.toString()}
          color="#EAEAEA"
          icon={<BarChart3 className="w-4 h-4" />}
        />
        <StatBoxCompact
          label="Win Rate"
          value={`${stats.winRate.toFixed(0)}%`}
          color={stats.winRate >= 50 ? '#00C46C' : '#E44545'}
          icon={<Target className="w-4 h-4" />}
          change={changes?.winRateChange}
          trend={changes && changes.winRateChange > 0 ? 'up' : changes && changes.winRateChange < 0 ? 'down' : undefined}
        />
        <StatBoxCompact
          label="Net P&L"
          value={`$${stats.netPnL.toFixed(0)}`}
          color={stats.netPnL >= 0 ? '#00C46C' : '#E44545'}
          icon={<DollarSign className="w-4 h-4" />}
          change={changes?.pnlChange}
          trend={changes && changes.pnlChange > 0 ? 'up' : changes && changes.pnlChange < 0 ? 'down' : undefined}
        />
        <StatBoxCompact
          label="Avg R:R"
          value={stats.avgRR.toFixed(2)}
          color="#C9A646"
          icon={<Zap className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBoxCompact
          label="Expectancy"
          value={`${stats.expectancy >= 0 ? '+' : ''}${stats.expectancy.toFixed(2)}R`}
          color={stats.expectancy >= 0 ? '#00C46C' : '#E44545'}
          sublabel="Per trade"
          change={changes?.avgRChange}
        />
        <StatBoxCompact
          label="Profit Factor"
          value={stats.profitFactor.toFixed(2)}
          color={stats.profitFactor >= 1.5 ? '#00C46C' : stats.profitFactor >= 1 ? '#C9A646' : '#E44545'}
        />
        <StatBoxCompact
          label="Max Drawdown"
          value={`${stats.maxDrawdown?.toFixed(1) || 0}R`}
          color="#E44545"
        />
        <StatBoxCompact
          label="Win/Loss Streak"
          value={`${stats.maxConsecutiveWins || 0}/${stats.maxConsecutiveLosses || 0}`}
          color="#C9A646"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {bestWorst.best && (
          <BestWorstCard
            title="Best Trade"
            trade={bestWorst.best.trade}
            r={bestWorst.best.r}
            date={bestWorst.best.date}
            type="best"
          />
        )}
        {bestWorst.worst && (
          <BestWorstCard
            title="Worst Trade"
            trade={bestWorst.worst.trade}
            r={bestWorst.worst.r}
            date={bestWorst.worst.date}
            type="worst"
          />
        )}
        <MomentumCard momentum={momentum} />
      </div>

      <EquityCurveOptimized trades={trades} />
      <DistributionPieChart trades={trades} />

      <div 
        className="rounded-xl p-5"
        style={{
          background: '#101010',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h3 
          className="text-xs uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ color: '#C9A646', fontWeight: 700 }}
        >
          <Sparkles className="w-4 h-4" />
          AI Summary Insights
        </h3>
        
        <div className="grid md:grid-cols-2 gap-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg flex gap-3 transition-all hover:scale-[1.02] group"
              style={{
                background: 'rgba(20,20,20,0.8)',
                border: `1px solid ${
                  insight.type === 'strength' ? 'rgba(0,196,108,0.2)' :
                  insight.type === 'weakness' ? 'rgba(228,69,69,0.2)' :
                  insight.type === 'warning' ? 'rgba(255,193,7,0.2)' :
                  'rgba(201,166,70,0.2)'
                }`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ 
                color: insight.type === 'strength' ? '#00C46C' :
                       insight.type === 'weakness' ? '#E44545' :
                       insight.type === 'warning' ? '#FFC107' :
                       '#C9A646',
                flexShrink: 0,
              }}>
                {insight.type === 'strength' && <CheckCircle className="w-5 h-5" />}
                {insight.type === 'weakness' && <AlertTriangle className="w-5 h-5" />}
                {insight.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                {insight.type === 'tip' && <Sparkles className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold mb-1 text-sm" style={{ color: '#EAEAEA' }}>
                  {insight.title}
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: '#9A9A9A' }}>
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      </div>
  );
}

function BreakdownTab({ 
  breakdown, 
  trades,
  timezone 
}: { 
  breakdown: BreakdownData; 
  trades: Trade[];
  timezone: string;
}) {
  const bestCombinations = useMemo(() => 
    findBestCombinations(trades),
    [trades]
  );

  return (
    <div className="space-y-6">
      <SmartInsightsPanel combinations={bestCombinations} breakdown={breakdown} timezone={timezone} />
      <div className="grid grid-cols-2 gap-4">
        <DayWinRateChart data={breakdown.byDayOfWeek || []} />
        <DayOfWeekHeatmap data={breakdown.byDayOfWeek || []} />
      </div>
      <BreakdownSection title="By Strategy" data={breakdown.byStrategy || []} />
      <BreakdownSection title="By Asset" data={breakdown.byAsset || []} />
      <BreakdownSection title="By Session" data={breakdown.bySession || []} timezone={timezone} />
      <StrategySessionOptimalPerformance trades={trades} timezone={timezone} />
      <ExpandableCombinationAnalysis trades={trades} timezone={timezone} />
      <BreakdownSection title="By Direction (Long/Short)" data={breakdown.byDirection || []} />
    </div>
  );
}

// ==========================================
// 🆕 Strategy-Session Visual Heat Matrix with Timezone
// ==========================================

function StrategySessionOptimalPerformance({ 
  trades,
  timezone 
}: { 
  trades: Trade[];
  timezone: string;
}) {
  const matrixData = useMemo(() => {
    const combinationMap = new Map<string, { trades: Trade[]; stats: StrategyStats }>();
    
    trades.forEach(trade => {
      const strategy = trade.strategy_name || getStrategyName(trade.strategy) || 'No Strategy';
      const session = trade.session || 'No Session';
      const key = `${strategy}___${session}`;
      
      if (!combinationMap.has(key)) {
        combinationMap.set(key, { trades: [], stats: {} as StrategyStats });
      }
      
      combinationMap.get(key)!.trades.push(trade);
    });
    
    combinationMap.forEach((value) => {
      value.stats = calculateAllStats(value.trades);
    });
    
    const strategies = Array.from(new Set(trades.map(t => 
      t.strategy_name || getStrategyName(t.strategy) || 'No Strategy'
    ))).sort();
    
    const sessions = Array.from(new Set(trades.map(t => 
      t.session || 'No Session'
    ))).sort();
    
    let maxR = -Infinity;
    let minR = Infinity;
    let bestCombo = { strategy: '', session: '', r: -Infinity, data: null as any };
    
    combinationMap.forEach((value, key) => {
      const r = value.stats.totalR;
      if (r > maxR) maxR = r;
      if (r < minR) minR = r;
      if (r > bestCombo.r && value.trades.length >= 1) {
        const [strategy, session] = key.split('___');
        bestCombo = { strategy, session, r, data: value };
      }
    });
    
    return { combinationMap, strategies, sessions, maxR, minR, bestCombo };
  }, [trades]);

  if (matrixData.strategies.length === 0 || matrixData.sessions.length === 0) {
    return null;
  }

  const range = matrixData.maxR - matrixData.minR || 1;

  return (
    <div 
      className="rounded-xl overflow-hidden"
      style={{
        background: '#0E0E0E',
        border: '1px solid rgba(201,166,70,0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div 
        className="p-6 pb-5"
        style={{
          borderBottom: '1px solid rgba(201,166,70,0.1)',
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="p-2.5 rounded-lg"
            style={{
              background: 'rgba(201,166,70,0.12)',
              border: '1px solid rgba(201,166,70,0.2)',
            }}
          >
            <BarChart2 className="w-5 h-5" style={{ color: '#C9A646' }} />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#EAEAEA' }}>
              Strategy × Session Performance
            </h3>
            <p className="text-xs" style={{ color: '#9A9A9A' }}>
              Identify optimal strategy-timing combinations
            </p>
          </div>
        </div>
      </div>

      {/* Matrix Container */}
      <div className="p-6">
        <div className="w-full">
          {/* Grid */}
          <div className="grid gap-3" style={{ 
            gridTemplateColumns: `140px repeat(${matrixData.sessions.length}, 1fr)` 
          }}>
            {/* Top-left corner - empty */}
            <div />
            
            {/* Session Headers */}
            {matrixData.sessions.map((session, idx) => (
              <div 
                key={idx}
                className="text-center py-2"
                style={{
                  background: 'rgba(201,166,70,0.08)',
                  border: '1px solid rgba(201,166,70,0.15)',
                  borderRadius: '8px',
                }}
              >
                <span className="text-xs font-bold" style={{ color: '#C9A646' }}>
                  {formatSessionDisplay(session)}
                </span>
              </div>
            ))}

            {/* Strategy Rows */}
            {matrixData.strategies.map((strategy) => (
              <>
                {/* Strategy Label */}
                <div 
                  className="flex items-center px-3 py-2"
                  style={{
                    background: 'rgba(201,166,70,0.08)',
                    border: '1px solid rgba(201,166,70,0.15)',
                    borderRadius: '8px',
                  }}
                >
                  <span className="text-xs font-bold truncate" style={{ color: '#EAEAEA' }}>
                    {strategy}
                  </span>
                </div>

                {/* Performance Cells */}
                {matrixData.sessions.map((session) => {
                  const key = `${strategy}___${session}`;
                  const data = matrixData.combinationMap.get(key);
                  
                  if (!data || data.trades.length === 0) {
                    return (
                      <div 
                        key={session}
                        className="flex flex-col items-center justify-center py-3"
                        style={{
                          background: 'rgba(30,30,30,0.4)',
                          border: '1px solid rgba(255,255,255,0.03)',
                          borderRadius: '8px',
                        }}
                      >
                        <span className="text-xl" style={{ color: '#404040' }}>—</span>
                      </div>
                    );
                  }

                  const totalR = data.stats.totalR;
                  const winRate = data.stats.winRate;
                  const tradesCount = data.trades.length;
                  const intensity = Math.abs(totalR - matrixData.minR) / range;
                  const isPositive = totalR >= 0;
                  const isBest = strategy === matrixData.bestCombo.strategy && 
                                 session === matrixData.bestCombo.session;

                  return (
                    <div 
                      key={session}
                      className="flex flex-col items-center justify-center py-3 px-2"
                      style={{
                        background: isBest
                          ? 'linear-gradient(135deg, rgba(201,166,70,0.25), rgba(201,166,70,0.1))'
                          : isPositive 
                            ? `rgba(0,196,108,${0.12 + intensity * 0.35})`
                            : `rgba(228,69,69,${0.12 + intensity * 0.35})`,
                        border: isBest 
                          ? '2px solid #C9A646'
                          : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        position: 'relative',
                      }}
                    >
                      {isBest && (
                        <div 
                          className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded text-xs font-bold"
                          style={{
                            background: '#C9A646',
                            color: '#000',
                            fontSize: '9px',
                          }}
                        >
                          ★
                        </div>
                      )}
                      
                      <div 
                        className="text-lg font-bold mb-0.5"
                        style={{ color: isPositive ? '#00C46C' : '#E44545' }}
                      >
                        {totalR >= 0 ? '+' : ''}{totalR.toFixed(1)}R
                      </div>
                      
                      <div 
                        className="text-xs mb-0.5"
                        style={{ color: winRate >= 50 ? '#00C46C' : '#E44545' }}
                      >
                        {winRate.toFixed(0)}%
                      </div>
                      
                      <div className="text-xs" style={{ color: '#7A7A7A' }}>
                        {tradesCount}T
                      </div>
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Best Combo Highlight */}
        {matrixData.bestCombo.r > 0 && matrixData.bestCombo.data && (
          <div 
            className="mt-5 p-4 rounded-lg"
            style={{
              background: 'rgba(201,166,70,0.08)',
              border: '1px solid rgba(201,166,70,0.2)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4" style={{ color: '#C9A646' }} />
                  <span className="text-sm font-bold" style={{ color: '#C9A646' }}>
                    Best Combination
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#9A9A9A' }}>
                  <span style={{ color: '#EAEAEA', fontWeight: 'bold' }}>
                    {matrixData.bestCombo.strategy}
                  </span>
                  {' during '}
                  <span style={{ color: '#EAEAEA', fontWeight: 'bold' }}>
                    {formatSessionDisplay(matrixData.bestCombo.session)}
                  </span>
                </p>
              </div>
              
              <div className="flex gap-4 text-center">
                <div>
                  <div className="text-xs mb-1" style={{ color: '#7A7A7A' }}>Total R</div>
                  <div className="text-lg font-bold" style={{ color: '#00C46C' }}>
                    +{matrixData.bestCombo.r.toFixed(1)}R
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: '#7A7A7A' }}>Win Rate</div>
                  <div className="text-lg font-bold" style={{ color: '#00C46C' }}>
                    {matrixData.bestCombo.data.stats.winRate.toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: '#7A7A7A' }}>Trades</div>
                  <div className="text-lg font-bold" style={{ color: '#EAEAEA' }}>
                    {matrixData.bestCombo.data.trades.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Smart Insights Panel with Timezone
// ==========================================

function DayStatCard({ icon, label, day, value, sub, valueColor }: {
  icon: React.ReactNode;
  label: string;
  day: string;
  value: string;
  sub: string;
  valueColor: string;
}) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1 transition-all hover:scale-[1.02]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-center gap-1.5" style={{ color: '#6A6A6A' }}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-base font-bold mt-0.5" style={{ color: '#EAEAEA' }}>{day}</div>
      <div className="text-sm font-bold" style={{ color: valueColor }}>{value}</div>
      <div className="text-[11px]" style={{ color: '#6A6A6A' }}>{sub}</div>
    </div>
  );
}

function SmartInsightsPanel({ 
  combinations, 
  breakdown,
  timezone 
}: { 
  combinations: any; 
  breakdown: BreakdownData;
  timezone: string;
}) {
  const dayStats = useMemo(() => {
    const data = (breakdown.byDayOfWeek || []).filter(d => d.stats.totalTrades > 0);
    if (data.length === 0) return null;
    return {
      bestDay:    [...data].sort((a, b) => b.stats.totalR    - a.stats.totalR)[0],
      worstDay:   [...data].sort((a, b) => a.stats.totalR    - b.stats.totalR)[0],
      mostActive: [...data].sort((a, b) => b.stats.totalTrades - a.stats.totalTrades)[0],
      bestWR:     [...data].sort((a, b) => b.stats.winRate   - a.stats.winRate)[0],
    };
  }, [breakdown.byDayOfWeek]);

  return (
    <div 
      className="rounded-xl p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(14,14,14,0.9) 100%)',
        border: '2px solid rgba(201,166,70,0.3)',
        boxShadow: '0 8px 32px rgba(201,166,70,0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="p-2.5 rounded-lg"
          style={{
            background: 'rgba(201,166,70,0.2)',
            border: '1px solid rgba(201,166,70,0.4)',
          }}
        >
          <Sparkles className="w-5 h-5" style={{ color: '#C9A646' }} />
        </div>
        <div>
          <h3 className="text-base font-bold" style={{ color: '#EAEAEA' }}>
            AI Trading Recommendations
          </h3>
          <p className="text-xs" style={{ color: '#9A9A9A' }}>
            Based on your historical performance data
          </p>
        </div>
      </div>

      {/* 4 Day Stat Cards */}
      {dayStats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <DayStatCard
            icon={<TrendingUp className="w-3 h-3" />}
            label="Best performing day"
            day={dayStats.bestDay.name.slice(0, 3)}
            value={`${dayStats.bestDay.stats.totalR >= 0 ? '+' : ''}${dayStats.bestDay.stats.totalR.toFixed(1)}R`}
            sub={`${dayStats.bestDay.stats.totalTrades} trades`}
            valueColor="#00C46C"
          />
          <DayStatCard
            icon={<TrendingDown className="w-3 h-3" />}
            label="Least performing day"
            day={dayStats.worstDay.name.slice(0, 3)}
            value={`${dayStats.worstDay.stats.totalR >= 0 ? '+' : ''}${dayStats.worstDay.stats.totalR.toFixed(1)}R`}
            sub={`${dayStats.worstDay.stats.totalTrades} trades`}
            valueColor="#E44545"
          />
          <DayStatCard
            icon={<Zap className="w-3 h-3" />}
            label="Most active day"
            day={dayStats.mostActive.name.slice(0, 3)}
            value={`${dayStats.mostActive.stats.totalTrades} trades`}
            sub={`${dayStats.mostActive.stats.winRate.toFixed(0)}% WR`}
            valueColor="#63B3ED"
          />
          <DayStatCard
            icon={<Target className="w-3 h-3" />}
            label="Best win rate"
            day={dayStats.bestWR.name.slice(0, 3)}
            value={`${dayStats.bestWR.stats.winRate.toFixed(0)}%`}
            sub={`${dayStats.bestWR.stats.totalTrades} trade${dayStats.bestWR.stats.totalTrades !== 1 ? 's' : ''}`}
            valueColor="#C9A646"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {combinations.assetSession && (
          <RecommendationCard
            icon={<Target className="w-4 h-4" />}
            title="Best Time to Trade"
            subtitle={`${combinations.assetSession.asset} during ${formatSessionDisplay(combinations.assetSession.session)}`}
            metric={`+${combinations.assetSession.totalR.toFixed(1)}R`}
            metricColor="#00C46C"
            details={`${combinations.assetSession.trades} trades • ${combinations.assetSession.winRate.toFixed(0)}% WR`}
            actionText="Focus here for maximum profit"
          />
        )}

        {combinations.strategyAsset && (
          <RecommendationCard
            icon={<Zap className="w-4 h-4" />}
            title="Best Strategy-Asset Pair"
            subtitle={`${combinations.strategyAsset.strategy} on ${combinations.strategyAsset.asset}`}
            metric={`+${combinations.strategyAsset.totalR.toFixed(1)}R`}
            metricColor="#00C46C"
            details={`${combinations.strategyAsset.trades} trades • ${combinations.strategyAsset.winRate.toFixed(0)}% WR`}
            actionText="Your highest edge combination"
          />
        )}
      </div>

      {combinations.worstCombo && combinations.worstCombo.totalR < -5 && (
        <div 
          className="mt-4 p-4 rounded-lg flex items-start gap-3"
          style={{
            background: 'rgba(228,69,69,0.1)',
            border: '1px solid rgba(228,69,69,0.3)',
          }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#E44545' }} />
          <div>
            <h4 className="text-sm font-semibold mb-1" style={{ color: '#E44545' }}>
              ⚠️ Avoid This Combination
            </h4>
            <p className="text-xs" style={{ color: '#9A9A9A' }}>
              <span style={{ color: '#EAEAEA' }}>{combinations.worstCombo.description}</span>
              {' '}has resulted in {combinations.worstCombo.totalR.toFixed(1)}R loss 
              over {combinations.worstCombo.trades} trades. Consider avoiding or adjusting your approach here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({
  icon,
  title,
  subtitle,
  metric,
  metricColor,
  details,
  actionText
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  metric: string;
  metricColor: string;
  details: string;
  actionText: string;
}) {
  return (
    <div 
      className="p-3 rounded-lg transition-all hover:scale-[1.01] cursor-pointer flex items-center gap-4"
      style={{
        background: 'rgba(20,20,20,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div 
        className="p-2.5 rounded-lg flex-shrink-0"
        style={{ background: 'rgba(201,166,70,0.1)', border: '1px solid rgba(201,166,70,0.2)' }}
      >
        <div style={{ color: '#C9A646' }}>{icon}</div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#6A6A6A' }}>
            {title}
          </h4>
        </div>
        <div className="text-sm font-bold truncate" style={{ color: '#EAEAEA' }}>
          {subtitle}
        </div>
        <div className="text-xs mt-0.5" style={{ color: '#6A6A6A' }}>
          {details}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <div className="text-xl font-bold" style={{ color: metricColor }}>
          {metric}
        </div>
        <div className="text-[10px] font-medium mt-0.5" style={{ color: '#C9A646' }}>
          💡 {actionText}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Expandable Combination Analysis with Timezone
// ==========================================

function ExpandableCombinationAnalysis({ 
  trades,
  timezone 
}: { 
  trades: Trade[];
  timezone: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeMatrix, setActiveMatrix] = useState<'asset_session' | 'strategy_session' | 'strategy_asset'>('asset_session');

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full p-4 rounded-xl flex items-center justify-between transition-all hover:scale-[1.01]"
        style={{
          background: 'rgba(20,20,20,0.6)',
          border: '1px solid rgba(201,166,70,0.3)',
        }}
      >
        <div className="flex items-center gap-3">
          <Grid3x3 className="w-5 h-5" style={{ color: '#C9A646' }} />
          <div className="text-left">
            <div className="text-sm font-semibold" style={{ color: '#EAEAEA' }}>
              View Detailed Combination Analysis
            </div>
            <div className="text-xs" style={{ color: '#9A9A9A' }}>
              See performance matrices for all asset, session, and strategy combinations
            </div>
          </div>
        </div>
        <ChevronDown className="w-5 h-5" style={{ color: '#C9A646' }} />
      </button>
    );
  }

  return (
    <div 
      className="rounded-xl p-6"
      style={{
        background: 'rgba(14,14,14,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 
          className="text-lg font-bold flex items-center gap-2"
          style={{ color: '#EAEAEA' }}
        >
          <Grid3x3 className="w-5 h-5" style={{ color: '#C9A646' }} />
          Detailed Performance Matrices
        </h3>
        <button
          onClick={() => setExpanded(false)}
          className="p-2 rounded-lg transition-all hover:bg-white/5"
        >
          <ChevronUp className="w-5 h-5" style={{ color: '#9A9A9A' }} />
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveMatrix('asset_session')}
          className="flex-1 p-3 rounded-lg text-sm font-medium transition-all"
          style={{
            background: activeMatrix === 'asset_session' 
              ? 'linear-gradient(135deg, #C9A646, #B48C2C)'
              : 'rgba(20,20,20,0.6)',
            color: activeMatrix === 'asset_session' ? '#000' : '#EAEAEA',
            border: activeMatrix === 'asset_session' ? 'none' : '1px solid rgba(255,255,255,0.05)',
          }}
        >
          Asset × Session
        </button>
        <button
          onClick={() => setActiveMatrix('strategy_session')}
          className="flex-1 p-3 rounded-lg text-sm font-medium transition-all"
          style={{
            background: activeMatrix === 'strategy_session' 
              ? 'linear-gradient(135deg, #C9A646, #B48C2C)'
              : 'rgba(20,20,20,0.6)',
            color: activeMatrix === 'strategy_session' ? '#000' : '#EAEAEA',
            border: activeMatrix === 'strategy_session' ? 'none' : '1px solid rgba(255,255,255,0.05)',
          }}
        >
          Strategy × Session
        </button>
        <button
          onClick={() => setActiveMatrix('strategy_asset')}
          className="flex-1 p-3 rounded-lg text-sm font-medium transition-all"
          style={{
            background: activeMatrix === 'strategy_asset' 
              ? 'linear-gradient(135deg, #C9A646, #B48C2C)'
              : 'rgba(20,20,20,0.6)',
            color: activeMatrix === 'strategy_asset' ? '#000' : '#EAEAEA',
            border: activeMatrix === 'strategy_asset' ? 'none' : '1px solid rgba(255,255,255,0.05)',
          }}
        >
          Strategy × Asset
        </button>
      </div>

      {activeMatrix === 'asset_session' && (
        <CompactCombinationMatrix
          trades={trades}
          rowType="asset"
          colType="session"
          title="Asset × Session Performance"
          timezone={timezone}
        />
      )}
      {activeMatrix === 'strategy_session' && (
        <CompactCombinationMatrix
          trades={trades}
          rowType="strategy"
          colType="session"
          title="Strategy × Session Performance"
          timezone={timezone}
        />
      )}
      {activeMatrix === 'strategy_asset' && (
        <CompactCombinationMatrix
          trades={trades}
          rowType="strategy"
          colType="asset"
          title="Strategy × Asset Performance"
          timezone={timezone}
        />
      )}
    </div>
  );
}

// ==========================================
// Compact Combination Matrix with Timezone
// ==========================================

function CompactCombinationMatrix({
  trades,
  rowType,
  colType,
  title,
  timezone
}: {
  trades: Trade[];
  rowType: 'asset' | 'session' | 'strategy';
  colType: 'asset' | 'session' | 'strategy';
  title: string;
  timezone: string;
}) {
  const { combinationMap, rowValues, colValues, bestCombo, maxR, minR } = useMemo(() => {
    const combinationMap = new Map<string, { trades: Trade[]; stats: StrategyStats }>();
    
    trades.forEach(trade => {
      const asset = trade.symbol || 'Unknown';
      const session = trade.session || 'No Session';
      const strategy = trade.strategy_name || getStrategyName(trade.strategy) || 'No Strategy';
      
      const rowValue = rowType === 'asset' ? asset : rowType === 'session' ? session : strategy;
      const colValue = colType === 'asset' ? asset : colType === 'session' ? session : strategy;
      
      const key = `${rowValue}___${colValue}`;
      
      if (!combinationMap.has(key)) {
        combinationMap.set(key, { trades: [], stats: {} as StrategyStats });
      }
      
      combinationMap.get(key)!.trades.push(trade);
    });
    
    combinationMap.forEach((value) => {
      value.stats = calculateAllStats(value.trades);
    });
    
    const rowValues = Array.from(new Set(trades.map(t => {
      if (rowType === 'asset') return t.symbol || 'Unknown';
      if (rowType === 'session') return t.session || 'No Session';
      return t.strategy_name || getStrategyName(t.strategy) || 'No Strategy';
    }))).sort();
    
    const colValues = Array.from(new Set(trades.map(t => {
      if (colType === 'asset') return t.symbol || 'Unknown';
      if (colType === 'session') return t.session || 'No Session';
      return t.strategy_name || getStrategyName(t.strategy) || 'No Strategy';
    }))).sort();
    
    let bestCombo = { row: '', col: '', r: -Infinity };
    let maxR = -Infinity;
    let minR = Infinity;
    
    combinationMap.forEach((value, key) => {
      const [row, col] = key.split('___');
      const r = value.stats.totalR;
      if (r > maxR) maxR = r;
      if (r < minR) minR = r;
      if (r > bestCombo.r && value.trades.length >= 2) {
        bestCombo = { row, col, r };
      }
    });
    
    return { combinationMap, rowValues, colValues, bestCombo, maxR, minR };
  }, [trades, rowType, colType]);
  
  const range = maxR - minR || 1;

  return (
    <div>
      <p className="text-xs mb-4" style={{ color: '#9A9A9A' }}>
        {title} - Hover over cells for detailed information
      </p>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th 
                className="p-2 text-left text-xs font-semibold sticky left-0 z-10"
                style={{ background: '#0E0E0E', color: '#9A9A9A' }}
              />
              {colValues.map((col, idx) => (
                <th 
                  key={idx}
                  className="p-2 text-center text-xs font-semibold"
                  style={{ color: '#9A9A9A' }}
                >
                  {colType === 'session' ? formatSessionDisplay(col) : col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowValues.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td 
                  className="p-2 text-xs font-semibold sticky left-0 z-10"
                  style={{ background: '#0E0E0E', color: '#EAEAEA' }}
                >
                  {rowType === 'session' ? formatSessionDisplay(row) : row}
                </td>
                {colValues.map((col, colIdx) => {
                  const key = `${row}___${col}`;
                  const data = combinationMap.get(key);
                  
                  if (!data || data.trades.length === 0) {
                    return (
                      <td 
                        key={colIdx}
                        className="p-2 text-center"
                        style={{
                          background: 'rgba(50,50,50,0.2)',
                          border: '1px solid rgba(255,255,255,0.02)',
                        }}
                      >
                        <div className="text-xs" style={{ color: '#606060' }}>—</div>
                      </td>
                    );
                  }
                  
                  const r = data.stats.totalR;
                  const intensity = Math.abs(r - minR) / range;
                  const isPositive = r >= 0;
                  const isBest = row === bestCombo.row && col === bestCombo.col;
                  
                  return (
                    <td 
                      key={colIdx}
                      className="p-2 text-center relative group cursor-pointer"
                      style={{
                        background: isBest 
                          ? 'rgba(201,166,70,0.3)'
                          : isPositive 
                            ? `rgba(0,196,108,${0.15 + intensity * 0.5})`
                            : `rgba(228,69,69,${0.15 + intensity * 0.5})`,
                        border: isBest 
                          ? '2px solid #C9A646'
                          : '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div className="text-sm font-bold" style={{ color: isPositive ? '#00C46C' : '#E44545' }}>
                        {r >= 0 ? '+' : ''}{r.toFixed(1)}R
                      </div>
                      <div className="text-xs" style={{ color: '#9A9A9A' }}>
                        {data.trades.length}T
                      </div>
                      
                      <div 
                        className="absolute hidden group-hover:block z-20 p-3 rounded-lg w-48"
                        style={{
                          background: '#101010',
                          border: '1px solid #C9A646',
                          top: '-90px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        }}
                      >
                        <div className="text-xs font-bold mb-2" style={{ color: '#C9A646' }}>
                          {rowType === 'session' ? formatSessionDisplay(row) : row} × {colType === 'session' ? formatSessionDisplay(col) : col}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span style={{ color: '#9A9A9A' }}>Total R:</span>
                            <span style={{ color: isPositive ? '#00C46C' : '#E44545' }}>
                              {r >= 0 ? '+' : ''}{r.toFixed(2)}R
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: '#9A9A9A' }}>Trades:</span>
                            <span style={{ color: '#EAEAEA' }}>{data.trades.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: '#9A9A9A' }}>Win Rate:</span>
                            <span style={{ color: data.stats.winRate >= 50 ? '#00C46C' : '#E44545' }}>
                              {data.stats.winRate.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Continue in next message due to length...

// ==========================================
// ADVANCED TAB
// ==========================================

// ── Asset class classifier ─────────────────────────────────────────────────
const CRYPTO_SYMBOLS  = ['BTC','ETH','SOL','XRP','BNB','ADA','DOGE','AVAX','MATIC','DOT'];
const FOREX_PAIRS     = ['EUR','GBP','USD','JPY','AUD','CAD','CHF','NZD','EURUSD','GBPUSD','USDJPY','AUDUSD'];
const FUTURES_SUFFIX  = ['NQ','ES','YM','RTY','CL','GC','SI','ZB','MNQ','MES'];

function classifyAsset(symbol: string): 'Stocks' | 'Forex' | 'Crypto' | 'Futures' {
  const s = (symbol || '').toUpperCase();
  if (FUTURES_SUFFIX.some(f => s.includes(f)))  return 'Futures';
  if (CRYPTO_SYMBOLS.some(c => s.includes(c)))  return 'Crypto';
  if (FOREX_PAIRS.some(f => s.includes(f)))     return 'Forex';
  return 'Stocks';
}

const ASSET_META: Record<string, { color: string; gradient: string }> = {
  Futures: { color: '#C9A646', gradient: 'rgba(201,166,70,0.12)'  },
  Stocks:  { color: '#63B3ED', gradient: 'rgba(99,179,237,0.12)'  },
  Forex:   { color: '#A78BFA', gradient: 'rgba(167,139,250,0.12)' },
  Crypto:  { color: '#F6AD55', gradient: 'rgba(246,173,85,0.12)'  },
};

function AdvancedTab({ stats, trades }: { stats: StrategyStats; trades: Trade[] }) {

  const assetData = useMemo(() => {
    const map = new Map<string, Map<string, Trade[]>>();

    trades.forEach(trade => {
      const asset    = classifyAsset(trade.symbol || '');
      const strategy = trade.strategy_name || getStrategyName(trade.strategy) || 'No Strategy';
      if (!map.has(asset)) map.set(asset, new Map());
      const sMap = map.get(asset)!;
      if (!sMap.has(strategy)) sMap.set(strategy, []);
      sMap.get(strategy)!.push(trade);
    });

    return Array.from(map.entries()).map(([assetClass, stratMap]) => {
      const strategies = Array.from(stratMap.entries()).map(([name, ts]) => {
        const s = calculateAllStats(ts);
        return { name, trades: ts.length, totalR: s.totalR, winRate: s.winRate, avgRR: s.avgRR };
      }).sort((a, b) => b.totalR - a.totalR);

      const allTrades  = strategies.reduce((sum, s) => sum + s.trades, 0);
      const totalR     = strategies.reduce((sum, s) => sum + s.totalR, 0);
      const best       = strategies[0];

      return { assetClass, strategies, allTrades, totalR, best };
    }).sort((a, b) => b.totalR - a.totalR);
  }, [trades]);

  const maxAbsR = Math.max(...assetData.flatMap(a =>
    a.strategies.map(s => Math.abs(s.totalR))
  ), 1);

  return (
    <div className="space-y-5">

      {/* ── Summary row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {(['Futures','Stocks','Forex','Crypto'] as const).map(ac => {
          const found = assetData.find(a => a.assetClass === ac);
          const meta  = ASSET_META[ac];
          return (
            <div
              key={ac}
              className="rounded-xl p-4 transition-all hover:scale-[1.02]"
              style={{
                background: found
                  ? `linear-gradient(135deg, ${meta.gradient} 0%, rgba(10,10,10,0.95) 100%)`
                  : 'rgba(10,10,10,0.6)',
                border: `1px solid ${found ? meta.color + '35' : 'rgba(255,255,255,0.04)'}`,
                boxShadow: found ? `0 4px 20px ${meta.color}08` : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: meta.color }}>
                  {ac}
                </span>
                {found && (
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
                  />
                )}
              </div>
              <>
                <div className="text-2xl font-bold tracking-tight mb-1" style={{ color: found ? (found.totalR >= 0 ? '#00C46C' : '#E44545') : '#303030' }}>
                  {found ? `${found.totalR >= 0 ? '+' : ''}${found.totalR.toFixed(1)}R` : '0.0R'}
                </div>
                <div className="text-[11px] mb-3" style={{ color: '#505050' }}>
                  {found ? `${found.allTrades} trades` : '0 trades'}
                </div>
                {found?.best ? (
                  <div
                    className="text-[10px] px-2 py-1 rounded font-medium truncate"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      color: '#8A8A8A',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    Best: {found.best.name}
                  </div>
                ) : (
                  <div
                    className="text-[10px] px-2 py-1 rounded font-medium"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      color: '#303030',
                      border: '1px solid rgba(255,255,255,0.03)',
                    }}
                  >
                    No strategies yet
                  </div>
                )}
              </>
            </div>
          );
        })}
      </div>

      {/* ── Per-asset strategy breakdown ────────────────────────── */}
      {(['Futures','Stocks','Forex','Crypto'] as const).map(ac => {
        const found = assetData.find(a => a.assetClass === ac);
        const meta  = ASSET_META[ac];
        const strategies = found?.strategies || [];

        return (
          <div
            key={ac}
            className="rounded-xl overflow-hidden"
            style={{
              background: 'rgba(10,10,10,0.95)',
              border: `1px solid ${found ? meta.color + '25' : 'rgba(255,255,255,0.04)'}`,
              boxShadow: found ? `0 4px 24px ${meta.color}08` : 'none',
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${meta.color}18`, background: found ? meta.gradient : 'rgba(255,255,255,0.01)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-8 rounded-full flex-shrink-0"
                  style={{ background: found ? `linear-gradient(180deg, ${meta.color}, ${meta.color}40)` : 'rgba(255,255,255,0.06)' }}
                />
                <div>
                  <h3 className="text-sm font-bold tracking-wide" style={{ color: found ? meta.color : '#404040' }}>{ac}</h3>
                  <p className="text-[10px]" style={{ color: '#505050' }}>
                    {found ? `${strategies.length} strategies traded` : 'No trades recorded'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold" style={{ color: found ? (found.totalR >= 0 ? '#00C46C' : '#E44545') : '#2A2A2A' }}>
                  {found ? `${found.totalR >= 0 ? '+' : ''}${found.totalR.toFixed(1)}R` : '0.0R'}
                </div>
                <div className="text-[10px]" style={{ color: '#505050' }}>total</div>
              </div>
            </div>

            {/* Strategy rows */}
            <div className="p-4 space-y-3">
              {found ? strategies.map((s, idx) => {
                const barPct = Math.abs(s.totalR) / maxAbsR * 100;
                const isPos  = s.totalR >= 0;
                const isBest = idx === 0;
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {isBest && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: meta.color, color: '#000' }}
                          >
                            BEST
                          </span>
                        )}
                        <span className="text-xs font-semibold truncate" style={{ color: '#EAEAEA' }}>
                          {s.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                        <span className="text-[10px]" style={{ color: '#6A6A6A' }}>{s.trades}T</span>
                        <span className="text-[10px]" style={{ color: s.winRate >= 50 ? '#00C46C' : '#E44545' }}>
                          {s.winRate.toFixed(0)}% WR
                        </span>
                        <span className="text-sm font-bold w-16 text-right" style={{ color: isPos ? '#00C46C' : '#E44545' }}>
                          {isPos ? '+' : ''}{s.totalR.toFixed(1)}R
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${barPct}%`,
                          background: isPos
                            ? `linear-gradient(90deg, ${meta.color}80, #00C46C)`
                            : 'linear-gradient(90deg, #E4454580, #E44545)',
                        }}
                      />
                    </div>
                  </div>
                );
              }) : (
                [1, 2, 3].map(i => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-3 rounded" style={{ width: `${80 + i * 30}px`, background: 'rgba(255,255,255,0.03)' }} />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-3 w-6 rounded" style={{ background: 'rgba(255,255,255,0.03)' }} />
                        <div className="h-3 w-12 rounded" style={{ background: 'rgba(255,255,255,0.03)' }} />
                        <div className="h-3 w-14 rounded" style={{ background: 'rgba(255,255,255,0.03)' }} />
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// PSYCHOLOGY TAB
// ==========================================

function PsychologyTab({ stats, trades }: { stats: StrategyStats; trades: Trade[] }) {
  const emotionalControl = Math.min(100, Math.max(0, 100 - ((stats.maxConsecutiveLosses || 0) * 15)));
  const disciplineScore = stats.avgRR >= 2 ? 90 : stats.avgRR >= 1.5 ? 70 : stats.avgRR >= 1 ? 50 : 30;
  const riskManagement = stats.profitFactor >= 2 ? 95 : stats.profitFactor >= 1.5 ? 80 : stats.profitFactor >= 1 ? 60 : 40;
  const overallMindset = Math.round((emotionalControl + disciplineScore + riskManagement) / 3);

  let revengeTrades = 0;
  for (let i = 1; i < trades.length; i++) {
    const prev = trades[i - 1];
    const curr = trades[i];
    const prevR = prev.metrics?.rr || prev.metrics?.actual_r || 0;
    const currR = curr.metrics?.rr || curr.metrics?.actual_r || 0;
    
    if (prevR < 0 && currR < 0) {
      const timeDiff = new Date(curr.open_at).getTime() - new Date(prev.close_at || prev.open_at).getTime();
      if (timeDiff < 1000 * 60 * 30) {
        revengeTrades++;
      }
    }
  }

  let personalityType = 'Balanced';
  if (stats.avgTradeDuration && stats.avgTradeDuration < 2) personalityType = 'Scalper';
  else if (stats.avgTradeDuration && stats.avgTradeDuration > 24) personalityType = 'Position Trader';
  else if (stats.consistency && stats.consistency > 70) personalityType = 'Systematic';
  else if (stats.prematurelyClosed && stats.prematurelyClosed > stats.totalTrades * 0.4) personalityType = 'Impulsive';

  return (
    <div className="space-y-5">
      <div 
        className="rounded-xl p-6 backdrop-blur-md relative overflow-hidden"
        style={{
          background: 'rgba(14,14,14,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: '3px solid #C9A646',
        }}
      >
        <div 
          className="absolute top-0 right-0 w-1/2 h-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #C9A646 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        
        <h3 
          className="text-xs uppercase tracking-widest mb-5 flex items-center gap-2"
          style={{ color: '#C9A646', fontWeight: 700 }}
        >
          <Brain className="w-4 h-4" />
          Trading Mindset Analysis
        </h3>
        
        <div className="flex items-center gap-6 mb-6 relative z-10">
          <div className="flex-1">
            <div className="text-5xl font-bold mb-2" style={{ 
              color: overallMindset >= 75 ? '#00C46C' : overallMindset >= 50 ? '#C9A646' : '#E44545' 
            }}>
              {overallMindset}/100
            </div>
            <p className="text-xs" style={{ color: '#9A9A9A' }}>
              Your Trading Mindset Score
            </p>
            <p className="text-xs mt-1" style={{ color: '#C9A646' }}>
              Personality: {personalityType}
            </p>
          </div>
          
          <div className="flex-1 space-y-3">
            <MindsetBar label="Emotional Control" value={emotionalControl} icon={<Heart className="w-3 h-3" />} />
            <MindsetBar label="Discipline" value={disciplineScore} icon={<Focus className="w-3 h-3" />} />
            <MindsetBar label="Risk Management" value={riskManagement} icon={<Shield className="w-3 h-3" />} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <PsychologyCard
          title="Loss Recovery"
          icon={<AlertCircle className="w-4 h-4" />}
          mainValue={stats.maxConsecutiveLosses || 0}
          label="Max Consecutive Losses"
          insight={
            (stats.maxConsecutiveLosses || 0) === 1 
              ? 'Perfect! You maintain discipline.' 
              : (stats.maxConsecutiveLosses || 0) === 2
              ? 'Good control of emotions.'
              : (stats.maxConsecutiveLosses || 0) === 3
              ? 'Consider a cooldown rule.'
              : 'Critical: Implement strict cooldown after 2 losses.'
          }
          color={(stats.maxConsecutiveLosses || 0) <= 2 ? '#00C46C' : (stats.maxConsecutiveLosses || 0) === 3 ? '#C9A646' : '#E44545'}
        />

        <PsychologyCard
          title="Risk Behavior"
          icon={<Shield className="w-4 h-4" />}
          mainValue={stats.avgRR.toFixed(2)}
          label="Average R:R Ratio"
          insight={
            stats.avgRR >= 2.5 ? 'Excellent - you let winners run.' :
            stats.avgRR >= 2 ? 'Great discipline maintained.' :
            stats.avgRR >= 1.5 ? 'Good. Consider holding longer.' :
            'Work on letting winners run more.'
          }
          color={stats.avgRR >= 2 ? '#00C46C' : stats.avgRR >= 1.5 ? '#C9A646' : '#E44545'}
        />

        <PsychologyCard
          title="Emotional Patterns"
          icon={<Heart className="w-4 h-4" />}
          mainValue={`${stats.maxConsecutiveWins || 0}/${stats.maxConsecutiveLosses || 0}`}
          label="Win Streak / Loss Streak"
          insight={
            (stats.maxConsecutiveWins || 0) > (stats.maxConsecutiveLosses || 0) * 2
              ? 'You capitalize on winning momentum well.'
              : 'Focus on extending win streaks and cutting losses faster.'
          }
          color="#C9A646"
        />

        <PsychologyCard
          title="Revenge Trading"
          icon={<Flame className="w-4 h-4" />}
          mainValue={revengeTrades}
          label="Suspected Revenge Trades"
          insight={
            revengeTrades === 0 ? 'Excellent control - no revenge trading detected.' :
            revengeTrades <= 2 ? 'Minimal revenge trading. Keep it up.' :
            'Warning: Multiple revenge trades detected. Take breaks after losses.'
          }
          color={revengeTrades === 0 ? '#00C46C' : revengeTrades <= 2 ? '#C9A646' : '#E44545'}
        />
      </div>

      {stats.prematurelyClosed && stats.prematurelyClosed > stats.totalTrades * 0.3 && (
        <div 
          className="rounded-xl p-4"
          style={{
            background: '#101010',
            border: '1px solid rgba(255,193,7,0.3)',
          }}
        >
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#FFC107' }} />
            <div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: '#FFC107' }}>
                Cognitive Bias Detected: Loss Aversion
              </h4>
              <p className="text-xs leading-relaxed" style={{ color: '#9A9A9A' }}>
                You closed {((stats.prematurelyClosed / stats.totalTrades) * 100).toFixed(0)}% of winning trades 
                before reaching take profit. This indicates loss aversion bias - the fear of losing unrealized gains. 
                Trust your analysis and let winners run to target.
              </p>
            </div>
          </div>
        </div>
      )}

      <div 
        className="rounded-xl p-5"
        style={{
          background: 'rgba(14,14,14,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#C9A646' }}>
          <Lightbulb className="w-4 h-4" />
          Recommended Actions
        </h4>
        <ul className="space-y-2 text-xs" style={{ color: '#9A9A9A' }}>
          <li className="flex gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#C9A646' }} />
            <span>Take 15-minute break after every losing trade</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#C9A646' }} />
            <span>Journal emotional state before and after each trade</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#C9A646' }} />
            <span>Stop trading for the day after 2 consecutive losses</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#C9A646' }} />
            <span>Weekly review to identify emotional patterns and triggers</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#C9A646' }} />
            <span>Set alerts for take profit levels to avoid premature exits</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ==========================================
// HELPER COMPONENTS
// ==========================================

function StatBoxCompact({ 
  label, 
  value, 
  color, 
  sublabel,
  icon,
  change,
  trend
}: { 
  label: string; 
  value: string; 
  color: string; 
  sublabel?: string;
  icon?: React.ReactNode;
  change?: number;
  trend?: 'up' | 'down';
}) {
  return (
    <div 
      className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] group"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Ambient glow */}
      <div 
        className="absolute -top-6 -left-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `${color}22`, filter: 'blur(20px)' }}
      />
      {/* Bottom glow line */}
      <div 
        className="absolute bottom-0 left-4 right-4 h-px opacity-30"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      <div className="relative p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {icon && (
              <div 
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}
              >
                <div style={{ color }}>{icon}</div>
              </div>
            )}
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#6A6A6A' }}>
              {label}
            </p>
          </div>
          {trend && change !== undefined && (
            <div className="flex items-center gap-1" style={{ color }}>
              {trend === 'up' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span className="text-xs font-semibold">{Math.abs(change).toFixed(1)}</span>
            </div>
          )}
        </div>
        
        <p className="text-3xl font-bold tracking-tight" style={{ color }}>
          {value}
        </p>
        
        {sublabel && (
          <p className="text-xs mt-1" style={{ color: '#6A6A6A' }}>
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
}

function MetricCardCompact({
  label,
  value,
  description,
  color,
  benchmark,
  percentile
}: {
  label: string;
  value: string;
  description: string;
  color: string;
  benchmark: string;
  percentile: string;
}) {
  return (
    <div 
      className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] group"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: `1px solid ${color}22`,
        boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Ambient glow */}
      <div 
        className="absolute -top-8 -left-8 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `${color}18`, filter: 'blur(24px)' }}
      />
      {/* Bottom accent line */}
      <div 
        className="absolute bottom-0 left-4 right-4 h-px opacity-40"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      <div className="relative p-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#6A6A6A' }}>
          {label}
        </div>
        <p className="text-3xl font-bold tracking-tight mb-2" style={{ color }}>
          {value}
        </p>
        <p className="text-xs mb-3" style={{ color: '#6A6A6A' }}>
          {description}
        </p>
        <div className="flex items-center justify-between gap-2">
          <div 
            className="text-xs px-2 py-1 rounded-lg inline-block font-medium" 
            style={{
              background: `${color}15`,
              color: color,
              border: `1px solid ${color}30`,
            }}
          >
            {benchmark}
          </div>
          <div className="text-xs font-semibold" style={{ color }}>
            {percentile}
          </div>
        </div>
      </div>
    </div>
  );
}

function BestWorstCard({ title, trade, r, date, type }: { 
  title: string; 
  trade: Trade; 
  r: number; 
  date: string;
  type: 'best' | 'worst';
}) {
  const color = type === 'best' ? '#00C46C' : '#E44545';
  
  return (
    <div 
      className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.01] group"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: `1px solid ${type === 'best' ? 'rgba(0,196,108,0.2)' : 'rgba(228,69,69,0.2)'}`,
        boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Ambient glow */}
      <div 
        className="absolute -top-8 -left-8 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `${color}18`, filter: 'blur(24px)' }}
      />
      {/* Bottom line */}
      <div 
        className="absolute bottom-0 left-4 right-4 h-px opacity-40"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      <div className="relative p-4">
        <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: '#6A6A6A' }}>
          {title}
        </h4>
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-bold" style={{ color: '#EAEAEA' }}>
            {trade.symbol}
          </span>
          <span className="text-2xl font-bold" style={{ color }}>
            {r >= 0 ? '+' : ''}{r.toFixed(2)}R
          </span>
        </div>
        <div className="flex items-center justify-between text-xs" style={{ color: '#6A6A6A' }}>
          <span>{trade.side}</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
}

function MomentumCard({ momentum }: { momentum: { score: number; label: string; color: string } }) {
  return (
    <div 
      className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.01] group"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: `1px solid ${momentum.color}33`,
        boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Ambient glow */}
      <div 
        className="absolute -top-8 -left-8 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `${momentum.color}18`, filter: 'blur(24px)' }}
      />
      {/* Bottom line */}
      <div 
        className="absolute bottom-0 left-4 right-4 h-px opacity-40"
        style={{ background: `linear-gradient(90deg, transparent, ${momentum.color}, transparent)` }}
      />

      <div className="relative p-4">
        <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4 flex items-center gap-1" style={{ color: '#6A6A6A' }}>
          <Flame className="w-3 h-3" />
          Momentum Indicator
        </h4>
        <div className="mb-3">
          <div className="text-3xl font-bold tracking-tight" style={{ color: momentum.color }}>
            {momentum.score}
          </div>
          <div className="text-sm font-medium mt-0.5" style={{ color: momentum.color }}>
            {momentum.label}
          </div>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div 
            className="h-full rounded-full transition-all duration-700"
            style={{ 
              width: `${momentum.score}%`,
              background: `linear-gradient(90deg, ${momentum.color}, ${momentum.color}88)`
            }}
          />
        </div>
      </div>
    </div>
  );
}

function DistributionPieChart({ trades }: { trades: Trade[] }) {
  const { data, colors } = useMemo(() => {
    const strategyMap = new Map<string, number>();
    trades.forEach(trade => {
      const strategyName = trade.strategy_name || 
                           getStrategyName(trade.strategy) || 
                           'No Strategy';
      strategyMap.set(strategyName, (strategyMap.get(strategyName) || 0) + 1);
    });

    const data = Array.from(strategyMap.entries())
      .map(([name, count]) => ({ name, count, percent: (count / trades.length) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const colors = ['#C9A646', '#4ADE80', '#EF4444', '#60A5FA', '#F59E0B'];
    
    return { data, colors };
  }, [trades]);

  return (
    <div 
      className="rounded-[20px] p-6 shadow-[0_0_30px_rgba(201,166,70,0.05)]"
      style={{
        background: '#0C0C0C',
        border: '1px solid rgba(255, 215, 0, 0.08)',
      }}
    >
      <div className="flex items-center gap-2 mb-6">
        <PieChart className="w-5 h-5" style={{ color: '#C9A646' }} />
        <h3 
          className="text-base font-semibold"
          style={{ color: '#F4F4F4' }}
        >
          Trade Distribution by Strategy
        </h3>
      </div>
      
      <div className="flex items-start gap-8">
        <div className="flex-shrink-0">
          <div className="w-36 h-36 relative">
            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
              <circle cx="50" cy="50" r="32" fill="#0A0A0A" />
              
              {data.map((item, idx) => {
                const startAngle = data.slice(0, idx).reduce((sum, d) => sum + (d.percent / 100) * 360, 0);
                const endAngle = startAngle + (item.percent / 100) * 360;
                const largeArc = item.percent > 50 ? 1 : 0;
                
                const outerRadius = 42;
                const innerRadius = 32;
                
                const x1 = 50 + outerRadius * Math.cos((startAngle * Math.PI) / 180);
                const y1 = 50 + outerRadius * Math.sin((startAngle * Math.PI) / 180);
                const x2 = 50 + outerRadius * Math.cos((endAngle * Math.PI) / 180);
                const y2 = 50 + outerRadius * Math.sin((endAngle * Math.PI) / 180);
                
                const innerX1 = 50 + innerRadius * Math.cos((endAngle * Math.PI) / 180);
                const innerY1 = 50 + innerRadius * Math.sin((endAngle * Math.PI) / 180);
                const innerX2 = 50 + innerRadius * Math.cos((startAngle * Math.PI) / 180);
                const innerY2 = 50 + innerRadius * Math.sin((startAngle * Math.PI) / 180);
                
                return (
                  <path
                    key={idx}
                    d={`M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${innerX1} ${innerY1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerX2} ${innerY2} Z`}
                    fill={colors[idx]}
                    opacity="0.95"
                  />
                );
              })}
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold" style={{ color: '#F4F4F4' }}>
                {data.length}
              </div>
              <div className="text-[10px] font-light" style={{ color: '#A0A0A0' }}>
                Strategies
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-2.5">
          {data.map((item, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 flex-1">
                <div 
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: colors[idx] }}
                />
                <span 
                  className="text-sm font-medium"
                  style={{ color: '#E0E0E0' }}
                >
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span 
                  className="text-sm font-semibold whitespace-nowrap"
                  style={{ color: colors[idx] }}
                >
                  {item.count} trade{item.count !== 1 ? 's' : ''}
                </span>
                <span 
                  className="text-xs font-light w-12 text-right"
                  style={{ color: '#A0A0A0' }}
                >
                  {item.percent.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BreakdownSection({ 
  title, 
  data,
  timezone 
}: { 
  title: string; 
  data: { name: string; stats: StrategyStats }[];
  timezone?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div 
        className="rounded-xl p-5"
        style={{
          background: 'rgba(14,14,14,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h3 
          className="text-xs uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ color: '#C9A646', fontWeight: 700 }}
        >
          <BarChart3 className="w-4 h-4" />
          {title}
        </h3>
        <div className="py-6 text-center" style={{ color: '#606060' }}>
          <p className="text-sm">No data available</p>
        </div>
      </div>
    );
  }

  const isSessionBreakdown = title.includes('Session');

  return (
    <div 
      className="rounded-xl p-5"
      style={{
        background: 'rgba(14,14,14,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <h3 
        className="text-xs uppercase tracking-widest mb-4 flex items-center gap-2"
        style={{ color: '#C9A646', fontWeight: 700 }}
      >
        <BarChart3 className="w-4 h-4" />
        {title}
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th className="text-left py-2 px-3 text-xs font-semibold" style={{ color: '#9A9A9A' }}>Name</th>
              <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: '#9A9A9A' }}>Trades</th>
              <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: '#9A9A9A' }}>WR</th>
              <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: '#9A9A9A' }}>Total R</th>
              <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: '#9A9A9A' }}>Avg R:R</th>
              <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: '#9A9A9A' }}>P&L</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr 
                key={idx}
                className="hover:bg-white/5 transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
              >
                <td className="py-2 px-3 font-medium text-sm" style={{ color: '#EAEAEA' }}>
                  {isSessionBreakdown && timezone ? formatSessionDisplay(item.name) : item.name}
                </td>
                <td className="text-right py-2 px-3 text-sm" style={{ color: '#9A9A9A' }}>{item.stats.totalTrades}</td>
                <td className="text-right py-2 px-3 text-sm font-semibold" style={{ 
                  color: item.stats.winRate >= 50 ? '#00C46C' : '#E44545' 
                }}>
                  {item.stats.winRate.toFixed(0)}%
                </td>
                <td className="text-right py-2 px-3 text-sm font-semibold" style={{ 
                  color: item.stats.totalR >= 0 ? '#00C46C' : '#E44545' 
                }}>
                  {item.stats.totalR >= 0 ? '+' : ''}{item.stats.totalR.toFixed(1)}R
                </td>
                <td className="text-right py-2 px-3 text-sm" style={{ color: '#C9A646' }}>
                  {item.stats.avgRR.toFixed(2)}
                </td>
                <td className="text-right py-2 px-3 text-sm font-semibold" style={{ 
                  color: item.stats.netPnL >= 0 ? '#00C46C' : '#E44545' 
                }}>
                  ${item.stats.netPnL.toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Custom Tooltip for DayOfWeek chart ──────────────────────────────────
const DayTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const pnl = payload.find((p: any) => p.dataKey === 'totalR');
  const cnt = payload.find((p: any) => p.dataKey === 'totalTrades');
  const wr  = payload.find((p: any) => p.dataKey === 'winRate');
  const isPos = (pnl?.value ?? 0) >= 0;

  return (
    <div style={{
      background: 'rgba(14,14,14,0.97)',
      border: `1px solid ${isPos ? 'rgba(0,196,108,0.3)' : 'rgba(228,69,69,0.3)'}`,
      borderRadius: 10,
      padding: '12px 16px',
      minWidth: 160,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ color: '#C9A646', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{label}</div>
      {pnl && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#9A9A9A', fontSize: 11 }}>Net R</span>
          <span style={{ color: isPos ? '#00C46C' : '#E44545', fontSize: 13, fontWeight: 700 }}>
            {isPos ? '+' : ''}{pnl.value?.toFixed(2)}R
          </span>
        </div>
      )}
      {cnt && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#9A9A9A', fontSize: 11 }}>Trades</span>
          <span style={{ color: '#EAEAEA', fontSize: 11, fontWeight: 600 }}>{cnt.value}</span>
        </div>
      )}
      {wr && cnt?.value > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9A9A9A', fontSize: 11 }}>Win Rate</span>
          <span style={{ color: '#C9A646', fontSize: 11, fontWeight: 600 }}>{wr.value?.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
});
DayTooltip.displayName = 'DayTooltip';

// ─── Win Rate Bar Chart by Day ────────────────────────────────────────────

const WinRateTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const wr = payload[0]?.value ?? 0;
  const d = payload[0]?.payload;

  return (
    <div style={{
      background: 'rgba(14,14,14,0.97)',
      border: '1px solid rgba(0,196,108,0.3)',
      borderRadius: 10,
      padding: '12px 16px',
      minWidth: 150,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ color: '#C9A646', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#9A9A9A', fontSize: 11 }}>Win Rate</span>
        <span style={{ color: '#00C46C', fontSize: 15, fontWeight: 700 }}>{wr.toFixed(0)}%</span>
      </div>
      {d && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9A9A9A', fontSize: 11 }}>Trades</span>
          <span style={{ color: '#EAEAEA', fontSize: 11, fontWeight: 600 }}>{d.totalTrades}</span>
        </div>
      )}
    </div>
  );
});
WinRateTooltip.displayName = 'WinRateTooltip';

function DayWinRateChart({ data }: { data: { name: string; stats: StrategyStats }[] }) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const chartData = useMemo(() =>
    days.map(day => {
      const found = data.find(d => d.name === day);
      const stats = found?.stats ?? ({ winRate: 0, totalTrades: 0 } as StrategyStats);
      return {
        day: day.slice(0, 3),
        winRate: Number((stats.winRate ?? 0).toFixed(1)),
        totalTrades: stats.totalTrades ?? 0,
      };
    }),
    [data]
  );

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'rgba(14,14,14,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3
          className="text-xs uppercase tracking-widest flex items-center gap-2"
          style={{ color: '#C9A646', fontWeight: 700 }}
        >
          <Target className="w-4 h-4" />
          Win Rate by Day
        </h3>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#9A9A9A' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#00C46C', display: 'inline-block' }} />
          Win %
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
          <defs>
            <linearGradient id="winBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E87A" stopOpacity={1} />
              <stop offset="100%" stopColor="#00703A" stopOpacity={0.85} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

          <XAxis
            dataKey="day"
            tick={{ fill: '#9A9A9A', fontSize: 12, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#606060', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            ticks={[0, 25, 50, 75, 100]}
            width={38}
          />

          <Tooltip
            content={<WinRateTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />

          <Bar
            dataKey="winRate"
            fill="url(#winBarGrad)"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DayOfWeekHeatmap({ data }: { data: { name: string; stats: StrategyStats }[] }) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const chartData = useMemo(() =>
    days.map(day => {
      const found = data.find(d => d.name === day);
      const stats = found?.stats ?? ({ totalR: 0, totalTrades: 0, winRate: 0 } as StrategyStats);
      return {
        day: day === 'Sunday' ? 'Sun'
         : day === 'Monday' ? 'Mon'
         : day === 'Tuesday' ? 'Tue'
         : day === 'Wednesday' ? 'Wed'
         : day === 'Thursday' ? 'Thu'
         : day === 'Friday' ? 'Fri'
         : 'Sat',  // Sun, Mon, Tue, Wed, Thu, Fri, Sat
        totalR: Number((stats.totalR ?? 0).toFixed(2)),
        totalTrades: stats.totalTrades ?? 0,
        winRate: stats.winRate ?? 0,
      };
    }),
    [data]
  );

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'rgba(14,14,14,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3
          className="text-xs uppercase tracking-widest flex items-center gap-2"
          style={{ color: '#C9A646', fontWeight: 700 }}
        >
          <Calendar className="w-4 h-4" />
          Performance by Day
        </h3>
        <div className="flex items-center gap-4 text-xs" style={{ color: '#9A9A9A' }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(0,196,108,0.7)', display: 'inline-block' }} />
            Net R
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(99,179,237,0.7)', display: 'inline-block' }} />
            Trade Count
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dayPosGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00C46C" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#00C46C" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="dayNegGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E44545" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#E44545" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="dayCntGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#63B3ED" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#63B3ED" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" yAxisId="r" />

          <XAxis
            dataKey="day"
            tick={{ fill: '#9A9A9A', fontSize: 12, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="r"
            tick={{ fill: '#606060', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}R`}
            width={46}
          />
          <YAxis
            yAxisId="cnt"
            orientation="right"
            tick={{ fill: '#606060', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            width={28}
          />

          <Tooltip
            content={<DayTooltip />}
            cursor={{ stroke: 'rgba(201,166,70,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          {/* Net R area — positive green / negative red via sign */}
          <Area
            yAxisId="r"
            type="monotone"
            dataKey="totalR"
            stroke="none"
            fill="url(#dayPosGrad)"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="r"
            type="monotone"
            dataKey="totalR"
            stroke="#00C46C"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#00C46C', stroke: '#0A0A0A', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#00C46C', stroke: '#0A0A0A', strokeWidth: 2 }}
            isAnimationActive={false}
          />

          {/* Trade count area */}
          <Area
            yAxisId="cnt"
            type="monotone"
            dataKey="totalTrades"
            stroke="none"
            fill="url(#dayCntGrad)"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="cnt"
            type="monotone"
            dataKey="totalTrades"
            stroke="#63B3ED"
            strokeWidth={2}
            dot={{ r: 4, fill: '#63B3ED', stroke: '#0A0A0A', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#63B3ED', stroke: '#0A0A0A', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function EfficiencyCard({ 
  label, 
  value, 
  count, 
  total, 
  color,
  sublabel,
  warning 
}: { 
  label: string; 
  value: string; 
  count?: number;
  total?: number;
  color: string;
  sublabel?: string;
  warning?: boolean;
}) {
  return (
    <div 
      className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] group"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: `1px solid ${warning ? 'rgba(255,193,7,0.25)' : `${color}22`}`,
        boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Ambient glow */}
      <div 
        className="absolute -top-8 -left-8 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: warning ? 'rgba(255,193,7,0.12)' : `${color}18`, filter: 'blur(24px)' }}
      />
      {/* Bottom accent line */}
      <div 
        className="absolute bottom-0 left-4 right-4 h-px opacity-40"
        style={{ background: `linear-gradient(90deg, transparent, ${warning ? '#FFC107' : color}, transparent)` }}
      />

      <div className="relative p-4">
        <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: '#6A6A6A' }}>
          {label}
          {warning && <AlertTriangle className="w-3 h-3" style={{ color: '#FFC107' }} />}
        </h4>
        <div className="text-3xl font-bold tracking-tight mb-1" style={{ color }}>
          {value}
        </div>
        {count !== undefined && total !== undefined && (
          <div className="text-xs mt-1" style={{ color: '#6A6A6A' }}>
            {count} out of {total} trades
          </div>
        )}
        {sublabel && (
          <div className="text-xs mt-1" style={{ color: '#6A6A6A' }}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

function MindsetBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs flex items-center gap-1" style={{ color: '#EAEAEA' }}>
          {icon} {label}
        </span>
        <span className="text-xs font-bold" style={{ color: '#C9A646' }}>{value}/100</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div 
          className="h-full rounded-full transition-all"
          style={{ 
            width: `${value}%`,
            background: 'linear-gradient(90deg, #C9A646 0%, #00C46C 100%)'
          }}
        />
      </div>
    </div>
  );
}

function PsychologyCard({ 
  title, 
  icon, 
  mainValue, 
  label, 
  insight, 
  color 
}: { 
  title: string; 
  icon: React.ReactNode; 
  mainValue: string | number; 
  label: string; 
  insight: string; 
  color: string;
}) {
  return (
    <div 
      className="p-4 rounded-lg"
      style={{
        background: 'rgba(20,20,20,0.6)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: '#EAEAEA' }}>
        <div style={{ color: '#C9A646' }}>{icon}</div>
        {title}
      </h4>
      <div className="mb-2">
        <div className="text-xs mb-1" style={{ color: '#9A9A9A' }}>{label}</div>
        <div className="text-3xl font-bold" style={{ color }}>
          {mainValue}
        </div>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: '#9A9A9A' }}>
        {insight}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #121212 100%)' }}
    >
      <div className="text-center">
        <div 
          className="w-16 h-16 mx-auto mb-4 rounded-full border-4 animate-spin"
          style={{ borderColor: '#C9A646', borderTopColor: 'transparent' }} 
        />
        <p style={{ color: '#9A9A9A' }}>Loading analytics...</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #121212 100%)' }}
    >
      <div 
        className="rounded-xl p-12 text-center max-w-md"
        style={{
          background: 'rgba(14,14,14,0.8)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <Activity className="w-16 h-16 mx-auto mb-4" style={{ color: '#606060' }} />
        <h3 className="text-2xl font-bold mb-2" style={{ color: '#EAEAEA' }}>
          No Data Yet
        </h3>
        <p className="text-sm mb-6" style={{ color: '#9A9A9A' }}>
          Start trading and close some positions to see your analytics and insights here.
        </p>
        <button
          onClick={() => window.location.href = '/app/journal/new'}
          className="px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #C9A646, #B48C2C)',
            color: '#000',
          }}
        >
          Add Your First Trade
        </button>
      </div>
    </div>
  );
}