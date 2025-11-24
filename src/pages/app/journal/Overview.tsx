// ================================================
// FINOTAUR DASHBOARD WITH TRADEZELLA-STYLE CIRCULAR GAUGES
// File: src/pages/JournalOverview.tsx
// ✅ Beautiful circular progress indicators
// ✅ Profit Factor & Avg Win/Loss Trade KPIs
// ✅ NEW: Trade Time & Duration Performance Charts
// ✅ UPDATED: Trade Duration locked for FREE users without SnapTrade
// ✅ UPDATED: Timezone support & Trading Session indicators
// ✅ Production ready for 5000+ users
// ================================================

import React, { useState, lazy, Suspense, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageTitle from "@/components/PageTitle";
import dayjs from "dayjs";
import {
  PlusSquare, FileText, Layers, BarChart3, Calendar as CalendarIcon,
  MessageSquare, ListChecks, Users, GraduationCap, Settings as SettingsIcon,
  Sparkles, TrendingUp, TrendingDown, UserPlus, Link2, CheckCircle2, Lock, 
  Crown, X, Zap, FileEdit, ArrowRight, HelpCircle
} from "lucide-react";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useSubscription } from "@/hooks/useSubscription";
import {
  useDashboardStats,
  useSnapTradeConnections,
  formatCurrency,
  formatPercentage,
  getPnLColor,
  type DashboardStats
} from "@/hooks/useDashboardData";
import { DAYS_MAP, BORDER_STYLE, CARD_STYLE, ANIMATION_STYLES, type DaysRange } from "@/constants/dashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { prefetchTrades, prefetchStrategies, prefetchAnalytics, prefetchSettingsData } from "@/lib/queryClient";
import { DashboardKpiCard } from "@/components/DashboardKpiCard";

// ================================================
// NEW: TIMEZONE & TRADING SESSION IMPORTS
// ================================================
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatTradeDate } from '@/utils/dateFormatter';
import { formatSessionDisplay, getSessionColor } from '@/constants/tradingSessions';

// ================================================
// LAZY LOAD HEAVY COMPONENTS
// ================================================

const EquityChart = lazy(() => import("@/components/charts/EquityChart"));
const DailyPnLChart = lazy(() => import("@/components/charts/DailyPnLChart"));
const AffiliatePopup = lazy(() => import("@/components/AffiliatePopup"));
const SnapTradePopup = lazy(() => import("@/components/SnapTradePopup"));

// ================================================
// LOADING SKELETONS
// ================================================

const ChartSkeleton = React.memo(() => (
  <div className="w-full h-[380px] bg-[#0A0A0A] rounded-[20px] animate-pulse flex items-center justify-center border" style={BORDER_STYLE}>
    <div className="text-[#A0A0A0] text-sm">Loading chart...</div>
  </div>
));
ChartSkeleton.displayName = 'ChartSkeleton';

const CardSkeleton = React.memo(() => (
  <div 
    className="rounded-[20px] border bg-[#141414] p-6 animate-pulse" 
    style={BORDER_STYLE}
  >
    <div className="h-4 bg-[#1A1A1A] rounded w-20 mb-3"></div>
    <div className="h-8 bg-[#1A1A1A] rounded w-32"></div>
  </div>
));
CardSkeleton.displayName = 'CardSkeleton';

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
const getTradeTimeData = (stats: DashboardStats): DataPoint[] => {
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
const getTradeDurationData = (stats: DashboardStats): DataPoint[] => {
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
        durationStr = `${hours}h:${mins}m`;
      } else {
        const days = Math.floor(durationMinutes / 1440);
        const hours = Math.floor((durationMinutes % 1440) / 60);
        durationStr = `${days}d:${hours}h`;
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
  const allValues = data.map(d => Math.abs(d.value));
  const dataMax = Math.max(...allValues);
  // Add 10% padding to the scale for better visibility
  const maxValue = Math.max(dataMax * 1.1, 100);
  
  // ✅ Find min value for proper negative scaling
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

// ================================================
// ✅ UPDATED: Trade Duration Chart with Lock Feature
// ================================================

const TradeDurationPerformanceChart = React.memo(({ 
  data,
  isLocked = false
}: { 
  data: DataPoint[];
  isLocked?: boolean;
}) => {
  const maxValue = Math.max(...data.map(d => Math.abs(d.value)), 100);
  
  // ✅ LOCKED STATE FOR FREE USERS OR USERS WITHOUT SNAPTRADE
  if (isLocked) {
    return (
      <div 
        className="rounded-2xl border p-5 shadow-lg relative overflow-hidden"
        style={{
          borderColor: 'rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-[#F4F4F4] text-base font-semibold">
              Trade duration performance
            </h3>
            <HelpCircle className="w-4 h-4 text-[#808080]" />
          </div>
          <div className="flex items-center gap-1.5 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-lg px-3 py-1.5">
            <Lock className="w-3.5 h-3.5 text-[#C9A646]" />
            <span className="text-[10px] text-[#C9A646] font-semibold uppercase tracking-wider">
              Paid Feature
            </span>
          </div>
        </div>

        {/* Blurred Preview Chart */}
        <div className="relative h-64 w-full blur-[3px] opacity-30">
          <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-[#666666] pr-2">
            <span>$5000</span>
            <span>$3750</span>
            <span>$2500</span>
            <span>$1250</span>
            <span>$0</span>
            <span>-$1250</span>
            <span>-$2500</span>
          </div>

          <div className="absolute left-12 right-0 top-0 bottom-8">
            <svg className="w-full h-full">
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
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1"
              />
              
              {/* Mock data points */}
              {[15, 28, 42, 56, 70, 84].map((x, i) => (
                <circle
                  key={i}
                  cx={`${x}%`}
                  cy={`${25 + Math.random() * 50}%`}
                  r="4"
                  fill={Math.random() > 0.5 ? '#4AD295' : '#E36363'}
                  opacity="0.6"
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Unlock Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0A0A0A]/97 via-[#141414]/95 to-[#0A0A0A]/97 backdrop-blur-sm">
          <div className="text-center max-w-xs px-6">
            {/* Lock Icon */}
            <div className="relative inline-block mb-3">
              <div className="absolute inset-0 bg-[#C9A646] blur-xl opacity-20 animate-pulse"></div>
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#C9A646]/20 to-[#C9A646]/5 border-2 border-[#C9A646]/40 flex items-center justify-center">
                <Lock className="w-7 h-7 text-[#C9A646]" />
              </div>
            </div>

            <p className="text-[#F4F4F4] text-sm font-medium leading-relaxed">
              Connect your broker to view this chart
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // ✅ UNLOCKED STATE - SHOW REAL CHART
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
      </div>

      <div className="relative h-64 w-full">
        <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-[#666666] pr-2">
          <span>${(maxValue).toFixed(0)}</span>
          <span>${(maxValue * 0.75).toFixed(0)}</span>
          <span>${(maxValue * 0.5).toFixed(0)}</span>
          <span>${(maxValue * 0.25).toFixed(0)}</span>
          <span>$0</span>
          <span>-${(maxValue * 0.25).toFixed(0)}</span>
          <span>-${(maxValue * 0.5).toFixed(0)}</span>
        </div>

        <div className="absolute left-12 right-0 top-0 bottom-8">
          <svg className="w-full h-full">
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
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />

            {data.map((point, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 50 - (point.value / maxValue) * 50;
              
              return (
                <circle
                  key={i}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="4"
                  fill={point.isProfit ? '#4AD295' : '#E36363'}
                  className="hover:r-6 transition-all cursor-pointer"
                  opacity="0.8"
                >
                  <title>{`${point.duration}: $${point.value.toFixed(2)}`}</title>
                </circle>
              );
            })}
          </svg>
        </div>

        <div className="absolute left-12 right-0 bottom-0 flex justify-between text-[10px] text-[#666666]">
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
// FREE USER TOOLTIP MODAL
// ================================================

const FreeUserBrokerTooltip = React.memo(({ 
  onClose, 
  onUpgrade 
}: { 
  onClose: () => void; 
  onUpgrade: () => void;
}) => {
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border border-[#C9A646]/30 rounded-2xl p-6 max-w-md w-full shadow-[0_0_60px_rgba(201,166,70,0.3)] relative animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="absolute inset-0 bg-[#C9A646] blur-xl opacity-30 animate-pulse"></div>
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#C9A646]/20 to-[#C9A646]/5 border-2 border-[#C9A646]/40 flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#C9A646]" />
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-center text-white mb-2">
          Broker Connections
        </h3>
        
        <p className="text-center text-zinc-400 text-sm mb-6 leading-relaxed">
          This feature is available for <span className="text-[#C9A646] font-semibold">Basic</span> and <span className="text-[#C9A646] font-semibold">Premium</span> users
        </p>

        <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <FileEdit className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium mb-1">
                Currently using manual entry
              </p>
              <p className="text-zinc-400 text-xs leading-relaxed">
                You can add trades manually through the <span className="text-[#C9A646] font-semibold">New Trade</span> tab
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#C9A646]/10 to-transparent border border-[#C9A646]/20 rounded-xl p-4 mb-6">
          <p className="text-xs text-[#C9A646] font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-3 h-3" />
            Unlock with upgrade
          </p>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2.5 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-[#C9A646] mt-0.5 flex-shrink-0" />
              <span>Automatic trade imports from your broker</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-[#C9A646] mt-0.5 flex-shrink-0" />
              <span>Real-time portfolio synchronization</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-[#C9A646] mt-0.5 flex-shrink-0" />
              <span>No more manual data entry</span>
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all font-medium"
          >
            Maybe Later
          </button>
          <button
            onClick={onUpgrade}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C9A646] to-[#E5C158] hover:from-[#B39540] hover:to-[#D4B55E] text-black rounded-xl transition-all font-bold shadow-lg flex items-center justify-center gap-2 group"
          >
            Upgrade Now
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <p className="text-center text-zinc-500 text-xs mt-4">
          Start from just $15.99/month
        </p>
      </div>
    </div>
  );
});
FreeUserBrokerTooltip.displayName = 'FreeUserBrokerTooltip';

// ================================================
// OTHER COMPONENTS
// ================================================

const Shortcut = React.memo(({ 
  to, 
  title, 
  subtitle, 
  Icon,
  onPrefetch
}: { 
  to: string; 
  title: string; 
  subtitle?: string; 
  Icon: any;
  onPrefetch?: () => void;
}) => (
  <Link 
    to={to} 
    onMouseEnter={onPrefetch}
    className="rounded-[18px] border bg-[#141414] hover:bg-[#1A1A1A] transition-all duration-300 p-5 flex items-center gap-4 group"
    style={BORDER_STYLE}
  >
    <div className="rounded-xl bg-gradient-to-br from-[#C9A646]/10 to-[#C9A646]/5 group-hover:from-[#C9A646]/20 group-hover:to-[#C9A646]/10 p-3 transition-all duration-300">
      <Icon className="w-5 h-5 text-[#C9A646]" />
    </div>
    <div className="flex-1">
      <div className="text-[#F4F4F4] text-sm font-medium group-hover:text-[#C9A646] transition-colors duration-200">
        {title}
      </div>
      {subtitle && (
        <div className="text-xs text-[#A0A0A0] mt-0.5 font-light">
          {subtitle}
        </div>
      )}
    </div>
  </Link>
));
Shortcut.displayName = 'Shortcut';

const BestWorstTrades = React.memo(({ stats, timezone }: { stats: DashboardStats; timezone: string }) => {
  if (!stats.bestTrade || !stats.worstTrade) return null;
  
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
            {formatCurrency(stats.bestTrade.pnl)}
          </span>
          {stats.bestTrade.rr && (
            <span className="text-sm text-[#4AD295]/70 font-light">
              ({stats.bestTrade.rr.toFixed(1)}R)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {stats.bestTrade.session && (
            <span className={`px-2 py-0.5 rounded text-xs ${getSessionColor(stats.bestTrade.session)}`}>
              {formatSessionDisplay(stats.bestTrade.session)}
            </span>
          )}
          <span className="text-xs text-[#A0A0A0] font-light">
            {stats.bestTrade.symbol} • {formatTradeDate(stats.bestTrade.open_at, timezone)}
          </span>
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
            {formatCurrency(stats.worstTrade.pnl)}
          </span>
          {stats.worstTrade.rr && (
            <span className="text-sm text-[#E36363]/70 font-light">
              ({stats.worstTrade.rr.toFixed(1)}R)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {stats.worstTrade.session && (
            <span className={`px-2 py-0.5 rounded text-xs ${getSessionColor(stats.worstTrade.session)}`}>
              {formatSessionDisplay(stats.worstTrade.session)}
            </span>
          )}
          <span className="text-xs text-[#A0A0A0] font-light">
            {stats.worstTrade.symbol} • {formatTradeDate(stats.worstTrade.open_at, timezone)}
          </span>
        </div>
      </div>
    </div>
  );
});
BestWorstTrades.displayName = 'BestWorstTrades';

const AIInsight = React.memo(({ stats }: { stats: DashboardStats }) => {
  const insight = useMemo(() => {
    if (stats.closedTrades < 10) {
      return "Welcome! Track 10+ trades to unlock AI insights.";
    }
    
    if (stats.winrate > 0.6) {
      return "Strong performance with solid win rate — maintain your discipline.";
    }
    
    if (stats.avgRR > 1.5) {
      return "Excellent risk management — you're letting winners run.";
    }
    
    return "Stay focused on process over outcomes — consistency compounds.";
  }, [stats.closedTrades, stats.winrate, stats.avgRR]);
  
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
          AI Insights
        </div>
        <div className="text-[#F4F4F4] text-sm leading-relaxed font-light">
          {insight}
        </div>
      </div>
    </div>
  );
});
AIInsight.displayName = 'AIInsight';

// ================================================
// MAIN DASHBOARD COMPONENT
// ================================================

function JournalOverviewContent() {
  const navigate = useNavigate();
  
  // ✅ NEW: Timezone context
  const timezone = useTimezone();
  
  const [range, setRange] = useState<DaysRange>('30D');
  const [showReferModal, setShowReferModal] = useState(false);
  const [showSnapTradePopup, setShowSnapTradePopup] = useState(false);
  const [showFreeUserTooltip, setShowFreeUserTooltip] = useState(false);
  
  const { id: userId, isImpersonating } = useEffectiveUser();
  
  const { limits, loading: subscriptionLoading, canUseSnapTrade } = useSubscription();
  const { data: stats, isLoading, error } = useDashboardStats(DAYS_MAP[range], userId);
  const { data: connections, isLoading: connectionsLoading } = useSnapTradeConnections(userId);
  
  const tier = useMemo(() => stats?.tier, [stats]);
  
  const hasActiveConnection = useMemo(() => 
    connections?.some(c => c.status === 'CONNECTED'), 
    [connections]
  );
  
  const isCheckingConnection = connectionsLoading || subscriptionLoading;
  const isFreeUser = limits?.account_type === 'free';
  const isLockedForFree = isFreeUser && !canUseSnapTrade;
  
  // Generate real data from trades dynamically
  const tradeTimeData = useMemo(() => {
    if (!stats) return [];
    return getTradeTimeData(stats);
  }, [stats]);

  const tradeDurationData = useMemo(() => {
    if (!stats) return [];
    return getTradeDurationData(stats);
  }, [stats]);
  
  // ✅ Check if Trade Duration chart should be locked
  const isDurationChartLocked = isFreeUser || !hasActiveConnection;
  
  // ✅ Determine where to send user when clicking upgrade
  const handleDurationUpgrade = useCallback(() => {
    if (isFreeUser) {
      // Free user → send to pricing page
      navigate('/app/journal/pricing');
    } else {
      // Paid user without connection → open SnapTrade popup
      setShowSnapTradePopup(true);
    }
  }, [isFreeUser, navigate]);
  
  const handleGeneratePDF = useCallback(() => {
    window.print();
  }, []);
  
  const handleBrokerButtonClick = useCallback(() => {
    if (isLockedForFree) {
      setShowFreeUserTooltip(true);
    } else {
      setShowSnapTradePopup(true);
    }
  }, [isLockedForFree]);

  const handleUpgradeFromTooltip = useCallback(() => {
    setShowFreeUserTooltip(false);
    navigate('/app/journal/pricing');
  }, [navigate]);
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="text-[#E36363] text-xl mb-2">Error loading dashboard</div>
          <div className="text-[#A0A0A0] text-sm">{error.message}</div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="text-[#A0A0A0] text-xl mb-2">Loading user data...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen" style={{ 
      background: 'radial-gradient(circle at top, #0A0A0A 0%, #121212 100%)'
    }}>
      <style>{ANIMATION_STYLES}</style>
      
      <div className="p-6 space-y-6">
        {/* ✅ UPDATED: Header with Trading Session Indicator */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1">
            <PageTitle 
              title="Dashboard" 
              subtitle="Track your performance and manage your trading journey" 
            />
          </div>

          <div className="flex items-center gap-3">
            {isImpersonating && (
              <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-2">
                <Crown className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 text-sm font-medium">Admin View</span>
              </div>
            )}

            <button
              onClick={handleBrokerButtonClick}
              disabled={isCheckingConnection}
              className={`flex items-center gap-2.5 border rounded-[12px] px-4 py-2.5 transition-all duration-300 group relative overflow-hidden ${
                isCheckingConnection
                  ? 'bg-[#1A1A1A] border-[#C9A646]/20 cursor-wait'
                  : isLockedForFree
                  ? 'bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 border-zinc-600/30 hover:border-zinc-500/50 cursor-pointer hover:scale-[1.02]'
                  : hasActiveConnection
                  ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border-emerald-500/30 hover:border-emerald-500/50'
                  : 'bg-gradient-to-r from-[#1A1A1A] to-[#242424] border-[#C9A646]/20 hover:border-[#C9A646]/40'
              }`}
            >
              {isCheckingConnection ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#C9A646] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[#C9A646] text-sm font-medium">Loading...</span>
                </>
              ) : isLockedForFree ? (
                <>
                  <Lock className="w-4 h-4 text-zinc-400 group-hover:text-[#C9A646] transition-colors" />
                  <span className="text-zinc-400 group-hover:text-[#C9A646] text-sm font-medium transition-colors">
                    Connect Broker
                  </span>
                  <Crown className="w-3 h-3 text-[#C9A646] opacity-70" />
                </>
              ) : hasActiveConnection ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-medium">Broker Connected</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 text-[#C9A646] group-hover:rotate-45 transition-transform duration-300" />
                  <span className="text-[#C9A646] text-sm font-medium">Connect Broker</span>
                </>
              )}
            </button>

            {tier && (
              <div 
                className="flex items-center gap-3 bg-[#141414] border rounded-[16px] px-5 py-3 shadow-[0_0_30px_rgba(201,166,70,0.08)] relative overflow-hidden"
                style={BORDER_STYLE}
              >
                <div className="relative z-10 flex items-center gap-3">
                  <div className={`text-2xl ${tier.icon === '🥇' ? 'animate-pulse-gold' : ''}`}>
                    {tier.icon}
                  </div>
                  <div>
                    <div className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-light">
                      Trader Tier
                    </div>
                    <div className={`text-sm font-semibold ${tier.color}`}>
                      {tier.tier}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {stats && <AIInsight stats={stats} />}

        <div className="flex flex-wrap items-center gap-3">
          <select
            className="bg-[#141414] border rounded-[14px] px-4 py-3 text-sm text-[#F4F4F4] hover:border-[#C9A646]/30 transition-colors focus:outline-none focus:border-[#C9A646]/50 font-medium"
            style={BORDER_STYLE}
            value={range}
            onChange={(e) => setRange(e.target.value as DaysRange)}
          >
            <option value="7D">Last 7 days</option>
            <option value="30D">Last 30 days</option>
            <option value="90D">Last 90 days</option>
            <option value="ALL">All time</option>
          </select>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setShowReferModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#1A1A1A] to-[#242424] border rounded-[12px] px-4 py-2.5 text-[#C9A646] font-medium text-sm transition-all duration-300 hover:bg-[rgba(201,166,70,0.1)] group relative overflow-hidden"
              style={{ borderColor: 'rgba(201,166,70,0.2)' }}
            >
              <UserPlus className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Refer a Friend</span>
            </button>

            <button
              onClick={handleGeneratePDF}
              className="relative flex items-center gap-2 bg-[#C9A646]/10 hover:bg-[#C9A646]/20 text-[#C9A646] border rounded-[12px] px-5 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden group"
              style={{ borderColor: 'rgba(201,166,70,0.2)' }}
            >
              <FileText className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Download Monthly Report (AI-Enhanced)</span>
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
          </div>
        )}

        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DashboardKpiCard 
                label="Net P&L" 
                value={formatCurrency(stats.netPnl)} 
                color={getPnLColor(stats.netPnl)}
                hint={`${stats.closedTrades} closed trades`}
                tooltip="Total profit or loss from all closed trades"
              />
              
              <DashboardKpiCard 
                label="Win Rate" 
                value={formatPercentage(stats.winrate)} 
                hint={`${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE`}
                color="text-[#C9A646]"
                tooltip="Percentage of winning trades vs total trades"
                showGauge={true}
                gaugeData={{ 
                  wins: stats.wins, 
                  losses: stats.losses, 
                  breakeven: stats.breakeven 
                }}
              />
              
              <DashboardKpiCard 
                label="Profit Factor" 
                value={
                  stats.profitFactor != null && !isNaN(stats.profitFactor) && isFinite(stats.profitFactor)
                    ? stats.profitFactor.toFixed(2)
                    : "—"
                }
                color={
                  stats.profitFactor > 2 ? "text-[#4AD295]" :
                  stats.profitFactor > 1 ? "text-[#C9A646]" :
                  "text-[#E36363]"
                }
                tooltip="Gross profit divided by gross loss. >1 means profitable"
              />
              
              <DashboardKpiCard 
                label="Avg Win/Loss Trade" 
                value={
                  stats.avgWin && stats.avgLoss
                    ? `${(stats.avgWin / Math.abs(stats.avgLoss)).toFixed(2)}`
                    : "—"
                }
                hint={`${formatCurrency(stats.avgWin || 0)} / ${formatCurrency(stats.avgLoss || 0)}`}
                color="text-[#C9A646]"
                tooltip="Average size of winning trades vs losing trades"
                showGauge={true}
                gaugeData={{ 
                  avgWin: stats.avgWin || 0, 
                  avgLoss: stats.avgLoss || 0 
                }}
              />
            </div>

            {/* ✅ UPDATED: Best/Worst trades with timezone and session */}
            <BestWorstTrades stats={stats} timezone={timezone} />

            <ErrorBoundary fallback={
              <div className="text-center text-[#E36363] p-6 bg-[#1A1A1A] rounded-[20px]">
                Failed to load chart. Please refresh the page.
              </div>
            }>
              <Suspense fallback={<ChartSkeleton />}>
                <EquityChart data={stats.equitySeries || []} />
              </Suspense>
            </ErrorBoundary>

            <ErrorBoundary fallback={
              <div className="text-center text-[#E36363] p-6 bg-[#1A1A1A] rounded-[20px]">
                Failed to load chart. Please refresh the page.
              </div>
            }>
              <Suspense fallback={<ChartSkeleton />}>
                <DailyPnLChart data={stats.equitySeries || []} />
              </Suspense>
            </ErrorBoundary>

            {/* ✅ UPDATED: Charts with lock logic for Trade Duration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TradeTimePerformanceChart data={tradeTimeData} />
              <TradeDurationPerformanceChart 
                data={tradeDurationData}
                isLocked={isDurationChartLocked}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Shortcut 
                to="/app/journal/new" 
                title="Add Trade" 
                subtitle="Create a new trade" 
                Icon={PlusSquare} 
              />
              <Shortcut 
                to="/app/journal/my-trades" 
                title="My Trades" 
                subtitle="View & edit your trades" 
                Icon={FileText}
                onPrefetch={prefetchTrades}
              />
              <Shortcut 
                to="/app/journal/strategies" 
                title="Strategies" 
                subtitle="Build your playbook" 
                Icon={Layers}
                onPrefetch={prefetchStrategies}
              />
              <Shortcut 
                to="/app/journal/analytics" 
                title="Analytics" 
                subtitle="KPIs & performance metrics" 
                Icon={BarChart3}
                onPrefetch={prefetchAnalytics}
              />
              <Shortcut 
                to="/app/journal/calendar" 
                title="Calendar" 
                subtitle="Track entries & exits" 
                Icon={CalendarIcon} 
              />
              <Shortcut 
                to="/app/journal/ai-review" 
                title="AI Chat" 
                subtitle="Get trading insights" 
                Icon={MessageSquare} 
              />
              <Shortcut 
                to="/app/journal/scenarios" 
                title="Scenarios" 
                subtitle="Pre-market planning" 
                Icon={ListChecks} 
              />
              <Shortcut 
                to="/app/journal/community" 
                title="Community" 
                subtitle="Tips & updates" 
                Icon={Users} 
              />
              <Shortcut 
                to="/app/journal/academy" 
                title="Academy" 
                subtitle="Learning resources" 
                Icon={GraduationCap} 
              />
              <Shortcut 
                to="/app/journal/settings" 
                title="Settings" 
                subtitle="Preferences & billing" 
                Icon={SettingsIcon}
                onPrefetch={prefetchSettingsData}
              />
            </div>
          </>
        )}
      </div>

      {showReferModal && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <AffiliatePopup onClose={() => setShowReferModal(false)} />
          </Suspense>
        </ErrorBoundary>
      )}

      {showSnapTradePopup && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <SnapTradePopup onClose={() => setShowSnapTradePopup(false)} />
          </Suspense>
        </ErrorBoundary>
      )}

      {showFreeUserTooltip && (
        <FreeUserBrokerTooltip
          onClose={() => setShowFreeUserTooltip(false)}
          onUpgrade={handleUpgradeFromTooltip}
        />
      )}
    </div>
  );
}

export default function JournalOverview() {
  return (
    <ErrorBoundary>
      <JournalOverviewContent />
    </ErrorBoundary>
  );
}