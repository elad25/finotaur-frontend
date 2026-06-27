// ================================================
// FINOTAUR DASHBOARD WITH TRADEZELLA-STYLE CIRCULAR GAUGES
// File: src/pages/JournalOverview.tsx
// ✅ Beautiful circular progress indicators
// ✅ Profit Factor & Avg Win/Loss Trade KPIs
// ✅ NEW: Trade Time & Duration Performance Charts
// ✅ UPDATED: Trade Duration locked for FREE users without SnapTrade
// ✅ UPDATED: Timezone support & Trading Session indicators
// ✅ UPDATED: Green checkmark on Refer a Friend for active affiliates
// ✅ NEW: Personalized greeting with user name
// ✅ FIXED: Broker button completely disabled for FREE users
// ✅ NEW: Import Trades button replacing Trader Tier
// ✅ Production ready for 5000+ users
// ================================================

import React, { useState, lazy, Suspense, useMemo, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import dayjs from "dayjs";
import { FEATURES } from "@/config/features";
import {
  PlusSquare, FileText, Layers, BarChart3, Calendar as CalendarIcon,
  MessageSquare, ListChecks, Users, GraduationCap, Settings as SettingsIcon,
  Sparkles, TrendingUp, TrendingDown, UserPlus, Link2, CheckCircle2, Lock, 
  Crown, X, Zap, FileEdit, ArrowRight, HelpCircle, Check, 
  FileSpreadsheet, Download, ChevronLeft, ChevronRight, CalendarRange,
  RefreshCw, Wifi, WifiOff, AlertCircle, Target
} from "lucide-react";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useMentorView } from "@/contexts/MentorViewContext";
import { useAuth } from "@/providers/AuthProvider";
import { useSubscription } from "@/hooks/useSubscription";
import {
  useDashboardStats,
  formatCurrency,
  formatPercentage,
  type DashboardStats
} from "@/hooks/useDashboardData";
import { BORDER_STYLE, ANIMATION_STYLES } from "@/constants/dashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { prefetchTrades, prefetchStrategies, prefetchAnalytics, prefetchSettingsData } from "@/lib/queryClient";

// ================================================
// NEW: AFFILIATE STATUS HOOK
// ================================================
import { useIsAffiliate } from '@/features/affiliate/hooks/useAffiliateProfile';
import { UserStatusBadges } from '@/features/floor/components/UserStatusBadges';

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
const FinoScore = lazy(() => import("@/components/journal/FinoScore"));
const BreakdownPanel = lazy(() => import("@/components/journal/BreakdownPanel"));
const AffiliatePopup = lazy(() => import("@/components/AffiliatePopup"));
const BrokerConnectionPopup = lazy(() => import("@/components/BrokerConnectionPopup"));
const TradovateConnectModal = lazy(() => import("@/components/TradovateConnectModal"));
const BrokerPickerModal = lazy(() => import("@/components/BrokerPickerModal"));
const ImportTradesPopup = lazy(() => import("@/components/Importtradespopup"));
const BrokerReconnectModal = lazy(() =>
  import("@/components/broker/BrokerReconnectModal").then((m) => ({ default: m.BrokerReconnectModal })),
);
import AddBrokerPopup from "@/components/broker/AddBrokerPopup";
import { UpgradeLimitDialog } from '@/components/upgrade/UpgradeLimitDialog';
import { ManageConnectionsModal } from '@/components/broker/ManageConnectionsModal';
import BrokerConnectionsPopover from '@/components/broker/BrokerConnectionsPopover';
import { aggregateStatusDotColor } from '@/components/broker/brokerStatusBadge';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { supabase } from '@/lib/supabase';
import { JournalEmptyState } from '@/components/journal/JournalEmptyState';
import { Button } from '@/components/ds/Button';
import { useImportTrades } from '@/hooks/useImportTrades';
import { useTradovate } from '@/hooks/useTradovate';
import { usePortfolioContext } from '@/contexts/PortfolioContext';
import { AccountSwitcher } from '@/components/AccountSwitcher';
import { AccountFilterDropdown } from '@/components/journal/AccountFilterDropdown';
import type { FinotaurTrade } from '@/utils/importUtils';
import { useDisplayUnit } from '@/hooks/useDisplayUnit';
import { useTraderMode } from '@/hooks/useTraderMode';
import { aggregateR, tradeR, type TradeForRAgg } from '@/utils/rAggregates';
import { useStrategyRConfigs } from '@/hooks/useStrategies';

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

const JOURNAL_PANEL =
  "relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]";

const JournalInfoIcon = ({
  label,
  className = "h-3.5 w-3.5",
}: {
  label: string;
  className?: string;
}) => (
  <TooltipProvider delayDuration={120}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => e.preventDefault()}
          className="inline-flex shrink-0 items-center justify-center"
        >
          <HelpCircle
            className={`${className} shrink-0 cursor-help text-white/38 transition-colors hover:text-[#E8C766]`}
            role="img"
          />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-[240px] border-[#E8C766]/25 bg-[rgba(10,10,10,0.96)] text-[11px] font-medium leading-snug text-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const formatPlainCurrency = (value: number): string => {
  const abs = Math.abs(value || 0);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : ""}$${formatted}`;
};

const formatSignedCurrency = (value: number): string => {
  const abs = Math.abs(value || 0);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value >= 0 ? "+" : "-"}$${formatted}`;
};

/** Format a signed R value: null → "—"; else "+1.4R" / "-2.0R" */
const formatR = (value: number | null): string => {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(1)}R`;
};

/** Format an unsigned R magnitude (for avg-loss display): null → "—"; else "1.0R" */
const formatRMag = (value: number | null): string => {
  if (value === null) return "—";
  return `${Math.abs(value).toFixed(1)}R`;
};

const KpiSparkline = React.memo(({ type = "line" }: { type?: "line" | "bars" | "target" }) => {
  if (type === "bars") {
    const bars = [28, 42, 34, 62, -36, 44, 88];
    return (
      <div className="relative flex h-12 w-[72px] items-center justify-end overflow-hidden rounded-md">
        <div className="absolute inset-x-1 top-1/2 h-px bg-[#C9A646]/12" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_35%,rgba(201,166,70,0.16),transparent_48%)]" />
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
        <div className="absolute inset-3 rounded-full border border-[#E8C766]/55" />
        <div className="absolute inset-[1.35rem] rounded-full bg-[#E8C766]" />
        <Target className="relative h-8 w-8 text-[#E8C766]" strokeWidth={1.8} />
      </div>
    );
  }

  return (
    <svg viewBox="0 0 120 52" className="h-12 w-[78px] overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="journal-kpi-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#173B27" />
          <stop offset="42%" stopColor="#45D982" />
          <stop offset="72%" stopColor="#C9A646" />
          <stop offset="100%" stopColor="#35D879" />
        </linearGradient>
        <linearGradient id="journal-kpi-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#45D982" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#45D982" stopOpacity="0" />
        </linearGradient>
        <filter id="journal-kpi-glow" x="-40%" y="-70%" width="180%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M8 42 C24 38 28 17 43 22 S63 43 78 26 S94 11 112 10 L112 52 L8 52 Z"
        fill="url(#journal-kpi-fill)"
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
        stroke="url(#journal-kpi-line)"
        strokeWidth="2.3"
        strokeLinecap="round"
        filter="url(#journal-kpi-glow)"
      />
      <circle cx="112" cy="10" r="2.5" fill="#E8C766" opacity="0.95" />
    </svg>
  );
});
KpiSparkline.displayName = "KpiSparkline";

const JournalKpiCard = React.memo(({
  label,
  value,
  hint,
  tone = "gold",
  icon,
  visual = "icon",
  gaugeFillPct,
  tooltip,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "green" | "gold" | "red";
  icon?: React.ReactNode;
  visual?: "icon" | "gauge" | "line" | "bars" | "target";
  /** 0-100. When `visual="gauge"`, controls how much of the ring is filled.
   *  100 = full circle, 0 = empty ring. Defaults to 0 (empty) if not provided. */
  gaugeFillPct?: number;
  tooltip: string;
}) => {
  const valueColor =
    tone === "green" ? "text-[#3BC76E]" : tone === "red" ? "text-[#EF4444]" : "text-[#F2C85F]";

  const gaugeEndDeg = Math.max(0, Math.min(360, (gaugeFillPct ?? 0) * 3.6));

  return (
    <div className={`${JOURNAL_PANEL} min-h-[94px] px-4 py-3`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_50%,rgba(255,255,255,0.035),transparent_32%)]" />
      <div className="relative grid h-full grid-cols-[minmax(0,1fr)_66px] items-center gap-3">
        <div className="min-w-0 pr-1">
          <div className="mb-2 flex min-w-0 items-center gap-1.5">
            <span className="truncate whitespace-nowrap text-[11px] font-semibold text-white/82">{label}</span>
            <JournalInfoIcon label={tooltip} className="h-3 w-3" />
          </div>
          <div className={`max-w-full whitespace-nowrap font-sans text-[clamp(22px,1.55vw,28px)] font-semibold leading-none tracking-normal tabular-nums ${valueColor}`}>
            {value}
          </div>
          {hint && (
            <div className="mt-2 max-w-full break-words text-[11px] font-medium leading-snug text-white/72">{hint}</div>
          )}
        </div>

        {visual === "icon" && (
          <div className="ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.035] text-[#E8C766]">
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
                  `conic-gradient(from 210deg, #F2C85F 0deg, #F2C85F ${gaugeEndDeg}deg, transparent ${gaugeEndDeg}deg, transparent 360deg)`,
                mask: "radial-gradient(circle, transparent 54%, #000 56%)",
                WebkitMask: "radial-gradient(circle, transparent 54%, #000 56%)",
              }}
            />
          </div>
        )}
        {(visual === "line" || visual === "bars" || visual === "target") && (
          <div className="ml-auto flex w-[66px] justify-end overflow-hidden">
            {visual === "line" && <KpiSparkline type="line" />}
            {visual === "bars" && <KpiSparkline type="bars" />}
            {visual === "target" && <KpiSparkline type="target" />}
          </div>
        )}
      </div>
    </div>
  );
});
JournalKpiCard.displayName = "JournalKpiCard";

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

const TradeTimePerformanceChart = React.memo(({
  data,
  trades = [],
  unit = '$',
}: {
  data: DataPoint[];
  trades?: TradeForRAgg[];
  unit?: '$' | 'R';
}) => {
  // Build R-based display points when unit === 'R'
  const displayPoints = React.useMemo(() => {
    if (unit !== 'R') return data;
    // Re-derive from trades: filter those with open_at, sort by time, compute R
    type RPoint = { time: string; value: number; isProfit: boolean };
    const pts: RPoint[] = [];
    for (const trade of trades) {
      // open_at comes via the DashboardStats Trade shape (string field)
      const openAt = (trade as unknown as { open_at?: string | null }).open_at;
      if (!openAt) continue;
      const r = tradeR(trade);
      if (r === null) continue;
      pts.push({
        time: new Date(openAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        value: r,
        isProfit: r >= 0,
      });
    }
    return pts.sort((a, b) => a.time.localeCompare(b.time));
  }, [data, trades, unit]);

  if (!displayPoints || displayPoints.length === 0) {
    return (
      <div
        className="flex h-[218px] items-center justify-center rounded-[12px] border border-white/[0.06] bg-black/10"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
        }}
      >
        <p className="text-[#666666] text-sm">No trade time data available</p>
      </div>
    );
  }

  // ✅ DYNAMIC: Calculate max value from actual data
  const minValue = Math.min(...displayPoints.map(d => d.value), 0);
  const maxPositive = Math.max(...displayPoints.map(d => d.value), 0);

  // ✅ Calculate scale range (symmetric around zero for better visualization)
  const scaleMax = Math.max(Math.abs(minValue), Math.abs(maxPositive)) * 1.1 || 1;

  const fmtLabel = (v: number) =>
    unit === 'R'
      ? `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(1)}R`
      : `$${Math.round(Math.abs(v))}`;

  return (
    <div
      className="rounded-[12px] border border-white/[0.06] bg-black/10 p-0"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-medium text-white/82">
            By Time
          </h3>
          <JournalInfoIcon
            label="Shows each trade by its opening time, so you can see which hours produce your strongest and weakest P&L."
            className="h-4 w-4"
          />
        </div>
        <div className="text-xs text-[#666666]">
          {displayPoints.length} trades
        </div>
      </div>

      <div className="relative h-[168px] w-full">
        {/* Y-axis labels - DYNAMIC based on data */}
        <div className="absolute left-0 top-2 bottom-10 flex flex-col justify-between text-[10px] text-[#666666] pr-2 w-12 text-right">
          <span>{fmtLabel(scaleMax)}</span>
          <span>{fmtLabel(scaleMax * 0.75)}</span>
          <span>{fmtLabel(scaleMax * 0.5)}</span>
          <span>{fmtLabel(scaleMax * 0.25)}</span>
          <span className="text-white/60">{unit === 'R' ? '0R' : '$0'}</span>
          <span>-{fmtLabel(scaleMax * 0.25)}</span>
          <span>-{fmtLabel(scaleMax * 0.5)}</span>
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
            {displayPoints.map((point, i) => {
              // ✅ X: 3% padding on each side
              const xPadding = 3;
              const x = xPadding + ((i / Math.max(displayPoints.length - 1, 1)) * (100 - xPadding * 2));

              // ✅ Y: Dynamic scaling based on actual value and scaleMax
              const yPercent = (point.value / scaleMax) * 43; // 43% max for padding
              const y = 50 - yPercent;

              const tooltipVal = unit === 'R'
                ? `${point.value >= 0 ? '+' : ''}${point.value.toFixed(1)}R`
                : `${point.value >= 0 ? '+' : ''}$${point.value.toFixed(2)}`;

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
                    <title>{`${point.time}: ${tooltipVal}`}</title>
                  </circle>
                </g>
              );
            })}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-14 right-2 bottom-0 flex justify-between text-[10px] text-[#666666]">
          {displayPoints.filter((_, i) => i % Math.ceil(displayPoints.length / 6) === 0).map((point, i) => (
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
  trades = [],
  unit = '$',
  isLocked = false,
}: {
  data: DataPoint[];
  trades?: TradeForRAgg[];
  unit?: '$' | 'R';
  isLocked?: boolean;
}) => {
  // Build R-based display points when unit === 'R'
  const displayPoints = React.useMemo(() => {
    if (unit !== 'R') return data;
    type RPoint = { duration: string; value: number; isProfit: boolean; sortKey: number };
    const pts: RPoint[] = [];
    for (const trade of trades) {
      const t = trade as unknown as { open_at?: string | null; close_at?: string | null };
      if (!t.open_at || !t.close_at) continue;
      const r = tradeR(trade);
      if (r === null) continue;
      const durationMinutes = Math.max(
        0,
        Math.round((new Date(t.close_at).getTime() - new Date(t.open_at).getTime()) / 60000)
      );
      let durationStr: string;
      if (durationMinutes < 60) {
        durationStr = `${durationMinutes}m`;
      } else if (durationMinutes < 1440) {
        const hours = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        durationStr = `${hours}h:${mins}m`;
      } else {
        const days = Math.floor(durationMinutes / 1440);
        const hours = Math.floor((durationMinutes % 1440) / 60);
        durationStr = `${days}d:${hours}h`;
      }
      pts.push({ duration: durationStr, value: r, isProfit: r >= 0, sortKey: durationMinutes });
    }
    return pts.sort((a, b) => a.sortKey - b.sortKey);
  }, [data, trades, unit]);

  const maxValue = Math.max(...displayPoints.map(d => Math.abs(d.value)), 1);
  
  // ✅ LOCKED STATE FOR FREE USERS OR USERS WITHOUT SNAPTRADE
  if (isLocked) {
    return (
      <div 
        className="relative overflow-hidden rounded-[12px] border border-white/[0.06] bg-black/10 p-0"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)'
        }}
      >
        {/* Header */}
        <div className="relative z-10 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-medium text-white/82">
              By Duration
            </h3>
            <JournalInfoIcon
              label="Shows trade P&L by how long each trade was open. Unlocks when duration data is available from connected broker trades."
              className="h-4 w-4"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-lg px-3 py-1.5">
            <Lock className="w-3.5 h-3.5 text-[#C9A646]" />
            <span className="text-[10px] text-[#C9A646] font-semibold uppercase tracking-wider">
              Paid Feature
            </span>
          </div>
        </div>

        {/* Blurred Preview Chart */}
        <div className="relative h-[168px] w-full blur-[3px] opacity-30">
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
      className="rounded-[12px] border border-white/[0.06] bg-black/10 p-0"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-medium text-white/82">
            By Duration
          </h3>
          <JournalInfoIcon
            label="Shows trade P&L by holding time, helping identify whether quick trades or longer holds perform better."
            className="h-4 w-4"
          />
        </div>
      </div>

      <div className="relative h-[168px] w-full">
        <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-[#666666] pr-2">
          {unit === 'R' ? (
            <>
              <span>+{maxValue.toFixed(1)}R</span>
              <span>+{(maxValue * 0.75).toFixed(1)}R</span>
              <span>+{(maxValue * 0.5).toFixed(1)}R</span>
              <span>+{(maxValue * 0.25).toFixed(1)}R</span>
              <span>0R</span>
              <span>-{(maxValue * 0.25).toFixed(1)}R</span>
              <span>-{(maxValue * 0.5).toFixed(1)}R</span>
            </>
          ) : (
            <>
              <span>${maxValue.toFixed(0)}</span>
              <span>${(maxValue * 0.75).toFixed(0)}</span>
              <span>${(maxValue * 0.5).toFixed(0)}</span>
              <span>${(maxValue * 0.25).toFixed(0)}</span>
              <span>$0</span>
              <span>-${(maxValue * 0.25).toFixed(0)}</span>
              <span>-${(maxValue * 0.5).toFixed(0)}</span>
            </>
          )}
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

            {displayPoints.map((point, i) => {
              const x = (i / Math.max(displayPoints.length - 1, 1)) * 100;
              const y = 50 - (point.value / maxValue) * 50;
              const tooltipVal = unit === 'R'
                ? `${point.value >= 0 ? '+' : ''}${point.value.toFixed(1)}R`
                : `$${point.value.toFixed(2)}`;

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
                  <title>{`${point.duration}: ${tooltipVal}`}</title>
                </circle>
              );
            })}
          </svg>
        </div>

        <div className="absolute left-12 right-0 bottom-0 flex justify-between text-[10px] text-[#666666]">
          {displayPoints.filter((_, i) => i % Math.ceil(displayPoints.length / 8) === 0).map((point, i) => (
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

  const cardBase = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
    boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* BEST TRADE */}
      <div
        className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] group animate-fadeIn"
        style={{ ...cardBase, border: '1px solid rgba(74,210,149,0.2)' }}
      >
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: 'rgba(74,210,149,0.12)', filter: 'blur(28px)' }} />
        <div className="absolute bottom-0 left-4 right-4 h-px opacity-40 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, #4AD295, transparent)' }} />

        <div className="relative p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp className="w-4 h-4 text-[#4AD295]" />
            <span className="text-[10px] text-[#4AD295] font-semibold uppercase tracking-widest">
              Best Trade
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold tracking-tight text-[#4AD295]" style={{ letterSpacing: '-0.02em' }}>
              {formatCurrency(stats.bestTrade.pnl)}
            </span>
            {stats.bestTrade.rr && (
              <span className="text-sm text-[#4AD295]/70 font-light">
                ({stats.bestTrade.rr.toFixed(1)}R)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {stats.bestTrade.session && (
              <span className={`px-2 py-0.5 rounded text-xs ${getSessionColor(stats.bestTrade.session)}`}>
                {formatSessionDisplay(stats.bestTrade.session)}
              </span>
            )}
            <span className="text-[10px] font-medium" style={{ color: '#5A5A5A' }}>
              {stats.bestTrade.symbol} • {formatTradeDate(stats.bestTrade.open_at, timezone)}
            </span>
          </div>
        </div>
      </div>

      {/* WORST TRADE */}
      <div
        className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] group animate-fadeIn"
        style={{ ...cardBase, border: '1px solid rgba(227,99,99,0.2)' }}
      >
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: 'rgba(227,99,99,0.12)', filter: 'blur(28px)' }} />
        <div className="absolute bottom-0 left-4 right-4 h-px opacity-40 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, #E36363, transparent)' }} />

        <div className="relative p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingDown className="w-4 h-4 text-[#E36363]" />
            <span className="text-[10px] text-[#E36363] font-semibold uppercase tracking-widest">
              Worst Trade
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold tracking-tight text-[#E36363]" style={{ letterSpacing: '-0.02em' }}>
              {formatCurrency(stats.worstTrade.pnl)}
            </span>
            {stats.worstTrade.rr && (
              <span className="text-sm text-[#E36363]/70 font-light">
                ({stats.worstTrade.rr.toFixed(1)}R)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {stats.worstTrade.session && (
              <span className={`px-2 py-0.5 rounded text-xs ${getSessionColor(stats.worstTrade.session)}`}>
                {formatSessionDisplay(stats.worstTrade.session)}
              </span>
            )}
            <span className="text-[10px] font-medium" style={{ color: '#5A5A5A' }}>
              {stats.worstTrade.symbol} • {formatTradeDate(stats.worstTrade.open_at, timezone)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
BestWorstTrades.displayName = 'BestWorstTrades';

const AIInsight = React.memo(({
  stats,
  onViewReport,
}: {
  stats: DashboardStats;
  onViewReport: () => void;
}) => {
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
    <div className={`${JOURNAL_PANEL} grid min-h-[74px] items-center gap-4 px-6 py-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]`}>
      <div className="flex min-w-0 items-center gap-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C9A646]/18 bg-[#C9A646]/10 text-[#E8C766] shadow-[0_0_26px_rgba(201,166,70,0.18)]">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="mb-1.5 text-[14px] font-semibold text-[#E8C766]">
            AI Insight
          </div>
          <div className="text-[13px] leading-relaxed text-white/78">
            {insight}
          </div>
        </div>
      </div>
      <button
        onClick={onViewReport}
        className="justify-self-center flex min-w-[180px] items-center justify-center gap-2 rounded-[12px] border border-[#C9A646]/18 bg-[#C9A646]/10 px-6 py-3 text-[12px] font-semibold text-[#E8C766] transition-colors hover:border-[#C9A646]/35 hover:bg-[#C9A646]/16"
      >
        View Full Report
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
      <div className="hidden sm:block" aria-hidden="true" />
    </div>
  );
});
AIInsight.displayName = 'AIInsight';

// ================================================
// DASHBOARD DATE RANGE PICKER
// ================================================

const DASH_PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'ALL', days: null },
] as const;

const DashboardDatePicker = React.memo(({ 
  startDate, 
  endDate, 
  onChange 
}: { 
  startDate: Date | null; 
  endDate: Date | null; 
  onChange: (start: Date | null, end: Date | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const activePreset = useMemo(() => {
    if (!startDate && !endDate) return 'ALL';
    if (startDate && endDate) {
      const days = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
      if (days === 6) return '7D';
      if (days === 29) return '30D';
      if (days === 89) return '90D';
    }
    return null;
  }, [startDate, endDate]);

  function applyPreset(days: number | null) {
    if (days === null) {
      onChange(null, null);
    } else {
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const start = new Date(); start.setDate(start.getDate() - (days - 1)); start.setHours(0, 0, 0, 0);
      onChange(start, end);
    }
    setOpen(false);
  }

  function handleDayClick(date: Date) {
    if (selecting === 'start') {
      onChange(date, null);
      setSelecting('end');
    } else {
      if (startDate && date < startDate) {
        onChange(date, startDate);
      } else {
        onChange(startDate, date);
      }
      setSelecting('start');
      setOpen(false);
    }
  }

  const calDays = useMemo(() => {
    const year = pickerMonth.getFullYear();
    const month = pickerMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [pickerMonth]);

  const formatLabel = () => {
    if (!startDate && !endDate) return 'All Time';
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
    if (startDate) return `${fmt(startDate)} → today`;
    return 'All Time';
  };

  const isSelected = (d: Date) =>
    (startDate && d.toDateString() === startDate.toDateString()) ||
    (endDate && d.toDateString() === endDate.toDateString()) || false;

  const inRange = (d: Date) => {
    const lo = startDate;
    const hi = endDate || hoverDate;
    if (!lo || !hi) return false;
    return d > lo && d < hi;
  };

  const hasFilter = !!(startDate || endDate);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex h-10 items-center gap-2 rounded-[12px] border px-4 text-[11px] font-medium transition-all duration-200"
        style={{
          background: hasFilter ? 'rgba(201,166,70,0.10)' : 'rgba(12,12,12,0.72)',
          borderColor: hasFilter ? 'rgba(201,166,70,0.35)' : 'rgba(255,255,255,0.12)',
          color: hasFilter ? '#E8C766' : 'rgba(255,255,255,0.82)',
        }}
      >
        <CalendarRange className="w-4 h-4" />
        {formatLabel()}
        <ChevronRight className="h-3.5 w-3.5 rotate-90 text-white/48" />
        {hasFilter && (
          <span
            className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
            onClick={e => { e.stopPropagation(); onChange(null, null); setSelecting('start'); }}
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-14 z-50 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: 'rgba(14,14,14,0.98)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            minWidth: 300,
          }}
        >
          {/* Presets */}
          <div className="flex gap-2 p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {DASH_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.days)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: activePreset === p.label
                    ? 'linear-gradient(135deg, #C9A646, #B48C2C)'
                    : 'rgba(255,255,255,0.05)',
                  color: activePreset === p.label ? '#000' : '#EAEAEA',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <button onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))}>
              <ChevronLeft className="w-4 h-4 text-zinc-400 hover:text-white transition-colors" />
            </button>
            <span className="text-sm font-semibold text-[#EAEAEA]">
              {pickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))}>
              <ChevronRight className="w-4 h-4 text-zinc-400 hover:text-white transition-colors" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 px-3 pb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-[#6A6A6A]">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {calDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const sel = isSelected(day);
              const inR = inRange(day);
              const today = day.toDateString() === new Date().toDateString();
              const future = day > new Date();
              return (
                <button
                  key={i}
                  disabled={future}
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => selecting === 'end' && setHoverDate(day)}
                  onMouseLeave={() => setHoverDate(null)}
                  className="h-8 flex items-center justify-center text-xs font-medium rounded-lg transition-all"
                  style={{
                    background: sel
                      ? 'linear-gradient(135deg, #C9A646, #B48C2C)'
                      : inR ? 'rgba(201,166,70,0.15)' : 'transparent',
                    color: sel ? '#000' : future ? '#3A3A3A' : today ? '#C9A646' : '#EAEAEA',
                    cursor: future ? 'not-allowed' : 'pointer',
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="px-4 pb-3 text-center text-xs text-[#6A6A6A]">
            {selecting === 'start' ? 'Select start date' : 'Select end date'}
          </div>
        </div>
      )}
    </div>
  );
});
DashboardDatePicker.displayName = 'DashboardDatePicker';

// ================================================
// MAIN DASHBOARD COMPONENT
// ================================================

interface JournalOverviewProps {
  overrideUserId?: string;
  readOnly?: boolean;
}

function JournalOverviewContent({ overrideUserId, readOnly = false }: JournalOverviewProps) {
  const navigate = useNavigate();
  
  // ✅ NEW: Timezone context
  const timezone = useTimezone();
  
  // ✅ NEW: Get user name from auth for personalized greeting
  const { user } = useAuth();
  // First name only for the welcome greeting. Prefer the explicit first_name
  // captured at registration; otherwise take the first token of any full name,
  // then fall back to the email handle.
  const displayName = useMemo(() => {
    const meta = user?.user_metadata;
    const firstName =
      meta?.first_name ||
      (meta?.display_name || meta?.full_name || meta?.name || '')
        .trim()
        .split(' ')[0] ||
      user?.email?.split('@')[0] ||
      'Trader';
    return firstName;
  }, [user]);
  
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [showReferModal, setShowReferModal] = useState(false);
  const [showSnapTradePopup, setShowSnapTradePopup] = useState(false);
  const [showTradovateModal, setShowTradovateModal] = useState(false);
  const [tradovateInitialStep, setTradovateInitialStep] = useState<'select-env' | 'manage'>('select-env');
  const [showManageConnections, setShowManageConnections] = useState(false);
  const [showBrokerPanel, setShowBrokerPanel] = useState(false);
  const [showBrokerPicker, setShowBrokerPicker] = useState(false);
  const { syncStatus, hasAnyConnection, credentials, reconnect } = useTradovate();
  const {
    portfolios,
    activePortfolio,
    activePortfolioId,
    effectivePortfolioId,
    effectivePortfolioIds,
    setActivePortfolioId,
    hasMultiplePortfolios,
    isTraderMode,
    isShowingAll,
    hiddenPortfolioIds,
  } = usePortfolioContext();
  const { traderMode } = useTraderMode();
  const [showFreeUserTooltip, setShowFreeUserTooltip] = useState(false);
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [showBrokerUpgrade, setShowBrokerUpgrade] = useState(false);

  // F2.5: aggregate dot color for the compact "Connect Broker" button
  // (OQ-47 — global broker status indicator outside the popover).
  const { connections: allBrokerConnections, isLoading: brokersLoading, reconnect: brokerReconnect, syncNow: brokerSyncNow } = useBrokerConnections({ purpose: 'journal' });
  const brokerDotColor = aggregateStatusDotColor(allBrokerConnections);

  // 2026-05-19: queryClient pulled up here from its original location ~90
  // lines below. The Sync Trades useCallback (handleSyncAllTrades) below
  // references queryClient in its deps array, and the deps array is
  // evaluated at the call site of useCallback. Declaring queryClient AFTER
  // the useCallback put the const in TDZ at that evaluation point, which
  // surfaced in production as "Cannot access 'V' before initialization"
  // (V = minified queryClient) thrown from the JournalOverview render. The
  // ErrorBoundary caught it, the user saw "Something went wrong". The
  // typecheck didn't catch it because TypeScript doesn't model block-level
  // TDZ for const ordering; only the production bundle's evaluation order
  // surfaces it. See lesson:
  // .lessons/global/2026-05-19-pre-pr-build-and-cycle-validation.md
  const queryClient = useQueryClient();

  // 2026-05-18: manual Sync Trades button. Fires syncNow on every active
  // Tradovate connection in parallel. Disabled while a sync is in flight to
  // prevent double-clicks producing duplicate edge-function invocations.
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  // NinjaTrader Web runs on Tradovate cloud (post-2022 acquisition), so both
  // brokers sync through the same edge function. See useTradovate.ts.
  const tradovateConnections = useMemo(
    () => allBrokerConnections.filter(c => (c.broker === 'tradovate' || c.broker === 'ninja_trader') && c.is_active),
    [allBrokerConnections],
  );
  const handleSyncAllTrades = useCallback(async () => {
    if (isSyncingAll) return;
    setIsSyncingAll(true);
    try {
      // When Tradovate connections exist, do a real broker sync first so the
      // user gets fresh fills. With no broker connected we still want the
      // button to do something useful — refetch the dashboard queries so any
      // server-side mutation (manual trades added in another tab, backfill
      // job that just finished) shows up. 2026-05-20: the button used to be
      // hidden behind `tradovateConnections.length > 0`, which made it invisible
      // for manual-only users; the dashboard then had no manual-refresh path.
      if (tradovateConnections.length > 0) {
        await Promise.all(tradovateConnections.map((c) => brokerSyncNow(c.id)));
      }
      // 2026-05-19: belt-and-suspenders refetch. useBrokerConnections.syncNow
      // already invalidates ['trades'] + ['dashboard'] on the React Query side,
      // but invalidate only marks stale — it doesn't guarantee an immediate
      // refetch when the data hasn't changed structurally. Force a real
      // network round trip here so the UI cannot show a stale snapshot after
      // the user explicitly asked to sync.
      await queryClient.refetchQueries({ queryKey: ['trades'] });
      await queryClient.refetchQueries({ queryKey: ['dashboard'] });
    } finally {
      setIsSyncingAll(false);
    }
  }, [isSyncingAll, tradovateConnections, brokerSyncNow, queryClient]);

  // Phase 1B.4 — surface degraded/canceled connections in the journal itself.
  // Resolves OQ-72: previously a user whose Tradovate session went degraded
  // (e.g. Vault read failure) had no in-journal path back. They sat in 24h
  // backoff silently until manually navigating to the broker popover.
  const degradedConnection = allBrokerConnections.find(
    (c) => c.status === 'degraded' || c.status === 'canceled',
  );
  const [reconnectModalOpen, setReconnectModalOpen] = useState(false);

  // Empty-state dismissal: once the user has explicitly engaged with either
  // empty-state CTA (added a trade manually OR opened the broker popup), we
  // never show the empty state again on returns to the dashboard — even if
  // they cancelled before actually saving anything. Persisted in localStorage
  // so the decision survives refreshes / new tabs on the same device.
  // 2026-05-19: hoisted above openAddBrokerPopup so the setter is initialized
  // before any closure references it. Even though the closure body runs on
  // click (post-init), the minifier could in principle inline it ahead of
  // the declaration, and the same byte-offset-shifting that caused our
  // earlier TDZ on V (= tradovateConnections) demonstrated that "closure-safe"
  // forward refs are still risky after minification. Match declaration order
  // to usage order to keep the bundle deterministic.
  const [emptyStateDismissed, setEmptyStateDismissed] = useState(
    () => typeof window !== 'undefined'
      && localStorage.getItem('finotaur_journal_empty_state_dismissed') === 'true',
  );

  // Hoisted above openAddBrokerPopup — isPremium is read in the callback body.
  // Matches the pattern documented above (emptyStateDismissed, queryClient):
  // declaration order must match usage order to avoid TDZ after minification.
  const { limits, loading: subscriptionLoading, isPremium } = useSubscription();

  const openAddBrokerPopup = useCallback(() => {
    // Engagement signal: ANY path that opens the AddBroker popup (header
    // "Connect Broker" → popover → "+ Add new connection", AccountFilterDropdown
    // manage, empty-state "Or connect Tradovate" link, etc.) counts as
    // "user has decided to act" → dismiss the empty state for good.
    setEmptyStateDismissed((prev) => {
      if (!prev) {
        localStorage.setItem('finotaur_journal_empty_state_dismissed', 'true');
      }
      return true;
    });
    // Gate: free/basic users may only have 1 active journal connection.
    if (!isPremium && allBrokerConnections.length >= 1) {
      setShowBrokerUpgrade(true);
      return;
    }
    setShowAddBroker(true);
  }, [isPremium, allBrokerConnections]);

  const handoffToAddBrokerPopup = useCallback(() => {
    setShowAddBroker(true);
    window.setTimeout(() => {
      setShowTradovateModal(false);
      setTradovateInitialStep('select-env');
    }, 90);
  }, []);

  const dismissEmptyStateOnce = useCallback(() => {
    if (!emptyStateDismissed) {
      localStorage.setItem('finotaur_journal_empty_state_dismissed', 'true');
      setEmptyStateDismissed(true);
    }
  }, [emptyStateDismissed]);

  const handleEmptyStateAddTrade = useCallback(() => {
    dismissEmptyStateOnce();
    navigate('/app/journal/new');
  }, [dismissEmptyStateOnce, navigate]);

  const handleEmptyStateConnectBroker = useCallback(() => {
    dismissEmptyStateOnce();
    openAddBrokerPopup();
  }, [dismissEmptyStateOnce, openAddBrokerPopup]);

  const brokerPanelRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (brokerPanelRef.current && !brokerPanelRef.current.contains(e.target as Node)) {
        setShowBrokerPanel(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const { id: fallbackUserId, isImpersonating, isMentorView } = useEffectiveUser();
  const { studentName, studentEmail } = useMentorView();
  const userId = overrideUserId ?? fallbackUserId;
  // Mentor View browses a student's journal read-only. Treat it like the prop.
  const effectiveReadOnly = readOnly || isMentorView;
  const bypassPortfolioFilter = !!overrideUserId || isMentorView;
  // queryClient hoisted ~90 lines up to fix TDZ in handleSyncAllTrades deps.

  // OAuth return handler — invalidate stale caches so newly-connected accounts
  // appear immediately without a manual page refresh.
  // The edge function redirects to /app/journal/overview?oauth_status=connected&broker=<name>
  // after a successful broker OAuth flow. We read the param here, invalidate
  // all broker/portfolio/trade caches, show a success toast, then strip the
  // params so a manual refresh does not re-trigger.
  // When the server blocks a 2nd-broker attempt for non-premium users it
  // redirects to ?oauth_error=upgrade_required_for_multiple_brokers — we open
  // the UpgradeLimitDialog for that specific error value.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('oauth_error');
    if (oauthError === 'upgrade_required_for_multiple_brokers') {
      setShowBrokerUpgrade(true);
      // Strip the param so a manual refresh does not re-open the dialog.
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    const oauthStatus = params.get('oauth_status');
    if (oauthStatus !== 'connected') return;
    // Wait until userId resolves before invalidating per-user query keys.
    if (!userId) return;

    const rawBroker = params.get('broker') ?? '';
    const brokerLabel = rawBroker
      ? rawBroker.charAt(0).toUpperCase() + rawBroker.slice(1)
      : 'Broker';

    // Strip the OAuth params up-front so a manual refresh never re-triggers.
    window.history.replaceState(null, '', window.location.pathname);
    toast.success(`${brokerLabel} connected — syncing your accounts…`);

    // The server writes the broker_connections row asynchronously AFTER this
    // redirect (hence the "syncing…" copy). A single invalidate is a race: the
    // row may not exist yet, the popover may be closed, and with
    // refetchOnMount:false a stale cache would not refetch on open — so the new
    // connection would not appear until a manual page refresh. Instead we poll:
    // force a real refetch every few seconds until an active journal connection
    // lands (or we hit the cap). refetchQueries refreshes inactive queries too,
    // and combined with the useTimedQuery timeout it also recovers from a
    // request that hung during the post-OAuth token settle.
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const MAX_ATTEMPTS = 10;   // ~25s ceiling
    const INTERVAL_MS = 2500;

    const hasActiveConnection = () =>
      queryClient
        .getQueriesData<unknown>({ queryKey: ['broker_connections', userId] })
        .some(([, data]) => Array.isArray(data) && data.some((c: any) => c?.is_active));

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      await Promise.allSettled([
        queryClient.refetchQueries({ queryKey: ['broker_connections', userId] }),
        queryClient.refetchQueries({ queryKey: ['portfolios', userId] }),
        queryClient.invalidateQueries({ queryKey: ['tradovate_credentials', userId] }),
        queryClient.invalidateQueries({ queryKey: ['trades'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      if (cancelled) return;
      if (hasActiveConnection() || attempts >= MAX_ATTEMPTS) return;
      timer = setTimeout(tick, INTERVAL_MS);
    };
    timer = setTimeout(tick, 0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [userId, queryClient]);

  // Convert date range to days for useDashboardStats (null = ALL TIME)
  const dashboardDays = useMemo(() => {
    if (!dateStart && !dateEnd) return null; // ALL TIME
    if (dateStart && dateEnd) {
      return Math.max(1, Math.round((dateEnd.getTime() - dateStart.getTime()) / 86400000) + 1);
    }
    if (dateStart) {
      return Math.max(1, Math.round((Date.now() - dateStart.getTime()) / 86400000) + 1);
    }
    return 30;
  }, [dateStart, dateEnd]);
  
  const canUseSnapTrade = false; // disabled during SnapTrade removal (Phase A1)
  // When viewing another user's journal (mentor view), do not apply the
  // logged-in mentor's portfolio filter — show all of the student's data.
  const mentorPortfolioId = bypassPortfolioFilter ? undefined : effectivePortfolioId;
  const mentorPortfolioIds = bypassPortfolioFilter ? undefined : effectivePortfolioIds;
  const { data: stats, isLoading, error, refetch: refetchStats } = useDashboardStats(dashboardDays, userId, mentorPortfolioId, mentorPortfolioIds, isTraderMode, traderMode, (isShowingAll || isTraderMode) ? hiddenPortfolioIds : undefined);
  
  // 🔥 FIX v2: Listen for BOTH 'updated' AND 'invalidated' events on trades query
  // Covers: create, edit, delete from MyTrades + NewTrade page
  React.useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      if (event.query.queryKey[0] !== 'trades') return;
      
      // Trigger when trades data successfully updated (after create/edit/delete)
      if (event.query.state.status === 'success') {
        refetchStats();
      }
    });
    return unsubscribe;
  }, [queryClient, refetchStats]);
  const { importTrades: saveToSupabase } = useImportTrades();

  
  // ✅ NEW: Check if user is an affiliate
  const { isAffiliate, isLoading: affiliateLoading } = useIsAffiliate();
  
  const tier = useMemo(() => stats?.tier, [stats]);
  
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

  const expectancy = useMemo(() => {
    if (!stats || stats.closedTrades === 0) return 0;
    const winProbability = stats.winrate || 0;
    const lossProbability = 1 - winProbability;
    return (winProbability * (stats.avgWin || 0)) + (lossProbability * (stats.avgLoss || 0));
  }, [stats]);

  // Display-unit toggle ($ vs R)
  const { unit, setUnit } = useDisplayUnit();

  // Strategy config map — feeds percent-of-equity 1R resolution in aggregateR.
  const { data: strategyRConfigs } = useStrategyRConfigs(userId);

  const rAgg = useMemo(
    () => aggregateR(
      (stats?.trades ?? []) as unknown as import('@/utils/rAggregates').TradeForRAgg[],
      strategyRConfigs ?? null,
    ),
    [stats?.trades, strategyRConfigs],
  );

  // ✅ Check if Trade Duration chart should be locked
  // 2026-05-19: previous gate locked the chart for paid users whenever
  // tradeDurationData.length === 0 — which meant a brand-new paid account
  // with a connected broker but pending sync (or first-trade not yet closed)
  // saw a "Connect your broker to view this chart" lock screen even though
  // their broker was already connected. Misleading + dead-end UX. Now lock
  // is purely a tier gate (free → paid); empty-data paid users see the
  // unlocked chart with no points until trades close.
  const isDurationChartLocked = isFreeUser;
  
  // ✅ Determine where to send user when clicking upgrade
  const handleDurationUpgrade = useCallback(() => {
    if (isFreeUser) {
      // Free user → send to pricing page
      navigate('/app/upgrade');
    } else {
      // Paid user without connection → open the live Add-Broker popup
      // (the SnapTrade stub was removed in Phase A1 Step 2; this CTA used
      // to land on a maintenance message which blocked paying testers).
      openAddBrokerPopup();
    }
  }, [isFreeUser, navigate, openAddBrokerPopup]);
  
  const handleGeneratePDF = useCallback(() => {
    window.print();
  }, []);
  
  

  const handleBrokerPickerSelect = useCallback((broker: import('@/components/BrokerPickerModal').BrokerKey) => {
    setShowBrokerPicker(false);
    if (broker === 'tradovate') {
      setShowTradovateModal(true);
    }
    // future brokers: add more cases here
  }, []);

  const handleUpgradeFromTooltip = useCallback(() => {
    setShowFreeUserTooltip(false);
    navigate('/app/upgrade');
  }, [navigate]);

  // ✅ NEW: Handle import completion
const handleImportComplete = useCallback(async (trades: FinotaurTrade[]) => {
  const result = await saveToSupabase(trades);
  if (result.success) {
    await refetchStats();
  }
  return result;
}, [saveToSupabase, refetchStats]);
  
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
    <div className="min-h-screen bg-[#070808] text-white">
      <style>{ANIMATION_STYLES}</style>
      
      <div className="mx-auto max-w-[1360px] space-y-4 px-1 py-3 sm:px-3 lg:px-1">
        {/* ✅ UPDATED: Header with Import Button instead of Trader Tier */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="pt-0.5">
            <h1 className="text-[17px] font-semibold leading-tight tracking-normal text-white">
              {isMentorView
                ? <>You're watching {studentName || studentEmail || 'student'} with Mentor Mode 👁️</>
                : <span className="inline-flex items-center gap-1.5 flex-wrap">
                    Welcome back, {displayName.charAt(0).toUpperCase() + displayName.slice(1)} 👋
                    <UserStatusBadges />
                  </span>}
            </h1>
            <p className="mt-2 text-[11px] text-white/62">
              {isMentorView ? "Read-only view of this student's journal" : "Here's your performance overview"}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {isImpersonating && (
              <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-2">
                <Crown className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 text-sm font-medium">Admin View</span>
              </div>
            )}

            <DashboardDatePicker
              startDate={dateStart}
              endDate={dateEnd}
              onChange={(s, e) => { setDateStart(s); setDateEnd(e); }}
            />

            <AccountFilterDropdown
              onManage={() => setShowManageConnections(true)}
            />

            {/* ✅ Broker Status Button — visible to all, opens account panel */}
            {canUseSnapTrade && (
              <div className="relative">
                <button
                  onClick={() => setShowBrokerPanel(v => !v)}
                  className={`flex items-center gap-2.5 border rounded-[12px] px-4 py-2.5 transition-all duration-300 group relative overflow-hidden ${
                    syncStatus.type === 'connected'
                      ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border-emerald-500/30 hover:border-emerald-500/50'
                      : syncStatus.type === 'error'
                      ? 'bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/30 hover:border-red-500/50'
                      : 'bg-gradient-to-r from-[#1A1A1A] to-[#242424] border-[#C9A646]/20 hover:border-[#C9A646]/40'
                  }`}
                >
                  {syncStatus.type === 'connected' ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <div className="text-left">
                        <div className="text-[10px] text-emerald-500/70 uppercase tracking-wider leading-none">
                          {credentials[0]?.connection_label || 'Tradovate'}
                        </div>
                        <div className="text-emerald-400 text-sm font-medium leading-tight">{syncStatus.label}</div>
                      </div>
                      <span className="text-[10px] text-emerald-500/50 ml-1">
                        {credentials.length} acct{credentials.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  ) : syncStatus.type === 'error' ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <div className="text-left">
                        <div className="text-[10px] text-red-500/70 uppercase tracking-wider leading-none">Tradovate</div>
                        <div className="text-red-400 text-sm font-medium leading-tight">Sync Error</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 text-[#C9A646] group-hover:rotate-45 transition-transform duration-300" />
                      <div className="text-left">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider leading-none">Tradovate</div>
                        <div className="text-[#C9A646] text-sm font-medium leading-tight">Connect Broker</div>
                      </div>
                    </>
                  )}
                </button>

                {/* Dropdown Panel */}
                {showBrokerPanel && (
                  <div
                    className="absolute right-0 top-14 z-50 w-72 rounded-2xl shadow-2xl overflow-hidden"
                    style={{
                      background: 'rgba(14,14,14,0.98)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Connected Accounts</span>
                      <button
                        onClick={() => { setShowBrokerPanel(false); setShowBrokerPicker(true); }}
                        className="flex items-center gap-1.5 text-[10px] text-[#C9A646] hover:text-[#E5C158] transition-colors font-medium"
                      >
                        <Link2 className="w-3 h-3" />
                        Add Account
                      </button>
                    </div>

                    {/* Account List — AccountSwitcher handles ALL grouping */}
                    <div className="p-2 max-h-72 overflow-y-auto custom-scrollbar">
                      <AccountSwitcher />
                      
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-3 border-t border-zinc-800/60 flex items-center gap-2">
                      {/* + Add new connection */}
                      <button
                        onClick={() => { setShowBrokerPanel(false); setShowBrokerPicker(true); }}
                        className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#C9A646]/10 hover:bg-[#C9A646]/20 text-[#C9A646] transition-all border border-[#C9A646]/20 flex-shrink-0"
                        title="Add account"
                      >
                        <span className="text-base font-bold leading-none">+</span>
                      </button>
                      {/* Manage existing connections */}
                      <button
                        onClick={() => { setShowBrokerPanel(false); setShowManageConnections(true); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 hover:text-white text-xs font-medium transition-all border border-zinc-700/40"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Manage Connections
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            

            {/* F2.5: Connect Broker — compact, opens BrokerConnectionsPopover.
                The Popover handles the connections list + "+ Add new connection"
                CTA, which calls openAddBrokerPopup to open the pre-mounted AddBrokerPopup. */}
            <BrokerConnectionsPopover
              onAddConnection={openAddBrokerPopup}
              onManage={() => setShowManageConnections(true)}
            >
              <Button
                variant="goldOutline"
                size="compact"
                className="h-10 gap-2 border-[#C9A646]/80 px-5 text-[11px] text-white shadow-[0_0_18px_rgba(201,166,70,0.12)] hover:border-[#E8C766] hover:text-[#E8C766]"
                aria-label="Connect Broker"
              >
                <Link2 className="w-3.5 h-3.5" />
                Connect Broker
                {brokerDotColor && (
                  <span
                    className={`ml-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-[#0A0A0A] ${
                      brokerDotColor === 'red'
                        ? 'bg-[#E36363]'
                        : brokerDotColor === 'yellow'
                        ? 'bg-[#C9A646]'
                        : 'bg-[#4AD295]'
                    }`}
                    aria-label={`Broker status: ${brokerDotColor}`}
                  />
                )}
              </Button>
            </BrokerConnectionsPopover>

            {/* 2026-05-18: Sync Trades — fires tradovate-sync edge function for every
                active Tradovate connection in parallel. Hidden when there are no
                Tradovate connections (manual-only users). Spinner animates while
                in flight; toast feedback comes from useBrokerConnections.syncNow.
                2026-05-19: icon-only per UX feedback. Square h-10 w-10 with
                centered icon. Tooltip via title attribute on hover. */}
            {/* 2026-05-20: unconditional refresh button. With a Tradovate
                connection it triggers a broker sync; without one it still
                refetches trades + dashboard queries so the user always has a
                manual way to force-refresh the page data. */}
            {!effectiveReadOnly && (
              <Button
                onClick={handleSyncAllTrades}
                disabled={isSyncingAll}
                variant="goldOutline"
                size="compact"
                className="h-10 w-10 shrink-0 border-[#C9A646]/80 p-0 text-white shadow-[0_0_18px_rgba(201,166,70,0.12)] hover:border-[#E8C766] hover:text-[#E8C766] disabled:opacity-60"
                aria-label={
                  isSyncingAll
                    ? 'Refreshing'
                    : tradovateConnections.length > 0
                      ? 'Sync Trades'
                      : 'Refresh Dashboard'
                }
                title={
                  isSyncingAll
                    ? 'Refreshing…'
                    : tradovateConnections.length > 0
                      ? 'Sync Trades'
                      : 'Refresh Dashboard'
                }
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
              </Button>
            )}

            {/* Display-unit toggle: $ | R — premium inset gold pill */}
            <div
              role="group"
              aria-label="Display unit"
              className="flex h-10 items-center gap-1 rounded-[12px] border border-gold-primary/30 bg-surface-base p-1"
            >
              {(['$', 'R'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  aria-pressed={unit === u}
                  className={`flex h-full w-9 items-center justify-center rounded-[8px] text-[13px] font-semibold tabular-nums transition-all duration-base ease-out ${
                    unit === u
                      ? 'bg-gradient-gold text-black shadow-glow-gold-resting'
                      : 'text-ink-secondary hover:text-ink-primary hover:bg-white/5'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>

            {/* F2.5: Import Trades — compact (handler unchanged) */}
            {!effectiveReadOnly && (
              <Button
                onClick={() => setShowImportPopup(true)}
                variant="gold"
                size="compact"
                className="h-10 gap-2 px-6 text-[12px]"
                aria-label="Import Trades"
                showArrow={false}
              >
                <PlusSquare className="w-3.5 h-3.5" />
                Import Trades
              </Button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map(i => <CardSkeleton key={i} />)}
          </div>
        )}

        {/* Phase 1B.4 — Reconnect CTA for degraded / canceled broker connections.
            Hidden in mentor/read-only view — mentor cannot act on student's broker. */}
        {!effectiveReadOnly && !brokersLoading && degradedConnection && (
          <div className="rounded-2xl border border-[#E36363]/30 bg-[#E36363]/8 px-5 py-4 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E36363]/15 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-[#E36363]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {degradedConnection.connection_name ?? degradedConnection.broker ?? 'Broker'} connection needs attention
                </p>
                <p className="text-xs text-[#A0A0A0] mt-0.5">
                  {`We couldn't refresh your ${degradedConnection.connection_name ?? degradedConnection.broker ?? 'broker'} connection. Reconnect to keep your trades syncing.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setReconnectModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#C9A646] text-black text-sm font-semibold hover:bg-[#D4B255] transition-colors whitespace-nowrap"
            >
              Reconnect now
            </button>
          </div>
        )}

        {!effectiveReadOnly
          && !brokersLoading
          && allBrokerConnections.length === 0
          && !emptyStateDismissed
          && (!stats || !stats.trades || stats.trades.length === 0) && (
          <JournalEmptyState
            variant="no-broker"
            onAddManualTrade={handleEmptyStateAddTrade}
            onConnectBroker={handleEmptyStateConnectBroker}
          />
        )}

        {stats && (allBrokerConnections.length > 0 || (stats.trades && stats.trades.length > 0) || emptyStateDismissed) && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <JournalKpiCard
                label={unit === 'R' ? "Net R" : "Net P&L"}
                value={unit === 'R' ? formatR(rAgg.totalR) : formatCurrency(stats.netPnl)}
                hint={`${stats.closedTrades} closed trades`}
                tone={
                  unit === 'R'
                    ? (rAgg.totalR >= 0 ? "green" : "red")
                    : (stats.netPnl >= 0 ? "green" : "red")
                }
                icon={<TrendingUp className="h-8 w-8" strokeWidth={2} />}
                tooltip={
                  unit === 'R'
                    ? "Total realized R across all closed trades in the selected date range."
                    : "Total profit or loss from all closed trades in the selected date range."
                }
              />

              <JournalKpiCard
                label="Win Rate"
                value={formatPercentage(stats.winrate)}
                hint={`${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE`}
                tone="gold"
                visual="gauge"
                gaugeFillPct={(stats.winrate ?? 0) * 100}
                tooltip="The percentage of closed trades that ended profitable, excluding open trades."
              />

              <JournalKpiCard
                label="Profit Factor"
                value={
                  stats.profitFactor != null && !isNaN(stats.profitFactor) && isFinite(stats.profitFactor)
                    ? stats.profitFactor.toFixed(2)
                    : "—"
                }
                tone={stats.profitFactor > 1 ? "green" : "red"}
                visual="line"
                tooltip="Gross profit divided by gross loss. Above 1.00 means total winners are larger than total losers."
              />

              <JournalKpiCard
                label="Avg Win / Loss"
                value={
                  stats.avgWin !== 0 && stats.avgLoss !== 0
                    ? `${(stats.avgWin / Math.abs(stats.avgLoss)).toFixed(2)}`
                    : "—"
                }
                hint={
                  unit === 'R'
                    ? `${formatR(rAgg.avgWinR)} / ${formatRMag(rAgg.avgLossR)}`
                    : `${formatSignedCurrency(stats.avgWin || 0)} / ${formatPlainCurrency(stats.avgLoss || 0)}`
                }
                tone="gold"
                visual="bars"
                tooltip="Average winning trade compared with average losing trade. Higher means winners are larger relative to losses."
              />

              <JournalKpiCard
                label="Expectancy"
                value={
                  unit === 'R'
                    ? formatR(rAgg.expectancyR)
                    : formatSignedCurrency(expectancy)
                }
                hint="Per Trade"
                tone={
                  unit === 'R'
                    ? ((rAgg.expectancyR ?? 0) >= 0 ? "green" : "red")
                    : (expectancy >= 0 ? "green" : "red")
                }
                visual="target"
                tooltip={
                  unit === 'R'
                    ? "Estimated average R per trade based on win rate, average win R, and average loss R."
                    : "Estimated average P&L per trade based on win rate, average win, and average loss."
                }
              />

            </div>

            {/* R-mode excluded-trades note */}
            {unit === 'R' && rAgg.excludedNoRiskCount > 0 && (
              <p className="mt-1 text-[11px] text-white/36 text-right">
                {rAgg.excludedNoRiskCount} trade{rAgg.excludedNoRiskCount !== 1 ? 's' : ''} excluded — no risk basis
              </p>
            )}

            {/* ✅ UPDATED: Best/Worst trades with timezone and session */}
            

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <ErrorBoundary fallback={
              <div className="text-center text-[#E36363] p-6 bg-[#1A1A1A] rounded-[20px]">
                Failed to load FINO Score.
              </div>
            }>
              <Suspense fallback={<ChartSkeleton />}>
                <FinoScore stats={stats} />
              </Suspense>
            </ErrorBoundary>

            <ErrorBoundary fallback={
              <div className="text-center text-[#E36363] p-6 bg-[#1A1A1A] rounded-[20px]">
                Failed to load chart. Please refresh the page.
              </div>
            }>
              <Suspense fallback={<ChartSkeleton />}>
                <DailyPnLChart data={stats.equitySeries || []} trades={stats.trades || []} unit={unit} />
              </Suspense>
            </ErrorBoundary>

            <ErrorBoundary fallback={
              <div className="text-center text-[#E36363] p-6 bg-[#1A1A1A] rounded-[20px]">
                Failed to load chart. Please refresh the page.
              </div>
            }>
              <Suspense fallback={<ChartSkeleton />}>
                <EquityChart data={stats.equitySeries || []} trades={stats.trades || []} unit={unit} />
              </Suspense>
            </ErrorBoundary>
            </div>

            {/* ✅ UPDATED: Charts with lock logic for Trade Duration */}
            <div className={`${JOURNAL_PANEL} p-4`}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[14px] font-semibold text-white">Trade Performance</h2>
                    <JournalInfoIcon label="A scatter view of individual trade outcomes by time of day and by holding duration." />
                  </div>
                  <span className="text-[11px] text-white/50">{stats.closedTrades} trades</span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TradeTimePerformanceChart data={tradeTimeData} trades={(stats?.trades ?? []) as unknown as import('@/utils/rAggregates').TradeForRAgg[]} unit={unit} />
              <TradeDurationPerformanceChart
                data={tradeDurationData}
                trades={(stats?.trades ?? []) as unknown as import('@/utils/rAggregates').TradeForRAgg[]}
                unit={unit}
                isLocked={isDurationChartLocked}
                  />
                </div>
              </div>

            {/* === BREAKDOWN PANEL (Symbol / Strategy / Session) === */}
            <ErrorBoundary fallback={<div className="text-center text-[#E36363] p-6 bg-[#1A1A1A] rounded-[12px]">
              Failed to load breakdown. Please refresh.
            </div>}>
              <Suspense fallback={<ChartSkeleton />}>
                <BreakdownPanel trades={stats.trades || []} unit={unit} />
              </Suspense>
            </ErrorBoundary>

            <AIInsight stats={stats} onViewReport={handleGeneratePDF} />

            {/* Calendar heatmap lives in its dedicated Calendar tab — removed
                from Overview 2026-05-11 (was showing a 12-week window that
                missed Elad's actual trading days; the dedicated tab covers
                the full date range with proper controls). */}

          </>
        )}
      </div>

      {showReferModal && FEATURES.AFFILIATE_TRACKING && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <AffiliatePopup onClose={() => setShowReferModal(false)} />
          </Suspense>
        </ErrorBoundary>
      )}

      {showSnapTradePopup && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <BrokerConnectionPopup onClose={() => setShowSnapTradePopup(false)} />
          </Suspense>
        </ErrorBoundary>
      )}

      {showBrokerPicker && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <BrokerPickerModal
              onClose={() => setShowBrokerPicker(false)}
              onSelect={handleBrokerPickerSelect}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      <ManageConnectionsModal
        open={showManageConnections}
        onOpenChange={setShowManageConnections}
        onAddConnection={openAddBrokerPopup}
      />

      {showTradovateModal && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <TradovateConnectModal
              onClose={() => { setShowTradovateModal(false); setTradovateInitialStep('select-env'); }}
              onAddConnection={handoffToAddBrokerPopup}
              initialStep={tradovateInitialStep}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {showFreeUserTooltip && (
        <FreeUserBrokerTooltip
          onClose={() => setShowFreeUserTooltip(false)}
          onUpgrade={handleUpgradeFromTooltip}
        />
      )}

      {/* ✅ NEW: Import Trades Popup */}
      {showImportPopup && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <ImportTradesPopup
              onClose={() => setShowImportPopup(false)}
              onImportComplete={handleImportComplete}
              userId={userId}
              userTimezone={timezone}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* F2.5: Add New Broker popup (Dialog with picker / form swap).
          Keep it mounted so transitions from Manage Connections open instantly. */}
      <ErrorBoundary>
        <AddBrokerPopup open={showAddBroker} onOpenChange={setShowAddBroker} />
      </ErrorBoundary>
      <UpgradeLimitDialog open={showBrokerUpgrade} onOpenChange={setShowBrokerUpgrade} reason="broker-limit" />

      {/* Phase 1B.4 — BrokerReconnectModal driven by the degraded-connection banner above. */}
      {reconnectModalOpen && degradedConnection && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <BrokerReconnectModal
              open={reconnectModalOpen}
              onOpenChange={setReconnectModalOpen}
              brokerName={degradedConnection.connection_name ?? degradedConnection.broker ?? 'Broker'}
              lastError={degradedConnection.last_error}
              onReconnect={async () => {
                const result = await brokerReconnect(degradedConnection.id);
                // OQ-87 fix: when the vault entry is missing the edge function
                // returns `requires_credentials: true`. The modal closes itself
                // on that signal — open the AddBroker popup so the user can
                // re-enter Tradovate username + password. Without this the
                // user clicks Reconnect, sees a silent close, and is stuck.
                if (result.requires_credentials) {
                  openAddBrokerPopup();
                }
                return {
                  success: result.success,
                  error: result.error,
                  requires_credentials: result.requires_credentials,
                };
              }}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}

export default function JournalOverview(props: JournalOverviewProps = {}) {
  return (
    <ErrorBoundary>
      <JournalOverviewContent {...props} />
    </ErrorBoundary>
  );
}
