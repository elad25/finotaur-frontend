// ================================================
// PRODUCTION NEW TRADE PAGE - CLEAN v15
// ✅ Auto Session with manual override option
// ✅ Zero spam logging - only critical errors
// ✅ Fixed session detection with timezone support
// ✅ Auto timezone handling
// ✅ Optimized for 5000+ concurrent users
// 🔥 v12 FIX: Session validation before INSERT
// 🔥 v13 FIX: FULL DB SYNC - all columns aligned!
//    - actual_user_r calculation
//    - close_at timestamp
//    - broker & import_source defaults
//    - No metrics wrapper (flat columns)
// 🔥 v14 NEW: Partial Exits / Scale Out support!
//    - Multiple exit points with percentages
//    - Weighted average exit price calculation
//    - Popup UI for adding exits
// 🔥 v15 NEW: Risk Only Mode!
//    - Direct USD input for Risk/Target/Result
//    - Auto-calculates all metrics from $ values
//    - Simpler workflow for quick trade logging
// ================================================

import { useEffect, useState, useCallback, useMemo, Suspense, useRef } from "react";
import { lazy } from '@/lib/lazyWithRetry';
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJournalStore } from "@/state/journalStore";
import { getTrades } from "@/routes/journal";
import { formatNumber } from "@/utils/smartCalc";
import MultiUploadZone from "@/components/journal/MultiUploadZone";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, Zap, Calendar, X, Globe, Plus, Calculator, Percent, DollarSign, Briefcase, Copy, Sparkles, Upload, Lock } from "lucide-react";
import { usePortfolios } from "@/hooks/usePortfolios"; // still needed for refetchPortfolios

const BrokerPickerModal = lazy(() => import("@/components/BrokerPickerModal"));
const TradovateConnectModal = lazy(() => import("@/components/TradovateConnectModal"));
import InsightPopup from "@/components/journal/InsightPopup";
import { useInsightEngine } from "@/hooks/useInsightEngine";
import { getStrategies as getStrategiesFromSupabase } from "@/routes/strategies";
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeLimitDialog } from '@/components/upgrade/UpgradeLimitDialog';
import { UsageWarningModal } from '@/components/subscription/UsageWarningModal';
import { useRiskSettings } from '@/hooks/useRiskSettings';
import { useCommissions } from '@/hooks/useRiskSettings';
import { createTrade, updateTrade, uploadScreenshot } from '@/lib/trades';
import { TickerAutocomplete } from '@/components/TickerAutocomplete';
import { computeLiquidationPrice, getPipSize, parseForexPair, computeQuoteRate } from '@/utils/tradeCalculations';
import { normalizeAssetClass } from '@/utils/assetClass';
import { supabase } from '@/lib/supabase';
import { useTimezone } from '@/contexts/TimezoneContext';
import { usePortfolioContext } from '@/contexts/PortfolioContext';
import { useFinoChat } from '@/contexts/FinoChatContext';
import { formatTradeDate, formatForInput } from '@/utils/dateFormatter';
import { 
  getCurrentTradingSession, 
  getSessionFromDateTime,
  SESSION_DISPLAY_NAMES,
  getSessionColor,
  type TradingSession 
} from '@/constants/tradingSessions';

// ✅ Development mode flag
const isDev = import.meta.env.DEV;

// Dynamic import for canvas-confetti
let confetti: any = null;
if (typeof window !== 'undefined') {
  import('canvas-confetti').then(module => {
    confetti = module.default;
  }).catch(() => {
    // Silent fail
  });
}

// ✅ Multiplier lookup - delegates to canonical table in tradeCalculations.ts
import { getAssetMultiplier, ASSET_MULTIPLIERS, getQuantityLabel } from "@/utils/tradeCalculations";
import MultiLegBuilder from "@/components/journal/MultiLegBuilder";

// 🔥 VALID SESSIONS - must match DB constraint!
const VALID_SESSIONS = ['asia', 'london', 'newyork'];

/**
 * 🔥 Normalize session value for database
 * Converts empty strings to null, validates allowed values
 */
function normalizeSession(session: string | undefined | null): string | null {
  if (!session || session.trim() === '') {
    return null;
  }
  
  const normalized = session.trim().toLowerCase();
  
  if (VALID_SESSIONS.includes(normalized)) {
    return normalized;
  }
  
  if (isDev) {
    console.warn('⚠️ Invalid session value:', session, '→ using null');
  }
  return null;
}

// ================================================
// 🔥 PARTIAL EXITS TYPES & HELPERS
// ================================================
interface ExitPoint {
  id: string;
  quantity: number;
  price: number;
  percentage?: number;
  pnl?: number;
}

function generateExitId(): string {
  return `exit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ================================================================
// 🔥 COMPACT TRADE LIMIT MODAL - v2.0 (replaces both Free & Basic modals)
// ================================================================
function TradeLimitModal({
  open,
  onClose,
  planType,
  tradesUsed,
  maxTrades,
}: {
  open: boolean;
  onClose: () => void;
  planType: 'free' | 'basic';
  tradesUsed: number;
  maxTrades: number;
}) {
  if (!open) return null;

  const isFree = planType === 'free';
  const resetDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  const daysLeft = Math.ceil((resetDays.getTime() - Date.now()) / 86400000);
  const progress = Math.min((tradesUsed / maxTrades) * 100, 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #111111 0%, #0d0d0d 100%)',
          border: '1px solid rgba(201,166,70,0.2)',
          boxShadow: '0 0 40px rgba(201,166,70,0.08), 0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-5 pt-5 pb-3 text-center">
          <div className="text-2xl mb-1">🔥</div>
          <h3 className="text-base font-bold text-white">
            {isFree ? "Free Limit Reached" : "Monthly Limit Reached"}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {isFree
              ? `You've used all ${maxTrades} lifetime trades on the Free plan`
              : `You've used all ${maxTrades} trades this month`}
          </p>
        </div>

        <div className="px-5 pb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] text-zinc-500">Trades {isFree ? 'lifetime' : 'this month'}</span>
            <span className="text-[11px] font-semibold text-white">{tradesUsed} / {maxTrades}</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #C9A646, #E85D5D)',
              }}
            />
          </div>
          {!isFree && (
            <p className="text-[10px] text-zinc-600 mt-1 text-right">Resets in {daysLeft} days</p>
          )}
        </div>

        <div className="mx-5 mb-4 rounded-xl p-3.5" style={{ background: 'rgba(201,166,70,0.06)', border: '1px solid rgba(201,166,70,0.15)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-300">
              {isFree ? 'Upgrade to Basic or Premium' : 'Upgrade to Premium'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-400">
            {!isFree ? (
              <>
                <span className="flex items-center gap-1"><span className="text-yellow-400">∞</span> Unlimited trades</span>
                <span className="flex items-center gap-1"><span className="text-yellow-400">↗</span> Advanced analytics</span>
                <span className="flex items-center gap-1"><span className="text-yellow-400">✦</span> AI insights</span>
                <span className="flex items-center gap-1"><span className="text-yellow-400">⚡</span> Priority support</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1"><span className="text-yellow-400">📅</span> 25 trades/month</span>
                <span className="flex items-center gap-1"><span className="text-yellow-400">∞</span> Unlimited (Premium)</span>
                <span className="flex items-center gap-1"><span className="text-yellow-400">↗</span> Analytics</span>
                <span className="flex items-center gap-1"><span className="text-yellow-400">✦</span> AI insights</span>
              </>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={() => { onClose(); window.location.href = '/app/settings?tab=billing'; }}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #C9A646, #B48C2C)' }}
          >
            Upgrade Now
          </button>
          {!isFree && (
            <button
              onClick={onClose}
              className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              I'll wait {daysLeft} days for reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
function calculateWeightedAverageExit(exits: ExitPoint[]): number {
  const totalQuantity = exits.reduce((sum, e) => sum + (e.quantity || 0), 0);
  if (totalQuantity === 0) return 0;
  
  const weightedSum = exits.reduce((sum, e) => sum + ((e.price || 0) * (e.quantity || 0)), 0);
  return weightedSum / totalQuantity;
}

// 🎨 Beautiful Date/Time Picker Modal Component
function DateTimePickerModal({ 
  isOpen, 
  onClose, 
  value, 
  onChange,
  timezone 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  value?: string; 
  onChange: (value: string) => void;
  timezone: string;
}) {
  const [tempDate, setTempDate] = useState("");
  const [tempTime, setTempTime] = useState("");

  useEffect(() => {
    if (isOpen && value) {
      const date = new Date(value);
      setTempDate(date.toISOString().split('T')[0]);
      setTempTime(date.toTimeString().slice(0, 5));
    } else if (isOpen) {
      const now = new Date();
      setTempDate(now.toISOString().split('T')[0]);
      setTempTime(now.toTimeString().slice(0, 5));
    }
  }, [isOpen, value]);

  const handleSave = () => {
    if (tempDate && tempTime) {
      const combined = new Date(`${tempDate}T${tempTime}`);
      onChange(combined.toISOString());
      onClose();
      toast.success("Date & time updated");
    }
  };

  const handleToday = () => {
    const now = new Date();
    setTempDate(now.toISOString().split('T')[0]);
    setTempTime(now.toTimeString().slice(0, 5));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-yellow-200/20 shadow-[0_0_60px_rgba(201,166,70,0.15)] w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-yellow-200/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Select Date & Time</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Timezone Display */}
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <Globe className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-zinc-400">Timezone:</span>
            <span className="text-sm font-medium text-white">{timezone}</span>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleToday}
              className="px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-500/20 transition-all"
            >
              Today
            </button>
            <button
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setTempDate(yesterday.toISOString().split('T')[0]);
              }}
              className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-all"
            >
              Yesterday
            </button>
          </div>

          {/* Date Input */}
          <div>
            <Label className="text-xs text-zinc-400 mb-2 block">Date</Label>
            <div className="relative">
              <Input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-14 text-zinc-200 text-lg font-medium pl-4 pr-12"
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
            </div>
            {tempDate && (
              <p className="text-xs text-zinc-500 mt-2">
                {new Date(tempDate).toLocaleDateString('en-GB', { 
                  weekday: 'long',
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            )}
          </div>

          {/* Time Input */}
          <div>
            <Label className="text-xs text-zinc-400 mb-2 block">Time</Label>
            <div className="relative">
              <Input
                type="time"
                value={tempTime}
                onChange={(e) => setTempTime(e.target.value)}
                className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-14 text-zinc-200 text-lg font-medium tabular-nums pl-4 pr-12"
              />
              <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  const now = new Date();
                  setTempTime(now.toTimeString().slice(0, 5));
                }}
                className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                Use current time
              </button>
            </div>
          </div>

          {/* Preview */}
          {tempDate && tempTime && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs text-zinc-400 mb-1">Preview ({timezone})</p>
              <p className="text-lg font-semibold text-white">
                {formatTradeDate(new Date(`${tempDate}T${tempTime}`), timezone)}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-yellow-200/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-zinc-400 border border-zinc-700 hover:bg-zinc-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!tempDate || !tempTime}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ 
              background: tempDate && tempTime
                ? 'linear-gradient(135deg, #B8944E, #E6C675)' 
                : 'linear-gradient(135deg, #555, #666)'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================
// 🔥 PARTIAL EXITS POPUP COMPONENT - SIMPLE VERSION
// ================================================
function PartialExitsPopup({
  isOpen,
  onClose,
  totalQuantity,
  entryPrice,
  side,
  multiplier,
  fees,
  exits,
  onExitsChange,
  onApply,
}: {
  isOpen: boolean;
  onClose: () => void;
  totalQuantity: number;
  entryPrice: number;
  side: 'LONG' | 'SHORT';
  multiplier: number;
  fees: number;
  exits: ExitPoint[];
  onExitsChange: (exits: ExitPoint[]) => void;
  onApply: (weightedAvgPrice: number, totalPnL: number) => void;
}) {
  // Calculate total percentage used
  const totalPercentage = useMemo(() => 
    exits.reduce((sum, e) => sum + (e.percentage || 0), 0),
    [exits]
  );
  
  const remainingPercentage = 100 - totalPercentage;

  const weightedAveragePrice = useMemo(() => {
    const validExits = exits.filter(e => e.price > 0 && (e.percentage || 0) > 0);
    if (validExits.length === 0) return 0;
    
    const totalPct = validExits.reduce((sum, e) => sum + (e.percentage || 0), 0);
    if (totalPct === 0) return 0;
    
    const weightedSum = validExits.reduce((sum, e) => sum + (e.price * (e.percentage || 0)), 0);
    return weightedSum / totalPct;
  }, [exits]);

  const totalPnL = useMemo(() => {
    if (exits.length === 0 || !entryPrice) return 0;
    
    return exits.reduce((total, exit) => {
      if (!exit.price || !exit.percentage) return total;
      
      const quantity = (totalQuantity * exit.percentage) / 100;
      const priceChange = side === 'LONG' 
        ? exit.price - entryPrice 
        : entryPrice - exit.price;
      
      return total + (priceChange * quantity * multiplier);
    }, 0) - fees;
  }, [exits, entryPrice, side, multiplier, fees, totalQuantity]);

  // Update exit
  const updateExit = (id: string, field: 'percentage' | 'price', value: number) => {
    if (field === 'percentage') {
      const otherTotal = exits.filter(e => e.id !== id).reduce((sum, e) => sum + (e.percentage || 0), 0);
      const maxAllowed = 100 - otherTotal;
      value = Math.min(value, maxAllowed);
      value = Math.max(value, 0);
    }
    
    const updated = exits.map(e => e.id === id ? { ...e, [field]: value } : e);
    onExitsChange(updated);
  };

  // Remove exit
  const removeExit = (id: string) => {
    onExitsChange(exits.filter(e => e.id !== id));
  };

  // Add new exit
  const addExit = () => {
    if (remainingPercentage <= 0) return;
    onExitsChange([...exits, {
      id: generateExitId(),
      quantity: 0,
      price: 0,
      percentage: remainingPercentage,
    }]);
  };

  // Handle apply
  const handleApply = () => {
    const exitsWithQuantities = exits.map(e => ({
      ...e,
      quantity: (totalQuantity * (e.percentage || 0)) / 100,
    }));
    onExitsChange(exitsWithQuantities);
    
    const validExits = exits.filter(e => e.price > 0 && (e.percentage || 0) > 0);
    if (validExits.length > 0) {
      onApply(weightedAveragePrice, totalPnL);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl border border-yellow-200/20 shadow-2xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Partial Exits</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content - Compact */}
        <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
          {exits.map((exit, index) => {
            const quantity = (totalQuantity * (exit.percentage || 0)) / 100;
            const exitPnL = exit.price > 0 && quantity > 0
              ? (side === 'LONG' ? exit.price - entryPrice : entryPrice - exit.price) * quantity * multiplier
              : 0;
            
            return (
              <div key={exit.id} className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-2">
                {/* Percentage */}
                <div className="w-20">
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={exit.percentage || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateExit(exit.id, 'percentage', isNaN(val) ? 0 : val);
                      }}
                      placeholder="100"
                      className="bg-zinc-900 border-zinc-700 h-9 text-right pr-6 text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">%</span>
                  </div>
                </div>
                
                {/* Price */}
                <div className="flex-1">
                  <Input
                    type="number"
                    step="any"
                    value={exit.price || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      updateExit(exit.id, 'price', isNaN(val) ? 0 : val);
                    }}
                    placeholder="Price"
                    className="bg-zinc-900 border-zinc-700 h-9 text-right text-sm"
                  />
                </div>
                
                {/* P&L inline */}
                {exit.price > 0 && (exit.percentage || 0) > 0 && (
                  <span className={`text-xs font-medium w-20 text-right ${exitPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {exitPnL >= 0 ? '+' : ''}${formatNumber(exitPnL, 0)}
                  </span>
                )}
                
                {/* Remove button */}
                {exits.length > 1 && (
                  <button 
                    onClick={() => removeExit(exit.id)} 
                    className="p-1 text-zinc-500 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Exit */}
          {remainingPercentage > 0 && (
            <button
              onClick={addExit}
              className="w-full py-2 rounded-lg border border-dashed border-zinc-700 text-zinc-400 hover:border-yellow-500/40 hover:text-yellow-400 transition flex items-center justify-center gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add ({remainingPercentage}% left)
            </button>
          )}
          
          {totalPercentage > 100 && (
            <div className="p-1.5 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 text-center">
              Total exceeds 100%!
            </div>
          )}
        </div>

        {/* Summary - Compact */}
        {exits.some(e => e.price > 0 && (e.percentage || 0) > 0) && (
          <div className="px-4 py-2 bg-zinc-800/50 border-t border-zinc-800 flex justify-between text-sm">
            <div>
              <span className="text-zinc-500">Avg:</span>
              <span className="text-yellow-400 font-medium ml-1">{formatNumber(weightedAveragePrice, 2)}</span>
            </div>
            <div>
              <span className="text-zinc-500">P&L:</span>
              <span className={`font-bold ml-1 ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? '+' : ''}${formatNumber(totalPnL, 0)}
              </span>
            </div>
          </div>
        )}

        {/* Footer - Compact */}
        <div className="px-4 py-3 border-t border-zinc-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm text-zinc-400 border border-zinc-700 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!exits.some(e => e.price > 0 && (e.percentage || 0) > 0) || totalPercentage > 100}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-black disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #B8944E, #E6C675)' }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function New() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const editTradeId = searchParams.get('edit');
  const dateParam = searchParams.get('date');
  const [isEditMode, setIsEditMode] = useState(false);
  const st = useJournalStore();
  const [tab, setTab] = useState<"notes" | "screenshot" | "mistakes">("notes");
  const screenshotFiles = st.screenshotFiles || [];
  const setScreenshotFiles = st.setScreenshotFiles;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExitDatePicker, setShowExitDatePicker] = useState(false);
  const [autoSession, setAutoSession] = useState(true);
  
  // Multi-leg options builder toggle (defaults OFF; single-leg path unchanged)
  const [showMultiLeg, setShowMultiLeg] = useState(false);
  // Auth user id for the multi-leg builder (component-scope; New.tsx otherwise
  // reads the user only inside async loaders).
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setEffectiveUserId(data.user?.id ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  // 🔥 Partial Exits State
  const [showPartialExits, setShowPartialExits] = useState(false);
  const [partialExits, setPartialExits] = useState<ExitPoint[]>([]);
  const [usePartialExits, setUsePartialExits] = useState(false);
  
  // 🔥 NEW: Risk Only Mode (Tab toggle)
  const [riskInputMode, setRiskInputMode] = useState<'summary' | 'risk-only'>('summary');
  const [directRiskUSD, setDirectRiskUSD] = useState<number>(0);
  const [directTargetUSD, setDirectTargetUSD] = useState<number>(0);
  const [directResultUSD, setDirectResultUSD] = useState<number | null>(null);
  
  // 🌍 Timezone support
  const timezone = useTimezone();

  // 🏦 Portfolio selection — reads from global context, falls back to usePortfolios for refetch
  const { portfolios, activePortfolio, isLoading: portfoliosLoading, refetch: refetchPortfolios } = usePortfolios();
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState<string[]>([]);
  const [showBrokerPicker, setShowBrokerPicker] = useState(false);
  const [showTradovateModal, setShowTradovateModal] = useState(false);

  const handleBrokerPickerSelect = useCallback((broker: any) => {
    setShowBrokerPicker(false);
    if (broker === 'tradovate') {
      setShowTradovateModal(true);
    }
  }, []);

  // ── Sync with global portfolio context ──────────────────────
  const { effectivePortfolioId, isShowingAll } = usePortfolioContext();

  // Auto-select portfolio: global context first, then fallback to first portfolio
  // 2026-05-18: when the user is on the ALL filter (isShowingAll === true) the
  // first two branches resolve to no-op — activePortfolio is null and there's
  // no effectivePortfolioId. Without the third branch, manual trades were
  // saved with portfolio_id: null, appearing under ALL but hidden from every
  // specific portfolio filter (including Manual). Default to the Manual
  // portfolio whenever no other selection is available, so every manual
  // entry is reachable from at least one portfolio view.
  useEffect(() => {
    if (selectedPortfolioIds.length > 0) return; // user already selected manually
    if (!isShowingAll && effectivePortfolioId) {
      setSelectedPortfolioIds([effectivePortfolioId]);
    } else if (activePortfolio) {
      setSelectedPortfolioIds([activePortfolio.id]);
    } else {
      const manualPortfolio = portfolios.find(p => p.source === 'manual');
      if (manualPortfolio) {
        setSelectedPortfolioIds([manualPortfolio.id]);
      }
    }
  }, [effectivePortfolioId, activePortfolio?.id, isShowingAll, portfolios]);

  

  const togglePortfolio = useCallback((id: string) => {
    setSelectedPortfolioIds(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(p => p !== id) : prev // keep at least 1
        : [...prev, id]
    );
  }, []);
  
const { 
  canAddTrade, 
  tradesRemaining, 
  limits, 
  isPremium, 
  isUnlimitedUser,
  isLegacyFreeUser,
  isFreeJournal,
  isLoading: subscriptionLoading,
  warningState,
  markWarningShown 
} = useSubscription();
  
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showUsageWarning, setShowUsageWarning] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { generateInsight } = useInsightEngine();
  const [currentInsight, setCurrentInsight] = useState<{
    type: "success" | "warning" | "info";
    title: string;
    message: string;
    stats?: { rr: number; risk: number; reward: number };
  } | null>(null);
  const [showInsight, setShowInsight] = useState(false);
  
  const [strategies, setStrategies] = useState<Array<{ id: string; name: string }>>([]);

  // ✅ Get user's 1R value from hook
  const { oneR: oneRValue } = useRiskSettings();
  const { calculateCommission } = useCommissions();
  const { open: openFino } = useFinoChat();

  const [showBasicLimitModal, setShowBasicLimitModal] = useState(false);

  // ✅ Load strategies - SILENT
  const loadStrategies = useCallback(async () => {
    const result = await getStrategiesFromSupabase();
    
    if (result.ok && result.data) {
      setStrategies(result.data.map((s: any) => ({ 
        id: s.id, 
        name: s.name 
      })));
    } else {
      setStrategies([]);
    }
  }, []);

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  useEffect(() => {
    const handleFocus = () => loadStrategies();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadStrategies]);

  // ✅ Handle date parameter from calendar
  useEffect(() => {
    if (dateParam && !editTradeId) {
      try {
        const selectedDate = new Date(dateParam);
        const now = new Date();
        selectedDate.setHours(now.getHours());
        selectedDate.setMinutes(now.getMinutes());
        
        st.setOpenAt(selectedDate.toISOString());
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.success(`Date set to ${selectedDate.toLocaleDateString()}`);
      } catch (error) {
        toast.error('Invalid date format');
      }
    }
  }, [dateParam, editTradeId]);

  // ✅ Check for usage warning
  useEffect(() => {
    if (warningState?.shouldShow && !editTradeId && !showUsageWarning) {
      setShowUsageWarning(true);
    }
  }, [warningState, editTradeId, showUsageWarning]);

  const handleWarningClose = () => {
    setShowUsageWarning(false);
    markWarningShown();
  };

  // ✅ Load trade data for editing - MINIMAL LOGGING
  useEffect(() => {
    async function loadTradeForEdit() {
      if (!editTradeId) {
        if (!dateParam) {
          st.clearDraft();
          setScreenshotFiles([]);
        }
        return;
      }
      
      setIsEditMode(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error('Not authenticated');
          navigate('/app/journal/my-trades');
          return;
        }
        
        const { data: trade, error } = await supabase
          .from('trades')
          .select(`
            *,
            strategies (
              name
            )
          `)
          .eq('id', editTradeId)
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .single();
        
        if (error) {
          toast.error('Failed to load trade');
          navigate('/app/journal/my-trades');
          return;
        }
        
        if (trade) {
          st.setSymbol(trade.symbol || '');
          st.setAssetClass(trade.asset_class || 'stocks');
          st.setSide(trade.side || 'LONG');
          st.setQuantity(trade.quantity || 0);
          st.setEntryPrice(trade.entry_price || 0);
          st.setStopPrice(trade.stop_price || 0);
          st.setTakeProfitPrice(trade.take_profit_price || 0);
          st.setExitPrice(trade.exit_price || 0);
          st.setFees(trade.fees || 0);
          st.setFeesMode(trade.fees_mode || 'auto');
          st.setOpenAt(trade.open_at || new Date().toISOString());
          if (trade.close_at) st.setCloseAt(trade.close_at);
          st.setSession(trade.session || '');
          st.setStrategy(trade.strategy_id || undefined);
          st.setSetup(trade.setup || '');
          st.setNotes(trade.notes || '');
          st.setMistake(trade.mistake || '');
          st.setNextTime(trade.next_time || '');

          // Asset-class-specific fields
          if (trade.option_type) st.setOptionType(trade.option_type as 'CALL' | 'PUT');
          if (trade.strike_price) st.setStrikePrice(trade.strike_price);
          if (trade.expiration_date) st.setExpirationDate(trade.expiration_date);
          if (trade.leverage) st.setLeverage(trade.leverage);
          if (trade.position_type) st.setPositionType(trade.position_type as 'Spot' | 'Perpetual');
          if (trade.funding_paid != null) st.setFundingPaid(trade.funding_paid);
          if (trade.lot_size) st.setLotSize(trade.lot_size);
          if (trade.account_currency) st.setAccountCurrency(trade.account_currency);
          if (trade.quote_rate) st.setQuoteRate(trade.quote_rate);

          const mult = getAssetMultiplier(trade.symbol);
          st.setMultiplier(mult);
          
          // 🔥 Check if trade was created in risk-only mode
          if (trade.input_mode === 'risk-only' && trade.risk_usd) {
            setRiskInputMode('risk-only');
            setDirectRiskUSD(trade.risk_usd || 0);
            setDirectTargetUSD(trade.reward_usd || 0);
            setDirectResultUSD(trade.pnl ?? null);
          }
          
          // Load partial exits if they exist in trade data
          if (trade.partial_exits && Array.isArray(trade.partial_exits) && trade.partial_exits.length > 0) {
            setPartialExits(trade.partial_exits);
            setUsePartialExits(true);
          }
          
          // Load screenshots
          if (trade.screenshots && Array.isArray(trade.screenshots) && trade.screenshots.length > 0) {
            try {
              const existingScreenshots = await Promise.all(
                trade.screenshots.map(async (url: string, index: number) => {
                  try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    
                    const blob = await response.blob();
                    const contentType = blob.type || 'image/jpeg';
                    const extension = contentType.split('/')[1] || 'jpg';
                    const fileName = `screenshot-${index + 1}.${extension}`;
                    
                    return new File([blob], fileName, { type: contentType });
                  } catch (error) {
                    if (isDev) console.error(`Failed to load screenshot ${index + 1}:`, error);
                    return null;
                  }
                })
              );
              
              const validScreenshots = existingScreenshots.filter((f): f is File => f !== null);
              
              if (validScreenshots.length > 0) {
                setScreenshotFiles(validScreenshots);
                toast.success(`Loaded ${validScreenshots.length} screenshot(s)`);
              } else {
                setScreenshotFiles([]);
              }
            } catch (error) {
              if (isDev) console.error('Error loading screenshots:', error);
              setScreenshotFiles([]);
            }
          } else {
            setScreenshotFiles([]);
          }
          
          toast.success('Trade loaded for editing');
        } else {
          toast.error('Trade not found');
          navigate('/app/journal/my-trades');
        }
      } catch (error) {
        console.error('Error loading trade:', error);
        toast.error('Failed to load trade');
        navigate('/app/journal/my-trades');
      }
    }
    
    loadTradeForEdit();
  }, [editTradeId]);

  // Autosave every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      st.saveDraft();
      setLastSaved(new Date());
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // ⏰ Auto Session detection with timezone
  useEffect(() => {
    if (!st.openAt || !autoSession) return;
    
    const detectedSession = getSessionFromDateTime(new Date(st.openAt));
    if (detectedSession) {
      st.setSession(detectedSession);
    }
  }, [st.openAt, autoSession]);

  // Auto Fees detection
  useEffect(() => {
    if (st.feesMode !== "auto" || !st.assetClass) return;
    
    const timer = setTimeout(() => {
      const singleSideFee = calculateCommission(
        st.assetClass,
        st.entryPrice, 
        st.quantity,
        st.multiplier
      );
      st.setFees(singleSideFee * 2);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [st.entryPrice, st.quantity, st.assetClass, st.multiplier, st.feesMode, calculateCommission]);

  // ✅ Auto Multiplier detection
  useEffect(() => {
    if (!st.symbol) return;
    
    const multiplier = getAssetMultiplier(st.symbol);
    st.setMultiplier(multiplier);
    
    const symbolUpper = st.symbol.toUpperCase();
    const found = ASSET_MULTIPLIERS[symbolUpper];
    if (found && !st.assetClass) {
      st.setAssetClass(found.class as any);
    }
  }, [st.symbol]);

  // Auto Direction from TP
  useEffect(() => {
    const entry = st.entryPrice;
    const tp = st.takeProfitPrice;
    const stop = st.stopPrice;
    
    if (!entry || !tp || !stop) return;
    
    const timer = setTimeout(() => {
      if (tp > entry && stop < entry && st.side !== "LONG") {
        st.setSide("LONG");
      } else if (tp < entry && stop > entry && st.side !== "SHORT") {
        st.setSide("SHORT");
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [st.entryPrice, st.takeProfitPrice, st.stopPrice]);

  // ================================================
  // 🔥 RISK-ONLY MODE CALCULATIONS
  // ================================================
  const riskOnlyRR = useMemo(() => {
    if (directRiskUSD <= 0 || directTargetUSD <= 0) return 0;
    return directTargetUSD / directRiskUSD;
  }, [directRiskUSD, directTargetUSD]);

  const riskOnlyUserRiskR = useMemo(() => {
    if (!oneRValue || oneRValue === 0 || directRiskUSD <= 0) return undefined;
    return directRiskUSD / oneRValue;
  }, [directRiskUSD, oneRValue]);

  const riskOnlyUserRewardR = useMemo(() => {
    if (!oneRValue || oneRValue === 0 || directTargetUSD <= 0) return undefined;
    return directTargetUSD / oneRValue;
  }, [directTargetUSD, oneRValue]);

  const riskOnlyActualR = useMemo(() => {
    if (directRiskUSD <= 0 || directResultUSD === null) return null;
    return directResultUSD / directRiskUSD;
  }, [directResultUSD, directRiskUSD]);

  const riskOnlyActualUserR = useMemo(() => {
    if (!oneRValue || oneRValue === 0 || directResultUSD === null) return null;
    return directResultUSD / oneRValue;
  }, [directResultUSD, oneRValue]);

  const riskOnlyOutcome = useMemo((): "WIN" | "LOSS" | "BE" | "OPEN" => {
    if (directResultUSD === null) return "OPEN";
    if (directResultUSD > 0) return "WIN";
    if (directResultUSD < 0) return "LOSS";
    return "BE";
  }, [directResultUSD]);

  // ✅ Calculate user's R multiples (for Trade Summary mode)
  const userRiskR = useMemo(() => {
    if (!oneRValue || oneRValue === 0) return undefined;
    return st.riskUSD / oneRValue;
  }, [st.riskUSD, oneRValue]);

  const userRewardR = useMemo(() => {
    if (!oneRValue || oneRValue === 0) return undefined;
    return st.rewardUSD / oneRValue;
  }, [st.rewardUSD, oneRValue]);

  // Validation - different for each mode
  const isValidSummaryMode = st.symbol && st.quantity > 0 && st.entryPrice > 0 && st.stopPrice > 0;
  const isValidRiskOnlyMode = st.symbol && directRiskUSD > 0;
  const isValid = riskInputMode === 'summary' ? isValidSummaryMode : isValidRiskOnlyMode;
  
  const completionPercent = riskInputMode === 'summary' 
    ? Math.round(
        ((st.symbol ? 25 : 0) +
         (st.quantity > 0 ? 25 : 0) +
         (st.entryPrice > 0 ? 25 : 0) +
         (st.stopPrice > 0 ? 25 : 0)) / 1
      )
    : Math.round(
        ((st.symbol ? 50 : 0) +
         (directRiskUSD > 0 ? 50 : 0)) / 1
      );

  // ✅ Calculate P&L - supports partial exits (Trade Summary mode only)
  const calculatePnL = useCallback(() => {
    // If using partial exits, calculate from them
    if (usePartialExits && partialExits.length > 0) {
      const totalPct = partialExits.reduce((sum, e) => sum + (e.percentage || 0), 0);
      if (totalPct === 0) return 0;
      
      return partialExits.reduce((total, exit) => {
        if (!exit.price || !exit.percentage) return total;
        
        const quantity = (st.quantity * exit.percentage) / 100;
        const priceChange = st.side === 'LONG' 
          ? exit.price - st.entryPrice 
          : st.entryPrice - exit.price;
        
        const grossPnL = priceChange * quantity * st.multiplier;
        return total + grossPnL;
      }, 0) - st.fees;
    }
    
    // Regular single exit calculation
    if (!st.exitPrice || st.exitPrice <= 0) return 0;

    const priceChange = st.side === "LONG"
      ? st.exitPrice - st.entryPrice
      : st.entryPrice - st.exitPrice;

    // Asset-class-aware multiplier:
    // - options: fixed 100 per contract
    // - forex: quote_rate conversion (default 1)
    // - others: symbol-based lookup
    const effectiveMultiplier = normalizeAssetClass(st.assetClass) === 'options'
      ? 100
      : getAssetMultiplier(st.symbol);
    const quoteRate = normalizeAssetClass(st.assetClass) === 'forex' ? (st.quoteRate ?? 1) : 1;
    const grossPnL = priceChange * st.quantity * effectiveMultiplier * quoteRate;
    const netPnL = grossPnL - st.fees;

    return netPnL;
  }, [st.exitPrice, st.entryPrice, st.side, st.quantity, st.fees, st.symbol, st.multiplier, st.assetClass, st.quoteRate, usePartialExits, partialExits]);

  // Calculate Outcome (Trade Summary mode only)
  const calculateOutcome = useCallback((): "WIN" | "LOSS" | "BE" | "OPEN" => {
    // If using partial exits
    if (usePartialExits && partialExits.length > 0) {
      const totalPct = partialExits.reduce((sum, e) => sum + (e.percentage || 0), 0);
      const hasValidExits = partialExits.some(e => e.price > 0 && (e.percentage || 0) > 0);
      if (totalPct === 0 || !hasValidExits) return "OPEN";
      
      const pnl = calculatePnL();
      if (pnl > 0) return "WIN";
      if (pnl < 0) return "LOSS";
      return "BE";
    }
    
    if (!st.exitPrice || st.exitPrice <= 0) return "OPEN";
    
    const pnl = calculatePnL();
    
    if (pnl > 0) return "WIN";
    if (pnl < 0) return "LOSS";
    return "BE";
  }, [st.exitPrice, calculatePnL, usePartialExits, partialExits]);

  const pnl = calculatePnL();
  const outcome = calculateOutcome();

  // 🔥 Handle partial exits apply
  const handlePartialExitsApply = (weightedAvgPrice: number, totalPnL: number) => {
    if (partialExits.length > 0) {
      setUsePartialExits(true);
      st.setExitPrice(weightedAvgPrice);
      toast.success(`Partial exits saved - Avg: ${formatNumber(weightedAvgPrice, 4)}`);
    }
  };

  // Fire confetti
  const fireFirstTradeConfetti = () => {
    if (!confetti) return;
    
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ['#C9A646', '#E6C675', '#B8944E', '#FFD700'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        st.saveDraft();
        setLastSaved(new Date());
        toast.success("Draft saved!");
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && isValid) {
        e.preventDefault();
        handleSubmit();
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isValid]);

  const getRRColorClass = (rr: number) => {
    if (rr < 1) return "text-red-400";
    if (rr < 1.5) return "text-orange-400";
    if (rr < 2) return "text-yellow-400";
    return "text-emerald-400";
  };

  // 🎯 Ticker selection handler
  const handleTickerSelect = (ticker: any) => {
    st.setSymbol(ticker.symbol);
    st.setMultiplier(ticker.multiplier);
    
    if (ticker.asset_class) {
      st.setAssetClass(ticker.asset_class as any);
    }
    
    toast.success(`Selected ${ticker.symbol} (x${ticker.multiplier})`);
  };

  const tabBtn = (key: typeof tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
        tab === key
          ? "bg-yellow-500/20 text-yellow-100 border border-yellow-500/40"
          : "text-zinc-400 border border-yellow-200/10 hover:bg-zinc-800"
      }`}
    >
      {label}
    </button>
  );

  const quantityLabel = getQuantityLabel(st.assetClass || 'stocks');

  // ================================================================
  // 🔥🔥🔥 SUBMIT FUNCTION - v15 WITH RISK-ONLY MODE! 🔥🔥🔥
  // ================================================================
  async function handleSubmit() {
    // Clean strategy_id
    if (st.strategy === "none" || st.strategy === "") {
      st.setStrategy(undefined);
    }
    
    // Check subscription limits BEFORE submit
    if (!isEditMode && !canAddTrade) {
      // If limits not loaded yet, block optimistically
      if (!limits) {
        toast.error("Loading subscription info, please try again");
        return;
      }
      // BASIC = 25/month, FREE = 15 lifetime
      if (limits.max_trades === 25) {
        setShowBasicLimitModal(true);
      } else {
        setShowLimitModal(true);
      }
      return;
    }

    // ================================================================
    // VALIDATION - Different for each mode
    // ================================================================
    if (!st.symbol || st.symbol.trim() === "") {
      toast.error("Symbol is required");
      return;
    }
    
    if (!st.openAt) {
      toast.error("Date & Time is required");
      return;
    }

    // 🔥 RISK-ONLY MODE VALIDATION
if (riskInputMode === 'risk-only') {
  if (directRiskUSD <= 0) {
    toast.error("Risk amount is required");
    return;
  }
  
  // 🔥 DEBUG: Log what we're about to save
  console.log('🔥 Risk-Only Mode Data:', {
    directRiskUSD,
    directTargetUSD,
    directResultUSD,
    hasResult: directResultUSD !== null,
  });
} else {
      // TRADE SUMMARY MODE VALIDATION
      if (!st.assetClass) {
        toast.error("Asset class is required");
        return;
      }
      if (!st.quantity || st.quantity <= 0) {
        toast.error("Quantity must be positive");
        return;
      }
      if (!st.entryPrice || st.entryPrice <= 0) {
        toast.error("Entry price is required");
        return;
      }
      if (!st.stopPrice || st.stopPrice <= 0) {
        toast.error("Stop price is required");
        return;
      }
      if (st.stopPrice === st.entryPrice) {
        toast.error("Stop price cannot equal entry price");
        return;
      }
    }

    // ================================================================
    // 🔥 SESSION VALIDATION - Ensure valid for DB constraint
    // ================================================================
    let validSession: string | null = null;
    
    if (!st.session || st.session.trim() === '') {
      const detectedSession = getSessionFromDateTime(new Date(st.openAt));
      validSession = detectedSession || null;
    } else {
      validSession = normalizeSession(st.session);
    }

    setLoading(true);

    try {
      // ================================================================
      // UPLOAD SCREENSHOTS
      // ================================================================
      const screenshotUrls: string[] = [];
      if (screenshotFiles.length > 0) {
        toast.info(`Uploading ${screenshotFiles.length} screenshot(s)...`);
        
        for (let i = 0; i < screenshotFiles.length; i++) {
          try {
            const url = await uploadScreenshot(screenshotFiles[i]);
            if (url) {
              screenshotUrls.push(url);
            }
          } catch (error) {
            if (isDev) console.error(`Failed to upload screenshot ${i + 1}:`, error);
          }
        }
        
        if (screenshotUrls.length > 0) {
          st.setScreenshotUrls(screenshotUrls);
          toast.success(`${screenshotUrls.length} screenshot(s) uploaded`);
        }
      }

      // ================================================================
      // 🔥 BUILD PAYLOAD BASED ON MODE
      // ================================================================
      let payload: any;

      if (riskInputMode === 'risk-only') {
        // ════════════════════════════════════════════════════════════
        // 🔥 RISK-ONLY MODE PAYLOAD
        // ════════════════════════════════════════════════════════════
// 🔥 CRITICAL: Check if result was entered (including 0 and negative values!)
// Note: 0 is a valid result (break even), so we check for null/undefined only
const hasResult = directResultUSD !== null && directResultUSD !== undefined;

console.log('🔥 hasResult check:', { 
  directResultUSD, 
  hasResult, 
  typeOf: typeof directResultUSD,
  isZero: directResultUSD === 0 
});
// Calculate R values for risk-only mode
        let actual_r: number | null = null;
        let actual_user_r: number | null = null;
        
if (hasResult && directRiskUSD > 0) {
          actual_r = Number(directResultUSD) / directRiskUSD;
        }
        
        if (hasResult && oneRValue && oneRValue > 0) {
          // 🔥 FIX: Use Number() to ensure proper calculation even for 0
          actual_user_r = Number(directResultUSD) / oneRValue;
        }
        
        console.log('🔥 Risk-Only R calculations:', {
          actual_r,
          actual_user_r,
          directResultUSD,
          directRiskUSD,
          oneRValue,
        });

        payload = {
          // ═══════════════════════════════════════════
          // CORE REQUIRED FIELDS
          // ═══════════════════════════════════════════
          symbol: st.symbol.toUpperCase(),
          side: st.side,
          quantity: 1,  // Default to 1 for risk-only mode
          entry_price: 0,  // Not used in risk-only mode
          stop_price: 0,  // Not used in risk-only mode
          
          // ═══════════════════════════════════════════
          // TIMESTAMPS
          // ═══════════════════════════════════════════
          open_at: st.openAt || new Date().toISOString(),
          close_at: hasResult ? (st.closeAt || new Date().toISOString()) : null,

          // ═══════════════════════════════════════════
          // OPTIONAL TRADE FIELDS
          // ═══════════════════════════════════════════
          asset_class: st.assetClass || 'stocks',
          take_profit_price: null,
          exit_price: null,
          fees: 0,
          fees_mode: 'manual',
          session: validSession,
          strategy_id: (st.strategy && st.strategy !== "none") ? st.strategy : null,
          setup: st.setup || null,
          notes: st.notes || null,
          mistake: st.mistake || null,
          next_time: st.nextTime || null,
          tags: st.tags || [],
          
          // ═══════════════════════════════════════════
          // 🔥 RISK-ONLY CALCULATED FIELDS
          // ═══════════════════════════════════════════
          multiplier: 1,
          rr: riskOnlyRR || null,
          risk_usd: directRiskUSD,
          reward_usd: directTargetUSD || null,
          risk_pts: null,
          reward_pts: null,
          
          // ═══════════════════════════════════════════
          // 🔥 ALL 4 R-MULTIPLE FIELDS
          // ═══════════════════════════════════════════
          actual_r: actual_r,
          user_risk_r: riskOnlyUserRiskR || null,
          user_reward_r: riskOnlyUserRewardR || null,
          actual_user_r: actual_user_r,
          
// ═══════════════════════════════════════════
          // OUTCOME & P&L
          // ═══════════════════════════════════════════
          outcome: hasResult ? riskOnlyOutcome : 'OPEN',
          pnl: hasResult ? Number(directResultUSD) : null,
          
          // ═══════════════════════════════════════════
          // MEDIA
          // ═══════════════════════════════════════════
          screenshots: screenshotUrls.length > 0 ? screenshotUrls : (st.screenshotUrls || []),
          
          // ═══════════════════════════════════════════
          // 🔥 META FIELDS
          // ═══════════════════════════════════════════
          broker: 'manual',
          import_source: 'manual',
          input_mode: 'risk-only',
          portfolio_id: selectedPortfolioIds[0] ?? null,
          
          // ═══════════════════════════════════════════
          // PARTIAL EXITS (not used in risk-only)
          // ═══════════════════════════════════════════
          partial_exits: null,

          // ═══════════════════════════════════════════
          // ASSET-CLASS-SPECIFIC (null in risk-only)
          // ═══════════════════════════════════════════
          option_type: null,
          strike_price: null,
          expiration_date: null,
          leverage: null,
          position_type: null,
          funding_paid: null,
          lot_size: null,
          account_currency: null,
          quote_rate: null,
        };
        
       // 🔥 DEBUG: Log the FULL payload to verify all fields
        console.log('📦 Risk-Only FULL payload:', JSON.stringify({
          pnl: payload.pnl,
          outcome: payload.outcome,
          actual_r: payload.actual_r,
          actual_user_r: payload.actual_user_r,
          input_mode: payload.input_mode,
          risk_usd: payload.risk_usd,
          reward_usd: payload.reward_usd,
          hasResult_was: hasResult,
          directResultUSD_was: directResultUSD,
        }, null, 2));
      } else {
        // ════════════════════════════════════════════════════════════
        // 🔥 TRADE SUMMARY MODE PAYLOAD (Original logic)
        // ════════════════════════════════════════════════════════════
        const calculatedPnL = calculatePnL();
        const calculatedOutcome = calculateOutcome();
        const finalMultiplier = getAssetMultiplier(st.symbol);
        
        // Determine if trade has exit (either single or partial)
        const hasExitPrice = usePartialExits 
          ? partialExits.length > 0 && partialExits.some(e => e.price > 0 && (e.percentage || 0) > 0)
          : st.exitPrice && st.exitPrice > 0;
        
        // Calculate weighted average exit price for partial exits
        const finalExitPrice = usePartialExits && partialExits.length > 0
          ? (() => {
              const validExits = partialExits.filter(e => e.price > 0 && (e.percentage || 0) > 0);
              if (validExits.length === 0) return 0;
              const totalPct = validExits.reduce((sum, e) => sum + (e.percentage || 0), 0);
              if (totalPct === 0) return 0;
              const weightedSum = validExits.reduce((sum, e) => sum + (e.price * (e.percentage || 0)), 0);
              return weightedSum / totalPct;
            })()
          : st.exitPrice;
        
        // Calculate risk in USD (for actual_r calculation)
        // SIGNED risk: LONG = entry - stop; SHORT = stop - entry
        // When signedRisk <= 0, stop is on the profit side → risk-free, actual_r stays null
        const signedRisk = st.side === 'LONG'
          ? st.entryPrice - st.stopPrice
          : st.stopPrice - st.entryPrice;
        const calculatedRiskUSD = signedRisk > 0
          ? signedRisk * st.quantity * finalMultiplier + st.fees
          : 0;

        // actual_r: Contract R-multiple = PnL / Risk (null when risk-free)
        let actual_r: number | null = null;
        if (hasExitPrice && calculatedRiskUSD > 0) {
          actual_r = calculatedPnL / calculatedRiskUSD;
        }
        
        // actual_user_r: User Rs achieved = PnL / User's 1R setting
        let actual_user_r: number | null = null;
        if (hasExitPrice && oneRValue && oneRValue > 0) {
          actual_user_r = calculatedPnL / oneRValue;
        }

        payload = {
          // ═══════════════════════════════════════════
          // CORE REQUIRED FIELDS
          // ═══════════════════════════════════════════
          symbol: st.symbol.toUpperCase(),
          side: st.side,
          quantity: st.quantity,
          entry_price: st.entryPrice,
          stop_price: st.stopPrice,
          
          // ═══════════════════════════════════════════
          // TIMESTAMPS
          // ═══════════════════════════════════════════
          open_at: st.openAt || new Date().toISOString(),
          close_at: hasExitPrice ? (st.closeAt || new Date().toISOString()) : null,
          
          // ═══════════════════════════════════════════
          // OPTIONAL TRADE FIELDS
          // ═══════════════════════════════════════════
          asset_class: normalizeAssetClass(st.assetClass) ?? (st.assetClass || null),
          take_profit_price: st.takeProfitPrice || null,
          exit_price: hasExitPrice ? finalExitPrice : null,
          fees: st.fees || 0,
          fees_mode: st.feesMode || 'auto',
          session: validSession,
          strategy_id: (st.strategy && st.strategy !== "none") ? st.strategy : null,
          setup: st.setup || null,
          notes: st.notes || null,
          mistake: st.mistake || null,
          next_time: st.nextTime || null,
          tags: st.tags || [],
          
          // ═══════════════════════════════════════════
          // CALCULATED FIELDS (FLAT - NOT NESTED!)
          // ═══════════════════════════════════════════
          // Options always use multiplier 100; other assets use symbol lookup
          multiplier: normalizeAssetClass(st.assetClass) === 'options' ? 100 : finalMultiplier,
          rr: st.rr || null,
          risk_usd: st.riskUSD || null,
          reward_usd: st.rewardUSD || null,
          risk_pts: st.riskPts || null,
          reward_pts: st.rewardPts || null,
          
          // ═══════════════════════════════════════════
          // ALL 4 R-MULTIPLE FIELDS
          // ═══════════════════════════════════════════
          actual_r: actual_r,
          user_risk_r: userRiskR || null,
          user_reward_r: userRewardR || null,
          actual_user_r: actual_user_r,
          
          // ═══════════════════════════════════════════
          // OUTCOME & P&L
          // ═══════════════════════════════════════════
          outcome: hasExitPrice ? calculatedOutcome : 'OPEN',
          pnl: hasExitPrice ? calculatedPnL : null,
          
          // ═══════════════════════════════════════════
          // MEDIA
          // ═══════════════════════════════════════════
          screenshots: screenshotUrls.length > 0 ? screenshotUrls : (st.screenshotUrls || []),
          
          // ═══════════════════════════════════════════
          // META FIELDS
          // ═══════════════════════════════════════════
          broker: 'manual',
          import_source: 'manual',
          input_mode: 'summary',
          portfolio_id: selectedPortfolioIds[0] ?? null,
          
          // ═══════════════════════════════════════════
          // PARTIAL EXITS DATA
          // ═══════════════════════════════════════════
          partial_exits: usePartialExits && partialExits.length > 0
            ? partialExits
                .filter(e => e.price > 0 && (e.percentage || 0) > 0)
                .map(e => ({
                  ...e,
                  quantity: (st.quantity * (e.percentage || 0)) / 100,
                }))
            : null,

          // ═══════════════════════════════════════════
          // ASSET-CLASS-SPECIFIC FIELDS
          // ═══════════════════════════════════════════
          option_type: normalizeAssetClass(st.assetClass) === 'options' ? (st.optionType ?? null) : null,
          strike_price: normalizeAssetClass(st.assetClass) === 'options' ? (st.strikePrice ?? null) : null,
          expiration_date: normalizeAssetClass(st.assetClass) === 'options' ? (st.expirationDate ?? null) : null,
          option_outcome: normalizeAssetClass(st.assetClass) === 'options' ? (st.optionOutcome || null) : null,
          // Crypto
          leverage: normalizeAssetClass(st.assetClass) === 'crypto' ? (st.leverage ?? null) : null,
          position_type: normalizeAssetClass(st.assetClass) === 'crypto' ? (st.positionType ?? null) : null,
          funding_paid: (normalizeAssetClass(st.assetClass) === 'crypto' && st.positionType === 'Perpetual') ? (st.fundingPaid ?? null) : null,
          // Forex
          lot_size: normalizeAssetClass(st.assetClass) === 'forex' ? (st.lotSize ?? null) : null,
          account_currency: normalizeAssetClass(st.assetClass) === 'forex' ? (st.accountCurrency ?? 'USD') : null,
          quote_rate: normalizeAssetClass(st.assetClass) === 'forex' ? (st.quoteRate ?? 1) : null,
        };
        
        if (isDev) {
          console.log('📦 Trade Summary payload:', {
            symbol: payload.symbol,
            session: payload.session,
            close_at: payload.close_at,
            actual_r: payload.actual_r,
            actual_user_r: payload.actual_user_r,
            input_mode: payload.input_mode,
          });
        }
      }
      
      // ================================================================
      // CREATE OR UPDATE
      // ================================================================
      if (isEditMode && editTradeId) {
        const result = await updateTrade(editTradeId, payload);
        
        if (result.success) {
          toast.success("Trade updated successfully! 🎉");
          st.clearDraft();
          // 🔥 FIX: Invalidate React Query cache so MyTrades shows updated data
          await queryClient.invalidateQueries({ queryKey: ['trades'] });
          // 🔥 SYNC: Refresh subscription so Settings shows correct trade count
          await queryClient.invalidateQueries({ queryKey: ['subscription'] });
          setTimeout(() => navigate("/app/journal/my-trades"), 300);
        } else {
          throw new Error(result.error || "Failed to update trade");
        }
      } else {
        // Check if first trade
        const existingTrades = await getTrades();
        const isFirstTrade = !existingTrades.data || existingTrades.data.length === 0;

        // 🏦 Multi-portfolio: create trade for each selected portfolio
        const portfolioTargets = selectedPortfolioIds.length > 0 ? selectedPortfolioIds : [null];
        
        // Create primary trade (first portfolio)
        const primaryPayload = { ...payload, portfolio_id: portfolioTargets[0] ?? null };
        const result = await createTrade(primaryPayload);
        
        if (result.success) {
          // Create copies for additional portfolios (silent, parallel)
          if (portfolioTargets.length > 1) {
            const extraCopies = portfolioTargets.slice(1).map(pid =>
              createTrade({ ...payload, portfolio_id: pid ?? null })
            );
            const extraResults = await Promise.allSettled(extraCopies);
            const failedCount = extraResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
            
            if (failedCount > 0) {
              toast.warning(`Trade created for ${portfolioTargets.length - failedCount} of ${portfolioTargets.length} portfolios`);
            } else {
              toast.success(`Trade created in ${portfolioTargets.length} portfolios! 🎉`);
            }
          } else {
            toast.success("Trade created successfully! 🎉");
          }

          // 2026-05-18: explicit cache invalidation. The Supabase Realtime
          // listener in useTrades will also fire on the INSERT, but invalidating
          // here gives an immediate refetch (no waiting for the WebSocket round
          // trip) and keeps parity with the edit-mode branch above which
          // already does this. Without this, the user lands on /my-trades and
          // their just-saved trade is missing until the 5min staleTime expires.
          await queryClient.invalidateQueries({ queryKey: ['trades'] });
          await queryClient.invalidateQueries({ queryKey: ['dashboard'] });

          // First trade celebration
          if (isFirstTrade) {
            fireFirstTradeConfetti();
            
            setCurrentInsight({
              type: "success",
              title: "🎉 Congratulations on Your First Trade!",
              message: "You've just taken your first step towards becoming a systematic trader. Every great journey starts with a single trade. Keep tracking, keep learning, keep growing!",
              stats: {
                rr: riskInputMode === 'risk-only' ? riskOnlyRR : st.rr,
                risk: riskInputMode === 'risk-only' ? directRiskUSD : st.riskUSD,
                reward: riskInputMode === 'risk-only' ? directTargetUSD : st.rewardUSD
              }
            });
            setShowInsight(true);
            
            setTimeout(() => {
              setShowInsight(false);
              setTimeout(async () => {
                st.clearDraft();
                // 🔥 SYNC: Refresh subscription so Settings shows correct trade count
                await queryClient.invalidateQueries({ queryKey: ['subscription'] });
                navigate("/app/journal/my-trades");
              }, 300);
            }, 5000);
          } else {
            // Regular insight
            const tradeData = {
              symbol: st.symbol,
              side: st.side,
              entryPrice: st.entryPrice,
              stopPrice: st.stopPrice,
              takeProfitPrice: st.takeProfitPrice,
              exitPrice: st.exitPrice,
              quantity: st.quantity,
              fees: st.fees,
              multiplier: riskInputMode === 'risk-only' ? 1 : getAssetMultiplier(st.symbol),
              rr: riskInputMode === 'risk-only' ? riskOnlyRR : st.rr,
              riskUSD: riskInputMode === 'risk-only' ? directRiskUSD : st.riskUSD,
              rewardUSD: riskInputMode === 'risk-only' ? directTargetUSD : st.rewardUSD
            };
            
            const insight = generateInsight(tradeData);
            if (insight) {
              setCurrentInsight(insight);
              setShowInsight(true);
              
              setTimeout(() => {
                setShowInsight(false);
                setTimeout(async () => {
                  st.clearDraft();
                  // 🔥 SYNC: Refresh subscription so Settings shows correct trade count
                  await queryClient.invalidateQueries({ queryKey: ['subscription'] });
                  navigate("/app/journal/my-trades");
                }, 300);
              }, 5000);
            } else {
              st.clearDraft();
              // 🔥 SYNC: Refresh subscription so Settings shows correct trade count
              await queryClient.invalidateQueries({ queryKey: ['subscription'] });
              setTimeout(() => navigate("/app/journal/my-trades"), 300);
            }
          }
        } else {
          throw new Error(result.error || "Failed to create trade");
        }
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      
      if (error?.message?.includes('limit') || error?.message?.includes('policy') || error?.message?.includes('row-level security') || error?.code === '42501') {
        // Determine plan from limits or fallback to isPremium check
        const isBasicPlan = limits?.max_trades === 50 || (!isPremium && !isUnlimitedUser && limits?.max_trades !== 15);
        if (isBasicPlan) {
          setShowBasicLimitModal(true);
        } else {
          setShowLimitModal(true);
        }
      } else if (error?.message?.includes('session')) {
        toast.error("Session error - please try again");
      } else if (error?.message?.includes('violates check constraint')) {
        toast.error("Invalid data - check all fields");
      } else {
        toast.error(error?.message || "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>
        {`
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `}
      </style>

      <main className="max-w-[1100px] mx-auto px-6 pb-24 bg-[radial-gradient(80%_120%_at_50%_0%,#141414_0%,#0A0A0A_60%)]">
        {/* Warning Banner - Legacy FREE users (must select a plan) */}
{!isEditMode && isLegacyFreeUser && (
  <div className="mb-6 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-amber-500/10 p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-500/20">
          <AlertCircle className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">
            Action Required: Select a Plan
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Your free account no longer supports adding trades. Choose a plan to continue.
          </p>
        </div>
      </div>
      <button 
        onClick={() => navigate('/app/journal/pricing')}
        className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-sm font-semibold hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20"
      >
        Select Plan →
      </button>
    </div>
  </div>
)}

        {/* Warning Banner - BASIC users (25 trades limit) */}
        {!isEditMode && limits && !isUnlimitedUser && !isPremium && limits.max_trades === 25 && tradesRemaining <= 5 && tradesRemaining > 0 && (
          <div className="mb-6 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {tradesRemaining} trades left this month
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    You've used {limits.used} of your {limits.max_trades} monthly Basic trades
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/app/journal/pricing')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-semibold hover:from-purple-400 hover:to-blue-400 transition-all shadow-lg shadow-purple-500/20"
              >
                Go Premium →
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-500/20">
              <p className="text-xs text-zinc-400">
                🚀 <span className="text-blue-300">Premium</span> gives you <span className="text-white font-medium">unlimited trades</span>, advanced analytics, and priority support
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <section className="pt-10 relative">
          <div className="pointer-events-none absolute -top-6 left-0 h-24 w-64 rounded-full bg-yellow-500/10 blur-3xl" />
          <div className="rounded-2xl border border-white/[0.06] bg-[linear-gradient(145deg,#0c0c0b,#121211)] px-4 py-3 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Left: Icon badge + Title */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="hidden sm:flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-[#C9A646]/30 bg-[linear-gradient(145deg,rgba(201,166,70,0.18),rgba(201,166,70,0.04))]">
                  <TrendingUp className="w-5 h-5 text-[#E3C676]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    {isEditMode ? (
                      <>
                        Edit Trade
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 align-middle">
                          Editing
                        </span>
                      </>
                    ) : (
                      'New Trade'
                    )}
                  </h1>
                  <p className="text-xs text-zinc-400 flex items-center gap-2">
                    {isEditMode ? 'Update your trade details' : 'Log a new trade to your journal'}
                    {lastSaved && (
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Saved {Math.round((Date.now() - lastSaved.getTime()) / 1000)}s ago
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Right: Log with FINO */}
              <div className="w-full lg:w-[34rem] lg:flex-shrink-0">
                <div className="relative overflow-hidden rounded-xl border border-[#C9A646]/30 bg-[linear-gradient(145deg,#0f0f0d,#161613)] px-3.5 py-2.5">
                  {/* Decorative gold swoosh, top-right */}
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-4 -right-4 h-20 w-28 opacity-40"
                    viewBox="0 0 180 130"
                    fill="none"
                  >
                    <path d="M10 120 C 70 120, 150 60, 175 0" stroke="#C9A646" strokeOpacity="0.35" strokeWidth="1.2" />
                    <path d="M40 128 C 95 124, 160 70, 182 14" stroke="#C9A646" strokeOpacity="0.22" strokeWidth="1.2" />
                    <path d="M72 132 C 120 126, 168 84, 188 34" stroke="#C9A646" strokeOpacity="0.14" strokeWidth="1.2" />
                  </svg>

                  <div className="relative flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Sparkles className="w-4 h-4 text-[#C9A646] flex-shrink-0" />
                        <h3 className="text-sm font-semibold text-white truncate">
                          Log it instantly with <span className="text-[#C9A646]">FINO</span>
                        </h3>
                      </div>
                      {/* Field chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {['Symbol', 'Direction', 'Entry', 'Stop', 'Target', 'Position Size'].map((field) => (
                          <span
                            key={field}
                            className="inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-black/40 px-2 py-0.5 text-[11px] font-medium text-zinc-300"
                          >
                            <CheckCircle2 className="w-3 h-3 text-[#C9A646]" />
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* CTA cluster */}
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {isFreeJournal ? (
                        <span
                          title="Screenshot upload is available on Basic and above"
                          className="inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg border border-[#C9A646]/40 bg-[#C9A646]/15 px-3 text-xs font-semibold text-[#C9A646]"
                        >
                          <Lock className="w-3 h-3" />
                          Upload on <span className="font-bold tracking-wide">Basic+</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openFino()}
                          aria-label="Upload trade screenshot"
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-zinc-400 transition-colors hover:border-[#C9A646]/40 hover:text-[#C9A646]"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openFino()}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-600 to-yellow-400 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                      >
                        <Sparkles className="w-4 h-4" />
                        Open FINO
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BLOCK 1: TRADE INFO */}
        <section className="mt-10">
          <Card className="rounded-2xl border border-yellow-200/20 bg-[linear-gradient(145deg,#0b0b0b,#121212)] shadow-[0_0_40px_rgba(0,0,0,0.25)] p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#C9A646] tracking-wide uppercase text-xs">Trade Info</h2>
              <span className="text-xs text-zinc-500">Step 1 of 3</span>
            </div>

            {/* Direction Toggle */}
            <div className="mb-6">
              <Label className="text-xs text-zinc-400 mb-2 block">Direction</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => st.setSide("LONG")}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                    st.side === "LONG"
                      ? "bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => st.setSide("SHORT")}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                    st.side === "SHORT"
                      ? "bg-red-500/20 text-red-300 border-2 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <TrendingDown className="w-4 h-4 inline mr-2" />
                  SHORT
                </button>
              </div>
              {riskInputMode === 'summary' && (
                <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Auto-detected from prices
                </div>
              )}
            </div>

            {/* Asset Class Selector */}
            <div className="mb-6">
              <Label className="text-xs text-zinc-400 mb-2 block">Asset Class</Label>
              <div className="flex flex-wrap gap-2">
                {(['stock', 'futures', 'options', 'crypto', 'forex'] as const).map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => st.setAssetClass(cls as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                      normalizeAssetClass(st.assetClass) === cls
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-[0_0_12px_rgba(201,166,70,0.15)]'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {cls === 'stock' ? 'Stock' : cls.charAt(0).toUpperCase() + cls.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid: Symbol, Date/Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 🎯 TickerAutocomplete */}
              <div>
                <Label htmlFor="symbol" className="text-xs text-zinc-400 mb-2 block">
                  Symbol * {st.assetClass && <span className="text-yellow-400 ml-1">({st.assetClass})</span>}
                  {st.multiplier > 1 && riskInputMode === 'summary' && <span className="text-emerald-400 ml-1">x{st.multiplier}</span>}
                </Label>
                <TickerAutocomplete
                  value={st.symbol}
                  onSelect={handleTickerSelect}
                  placeholder="AAPL, ES, NQ, BTCUSDT..."
                />
              </div>

              {/* 🎨 Beautiful date/time button with timezone */}
              <div>
                <Label htmlFor="openAt" className="text-xs text-zinc-400 mb-2 flex items-center justify-between">
                  <span>Date & Time *</span>
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {timezone}
                  </span>
                </Label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="w-full bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 px-4 flex items-center justify-between hover:border-yellow-200/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {st.openAt ? formatTradeDate(new Date(st.openAt), timezone).split(',')[0] : 'Select Date'}
                    </span>
                    <span className="text-yellow-400">•</span>
                    <span className="text-sm font-medium tabular-nums">
                      {st.openAt ? new Date(st.openAt).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                      }) : '--:--'}
                    </span>
                  </div>
                  <Clock className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Grid: Session, Strategy, Setup */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Session selector with auto-detection and timezone awareness */}
              <div>
                <Label htmlFor="session" className="text-xs text-zinc-400 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    Session
                    {autoSession && (
                      <span className="text-yellow-400 text-[10px]">(auto)</span>
                    )}
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSession}
                      onChange={(e) => {
                        setAutoSession(e.target.checked);
                        if (e.target.checked && st.openAt) {
                          const detected = getSessionFromDateTime(new Date(st.openAt));
                          if (detected) st.setSession(detected);
                        }
                      }}
                      className="w-3 h-3 rounded border-yellow-200/30 bg-zinc-900 checked:bg-yellow-500"
                    />
                    <span className="text-[10px] text-zinc-400">Auto</span>
                  </label>
                </Label>
                
                <Select 
                  value={st.session || ""} 
                  onValueChange={(v) => {
                    st.setSession(v);
                    if (v) setAutoSession(false);
                  }}
                  disabled={autoSession}
                >
                  <SelectTrigger className={`bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 ${autoSession ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder="Select session..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asia">
                      <div className="flex items-center gap-2">
                        <span>🌅</span>
                        <span>Asia - 6PM-1AM NY</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="london">
                      <div className="flex items-center gap-2">
                        <span>🏛️</span>
                        <span>London - 1AM-7AM NY</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="newyork">
                      <div className="flex items-center gap-2">
                        <span>🗽</span>
                        <span>New York - 7AM-5PM NY</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {st.openAt && st.session && autoSession && (
                  <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${getSessionColor(st.session as TradingSession)}`}>
                    <span className="font-medium">
                      Detected: {SESSION_DISPLAY_NAMES[st.session as TradingSession]}
                    </span>
                    <span className="text-zinc-500">(based on NY time)</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="strategy" className="text-xs text-zinc-400 mb-2 block">
                  Strategy (Optional)
                </Label>
                <Select 
                  value={st.strategy || ""} 
                  onValueChange={(v) => {
                    if (v === "create_new") {
                      navigate("/app/journal/strategies?create=true");
                    } else if (v === "none" || v === "") {
                      st.setStrategy(undefined);
                    } else {
                      st.setStrategy(v);
                    }
                  }}
                >
                  <SelectTrigger className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200">
                    <SelectValue placeholder="Select strategy..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-yellow-200/20">
                    <SelectItem value="none">No Strategy</SelectItem>
                    
                    {strategies.length > 0 && (
                      <div className="h-px bg-yellow-200/10 my-2" />
                    )}
                    
                    {strategies.map((strategy) => (
                      <SelectItem 
                        key={strategy.id} 
                        value={strategy.id}
                        className="text-zinc-200"
                      >
                        📊 {strategy.name}
                      </SelectItem>
                    ))}
                    
                    {strategies.length > 0 && (
                      <div className="h-px bg-yellow-200/10 my-2" />
                    )}
                    <SelectItem value="create_new" className="text-yellow-400 font-medium">
                      + Create Strategy
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {st.strategy && st.strategy !== "none" && st.strategy !== "create_new" && (
                  <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Trade will be tracked under this strategy
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="setup" className="text-xs text-zinc-400 mb-2 block">
                  Setup
                </Label>
                <Input
                  id="setup"
                  value={st.setup || ""}
                  onChange={(e) => st.setSetup(e.target.value)}
                  placeholder="Breakout, Support..."
                  className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200"
                />
              </div>
            </div>
          </Card>
        </section>

        {/* BLOCK 2: PRICING & RISK */}
        <section className="mt-8">
          {/* 🔥 INPUT MODE TABS - Full width above card */}
          <div className="flex w-full gap-1">
            <button
              type="button"
              onClick={() => setRiskInputMode('summary')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-300 rounded-t-xl flex items-center justify-center gap-2 ${
                riskInputMode === 'summary'
                  ? 'bg-gradient-to-b from-yellow-500/20 to-[#0d0d0d] text-yellow-400 border-t-2 border-l border-r border-yellow-500/60 shadow-[0_-4px_20px_rgba(201,166,70,0.2)]'
                  : 'bg-zinc-900/60 text-zinc-500 border border-zinc-800/50 hover:text-zinc-300 hover:bg-zinc-800/60'
              }`}
            >
              <Calculator className="w-4 h-4" />
              Trade Summary
            </button>
            <button
              type="button"
              onClick={() => setRiskInputMode('risk-only')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-300 rounded-t-xl flex items-center justify-center gap-2 ${
                riskInputMode === 'risk-only'
                  ? 'bg-gradient-to-b from-yellow-500/20 to-[#0d0d0d] text-yellow-400 border-t-2 border-l border-r border-yellow-500/60 shadow-[0_-4px_20px_rgba(201,166,70,0.2)]'
                  : 'bg-zinc-900/60 text-zinc-500 border border-zinc-800/50 hover:text-zinc-300 hover:bg-zinc-800/60'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Risk Only
            </button>
          </div>

          <Card className="rounded-b-2xl rounded-t-none border border-yellow-200/20 bg-[linear-gradient(145deg,#0b0b0b,#121212)] shadow-[0_0_40px_rgba(0,0,0,0.25)] p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#C9A646] tracking-wide uppercase text-xs">
                {riskInputMode === 'summary' ? 'Pricing & Risk' : 'Risk Values (USD)'}
              </h2>
              <span className="text-xs text-zinc-500">Step 2 of 3</span>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* 🔥 TRADE SUMMARY MODE - Original UI */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {riskInputMode === 'summary' && (
              <>
                {/* Row 1: Quantity, Entry */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <Label htmlFor="quantity" className="text-xs text-zinc-400 mb-2 block">
                      {quantityLabel} *
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="any"
                      value={st.quantity || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          st.setQuantity(0);
                          return;
                        }
                        const num = parseFloat(value);
                        if (!isNaN(num)) {
                          st.setQuantity(num);
                        }
                      }}
                      onBlur={(e) => {
                        const num = parseFloat(e.target.value);
                        if (!isNaN(num)) {
                          st.setQuantity(num);
                        }
                      }}
                      placeholder="100"
                      className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 text-right transition-all"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="entryPrice" className="text-xs text-zinc-400 mb-2 block">
                      Entry Price *
                    </Label>
                    <Input
                      id="entryPrice"
                      type="number"
                      step="any"
                      value={st.entryPrice || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          st.setEntryPrice(0);
                          return;
                        }
                        const num = parseFloat(value);
                        if (!isNaN(num)) {
                          st.setEntryPrice(num);
                        }
                      }}
                      placeholder="150.50"
                      className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 text-right transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Stop Loss, Take Profit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <Label htmlFor="stopPrice" className="text-xs text-zinc-400 mb-2 block">
                      Stop Loss *
                    </Label>
                    <Input
                      id="stopPrice"
                      type="number"
                      step="any"
                      value={st.stopPrice || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          st.setStopPrice(0);
                          return;
                        }
                        const num = parseFloat(value);
                        if (!isNaN(num)) {
                          st.setStopPrice(num);
                        }
                      }}
                      placeholder="149.30"
                      className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 text-right transition-all"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="takeProfitPrice" className="text-xs text-zinc-400 mb-2 block">
                      Take Profit (recommended)
                    </Label>
                    <Input
                      id="takeProfitPrice"
                      type="number"
                      step="any"
                      value={st.takeProfitPrice || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          st.setTakeProfitPrice(undefined);
                          return;
                        }
                        const num = parseFloat(value);
                        if (!isNaN(num)) {
                          st.setTakeProfitPrice(num);
                        }
                      }}
                      placeholder="155.00"
                      className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 text-right transition-all"
                    />
                  </div>
                </div>

                {/* Row 3: Fees & Exit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <Label htmlFor="fees" className="text-xs text-zinc-400 mb-2 block flex items-center gap-1">
                      Fees
                      <span className="text-yellow-400 text-[10px]">
                        ({st.feesMode === "auto" ? "auto" : "manual"})
                      </span>
                    </Label>
                    <Input
                      id="fees"
                      type="number"
                      step="any"
                      value={st.fees || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          st.setFees(0);
                          st.setFeesMode("manual");
                          return;
                        }
                        const val = parseFloat(value);
                        if (!isNaN(val)) {
                          st.setFees(val);
                          st.setFeesMode("manual");
                        }
                      }}
                      placeholder="2.50"
                      className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 text-right"
                    />
                  </div>

                  {/* 🔥 Exit Price with Partial Exits Button */}
                  <div>
                    <Label htmlFor="exitPrice" className="text-xs text-zinc-400 mb-2 flex items-center justify-between">
                      <span>Exit Price (optional)</span>
                      {usePartialExits && partialExits.some(e => e.price > 0 && (e.percentage || 0) > 0) && (
                        <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          {partialExits.filter(e => e.price > 0).length} partial exits
                        </span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="exitPrice"
                        type="number"
                        step="any"
                        value={usePartialExits && partialExits.some(e => e.price > 0 && (e.percentage || 0) > 0)
                          ? (() => {
                              const validExits = partialExits.filter(e => e.price > 0 && (e.percentage || 0) > 0);
                              if (validExits.length === 0) return '';
                              const totalPct = validExits.reduce((sum, e) => sum + (e.percentage || 0), 0);
                              if (totalPct === 0) return '';
                              return validExits.reduce((sum, e) => sum + (e.price * (e.percentage || 0)), 0) / totalPct;
                            })()
                          : st.exitPrice || ""
                        }
                        onChange={(e) => {
                          // If user types directly, disable partial exits mode
                          if (usePartialExits) {
                            setUsePartialExits(false);
                            setPartialExits([]);
                          }
                          const value = e.target.value;
                          if (value === "") {
                            st.setExitPrice(undefined);
                            return;
                          }
                          const num = parseFloat(value);
                          if (!isNaN(num)) {
                            st.setExitPrice(num);
                          }
                        }}
                        placeholder={usePartialExits ? "Calculated from partials" : "152.00"}
                        className={`bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 text-right transition-all flex-1 ${
                          usePartialExits ? 'bg-emerald-500/5 border-emerald-500/30' : ''
                        }`}
                        readOnly={usePartialExits && partialExits.some(e => e.price > 0 && (e.percentage || 0) > 0)}
                      />
                      
                      {/* 🔥 Partial Exits Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (st.quantity <= 0) {
                            toast.error("Enter quantity before adding partial exits");
                            return;
                          }
                          if (st.entryPrice <= 0) {
                            toast.error("Enter entry price before adding partial exits");
                            return;
                          }
                          // Initialize with one exit at 100% if empty
                          if (partialExits.length === 0) {
                            setPartialExits([{
                              id: generateExitId(),
                              quantity: st.quantity,
                              price: 0,
                              percentage: 100,
                            }]);
                          }
                          setShowPartialExits(true);
                        }}
                        className={`h-12 px-4 rounded-xl border transition-all flex items-center gap-2 ${
                          usePartialExits && partialExits.length > 0
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-yellow-500/40 hover:text-yellow-400'
                        }`}
                        title="Partial exits"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-xs font-medium hidden sm:inline">Partials</span>
                      </button>
                    </div>
                    
                    {/* Partial Exits Summary */}
                    {usePartialExits && partialExits.length > 0 && partialExits.some(e => e.price > 0 && (e.percentage || 0) > 0) && (
                      <div className="mt-2 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">
                            {partialExits.filter(e => e.price > 0).length} exits | Avg: 
                            <span className="text-emerald-400 font-medium ml-1">
                              {formatNumber((() => {
                                const validExits = partialExits.filter(e => e.price > 0 && (e.percentage || 0) > 0);
                                if (validExits.length === 0) return 0;
                                const totalPct = validExits.reduce((sum, e) => sum + (e.percentage || 0), 0);
                                if (totalPct === 0) return 0;
                                return validExits.reduce((sum, e) => sum + (e.price * (e.percentage || 0)), 0) / totalPct;
                              })(), 4)}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPartialExits(true)}
                            className="text-emerald-400 hover:text-emerald-300 underline"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── CONDITIONAL ASSET-CLASS FIELDS ─── */}

                {/* OPTIONS fields */}
                {normalizeAssetClass(st.assetClass) === 'options' && (
                  <div className="mb-6 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-yellow-400 uppercase tracking-wider">Options Details</p>
                      <button
                        type="button"
                        onClick={() => setShowMultiLeg((v) => !v)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          showMultiLeg
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
                        }`}
                      >
                        {showMultiLeg ? 'Single leg' : 'Multi-leg spread'}
                      </button>
                    </div>
                    {!showMultiLeg && (
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-zinc-400 mb-2 block">Option Type</Label>
                        <div className="flex gap-2">
                          {(['CALL', 'PUT'] as const).map((ot) => (
                            <button
                              key={ot}
                              type="button"
                              onClick={() => st.setOptionType(ot)}
                              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                                st.optionType === ot
                                  ? ot === 'CALL'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-300 border-red-500/40'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
                              }`}
                            >
                              {ot}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400 mb-2 block">Strike Price</Label>
                        <Input
                          type="number"
                          step="any"
                          value={st.strikePrice || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            st.setStrikePrice(isNaN(val) ? undefined : val);
                          }}
                          placeholder="150.00"
                          className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 text-right"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400 mb-2 block">Expiration Date</Label>
                        <Input
                          type="date"
                          value={st.expirationDate || ''}
                          onChange={(e) => st.setExpirationDate(e.target.value || undefined)}
                          className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label className="text-xs text-zinc-400 mb-2 block">How it closed</Label>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { label: 'Open / not yet', value: '', key: 'open' },
                          { label: 'Expired worthless', value: 'expired_worthless', key: 'expired_worthless' },
                          { label: 'Assigned', value: 'assigned', key: 'assigned' },
                          { label: 'Exercised', value: 'exercised', key: 'exercised' },
                        ] as const).map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => st.setOptionOutcome(opt.value)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                              st.optionOutcome === opt.value
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-[0_0_12px_rgba(201,166,70,0.15)]'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-3">Multiplier is fixed at 100 for options contracts.</p>
                    </>
                    )}
                    {showMultiLeg && effectiveUserId && (
                      <MultiLegBuilder
                        userId={effectiveUserId}
                        defaultSymbol={st.symbol}
                        portfolioId={selectedPortfolioIds[0] ?? null}
                        onSaved={async () => {
                          await queryClient.invalidateQueries({ queryKey: ['trades'] });
                          navigate('/app/journal/my-trades');
                        }}
                        onCancel={() => setShowMultiLeg(false)}
                      />
                    )}
                  </div>
                )}

                {/* CRYPTO fields */}
                {normalizeAssetClass(st.assetClass) === 'crypto' && (
                  <div className="mb-6 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                    <p className="text-xs text-blue-400 uppercase tracking-wider mb-4">Crypto Details</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-zinc-400 mb-2 block">Position Type</Label>
                        <div className="flex gap-2">
                          {(['Spot', 'Perpetual'] as const).map((pt) => (
                            <button
                              key={pt}
                              type="button"
                              onClick={() => st.setPositionType(pt)}
                              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                                st.positionType === pt
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
                              }`}
                            >
                              {pt}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400 mb-2 block">Leverage</Label>
                        <Input
                          type="number"
                          step="any"
                          min="1"
                          value={st.leverage || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            st.setLeverage(isNaN(val) ? undefined : val);
                          }}
                          placeholder="1"
                          className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 text-right"
                        />
                      </div>
                      {(() => {
                        const liqPrice = computeLiquidationPrice({ entryPrice: st.entryPrice, leverage: st.leverage, side: st.side });
                        return liqPrice !== null ? (
                          <div>
                            <Label className="text-xs text-zinc-400 mb-2 block">Est. Liquidation Price</Label>
                            <div className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 flex items-center justify-end px-3 text-zinc-200 text-sm tabular-nums">
                              {liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">Estimate — excludes maintenance margin &amp; fees.</p>
                          </div>
                        ) : null;
                      })()}
                      {st.positionType === 'Perpetual' && (
                        <div>
                          <Label className="text-xs text-zinc-400 mb-2 block">Funding Paid (optional)</Label>
                          <Input
                            type="number"
                            step="any"
                            value={st.fundingPaid ?? ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              st.setFundingPaid(isNaN(val) ? undefined : val);
                            }}
                            placeholder="0.00"
                            className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 text-right"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* FOREX fields */}
                {normalizeAssetClass(st.assetClass) === 'forex' && (
                  <div className="mb-6 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                    <p className="text-xs text-purple-400 uppercase tracking-wider mb-4">Forex Details</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-zinc-400 mb-2 block">Lot Size</Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={st.lotSize || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            st.setLotSize(isNaN(val) ? undefined : val);
                          }}
                          placeholder="1.0"
                          className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 text-right"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400 mb-2 block">Account Currency</Label>
                        <Input
                          type="text"
                          value={st.accountCurrency ?? 'USD'}
                          onChange={(e) => st.setAccountCurrency(e.target.value.toUpperCase() || 'USD')}
                          placeholder="USD"
                          maxLength={3}
                          className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 text-right uppercase"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-400 mb-2 block">Quote Rate</Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={st.quoteRate ?? 1}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            st.setQuoteRate(isNaN(val) ? 1 : val);
                          }}
                          placeholder="1.0"
                          className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 text-right"
                        />
                        {(() => {
                          const { quote } = parseForexPair(st.symbol);
                          const acct = (st.accountCurrency ?? 'USD').toUpperCase();
                          if (quote && quote === acct) {
                            return (
                              <p className="text-xs text-zinc-500 mt-1">
                                Auto: quote currency = account currency → 1.0
                              </p>
                            );
                          }
                          if (quote && quote !== acct && (st.quoteRate ?? 1) === 1) {
                            return (
                              <p className="text-xs text-amber-300 mt-1">
                                Cross-currency pair: quote rate is still 1.0, so P&amp;L will not be
                                converted to {acct}. Enter the {quote}→{acct} rate.
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    {(() => {
                      const pipSize = getPipSize(st.symbol);
                      const { base, quote } = parseForexPair(st.symbol);
                      if (!base && !quote) return null;
                      return (
                        <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                          {base && quote && (
                            <span>Base: <span className="text-zinc-400">{base}</span> / Quote: <span className="text-zinc-400">{quote}</span></span>
                          )}
                          <span>Pip size: <span className="text-zinc-400">{pipSize}</span></span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Exit Time — shown only when exit price is set */}
                {(st.exitPrice && st.exitPrice > 0) && (
                  <div className="mb-6">
                    <Label className="text-xs text-zinc-400 mb-2 block">Exit Time</Label>
                    <button
                      type="button"
                      onClick={() => setShowExitDatePicker(true)}
                      className="w-full bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 px-4 flex items-center justify-between hover:border-yellow-200/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {st.closeAt ? formatTradeDate(new Date(st.closeAt), timezone).split(',')[0] : 'Select Date'}
                        </span>
                        <span className="text-yellow-400">•</span>
                        <span className="text-sm font-medium tabular-nums">
                          {st.closeAt ? new Date(st.closeAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          }) : '--:--'}
                        </span>
                      </div>
                      <Clock className="w-4 h-4 text-zinc-500" />
                    </button>
                  </div>
                )}

                {/* DYNAMIC R:R BAR - Trade Summary Mode */}
                <div className="mt-8 pt-6 border-t-2 border-yellow-200/10">
                  <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 rounded-xl p-5 border border-yellow-200/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Live Risk/Reward</span>
                      <span className="text-[10px] text-zinc-500">Updates in real-time</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                        <div className="text-[10px] text-red-400 mb-1">RISK</div>
                        <div className="text-xl font-bold text-red-400">
                          ${formatNumber(st.riskUSD, 0)}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1">
                          {formatNumber(st.riskPts, 2)} pts
                        </div>
                      </div>
                      
                      <div className="text-center p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                        <div className="text-[10px] text-yellow-400 mb-1">R:R RATIO</div>
                        <div className={`text-2xl font-black transition-colors duration-300 ${getRRColorClass(st.rr)}`}>
                          {st.rr > 0 ? `1:${formatNumber(st.rr, 2)}` : "—"}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1">
                          {st.rr >= 2 ? "Excellent" : st.rr >= 1 ? "Good" : st.rr > 0 ? "Poor" : "N/A"}
                        </div>
                      </div>
                      
                      <div className="text-center p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                        <div className="text-[10px] text-emerald-400 mb-1">REWARD</div>
                        <div className="text-xl font-bold text-emerald-400">
                          ${formatNumber(st.rewardUSD, 0)}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1">
                          {formatNumber(st.rewardPts, 2)} pts
                        </div>
                      </div>
                    </div>
                    
                    {/* Visual R:R Bar */}
                    <div className="relative h-3 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                          st.rr >= 2 ? "bg-gradient-to-r from-emerald-600 to-emerald-400" :
                          st.rr >= 1 ? "bg-gradient-to-r from-yellow-600 to-yellow-400" :
                          "bg-gradient-to-r from-red-600 to-red-400"
                        }`}
                        style={{ width: `${Math.min(st.rr * 33.33, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* 🔥 RISK-FREE BANNER — shown when stop is on the profit side */}
                  {(() => {
                    if (!st.entryPrice || !st.stopPrice || !st.quantity) return null;
                    const signedRisk = st.side === 'LONG'
                      ? st.entryPrice - st.stopPrice
                      : st.stopPrice - st.entryPrice;
                    if (signedRisk >= 0) return null; // normal risk-defined
                    // Stop is in profit territory → risk-free
                    const effectiveMultiplier = normalizeAssetClass(st.assetClass) === 'options'
                      ? 100
                      : getAssetMultiplier(st.symbol);
                    const lockedProfit = Math.abs(signedRisk) * st.quantity * effectiveMultiplier - st.fees;
                    return (
                      <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-sm font-semibold text-emerald-400">Risk-Free — Locked Profit {lockedProfit >= 0 ? `$${formatNumber(lockedProfit, 2)}` : '—'}</span>
                        </div>
                        <p className="text-xs text-emerald-300/70 ml-6">
                          Your stop is in profit territory. This trade carries no downside risk.
                        </p>
                      </div>
                    );
                  })()}

                  {/* 🔥 USER'S PERSONAL R DISPLAY - Trade Summary Mode */}
                  {oneRValue > 0 && userRiskR !== undefined && (
                    <div className="mt-4 bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl p-5 border border-purple-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-purple-400 uppercase tracking-wider flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Your Personal Risk (1R = ${formatNumber(oneRValue, 2)})
                        </span>
                        <span className="text-[10px] text-zinc-500">Based on your settings</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                          <div className="text-[10px] text-zinc-400 mb-2">YOU'RE RISKING</div>
                          <div className={`text-3xl font-black ${
                            userRiskR <= 1 ? 'text-emerald-400' :
                            userRiskR <= 2 ? 'text-yellow-400' :
                            userRiskR <= 3 ? 'text-orange-400' :
                            'text-red-400'
                          }`}>
                            {userRiskR.toFixed(1)}R
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            {userRiskR <= 1 ? '✅ Conservative' :
                             userRiskR <= 2 ? '⚠️ Moderate' :
                             userRiskR <= 3 ? '🔥 Aggressive' :
                             '🚨 Very High Risk!'}
                          </div>
                        </div>
                        
                        {userRewardR !== undefined && (
                          <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                            <div className="text-[10px] text-zinc-400 mb-2">POTENTIAL REWARD</div>
                            <div className="text-3xl font-black text-emerald-400">
                              +{userRewardR.toFixed(1)}R
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                              If TP hits
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Warning if risk is too high */}
                      {userRiskR > 2 && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <div className="flex items-center gap-2 text-red-400 text-xs">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-medium">
                              High risk! Consider reducing position size.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* P&L Display - Trade Summary Mode */}
                  {((st.exitPrice && st.exitPrice > 0) || (usePartialExits && partialExits.some(e => e.price > 0 && (e.percentage || 0) > 0))) && (
                    <div className="mt-4 bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 rounded-xl p-5 border border-yellow-200/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Trade Result</span>
                        {usePartialExits && partialExits.some(e => e.price > 0 && (e.percentage || 0) > 0) && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <Percent className="w-3 h-3" />
                            from partial exits
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                          <div className="text-[10px] text-zinc-400 mb-2">P&L</div>
                          <div className={`text-3xl font-black ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pnl >= 0 ? '+' : ''}${formatNumber(pnl, 0)}
                          </div>
                        </div>
                        
                        <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                          <div className="text-[10px] text-zinc-400 mb-2">OUTCOME</div>
                          <div className={`text-2xl font-black ${
                            outcome === 'WIN' ? 'text-emerald-400' :
                            outcome === 'LOSS' ? 'text-red-400' :
                            'text-zinc-400'
                          }`}>
                            {outcome}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* 🔥 RISK-ONLY MODE - New Simple UI */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {riskInputMode === 'risk-only' && (
              <>
                {/* Info Banner */}
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white">Quick Risk Entry Mode</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Enter dollar amounts directly. Perfect for quick logging without calculating prices.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Risk & Target Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Risk $ */}
                  <div>
                    <Label htmlFor="directRisk" className="text-xs text-zinc-400 mb-2 block flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Risk Amount (USD) *
                    </Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 font-medium">$</span>
                      <Input
                        id="directRisk"
                        type="number"
                        step="any"
                        min="0"
                        value={directRiskUSD || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setDirectRiskUSD(isNaN(val) ? 0 : val);
                        }}
                        placeholder="100"
                        className="bg-[#0E0E0E] border border-red-500/30 rounded-xl h-14 text-zinc-200 text-right text-xl font-semibold pl-10 pr-4 focus:border-red-500/60 transition-all"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2">How much were you willing to lose?</p>
                  </div>

                  {/* Target $ */}
                  <div>
                    <Label htmlFor="directTarget" className="text-xs text-zinc-400 mb-2 block flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Target Amount (USD)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-medium">$</span>
                      <Input
                        id="directTarget"
                        type="number"
                        step="any"
                        min="0"
                        value={directTargetUSD || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setDirectTargetUSD(isNaN(val) ? 0 : val);
                        }}
                        placeholder="200"
                        className="bg-[#0E0E0E] border border-emerald-500/30 rounded-xl h-14 text-zinc-200 text-right text-xl font-semibold pl-10 pr-4 focus:border-emerald-500/60 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2">How much were you aiming to make?</p>
                  </div>
                </div>

                {/* Result $ */}
                <div className="mb-6">
                  <Label htmlFor="directResult" className="text-xs text-zinc-400 mb-2 block flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    Actual Result (USD) - Optional
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400 font-medium">$</span>
                    <Input
                      id="directResult"
                      type="number"
                      step="any"
                      value={directResultUSD ?? ""}
                      onChange={(e) => {
  const value = e.target.value.trim();
  
  // Empty = no result entered
  if (value === "") {
    setDirectResultUSD(null);
    return;
  }
  
  // Allow typing "-" for negative numbers
  if (value === "-") {
    return; // Don't change state, let user continue typing
  }
  
  const val = parseFloat(value);
  if (!isNaN(val)) {
    setDirectResultUSD(val);
    console.log('🔥 Result set to:', val, typeof val);
  }
}}
                      placeholder="150 (or -50 for loss)"
                      className="bg-[#0E0E0E] border border-yellow-500/30 rounded-xl h-14 text-zinc-200 text-right text-xl font-semibold pl-10 pr-4 focus:border-yellow-500/60 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-2">
                    Leave empty for open trade. Use negative for losses (e.g., -50).
                  </p>
                </div>

                {/* 🔥 RISK-ONLY R:R Display */}
                <div className="mt-8 pt-6 border-t-2 border-yellow-200/10">
                  <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 rounded-xl p-5 border border-yellow-200/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Calculated Metrics</span>
                      <span className="text-[10px] text-zinc-500">From your USD values</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                        <div className="text-[10px] text-red-400 mb-1">RISK</div>
                        <div className="text-xl font-bold text-red-400">
                          ${formatNumber(directRiskUSD, 0)}
                        </div>
                      </div>
                      
                      <div className="text-center p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                        <div className="text-[10px] text-yellow-400 mb-1">R:R RATIO</div>
                        <div className={`text-2xl font-black transition-colors duration-300 ${getRRColorClass(riskOnlyRR)}`}>
                          {riskOnlyRR > 0 ? `1:${formatNumber(riskOnlyRR, 2)}` : "—"}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1">
                          {riskOnlyRR >= 2 ? "Excellent" : riskOnlyRR >= 1 ? "Good" : riskOnlyRR > 0 ? "Poor" : "N/A"}
                        </div>
                      </div>
                      
                      <div className="text-center p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                        <div className="text-[10px] text-emerald-400 mb-1">TARGET</div>
                        <div className="text-xl font-bold text-emerald-400">
                          ${formatNumber(directTargetUSD, 0)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Visual R:R Bar */}
                    <div className="relative h-3 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                          riskOnlyRR >= 2 ? "bg-gradient-to-r from-emerald-600 to-emerald-400" :
                          riskOnlyRR >= 1 ? "bg-gradient-to-r from-yellow-600 to-yellow-400" :
                          "bg-gradient-to-r from-red-600 to-red-400"
                        }`}
                        style={{ width: `${Math.min(riskOnlyRR * 33.33, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* 🔥 USER'S PERSONAL R DISPLAY - Risk Only Mode */}
                  {oneRValue > 0 && riskOnlyUserRiskR !== undefined && (
                    <div className="mt-4 bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl p-5 border border-purple-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-purple-400 uppercase tracking-wider flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Your Personal Risk (1R = ${formatNumber(oneRValue, 2)})
                        </span>
                        <span className="text-[10px] text-zinc-500">Based on your settings</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                          <div className="text-[10px] text-zinc-400 mb-2">YOU'RE RISKING</div>
                          <div className={`text-3xl font-black ${
                            riskOnlyUserRiskR <= 1 ? 'text-emerald-400' :
                            riskOnlyUserRiskR <= 2 ? 'text-yellow-400' :
                            riskOnlyUserRiskR <= 3 ? 'text-orange-400' :
                            'text-red-400'
                          }`}>
                            {riskOnlyUserRiskR.toFixed(1)}R
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            {riskOnlyUserRiskR <= 1 ? '✅ Conservative' :
                             riskOnlyUserRiskR <= 2 ? '⚠️ Moderate' :
                             riskOnlyUserRiskR <= 3 ? '🔥 Aggressive' :
                             '🚨 Very High Risk!'}
                          </div>
                        </div>
                        
                        {riskOnlyUserRewardR !== undefined && (
                          <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                            <div className="text-[10px] text-zinc-400 mb-2">POTENTIAL REWARD</div>
                            <div className="text-3xl font-black text-emerald-400">
                              +{riskOnlyUserRewardR.toFixed(1)}R
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                              If target hits
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Warning if risk is too high */}
                      {riskOnlyUserRiskR > 2 && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <div className="flex items-center gap-2 text-red-400 text-xs">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-medium">
                              High risk! Consider reducing position size.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🔥 Result Display - Risk Only Mode */}
                  {directResultUSD !== null && (
                    <div className="mt-4 bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 rounded-xl p-5 border border-yellow-200/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Trade Result</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                          <div className="text-[10px] text-zinc-400 mb-2">P&L</div>
                          <div className={`text-3xl font-black ${directResultUSD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {directResultUSD >= 0 ? '+' : ''}${formatNumber(directResultUSD, 0)}
                          </div>
                        </div>
                        
                        <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                          <div className="text-[10px] text-zinc-400 mb-2">OUTCOME</div>
                          <div className={`text-2xl font-black ${
                            riskOnlyOutcome === 'WIN' ? 'text-emerald-400' :
                            riskOnlyOutcome === 'LOSS' ? 'text-red-400' :
                            'text-zinc-400'
                          }`}>
                            {riskOnlyOutcome}
                          </div>
                        </div>
                        
                        <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                          <div className="text-[10px] text-zinc-400 mb-2">ACTUAL R</div>
                          <div className={`text-2xl font-black ${
                            (riskOnlyActualR ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {riskOnlyActualR !== null ? `${riskOnlyActualR >= 0 ? '+' : ''}${formatNumber(riskOnlyActualR, 2)}R` : '—'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Actual User R */}
                      {oneRValue > 0 && riskOnlyActualUserR !== null && (
                        <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-purple-400 flex items-center gap-2">
                              <Zap className="w-3 h-3" />
                              You achieved:
                            </span>
                            <span className={`text-lg font-black ${riskOnlyActualUserR >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {riskOnlyActualUserR >= 0 ? '+' : ''}{formatNumber(riskOnlyActualUserR, 2)}R
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </section>

        {/* BLOCK 3: NOTES & MEDIA */}
        <section className="mt-8">
          <Card className="rounded-2xl border border-yellow-200/20 bg-[linear-gradient(145deg,#0b0b0b,#121212)] shadow-[0_0_40px_rgba(0,0,0,0.25)] p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#C9A646] tracking-wide uppercase text-xs">Notes & Media</h2>
              <span className="text-xs text-zinc-500">Step 3 of 3</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {tabBtn("notes", "Notes")}
              {tabBtn("screenshot", "Screenshot")}
              {tabBtn("mistakes", "Lessons")}
            </div>

            {/* Tab Content */}
            {tab === "notes" && (
              <div>
                <textarea
                  value={st.notes || ""}
                  onChange={(e) => st.setNotes(e.target.value)}
                  placeholder="What was your thesis? How did you feel? What worked?"
                  className="w-full min-h-[200px] rounded-xl bg-[#0E0E0E] border border-yellow-200/15 p-4 text-sm text-zinc-200 outline-none transition focus:ring-2 focus:ring-[#C9A646]/40"
                />
                <div className="mt-2 text-xs text-zinc-500 text-right">
                  {(st.notes || "").trim().split(/\s+/).filter(Boolean).length} words
                </div>
              </div>
            )}

            {tab === "screenshot" && (
              <MultiUploadZone 
                screenshots={screenshotFiles.map(file => ({ 
                  file, 
                  preview: URL.createObjectURL(file) 
                }))}
                onScreenshotsChange={(screenshots) => {
                  setScreenshotFiles(screenshots.map(s => s.file));
                }}
                maxFiles={4}
              />
            )}

            {tab === "mistakes" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="mistake" className="text-xs text-zinc-400 mb-2 block">
                    What went wrong?
                  </Label>
                  <Select value={st.mistake || ""} onValueChange={(v) => st.setMistake(v)}>
                    <SelectTrigger className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200">
                      <SelectValue placeholder="Select mistake type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">✅ No mistake</SelectItem>
                      <SelectItem value="slippage">💸 Slippage</SelectItem>
                      <SelectItem value="emotional">😤 Emotional entry</SelectItem>
                      <SelectItem value="missed_tp">🎯 Missed TP</SelectItem>
                      <SelectItem value="poor_sizing">📊 Poor sizing</SelectItem>
                      <SelectItem value="no_plan">📝 No plan</SelectItem>
                      <SelectItem value="revenge">⚔️ Revenge trade</SelectItem>
                      <SelectItem value="fomo">🏃 FOMO</SelectItem>
                      <SelectItem value="overtrading">🔄 Overtrading</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="nextTime" className="text-xs text-zinc-400 mb-2 block">
                    Next time I will...
                  </Label>
                  <Input
                    id="nextTime"
                    value={st.nextTime || ""}
                    onChange={(e) => st.setNextTime(e.target.value)}
                    placeholder="Be patient for confirmation..."
                    className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200"
                  />
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Action Buttons */}
        <section className="mt-12 mb-16">
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (confirm("Discard draft and go back?")) {
                  st.clearDraft();
                  navigate(-1);
                }
              }}
              className="px-8 py-3 rounded-xl text-sm font-medium text-zinc-400 border border-zinc-700 hover:bg-zinc-900 hover:text-zinc-300 transition-all"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || loading || subscriptionLoading}
              className="px-16 py-3 rounded-xl text-sm font-bold text-black transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_10px_40px_rgba(201,166,70,0.3)]"
              style={{ 
                background: isValid 
                  ? 'linear-gradient(135deg, #B8944E, #E6C675)' 
                  : 'linear-gradient(135deg, #555, #666)'
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isEditMode ? 'Update Trade' : 'Create Trade'}
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              )}
            </button>
            
            {!isValid && (
              <div className="text-xs text-amber-400">
                ⚠ {riskInputMode === 'summary' ? 'Fill required fields' : 'Enter symbol & risk amount'}
              </div>
            )}
          </div>
          
          {/* Keyboard Shortcuts Hint */}
          <div className="mt-6 text-center text-[10px] text-zinc-600">
            <kbd className="px-2 py-1 bg-zinc-900 rounded border border-zinc-800">Ctrl</kbd>
            {" + "}
            <kbd className="px-2 py-1 bg-zinc-900 rounded border border-zinc-800">S</kbd>
            {" = Save • "}
            <kbd className="px-2 py-1 bg-zinc-900 rounded border border-zinc-800">Ctrl</kbd>
            {" + "}
            <kbd className="px-2 py-1 bg-zinc-900 rounded border border-zinc-800">Enter</kbd>
            {" = Submit"}
          </div>
        </section>
      </main>

      {/* 🎨 Date/Time Picker Modal with Timezone */}
      <DateTimePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        value={st.openAt}
        onChange={(value) => st.setOpenAt(value)}
        timezone={timezone}
      />

      {/* 🎨 Exit Date/Time Picker Modal */}
      <DateTimePickerModal
        isOpen={showExitDatePicker}
        onClose={() => setShowExitDatePicker(false)}
        value={st.closeAt}
        onChange={(value) => st.setCloseAt(value)}
        timezone={timezone}
      />

      {/* 🔥 Partial Exits Popup */}
      <PartialExitsPopup
        isOpen={showPartialExits}
        onClose={() => setShowPartialExits(false)}
        totalQuantity={st.quantity}
        entryPrice={st.entryPrice}
        side={st.side}
        multiplier={st.multiplier}
        fees={st.fees}
        exits={partialExits}
        onExitsChange={setPartialExits}
        onApply={handlePartialExitsApply}
      />

      {/* Insight Popup */}
      {currentInsight && (
        <InsightPopup
          isOpen={showInsight}
          onClose={() => setShowInsight(false)}
          insight={currentInsight}
        />
      )}

      {/* 🔥 Compact Trade Limit Modal (Free & Basic) */}
      <UpgradeLimitDialog
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        reason="free-trade-limit"
        used={limits?.trade_count ?? 0}
        max={15}
      />
      <TradeLimitModal
        open={showBasicLimitModal}
        onClose={() => setShowBasicLimitModal(false)}
        planType="basic"
        tradesUsed={limits?.used ?? 0}
        maxTrades={25}
      />
      {/* 🏦 Broker Connect Modals */}
      {showBrokerPicker && (
        <Suspense fallback={null}>
          <BrokerPickerModal
            onClose={() => setShowBrokerPicker(false)}
            onSelect={handleBrokerPickerSelect}
          />
        </Suspense>
      )}
      {showTradovateModal && (
        <Suspense fallback={null}>
          <TradovateConnectModal
            onClose={() => {
              setShowTradovateModal(false);
              refetchPortfolios();
            }}
          />
        </Suspense>
      )}

      {/* Usage Warning Modal */}
      {showUsageWarning && warningState && (
        <UsageWarningModal
          open={showUsageWarning}
          onClose={handleWarningClose}
          daysActive={warningState.daysActive}
          avgTradesPerDay={warningState.avgTradesPerDay}
          projectedTotal={warningState.projectedTotal}
          daysRemaining={warningState.daysRemaining}
          currentTradeCount={warningState.currentTradeCount}
        />
      )}
    </>
  );
}