import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useSmartRefresh } from "@/hooks/useSmartRefresh";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Plus, X, Upload, TrendingUp, Target, Shield, Brain, ChevronRight, ChevronLeft,
  Settings, Trash2, Edit2, BarChart3, Activity, List, TrendingDown, Award,
  Calendar, Clock, Zap, PieChart, DollarSign, Percent, Info
} from "lucide-react";
import { useTrades } from "@/hooks/useTradesData";
import EquityCurveChart from '@/components/charts/EquityCurveChart';
import { 
  useStrategiesOptimized,
  useStrategyOptimized,
  useCreateStrategyOptimized,
  useUpdateStrategyOptimized,
  useDeleteStrategyOptimized,
} from "@/hooks/useStrategies";
import { 
  calculateAllStats,
  type Trade,
  type StrategyStats as BaseStrategyStats,
} from "@/utils/statsCalculations";
import { toast } from "sonner";
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatTradeDate, formatTradeDateShort } from '@/utils/dateFormatter';
import { formatSessionDisplay } from '@/constants/tradingSessions';

// ==========================================
// 🎯 TYPES
// ==========================================

interface ExtendedStrategy {
  id: string;
  name: string;
  description?: string;
  category?: string;
  timeframe?: string;
  markets?: string[];
  setupType?: string;
  confirmationSignals?: string[];
  visualExamples?: string[];
  defaultStopLoss?: number;
  defaultTakeProfit?: number;
  avgRiskPerTrade?: number;
  maxDailyLoss?: number;
  positionSizingRule?: string;
  typicalSession?: string;
  expectedWinRate?: number;
  avgRRGoal?: number;
  psychologicalNotes?: string;
  status: 'active' | 'archived';
  createdAt: string;
}

interface StrategyStats extends BaseStrategyStats {
  rDistribution: number[];
  winStreak: number;
  lossStreak: number;
  currentDrawdown: number;
  avgTradeDuration: number;
}

// ==========================================
// 🎯 OPTIMIZED STATS CALCULATION
// ==========================================

function calculateStrategyStatsOptimized(trades: Trade[]): StrategyStats {
  const baseStats = calculateAllStats(trades);
  const rDistribution = trades
    .map(t => t.metrics?.actual_r || t.metrics?.rr || 0)
    .filter(r => r !== 0);
  
  let currentStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let lastOutcome = '';
  
  trades.forEach(trade => {
    const pnl = trade.pnl || 0;
    const outcome = trade.outcome || (pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE');
    
    if (outcome === lastOutcome && outcome !== 'BE') {
      currentStreak++;
    } else {
      if (lastOutcome === 'WIN') maxWinStreak = Math.max(maxWinStreak, currentStreak);
      if (lastOutcome === 'LOSS') maxLossStreak = Math.max(maxLossStreak, currentStreak);
      currentStreak = 1;
    }
    lastOutcome = outcome;
  });
  
  if (lastOutcome === 'WIN') maxWinStreak = Math.max(maxWinStreak, currentStreak);
  if (lastOutcome === 'LOSS') maxLossStreak = Math.max(maxLossStreak, currentStreak);
  
  let runningR = 0;
  let peakR = 0;
  let maxDD = 0;
  
  trades.forEach(trade => {
    const r = trade.metrics?.actual_r || trade.metrics?.rr || 0;
    runningR += r;
    if (runningR > peakR) peakR = runningR;
    const currentDD = peakR - runningR;
    if (currentDD > maxDD) maxDD = currentDD;
  });
  
  const durations: number[] = [];
  trades.forEach(trade => {
    const t = trade as any;
    if (t.entryTime && t.exitTime) {
      const duration = new Date(t.exitTime).getTime() - new Date(t.entryTime).getTime();
      durations.push(duration / (1000 * 60));
    }
  });
  const avgTradeDuration = durations.length > 0 
    ? durations.reduce((a, b) => a + b, 0) / durations.length 
    : 0;
  
  return { 
    ...baseStats, 
    rDistribution,
    winStreak: maxWinStreak,
    lossStreak: maxLossStreak,
    currentDrawdown: peakR - runningR,
    avgTradeDuration,
  };
}

// ==========================================
// 🎨 MEMOIZED UI COMPONENTS
// ==========================================

const Tooltip = memo(({ content, children }: { content: string; children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show && (
        <div
          className="absolute z-50 px-3 py-2 text-xs rounded-lg whitespace-nowrap bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none"
          style={{
            background: 'rgba(20,20,20,0.98)',
            border: '1px solid rgba(201,166,70,0.3)',
            color: '#EAEAEA',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}
        >
          {content}
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid rgba(20,20,20,0.98)',
            }}
          />
        </div>
      )}
    </div>
  );
});
Tooltip.displayName = 'Tooltip';

const SimplePieChart = memo(({ wins, losses }: { wins: number; losses: number }) => {
  const total = wins + losses;
  if (total === 0) return null;
  
  const winPercent = (wins / total) * 100;
  
  return (
    <div className="relative w-32 h-32 mx-auto">
      <div
        className="w-full h-full rounded-full"
        style={{
          background: `conic-gradient(
            #00C46C 0deg ${(winPercent / 100) * 360}deg,
            #E44545 ${(winPercent / 100) * 360}deg 360deg
          )`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: '#EAEAEA' }}>
            {winPercent.toFixed(0)}%
          </div>
          <div className="text-xs" style={{ color: '#9A9A9A' }}>Win Rate</div>
        </div>
      </div>
    </div>
  );
});
SimplePieChart.displayName = 'SimplePieChart';

const RDistributionChart = memo(({ rValues }: { rValues: number[] }) => {
  if (rValues.length === 0) return null;
  
  const bins = useMemo(() => [-3, -2, -1, 0, 1, 2, 3, 4, 5], []);
  
  const { counts, maxCount } = useMemo(() => {
    const counts = new Array(bins.length).fill(0);
    
    rValues.forEach(r => {
      for (let i = 0; i < bins.length - 1; i++) {
        if (r >= bins[i] && r < bins[i + 1]) {
          counts[i]++;
          break;
        }
      }
    });
    
    return { counts, maxCount: Math.max(...counts) };
  }, [rValues, bins]);
  
  return (
    <div className="space-y-2">
      {bins.slice(0, -1).map((bin, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs w-16" style={{ color: '#9A9A9A' }}>
            {bin >= 0 ? '+' : ''}{bin}R to {bins[i + 1]}R
          </span>
          <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${maxCount > 0 ? (counts[i] / maxCount) * 100 : 0}%`,
                background: bin >= 0 
                  ? 'linear-gradient(90deg, rgba(0,196,108,0.6), rgba(0,196,108,0.3))'
                  : 'linear-gradient(90deg, rgba(228,69,69,0.6), rgba(228,69,69,0.3))',
              }}
            />
          </div>
          <span className="text-xs w-8 text-right" style={{ color: '#EAEAEA' }}>
            {counts[i]}
          </span>
        </div>
      ))}
    </div>
  );
});
RDistributionChart.displayName = 'RDistributionChart';
// ==========================================
// 🚀 STRATEGY DETAIL VIEW - FULL VERSION
// ==========================================

function StrategyDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { id: userId, isImpersonating, isLoading: userLoading } = useEffectiveUser();
  const timezone = useTimezone(); // ✅ הוסף timezone

  console.log('🔍 StrategyDetailView:', {
    strategyId: id,
    userId,
    isImpersonating,
    userLoading,
    timezone, // ✅ log timezone
  });
  
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'analytics' | 'insights'>('overview');

  const { data: strategy, isLoading: strategyLoading } = useStrategyOptimized(id, userId);
  const { data: allTrades = [], isLoading: tradesLoading } = useTrades(userId);

  const loading = userLoading || strategyLoading || tradesLoading;

  console.log('🔍 StrategyDetailView Data:', {
    strategy: strategy?.name,
    tradesCount: allTrades.length,
    loading,
  });

  const strategyTrades = useMemo(() => {
    if (!strategy) return [];
    return allTrades.filter((t: any) => 
      t.strategy_id === strategy.id || 
      t.strategy === strategy.id || 
      t.strategy === strategy.name
    );
  }, [strategy, allTrades]);

  const stats = useMemo(() => {
    if (!strategy || strategyTrades.length === 0) return null;
    return calculateStrategyStatsOptimized(strategyTrades as Trade[]);
  }, [strategy, strategyTrades]);

  const isProfitable = stats ? stats.totalR >= 0 : false;

  if (loading) {
    return (
      <div style={{ background: '#0A0A0A', minHeight: '100vh' }} className="flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-t-transparent animate-spin" 
               style={{ borderColor: '#C9A646', borderTopColor: 'transparent' }} />
          <p style={{ color: '#9A9A9A' }}>Loading strategy...</p>
        </div>
      </div>
    );
  }

  if (!strategy || !stats) {
    return (
      <div style={{ background: '#0A0A0A', minHeight: '100vh' }} className="flex items-center justify-center">
        <p style={{ color: '#9A9A9A' }}>Strategy not found</p>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        background: isProfitable 
          ? 'linear-gradient(180deg, #0A0A0A 0%, #0F1810 50%, #121212 100%)'
          : 'linear-gradient(180deg, #0A0A0A 0%, #180F0F 50%, #121212 100%)',
        minHeight: '100vh',
        transition: 'background 0.8s ease-in-out'
      }}
    >
      <div className="max-w-7xl mx-auto px-8 py-12">
        {isImpersonating && (
          <div 
            className="mb-6 p-3 rounded-lg flex items-center gap-2"
            style={{
              background: 'rgba(201,166,70,0.15)',
              border: '1px solid rgba(201,166,70,0.3)',
            }}
          >
            <Info className="w-4 h-4" style={{ color: '#C9A646' }} />
            <span className="text-sm" style={{ color: '#C9A646' }}>
              Viewing as another user
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-4 mb-8 opacity-0 animate-fadeIn" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <button
            onClick={() => navigate('/app/journal/strategies')}
            className="p-3 rounded-xl hover:bg-white/5 transition-all hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6" style={{ color: '#C9A646' }} />
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold" style={{ color: '#EAEAEA' }}>
              {strategy.name}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#9A9A9A' }}>
              {strategy.description || 'No description'}
            </p>
          </div>
        </div>

        {stats.totalTrades > 0 && (
          <div 
            className="mb-8 p-6 rounded-2xl opacity-0 animate-fadeIn"
            style={{ 
              background: isProfitable
                ? 'linear-gradient(135deg, rgba(0,196,108,0.08), rgba(201,166,70,0.08))'
                : 'linear-gradient(135deg, rgba(228,69,69,0.08), rgba(201,166,70,0.08))',
              border: `2px solid ${isProfitable ? 'rgba(0,196,108,0.2)' : 'rgba(228,69,69,0.2)'}`,
              boxShadow: `0 8px 32px ${isProfitable ? 'rgba(0,196,108,0.1)' : 'rgba(228,69,69,0.1)'}`,
              animationDelay: '0.2s',
              animationFillMode: 'forwards'
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5" style={{ color: '#C9A646' }} />
              <h3 className="text-lg font-bold" style={{ color: '#EAEAEA' }}>Quick Stats</h3>
            </div>
            <div className="grid grid-cols-6 gap-4">
              {[
                { 
                  icon: Percent, 
                  label: 'Win Rate', 
                  value: `${stats.winRate.toFixed(0)}%`,
                  color: stats.winRate >= 50 ? '#00C46C' : '#E44545',
                  tooltip: 'Percentage of winning trades'
                },
                { 
                  icon: TrendingUp, 
                  label: 'Avg R', 
                  value: `${stats.avgR >= 0 ? '+' : ''}${stats.avgR.toFixed(2)}R`,
                  color: stats.avgR >= 0 ? '#00C46C' : '#E44545',
                  tooltip: 'Average R multiple per trade'
                },
                { 
                  icon: DollarSign, 
                  label: 'Net P&L', 
                  value: `$${stats.netPnL >= 0 ? '+' : ''}${stats.netPnL.toFixed(0)}`,
                  color: stats.netPnL >= 0 ? '#00C46C' : '#E44545',
                  tooltip: 'Total profit/loss in dollars'
                },
                { 
                  icon: Zap, 
                  label: 'Profit Factor', 
                  value: stats.profitFactor.toFixed(2),
                  color: stats.profitFactor >= 1.5 ? '#00C46C' : stats.profitFactor >= 1 ? '#C9A646' : '#E44545',
                  tooltip: 'Total wins ÷ Total losses'
                },
                { 
                  icon: Target, 
                  label: 'Expectancy', 
                  value: `${stats.expectancy >= 0 ? '+' : ''}${stats.expectancy.toFixed(2)}R`,
                  color: stats.expectancy >= 0 ? '#00C46C' : '#E44545',
                  tooltip: 'Expected R per trade'
                },
                { 
                  icon: TrendingDown, 
                  label: 'Max DD', 
                  value: `${stats.maxDrawdown.toFixed(1)}R`,
                  color: '#E44545',
                  tooltip: 'Maximum drawdown from peak equity'
                },
              ].map((kpi, i) => (
                <Tooltip key={i} content={kpi.tooltip}>
                  <div className="flex flex-col items-center text-center">
                    <kpi.icon className="w-5 h-5 mb-2" style={{ color: '#C9A646' }} />
                    <div className="text-2xl font-bold mb-1" style={{ color: kpi.color }}>
                      {kpi.value}
                    </div>
                    <div className="text-xs" style={{ color: '#9A9A9A' }}>{kpi.label}</div>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'trades', label: 'Trades', icon: List },
            { id: 'analytics', label: 'Analytics', icon: Activity },
            { id: 'insights', label: 'Insights', icon: Brain },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
              style={activeTab === tab.id ? {
                background: 'linear-gradient(135deg, rgba(201,166,70,0.25), rgba(201,166,70,0.15))',
                color: '#C9A646',
                border: '2px solid rgba(201,166,70,0.4)',
                boxShadow: '0 4px 16px rgba(201,166,70,0.2)',
              } : {
                background: 'rgba(255,255,255,0.03)',
                color: '#9A9A9A',
                border: '2px solid rgba(255,255,255,0.08)',
              }}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ==========================================
            📋 TAB: OVERVIEW
            ========================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: 'Total Trades', value: stats.totalTrades, color: '#EAEAEA', icon: List },
                { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? '#00C46C' : '#E44545', icon: Percent },
                { label: 'Total R', value: `${stats.totalR >= 0 ? '+' : ''}${stats.totalR.toFixed(2)}R`, color: stats.totalR >= 0 ? '#00C46C' : '#E44545', icon: TrendingUp },
                { label: 'Net P&L', value: `$${stats.netPnL >= 0 ? '+' : ''}${stats.netPnL.toFixed(2)}`, color: stats.netPnL >= 0 ? '#00C46C' : '#E44545', icon: DollarSign },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="p-6 rounded-xl transition-all duration-300 hover:scale-105 opacity-0 animate-fadeIn"
                  style={{
                    background: 'rgba(20,20,20,0.8)',
                    border: '1px solid rgba(201,166,70,0.2)',
                    animationDelay: `${0.3 + i * 0.1}s`,
                    animationFillMode: 'forwards'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4" style={{ color: '#C9A646' }} />
                    <p className="text-xs" style={{ color: '#9A9A9A' }}>{stat.label}</p>
                  </div>
                  <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Avg R per Trade', value: stats.avgR.toFixed(2) + 'R', icon: Target, tooltip: 'Average R multiple across all trades' },
                { label: 'Avg Win', value: stats.avgWinR.toFixed(2) + 'R', icon: TrendingUp, tooltip: 'Average R on winning trades' },
                { label: 'Avg Loss', value: stats.avgLossR.toFixed(2) + 'R', icon: TrendingDown, tooltip: 'Average R on losing trades' },
                { label: 'Best Trade', value: stats.largestWin.toFixed(2) + 'R', icon: Award, tooltip: 'Largest winning trade' },
                { label: 'Worst Trade', value: stats.largestLoss.toFixed(2) + 'R', icon: X, tooltip: 'Largest losing trade' },
                { label: 'Profit Factor', value: stats.profitFactor.toFixed(2), icon: Zap, tooltip: 'Total Win / Total Loss' },
                { label: 'Expectancy', value: stats.expectancy.toFixed(2) + 'R', icon: Brain, tooltip: 'Expected return per trade' },
                { label: 'Consistency', value: stats.consistency.toFixed(2), icon: Activity, tooltip: 'Risk-adjusted return' },
                { label: 'Win Streak', value: `${stats.winStreak} trades`, icon: TrendingUp, tooltip: 'Longest winning streak' },
              ].map((stat, i) => (
                <Tooltip key={i} content={stat.tooltip}>
                  <div
                    className="p-5 rounded-xl transition-all duration-300 hover:scale-105 opacity-0 animate-fadeIn"
                    style={{
                      background: 'rgba(20,20,20,0.6)',
                      border: '1px solid rgba(201,166,70,0.15)',
                      animationDelay: `${0.7 + i * 0.05}s`,
                      animationFillMode: 'forwards'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <stat.icon className="w-4 h-4" style={{ color: '#C9A646' }} />
                      <p className="text-xs" style={{ color: '#9A9A9A' }}>{stat.label}</p>
                    </div>
                    <p className="text-xl font-semibold" style={{ color: '#EAEAEA' }}>{stat.value}</p>
                  </div>
                </Tooltip>
              ))}
            </div>

            {stats.totalTrades > 0 && (
              <div className="grid grid-cols-2 gap-6">
                <div 
                  className="p-6 rounded-xl opacity-0 animate-fadeIn"
                  style={{
                    background: 'rgba(20,20,20,0.8)',
                    border: '1px solid rgba(201,166,70,0.2)',
                    animationDelay: '1.2s',
                    animationFillMode: 'forwards'
                  }}
                >
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#EAEAEA' }}>
                    <PieChart className="w-5 h-5" style={{ color: '#C9A646' }} />
                    Win/Loss Distribution
                  </h3>
                  <SimplePieChart wins={stats.wins} losses={stats.losses} />
                  <div className="mt-4 flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#00C46C' }} />
                      <span className="text-sm" style={{ color: '#9A9A9A' }}>Wins: {stats.wins}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#E44545' }} />
                      <span className="text-sm" style={{ color: '#9A9A9A' }}>Losses: {stats.losses}</span>
                    </div>
                  </div>
                </div>

                <div 
                  className="p-6 rounded-xl opacity-0 animate-fadeIn"
                  style={{
                    background: 'rgba(20,20,20,0.8)',
                    border: '1px solid rgba(201,166,70,0.2)',
                    animationDelay: '1.3s',
                    animationFillMode: 'forwards'
                  }}
                >
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#EAEAEA' }}>
                    <BarChart3 className="w-5 h-5" style={{ color: '#C9A646' }} />
                    R Distribution
                  </h3>
                  <RDistributionChart rValues={stats.rDistribution} />
                </div>
              </div>
            )}
          </div>
        )}
        {/* ==========================================
            📋 TAB: TRADES - עם Timezone Support ✅
            ========================================== */}
        {activeTab === 'trades' && (
          <div>
            {strategyTrades.length > 0 ? (
              <div className="space-y-4">
                <div 
                  className="p-4 rounded-xl flex items-center justify-between"
                  style={{
                    background: 'rgba(201,166,70,0.1)',
                    border: '1px solid rgba(201,166,70,0.2)',
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: '#EAEAEA' }}>
                        {strategyTrades.length}
                      </div>
                      <div className="text-xs" style={{ color: '#9A9A9A' }}>Total Trades</div>
                    </div>
                    <div className="w-px h-12" style={{ background: 'rgba(201,166,70,0.3)' }} />
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: '#00C46C' }}>
                        {stats.wins}
                      </div>
                      <div className="text-xs" style={{ color: '#9A9A9A' }}>Wins</div>
                    </div>
                    <div className="w-px h-12" style={{ background: 'rgba(201,166,70,0.3)' }} />
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: '#E44545' }}>
                        {stats.losses}
                      </div>
                      <div className="text-xs" style={{ color: '#9A9A9A' }}>Losses</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm mb-1" style={{ color: '#9A9A9A' }}>Strategy Performance</div>
                    <div className="text-xl font-bold" style={{ color: stats.totalR >= 0 ? '#00C46C' : '#E44545' }}>
                      {stats.totalR >= 0 ? '+' : ''}{stats.totalR.toFixed(2)}R
                    </div>
                  </div>
                </div>

                <div 
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(20,20,20,0.8)',
                    border: '1px solid rgba(201,166,70,0.2)',
                  }}
                >
                  <div 
                    className="grid grid-cols-8 gap-4 p-4 text-xs font-bold"
                    style={{ 
                      background: 'rgba(201,166,70,0.1)',
                      borderBottom: '1px solid rgba(201,166,70,0.2)',
                      color: '#C9A646'
                    }}
                  >
                    <div>Date</div>
                    <div>Symbol</div>
                    <div>Type</div>
                    <div>Entry</div>
                    <div>Exit</div>
                    <div className="text-right">R Multiple</div>
                    <div className="text-right">P&L</div>
                    <div className="text-center">Result</div>
                  </div>

                  <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {strategyTrades.map((trade: any, index: number) => {
                      const r = trade.metrics?.rr || 0;
                      const pnl = trade.pnl || 0;
                      const outcome = trade.outcome || (pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE');
                      const isWin = outcome === 'WIN';
                      const isLoss = outcome === 'LOSS';

                      return (
                        <div
                          key={trade.id || index}
                          className="grid grid-cols-8 gap-4 p-4 text-sm hover:bg-white/5 transition-all cursor-pointer"
                          style={{ color: '#EAEAEA' }}
                        >
                          {/* ✅ Date עם Timezone Support */}
                          <div style={{ color: '#9A9A9A' }}>
                            {trade.entryTime 
                              ? formatTradeDateShort(trade.entryTime, timezone)
                              : 'N/A'}
                          </div>
                          
                          <div className="font-semibold">{trade.symbol || 'N/A'}</div>
                          
                          <div>
                            <span 
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{
                                background: trade.side === 'LONG' ? 'rgba(0,196,108,0.15)' : 'rgba(228,69,69,0.15)',
                                color: trade.side === 'LONG' ? '#00C46C' : '#E44545',
                              }}
                            >
                              {trade.side || 'N/A'}
                            </span>
                          </div>
                          
                          <div style={{ color: '#9A9A9A' }}>${trade.entryPrice?.toFixed(2) || 'N/A'}</div>
                          <div style={{ color: '#9A9A9A' }}>${trade.exitPrice?.toFixed(2) || 'N/A'}</div>
                          
                          <div className="text-right font-bold" style={{ color: r >= 0 ? '#00C46C' : '#E44545' }}>
                            {r >= 0 ? '+' : ''}{r.toFixed(2)}R
                          </div>
                          
                          <div className="text-right font-bold" style={{ color: pnl >= 0 ? '#00C46C' : '#E44545' }}>
                            ${pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                          </div>
                          
                          <div className="text-center">
                            <span 
                              className="px-3 py-1 rounded-full text-xs font-bold"
                              style={{
                                background: isWin ? 'rgba(0,196,108,0.2)' : isLoss ? 'rgba(228,69,69,0.2)' : 'rgba(201,166,70,0.2)',
                                color: isWin ? '#00C46C' : isLoss ? '#E44545' : '#C9A646',
                                border: `1px solid ${isWin ? '#00C46C' : isLoss ? '#E44545' : '#C9A646'}`,
                              }}
                            >
                              {outcome}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <List className="w-12 h-12 mx-auto mb-4" style={{ color: '#9A9A9A' }} />
                <p style={{ color: '#9A9A9A' }}>No trades for this strategy yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            📊 TAB: ANALYTICS
            ========================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {stats.totalTrades > 0 ? (
              <>
                <div 
                  className="p-6 rounded-xl"
                  style={{
                    background: 'rgba(20,20,20,0.8)',
                    border: '1px solid rgba(201,166,70,0.2)',
                  }}
                >
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#EAEAEA' }}>
                    <TrendingUp className="w-5 h-5" style={{ color: '#C9A646' }} />
                    Equity Curve - R Growth
                  </h3>
                  <div className="relative h-64">
                    <EquityCurveChart rValues={stats.rDistribution} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(20,20,20,0.8)',
                      border: '1px solid rgba(201,166,70,0.2)',
                    }}
                  >
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#EAEAEA' }}>
                      <Percent className="w-4 h-4" style={{ color: '#C9A646' }} />
                      Win Rate
                    </h3>
                    <div className="text-center">
                      <div 
                        className="text-5xl font-bold mb-2"
                        style={{ color: stats.winRate >= 50 ? '#00C46C' : '#E44545' }}
                      >
                        {stats.winRate.toFixed(0)}%
                      </div>
                      <div className="text-sm mb-4" style={{ color: '#9A9A9A' }}>
                        {stats.wins} wins / {stats.losses} losses
                      </div>
                      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${stats.winRate}%`,
                            background: stats.winRate >= 50
                              ? 'linear-gradient(90deg, rgba(0,196,108,0.8), rgba(0,196,108,0.4))'
                              : 'linear-gradient(90deg, rgba(228,69,69,0.8), rgba(228,69,69,0.4))',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(20,20,20,0.8)',
                      border: '1px solid rgba(201,166,70,0.2)',
                    }}
                  >
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#EAEAEA' }}>
                      <Target className="w-4 h-4" style={{ color: '#C9A646' }} />
                      Average R
                    </h3>
                    <div className="text-center">
                      <div 
                        className="text-5xl font-bold mb-2"
                        style={{ color: stats.avgR >= 0 ? '#00C46C' : '#E44545' }}
                      >
                        {stats.avgR >= 0 ? '+' : ''}{stats.avgR.toFixed(2)}R
                      </div>
                      <div className="text-sm mb-4" style={{ color: '#9A9A9A' }}>
                        Per trade expectancy
                      </div>
                      <div className="flex justify-center gap-4 text-xs">
                        <div style={{ color: '#00C46C' }}>Win: +{stats.avgWinR.toFixed(2)}R</div>
                        <div style={{ color: '#E44545' }}>Loss: {stats.avgLossR.toFixed(2)}R</div>
                      </div>
                    </div>
                  </div>

                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(20,20,20,0.8)',
                      border: '1px solid rgba(201,166,70,0.2)',
                    }}
                  >
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#EAEAEA' }}>
                      <DollarSign className="w-4 h-4" style={{ color: '#C9A646' }} />
                      Total P&L
                    </h3>
                    <div className="text-center">
                      <div 
                        className="text-5xl font-bold mb-2"
                        style={{ color: stats.netPnL >= 0 ? '#00C46C' : '#E44545' }}
                      >
                        ${stats.netPnL >= 0 ? '+' : ''}{stats.netPnL.toFixed(0)}
                      </div>
                      <div className="text-sm mb-4" style={{ color: '#9A9A9A' }}>
                        Total R: {stats.totalR >= 0 ? '+' : ''}{stats.totalR.toFixed(1)}R
                      </div>
                      <div className="text-xs" style={{ color: stats.profitFactor >= 1.5 ? '#00C46C' : '#C9A646' }}>
                        Profit Factor: {stats.profitFactor.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(20,20,20,0.8)',
                      border: '1px solid rgba(201,166,70,0.2)',
                    }}
                  >
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#EAEAEA' }}>
                      <BarChart3 className="w-5 h-5" style={{ color: '#C9A646' }} />
                      R Distribution
                    </h3>
                    <RDistributionChart rValues={stats.rDistribution} />
                  </div>

                  <div 
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(20,20,20,0.8)',
                      border: '1px solid rgba(201,166,70,0.2)',
                    }}
                  >
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#EAEAEA' }}>
                      <Activity className="w-5 h-5" style={{ color: '#C9A646' }} />
                      Performance Breakdown
                    </h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Best Trade', value: `+${stats.largestWin.toFixed(2)}R`, color: '#00C46C', icon: TrendingUp },
                        { label: 'Worst Trade', value: `${stats.largestLoss.toFixed(2)}R`, color: '#E44545', icon: TrendingDown },
                        { label: 'Expectancy', value: `${stats.expectancy >= 0 ? '+' : ''}${stats.expectancy.toFixed(2)}R`, color: stats.expectancy >= 0 ? '#00C46C' : '#E44545', icon: Target },
                        { label: 'Max Drawdown', value: `${stats.maxDrawdown.toFixed(2)}R`, color: '#E44545', icon: TrendingDown },
                        { label: 'Win Streak', value: `${stats.winStreak} trades`, color: '#00C46C', icon: Award },
                        { label: 'Loss Streak', value: `${stats.lossStreak} trades`, color: '#E44545', icon: X },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <item.icon className="w-4 h-4" style={{ color: '#C9A646' }} />
                            <span className="text-sm" style={{ color: '#9A9A9A' }}>{item.label}</span>
                          </div>
                          <span className="text-lg font-bold" style={{ color: item.color }}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div 
                  className="p-6 rounded-xl"
                  style={{
                    background: isProfitable
                      ? 'linear-gradient(135deg, rgba(0,196,108,0.08), rgba(201,166,70,0.08))'
                      : 'linear-gradient(135deg, rgba(228,69,69,0.08), rgba(201,166,70,0.08))',
                    border: `2px solid ${isProfitable ? 'rgba(0,196,108,0.2)' : 'rgba(228,69,69,0.2)'}`,
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="p-3 rounded-xl"
                      style={{ background: isProfitable ? 'rgba(0,196,108,0.15)' : 'rgba(228,69,69,0.15)' }}
                    >
                      <Award className="w-6 h-6" style={{ color: isProfitable ? '#00C46C' : '#E44545' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2" style={{ color: '#EAEAEA' }}>
                        Strategy Effectiveness: {isProfitable ? 'Profitable ✅' : 'Needs Improvement ⚠️'}
                      </h3>
                      <p className="text-sm" style={{ color: '#9A9A9A' }}>
                        {isProfitable ? (
                          <>
                            This strategy shows positive expectancy of <strong style={{ color: '#00C46C' }}>
                            {stats.expectancy.toFixed(2)}R</strong> per trade with a {stats.winRate.toFixed(0)}% win rate.
                            Your profit factor of <strong style={{ color: '#C9A646' }}>{stats.profitFactor.toFixed(2)}</strong> indicates 
                            {stats.profitFactor >= 2 ? ' exceptional' : stats.profitFactor >= 1.5 ? ' strong' : ' acceptable'} risk-reward management.
                          </>
                        ) : (
                          <>
                            This strategy shows negative expectancy of <strong style={{ color: '#E44545' }}>
                            {stats.expectancy.toFixed(2)}R</strong> per trade. Consider reviewing entry rules, 
                            position sizing, or stop-loss placement to improve performance.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto mb-4" style={{ color: '#9A9A9A' }} />
                <p style={{ color: '#9A9A9A' }}>No trades to analyze yet. Start trading to see analytics.</p>
              </div>
            )}
          </div>
        )}
        {/* ==========================================
            🧠 TAB: INSIGHTS - עם Session Display ✅
            ========================================== */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div 
              className="p-6 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.05))',
                border: '2px solid rgba(201,166,70,0.3)',
                boxShadow: '0 8px 24px rgba(201,166,70,0.15)',
              }}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl" style={{ background: 'rgba(201,166,70,0.2)' }}>
                  <Brain className="w-6 h-6" style={{ color: '#C9A646' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#C9A646' }}>
                    Strategy Insights
                  </h3>
                  {stats.totalTrades > 0 ? (
                    <div className="space-y-2 text-sm" style={{ color: '#EAEAEA' }}>
                      <p>
                        • Your strategy has a <strong style={{ color: stats.winRate >= 50 ? '#00C46C' : '#E44545' }}>
                        {stats.winRate.toFixed(0)}% win rate</strong> with an expectancy of <strong style={{ color: stats.expectancy >= 0 ? '#00C46C' : '#E44545' }}>
                        {stats.expectancy >= 0 ? '+' : ''}{stats.expectancy.toFixed(2)}R</strong> per trade.
                      </p>
                      <p>
                        • Profit factor of <strong style={{ color: stats.profitFactor >= 1.5 ? '#00C46C' : '#C9A646' }}>
                        {stats.profitFactor.toFixed(2)}</strong> indicates {stats.profitFactor >= 1.5 ? 'strong' : stats.profitFactor >= 1 ? 'acceptable' : 'weak'} performance.
                      </p>
                      <p>
                        • Your longest winning streak is <strong style={{ color: '#00C46C' }}>{stats.winStreak} trades</strong>, 
                        and longest losing streak is <strong style={{ color: '#E44545' }}>{stats.lossStreak} trades</strong>.
                      </p>
                      {stats.avgTradeDuration > 0 && (
                        <p>
                          • Average trade duration: <strong style={{ color: '#C9A646' }}>
                          {stats.avgTradeDuration < 60 
                            ? `${stats.avgTradeDuration.toFixed(0)} minutes`
                            : `${(stats.avgTradeDuration / 60).toFixed(1)} hours`}
                          </strong>
                        </p>
                      )}
                      {stats.consistency > 0 && (
                        <p>
                          • Consistency score: <strong style={{ color: stats.consistency >= 1 ? '#00C46C' : '#C9A646' }}>
                          {stats.consistency.toFixed(2)}</strong> {stats.consistency >= 1 ? '(Excellent)' : '(Needs improvement)'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: '#9A9A9A' }}>
                      No trades yet. Start trading to see AI-generated insights.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div 
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(20,20,20,0.8)',
                border: '1px solid rgba(201,166,70,0.2)',
              }}
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#EAEAEA' }}>
                <Shield className="w-5 h-5" style={{ color: '#C9A646' }} />
                Strategy Profile
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p style={{ color: '#9A9A9A' }}>Category:</p>
                  <p className="font-semibold" style={{ color: '#EAEAEA' }}>{strategy.category || 'Uncategorized'}</p>
                </div>
                <div>
                  <p style={{ color: '#9A9A9A' }}>Timeframe:</p>
                  <p className="font-semibold" style={{ color: '#EAEAEA' }}>{strategy.timeframe || 'Not specified'}</p>
                </div>
                <div>
                  <p style={{ color: '#9A9A9A' }}>Setup Type:</p>
                  <p className="font-semibold" style={{ color: '#EAEAEA' }}>{strategy.setupType || 'Not specified'}</p>
                </div>
                {/* ✅ Session Display עם Timezone Support */}
                <div>
                  <p style={{ color: '#9A9A9A' }}>Typical Session:</p>
                  <p className="font-semibold" style={{ color: '#EAEAEA' }}>
                    {strategy.typicalSession 
                      ? formatSessionDisplay(strategy.typicalSession)
                      : 'Not specified'}
                  </p>
                </div>
              </div>
              {strategy.psychologicalNotes && (
                <div className="mt-4 p-4 rounded-lg" style={{ background: 'rgba(201,166,70,0.05)', border: '1px solid rgba(201,166,70,0.15)' }}>
                  <p className="text-xs mb-1" style={{ color: '#9A9A9A' }}>Notes:</p>
                  <p className="text-sm" style={{ color: '#EAEAEA' }}>{strategy.psychologicalNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}

// ==========================================
// 🎨 STRATEGY MODAL (NEW/EDIT)
// ==========================================

interface StrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (strategy: any) => void;
  editingStrategy?: ExtendedStrategy | null;
}

const StrategyModal = memo(({ isOpen, onClose, onSave, editingStrategy }: StrategyModalProps) => {
  const isEditMode = !!editingStrategy;
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assetClasses, setAssetClasses] = useState<string[]>([]);
  const [setupType, setSetupType] = useState("");
  const [confirmationSignals, setConfirmationSignals] = useState("");
  const [visualExamples, setVisualExamples] = useState<File[]>([]);
  const [defaultStopLoss, setDefaultStopLoss] = useState<number | undefined>();
  const [defaultTakeProfit, setDefaultTakeProfit] = useState<number | undefined>();
  const [avgRiskPerTrade, setAvgRiskPerTrade] = useState<number | undefined>();
  const [maxDailyLoss, setMaxDailyLoss] = useState<number | undefined>();
  const [positionSizingRule, setPositionSizingRule] = useState("");
  const [typicalSession, setTypicalSession] = useState("");
  const [expectedWinRate, setExpectedWinRate] = useState<number | undefined>();
  const [avgRRGoal, setAvgRRGoal] = useState<number | undefined>();
  const [psychologicalNotes, setPsychologicalNotes] = useState("");

  useEffect(() => {
    if (editingStrategy) {
      setName(editingStrategy.name || "");
      setDescription(editingStrategy.description || "");
      setAssetClasses(editingStrategy.category ? editingStrategy.category.split(', ') : []);
      setSetupType(editingStrategy.setupType || "");
      setConfirmationSignals(editingStrategy.confirmationSignals?.join(', ') || "");
      setDefaultStopLoss(editingStrategy.defaultStopLoss);
      setDefaultTakeProfit(editingStrategy.defaultTakeProfit);
      setAvgRiskPerTrade(editingStrategy.avgRiskPerTrade);
      setMaxDailyLoss(editingStrategy.maxDailyLoss);
      setPositionSizingRule(editingStrategy.positionSizingRule || "");
      setTypicalSession(editingStrategy.typicalSession || "");
      setExpectedWinRate(editingStrategy.expectedWinRate);
      setAvgRRGoal(editingStrategy.avgRRGoal);
      setPsychologicalNotes(editingStrategy.psychologicalNotes || "");
    } else {
      setName("");
      setDescription("");
      setAssetClasses([]);
      setSetupType("");
      setConfirmationSignals("");
      setVisualExamples([]);
      setDefaultStopLoss(undefined);
      setDefaultTakeProfit(undefined);
      setAvgRiskPerTrade(undefined);
      setMaxDailyLoss(undefined);
      setPositionSizingRule("");
      setTypicalSession("");
      setExpectedWinRate(undefined);
      setAvgRRGoal(undefined);
      setPsychologicalNotes("");
      setCurrentStep(1);
    }
  }, [editingStrategy, isOpen]);

  const toggleAssetClass = useCallback((asset: string) => {
    setAssetClasses(prev => 
      prev.includes(asset) ? prev.filter(a => a !== asset) : [...prev, asset]
    );
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setVisualExamples(prev => [...prev, ...newFiles]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setVisualExamples(prev => prev.filter((_, i) => i !== index));
  }, []);

  const canGoNext = useCallback(() => {
    if (currentStep === 1) return name.trim() !== "";
    if (currentStep === 2) return setupType.trim() !== "";
    if (currentStep === 3) return defaultStopLoss && defaultTakeProfit;
    return true;
  }, [currentStep, name, setupType, defaultStopLoss, defaultTakeProfit]);

  const handleNext = useCallback(() => {
    if (canGoNext() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  }, [canGoNext, currentStep, totalSteps]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSave = useCallback(() => {
    if (!name) return;
    
    const uploadedURLs: string[] = visualExamples.map(file => URL.createObjectURL(file));
    
    const strategyData: any = {
      name: name.trim(),
      description,
      category: assetClasses.join(', '),
      timeframe: '',
      markets: [],
      setupType,
      confirmationSignals: confirmationSignals ? [confirmationSignals] : [],
      defaultStopLoss,
      defaultTakeProfit,
      avgRiskPerTrade,
      maxDailyLoss,
      positionSizingRule,
      typicalSession,
      expectedWinRate,
      avgRRGoal,
      psychologicalNotes,
      visualExamples: uploadedURLs,
      status: 'active' as const,
    };

    if (isEditMode) {
      strategyData.id = editingStrategy!.id;
    } else {
      strategyData.id = `strat-${Date.now()}`;
      strategyData.createdAt = new Date().toISOString();
    }
    
    onSave(strategyData);
    onClose();
  }, [name, description, assetClasses, setupType, confirmationSignals, visualExamples,
      defaultStopLoss, defaultTakeProfit, avgRiskPerTrade, maxDailyLoss,
      positionSizingRule, typicalSession, expectedWinRate, avgRRGoal,
      psychologicalNotes, isEditMode, editingStrategy, onSave, onClose]);

  if (!isOpen) return null;

  const stepTitles = ["Overview", "Entry", "Risk", "Logic"];
  const stepIcons = [TrendingUp, Target, Shield, Brain];
  const StepIcon = stepIcons[currentStep - 1];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,20,0.98) 0%, rgba(10,10,10,0.98) 100%)',
          border: '2px solid rgba(201,166,70,0.25)',
          boxShadow: '0 0 60px rgba(201,166,70,0.15)',
        }}
      >
        <div 
          className="px-6 py-5 border-b flex items-center justify-between"
          style={{ borderColor: 'rgba(201,166,70,0.15)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ background: 'rgba(201,166,70,0.15)' }}
            >
              <StepIcon className="w-5 h-5" style={{ color: '#C9A646' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#EAEAEA' }}>
                {isEditMode ? `Edit Strategy - ${stepTitles[currentStep - 1]}` : stepTitles[currentStep - 1]}
              </h2>
              <p className="text-xs" style={{ color: '#9A9A9A' }}>
                Step {currentStep} of {totalSteps}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" style={{ color: '#9A9A9A' }} />
          </button>
        </div>

        <div 
          className="h-1"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(currentStep / totalSteps) * 100}%`,
              background: 'linear-gradient(90deg, #C9A646, #B48C2C)',
            }}
          />
        </div>

        <div className="px-6 py-6 max-h-[calc(85vh-180px)] overflow-y-auto">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                  Strategy Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Morning Breakout"
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border-2 transition-all focus:outline-none focus:border-[#C9A646]"
                  style={{ borderColor: 'rgba(201,166,70,0.2)', color: '#EAEAEA' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What makes this strategy unique?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border-2 resize-none transition-all focus:outline-none focus:border-[#C9A646]"
                  style={{ borderColor: 'rgba(201,166,70,0.2)', color: '#EAEAEA' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                  Asset Class
                  <span className="ml-2 text-xs text-zinc-500">(Select one or more)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['futures', 'stocks', 'forex', 'crypto', 'commodities'].map(asset => (
                    <button
                      key={asset}
                      onClick={() => toggleAssetClass(asset)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all hover:scale-105"
                      style={assetClasses.includes(asset) ? {
                        background: 'rgba(201,166,70,0.15)',
                        color: '#C9A646',
                        border: '2px solid rgba(201,166,70,0.4)',
                        boxShadow: '0 0 10px rgba(201,166,70,0.2)'
                      } : {
                        background: 'rgba(255,255,255,0.03)',
                        color: '#9A9A9A',
                        border: '2px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      {assetClasses.includes(asset) && (
                        <span className="mr-1.5">✓</span>
                      )}
                      {asset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                  Setup Type *
                </label>
                <input
                  type="text"
                  value={setupType}
                  onChange={(e) => setSetupType(e.target.value)}
                  placeholder="e.g., Support/Resistance Breakout"
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border-2 transition-all focus:outline-none focus:border-[#C9A646]"
                  style={{ borderColor: 'rgba(201,166,70,0.2)', color: '#EAEAEA' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                  Confirmation Signals
                </label>
                <textarea
                  value={confirmationSignals}
                  onChange={(e) => setConfirmationSignals(e.target.value)}
                  placeholder="Volume spike, MACD crossover, RSI divergence..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border-2 resize-none transition-all focus:outline-none focus:border-[#C9A646]"
                  style={{ borderColor: 'rgba(201,166,70,0.2)', color: '#EAEAEA' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                  Visual Examples
                </label>
                <div className="flex gap-2">
                  <label
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-all border-2 border-dashed"
                    style={{ borderColor: 'rgba(201,166,70,0.3)', color: '#C9A646' }}
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-sm font-medium">Upload Images</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {visualExamples.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {visualExamples.map((file, i) => (
                      <div
                        key={i}
                        className="relative px-3 py-1 rounded-lg text-xs flex items-center gap-2"
                        style={{ background: 'rgba(201,166,70,0.15)', color: '#EAEAEA' }}
                      >
                        {file.name}
                        <button
                          onClick={() => removeFile(i)}
                          className="hover:text-[#E44545]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                    Default Stop Loss ($) *
                  </label>
                  <input
                    type="number"
                    value={defaultStopLoss || ''}
                    onChange={(e) => setDefaultStopLoss(parseFloat(e.target.value) || undefined)}
                    placeholder="50"
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border-2 transition-all focus:outline-none focus:border-[#C9A646]"
                    style={{ borderColor: 'rgba(201,166,70,0.2)', color: '#EAEAEA' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                    Default Take Profit ($) *
                  </label>
                  <input
                    type="number"
                    value={defaultTakeProfit || ''}
                    onChange={(e) => setDefaultTakeProfit(parseFloat(e.target.value) || undefined)}
                    placeholder="100"
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border-2 transition-all focus:outline-none focus:border-[#C9A646]"
                    style={{ borderColor: 'rgba(201,166,70,0.2)', color: '#EAEAEA' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                    Avg Risk per Trade ($)
                  </label>
                  <input
                    type="number"
                    value={avgRiskPerTrade || ''}
                    onChange={(e) => setAvgRiskPerTrade(parseFloat(e.target.value) || undefined)}
                    placeholder="100"
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border-2 transition-all focus:outline-none focus:border-[#C9A646]"
                    style={{ borderColor: 'rgba(201,166,70,0.2)', color: '#EAEAEA' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                    Max Daily Loss ($)
                  </label>
                  <input
                    type="number"
                    value={maxDailyLoss || ''}
                    onChange={(e) => setMaxDailyLoss(parseFloat(e.target.value) || undefined)}
                    placeholder="500"
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border-2 transition-all focus:outline-none focus:border-[#C9A646]"
                    style={{ borderColor: 'rgba(201,166,70,0.2)', color: '#EAEAEA' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                  Position Sizing
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Fixed $', '% of Equity', 'ATR-Based', 'Kelly'].map(rule => (
                    <button
                      key={rule}
                      onClick={() => setPositionSizingRule(rule)}
                      className="px-4 py-3 rounded-lg text-sm font-medium transition-all"
                      style={positionSizingRule === rule ? {
                        background: 'rgba(201,166,70,0.15)',
                        color: '#C9A646',
                        border: '2px solid rgba(201,166,70,0.3)'
                      } : {
                        background: 'rgba(255,255,255,0.03)',
                        color: '#9A9A9A',
                        border: '2px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      {rule}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                  Typical Session
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'asia', label: '🌏 Asia' },
                    { value: 'london', label: '🇬🇧 London' },
                    { value: 'ny', label: '🇺🇸 New York' },
                    { value: 'overlap', label: '🌍 Overlap' },
                  ].map(s => (
                    <button
                      key={s.value}
                      onClick={() => setTypicalSession(s.value)}
                      className="px-4 py-3 rounded-lg text-sm font-medium transition-all"
                      style={typicalSession === s.value ? {
                        background: 'rgba(201,166,70,0.15)',
                        color: '#C9A646',
                        border: '2px solid rgba(201,166,70,0.3)'
                      } : {
                        background: 'rgba(255,255,255,0.03)',
                        color: '#9A9A9A',
                        border: '2px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                    Expected Win Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={expectedWinRate || ''}
                    onChange={(e) => setExpectedWinRate(parseFloat(e.target.value) || undefined)}
                    placeholder="65"
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border-2 transition-all focus:outline-none focus:border-[#C9A646]"
                    style={{ borderColor: 'rgba(201,166,70,0.2)', color: '#EAEAEA' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                    Avg R:R Goal
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={avgRRGoal || ''}
                    onChange={(e) => setAvgRRGoal(parseFloat(e.target.value) || undefined)}
                    placeholder="2.5"
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border-2 transition-all focus:outline-none focus:border-[#C9A646]"
                    style={{ borderColor: 'rgba(201,166,70,0.2)', color: '#EAEAEA' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#EAEAEA' }}>
                  Notes
                </label>
                <textarea
                  value={psychologicalNotes}
                  onChange={(e) => setPsychologicalNotes(e.target.value)}
                  placeholder="Trading rules, psychological reminders..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border-2 resize-none transition-all focus:outline-none focus:border-[#C9A646]"
                  style={{ borderColor: 'rgba(201,166,70,0.2)', color: '#EAEAEA' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-between" style={{ borderColor: 'rgba(201,166,70,0.15)' }}>
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all disabled:opacity-30 hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#9A9A9A' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={!canGoNext()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold transition-all disabled:opacity-40 hover:scale-105"
              style={{ 
                background: canGoNext() ? 'linear-gradient(135deg, #C9A646, #B48C2C)' : 'rgba(201,166,70,0.2)', 
                color: '#000'
              }}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!canGoNext()}
              className="px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-40 hover:scale-105"
              style={{ 
                background: canGoNext() ? 'linear-gradient(135deg, #C9A646, #B48C2C)' : 'rgba(201,166,70,0.2)', 
                color: '#000'
              }}
            >
              {isEditMode ? 'Save Changes' : 'Create'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
StrategyModal.displayName = 'StrategyModal';
// ==========================================
// 🚀 OPTIMIZED STRATEGY CARD
// ==========================================
interface StrategyCardProps {
  strategy: any;
  stats: StrategyStats;
  onView: () => void;
  onEdit: (strategy: any) => void;
  onDelete: (id: string) => void;
}

const StrategyCard = memo(({ strategy, stats, onView, onEdit, onDelete }: StrategyCardProps) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  }, [showMenu]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(strategy);
    setShowMenu(false);
  }, [onEdit, strategy]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(strategy.id);
    setShowMenu(false);
  }, [onDelete, strategy.id]);

  return (
    <div 
      className="rounded-xl p-5 transition-all duration-300 cursor-pointer group relative"
      style={{
        background: 'rgba(20,20,20,0.8)',
        border: '1px solid rgba(42,42,42,0.4)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,166,70,0.2)';
        e.currentTarget.style.borderColor = 'rgba(201,166,70,0.4)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'rgba(42,42,42,0.4)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-base font-bold mb-1" style={{ color: '#EAEAEA' }}>
            {strategy.name}
          </h3>
          <p className="text-xs line-clamp-1" style={{ color: '#9A9A9A' }}>
            {strategy.description || 'No description'}
          </p>
        </div>
        
        <div className="relative">
          <button
            onClick={handleMenuClick}
            className="p-2 rounded-lg hover:bg-white/5 transition-all"
          >
            <Settings className="w-4 h-4" style={{ color: '#C9A646' }} />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-40 rounded-lg py-1 z-10"
              style={{
                background: 'rgba(20,20,20,0.98)',
                border: '1px solid rgba(201,166,70,0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleEdit}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                style={{ color: '#EAEAEA' }}
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                style={{ color: '#E44545' }}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {stats.totalTrades > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm flex items-center gap-1" style={{ color: '#9A9A9A' }}>
              <Percent className="w-3 h-3" /> WR:
            </span>
            <span 
              className="text-lg font-bold"
              style={{ color: stats.winRate >= 50 ? '#00C46C' : '#E44545' }}
            >
              {stats.winRate.toFixed(0)}%
            </span>
            <span className="text-sm flex items-center gap-1" style={{ color: '#9A9A9A' }}>
              <TrendingUp className="w-3 h-3" /> R:
            </span>
            <span 
              className="text-lg font-bold"
              style={{ color: stats.totalR >= 0 ? '#00C46C' : '#E44545' }}
            >
              {stats.totalR >= 0 ? '+' : ''}{stats.totalR.toFixed(1)}R
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm" style={{ color: '#9A9A9A' }}>
            <span>Trades: <span style={{ color: '#EAEAEA' }}>{stats.totalTrades}</span></span>
            <span>Exp: <span style={{ color: stats.expectancy >= 0 ? '#00C46C' : '#E44545' }}>
              {stats.expectancy >= 0 ? '+' : ''}{stats.expectancy.toFixed(2)}R
            </span></span>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between text-xs mb-1" style={{ color: '#9A9A9A' }}>
              <span>Profit Factor</span>
              <span style={{ color: '#EAEAEA' }}>{stats.profitFactor.toFixed(2)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((stats.profitFactor / 3) * 100, 100)}%`,
                  background: stats.profitFactor >= 1.5 
                    ? 'linear-gradient(90deg, rgba(0,196,108,0.8), rgba(0,196,108,0.4))'
                    : stats.profitFactor >= 1
                    ? 'linear-gradient(90deg, rgba(201,166,70,0.8), rgba(201,166,70,0.4))'
                    : 'linear-gradient(90deg, rgba(228,69,69,0.8), rgba(228,69,69,0.4))',
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center" style={{ color: '#9A9A9A' }}>
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No trades yet</p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'rgba(255,255,255,0.05)', color: '#9A9A9A' }}>
        <span>{strategy.category || 'Uncategorized'}</span>
        {stats.totalTrades > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {stats.totalTrades} trades
          </span>
        )}
      </div>
    </div>
  );
});
StrategyCard.displayName = 'StrategyCard';

// ==========================================
// 🗑️ DELETE CONFIRMATION DIALOG
// ==========================================

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  strategyName: string;
}

const DeleteConfirmDialog = memo(({ isOpen, onClose, onConfirm, strategyName }: DeleteConfirmDialogProps) => {
  const handleConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ 
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(12px)'
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl p-8 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #1A1A1A 0%, #0F0F0F 100%)',
          border: '1px solid rgba(228,69,69,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(228,69,69,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(228,69,69,0.08)',
            border: '1.5px solid rgba(228,69,69,0.2)',
          }}
        >
          <Trash2 className="w-9 h-9" style={{ color: '#E44545', strokeWidth: 1.5 }} />
        </div>

        <h3 
          className="text-3xl font-bold text-center mb-3"
          style={{ 
            color: '#EAEAEA',
            letterSpacing: '-0.02em'
          }}
        >
          Delete Strategy?
        </h3>

        <p 
          className="text-center mb-8 leading-relaxed text-base"
          style={{ color: '#9A9A9A' }}
        >
          Are you sure you want to delete{' '}
          <span 
            className="font-semibold" 
            style={{ 
              color: '#C9A646',
              display: 'inline-block',
              padding: '0 4px'
            }}
          >
            {strategyName}
          </span>
          ?<br/>
          <span className="text-sm" style={{ color:'#6A6A6A' }}>
            This action cannot be undone.
          </span>
        </p>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3.5 rounded-xl font-medium text-base transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#BDBDBD',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = '#EAEAEA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = '#BDBDBD';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-6 py-3.5 rounded-xl font-semibold text-base transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #E44545 0%, #C03030 100%)',
              color: '#FFFFFF',
              border: '1px solid rgba(228,69,69,0.3)',
              boxShadow: '0 4px 16px rgba(228,69,69,0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(228,69,69,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(228,69,69,0.25)';
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
});
DeleteConfirmDialog.displayName = 'DeleteConfirmDialog';

// ==========================================
// 🎯 MAIN STRATEGIES PAGE
// ==========================================

export default function Strategies() {
  const navigate = useNavigate();
  const { id: userId, isImpersonating, isLoading: userLoading } = useEffectiveUser();

  console.log('🔍 Strategies Component:', {
    userId,
    isImpersonating,
    userLoading,
  });

  const { isRefreshing: isViewRefreshing, error: refreshError } = useSmartRefresh('strategy_stats_view', 5);
  
  if (refreshError) {
    console.error('❌ Smart Refresh Error:', refreshError);
  }
  if (isViewRefreshing) {
    console.log('⏳ Smart Refresh: Refreshing strategy_stats_view...');
  }

  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<ExtendedStrategy | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [strategyToDelete, setStrategyToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: strategies = [], isLoading: strategiesLoading } = useStrategiesOptimized(userId);
  const { data: allTrades = [], isLoading: tradesLoading } = useTrades(userId);

  const createStrategyMutation = useCreateStrategyOptimized();
  const updateStrategyMutation = useUpdateStrategyOptimized();
  const deleteStrategyMutation = useDeleteStrategyOptimized();

  const loading = userLoading || strategiesLoading || tradesLoading || isViewRefreshing;

  console.log('🔍 Strategies Data:', {
    strategiesCount: strategies.length,
    tradesCount: allTrades.length,
    loading,
  });

  const strategiesWithStats = useMemo(() => {
    return strategies.map(strategy => {
      const strategyTrades = allTrades.filter((t: any) => 
        t.strategy_id === strategy.id || 
        t.strategy === strategy.id || 
        t.strategy === strategy.name
      );
      
      const stats = calculateStrategyStatsOptimized(strategyTrades as Trade[]);
      
      return { strategy, stats };
    });
  }, [strategies, allTrades]);

  const handleSaveStrategy = useCallback(async (strategyData: any) => {
    if (!userId) {
      toast.error('User ID is required to save a strategy');
      return;
    }

    console.log('🔍 handleSaveStrategy:', {
      isEdit: !!strategyData.id,
      userId,
      strategyData
    });

    try {
      if (strategyData.id && editingStrategy) {
        await updateStrategyMutation.mutateAsync({
          ...strategyData,
          user_id: userId,
        });
        toast.success('Strategy updated successfully!');
      } else {
        await createStrategyMutation.mutateAsync({
          ...strategyData,
          user_id: userId,
        });
        toast.success('Strategy created successfully!');
      }
      
      setEditingStrategy(null);
      setShowStrategyModal(false);
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast.error('Failed to save strategy');
    }
  }, [createStrategyMutation, updateStrategyMutation, userId, editingStrategy]);

  const handleEdit = useCallback((strategy: ExtendedStrategy) => {
    console.log('🔍 Edit strategy:', strategy);
    setEditingStrategy(strategy);
    setShowStrategyModal(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    const strategy = strategies.find(s => s.id === id);
    if (strategy) {
      setStrategyToDelete({ id, name: strategy.name });
      setDeleteDialogOpen(true);
    }
  }, [strategies]);

  const confirmDelete = useCallback(async () => {
    if (!strategyToDelete) return;
    await deleteStrategyMutation.mutateAsync(strategyToDelete.id);
    setStrategyToDelete(null);
    toast.success('Strategy deleted successfully!');
  }, [strategyToDelete, deleteStrategyMutation]);

  const handleView = useCallback((strategy: ExtendedStrategy) => {
    navigate(`/app/journal/strategies/${strategy.id}`);
  }, [navigate]);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setStrategyToDelete(null);
  }, []);

  const handleCloseStrategyModal = useCallback(() => {
    setShowStrategyModal(false);
    setEditingStrategy(null);
  }, []);

  const handleOpenNewStrategy = useCallback(() => {
    setEditingStrategy(null);
    setShowStrategyModal(true);
  }, []);

  return (
    <div style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #121212 100%)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto px-8 py-12">
        {isImpersonating && (
          <div 
            className="mb-6 p-3 rounded-lg flex items-center gap-2"
            style={{
              background: 'rgba(201,166,70,0.15)',
              border: '1px solid rgba(201,166,70,0.3)',
            }}
          >
            <Info className="w-4 h-4" style={{ color: '#C9A646' }} />
            <span className="text-sm" style={{ color: '#C9A646' }}>
              Viewing as another user
            </span>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#EAEAEA' }}>
              My Strategies
            </h1>
            <p className="text-sm" style={{ color: '#9A9A9A' }}>
              {strategies.length} strategies • {allTrades.length} total trades
            </p>
          </div>
          
          <button
            onClick={handleOpenNewStrategy}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #C9A646, #B48C2C)',
              color: '#000',
              boxShadow: '0 0 20px rgba(201,166,70,0.3)',
            }}
          >
            <Plus className="w-5 h-5" />
            New Strategy
          </button>
        </div>

        {!userId ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#C9A646', borderTopColor: 'transparent' }} />
            <p style={{ color: '#9A9A9A' }}>Loading user...</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#C9A646', borderTopColor: 'transparent' }} />
            <p style={{ color: '#9A9A9A' }}>Loading strategies...</p>
          </div>
        ) : strategies.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <Target className="w-16 h-16 mx-auto" style={{ color: '#9A9A9A' }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#EAEAEA' }}>
              No Strategies Yet
            </h3>
            <p className="text-sm mb-6" style={{ color: '#9A9A9A' }}>
              Create your first trading strategy to start tracking performance
            </p>
            <button
              onClick={handleOpenNewStrategy}
              className="px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #C9A646, #B48C2C)',
                color: '#000',
              }}
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Create First Strategy
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategiesWithStats.map(({ strategy, stats }) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                stats={stats}
                onView={() => navigate(`/app/journal/strategies/${strategy.id}`)}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={confirmDelete}
        strategyName={strategyToDelete?.name || ''}
      />

      <StrategyModal 
        isOpen={showStrategyModal}
        onClose={handleCloseStrategyModal}
        onSave={handleSaveStrategy}
        editingStrategy={editingStrategy}
      />
    </div>
  );
}

export { StrategyDetailView };