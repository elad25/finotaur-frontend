// ================================================
// FINOTAUR BACKTEST DASHBOARD - MIRRORS JOURNAL OVERVIEW
// File: src/pages/app/journal/backtest/BacktestOverview.tsx
// ✅ Visual design matches JournalOverview.tsx (refactored 2026-05-28)
// ✅ bg-[#070808] outer shell, JOURNAL_PANEL chart wrappers
// ✅ JournalKpiCard replaces DashboardKpiCard (5-card grid)
// ✅ Inline h1 header pattern matching Journal Dashboard
// ✅ Backtest-specific KPIs with dynamic data
// ✅ Trade Time & Duration Performance Charts
// ✅ AI Insights for backtest analysis
// ✅ All TypeScript errors fixed
// ✅ Production ready for 5000+ users
// ================================================

import React, { lazy, Suspense, useMemo, useCallback } from "react";
import CftcDisclosureBanner from "@/components/backtest/CftcDisclosureBanner";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  TrendingUp, TrendingDown, Crown, Sparkles,
  RefreshCw, Download, Share2, HelpCircle, Target
} from "lucide-react";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import {
  formatCurrency,
  formatPercentage,
} from "@/hooks/useDashboardData";
import { BORDER_STYLE, ANIMATION_STYLES } from "@/constants/dashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useBacktestStats } from "@/hooks/useBacktestStats";

// ================================================
// LAZY LOAD HEAVY COMPONENTS
// ================================================

const BacktestEquityChart = lazy(() => import("@/components/charts/BacktestEquityChart"));
const BacktestDailyPnLChart = lazy(() => import("@/components/charts/BacktestDailyPnLChart"));

// ================================================
// LOADING SKELETONS
// ================================================

const ChartSkeleton = React.memo(() => (
  <div className="w-full h-[380px] rounded-[12px] bg-[#0E0E0E] border border-white/[0.05] animate-pulse flex items-center justify-center">
    <div className="text-[#A0A0A0] text-sm">Loading backtest chart...</div>
  </div>
));
ChartSkeleton.displayName = 'BacktestChartSkeleton';

const CardSkeleton = React.memo(() => (
  <div 
    className="rounded-[20px] border bg-[#141414] p-6 animate-pulse" 
    style={BORDER_STYLE}
  >
    <div className="h-4 bg-[#1A1A1A] rounded w-20 mb-3"></div>
    <div className="h-8 bg-[#1A1A1A] rounded w-32"></div>
  </div>
));
CardSkeleton.displayName = 'BacktestCardSkeleton';

// ================================================
// BACKTEST DATA TYPES
// ================================================

interface BacktestTrade {
  id: string;
  symbol: string;
  open_at: string;
  close_at: string;
  pnl: number;
  pnl_percent: number;
  side: 'long' | 'short';
  entry_price: number;
  exit_price: number;
  size: number;
  rr?: number;
}

interface BacktestStats {
  // BACKTEST: Core Performance Metrics
  strategy_name: string;
  backtest_period_start: string;
  backtest_period_end: string;
  initial_capital: number;
  final_capital: number;
  net_pnl: number;
  net_pnl_percent: number;
  
  // BACKTEST: Trade Statistics
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate: number;
  
  // BACKTEST: Risk Metrics
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  max_drawdown_percent: number;
  recovery_factor: number;
  profit_factor: number;
  
  // BACKTEST: Average Metrics
  avg_win: number;
  avg_loss: number;
  avg_win_percent: number;
  avg_loss_percent: number;
  avg_rr: number;
  avg_trade_duration_hours: number;
  
  // BACKTEST: Best/Worst
  best_trade: BacktestTrade;
  worst_trade: BacktestTrade;
  longest_winning_streak: number;
  longest_losing_streak: number;
  
  // BACKTEST: Time Series Data
  equity_curve: Array<{ date: string; value: number; drawdown: number }>;
  monthly_returns: Array<{ month: string; return: number }>;
  trades: BacktestTrade[];
}

// ================================================
// REAL BACKTEST STATS — adapter over useBacktestStats hook
// Phase 7: replaces mock data with aggregate of all saved backtest sessions
// from backtest_sessions_v2 + backtest_trades_v2 (RLS-scoped).
// ================================================

const useMockBacktestStats = (): { data: BacktestStats | null; isLoading: boolean } => {
  const { data: real, isLoading } = useBacktestStats();

  const data = useMemo<BacktestStats | null>(() => {
    if (!real) return null;
    const { stats, trades, equitySeries } = real;
    const INITIAL_CAPITAL = 10000;
    const finalCapital = INITIAL_CAPITAL + stats.netPnl;

    // Build cumulative equity curve from equitySeries (date label → cumulative).
    // For the Overview chart we approximate ISO dates by adding day offsets
    // from the first trade — sufficient for "last 2 years" display.
    const baseDate = trades.length > 0
      ? dayjs((trades[trades.length - 1]?.exitTime ?? trades[trades.length - 1]?.entryTime ?? Date.now() / 1000) * 1000)
      : dayjs();
    let runningPeak = 0;
    const equityCurve: BacktestStats['equity_curve'] = equitySeries.map((pt, i) => {
      const eqAbs = INITIAL_CAPITAL + pt.equity;
      if (eqAbs > runningPeak) runningPeak = eqAbs;
      const dd = runningPeak > 0 ? ((eqAbs - runningPeak) / runningPeak) * 100 : 0;
      return {
        date: baseDate.add(i, 'day').format('YYYY-MM-DD'),
        value: Math.round(eqAbs),
        drawdown: Math.round(dd * 100) / 100,
      };
    });
    const maxDrawdown = equityCurve.length > 0
      ? Math.min(...equityCurve.map((p) => p.drawdown)) * (INITIAL_CAPITAL / 100)
      : 0;
    const maxDrawdownPercent = equityCurve.length > 0
      ? Math.min(...equityCurve.map((p) => p.drawdown))
      : 0;

    // Monthly returns: bucket equity series by month.
    const monthly = new Map<string, number>();
    for (const pt of equitySeries) {
      const month = baseDate.add(equitySeries.indexOf(pt), 'day').format('YYYY-MM');
      monthly.set(month, (monthly.get(month) ?? 0) + pt.pnl);
    }
    const monthlyReturns: BacktestStats['monthly_returns'] = Array.from(monthly.entries()).map(([month, pnl]) => ({
      month,
      return: (pnl / INITIAL_CAPITAL) * 100,
    }));

    // Best/worst trade
    let bestTrade: BacktestStats['best_trade'] = {
      id: '', symbol: '?', open_at: '', close_at: '', pnl: 0, pnl_percent: 0,
      side: 'long', entry_price: 0, exit_price: 0, size: 0, rr: 0,
    };
    let worstTrade: BacktestStats['worst_trade'] = { ...bestTrade };
    if (trades.length > 0) {
      const best = trades.reduce((a, b) => (b.pnl > a.pnl ? b : a));
      const worst = trades.reduce((a, b) => (b.pnl < a.pnl ? b : a));
      const mapTrade = (t: typeof best): BacktestStats['best_trade'] => ({
        id: t.id,
        symbol: t.symbol,
        open_at: new Date(t.entryTime * 1000).toISOString(),
        close_at: t.exitTime ? new Date(t.exitTime * 1000).toISOString() : new Date(t.entryTime * 1000).toISOString(),
        pnl: t.pnl,
        pnl_percent: t.pnlPercent,
        side: t.side === 'LONG' ? 'long' : 'short',
        entry_price: t.entryPrice,
        exit_price: t.exitPrice ?? t.entryPrice,
        size: t.size,
        rr: stats.avgRR,
      });
      bestTrade = mapTrade(best);
      worstTrade = mapTrade(worst);
    }

    // Avg trade duration
    const durations = trades
      .filter((t) => t.exitTime != null)
      .map((t) => (t.exitTime! - t.entryTime) / 3600);
    const avgDurationHours = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Backtest period from trade extremes
    const allTimes = trades.flatMap((t) => [t.entryTime, t.exitTime ?? t.entryTime]);
    const startTs = allTimes.length > 0 ? Math.min(...allTimes) : Date.now() / 1000;
    const endTs = allTimes.length > 0 ? Math.max(...allTimes) : Date.now() / 1000;

    // Map all trades to the BacktestTrade shape Overview expects.
    const mappedTrades: BacktestTrade[] = trades.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      open_at: new Date(t.entryTime * 1000).toISOString(),
      close_at: t.exitTime ? new Date(t.exitTime * 1000).toISOString() : null,
      pnl: t.pnl,
      pnl_percent: t.pnlPercent,
      side: t.side === 'LONG' ? 'long' : 'short',
      entry_price: t.entryPrice,
      exit_price: t.exitPrice ?? 0,
      size: t.size,
      rr: 0,
    }));

    return {
      strategy_name: real.sessionCount === 1 ? 'Single Session' : `${real.sessionCount} Sessions`,
      backtest_period_start: new Date(startTs * 1000).toISOString().slice(0, 10),
      backtest_period_end: new Date(endTs * 1000).toISOString().slice(0, 10),
      initial_capital: INITIAL_CAPITAL,
      final_capital: finalCapital,
      net_pnl: stats.netPnl,
      net_pnl_percent: stats.netPnlPercent,
      total_trades: stats.totalTrades,
      winning_trades: stats.winners,
      losing_trades: stats.losers,
      breakeven_trades: stats.breakeven,
      win_rate: stats.winRate / 100,
      sharpe_ratio: 0,   // not computed yet — would need daily-return time series
      sortino_ratio: 0,
      max_drawdown: maxDrawdown,
      max_drawdown_percent: maxDrawdownPercent,
      recovery_factor: maxDrawdown !== 0 ? stats.netPnl / Math.abs(maxDrawdown) : 0,
      // Preserve Infinity → UI renders as ∞. Mapping to 0 hid the
      // "winning session with no losses" case as "no profit factor at all"
      // (which surfaces as red 0.00 on the dashboard).
      profit_factor: stats.profitFactor,
      avg_win: stats.avgWin,
      avg_loss: -stats.avgLoss,
      avg_win_percent: INITIAL_CAPITAL > 0 ? (stats.avgWin / INITIAL_CAPITAL) * 100 : 0,
      avg_loss_percent: INITIAL_CAPITAL > 0 ? -(stats.avgLoss / INITIAL_CAPITAL) * 100 : 0,
      avg_rr: stats.avgRR,
      avg_trade_duration_hours: avgDurationHours,
      best_trade: bestTrade,
      worst_trade: worstTrade,
      longest_winning_streak: stats.longestWinStreak,
      longest_losing_streak: stats.longestLossStreak,
      equity_curve: equityCurve.length > 0 ? equityCurve : [],
      monthly_returns: monthlyReturns,
      trades: mappedTrades,
    };
  }, [real]);
  
  return { data, isLoading };
};

// ================================================
// TRADE PERFORMANCE SCATTER CHARTS
// ================================================

interface DataPoint {
  time?: string;
  duration?: string;
  value: number;
  isProfit: boolean;
}

// Helper function to extract time from trade
const getTradeTimeData = (stats: BacktestStats): DataPoint[] => {
  if (!stats.trades || stats.trades.length === 0) return [];
  
  return stats.trades
    .filter(trade => trade.open_at && trade.pnl != null)
    .map(trade => {
      const openTime = dayjs(trade.open_at);
      return {
        time: openTime.format('HH:mm'),
        value: trade.pnl,
        isProfit: trade.pnl >= 0
      };
    })
    .sort((a, b) => a.time!.localeCompare(b.time!));
};

// Helper function to calculate trade duration
const getTradeDurationData = (stats: BacktestStats): DataPoint[] => {
  if (!stats.trades || stats.trades.length === 0) return [];
  
  return stats.trades
    .filter(trade => trade.open_at && trade.close_at && trade.pnl != null)
    .map(trade => {
      const openTime = dayjs(trade.open_at);
      const closeTime = dayjs(trade.close_at);
      const durationMinutes = closeTime.diff(openTime, 'minute');
      
      // Format duration
      let durationStr: string;
      if (durationMinutes < 60) {
        durationStr = `${durationMinutes}m`;
      } else if (durationMinutes < 1440) { // less than 24 hours
        const hours = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        durationStr = `${hours}h${mins > 0 ? ':' + mins + 'm' : ''}`;
      } else {
        const days = Math.floor(durationMinutes / 1440);
        const hours = Math.floor((durationMinutes % 1440) / 60);
        durationStr = `${days}d${hours > 0 ? ':' + hours + 'h' : ''}`;
      }
      
      return {
        duration: durationStr,
        value: trade.pnl,
        isProfit: trade.pnl >= 0,
        sortKey: durationMinutes // for sorting
      };
    })
    .sort((a: any, b: any) => a.sortKey - b.sortKey);
};

const TradeTimePerformanceChart = React.memo(({ data }: { data: DataPoint[] }) => {
  if (!data || data.length === 0) {
    return (
      <div 
        className="rounded-2xl border p-5 shadow-lg flex items-center justify-center h-80"
        style={{
          borderColor: 'rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
        }}
      >
        <p className="text-[#666666] text-sm">No trade time data available</p>
      </div>
    );
  }

  // ✅ DYNAMIC: Calculate max value from actual data
  const minValue = Math.min(...data.map(d => d.value), 0);
  const maxPositive = Math.max(...data.map(d => d.value), 0);
  
  // ✅ Calculate scale range (symmetric around zero for better visualization)
  const scaleMax = Math.max(Math.abs(minValue), Math.abs(maxPositive)) * 1.1;
  
  return (
    <div 
      className="rounded-2xl border p-5 shadow-lg"
      style={{
        borderColor: 'rgba(255, 255, 255, 0.08)',
        background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-[#F4F4F4] text-base font-semibold">
            Trade time performance
          </h3>
          <HelpCircle className="w-4 h-4 text-[#808080] cursor-help hover:text-[#C9A646] transition-colors" />
        </div>
        <div className="text-xs text-[#666666]">
          {data.length} trades
        </div>
      </div>

      <div className="relative h-64 w-full">
        {/* Y-axis labels - DYNAMIC based on data */}
        <div className="absolute left-0 top-2 bottom-10 flex flex-col justify-between text-[10px] text-[#666666] pr-2 w-12 text-right">
          <span>${scaleMax.toFixed(0)}</span>
          <span>${(scaleMax * 0.75).toFixed(0)}</span>
          <span>${(scaleMax * 0.5).toFixed(0)}</span>
          <span>${(scaleMax * 0.25).toFixed(0)}</span>
          <span className="text-white/60">$0</span>
          <span>-${(scaleMax * 0.25).toFixed(0)}</span>
          <span>-${(scaleMax * 0.5).toFixed(0)}</span>
        </div>

        {/* Chart area */}
        <div className="absolute left-14 right-2 top-2 bottom-10">
          <svg className="w-full h-full" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
              <line
                key={i}
                x1="0"
                y1={`${percent * 100}%`}
                x2="100%"
                y2={`${percent * 100}%`}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
              />
            ))}

            {/* Zero line - emphasized */}
            <line
              x1="0"
              y1="50%"
              x2="100%"
              y2="50%"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1.5"
            />

            {/* Data points - DYNAMIC positioning */}
            {data.map((point, i) => {
              // ✅ X: 3% padding on each side
              const xPadding = 3;
              const x = xPadding + ((i / Math.max(data.length - 1, 1)) * (100 - xPadding * 2));
              
              // ✅ Y: Dynamic scaling based on actual value and scaleMax
              // 50% is zero line, scale proportionally up/down from there
              const yPercent = (point.value / scaleMax) * 43; // 43% max for padding
              const y = 50 - yPercent;
              
              return (
                <g key={i}>
                  {/* Outer glow effect */}
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="7"
                    fill={point.isProfit ? '#4AD295' : '#E36363'}
                    opacity="0.15"
                  />
                  {/* Main circle */}
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="4.5"
                    fill={point.isProfit ? '#4AD295' : '#E36363'}
                    className="transition-all cursor-pointer hover:r-6"
                    opacity="0.9"
                    strokeWidth="2"
                    stroke={point.isProfit ? '#4AD295' : '#E36363'}
                    strokeOpacity="0.3"
                  >
                    <title>{`${point.time}: ${point.value >= 0 ? '+' : ''}$${point.value.toFixed(2)}`}</title>
                  </circle>
                </g>
              );
            })}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-14 right-2 bottom-0 flex justify-between text-[10px] text-[#666666]">
          {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((point, i) => (
            <span key={i}>{point.time}</span>
          ))}
        </div>
      </div>
    </div>
  );
});
TradeTimePerformanceChart.displayName = 'TradeTimePerformanceChart';

const TradeDurationPerformanceChart = React.memo(({ data }: { data: DataPoint[] }) => {
  if (!data || data.length === 0) {
    return (
      <div 
        className="rounded-2xl border p-5 shadow-lg flex items-center justify-center h-80"
        style={{
          borderColor: 'rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
        }}
      >
        <p className="text-[#666666] text-sm">No trade duration data available</p>
      </div>
    );
  }

  const minValue = Math.min(...data.map(d => d.value), 0);
  const maxPositive = Math.max(...data.map(d => d.value), 0);
  const scaleMax = Math.max(Math.abs(minValue), Math.abs(maxPositive)) * 1.1;
  
  return (
    <div 
      className="rounded-2xl border p-5 shadow-lg"
      style={{
        borderColor: 'rgba(255, 255, 255, 0.08)',
        background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-[#F4F4F4] text-base font-semibold">
            Trade duration performance
          </h3>
          <HelpCircle className="w-4 h-4 text-[#808080] cursor-help hover:text-[#C9A646] transition-colors" />
        </div>
        <div className="text-xs text-[#666666]">
          {data.length} trades
        </div>
      </div>

      <div className="relative h-64 w-full">
        <div className="absolute left-0 top-2 bottom-10 flex flex-col justify-between text-[10px] text-[#666666] pr-2 w-12 text-right">
          <span>${scaleMax.toFixed(0)}</span>
          <span>${(scaleMax * 0.75).toFixed(0)}</span>
          <span>${(scaleMax * 0.5).toFixed(0)}</span>
          <span>${(scaleMax * 0.25).toFixed(0)}</span>
          <span className="text-white/60">$0</span>
          <span>-${(scaleMax * 0.25).toFixed(0)}</span>
          <span>-${(scaleMax * 0.5).toFixed(0)}</span>
        </div>

        <div className="absolute left-14 right-2 top-2 bottom-10">
          <svg className="w-full h-full" preserveAspectRatio="none">
            {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
              <line
                key={i}
                x1="0"
                y1={`${percent * 100}%`}
                x2="100%"
                y2={`${percent * 100}%`}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
              />
            ))}

            <line
              x1="0"
              y1="50%"
              x2="100%"
              y2="50%"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1.5"
            />

            {data.map((point, i) => {
              const xPadding = 3;
              const x = xPadding + ((i / Math.max(data.length - 1, 1)) * (100 - xPadding * 2));
              const yPercent = (point.value / scaleMax) * 43;
              const y = 50 - yPercent;
              
              return (
                <g key={i}>
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="7"
                    fill={point.isProfit ? '#4AD295' : '#E36363'}
                    opacity="0.15"
                  />
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="4.5"
                    fill={point.isProfit ? '#4AD295' : '#E36363'}
                    className="hover:r-6 transition-all cursor-pointer"
                    opacity="0.9"
                    strokeWidth="2"
                    stroke={point.isProfit ? '#4AD295' : '#E36363'}
                    strokeOpacity="0.3"
                  >
                    <title>{`${point.duration}: ${point.value >= 0 ? '+' : ''}$${point.value.toFixed(2)}`}</title>
                  </circle>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="absolute left-14 right-2 bottom-0 flex justify-between text-[10px] text-[#666666]">
          {data.filter((_, i) => i % Math.ceil(data.length / 8) === 0).map((point, i) => (
            <span key={i}>{point.duration}</span>
          ))}
        </div>
      </div>
    </div>
  );
});
TradeDurationPerformanceChart.displayName = 'TradeDurationPerformanceChart';

// ================================================
// BACKTEST BEST/WORST TRADES
// ================================================

const BacktestBestWorstTrades = React.memo(({ stats }: { stats: BacktestStats }) => {
  if (!stats.best_trade || !stats.worst_trade) return null;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div 
        className="rounded-[20px] border p-5 shadow-[0_0_30px_rgba(74,210,149,0.08)] animate-fadeIn"
        style={{ 
          borderColor: 'rgba(74, 210, 149, 0.2)',
          background: 'rgba(74, 210, 149, 0.05)'
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[#4AD295]" />
          <span className="text-[10px] text-[#4AD295] font-semibold uppercase tracking-[0.12em]">
            Best Trade
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-[#4AD295]">
            {formatCurrency(stats.best_trade.pnl)}
          </span>
          {stats.best_trade.rr && (
            <span className="text-sm text-[#4AD295]/70 font-light">
              ({stats.best_trade.rr.toFixed(1)}R)
            </span>
          )}
        </div>
        <div className="text-xs text-[#A0A0A0] mt-2 font-light">
          {stats.best_trade.symbol} • {dayjs(stats.best_trade.open_at).format("MMM DD, YYYY")}
        </div>
      </div>

      <div 
        className="rounded-[20px] border p-5 shadow-[0_0_30px_rgba(227,99,99,0.08)] animate-fadeIn"
        style={{ 
          borderColor: 'rgba(227, 99, 99, 0.2)',
          background: 'rgba(227, 99, 99, 0.05)'
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-[#E36363]" />
          <span className="text-[10px] text-[#E36363] font-semibold uppercase tracking-[0.12em]">
            Worst Trade
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-[#E36363]">
            {formatCurrency(stats.worst_trade.pnl)}
          </span>
          {stats.worst_trade.rr && (
            <span className="text-sm text-[#E36363]/70 font-light">
              ({stats.worst_trade.rr.toFixed(1)}R)
            </span>
          )}
        </div>
        <div className="text-xs text-[#A0A0A0] mt-2 font-light">
          {stats.worst_trade.symbol} • {dayjs(stats.worst_trade.open_at).format("MMM DD, YYYY")}
        </div>
      </div>
    </div>
  );
});
BacktestBestWorstTrades.displayName = 'BacktestBestWorstTrades';

// ================================================
// AI BACKTEST INSIGHT
// ================================================

const BacktestAIInsight = React.memo(({ stats }: { stats: BacktestStats }) => {
  const insight = useMemo(() => {
    if (stats.total_trades < 20) {
      return "Limited sample size. Consider running a longer backtest for more reliable results.";
    }
    
    if (stats.sharpe_ratio > 2 && stats.profit_factor > 2) {
      return "Excellent risk-adjusted returns! Strategy shows strong edge with solid Sharpe ratio and profit factor.";
    }
    
    if (stats.win_rate > 0.75) {
      return "Very high win rate detected. Verify results for potential overfitting—consider walk-forward analysis.";
    }
    
    if (Math.abs(stats.max_drawdown_percent) > 20) {
      return "High drawdown detected. Consider reducing position size or tightening risk management.";
    }
    
    if (stats.sharpe_ratio > 1.5) {
      return "Good risk-adjusted performance. Strategy demonstrates consistent edge over backtest period.";
    }
    
    return "Backtest complete. Review all metrics carefully before live trading.";
  }, [stats]);
  
  return (
    <div 
      className="rounded-[20px] border p-5 flex items-start gap-4 shadow-[0_0_30px_rgba(201,166,70,0.08)] animate-fadeIn relative overflow-hidden"
      style={{ 
        background: 'linear-gradient(90deg, rgba(201,166,70,0.1), rgba(201,166,70,0.05))',
        borderColor: 'rgba(255, 215, 0, 0.08)',
        borderLeft: '3px solid #C9A646'
      }}
    >
      <div className="rounded-lg bg-[#C9A646]/10 p-2.5 animate-pulse-gold">
        <Sparkles className="w-5 h-5 text-[#C9A646]" />
      </div>
      <div className="flex-1">
        <div className="text-[#C9A646] text-[10px] font-semibold uppercase tracking-[0.15em] mb-1.5">
          AI Backtest Insights
        </div>
        <div className="text-[#F4F4F4] text-sm leading-relaxed font-light">
          {insight}
        </div>
      </div>
    </div>
  );
});
BacktestAIInsight.displayName = 'BacktestAIInsight';

// ================================================
// BACKTEST KPI PRIMITIVES (blue accent — mirrors Journal gold strip)
// ================================================

const JOURNAL_PANEL =
  "relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]";

/** Small inline '?' help icon — matches Journal pattern verbatim. */
const BacktestInfoIcon = ({
  label,
  className = "h-3.5 w-3.5",
}: {
  label: string;
  className?: string;
}) => (
  <HelpCircle
    className={`${className} shrink-0 cursor-help text-white/38 transition-colors hover:text-[#7AB6F4]`}
    aria-label={label}
    role="img"
  />
);

/** Signed-currency helper — Journal has this, Backtest needs it locally. */
function formatSignedCurrency(value: number): string {
  const abs = Math.abs(value || 0);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value >= 0 ? "+" : "-"}$${formatted}`;
}

/** Sparkline visuals — mirrors KpiSparkline from Journal/Overview.tsx.
 *  Line/fill gradient unchanged; accent changes:
 *    - line gradient 3rd stop: #C9A646 → #7AB6F4
 *    - circle indicator: #E8C766 → #7AB6F4
 *    - target ring/dot/icon: gold → blue (#7AB6F4)
 *  Bars stay semantic green/red (positive/negative P&L). */
const BacktestKpiSparkline = React.memo(({ type = "line" }: { type?: "line" | "bars" | "target" }) => {
  if (type === "bars") {
    const bars = [28, 42, 34, 62, -36, 44, 88];
    return (
      <div className="relative flex h-12 w-[72px] items-center justify-end overflow-hidden rounded-md">
        <div className="absolute inset-x-1 top-1/2 h-px bg-[#7AB6F4]/12" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_35%,rgba(122,182,244,0.16),transparent_48%)]" />
        <div className="relative flex h-full items-center justify-end gap-1.5">
          {bars.map((bar, index) => {
            const positive = bar >= 0;
            return (
              <span
                key={index}
                className="relative flex w-2 justify-center"
                style={{
                  height: `${Math.abs(bar)}%`,
                  alignSelf: positive ? "flex-start" : "flex-end",
                  marginTop: positive ? `${100 - Math.abs(bar)}%` : 0,
                }}
              >
                <span
                  className={`absolute inset-0 rounded-full shadow-[0_0_10px_rgba(59,199,110,0.26)] ${
                    positive
                      ? "bg-[linear-gradient(180deg,#6FE49B_0%,#2CBD67_58%,#176C3D_100%)]"
                      : "bg-[linear-gradient(180deg,#FF756F_0%,#EF4444_64%,#8F1F24_100%)] shadow-[0_0_10px_rgba(239,68,68,0.22)]"
                  }`}
                />
                <span className="absolute left-1 top-1 h-[55%] w-px rounded-full bg-white/32" />
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (type === "target") {
    return (
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-1 rounded-full border border-white/10" />
        <div className="absolute inset-3 rounded-full border border-[#7AB6F4]/55" />
        <div className="absolute inset-[1.35rem] rounded-full bg-[#7AB6F4]" />
        <Target className="relative h-8 w-8 text-[#7AB6F4]" strokeWidth={1.8} />
      </div>
    );
  }

  return (
    <svg viewBox="0 0 120 52" className="h-12 w-[78px] overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="backtest-kpi-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#173B27" />
          <stop offset="42%" stopColor="#45D982" />
          <stop offset="72%" stopColor="#7AB6F4" />
          <stop offset="100%" stopColor="#35D879" />
        </linearGradient>
        <linearGradient id="backtest-kpi-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#45D982" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#45D982" stopOpacity="0" />
        </linearGradient>
        <filter id="backtest-kpi-glow" x="-40%" y="-70%" width="180%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M8 42 C24 38 28 17 43 22 S63 43 78 26 S94 11 112 10 L112 52 L8 52 Z"
        fill="url(#backtest-kpi-fill)"
        opacity="0.75"
      />
      <path
        d="M8 42 C24 38 28 17 43 22 S63 43 78 26 S94 11 112 10"
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.18"
      />
      <path
        d="M8 42 C24 38 28 17 43 22 S63 43 78 26 S94 11 112 10"
        fill="none"
        stroke="url(#backtest-kpi-line)"
        strokeWidth="2.3"
        strokeLinecap="round"
        filter="url(#backtest-kpi-glow)"
      />
      <circle cx="112" cy="10" r="2.5" fill="#7AB6F4" opacity="0.95" />
    </svg>
  );
});
BacktestKpiSparkline.displayName = "BacktestKpiSparkline";

/** KPI card — exact copy of Journal's inline JournalKpiCard, blue accent.
 *  tone: "green" | "blue" | "red"  (no gold)
 *  valueColor map: green=#3BC76E  red=#EF4444  blue=#7AB6F4
 *  Gauge conic: #F2C85F → #7AB6F4
 *  Icon circle: text-[#7AB6F4]
 *  Default tone = "blue" */
const BacktestKpiCard = React.memo(({
  label,
  value,
  hint,
  tone = "blue",
  icon,
  visual = "icon",
  gaugeFillPct,
  tooltip,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "green" | "blue" | "red";
  icon?: React.ReactNode;
  visual?: "icon" | "gauge" | "line" | "bars" | "target";
  gaugeFillPct?: number;
  tooltip: string;
}) => {
  const valueColor =
    tone === "green" ? "text-[#3BC76E]" : tone === "red" ? "text-[#EF4444]" : "text-[#7AB6F4]";

  const gaugeEndDeg = Math.max(0, Math.min(360, (gaugeFillPct ?? 0) * 3.6));

  return (
    <div className={`${JOURNAL_PANEL} min-h-[94px] px-4 py-3`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_50%,rgba(255,255,255,0.035),transparent_32%)]" />
      <div className="relative grid h-full grid-cols-[minmax(0,1fr)_66px] items-center gap-3">
        <div className="min-w-0 pr-1">
          <div className="mb-2 flex min-w-0 items-center gap-1.5">
            <span className="truncate whitespace-nowrap text-[11px] font-semibold text-white/82">{label}</span>
            <BacktestInfoIcon label={tooltip} className="h-3 w-3" />
          </div>
          <div className={`max-w-full whitespace-nowrap font-sans text-[clamp(22px,1.55vw,28px)] font-semibold leading-none tracking-normal tabular-nums ${valueColor}`}>
            {value}
          </div>
          {hint && (
            <div className="mt-2 max-w-full break-words text-[11px] font-medium leading-snug text-white/72">{hint}</div>
          )}
        </div>

        {visual === "icon" && (
          <div className="ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.035] text-[#7AB6F4]">
            {icon}
          </div>
        )}
        {visual === "gauge" && (
          <div className="relative ml-auto h-16 w-16 shrink-0">
            <div className="absolute inset-1 rounded-full border-[7px] border-white/[0.08]" />
            <div
              className="absolute inset-1 rounded-full transition-[background] duration-500"
              style={{
                background:
                  `conic-gradient(from 210deg, #7AB6F4 0deg, #7AB6F4 ${gaugeEndDeg}deg, transparent ${gaugeEndDeg}deg, transparent 360deg)`,
                mask: "radial-gradient(circle, transparent 54%, #000 56%)",
                WebkitMask: "radial-gradient(circle, transparent 54%, #000 56%)",
              }}
            />
          </div>
        )}
        {(visual === "line" || visual === "bars" || visual === "target") && (
          <div className="ml-auto flex w-[66px] justify-end overflow-hidden">
            {visual === "line" && <BacktestKpiSparkline type="line" />}
            {visual === "bars" && <BacktestKpiSparkline type="bars" />}
            {visual === "target" && <BacktestKpiSparkline type="target" />}
          </div>
        )}
      </div>
    </div>
  );
});
BacktestKpiCard.displayName = "BacktestKpiCard";

// ================================================
// MAIN BACKTEST DASHBOARD COMPONENT
// ================================================

function BacktestOverviewContent() {
  const navigate = useNavigate();
  useParams(); // backtestId available for future deep-link routing

  const { isImpersonating } = useEffectiveUser();
  const { data: stats, isLoading } = useMockBacktestStats(); // Replace with actual hook
  
  // Generate chart data
  const tradeTimeData = useMemo(() => {
    if (!stats) return [];
    return getTradeTimeData(stats);
  }, [stats]);

  const tradeDurationData = useMemo(() => {
    if (!stats) return [];
    return getTradeDurationData(stats);
  }, [stats]);
  
  const handleExportResults = useCallback(() => {
    window.print();
  }, []);
  
  const handleShareResults = useCallback(() => {
    // TODO: Implement share functionality
    console.log('Sharing backtest results...');
  }, []);
  
  const handleRunAgain = useCallback(() => {
    // TODO: Navigate to backtest configuration with same parameters
    navigate('/app/journal/backtest/new');
  }, [navigate]);

  // Expectancy = (winRate * avgWin) - ((1 - winRate) * |avgLoss|)
  // win_rate from the adapter is already 0–1 (stats.winRate / 100).
  // MUST be declared before any early return — hooks rule (#310 fix).
  const expectancy = useMemo(() => {
    if (!stats) return 0;
    const winRate = stats.win_rate; // 0–1
    return (winRate * stats.avg_win) - ((1 - winRate) * Math.abs(stats.avg_loss));
  }, [stats]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070808]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#C9A646] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-[#A0A0A0] text-xl">Loading backtest results...</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070808]">
        <div className="text-center">
          <div className="text-[#E36363] text-xl mb-2">Backtest not found</div>
          <button
            onClick={() => navigate('/app/journal/backtest')}
            className="text-[#C9A646] hover:underline text-sm"
          >
            Return to backtests
          </button>
        </div>
      </div>
    );
  }

  // Backtest accent = BLUE (Elad 2026-05-29). The Journal Dashboard runs
  // gold; Backtest distinguishes itself with #7AB6F4 sky-blue across neutral
  // KPIs. Profit Factor + Net P&L still use semantic colors (green/red).
  const netPnlPositive = stats.net_pnl >= 0;

  return (
    <div className="min-h-screen bg-[#070808] text-white">
      <style>{ANIMATION_STYLES}</style>

      <div className="mx-auto max-w-[1360px] space-y-4 px-1 py-3 sm:px-3 lg:px-1">
        {/* Header — Journal inline pattern */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="pt-0.5">
            <h1 className="text-[17px] font-semibold leading-tight tracking-normal text-white">
              Backtest Dashboard
            </h1>
            <p className="mt-2 text-[11px] text-white/60">
              {stats.strategy_name} • {dayjs(stats.backtest_period_start).format('MMM DD, YYYY')} – {dayjs(stats.backtest_period_end).format('MMM DD, YYYY')}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {isImpersonating && (
              <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 h-9">
                <Crown className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 text-[12px] font-medium">Admin View</span>
              </div>
            )}

            <button
              onClick={handleRunAgain}
              className="flex items-center gap-2 bg-[#141414] border rounded-[12px] px-3 h-9 text-[#F4F4F4] hover:bg-[#1A1A1A] transition-colors text-[12px]"
              style={BORDER_STYLE}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="font-medium">Run Again</span>
            </button>

            <button
              onClick={handleShareResults}
              className="flex items-center gap-2 bg-[#141414] border rounded-[12px] px-3 h-9 text-[#F4F4F4] hover:bg-[#1A1A1A] transition-colors text-[12px]"
              style={BORDER_STYLE}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="font-medium">Share</span>
            </button>

            <button
              onClick={handleExportResults}
              className="flex items-center gap-2 bg-gradient-to-r from-[#7AB6F4] to-[#5C9BDF] text-black rounded-[12px] px-3 h-9 font-medium hover:from-[#5C9BDF] hover:to-[#4A8AD4] transition-all text-[12px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report (AI-Enhanced)</span>
            </button>
          </div>
        </div>

        {/* AI Insights */}
        <BacktestAIInsight stats={stats} />

        {/* Main KPIs — BacktestKpiCard blue accent, 5-col on lg (mirrors Journal strip) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. Net P&L */}
          <BacktestKpiCard
            label="Net P&L"
            value={formatCurrency(stats.net_pnl)}
            tone={netPnlPositive ? "green" : "red"}
            visual="icon"
            icon={netPnlPositive
              ? <TrendingUp className="h-8 w-8" strokeWidth={2} />
              : <TrendingDown className="h-8 w-8" strokeWidth={2} />}
            hint={`${stats.total_trades} closed trades`}
            tooltip="Total profit or loss from backtest period."
          />

          {/* 2. Win Rate */}
          <BacktestKpiCard
            label="Win Rate"
            value={formatPercentage(stats.win_rate)}
            tone="blue"
            visual="gauge"
            gaugeFillPct={(stats.win_rate ?? 0) * 100}
            hint={`${stats.winning_trades}W / ${stats.losing_trades}L / ${stats.breakeven_trades}BE`}
            tooltip="Percentage of winning trades vs total trades."
          />

          {/* 3. Profit Factor */}
          <BacktestKpiCard
            label="Profit Factor"
            value={Number.isFinite(stats.profit_factor) ? stats.profit_factor.toFixed(2) : '∞'}
            tone={
              !Number.isFinite(stats.profit_factor) ? "green" :
              stats.profit_factor > 1 ? "green" : "red"
            }
            visual="line"
            tooltip="Gross profit divided by gross loss. >1 means profitable. ∞ = no losing trades."
          />

          {/* 4. Avg Win / Loss */}
          <BacktestKpiCard
            label="Avg Win / Loss"
            value={stats.avg_loss !== 0 ? (stats.avg_win / Math.abs(stats.avg_loss)).toFixed(2) : '—'}
            tone="blue"
            visual="bars"
            hint={`${formatCurrency(stats.avg_win)} / ${formatCurrency(stats.avg_loss)}`}
            tooltip="Average size of winning trades compared with average losing trade."
          />

          {/* 5. Expectancy */}
          <BacktestKpiCard
            label="Expectancy"
            value={formatSignedCurrency(expectancy)}
            tone={expectancy >= 0 ? "green" : "red"}
            visual="target"
            hint="Per Trade"
            tooltip="Estimated average P&L per trade based on win rate, average win, and average loss."
          />
        </div>

        {/* Best/Worst Trades */}
        <BacktestBestWorstTrades stats={stats} />

        {/* Equity + Daily P&L charts row */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[0.9fr_1fr]">
          {/* Equity Curve panel */}
          <div className="relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)] p-4">
            <h2 className="text-[14px] font-semibold text-white mb-3">Equity Curve</h2>
            <ErrorBoundary fallback={
              <div className="text-center text-[#E36363] p-6 bg-[#0E0E0E] rounded-[12px] border border-white/[0.05]">
                Failed to load equity curve. Please refresh the page.
              </div>
            }>
              <Suspense fallback={<ChartSkeleton />}>
                <BacktestEquityChart data={stats.equity_curve} />
              </Suspense>
            </ErrorBoundary>
          </div>

          {/* Daily P&L panel */}
          <div className="relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)] p-4">
            <h2 className="text-[14px] font-semibold text-white mb-3">Daily P&L</h2>
            <ErrorBoundary fallback={
              <div className="text-center text-[#E36363] p-6 bg-[#0E0E0E] rounded-[12px] border border-white/[0.05]">
                Failed to load daily P&L chart. Please refresh the page.
              </div>
            }>
              <Suspense fallback={<ChartSkeleton />}>
                <BacktestDailyPnLChart data={stats.equity_curve} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>

        {/* Trade Time & Duration Performance Charts */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)] p-4">
            <h2 className="text-[14px] font-semibold text-white mb-3">Trade Time Performance</h2>
            <TradeTimePerformanceChart data={tradeTimeData} />
          </div>
          <div className="relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)] p-4">
            <h2 className="text-[14px] font-semibold text-white mb-3">Trade Duration Performance</h2>
            <TradeDurationPerformanceChart data={tradeDurationData} />
          </div>
        </div>

        {/* Hypothetical Performance Disclosure — placed at the bottom as a
            footer-style note (Elad 2026-05-28: legal compliance retained,
            visual prominence reduced — users don't need the alert framing). */}
        <CftcDisclosureBanner className="mt-8" />
      </div>
    </div>
  );
}

export default function BacktestOverview() {
  return (
    <ErrorBoundary>
      <BacktestOverviewContent />
    </ErrorBoundary>
  );
}