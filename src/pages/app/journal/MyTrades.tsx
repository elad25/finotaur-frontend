/**
 * ===============================================
 * 🔥 MY TRADES - OPTIMIZED FOR 5000+ USERS
 * ===============================================
 * ✅ React Query with optimistic updates
 * ✅ Memoized components (StatsCard, TradeRow)
 * ✅ Efficient stats calculation (single pass)
 * ✅ Centralized query keys (no cache duplication)
 * ✅ Same UI/UX - ZERO visual changes
 * ✅ FIXED: Using useEffectiveUser for admin impersonation
 * ✅ NEW: Centralized trade operations from @/lib/trades
 * ✅ NEW: Multi-screenshot support (1-4 images per trade)
 * ✅ CRITICAL FIX: Now passing userId to useTrades() hook!
 * ✅ NEW: Timezone support with formatTradeDate
 * ✅ NEW: Session badges with formatSessionDisplay + getSessionColor
 * ✅ UPDATED: Trade row cards show session + side badges
 * ✅ UPDATED: Dialog shows session in header and position section
 * ===============================================
 */

import { useEffect, useState, useMemo, useCallback, memo, useRef, lazy, Suspense } from "react";
import { useRegisterJournalFinoContext } from "@/components/fino/useJournalFinoContext";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { usePortfolioContext } from "@/contexts/PortfolioContext";
import { useTraderMode } from "@/hooks/useTraderMode";
import { normalizeTraderTrades } from "@/lib/journal/traderNormalization";
import { supabase } from "@/lib/supabase";
import { useRiskSettings, calculateActualR, formatRValue } from "@/hooks/useRiskSettings";
import PageTitle from "@/components/PageTitle";
import { useTrades, useDeleteTrade, useUpdateTrade, useBulkDeleteTrades } from "@/hooks/useTradesData";
import { tradeR } from '@/utils/rAggregates';
import { BulkActionBar } from "@/components/journal/BulkActionBar";
import { useStrategiesOptimized, useStrategyRConfigs } from "@/hooks/useStrategies";
import { resolvePlanned1R, detectBehavior } from '@/utils/rResolver';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useChartTheme } from "@/components/charting/useChartTheme";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, TrendingUp, TrendingDown, DollarSign, Target, Download, MoreVertical, Edit, Trash2, Clock, Award, FileText, Image, AlertTriangle, RefreshCw, ChevronDown, CalendarDays, Settings, Trophy, Percent, BadgeDollarSign, BarChart3, Scale, ArrowRightLeft, CheckSquare, Moon, Sun, Maximize2, Upload, X, Brain } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/utils/smartCalc";
import { getDTE, getOptionBreakeven, getOptionContractLabel, getStrategyLabel, getPipSize, parseForexPair } from "@/utils/tradeCalculations";
import { ForexMarketStatusChip } from "@/components/journal/ForexMarketStatusChip";

// Lazy-load TradeChart so lightweight-charts (~200KB) is NOT in the initial bundle.
// The chunk starts downloading as soon as the journal page mounts (see useEffect below).
const TradeChart = lazy(() =>
  import('@/components/journal/TradeChart').then((m) => ({ default: m.TradeChart }))
);

// Skeleton shown while the lazy chunk resolves and while bars are loading.
function TradeChartSkeleton() {
  return (
    <div className="rounded-xl border-2 border-zinc-700/50 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 p-6 shadow-2xl">
      <div className="mb-4 h-5 w-28 animate-pulse rounded bg-zinc-800" />
      <div className="h-[600px] w-full overflow-hidden rounded-xl border-2 border-zinc-800 bg-zinc-950 flex items-end justify-around px-6 pb-6 gap-3">
        {[42, 65, 38, 80, 55, 70, 45].map((h, i) => (
          <div
            key={i}
            className="animate-pulse rounded-sm bg-zinc-800"
            style={{ height: `${h}%`, flex: 1 }}
          />
        ))}
      </div>
    </div>
  );
}
import { AccountFilterDropdown } from '@/components/journal/AccountFilterDropdown';
import WhisperSetupsPanel from '@/components/journal/WhisperSetupsPanel';
import { ManageConnectionsModal } from '@/components/broker/ManageConnectionsModal';
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// 🔥 IMPORT CENTRALIZED TRADE OPERATIONS
import { updateTrade, deleteTrade, bulkDeleteTrades, uploadScreenshot } from "@/lib/trades";
import { compressImage } from "@/utils/imageCompression";

// 🔥 NEW: Import timezone utilities + session formatting
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatTradeDate } from '@/utils/dateFormatter';
import { formatSessionDisplay, getSessionColor } from '@/constants/tradingSessions';
import { TradeGradeBadge } from '@/pages/app/journal/finotaur-ai/components/TradeGradeBadge';
import { FinoExplains } from '@/components/fino/FinoExplains';
import { normalizeTraderTrades } from '@/lib/journal/traderNormalization';
import { useTraderMode } from '@/hooks/useTraderMode';

interface Trade {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entry_price: number;
  stop_price: number;
  take_profit_price?: number;
  exit_price?: number;
  quantity: number;
  fees: number;
  open_at: string;
  close_at?: string;
  session?: string;
  strategy_id?: string;
  strategy_name?: string;
  setup?: string;
  emotion?: string;
  notes?: string;
  tags?: string[];
  screenshot_url?: string;
  screenshots?: string[];
  asset_class?: string;
  outcome?: "WIN" | "LOSS" | "BE" | "OPEN";
  pnl?: number;
  quality_tag?: string;
  multiplier?: number;
  created_at?: string;
  mistake?: string;
  next_time?: string;
  // 🔥 Direct DB fields (risk-only mode support)
  risk_usd?: number;
  reward_usd?: number;
  risk_pts?: number;
  reward_pts?: number;
  rr?: number;
  actual_r?: number;
  actual_user_r?: number;
  user_risk_r?: number;
  user_reward_r?: number;
  input_mode?: 'summary' | 'risk-only';
  // Options (single-leg) — populated only when asset_class === 'options'
  option_type?: "CALL" | "PUT";
  strike_price?: number;
  expiration_date?: string;
  leg_count?: number;
  strategy_type?: string;
  // Forex — populated only when asset_class === 'forex'
  base_currency?: string;
  quote_currency?: string;
  account_currency?: string;
  quote_rate?: number;
  pip_size?: number;
  lot_size?: number;
  group_trade_ids?: string[];
  // Legacy metrics object (backward compatibility)
  metrics?: {
    rr?: number;
    riskUSD?: number;
    rewardUSD?: number;
    riskPts?: number;
    rewardPts?: number;
    actual_r?: number;
    user_risk_r?: number;
    user_reward_r?: number;
  };
}

interface StrategyOption {
  id: string;
  name: string;
}

interface Stats {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgR: number;
  wins: number;
  losses: number;
  breakeven: number;
}

interface DaySummary {
  key: string;
  label: string;
  trades: Trade[];
  totalTrades: number;
  closedTrades: number;
  winners: number;
  losers: number;
  breakeven: number;
  netPnl: number;
  grossPnl: number;
  commissions: number;
  volume: number;
  winRate: number;
  profitFactor: number | null;
  topSymbols: string[];
  sessions: string[];
}

type SummaryPeriod = "day" | "week";

// 🔥 UPDATED: Now calculates R based on global 1R from settings
const getTradeData = (trade: Trade, oneR: number, rBasisMode: 'per_trade' | 'manual' = 'per_trade', planned1R?: number | null) => {
  const isRiskOnlyMode = trade.input_mode === 'risk-only';
  
  // 🔥 Get risk from direct field OR legacy metrics
  const riskUSD = Number(trade.risk_usd) || trade.metrics?.riskUSD || 0;
  const rewardUSD = Number(trade.reward_usd) || trade.metrics?.rewardUSD || 0;
  
  // 🔥 CRITICAL FIX: Check if pnl EXISTS (not just truthy)
  // pnl = 0 is valid for Break Even trades!
  const hasPnlValue = trade.pnl !== null && trade.pnl !== undefined;
  
  // 🔥 For Risk-Only: check if trade has an ACTUAL result entered
  const hasRiskOnlyResult = isRiskOnlyMode && hasPnlValue;
  
  // 🔥 Get pnl - keep as 0 if that's the actual value
  const pnl = hasPnlValue ? Number(trade.pnl) : 0;
  
  // 🔥 CRITICAL: Determine outcome based on mode
  let outcome: "WIN" | "LOSS" | "BE" | "OPEN" = trade.outcome as any ?? 'OPEN';
  
  // 🔥 For Risk-Only mode: calculate outcome from pnl
  if (isRiskOnlyMode) {
    if (hasRiskOnlyResult) {
      if (pnl > 0) outcome = 'WIN';
      else if (pnl < 0) outcome = 'LOSS';
      else outcome = 'BE';
    } else {
      outcome = 'OPEN';
    }
  }
  
  // 🔥 Determine actual R based on mode + R-basis setting
  let actualR: number | null = null;
  const realContractR =
    trade.actual_r !== null && trade.actual_r !== undefined && !Number.isNaN(Number(trade.actual_r))
      ? Number(trade.actual_r)
      : null;

  if (rBasisMode === 'manual') {
    // Manual / global-1R behavior (legacy)
    if (isRiskOnlyMode) {
      if (hasRiskOnlyResult) {
        if (trade.actual_user_r !== null && trade.actual_user_r !== undefined) {
          actualR = Number(trade.actual_user_r);
        } else if (trade.actual_r !== null && trade.actual_r !== undefined) {
          actualR = Number(trade.actual_r);
        } else if (trade.metrics?.actual_r !== null && trade.metrics?.actual_r !== undefined) {
          actualR = Number(trade.metrics.actual_r);
        } else if (riskUSD > 0) {
          actualR = pnl / riskUSD;
        }
      } else {
        actualR = Number(trade.user_risk_r) || null;
      }
    } else {
      if (trade.actual_user_r !== undefined && trade.actual_user_r !== null) {
        actualR = Number(trade.actual_user_r);
      } else if (trade.actual_r !== undefined && trade.actual_r !== null) {
        actualR = Number(trade.actual_r);
      } else if (trade.metrics?.actual_r !== null && trade.metrics?.actual_r !== undefined) {
        actualR = Number(trade.metrics.actual_r);
      } else if (trade.exit_price && oneR > 0) {
        actualR = calculateActualR(pnl, oneR);
      }
    }
  } else {
    // Per-trade: R only from a real per-trade risk basis (stop_price / risk_usd → actual_r)
    if (isRiskOnlyMode) {
      if (hasRiskOnlyResult) {
        actualR = realContractR ?? (riskUSD > 0 ? pnl / riskUSD : null);
      } else {
        actualR = Number(trade.user_risk_r) || null;
      }
    } else {
      actualR = (planned1R != null && planned1R > 0)
        ? (pnl != null ? Number(pnl) / planned1R : null)
        : realContractR;
    }
  }

  // 🔥 CRITICAL: Risk-Only = closed ONLY if user entered a result!
  const isClosed = isRiskOnlyMode 
    ? hasRiskOnlyResult
    : (trade.exit_price !== null && trade.exit_price !== undefined && Number(trade.exit_price) > 0);
  
  return {
    pnl,
    actualR,
    riskUSD,
    rewardUSD,
    outcome,
    multiplier: trade.multiplier ?? 1,
    isRiskOnlyMode,
    isClosed,
    hasRiskOnlyResult,
  };
};
const calculateDuration = (openAt: string, closeAt?: string): string => {
  const start = new Date(openAt);
  const end = closeAt ? new Date(closeAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};

const formatSignedCurrency = (value: number, fractionDigits = 2): string => {
  const sign = value >= 0 ? "+" : "−";
  return `${sign}$${formatNumber(Math.abs(value), fractionDigits)}`;
};

const getTradeDayKey = (date: string, timezone: string): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  } catch {
    return new Date(date).toISOString().slice(0, 10);
  }
};

const getTradeWeekKey = (date: string, timezone: string): string => {
  const dayKey = getTradeDayKey(date, timezone);
  const [year, month, day] = dayKey.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = utcDate.getUTCDay();
  const daysFromMonday = (weekday + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - daysFromMonday);
  return utcDate.toISOString().slice(0, 10);
};

const formatDayLabel = (date: string, timezone: string): string => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }
};

const formatWeekLabel = (weekStartKey: string): string => {
  const [year, month, day] = weekStartKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
  const startOptions: Intl.DateTimeFormatOptions = sameMonth
    ? { month: "short", day: "2-digit", timeZone: "UTC" }
    : { month: "short", day: "2-digit", year: sameYear ? undefined : "numeric", timeZone: "UTC" };
  const endOptions: Intl.DateTimeFormatOptions = { month: sameMonth ? undefined : "short", day: "2-digit", year: "numeric", timeZone: "UTC" };

  return `${new Intl.DateTimeFormat("en-US", startOptions).format(start)} - ${new Intl.DateTimeFormat("en-US", endOptions).format(end)}`;
};

const formatTradeTime = (date: string, timezone: string): string => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
};

const formatTradeStamp = (date: string, timezone: string): string => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(date));
  } catch {
    return `${new Date(date).toLocaleDateString("en-US", { month: "short", day: "2-digit" })} ${formatTradeTime(date, timezone)}`;
  }
};

const buildDayChart = (trades: Trade[], oneR: number) => {
  const closedTrades = trades.filter((trade) => getTradeData(trade, oneR).isClosed);
  const source = closedTrades.length > 0 ? closedTrades : trades;
  const cumulative = source.reduce<number[]>((points, trade) => {
    const { pnl, isClosed } = getTradeData(trade, oneR);
    const previous = points[points.length - 1] ?? 0;
    points.push(previous + (isClosed ? pnl : 0));
    return points;
  }, [0]);

  const min = Math.min(...cumulative, 0);
  const max = Math.max(...cumulative, 0);
  const range = Math.max(max - min, 1);
  const width = 560;
  const height = 190;
  const padX = 8;
  const padY = 12;
  const xStep = (width - padX * 2) / Math.max(cumulative.length - 1, 1);

  const points = cumulative.map((value, index) => {
    const x = padX + index * xStep;
    const y = padY + (height - padY * 2) - ((value - min) / range) * (height - padY * 2);
    // index 0 is the synthetic $0 start point (no trade); index i maps to source[i - 1]
    const trade = index === 0 ? null : source[index - 1] ?? null;
    const tradePnl = trade ? getTradeData(trade, oneR).pnl : null;
    return {
      x,
      y,
      value,
      trade,
      tradePnl,
      symbol: trade?.symbol ?? null,
      time: trade ? (trade.close_at ?? trade.open_at) : null,
    };
  });

  return {
    width,
    height,
    min,
    max,
    points,
    zeroY: padY + (height - padY * 2) - ((0 - min) / range) * (height - padY * 2),
    path: points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" "),
    areaPath: points.length
      ? `${points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ")} L ${(points[points.length - 1]?.x ?? padX).toFixed(1)} ${height - padY} L ${padX} ${height - padY} Z`
      : "",
    lastPoint: points[points.length - 1],
  };
};

const buildTradeSummaries = (
  trades: Trade[],
  oneR: number,
  timezone: string,
  period: SummaryPeriod,
): DaySummary[] => {
  const groups = new Map<string, { label: string; trades: Trade[] }>();

  trades.forEach((trade) => {
    const periodKey = period === "week"
      ? getTradeWeekKey(trade.open_at, timezone)
      : getTradeDayKey(trade.open_at, timezone);
    const key = `${period}:${periodKey}`;
    const label = period === "week" ? formatWeekLabel(periodKey) : formatDayLabel(trade.open_at, timezone);
    const existing = groups.get(key) ?? { label, trades: [] };
    existing.trades.push(trade);
    groups.set(key, existing);
  });

  return Array.from(groups.entries())
    .map(([key, group]) => {
      const sortedTrades = [...group.trades].sort((a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime());
      let winners = 0;
      let losers = 0;
      let breakeven = 0;
      let netPnl = 0;
      let commissions = 0;
      let volume = 0;
      let grossProfit = 0;
      let grossLoss = 0;
      let closedTrades = 0;
      const symbols = new Set<string>();
      const sessions = new Set<string>();

      sortedTrades.forEach((trade) => {
        const { pnl, outcome, isClosed } = getTradeData(trade, oneR);
        symbols.add(trade.symbol);
        if (trade.session) sessions.add(formatSessionDisplay(trade.session));
        volume += Number(trade.quantity) || 0;
        commissions += Number(trade.fees) || 0;

        if (!isClosed) return;
        closedTrades += 1;
        netPnl += pnl;
        if (outcome === "WIN") winners += 1;
        if (outcome === "LOSS") losers += 1;
        if (outcome === "BE") breakeven += 1;
        if (pnl > 0) grossProfit += pnl;
        if (pnl < 0) grossLoss += Math.abs(pnl);
      });

      return {
        key,
        label: group.label,
        trades: sortedTrades,
        totalTrades: sortedTrades.length,
        closedTrades,
        winners,
        losers,
        breakeven,
        netPnl,
        grossPnl: netPnl + commissions,
        commissions,
        volume,
        winRate: closedTrades > 0 ? (winners / closedTrades) * 100 : 0,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
        topSymbols: Array.from(symbols).slice(0, 4),
        sessions: Array.from(sessions).slice(0, 3),
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));
};

// 🚀 OPTIMIZATION: Memoized StatsCard Component
const StatsCard = memo(({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  color, 
  valueColor 
}: { 
  icon: any; 
  title: string; 
  value: string; 
  subtitle?: string; 
  color: string; 
  valueColor?: string;
}) => (
  <div 
    className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02]"
    style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: `0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
      backdropFilter: 'blur(12px)',
    }}
  >
    {/* Top glow from icon color */}
    <div 
      className="absolute -top-10 -left-10 w-32 h-32 rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-300"
      style={{ background: color.replace('0.1', '0.8'), filter: 'blur(32px)' }}
    />

    <div className="relative p-5">
      {/* Title row */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.15em]">
          {title}
        </div>
        <div 
          className="inline-flex items-center justify-center w-8 h-8 rounded-xl transition-transform duration-300 group-hover:scale-110"
          style={{
            background: color.replace('0.1', '0.15'),
            border: `1px solid ${color.replace('0.1', '0.3')}`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: color.replace('0.1', '1') }} strokeWidth={1.8} />
        </div>
      </div>

      {/* Value — large and dominant */}
      <div className={`text-3xl font-bold tracking-tight leading-none mb-2 ${valueColor || 'text-white'}`}>
        {value}
      </div>

      {subtitle && (
        <div className="text-xs text-zinc-600 font-medium">
          {subtitle}
        </div>
      )}
    </div>

    {/* Subtle bottom border glow */}
    <div 
      className="absolute bottom-0 left-4 right-4 h-px opacity-40"
      style={{ background: `linear-gradient(90deg, transparent, ${color.replace('0.1', '0.8')}, transparent)` }}
    />
  </div>
));

StatsCard.displayName = 'StatsCard';

// 🚀 OPTIMIZATION: Memoized TradeRow Component - 🔥 UPDATED WITH SESSION + BULK SELECTION!
const TradeRow = memo(({
  trade,
  oneR,
  timezone,
  strategies,
  onOpen,
  onEdit,
  onDelete,
  onAssignStrategy,
  isSelected,
  onToggleSelect,
  readOnly = false,
}: {
  trade: Trade;
  oneR: number;
  timezone: string;
  strategies: StrategyOption[];
  onOpen: (trade: Trade) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAssignStrategy: (trade: Trade, strategyId: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  readOnly?: boolean;
}) => {
  const { settings: tradeRowRiskSettings } = useRiskSettings();
  const tradeRowRBasisMode = tradeRowRiskSettings?.rBasisMode ?? 'per_trade';
  const { pnl, actualR, outcome, isClosed, isRiskOnlyMode, riskUSD, rewardUSD } = useMemo(
    () => getTradeData(trade, oneR, tradeRowRBasisMode),
    [trade, oneR, tradeRowRBasisMode]
  );
  const isOption = trade.asset_class === 'options';
  const isForex = trade.asset_class === 'forex';
  const isMultiLeg = isOption && (trade.leg_count ?? 0) > 1;
  const optionDTE = isOption ? getDTE(trade.expiration_date) : null;

  const handleClick = useCallback(() => onOpen(trade), [trade, onOpen]);
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(trade.id);
  }, [trade.id, onEdit]);
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(trade.id);
  }, [trade.id, onDelete]);
  const handleAssignStrategy = useCallback((strategyId: string) => {
    onAssignStrategy(trade, strategyId);
  }, [trade, onAssignStrategy]);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggleSelect(trade.id);
  }, [trade.id, onToggleSelect]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <TableRow
      className={`border-zinc-800 hover:bg-zinc-900/50 cursor-pointer transition-colors ${isSelected ? "bg-[#C9A646]/5 hover:bg-[#C9A646]/8" : ""}`}
      onClick={handleClick}
      onMouseEnter={() => {
        // Dynamic import keeps TradeChart out of MyTrades' eager bundle.
        // The page-mount useEffect already triggered the chunk load, so on
        // hover the Promise resolves synchronously from the module cache.
        void import("@/components/journal/TradeChart").then((m) =>
          m.prewarmTradeChart(trade),
        );
      }}
    >
      {/* Checkbox */}
      <TableCell className="w-10 pr-0" onClick={handleCheckboxClick}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          aria-label={`Select trade ${trade.symbol}`}
          className="checkbox-gold"
        />
      </TableCell>

      {/* Date */}
      <TableCell className="text-zinc-400">
        {formatTradeDate(trade.open_at, timezone)}
      </TableCell>
      
      {/* Symbol */}
      <TableCell className="font-medium text-white">
        {isOption
          ? isMultiLeg
            ? `${getStrategyLabel(trade.strategy_type) ?? 'Spread'} · ${trade.leg_count} legs`
            : getOptionContractLabel(trade)
          : trade.symbol}
        {isRiskOnlyMode && (
          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-normal">
            $
          </span>
        )}
        {isForex && (
          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 font-normal">
            FX
          </span>
        )}
        {isOption && !isMultiLeg && (
          <span
            className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-normal ${
              trade.option_type === 'CALL'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-300'
            }`}
          >
            {trade.option_type ?? 'OPT'}
          </span>
        )}
        {isOption && !isMultiLeg && optionDTE !== null && (
          <span
            className={`ml-1 text-[10px] px-1.5 py-0.5 rounded font-normal ${
              optionDTE < 0
                ? 'bg-zinc-700/40 text-zinc-400'
                : optionDTE <= 7
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-zinc-700/40 text-zinc-300'
            }`}
            title="Days to expiration"
          >
            {optionDTE < 0 ? 'Expired' : `${optionDTE}DTE`}
          </span>
        )}
      </TableCell>

      {/* Grade badge */}
      <TableCell className="w-10">
        <TradeGradeBadge tradeId={trade.id} />
      </TableCell>

      {/* Side */}
      <TableCell>
        <Badge 
          variant={trade.side === "LONG" ? "outline" : "destructive"}
          className={trade.side === "LONG"
            ? "text-xs border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
            : "text-xs border-red-400/45 bg-red-500/15 text-red-200 hover:bg-red-500/20"
          }
        >
          {trade.side}
        </Badge>
      </TableCell>
      
      {/* Session */}
      <TableCell>
        {trade.session ? (
          <Badge 
            variant="outline"
            className={`text-xs ${getSessionColor(trade.session)}`}
          >
            {formatSessionDisplay(trade.session)}
          </Badge>
        ) : (
          <span className="text-zinc-500">—</span>
        )}
      </TableCell>
      
      {/* Entry - 🔥 Show Risk for Risk-Only mode */}
      <TableCell className="text-zinc-300">
        {isRiskOnlyMode ? (
          <span className="text-red-400 text-sm">
            ${formatNumber(riskUSD, 0)} <span className="text-zinc-500 text-xs">risk</span>
          </span>
        ) : (
          `$${formatNumber(trade.entry_price, 2)}`
        )}
      </TableCell>
      
      {/* Exit - 🔥 Show Result (if closed) or Target (if open) for Risk-Only mode */}
      <TableCell className="text-zinc-300">
        {isRiskOnlyMode ? (
          isClosed ? (
            // 🔥 FIX: Trade is CLOSED - show actual P&L result, not target
            <span className={`text-sm font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {pnl >= 0 ? '+' : ''}${formatNumber(Math.abs(pnl), 0)} <span className="text-zinc-500 text-xs">result</span>
            </span>
          ) : rewardUSD > 0 ? (
            // Open trade - show target
            <span className="text-emerald-400 text-sm">
              ${formatNumber(rewardUSD, 0)} <span className="text-zinc-500 text-xs">target</span>
            </span>
          ) : (
            <span className="text-zinc-500">—</span>
          )
        ) : (
          trade.exit_price && Number(trade.exit_price) > 0 
            ? `$${formatNumber(trade.exit_price, 2)}` 
            : '—'
        )}
      </TableCell>
      
      {/* P&L - 🔥 FIXED: Show for both modes */}
      <TableCell>
        {isClosed ? (
          <span className={pnl >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
            {pnl >= 0 ? '+' : ''}${formatNumber(Math.abs(pnl), 2)}
          </span>
        ) : (
          <span className="text-zinc-500">—</span>
        )}
      </TableCell>
      
      {/* Outcome */}
      <TableCell>
        <Badge
          variant={outcome === "WIN" || outcome === "LOSS" ? "outline" : "secondary"}
          className={`text-xs ${
            outcome === "WIN" ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" :
            outcome === "LOSS" ? "border-red-400/45 bg-red-500/15 text-red-200 hover:bg-red-500/20" :
            outcome === "OPEN" && isRiskOnlyMode ? "border-yellow-500/40 text-yellow-400 bg-yellow-500/10" : ""
          }`}
        >
          {outcome === "WIN" ? "Win" : outcome === "LOSS" ? "Loss" : outcome === "BE" ? "Break Even" : "Open"}
        </Badge>
      </TableCell>
      
      {/* Actual R - 🔥 Show R:R for open Risk-Only trades */}
      <TableCell>
        {isRiskOnlyMode && !isClosed ? (
          // Open Risk-Only trade - show planned R:R
          riskUSD > 0 && rewardUSD > 0 ? (
            <span className="text-yellow-400 font-medium">
              1:{formatNumber(rewardUSD / riskUSD, 1)}
            </span>
          ) : (
            <span className="text-zinc-500">—</span>
          )
        ) : actualR !== null && actualR !== undefined ? (
          <span className={`font-semibold ${
            actualR > 0 ? 'text-emerald-400' : 
            actualR < 0 ? 'text-red-400' : 
            'text-zinc-400'
          }`}>
            {formatRValue(actualR)}
          </span>
        ) : (
          <span className="text-zinc-500">—</span>
        )}
      </TableCell>
      
      {/* Strategy */}
      <TableCell>
        {trade.strategy_name ? (
          <span className="text-yellow-400/90 text-sm font-medium">
            {trade.strategy_name}
          </span>
        ) : strategies.length > 0 ? (
          <div
            className="w-[150px]"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Select onValueChange={handleAssignStrategy}>
              <SelectTrigger className="h-8 w-[150px] rounded-md border-zinc-700/70 bg-zinc-950/70 px-2 text-xs text-zinc-300 hover:border-[#C9A646]/60 hover:text-white focus:ring-[#C9A646]/30">
                <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-[#C9A646]" />
                <SelectValue placeholder="Assign strategy" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                {strategies.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    {strategy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span className="text-zinc-500">—</span>
        )}
      </TableCell>
      
      {/* Actions */}
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
            <DropdownMenuItem
              onClick={handleClick}
              className="text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              View Details
            </DropdownMenuItem>
            {!readOnly && (
              <>
                <DropdownMenuItem
                  onClick={handleEdit}
                  className="text-zinc-300 hover:text-white hover:bg-zinc-800"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Trade
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-400 hover:text-red-300 hover:bg-zinc-800"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Trade
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

TradeRow.displayName = 'TradeRow';

const DaySummaryCard = memo(({
  day,
  oneR,
  timezone,
  period,
  expanded,
  onToggle,
  onOpenTrade,
}: {
  day: DaySummary;
  oneR: number;
  timezone: string;
  period: SummaryPeriod;
  expanded: boolean;
  onToggle: () => void;
  onOpenTrade: (trade: Trade) => void;
}) => {
  const { settings: daySummaryRiskSettings } = useRiskSettings();
  const daySummaryRBasisMode = daySummaryRiskSettings?.rBasisMode ?? 'per_trade';
  const isLossDay = day.netPnl < 0;
  const chart = useMemo(() => buildDayChart(day.trades, oneR), [day.trades, oneR]);

  const [hover, setHover] = useState<{ index: number; left: number; top: number; width: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const chartBoxRef = useRef<HTMLDivElement>(null);

  const handleChartMove = useCallback((event: React.MouseEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    const box = chartBoxRef.current;
    if (!svg || !box || chart.points.length === 0) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const cursor = svg.createSVGPoint();
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    const userPoint = cursor.matrixTransform(ctm.inverse());
    let nearest = 0;
    let nearestDist = Infinity;
    chart.points.forEach((point, idx) => {
      const dist = Math.abs(point.x - userPoint.x);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = idx;
      }
    });
    const target = chart.points[nearest];
    const projected = svg.createSVGPoint();
    projected.x = target.x;
    projected.y = target.y;
    const screen = projected.matrixTransform(ctm);
    const boxRect = box.getBoundingClientRect();
    setHover({ index: nearest, left: screen.x - boxRect.left, top: screen.y - boxRect.top, width: boxRect.width });
  }, [chart.points]);

  const hoverPoint = hover ? chart.points[hover.index] : null;

  const pnlTone = isLossDay ? "text-num-negative" : "text-emerald-400";
  const chartTone = isLossDay ? "text-num-negative" : "text-emerald-400";
  const gradientId = `day-chart-${day.key.replace(/[^a-zA-Z0-9]/g, "")}`;
  const Metric = ({
    icon: Icon,
    label,
    value,
    valueClassName = "text-ink-primary",
  }: {
    icon: any;
    label: string;
    value: React.ReactNode;
    valueClassName?: string;
  }) => (
    <div className="border-l border-border-ds-subtle pl-ds-3">
      <div className="flex items-center gap-ds-2 text-xs text-ink-secondary">
        <Icon className="h-3.5 w-3.5 text-gold-primary" strokeWidth={1.7} />
        <span>{label}</span>
      </div>
      <div className={`mt-0.5 text-lg font-semibold leading-tight tabular-nums ${valueClassName}`}>
        {value}
      </div>
    </div>
  );

  return (
    <div className={`group mx-ds-3 my-ds-2 overflow-hidden rounded-[10px] border bg-black p-ds-3 shadow-lg transition-colors duration-base ${isLossDay ? "border-border-ds-subtle" : "border-emerald-500/35"}`}>
      <div className="mb-ds-3 flex flex-wrap items-start justify-between gap-ds-3">
        <div className="flex min-w-0 items-start gap-ds-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-ds-subtle bg-surface-base text-gold-primary transition-colors duration-base hover:border-gold-primary/50"
            aria-label={`${expanded ? "Hide" : "Show"} trades from ${period === "week" ? "week" : "day"} ${day.label}`}
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-base ${expanded ? "" : "-rotate-90"}`} />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-ds-2">
              <CalendarDays className="h-4 w-4 text-gold-primary" strokeWidth={1.7} />
              <h3 className="text-lg font-semibold leading-tight text-ink-primary">{day.label}</h3>
              <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
              <span className="text-xs text-ink-secondary">Net P&amp;L</span>
            </div>
            <div className={`mt-1 text-3xl font-semibold leading-none tabular-nums ${pnlTone}`}>
              {formatSignedCurrency(day.netPnl, 1)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-ds-2">
          <button
            type="button"
            disabled
            className="inline-flex h-9 items-center gap-ds-2 rounded-[10px] border border-border-ds-default bg-surface-2 px-ds-3 text-sm font-medium text-ink-muted"
          >
            <Plus className="h-3.5 w-3.5" />
            Add note
          </button>
        </div>
      </div>

      <div className="grid gap-ds-3 xl:grid-cols-[minmax(300px,0.8fr)_1.2fr]">
        <div ref={chartBoxRef} className={`relative h-[165px] rounded-[10px] border border-border-ds-subtle bg-surface-base/70 p-ds-3 ${chartTone}`}>
          <svg ref={svgRef} viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-[122px] w-full overflow-visible">
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((ratio) => (
              <line key={ratio} x1="0" x2={chart.width} y1={chart.height * ratio} y2={chart.height * ratio} className="stroke-border-ds-default" strokeDasharray="3 5" strokeWidth="1" />
            ))}
            <line x1="0" x2={chart.width} y1={chart.zeroY} y2={chart.zeroY} className="stroke-border-ds-strong" strokeDasharray="3 5" strokeWidth="1" />
            {chart.areaPath && <path d={chart.areaPath} fill={`url(#${gradientId})`} />}
            <path d={chart.path} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
            {chart.lastPoint && <circle cx={chart.lastPoint.x} cy={chart.lastPoint.y} r="6" fill="currentColor" />}
            {hoverPoint && (
              <g style={{ pointerEvents: "none" }}>
                <line x1={hoverPoint.x} x2={hoverPoint.x} y1={0} y2={chart.height} className="stroke-ink-secondary/60" strokeWidth="1" strokeDasharray="2 3" />
                <circle cx={hoverPoint.x} cy={hoverPoint.y} r="6.5" fill="currentColor" stroke="#000" strokeWidth="2.5" />
              </g>
            )}
            <rect
              x="0"
              y="0"
              width={chart.width}
              height={chart.height}
              fill="transparent"
              pointerEvents="all"
              style={{ cursor: "crosshair" }}
              onMouseMove={handleChartMove}
              onMouseLeave={() => setHover(null)}
            />
          </svg>
          {hover && hoverPoint && (
            <div
              className="pointer-events-none absolute z-20 w-max max-w-[200px] -translate-x-1/2 -translate-y-full rounded-[8px] border border-border-ds-default bg-black/95 px-ds-2 py-1.5 text-left shadow-xl"
              style={{ left: Math.min(Math.max(hover.left, 74), Math.max(hover.width - 74, 74)), top: Math.max(hover.top - 10, 4) }}
            >
              <div className="text-[11px] font-medium text-ink-secondary tabular-nums">
                {hoverPoint.time ? formatTradeTime(hoverPoint.time, timezone) : "Start"}
              </div>
              <div className={`mt-0.5 text-sm font-semibold tabular-nums ${hoverPoint.value < 0 ? "text-num-negative" : "text-emerald-400"}`}>
                {formatSignedCurrency(hoverPoint.value, 2)}
                <span className="ml-1 text-[10px] font-normal text-ink-muted">cumulative</span>
              </div>
              {hoverPoint.trade && (
                <div className="mt-1 flex items-center gap-ds-2 border-t border-border-ds-subtle pt-1 text-[11px]">
                  <span className="font-mono text-ink-primary">{hoverPoint.symbol}</span>
                  <span className={`tabular-nums ${(hoverPoint.tradePnl ?? 0) < 0 ? "text-num-negative" : "text-emerald-400"}`}>
                    {formatSignedCurrency(hoverPoint.tradePnl ?? 0, 2)}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="pointer-events-none absolute left-ds-3 top-ds-3 flex h-[122px] flex-col justify-between text-[11px] text-ink-secondary tabular-nums">
            <span>{formatSignedCurrency(chart.max, 0)}</span>
            <span>$0</span>
            <span>{formatSignedCurrency(chart.min, 0)}</span>
          </div>
          <div className="flex justify-between px-ds-3 text-[11px] text-ink-secondary">
            {(period === "week" ? ["Mon", "Tue", "Wed", "Thu", "Fri"] : ["09:30", "11:00", "12:30", "14:00", "16:00"]).map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>

        <div className="grid content-center gap-ds-3">
          <div className="grid grid-cols-2 gap-y-ds-3 md:grid-cols-4">
            <Metric icon={ArrowRightLeft} label="Total Trades" value={day.totalTrades} />
            <Metric icon={BadgeDollarSign} label="Gross P&L" value={formatSignedCurrency(day.grossPnl, 1)} valueClassName={day.grossPnl < 0 ? "text-num-negative" : "text-emerald-400"} />
            <Metric icon={Trophy} label="Winners / Losers" value={<><span className="text-emerald-400">{day.winners}</span><span className="text-ink-secondary"> / </span><span className={day.losers > 0 ? "text-num-negative" : "text-ink-primary"}>{day.losers}</span></>} />
            <Metric icon={Percent} label="Commissions" value={`$${formatNumber(day.commissions, 1)}`} />
          </div>
          <div className="h-px bg-border-ds-subtle" />
          <div className="grid grid-cols-2 gap-y-ds-3 md:grid-cols-3">
            <Metric icon={Target} label="Win Rate" value={`${formatNumber(day.winRate, 1)}%`} />
            <Metric icon={BarChart3} label="Volume" value={formatNumber(day.volume, 0)} />
            <Metric icon={Scale} label="Profit Factor" value={day.profitFactor === null ? "-" : formatNumber(day.profitFactor, 2)} />
          </div>
          <div className="flex flex-wrap gap-ds-2">
            {day.topSymbols.map((symbol) => (
              <span key={symbol} className="rounded-sm border border-border-ds-subtle bg-surface-base px-ds-2 py-1 font-mono text-xs text-ink-primary">
                {symbol}
              </span>
            ))}
            {day.sessions.map((session) => (
              <span key={session} className="rounded-sm border border-gold-primary/20 bg-gold-primary/10 px-ds-2 py-1 text-xs text-gold-primary">
                {session}
              </span>
            ))}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-ds-3 border-t border-border-ds-subtle pt-ds-3">
          <div className="mb-ds-2 flex items-center justify-between gap-ds-3">
            <div className="text-xs font-semibold uppercase text-ink-secondary">Trades this {period}</div>
            <div className="text-xs text-ink-muted">{day.totalTrades} trades</div>
          </div>
          <div className="overflow-x-auto rounded-[8px] border border-border-ds-subtle">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[112px_1fr_88px_110px_92px_92px_100px_72px] border-b border-border-ds-subtle bg-surface-base/80 px-ds-3 py-ds-2 text-xs font-medium text-ink-muted">
                <span>{period === "week" ? "Opened" : "Time"}</span>
                <span>Symbol</span>
                <span>Side</span>
                <span>Session</span>
                <span>Entry</span>
                <span>Exit</span>
                <span>P&amp;L</span>
                <span>R</span>
              </div>
              {day.trades.map((trade) => {
                const { pnl, actualR, outcome, isClosed } = getTradeData(trade, oneR, daySummaryRBasisMode);
                const pnlClass = pnl >= 0 ? "text-emerald-400" : "text-num-negative";

                return (
                  <button
                    key={trade.id}
                    type="button"
                    onClick={() => onOpenTrade(trade)}
                    className="grid w-full grid-cols-[112px_1fr_88px_110px_92px_92px_100px_72px] items-center border-b border-border-ds-subtle px-ds-3 py-ds-2 text-left text-sm text-ink-primary transition-colors duration-base last:border-b-0 hover:bg-surface-1"
                  >
                    <span className="text-xs text-ink-secondary tabular-nums">{period === "week" ? formatTradeStamp(trade.open_at, timezone) : formatTradeTime(trade.open_at, timezone)}</span>
                    <span className="min-w-0 truncate font-semibold text-ink-primary">
                      {trade.asset_class === 'options'
                        ? (trade.leg_count ?? 0) > 1
                          ? `${getStrategyLabel(trade.strategy_type) ?? 'Spread'} · ${trade.leg_count} legs`
                          : getOptionContractLabel(trade)
                        : trade.symbol}
                      {trade.asset_class === 'options' && (trade.leg_count ?? 0) <= 1 && trade.expiration_date && (() => {
                        const dte = getDTE(trade.expiration_date);
                        return dte !== null ? (
                          <span className={`ml-ds-2 text-xs font-normal ${dte < 0 ? 'text-ink-muted' : dte <= 7 ? 'text-amber-300' : 'text-ink-secondary'}`}>
                            {dte < 0 ? 'Expired' : `${dte}DTE`}
                          </span>
                        ) : null;
                      })()}
                      {trade.strategy_name && <span className="ml-ds-2 text-xs font-normal text-ink-muted">{trade.strategy_name}</span>}
                    </span>
                    <span className={trade.side === "LONG" ? "text-emerald-400" : "text-num-negative"}>{trade.side}</span>
                    <span className="truncate text-xs text-ink-secondary">
                      {trade.session ? formatSessionDisplay(trade.session) : "-"}
                    </span>
                    <span className="tabular-nums text-ink-secondary">${formatNumber(trade.entry_price, 2)}</span>
                    <span className="tabular-nums text-ink-secondary">
                      {trade.exit_price && Number(trade.exit_price) > 0 ? `$${formatNumber(trade.exit_price, 2)}` : "-"}
                    </span>
                    <span className={`font-semibold tabular-nums ${isClosed ? pnlClass : "text-ink-muted"}`}>
                      {isClosed ? formatSignedCurrency(pnl, 2) : "-"}
                    </span>
                    <span className="tabular-nums text-ink-secondary">
                      {actualR !== null && actualR !== undefined ? formatRValue(actualR) : outcome}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

DaySummaryCard.displayName = 'DaySummaryCard';

interface MyTradesProps {
  overrideUserId?: string;
  readOnly?: boolean;
}

export default function MyTrades({ overrideUserId, readOnly = false }: MyTradesProps = {}) {
  // ✅ 1. ALL HOOKS MUST BE AT THE TOP (Rules of Hooks!)
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // 🔥 ADD: for cross-page cache invalidation

  // 🔥 FIXED: Now using useEffectiveUser for admin impersonation support
  const { id: fallbackUserId, isImpersonating, isMentorView } = useEffectiveUser();
  const userId = overrideUserId ?? fallbackUserId;
  // Mentor View browses a student's journal read-only; treat like the prop.
  const effectiveReadOnly = readOnly || isMentorView;

  // 🔥 NEW: Timezone context
  const timezone = useTimezone();
  
  // 🔥 Load global 1R from settings
  const { oneR, settings: riskSettings, loading: riskLoading } = useRiskSettings();
  const rBasisMode = riskSettings?.rBasisMode ?? 'per_trade';
  
  // ✅ 🔥 CRITICAL FIX: Now passing userId to useTrades!
  // This ensures we load the correct user's trades when admin impersonates
  const { effectivePortfolioId, activePortfolio, isTraderMode, isShowingAll, hiddenPortfolioIds } = usePortfolioContext();
  const { traderMode } = useTraderMode();
  // When viewing another user's journal (mentor view), do not apply the
  // logged-in mentor's portfolio filter — show all of the student's trades.
  const mentorPortfolioId = (overrideUserId || isMentorView) ? undefined : effectivePortfolioId;
  // TRADER mode: pass skipCopyAggregation so we receive raw per-account fills
  // instead of copy-aggregated rows. normalizeTraderTrades (below) then groups
  // them into decisions, matching Dashboard behaviour.
  const { data: rawTrades = [], isLoading, error } = useTrades(userId, mentorPortfolioId, { skipCopyAggregation: isTraderMode }, (isShowingAll || isTraderMode) ? hiddenPortfolioIds : undefined);
  // TRADER scope: normalize copier-duplicated rows into one decision per trade.
  // All downstream stats and the table operate on `trades` (the normalized array).
  // Non-TRADER: `trades` === `rawTrades` (zero cost, referentially stable).
  const trades = useMemo(
    () =>
      isTraderMode
        ? normalizeTraderTrades(rawTrades as Parameters<typeof normalizeTraderTrades>[0], traderMode)
        : rawTrades,
    [isTraderMode, rawTrades, traderMode],
  ) as typeof rawTrades;
  const { data: strategies = [] } = useStrategiesOptimized(userId);
  const { data: strategyRConfigs } = useStrategyRConfigs(userId);

  // 🔥 NEW: Using centralized mutations from hooks
  const { mutate: deleteTradeMutation } = useDeleteTrade();
  const { mutateAsync: updateTradeMutation } = useUpdateTrade();
  const { mutateAsync: bulkDeleteMutation } = useBulkDeleteTrades();
  
  // ✅ 2. All useState together
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"trades" | "days">("trades");
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>("day");
  const [expandedDayKeys, setExpandedDayKeys] = useState<Set<string>>(() => new Set());
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isSettingR, setIsSettingR] = useState(false);
  const [stopInput, setStopInput] = useState('');
  const [savingR, setSavingR] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showManageConnections, setShowManageConnections] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<string | null>(null);
  const [autoLinkLoading, setAutoLinkLoading] = useState(false);

  // Trade-detail modal: tab + chart chrome lifted up so the Dark/Fullscreen
  // controls share one row with the tabs (chart owns the reclaimed height).
  const [tradeDetailTab, setTradeDetailTab] = useState('chart');
  const [detailChartTheme, setDetailChartTheme] = useChartTheme('light');
  const [detailChartFullscreen, setDetailChartFullscreen] = useState(false);
  // Editable per-trade reflection (seeded when a trade opens, saved on demand).
  const [setupDraft, setSetupDraft] = useState('');
  const [emotionDraft, setEmotionDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  // Screenshot upload in the trade-detail modal.
  const [uploadingShots, setUploadingShots] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // ── Bulk selection state ───────────────────────────────────────────────────
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(() => new Set());

  // ── FINO page context — overall journal summary + the trade currently open ──
  const finoEntity = useMemo(
    () =>
      selectedTrade
        ? {
            type: 'trade',
            symbol: selectedTrade.symbol,
            side: selectedTrade.side,
            pnl: selectedTrade.pnl,
            rr: selectedTrade.rr,
            riskUsd: selectedTrade.risk_usd,
            rewardUsd: selectedTrade.reward_usd,
            entryPrice: selectedTrade.entry_price,
            exitPrice: selectedTrade.exit_price,
            stopPrice: selectedTrade.stop_price,
            qualityTag: selectedTrade.quality_tag,
            session: selectedTrade.session,
            openAt: selectedTrade.open_at,
            closeAt: selectedTrade.close_at,
          }
        : null,
    [selectedTrade],
  );
  useRegisterJournalFinoContext(finoEntity);

  // ✅ 3. useEffect

  // Prime the TradeChart chunk immediately on page mount so that by the time
  // the user clicks a trade, the lazy import is already resolved and parsed.
  useEffect(() => {
    void import('@/components/journal/TradeChart');
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(63, 63, 70, 0.5); border-radius: 3px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(63, 63, 70, 0.7); }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (style.parentNode) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // 🔥 v10.2.0: Sync trade count on mount (fixes desync when trigger installed after trades)
  useEffect(() => {
    if (!userId) return;
    void supabase.rpc('sync_trade_count_for_user', { p_user_id: userId })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
      });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // TRADER scope: normalise to one row per decision before stat/table computation
  const displayTrades = useMemo(() => {
    if (!isTraderMode) return trades;
    // normalizeTraderTrades expects ascending order; useTrades returns descending
    const ascending = [...trades].reverse();
    const normalized = normalizeTraderTrades(ascending, traderMode);
    // Return descending to match the rest of the page's expectations
    return [...normalized].reverse();
  }, [trades, isTraderMode, traderMode]);

  // ✅ 4. 🚀 OPTIMIZED: Stats calculation - single pass, memoized
const stats = useMemo<Stats>(() => {
  // 🔥 Support both modes for closed trades detection
  const closedTrades = displayTrades.filter(t => {
    if (t.input_mode === 'risk-only') {
      // 🔥 Risk-Only: closed ONLY if has result (pnl is not null)
      return t.pnl !== null && t.pnl !== undefined;
    }
    // Summary mode: closed if has exit_price
    return t.exit_price != null;
  });
  const total = closedTrades.length;
  
  if (total === 0) {
    return { totalTrades: 0, winRate: 0, totalPnL: 0, avgR: 0, wins: 0, losses: 0, breakeven: 0 };
  }

  let wins = 0, losses = 0, breakeven = 0, totalPnL = 0, totalR = 0, rCount = 0;

    // 🚀 OPTIMIZED: Single loop instead of multiple passes
    closedTrades.forEach(trade => {
      const { pnl, outcome } = getTradeData(trade, oneR, rBasisMode);
      // Canonical R: strategy-planned → stop-based, never global user-1R
      const canonicalR = tradeR(trade);

      if (outcome === "WIN") wins++;
      else if (outcome === "LOSS") losses++;
      else if (outcome === "BE") breakeven++;

      totalPnL += pnl;

      if (canonicalR !== null) {
        totalR += canonicalR;
        rCount++;
      }
    });

    return {
      totalTrades: total,
      winRate: (wins / total) * 100,
      totalPnL,
      avgR: rCount > 0 ? totalR / rCount : 0,
      wins,
      losses,
      breakeven,
    };
  }, [displayTrades, oneR, rBasisMode]);

  // ✅ 5. 🚀 OPTIMIZED: Filtered trades - memoized
  const filteredTrades = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return displayTrades.filter(trade => {
      return (
        trade.symbol.toLowerCase().includes(query) ||
        (trade.strategy_name && trade.strategy_name.toLowerCase().includes(query)) ||
        trade.setup?.toLowerCase().includes(query) ||
        trade.notes?.toLowerCase().includes(query) ||
        (trade.session && formatSessionDisplay(trade.session).toLowerCase().includes(query))
      );
    });
  }, [displayTrades, searchQuery]);

  const periodSummaries = useMemo<DaySummary[]>(() => (
    buildTradeSummaries(filteredTrades, oneR, timezone, summaryPeriod)
  ), [filteredTrades, oneR, timezone, summaryPeriod]);

  // ✅ 6. All useCallback handlers
  const openTrade = useCallback((trade: Trade) => {
    setSelectedTrade(trade);
    setSetupDraft(trade.setup ?? '');
    setEmotionDraft(trade.emotion ?? '');
    setNotesDraft(trade.notes ?? '');
    setTradeDetailTab('chart');
    setDrawerOpen(true);
  }, []);

  const handleSaveNotes = useCallback(async () => {
    if (!selectedTrade) return;
    setSavingNotes(true);
    try {
      const updated = await updateTradeMutation({
        id: selectedTrade.id,
        data: {
          setup: setupDraft.trim() || null,
          emotion: emotionDraft.trim() || null,
          notes: notesDraft.trim() ? notesDraft : null,
        },
      });
      if (updated) setSelectedTrade(updated as Trade);
      toast.success('Saved');
    } catch (err) {
      console.error('Failed to save notes', err);
      toast.error('Could not save');
    } finally {
      setSavingNotes(false);
    }
  }, [selectedTrade, setupDraft, emotionDraft, notesDraft, updateTradeMutation]);

  const handleUploadScreenshots = useCallback(async (files: FileList | null) => {
    if (!selectedTrade || !files || files.length === 0) return;
    const existing = selectedTrade.screenshots ?? (selectedTrade.screenshot_url ? [selectedTrade.screenshot_url] : []);
    const MAX = 4;
    const room = MAX - existing.length;
    if (room <= 0) {
      toast.error(`Up to ${MAX} screenshots per trade`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    setUploadingShots(true);
    try {
      const urls: string[] = [];
      for (const file of picked) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}: max 5MB`);
          continue;
        }
        let toUpload = file;
        try {
          toUpload = await compressImage(file);
        } catch {
          /* compression failed — upload the original */
        }
        const url = await uploadScreenshot(toUpload);
        if (url) urls.push(url);
      }
      if (urls.length > 0) {
        const next = [...existing, ...urls];
        const updated = await updateTradeMutation({
          id: selectedTrade.id,
          data: { screenshots: next, screenshot_url: null },
        });
        if (updated) setSelectedTrade(updated as Trade);
        toast.success(`${urls.length} screenshot${urls.length > 1 ? 's' : ''} added`);
      }
    } catch (err) {
      console.error('Screenshot upload failed', err);
      toast.error('Upload failed');
    } finally {
      setUploadingShots(false);
      if (screenshotInputRef.current) screenshotInputRef.current.value = '';
    }
  }, [selectedTrade, updateTradeMutation]);

  const handleRemoveScreenshot = useCallback(async (index: number) => {
    if (!selectedTrade) return;
    const existing = selectedTrade.screenshots ?? (selectedTrade.screenshot_url ? [selectedTrade.screenshot_url] : []);
    const next = existing.filter((_, i) => i !== index);
    try {
      const updated = await updateTradeMutation({
        id: selectedTrade.id,
        data: { screenshots: next, screenshot_url: null },
      });
      if (updated) setSelectedTrade(updated as Trade);
      toast.success('Screenshot removed');
    } catch (err) {
      console.error('Failed to remove screenshot', err);
      toast.error('Could not remove screenshot');
    }
  }, [selectedTrade, updateTradeMutation]);

  const toggleDayExpanded = useCallback((dayKey: string) => {
    setExpandedDayKeys((previous) => {
      const next = new Set(previous);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  }, []);

  const handleEditTrade = useCallback((tradeId: string) => {
    setDrawerOpen(false);
    navigate(`/app/journal/new?edit=${tradeId}`);
  }, [navigate]);

  const handleDeleteClick = useCallback((tradeId: string) => {
    setTradeToDelete(tradeId);
    setDeleteDialogOpen(true);
  }, []);

  // 🔥 NEW: Using centralized deleteTrade from @/lib/trades
  const handleAssignStrategy = useCallback(async (trade: Trade, strategyId: string) => {
    if (!strategyId || trade.strategy_id === strategyId) return;

    const strategy = strategies.find((item) => item.id === strategyId);

    try {
      await updateTradeMutation({
        id: trade.id,
        data: { strategy_id: strategyId },
      });

      toast.success(strategy?.name ? `Assigned to ${strategy.name}` : "Strategy assigned");
    } catch (error: any) {
      console.error('Assign strategy error:', error);
      toast.error(error?.message || "Failed to assign strategy");
    }
  }, [strategies, updateTradeMutation]);

  const handleSetR = useCallback(async () => {
    if (!selectedTrade) return;
    const stop = Number(stopInput);
    if (!Number.isFinite(stop) || stop <= 0) {
      toast.error('Enter a valid stop price');
      return;
    }
    if (stop === Number(selectedTrade.entry_price)) {
      toast.error('Stop price cannot equal entry price');
      return;
    }
    setSavingR(true);
    try {
      const updated = await updateTradeMutation({
        id: selectedTrade.id,
        data: { stop_price: stop },
      });
      if (updated) setSelectedTrade(updated as Trade);
      setIsSettingR(false);
      setStopInput('');
      toast.success('R set from stop price');
    } catch (error: any) {
      console.error('Set R error:', error);
      toast.error(error?.message || 'Failed to set R');
    } finally {
      setSavingR(false);
    }
  }, [selectedTrade, stopInput, updateTradeMutation]);

  const confirmDeleteTrade = useCallback(async () => {
    if (!tradeToDelete) return;

    try {
      // A visible row in "All Accounts" view can aggregate the same trade copied
      // across multiple accounts. Delete ALL underlying copies of the selected row,
      // not just the representative — otherwise siblings survive and the row returns.
      const row = filteredTrades.find((t) => t.id === tradeToDelete);
      const idsToDelete = row?.group_trade_ids ?? [tradeToDelete];
      const result = idsToDelete.length > 1
        ? await bulkDeleteTrades(idsToDelete)
        : await deleteTrade(tradeToDelete);

      if (result.success) {
        toast.success("Trade deleted successfully");
        setDrawerOpen(false);
        setDeleteDialogOpen(false);
        setTradeToDelete(null);
        
        // 🔥 FIX: invalidateQueries triggers Overview to refetch stats automatically
        await queryClient.invalidateQueries({ queryKey: ['trades'] });
        // 🔥 v10.2.0: Refresh subscription limits (count doesn't decrease but UI should update)
        await queryClient.invalidateQueries({ queryKey: ['subscription'] });
      } else {
        toast.error(result.error || "Failed to delete trade");
      }
    } catch (error: any) {
      console.error('Delete trade error:', error);
      toast.error(error?.message || "Failed to delete trade");
    }
  }, [tradeToDelete, queryClient, filteredTrades]);

  // 🔥 NEW: Quick update handler (for future inline edits)
  const handleQuickUpdate = useCallback(async (tradeId: string, updates: Partial<Trade>) => {
    try {
      const result = await updateTrade(tradeId, updates);

      if (result.success) {
        toast.success("Trade updated successfully");
        // 🔥 FIX: invalidateQueries triggers Overview to refetch stats automatically
        await queryClient.invalidateQueries({ queryKey: ['trades'] });
      } else {
        toast.error(result.error || "Failed to update trade");
      }
    } catch (error: any) {
      console.error('Update trade error:', error);
      toast.error(error?.message || "Failed to update trade");
    }
  }, [queryClient]);

  // ── Bulk selection callbacks ───────────────────────────────────────────────

  const handleToggleTradeSelection = useCallback((tradeId: string) => {
    setSelectedTradeIds((prev) => {
      const next = new Set(prev);
      if (next.has(tradeId)) {
        next.delete(tradeId);
      } else {
        next.add(tradeId);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedTradeIds((prev) => {
      const allVisible = filteredTrades.map((t) => t.id);
      // If all visible are already selected → deselect all; otherwise select all.
      const allSelected = allVisible.length > 0 && allVisible.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(allVisible);
    });
  }, [filteredTrades]);

  const handleClearSelection = useCallback(() => {
    setSelectedTradeIds(new Set());
  }, []);

  // ── Bulk-delete handler (passed to BulkActionBar) ─────────────────────────

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    // Each visible row may aggregate multiple underlying trades (same trade copied
    // across accounts in "All Accounts" view). Expand the selected representative ids
    // to ALL underlying trade ids so the whole selected row is deleted, not just one copy.
    const byId = new Map(filteredTrades.map((t) => [t.id, t]));
    const expandedIds = Array.from(
      new Set(ids.flatMap((id) => byId.get(id)?.group_trade_ids ?? [id]))
    );
    await bulkDeleteMutation(expandedIds);
    await queryClient.invalidateQueries({ queryKey: ['trades'] });
    await queryClient.invalidateQueries({ queryKey: ['subscription'] });
  }, [bulkDeleteMutation, queryClient, filteredTrades]);

  // ── Bulk-tag handler (passed to BulkActionBar) ────────────────────────────
  // Merges a new tag into each selected trade's tags array (union).

  const handleBulkTag = useCallback(async (ids: string[], tag: string) => {
    const tradeMap = new Map(filteredTrades.map((t) => [t.id, t]));
    await Promise.all(
      ids.map(async (id) => {
        const trade = tradeMap.get(id);
        if (!trade) return;
        const existingTags: string[] = Array.isArray(trade.tags) ? trade.tags : [];
        if (existingTags.includes(tag)) return; // already has tag — skip
        await updateTradeMutation({ id, data: { tags: [...existingTags, tag] } });
      }),
    );
    await queryClient.invalidateQueries({ queryKey: ['trades'] });
  }, [filteredTrades, updateTradeMutation, queryClient]);

  const handleAutoLink = useCallback(async () => {
    if (autoLinkLoading) return;
    setAutoLinkLoading(true);
    try {
      const { data, error } = await supabase.rpc('auto_link_user_trades');
      if (error) {
        toast.error('Auto-link failed: ' + error.message);
      } else {
        const n = typeof data === 'number' ? data : 0;
        toast.success(
          n > 0
            ? `Linked ${n} trade${n === 1 ? '' : 's'} to strategies`
            : 'No new trades matched your strategy rules',
        );
        await queryClient.invalidateQueries({ queryKey: ['trades'] });
      }
    } finally {
      setAutoLinkLoading(false);
    }
  }, [autoLinkLoading, queryClient]);

  const exportTrades = useCallback(() => {
    if (filteredTrades.length === 0) {
      toast.error("No trades to export");
      return;
    }

    const headers = [
      "Date", "Symbol", "Side", "Session", "Entry Price", "Exit Price", "Stop Price", "Take Profit",
      "Quantity", "P&L", "Outcome", "Actual R", "Quality", "Strategy", "Setup",
      "Notes", "Fees", "Multiplier", "Risk USD",
      "Option Type", "Strike", "Expiration", "DTE"
    ];

    const rows = filteredTrades.map(trade => {
      const { pnl, actualR, outcome, multiplier, riskUSD } = getTradeData(trade, oneR, rBasisMode);

      return [
        formatTradeDate(trade.open_at, timezone),
        trade.symbol,
        trade.side,
        trade.session ? formatSessionDisplay(trade.session) : "",
        trade.entry_price,
        trade.exit_price || "",
        trade.stop_price,
        trade.take_profit_price || "",
        trade.quantity,
        pnl.toFixed(2),
        outcome === "WIN" ? "Win" : outcome === "LOSS" ? "Loss" : outcome === "BE" ? "Break Even" : "Open",
        actualR !== null ? actualR.toFixed(2) + "R" : "",
        trade.quality_tag || "",
        trade.strategy_name || "",
        trade.setup || "",
        trade.notes?.replace(/,/g, ";") || "",
        trade.fees,
        multiplier,
        riskUSD.toFixed(2),
        trade.asset_class === 'options' ? (trade.option_type || "") : "",
        trade.asset_class === 'options' && trade.strike_price != null ? trade.strike_price : "",
        trade.asset_class === 'options' ? (trade.expiration_date || "") : "",
        trade.asset_class === 'options' ? (getDTE(trade.expiration_date) ?? "") : ""
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `trades_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredTrades.length} trades`);
  }, [filteredTrades, oneR, timezone, rBasisMode]);

  // ✅ 7. Loading state - ONLY AFTER ALL HOOKS!
  if (riskLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  // ✅ 8. Main render
  return (
    <div className="flex flex-col h-full pl-3">
      {/* Header */}
      <div className="flex flex-wrap items-center px-6 py-4 gap-4">
        <h1 className="text-2xl font-bold text-white">My Trades</h1>

        {/* Account filter — matches Overview exactly */}
        <AccountFilterDropdown onManage={() => setShowManageConnections(true)} />

        <FinoExplains title="What is My Trades?" className="mt-ds-3 ml-auto w-fit">
          Your complete trade history in one table. Sort and filter by ticker, strategy, date or
          result, search any trade, and click a row to review and annotate it. This is the raw
          record behind all your journal analytics.
        </FinoExplains>
      </div>

      {/* 🔥 Admin Impersonation Indicator */}
      {isImpersonating && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-6 py-2">
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Admin Mode: Viewing user's trades</span>
          </div>
        </div>
      )}

      {/* Compact Stats Bar */}
      <div className="border-b border-zinc-900/50">
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatsCard
              icon={Target}
              title="Total Trades"
              value={stats.totalTrades.toString()}
              subtitle={stats.totalTrades > 0 ? `${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE` : undefined}
              color="rgba(59, 130, 246, 0.1)"
            />
            
            <StatsCard
              icon={TrendingUp}
              title="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              subtitle={stats.totalTrades > 0 ? `${stats.wins} / ${stats.totalTrades} trades` : undefined}
              color="rgba(16, 185, 129, 0.1)"
            />
            
            <StatsCard
              icon={DollarSign}
              title="Net P&L"
              value={formatSignedCurrency(stats.totalPnL)}
              subtitle={stats.totalPnL !== 0 ? (stats.totalPnL >= 0 ? 'Profit' : 'Loss') : undefined}
              color="rgba(234, 179, 8, 0.1)"
              valueColor={stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}
            />
            
            <StatsCard
              icon={Award}
              title="Avg R"
              value={`${stats.avgR >= 0 ? '+' : ''}${stats.avgR.toFixed(2)}R`}
              subtitle="Per trade"
              color="rgba(168, 85, 247, 0.1)"
              valueColor={stats.avgR >= 0 ? 'text-emerald-400' : 'text-red-400'}
            />
          </div>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="border-b border-zinc-800 bg-zinc-950/30">
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search symbol, strategy, session..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-800"
              />
            </div>
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as "trades" | "days")}>
              <SelectTrigger className="h-11 w-40 rounded-[12px] border-gold-primary/70 bg-surface-base text-ink-primary shadow-glow-gold-active">
                <CalendarDays className="mr-ds-2 h-4 w-4 text-gold-primary" />
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent className="border-border-ds-subtle bg-surface-base text-ink-primary">
                <SelectItem value="trades">By Trades</SelectItem>
                <SelectItem value="days">By Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            {!effectiveReadOnly && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-zinc-800 bg-zinc-900/50"
                      onClick={handleAutoLink}
                      disabled={autoLinkLoading}
                      title="Link unlinked trades to strategies whose match rules fit them."
                    >
                      <RefreshCw className={`w-4 h-4 ${autoLinkLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Auto-link strategies</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-zinc-800 bg-zinc-900/50"
                    onClick={exportTrades}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export Trades</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {!effectiveReadOnly && (
              <Button
                onClick={() => navigate("/app/journal/new")}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Trade
              </Button>
            )}
          </div>
        </div>
      </div>

      <WhisperSetupsPanel />

      {/* Trades Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-zinc-500">Loading trades...</div>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
              <Target className="w-8 h-8 text-zinc-600" />
            </div>
            <div className="text-center">
              <div className="text-zinc-400 font-medium">No trades found</div>
              <div className="text-zinc-600 text-sm mt-1">
                {searchQuery ? "Try adjusting your search" : "Start by adding your first trade"}
              </div>
            </div>
            {!searchQuery && !effectiveReadOnly && (
              <Button
                onClick={() => navigate("/app/journal/new")}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Trade
              </Button>
            )}
          </div>
        ) : viewMode === "days" ? (
          <div className="min-w-0">
            <div className="border-b border-border-ds-subtle bg-surface-base px-ds-4 py-ds-4">
              <div className="mb-ds-4 flex flex-wrap items-center justify-between gap-ds-3">
                <div className="inline-flex overflow-hidden rounded-[10px] border border-border-ds-default bg-surface-1">
                  <button
                    type="button"
                    onClick={() => setSummaryPeriod("day")}
                    className={`border-r border-gold-primary/35 px-ds-4 py-ds-2 text-sm font-semibold transition-colors duration-base ${
                      summaryPeriod === "day"
                        ? "bg-gold-primary/10 text-gold-primary shadow-glow-gold-active"
                        : "text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummaryPeriod("week")}
                    className={`px-ds-4 py-ds-2 text-sm font-semibold transition-colors duration-base ${
                      summaryPeriod === "week"
                        ? "bg-gold-primary/10 text-gold-primary shadow-glow-gold-active"
                        : "text-ink-muted hover:text-ink-primary"
                    }`}
                  >
                    Week
                  </button>
                </div>
                <div className="flex items-center gap-ds-2">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center rounded-[10px] border border-gold-primary/40 bg-black px-ds-4 text-sm font-semibold text-gold-primary transition-colors duration-base hover:border-gold-primary"
                  >
                    Start my day
                  </button>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border-ds-default bg-surface-1 text-gold-primary transition-colors duration-base hover:border-gold-primary/50"
                    aria-label="Daily view settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-ds-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase text-gold-primary">{summaryPeriod === "week" ? "Weekly Performance" : "Daily Performance"}</div>
                  <div className="mt-1 text-sm text-ink-secondary">
                    {periodSummaries.length} {summaryPeriod === "week" ? "trading weeks" : "trading days"} from {filteredTrades.length} matching trades
                  </div>
                </div>
                <div className="text-sm text-ink-secondary tabular-nums">Net {formatSignedCurrency(periodSummaries.reduce((sum, day) => sum + day.netPnl, 0), 2)}</div>
              </div>
            </div>
            {periodSummaries.map((day) => (
              <DaySummaryCard
                key={day.key}
                day={day}
                oneR={oneR}
                timezone={timezone}
                period={summaryPeriod}
                expanded={expandedDayKeys.has(day.key)}
                onToggle={() => toggleDayExpanded(day.key)}
                onOpenTrade={openTrade}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0"><Table>
            <TableHeader>
  <TableRow className="border-zinc-800 hover:bg-transparent">
    {/* Select-all checkbox */}
    <TableHead className="w-10 pr-0">
      {(() => {
        const allVisibleIds = filteredTrades.map((t) => t.id);
        const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedTradeIds.has(id));
        const someSelected = allVisibleIds.some((id) => selectedTradeIds.has(id));
        return (
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={handleToggleSelectAll}
            aria-label="Select all visible trades"
            className="checkbox-gold"
          />
        );
      })()}
    </TableHead>
    <TableHead className="text-zinc-500">Date</TableHead>
    <TableHead className="text-zinc-500">Symbol</TableHead>
    <TableHead className="text-zinc-500 w-10">Grade</TableHead>
    <TableHead className="text-zinc-500">Side</TableHead>
    <TableHead className="text-zinc-500">Session</TableHead>
    <TableHead className="text-zinc-500">Entry / Risk</TableHead>
    <TableHead className="text-zinc-500">Exit / Target</TableHead>
    <TableHead className="text-zinc-500">P&L</TableHead>
    <TableHead className="text-zinc-500">Outcome</TableHead>
    <TableHead className="text-zinc-500">R</TableHead>
    <TableHead className="text-zinc-500">Strategy</TableHead>
    <TableHead className="text-zinc-500 text-right">Actions</TableHead>
  </TableRow>
</TableHeader>
            <TableBody>
              {filteredTrades.map((trade) => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  oneR={oneR}
                  timezone={timezone}
                  strategies={strategies}
                  onOpen={openTrade}
                  onEdit={handleEditTrade}
                  onDelete={handleDeleteClick}
                  onAssignStrategy={handleAssignStrategy}
                  isSelected={selectedTradeIds.has(trade.id)}
                  onToggleSelect={handleToggleTradeSelection}
                  readOnly={effectiveReadOnly}
                />
              ))}
            </TableBody>
          </Table></div>
        )}
      </div>

      {/* Bulk Action Bar — mounts globally, visible when >=1 trade is selected */}
      <BulkActionBar
        selectedIds={selectedTradeIds}
        onClearSelection={handleClearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkTag={handleBulkTag}
      />

      {/* Trade Details Dialog */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-w-[96vw] w-[1450px] h-[92vh] p-0 border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl">
          {selectedTrade && (() => {
  const selStrategyCfg = strategyRConfigs?.get?.(selectedTrade.strategy_id ?? '') ?? null;
  const resolved1R = resolvePlanned1R(selectedTrade as any, selStrategyCfg, oneR);
const { pnl, outcome, multiplier, actualR, riskUSD, isClosed } = getTradeData(selectedTrade, oneR, rBasisMode, resolved1R.value);
  const displayR = actualR;
  const canSetR =
    isClosed &&
    selectedTrade.input_mode !== 'risk-only' &&
    rBasisMode === 'per_trade' &&
    resolved1R.value == null;
  const behaviorTags = rBasisMode === 'per_trade' ? detectBehavior(selectedTrade as any, selStrategyCfg, resolved1R.value) : [];
  const oneRLabel =
    resolved1R.source === 'strategy' ? 'strategy' :
    resolved1R.source === 'trade' ? 'trade' :
    resolved1R.source === 'stop' ? 'stop' :
    resolved1R.source === 'global' ? 'global 1R' : '—';
            return (
            <div className="flex h-full max-h-full overflow-hidden">
              {/* Left Side - Trade Information */}
              <div className="w-[400px] border-r border-zinc-800 flex flex-col bg-zinc-900/30 shrink-0">
                <div className="px-5 py-3 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-900/80 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="text-xl font-bold text-white">{selectedTrade.symbol}</div>
                      <Badge 
                        variant={selectedTrade.side === "LONG" ? "outline" : "destructive"}
                        className={selectedTrade.side === "LONG" 
                          ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10 font-medium text-xs px-2 py-0.5" 
                          : "bg-red-500/20 border-red-500/50 text-red-400 font-medium text-xs px-2 py-0.5"
                        }
                      >
                        {selectedTrade.side}
                      </Badge>
                      {/* 🔥 NEW: Session badge in header */}
                      {selectedTrade.session && (
                        <Badge 
                          variant="outline"
                          className={`text-xs ${getSessionColor(selectedTrade.session)}`}
                        >
                          {formatSessionDisplay(selectedTrade.session)}
                        </Badge>
                      )}
                    </div>
                    {outcome && (
                      <Badge 
                        variant={outcome === "WIN" ? "outline" : outcome === "LOSS" ? "destructive" : "secondary"}
                        className={`font-semibold text-xs px-2 py-0.5 ${outcome === "WIN" ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : ""}`}
                      >
                        {outcome === "WIN" ? "Win" : outcome === "LOSS" ? "Loss" : outcome === "BE" ? "Break Even" : "Open"}
                      </Badge>
                    )}
                  </div>
                  {/* 🔥 NEW: Show formatted date with timezone */}
                  <div className="text-xs text-zinc-500 mt-2">
                    {formatTradeDate(selectedTrade.open_at, timezone)}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 min-h-0 custom-scrollbar">
                  {/* Trade Outcome Section */}
                  <div className="rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-900/30 p-3 shadow-lg">
                    <h3 className="text-[11px] font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Trade Outcome</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Outcome
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={outcome === "WIN" ? "outline" : outcome === "LOSS" ? "destructive" : "secondary"}
                            className={`text-xs font-semibold ${outcome === "WIN" ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : ""}`}
                          >
                            {outcome === "WIN" ? "Win" : outcome === "LOSS" ? "Loss" : outcome === "BE" ? "Break Even" : "Open"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1">
  <DollarSign className="w-3 h-3" />
  P&L
</div>
<div className={`text-base font-bold ${
  !isClosed ? 'text-zinc-500' :
  pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
}`}>
  {isClosed ? (
    <>{pnl >= 0 ? '+' : ''}${formatNumber(Math.abs(pnl), 2)}</>
  ) : (
    '—'
  )}
</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Actual R
                        </div>
                        <div className={`text-base font-bold ${
                          displayR && displayR > 0 ? 'text-emerald-400' :
                          displayR && displayR < 0 ? 'text-red-400' :
                          'text-zinc-400'
                        }`}>
                          {displayR !== null && displayR !== undefined ? formatRValue(displayR) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Duration
                        </div>
                        <div className="text-base font-semibold text-white">
                          {calculateDuration(selectedTrade.open_at, selectedTrade.close_at)}
                        </div>
                      </div>
                      {selectedTrade.quality_tag && (
                        <div>
                          <div className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            Quality
                          </div>
                          <Badge 
                            variant="outline" 
                            className="text-xs font-semibold border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
                          >
                            {selectedTrade.quality_tag}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price Details - 🔥 UPDATED: Handle Risk-Only mode */}
                  <div className="rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-900/30 p-3 shadow-lg">
                    <h3 className="text-[11px] font-semibold text-zinc-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                      {selectedTrade.input_mode === 'risk-only' ? 'Risk Details' : 'Price Details'}
                      {selectedTrade.input_mode === 'risk-only' && (
                        <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">RISK-ONLY</span>
                      )}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedTrade.input_mode === 'risk-only' ? (
                        <>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Risk Amount</div>
                            <div className="text-base font-semibold text-red-400">
                              ${formatNumber(selectedTrade.risk_usd || 0, 2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Target Amount</div>
                            <div className="text-base font-semibold text-emerald-400">
                              ${formatNumber(selectedTrade.reward_usd || 0, 2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Actual Result</div>
                            <div className={`text-base font-semibold ${(selectedTrade.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {(selectedTrade.pnl || 0) >= 0 ? '+' : ''}${formatNumber(selectedTrade.pnl || 0, 2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">R:R Ratio</div>
                            <div className="text-base font-semibold text-yellow-400">
                              1:{formatNumber(selectedTrade.rr || 0, 2)}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Entry Price</div>
                            <div className="text-base font-semibold text-white">
                              ${formatNumber(selectedTrade.entry_price, 2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Stop Loss</div>
                            <div className="text-base font-semibold text-red-400">
                              {selectedTrade.stop_price
                                ? `$${formatNumber(selectedTrade.stop_price, 2)}`
                                : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Take Profit</div>
                            <div className="text-base font-semibold text-emerald-400">
                              {selectedTrade.take_profit_price 
                                ? `$${formatNumber(selectedTrade.take_profit_price, 2)}` 
                                : "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Exit Price</div>
                            <div className="text-base font-semibold text-zinc-300">
                              {selectedTrade.exit_price 
                                ? `$${formatNumber(selectedTrade.exit_price, 2)}` 
                                : "—"}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Risk/Reward - 🔥 UPDATED: Handle Risk-Only mode */}
                  <div className="rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-900/30 p-3 shadow-lg">
                    <h3 className="text-[11px] font-semibold text-zinc-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                      Risk/Reward
                      {selectedTrade.input_mode === 'risk-only' && (
                        <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-400 bg-yellow-500/10">
                          Risk-Only Mode
                        </Badge>
                      )}
                      {multiplier && multiplier !== 1 && selectedTrade.input_mode !== 'risk-only' && (
                        <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-400 bg-blue-500/10">
                          {multiplier}x Multiplier
                        </Badge>
                      )}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedTrade.input_mode === 'risk-only' ? (
                        <>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Risk (USD)</div>
                            <div className="text-base font-bold text-red-400">
                              ${formatNumber(selectedTrade.risk_usd || 0, 2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Target (USD)</div>
                            <div className="text-base font-bold text-emerald-400">
                              ${formatNumber(selectedTrade.reward_usd || 0, 2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Planned R:R</div>
                            <div className="text-base font-semibold text-yellow-400">
                              1:{formatNumber(selectedTrade.rr || 0, 2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Actual R</div>
                            <div className={`text-base font-bold ${
                              actualR && actualR > 0 ? 'text-emerald-400' : 
                              actualR && actualR < 0 ? 'text-red-400' : 
                              'text-zinc-400'
                            }`}>
                              {actualR !== null && actualR !== undefined ? formatRValue(actualR) : '—'}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Risk per Point</div>
                            <div className="text-base font-semibold text-red-400">
                              {selectedTrade.stop_price
                                ? `$${formatNumber(Math.abs(selectedTrade.entry_price - selectedTrade.stop_price), 2)}`
                                : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Multiplier</div>
                            <div className="text-base font-bold text-blue-400">
                              {multiplier}x
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Quantity</div>
                            <div className="text-base font-semibold text-white">
                              {selectedTrade.quantity}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Total Risk</div>
                            <div className="text-base font-bold text-red-400">
                              ${formatNumber(riskUSD, 2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Fees</div>
                            <div className="text-base font-semibold text-zinc-300">
                              ${formatNumber(selectedTrade.fees, 2)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Risk basis: real contract R when a stop/risk exists; otherwise prompt to Set R */}
                    {selectedTrade.input_mode !== 'risk-only' && (
                      <div className="mt-3 pt-3 border-t border-zinc-800/50">
                        {rBasisMode === 'manual' ? (
                          <div className="text-xs text-zinc-500 space-y-1">
                            <div className="font-mono">
                              Trade Risk = ${formatNumber(riskUSD, 2)}
                            </div>
                            <div className="font-mono text-blue-400">
                              Your 1R (Settings) = ${formatNumber(oneR, 2)}
                            </div>
                            {selectedTrade.exit_price && displayR !== null && (
                              <div className={`font-mono font-semibold ${displayR > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                Actual R = ${formatNumber(Math.abs(pnl), 2)} ÷ ${formatNumber(oneR, 2)} = {displayR.toFixed(2)}R
                              </div>
                            )}
                          </div>
                        ) : resolved1R.value != null ? (
                          <div className="text-xs text-zinc-500 space-y-2">
                            <div className="font-mono">
                              1R = ${formatNumber(resolved1R.value, 2)} <span className="text-zinc-600">({oneRLabel})</span>
                            </div>
                            {selectedTrade.exit_price != null && displayR !== null && (
                              <div className={`font-mono font-semibold ${displayR > 0 ? 'text-emerald-400' : displayR < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                                Actual R = ${formatNumber(Math.abs(Number(selectedTrade.pnl) || 0), 2)} ÷ ${formatNumber(resolved1R.value, 2)} = {displayR.toFixed(2)}R
                              </div>
                            )}
                            {behaviorTags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {behaviorTags.map((t) => (
                                  <span
                                    key={t.kind}
                                    title={t.detail || ''}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                      t.kind === 'stop_not_honored'
                                        ? 'border-red-500/40 text-red-400 bg-red-500/10'
                                        : 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                                    }`}
                                  >
                                    {t.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : canSetR ? (
                          isSettingR ? (
                            <div className="space-y-2">
                              <div className="text-[11px] text-zinc-400">
                                Enter the stop price you placed for this trade — R is computed from it.
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="any"
                                  value={stopInput}
                                  onChange={(e) => setStopInput(e.target.value)}
                                  placeholder="Stop price"
                                  className="w-32 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
                                />
                                <button
                                  onClick={handleSetR}
                                  disabled={savingR}
                                  className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                                >
                                  {savingR ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                  onClick={() => { setIsSettingR(false); setStopInput(''); }}
                                  disabled={savingR}
                                  className="rounded-md border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs text-zinc-500">
                                No risk defined for this trade (no stop synced).
                              </div>
                              <button
                                onClick={() => { setIsSettingR(true); setStopInput(''); }}
                                className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-500"
                              >
                                Set R
                              </button>
                            </div>
                          )
                        ) : null}
                      </div>
                    )}
                    
                    {/* 🔥 NEW: Risk-Only mode calculation display */}
                    {selectedTrade.input_mode === 'risk-only' && (
                      <div className="mt-3 pt-3 border-t border-zinc-800/50">
                        <div className="text-xs text-zinc-500 space-y-1">
                          <div className="font-mono">
                            Risk = ${formatNumber(selectedTrade.risk_usd || 0, 2)}
                          </div>
                          <div className="font-mono">
                            Target = ${formatNumber(selectedTrade.reward_usd || 0, 2)}
                          </div>
                          <div className={`font-mono font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            Result = {pnl >= 0 ? '+' : ''}${formatNumber(pnl, 2)} ({actualR !== null ? formatRValue(actualR) : '—'})
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Position Details - 🔥 UPDATED WITH SESSION */}
                  <div className="rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-900/30 p-3 shadow-lg">
                    <h3 className="text-[11px] font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Position</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedTrade.asset_class && (
                        <div>
                          <div className="text-[11px] text-zinc-500 mb-1">Asset Class</div>
                          <div className="text-base font-semibold text-white capitalize">{selectedTrade.asset_class}</div>
                        </div>
                      )}
                      {selectedTrade.asset_class === 'options' && selectedTrade.option_type && (
                        <div>
                          <div className="text-[11px] text-zinc-500 mb-1">Type</div>
                          <div className={`text-base font-semibold ${selectedTrade.option_type === 'CALL' ? 'text-emerald-400' : 'text-red-300'}`}>
                            {selectedTrade.option_type}
                          </div>
                        </div>
                      )}
                      {selectedTrade.asset_class === 'options' && selectedTrade.strike_price != null && (
                        <div>
                          <div className="text-[11px] text-zinc-500 mb-1">Strike</div>
                          <div className="text-base font-semibold text-white">${formatNumber(selectedTrade.strike_price, 2)}</div>
                        </div>
                      )}
                      {selectedTrade.asset_class === 'options' && selectedTrade.expiration_date && (
                        <div>
                          <div className="text-[11px] text-zinc-500 mb-1">Expiration</div>
                          <div className="text-base font-semibold text-white">
                            {selectedTrade.expiration_date}
                            {(() => {
                              const dte = getDTE(selectedTrade.expiration_date);
                              return dte !== null ? (
                                <span className={`ml-1.5 text-xs font-normal ${dte < 0 ? 'text-zinc-400' : dte <= 7 ? 'text-amber-300' : 'text-zinc-400'}`}>
                                  ({dte < 0 ? 'expired' : `${dte}d`})
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      )}
                      {selectedTrade.asset_class === 'options' && getOptionBreakeven(selectedTrade) != null && (
                        <div>
                          <div className="text-[11px] text-zinc-500 mb-1">Breakeven</div>
                          <div className="text-base font-semibold text-white">${formatNumber(getOptionBreakeven(selectedTrade)!, 2)}</div>
                        </div>
                      )}
                      {selectedTrade.asset_class === 'forex' && (() => {
                        const { base, quote } = parseForexPair(selectedTrade.symbol);
                        const pipSize = selectedTrade.pip_size ?? getPipSize(selectedTrade.symbol);
                        const acct = selectedTrade.account_currency ?? 'USD';
                        const rate = selectedTrade.quote_rate ?? 1;
                        const crossCurrency = !!quote && quote !== acct.toUpperCase();
                        return (
                          <>
                            {base && quote && (
                              <div>
                                <div className="text-[11px] text-zinc-500 mb-1">Pair</div>
                                <div className="text-base font-semibold text-white">{base}/{quote}</div>
                              </div>
                            )}
                            <div>
                              <div className="text-[11px] text-zinc-500 mb-1">Pip Size</div>
                              <div className="text-base font-semibold text-white">{pipSize}</div>
                            </div>
                            {selectedTrade.lot_size != null && (
                              <div>
                                <div className="text-[11px] text-zinc-500 mb-1">Lot Size</div>
                                <div className="text-base font-semibold text-white">{selectedTrade.lot_size.toLocaleString()}</div>
                              </div>
                            )}
                            <div>
                              <div className="text-[11px] text-zinc-500 mb-1">Account Currency</div>
                              <div className="text-base font-semibold text-white">{acct}</div>
                            </div>
                            <div>
                              <div className="text-[11px] text-zinc-500 mb-1">Quote Rate</div>
                              <div className="text-base font-semibold text-white">
                                {rate}
                                <span className="ml-1.5 text-xs font-normal text-zinc-400">
                                  {crossCurrency ? `${quote}→${acct}` : 'no conversion'}
                                </span>
                              </div>
                              {crossCurrency && rate === 1 && (
                                <div className="text-[11px] text-amber-300 mt-1">
                                  Rate 1.0 — P&amp;L not converted to {acct}.
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-[11px] text-zinc-500 mb-1">FX Market</div>
                              <ForexMarketStatusChip />
                            </div>
                          </>
                        );
                      })()}
                      {selectedTrade.session && (
                        <div>
                          <div className="text-[11px] text-zinc-500 mb-1">Session</div>
                          <Badge 
                            variant="outline"
                            className={`text-xs ${getSessionColor(selectedTrade.session)}`}
                          >
                            {formatSessionDisplay(selectedTrade.session)}
                          </Badge>
                        </div>
                      )}
                      {selectedTrade.strategy_name && (
                        <div>
                          <div className="text-[11px] text-zinc-500 mb-1">Strategy</div>
                          <div className="text-base font-semibold text-yellow-400">
                            {selectedTrade.strategy_name}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions — hidden in read-only/mentor view */}
                  {!effectiveReadOnly && (
                    <div className="flex gap-2 pt-3 border-t border-zinc-800/50">
                      <Button
                        variant="outline"
                        className="flex-1 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 transition-all text-xs h-8"
                        onClick={() => handleEditTrade(selectedTrade.id)}
                      >
                        <Edit className="w-3 h-3 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 bg-red-600/90 hover:bg-red-600 transition-all text-xs h-8"
                        onClick={() => handleDeleteClick(selectedTrade.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  )}
                  
                  <div className="h-12"></div>
                </div>
              </div>

              {/* Right Side - Tabbed: Chart / Screenshots / Notes */}
              <div className="flex-1 flex flex-col min-h-0 bg-zinc-950/30">
                <Tabs value={tradeDetailTab} onValueChange={setTradeDetailTab} className="flex flex-1 flex-col min-h-0">
                  <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3">
                  <TabsList className="h-auto w-fit justify-start gap-1 rounded-lg border border-zinc-800 bg-zinc-900/70 p-1">
                    <TabsTrigger value="chart" className="gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-400 transition data-[state=active]:bg-zinc-800 data-[state=active]:text-yellow-300 data-[state=active]:shadow-none hover:text-zinc-200">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Chart
                    </TabsTrigger>
                    <TabsTrigger value="screenshots" className="gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-400 transition data-[state=active]:bg-zinc-800 data-[state=active]:text-yellow-300 data-[state=active]:shadow-none hover:text-zinc-200">
                      <Image className="h-3.5 w-3.5" />
                      Screenshots
                      {(selectedTrade.screenshots?.length || (selectedTrade.screenshot_url ? 1 : 0)) > 0 && (
                        <span className="ml-0.5 rounded-full bg-blue-500/20 px-1.5 text-[10px] font-bold text-blue-300">
                          {selectedTrade.screenshots?.length || 1}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-400 transition data-[state=active]:bg-zinc-800 data-[state=active]:text-yellow-300 data-[state=active]:shadow-none hover:text-zinc-200">
                      <FileText className="h-3.5 w-3.5" />
                      Notes
                    </TabsTrigger>
                  </TabsList>
                    {tradeDetailTab === 'chart' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailChartTheme(detailChartTheme === 'light' ? 'dark' : 'light')}
                          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700/60 bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-yellow-500/40 hover:bg-zinc-800 hover:text-yellow-300"
                          aria-label="Toggle chart theme"
                          title={`Switch to ${detailChartTheme === 'light' ? 'dark' : 'light'} theme`}
                        >
                          {detailChartTheme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                          {detailChartTheme === 'light' ? 'Dark' : 'Light'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailChartFullscreen(true)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700/60 bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-yellow-500/40 hover:bg-zinc-800 hover:text-yellow-300"
                          aria-label="Expand chart"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                          Fullscreen
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 📊 CHART TAB */}
                  <TabsContent value="chart" className="mt-0 min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-3 data-[state=active]:flex data-[state=active]:flex-col">
                    <Suspense fallback={<TradeChartSkeleton />}>
                      <TradeChart
                        trade={selectedTrade}
                        theme={detailChartTheme}
                        onToggleTheme={() => setDetailChartTheme(detailChartTheme === 'light' ? 'dark' : 'light')}
                        fullscreen={detailChartFullscreen}
                        onFullscreenChange={setDetailChartFullscreen}
                      />
                    </Suspense>
                  </TabsContent>

                  {/* 📸 SCREENSHOTS TAB */}
                  <TabsContent value="screenshots" className="mt-0 flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-3 custom-scrollbar">
                  <div className="rounded-xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-900/20 via-zinc-900/60 to-zinc-900/30 p-5 shadow-xl">
                    <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                      <Image className="w-5 h-5" />
                      📸 TRADE SCREENSHOT{(selectedTrade.screenshots && selectedTrade.screenshots.length > 1) ? 'S' : ''}
                    </h3>
                    
                    {!effectiveReadOnly && (selectedTrade.screenshots?.length ?? (selectedTrade.screenshot_url ? 1 : 0)) < 4 && (
                      <div
                        onClick={() => !uploadingShots && screenshotInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); handleUploadScreenshots(e.dataTransfer.files); }}
                        className="mb-4 flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/40 bg-zinc-950/50 p-8 text-center transition-all hover:border-blue-400/60 hover:bg-blue-900/10"
                      >
                        <input
                          ref={screenshotInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          multiple
                          className="hidden"
                          onChange={(e) => handleUploadScreenshots(e.target.files)}
                        />
                        {uploadingShots ? (
                          <>
                            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10">
                              <Upload className="h-10 w-10 animate-pulse text-blue-400" />
                            </div>
                            <div className="text-sm font-medium text-blue-300">Uploading...</div>
                          </>
                        ) : (
                          <>
                            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10">
                              <Upload className="h-10 w-10 text-blue-400" />
                            </div>
                            <div className="mb-1 text-sm font-medium text-zinc-200">Drop screenshots here — or click to upload</div>
                            <div className="text-xs text-zinc-500">PNG, JPG or WebP · up to 5MB · auto-compressed</div>
                          </>
                        )}
                      </div>
                    )}

                    {(selectedTrade.screenshots && selectedTrade.screenshots.length > 0) || selectedTrade.screenshot_url ? (
                      <div className="space-y-4">
                        {/* 🔥 תמיכה לאחור - אם יש רק screenshot_url ישן */}
                        {!selectedTrade.screenshots && selectedTrade.screenshot_url && (
                          <div className="bg-zinc-950 rounded-xl border-2 border-blue-500/30 overflow-hidden shadow-2xl group relative">
                            <img 
                              src={selectedTrade.screenshot_url} 
                              alt={`${selectedTrade.symbol} trade screenshot`}
                              className="w-full h-auto transition-all duration-300 cursor-zoom-in group-hover:scale-[1.02]"
                              onClick={() => window.open(selectedTrade.screenshot_url, '_blank')}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-chart.png';
                              }}
                            />
                            
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            
                            {/* Hover action */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="bg-black/90 backdrop-blur-sm rounded-lg px-4 py-2.5 text-xs text-zinc-300 flex items-center justify-between">
                                <span className="font-medium">Click to view full size</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* 🔥 תצוגת מערך תמונות חדש */}
                        {selectedTrade.screenshots && selectedTrade.screenshots.length > 0 && (
                          <div className={`grid gap-3 ${
                            selectedTrade.screenshots.length === 1 ? 'grid-cols-1' :
                            selectedTrade.screenshots.length === 2 ? 'grid-cols-2' :
                            'grid-cols-3'
                          }`}>
                            {selectedTrade.screenshots.map((url, idx) => (
                              <div
                                key={idx}
                                className="relative bg-zinc-950 rounded-xl border-2 border-blue-500/30 overflow-hidden shadow-2xl group"
                              >
                                {/* Screenshot Number Badge */}
                                <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-full bg-yellow-500 text-black text-xs font-bold">
                                  {idx + 1}/{selectedTrade.screenshots.length}
                                </div>

                                {!effectiveReadOnly && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveScreenshot(idx); }}
                                    className="absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-red-600/90 opacity-0 transition-all hover:bg-red-600 group-hover:opacity-100"
                                    aria-label="Remove screenshot"
                                  >
                                    <X className="h-4 w-4 text-white" />
                                  </button>
                                )}

                                {/* Image */}
                                <img
                                  src={url}
                                  alt={`Screenshot ${idx + 1}`}
                                  className="max-h-[420px] w-full object-contain cursor-zoom-in transition-all duration-300"
                                  onClick={() => window.open(url, '_blank')}
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder-chart.png';
                                  }}
                                />

                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="text-xs text-zinc-500 text-center bg-zinc-900/50 rounded-lg px-3 py-2">
                          📸 {selectedTrade.screenshots?.length || 1} screenshot(s) • Click to enlarge
                        </div>
                      </div>
                    ) : effectiveReadOnly ? (
                      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700/50 bg-zinc-950/40 p-10 text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                          <Image className="w-8 h-8 text-blue-400/50" />
                        </div>
                        <div className="text-zinc-500 text-sm font-medium">No screenshots added</div>
                      </div>
                    ) : null}
                  </div>
                  </TabsContent>

                  {/* 📝 NOTES TAB */}
                  <TabsContent value="notes" className="mt-0 flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-3 custom-scrollbar">
                  <div className="rounded-xl border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 via-zinc-900/60 to-zinc-900/30 p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        📝 Trade Notes & Analysis
                      </h3>
                      {selectedTrade.notes && (
                        <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">
                          {selectedTrade.notes.split(/\s+/).filter(Boolean).length} words
                        </span>
                      )}
                    </div>
                    
                    {!effectiveReadOnly ? (
                      <div className="space-y-4">
                        {/* Top half — structured reflection */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-400/90">
                              <Target className="h-3.5 w-3.5" />
                              Setup
                            </label>
                            <Textarea
                              value={setupDraft}
                              onChange={(e) => setSetupDraft(e.target.value)}
                              placeholder="What was the setup? Why did you take this trade?"
                              className="min-h-[96px] resize-y bg-zinc-950/70 border-yellow-500/20 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-yellow-500/30"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-400/90">
                              <Brain className="h-3.5 w-3.5" />
                              Emotion / Mindset
                            </label>
                            <Textarea
                              value={emotionDraft}
                              onChange={(e) => setEmotionDraft(e.target.value)}
                              placeholder="How did you feel before, during and after? (confident, FOMO, hesitant…)"
                              className="min-h-[96px] resize-y bg-zinc-950/70 border-yellow-500/20 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-yellow-500/30"
                            />
                          </div>
                        </div>

                        {/* Bottom half — free notes */}
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-400/90">
                            <FileText className="h-3.5 w-3.5" />
                            Notes
                          </label>
                          <Textarea
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            placeholder="Anything else you want to remember about this trade…"
                            className="min-h-[150px] resize-y bg-zinc-950/70 border-yellow-500/20 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-yellow-500/30"
                          />
                        </div>

                        <div className="flex items-center justify-end">
                          <Button
                            onClick={handleSaveNotes}
                            disabled={
                              savingNotes ||
                              (setupDraft === (selectedTrade.setup ?? '') &&
                                emotionDraft === (selectedTrade.emotion ?? '') &&
                                notesDraft === (selectedTrade.notes ?? ''))
                            }
                            className="h-8 bg-yellow-500 text-xs font-semibold text-black hover:bg-yellow-400 disabled:opacity-40"
                          >
                            {savingNotes ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ) : (selectedTrade.setup || selectedTrade.emotion || selectedTrade.notes) ? (
                      <div className="space-y-3">
                        {selectedTrade.setup && (
                          <div className="bg-zinc-950/70 rounded-xl border border-yellow-500/20 p-4">
                            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-yellow-400/80">Setup</div>
                            <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{selectedTrade.setup}</p>
                          </div>
                        )}
                        {selectedTrade.emotion && (
                          <div className="bg-zinc-950/70 rounded-xl border border-yellow-500/20 p-4">
                            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-yellow-400/80">Emotion / Mindset</div>
                            <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{selectedTrade.emotion}</p>
                          </div>
                        )}
                        {selectedTrade.notes && (
                          <div className="bg-zinc-950/70 rounded-xl border border-yellow-500/20 p-5 shadow-inner">
                            <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-medium">{selectedTrade.notes}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-zinc-950/50 rounded-xl border border-dashed border-zinc-700/50 p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                          <FileText className="w-6 h-6 text-yellow-400/50" />
                        </div>
                        <div className="text-zinc-500 text-sm font-medium mb-1">No notes added yet</div>
                      </div>
                    )}
                    
                    {/* Additional Details */}
                    {(selectedTrade.mistake || selectedTrade.next_time) && (
                      <div className="mt-4 pt-4 border-t border-yellow-500/10 space-y-3">
                        {selectedTrade.mistake && (
                          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                            <div className="text-xs font-semibold text-red-400 mb-1.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              MISTAKE IDENTIFIED
                            </div>
                            <div className="text-sm text-zinc-300 font-medium">{selectedTrade.mistake}</div>
                          </div>
                        )}
                        
                        {selectedTrade.next_time && (
                          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                            <div className="text-xs font-semibold text-emerald-400 mb-1.5 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" />
                              NEXT TIME I WILL...
                            </div>
                            <div className="text-sm text-zinc-300 font-medium">{selectedTrade.next_time}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Trade</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTrade}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageConnectionsModal
        open={showManageConnections}
        onOpenChange={setShowManageConnections}
        onAddConnection={() => setShowManageConnections(false)}
      />
    </div>
  );
}
