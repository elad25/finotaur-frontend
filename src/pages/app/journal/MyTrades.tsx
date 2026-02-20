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

import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useRiskSettings, calculateActualR, formatRValue } from "@/hooks/useRiskSettings";
import PageTitle from "@/components/PageTitle";
import { useTrades, useDeleteTrade, useUpdateTrade } from "@/hooks/useTradesData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, TrendingUp, TrendingDown, DollarSign, Target, Download, MoreVertical, Edit, Trash2, Clock, Award, FileText, Image, AlertTriangle, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/utils/smartCalc";
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
import { updateTrade, deleteTrade } from "@/lib/trades";

// 🔥 NEW: Import timezone utilities + session formatting
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatTradeDate } from '@/utils/dateFormatter';
import { formatSessionDisplay, getSessionColor } from '@/constants/tradingSessions';

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
  notes?: string;
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

interface Stats {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgR: number;
  wins: number;
  losses: number;
  breakeven: number;
}

// 🔥 UPDATED: Now calculates R based on global 1R from settings
const getTradeData = (trade: Trade, oneR: number) => {
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
  
  // 🔥 Determine actual R based on mode
  let actualR: number | null = null;
  
  if (isRiskOnlyMode) {
    if (hasRiskOnlyResult) {
      // 🔥 FIX: Priority order - check all sources for actual_r
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
      // 🔥 OPEN trade - show planned R:R ratio
      actualR = Number(trade.user_risk_r) || null;
    }
  } else {
    // Summary mode: use stored or calculate
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

// 🚀 OPTIMIZATION: Memoized TradeRow Component - 🔥 UPDATED WITH SESSION!
const TradeRow = memo(({ 
  trade,
  oneR,
  timezone,
  onOpen, 
  onEdit, 
  onDelete 
}: { 
  trade: Trade;
  oneR: number;
  timezone: string;
  onOpen: (trade: Trade) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const { pnl, actualR, outcome, isClosed, isRiskOnlyMode, riskUSD, rewardUSD } = useMemo(
    () => getTradeData(trade, oneR), 
    [trade, oneR]
  );
  
  const handleClick = useCallback(() => onOpen(trade), [trade, onOpen]);
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(trade.id);
  }, [trade.id, onEdit]);
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(trade.id);
  }, [trade.id, onDelete]);

  return (
    <TableRow 
      className="border-zinc-800 hover:bg-zinc-900/50 cursor-pointer"
      onClick={handleClick}
    >
      {/* Date */}
      <TableCell className="text-zinc-400">
        {formatTradeDate(trade.open_at, timezone)}
      </TableCell>
      
      {/* Symbol */}
      <TableCell className="font-medium text-white">
        {trade.symbol}
        {isRiskOnlyMode && (
          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-normal">
            $
          </span>
        )}
      </TableCell>
      
      {/* Side */}
      <TableCell>
        <Badge 
          variant={trade.side === "LONG" ? "outline" : "destructive"}
          className={trade.side === "LONG" ? "text-xs border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "text-xs"}
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
          variant={outcome === "WIN" ? "outline" : outcome === "LOSS" ? "destructive" : "secondary"}
          className={`text-xs ${
            outcome === "WIN" ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : 
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
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

TradeRow.displayName = 'TradeRow';

export default function MyTrades() {
  // ✅ 1. ALL HOOKS MUST BE AT THE TOP (Rules of Hooks!)
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // 🔥 ADD: for cross-page cache invalidation
  
  // 🔥 FIXED: Now using useEffectiveUser for admin impersonation support
  const { id: userId, isImpersonating } = useEffectiveUser();
  
  // 🔥 NEW: Timezone context
  const timezone = useTimezone();
  
  // 🔥 Load global 1R from settings
  const { oneR, loading: riskLoading } = useRiskSettings();
  
  // ✅ 🔥 CRITICAL FIX: Now passing userId to useTrades!
  // This ensures we load the correct user's trades when admin impersonates
  const { data: trades = [], isLoading, error } = useTrades(userId);
  
  // 🔥 NEW: Using centralized mutations from hooks
  const { mutate: deleteTradeMutation } = useDeleteTrade();
  const { mutate: updateTradeMutation } = useUpdateTrade();
  
  // ✅ 2. All useState together
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<string | null>(null);

  // ✅ 3. useEffect
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

  // ✅ 4. 🚀 OPTIMIZED: Stats calculation - single pass, memoized
const stats = useMemo<Stats>(() => {
  // 🔥 Support both modes for closed trades detection
  const closedTrades = trades.filter(t => {
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
      const { pnl, actualR, outcome } = getTradeData(trade, oneR);
      
      if (outcome === "WIN") wins++;
      else if (outcome === "LOSS") losses++;
      else if (outcome === "BE") breakeven++;

      totalPnL += pnl;

      if (actualR !== null && actualR !== undefined) {
        totalR += actualR;
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
  }, [trades, oneR]);

  // ✅ 5. 🚀 OPTIMIZED: Filtered trades - memoized
  const filteredTrades = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    return trades.filter(trade => {
      const matchesSearch = 
        trade.symbol.toLowerCase().includes(query) ||
        (trade.strategy_name && trade.strategy_name.toLowerCase().includes(query)) ||
        trade.setup?.toLowerCase().includes(query) ||
        trade.notes?.toLowerCase().includes(query) ||
        (trade.session && formatSessionDisplay(trade.session).toLowerCase().includes(query));
      
      if (!matchesSearch) return false;
      
      if (filterType === "all") return true;
      
      const { outcome } = getTradeData(trade, oneR);
      
      switch (filterType) {
        case "wins": return outcome === "WIN";
        case "losses": return outcome === "LOSS";
        case "open": return outcome === "OPEN";
        default: return true;
      }
    });
  }, [trades, searchQuery, filterType, oneR]);

  // ✅ 6. All useCallback handlers
  const openTrade = useCallback((trade: Trade) => {
    setSelectedTrade(trade);
    setDrawerOpen(true);
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
  const confirmDeleteTrade = useCallback(async () => {
    if (!tradeToDelete) return;

    try {
      const result = await deleteTrade(tradeToDelete);

      if (result.success) {
        toast.success("Trade deleted successfully");
        setDrawerOpen(false);
        setDeleteDialogOpen(false);
        setTradeToDelete(null);
        
        // 🔥 FIX: invalidateQueries triggers Overview to refetch stats automatically
        await queryClient.invalidateQueries({ queryKey: ['trades'] });
      } else {
        toast.error(result.error || "Failed to delete trade");
      }
    } catch (error: any) {
      console.error('Delete trade error:', error);
      toast.error(error?.message || "Failed to delete trade");
    }
  }, [tradeToDelete, queryClient]);

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

  const exportTrades = useCallback(() => {
    if (filteredTrades.length === 0) {
      toast.error("No trades to export");
      return;
    }

    const headers = [
      "Date", "Symbol", "Side", "Session", "Entry Price", "Exit Price", "Stop Price", "Take Profit",
      "Quantity", "P&L", "Outcome", "Actual R", "Quality", "Strategy", "Setup",
      "Notes", "Fees", "Multiplier", "Risk USD"
    ];

    const rows = filteredTrades.map(trade => {
      const { pnl, actualR, outcome, multiplier, riskUSD } = getTradeData(trade, oneR);
      
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
        riskUSD.toFixed(2)
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
  }, [filteredTrades, oneR, timezone]);

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
      {/* Header with Coming Soon Banner */}
<div className="flex items-center px-6 py-4">
  <h1 className="text-2xl font-bold text-white">My Trades</h1>
  
  {/* 🚀 Coming Soon Banner - Centered */}
  <div className="flex-1 flex justify-center">
    <div 
      className="relative overflow-hidden rounded-lg px-4 py-2"
      style={{
        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(161, 98, 7, 0.1) 100%)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">🚀</span>
        <span className="text-yellow-400 font-semibold text-sm">
          COMING SOON: Auto Trade Documentation
        </span>
        <span className="text-yellow-500/60 text-sm hidden lg:inline">•</span>
        <span className="text-yellow-500/70 text-xs hidden lg:inline">
          Automatic trade capture & analysis
        </span>
        <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-bold animate-pulse">
          STAY TUNED
        </span>
      </div>
    </div>
  </div>
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
              value={`${stats.totalPnL >= 0 ? '+' : ''}$${formatNumber(Math.abs(stats.totalPnL), 2)}`}
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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32 bg-zinc-900/50 border-zinc-800">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Trades</SelectItem>
                <SelectItem value="wins">Wins Only</SelectItem>
                <SelectItem value="losses">Losses Only</SelectItem>
                <SelectItem value="open">Open Trades</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
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
            <Button 
              onClick={() => navigate("/app/journal/new")}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Trade
            </Button>
          </div>
        </div>
      </div>

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
            {!searchQuery && (
              <Button 
                onClick={() => navigate("/app/journal/new")}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Trade
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
  <TableRow className="border-zinc-800 hover:bg-transparent">
    <TableHead className="text-zinc-500">Date</TableHead>
    <TableHead className="text-zinc-500">Symbol</TableHead>
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
                  onOpen={openTrade}
                  onEdit={handleEditTrade}
                  onDelete={handleDeleteClick}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Trade Details Dialog */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-w-[96vw] w-[1450px] h-[92vh] p-0 border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl">
          {selectedTrade && (() => {
const { pnl, outcome, multiplier, actualR, riskUSD, isClosed } = getTradeData(selectedTrade, oneR);
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
                          actualR && actualR > 0 ? 'text-emerald-400' : 
                          actualR && actualR < 0 ? 'text-red-400' : 
                          'text-zinc-400'
                        }`}>
                          {actualR !== null && actualR !== undefined ? formatRValue(actualR) : '—'}
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
                              ${formatNumber(selectedTrade.stop_price, 2)}
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
                              ${formatNumber(Math.abs(selectedTrade.entry_price - selectedTrade.stop_price), 2)}
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
                    
                    {/* Show calculation using global 1R - 🔥 Only for Summary mode */}
                    {selectedTrade.input_mode !== 'risk-only' && (
                      <div className="mt-3 pt-3 border-t border-zinc-800/50">
                        <div className="text-xs text-zinc-500 space-y-1">
                          <div className="font-mono">
                            Trade Risk = ${formatNumber(riskUSD, 2)}
                          </div>
                          <div className="font-mono text-blue-400">
                            Your 1R (Settings) = ${formatNumber(oneR, 2)}
                          </div>
                          {selectedTrade.exit_price && actualR !== null && (
                            <div className={`font-mono font-semibold ${actualR > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              Actual R = ${formatNumber(Math.abs(pnl), 2)} ÷ ${formatNumber(oneR, 2)} = {actualR.toFixed(2)}R
                            </div>
                          )}
                        </div>
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

                  {/* Actions */}
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
                  
                  <div className="h-12"></div>
                </div>
              </div>

              {/* Right Side - Chart & Notes Area - ENHANCED! */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden bg-zinc-950/30 min-h-0 custom-scrollbar">
                <div className="p-6 space-y-5 min-h-full">
                  
                  {/* 📊 CHART SECTION - FIRST */}
                  <div className="rounded-xl border-2 border-zinc-700/50 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 p-6 shadow-2xl">
                    <h3 className="text-sm font-bold text-zinc-300 mb-5 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      📊 PRICE CHART
                    </h3>
                    <div className="w-full h-[600px] bg-zinc-950 rounded-xl border-2 border-zinc-800 flex items-center justify-center shadow-2xl">
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-5 animate-pulse">
                          <TrendingUp className="w-10 h-10 text-yellow-500" />
                        </div>
                        <p className="text-zinc-400 text-base mb-3 font-semibold">Chart Integration</p>
                        <p className="text-zinc-600 text-sm">TradingView chart will be displayed here</p>
                      </div>
                    </div>
                  </div>

                  {/* 📸 SCREENSHOT SECTION - SECOND (BLUE) - 🔥 UPDATED! */}
                  <div className="rounded-xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-900/20 via-zinc-900/60 to-zinc-900/30 p-5 shadow-xl">
                    <h3 className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                      <Image className="w-5 h-5" />
                      📸 TRADE SCREENSHOT{(selectedTrade.screenshots && selectedTrade.screenshots.length > 1) ? 'S' : ''}
                    </h3>
                    
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
                                className="relative bg-zinc-950 rounded-xl border-2 border-blue-500/30 overflow-hidden shadow-2xl group cursor-pointer"
                                onClick={() => window.open(url, '_blank')}
                              >
                                {/* Screenshot Number Badge */}
                                <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-full bg-yellow-500 text-black text-xs font-bold">
                                  {idx + 1}/{selectedTrade.screenshots.length}
                                </div>
                                
                                {/* Image */}
                                <img 
                                  src={url} 
                                  alt={`Screenshot ${idx + 1}`}
                                  className="w-full h-auto transition-all duration-300 hover:scale-105"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder-chart.png';
                                  }}
                                />
                                
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="text-xs text-zinc-500 text-center bg-zinc-900/50 rounded-lg px-3 py-2">
                          📸 {selectedTrade.screenshots?.length || 1} screenshot(s) • Click to enlarge
                        </div>
                      </div>
                    ) : (
                      <div className="bg-zinc-950/50 rounded-xl border border-dashed border-zinc-700/50 p-10 text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                          <Image className="w-8 h-8 text-blue-400/50" />
                        </div>
                        <div className="text-zinc-500 text-sm font-medium mb-2">No screenshots added</div>
                        <div className="text-zinc-600 text-xs max-w-sm mx-auto leading-relaxed">
                          📸 Visual documentation helps you identify patterns
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 📝 NOTES SECTION - THIRD */}
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
                    
                    {selectedTrade.notes ? (
                      <div className="space-y-3">
                        <div className="bg-zinc-950/70 rounded-xl border border-yellow-500/20 p-5 shadow-inner">
                          <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-medium">
                            {selectedTrade.notes}
                          </p>
                        </div>
                        <div className="text-xs text-zinc-500 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          Added on {new Date(selectedTrade.created_at || selectedTrade.open_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-zinc-950/50 rounded-xl border border-dashed border-zinc-700/50 p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                          <FileText className="w-6 h-6 text-yellow-400/50" />
                        </div>
                        <div className="text-zinc-500 text-sm font-medium mb-1">No notes added yet</div>
                        <div className="text-zinc-600 text-xs max-w-xs mx-auto leading-relaxed">
                          💡 Document your thesis, emotions, and what worked
                        </div>
                      </div>
                    )}
                    
                    {/* Additional Details */}
                    {(selectedTrade.setup || selectedTrade.mistake || selectedTrade.next_time) && (
                      <div className="mt-4 pt-4 border-t border-yellow-500/10 space-y-3">
                        {selectedTrade.setup && (
                          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                            <div className="text-xs font-semibold text-blue-400 mb-1.5 flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              SETUP PATTERN
                            </div>
                            <div className="text-sm text-zinc-300 font-medium">{selectedTrade.setup}</div>
                          </div>
                        )}
                        
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
                  
                  <div className="h-16"></div>
                </div>
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
    </div>
  );
}