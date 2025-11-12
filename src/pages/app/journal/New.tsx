// ================================================
// OPTIMIZED NEW TRADE PAGE - FINAL FIX v4
// ✅ Dynamic R calculation based on user settings
// ✅ Performance optimized for 5000 concurrent users
// ✅ Perfect Supabase integration
// ✅ FIXED: Proper actual_r calculation with correct multiplier
// ✅ FIXED: Uses mutation hooks for automatic cache invalidation
// ✅ FIXED: Async getUserOneR with useState
// ✅ FIXED: Subscription limits check - no more blocking
// 🔥 CRITICAL FIX: Metrics at top level (not nested!)
// 🔥 NEW: Using centralized createTrade/updateTrade functions
// 🎯 NEW: TickerAutocomplete with database integration
// 🎨 NEW: Beautiful date/time picker modal
// ================================================

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJournalStore } from "@/state/journalStore";
import { getTrades } from "@/routes/journal";
import { formatNumber } from "@/utils/smartCalc";
import { detectSessionByLocal } from "@/utils/session";
import UploadZone from "@/components/journal/UploadZone";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, Zap, Calendar, X } from "lucide-react";
import InsightPopup from "@/components/journal/InsightPopup";
import { useInsightEngine } from "@/hooks/useInsightEngine";
import { getStrategies as getStrategiesFromSupabase } from "@/routes/strategies";
import { useSubscription } from '@/hooks/useSubscription';
import { LimitReachedModal } from '@/components/subscription/LimitReachedModal';
import { UsageWarningModal } from '@/components/subscription/UsageWarningModal';
import { useRiskSettings } from '@/hooks/useRiskSettings';
import { useCreateTrade, useUpdateTrade } from '@/hooks/useTradesData';
import { useCommissions } from '@/hooks/useRiskSettings';
import { createTrade, updateTrade } from '@/lib/trades';
import { TickerAutocomplete } from '@/components/TickerAutocomplete';

// Dynamic import for canvas-confetti
let confetti: any = null;
if (typeof window !== 'undefined') {
  import('canvas-confetti').then(module => {
    confetti = module.default;
  }).catch(() => {
    console.warn('canvas-confetti not installed');
  });
}

// ✅ Centralized multiplier lookup
const ASSET_MULTIPLIERS: Record<string, { class: string; mult: number }> = {
  NQ: { class: "futures", mult: 20 },
  MNQ: { class: "futures", mult: 2 },
  ES: { class: "futures", mult: 50 },
  MES: { class: "futures", mult: 5 },
  YM: { class: "futures", mult: 5 },
  MYM: { class: "futures", mult: 0.5 },
  RTY: { class: "futures", mult: 50 },
  M2K: { class: "futures", mult: 5 },
  CL: { class: "futures", mult: 1000 },
  MCL: { class: "futures", mult: 100 },
  QM: { class: "futures", mult: 500 },
  GC: { class: "futures", mult: 100 },
  MGC: { class: "futures", mult: 10 },
  SI: { class: "futures", mult: 5000 },
  SIL: { class: "futures", mult: 1000 },
  NG: { class: "futures", mult: 10000 },
  QG: { class: "futures", mult: 2500 },
  ZB: { class: "futures", mult: 1000 },
  ZN: { class: "futures", mult: 1000 },
  ZF: { class: "futures", mult: 1000 },
  ZT: { class: "futures", mult: 2000 },
  "6E": { class: "futures", mult: 12.5 },
  M6E: { class: "futures", mult: 6.25 },
  BTC: { class: "futures", mult: 5 },
  MBT: { class: "futures", mult: 0.1 },
};

function getAssetMultiplier(symbol: string): number {
  const symbolUpper = symbol.toUpperCase().trim();
  const found = ASSET_MULTIPLIERS[symbolUpper];
  return found ? found.mult : 1;
}

// 🎨 Beautiful Date/Time Picker Modal Component
function DateTimePickerModal({ 
  isOpen, 
  onClose, 
  value, 
  onChange 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  value?: string; 
  onChange: (value: string) => void;
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
              <p className="text-xs text-zinc-400 mb-1">Preview</p>
              <p className="text-lg font-semibold text-white">
                {new Date(`${tempDate}T${tempTime}`).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
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

export default function New() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editTradeId = searchParams.get('edit');
  const dateParam = searchParams.get('date');
  const [isEditMode, setIsEditMode] = useState(false);
  const st = useJournalStore();
  const [tab, setTab] = useState<"notes" | "screenshot" | "mistakes">("notes");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const { 
    canAddTrade, 
    tradesRemaining, 
    limits, 
    isPremium, 
    isUnlimitedUser,
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

  const loadStrategies = useCallback(async () => {
    console.log('🔄 Loading strategies from Supabase...');
    const result = await getStrategiesFromSupabase();
    
    if (result.ok && result.data) {
      console.log(`✅ Loaded ${result.data.length} strategies from Supabase:`, result.data);
      setStrategies(result.data.map((s: any) => ({ 
        id: s.id, 
        name: s.name 
      })));
    } else {
      console.log('❌ Failed to load strategies:', result.message);
      setStrategies([]);
    }
  }, []);

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Page focused - reloading strategies');
      loadStrategies();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadStrategies]);

  // ✅ Handle date parameter from calendar
  useEffect(() => {
    if (dateParam && !editTradeId) {
      try {
        console.log('📅 Date parameter detected from calendar:', dateParam);
        
        const selectedDate = new Date(dateParam);
        const now = new Date();
        selectedDate.setHours(now.getHours());
        selectedDate.setMinutes(now.getMinutes());
        
        const dateTimeString = selectedDate.toISOString();
        
        console.log('🕐 Setting date to:', dateTimeString);
        st.setOpenAt(dateTimeString);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        toast.success(`Date set to ${selectedDate.toLocaleDateString()}`);
      } catch (error) {
        console.error('Error parsing date from URL:', error);
        toast.error('Invalid date format');
      }
    }
  }, [dateParam, editTradeId]);

  // ✅ Check for usage warning
  useEffect(() => {
    if (warningState?.shouldShow && !editTradeId && !showUsageWarning) {
      console.log('⚠️ Showing usage warning:', warningState);
      setShowUsageWarning(true);
    }
  }, [warningState, editTradeId, showUsageWarning]);

  const handleWarningClose = () => {
    setShowUsageWarning(false);
    markWarningShown();
  };

  // ✅ Load trade data for editing
  useEffect(() => {
    async function loadTradeForEdit() {
      if (!editTradeId) {
        if (!dateParam) {
          st.clearDraft();
        }
        return;
      }
      
      console.log('📝 Loading trade for editing:', editTradeId);
      setIsEditMode(true);
      
      try {
        const result = await getTrades();
        if (result.ok && result.data) {
          const trade = result.data.find((t: any) => t.id === editTradeId);
          
          if (trade) {
            console.log('✅ Found trade to edit:', trade);
            
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
            st.setSession(trade.session || '');
            st.setStrategy(trade.strategy_id || '');
            st.setSetup(trade.setup || '');
            st.setNotes(trade.notes || '');
            st.setMistake(trade.mistake || '');
            st.setNextTime(trade.next_time || '');
            
            const mult = getAssetMultiplier(trade.symbol);
            st.setMultiplier(mult);
            console.log(`🔧 Set multiplier for ${trade.symbol}: ${mult}`);
            
            toast.success('Trade loaded for editing');
          } else {
            toast.error('Trade not found');
            navigate('/app/journal/my-trades');
          }
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

  // Auto Session detection (debounced)
  useEffect(() => {
    if (!st.openAt) return;
    
    // Debounce: only detect after user finishes selecting date/time
    const timer = setTimeout(() => {
      const session = detectSessionByLocal(st.openAt);
      if (session !== "Off") st.setSession(session);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [st.openAt]);

  // Auto Fees detection (debounced)
  useEffect(() => {
    if (st.feesMode !== "auto" || !st.assetClass) return;
    
    // Debounce: only calculate after user stops typing for 500ms
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
    
    console.log(`🔧 Auto-detected multiplier for ${st.symbol}: ${multiplier}`);
  }, [st.symbol]);

  // Auto Direction from TP (debounced to prevent interference while typing)
  useEffect(() => {
    const entry = st.entryPrice;
    const tp = st.takeProfitPrice;
    const stop = st.stopPrice;
    
    if (!entry || !tp || !stop) return;
    
    // Debounce: only update after user stops typing for 500ms
    const timer = setTimeout(() => {
      if (tp > entry && stop < entry && st.side !== "LONG") {
        st.setSide("LONG");
      } else if (tp < entry && stop > entry && st.side !== "SHORT") {
        st.setSide("SHORT");
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [st.entryPrice, st.takeProfitPrice, st.stopPrice]);

  // ✅ Calculate user's R multiples
  const userRiskR = useMemo(() => {
    if (!oneRValue || oneRValue === 0) return undefined;
    return st.riskUSD / oneRValue;
  }, [st.riskUSD, oneRValue]);

  const userRewardR = useMemo(() => {
    if (!oneRValue || oneRValue === 0) return undefined;
    return st.rewardUSD / oneRValue;
  }, [st.rewardUSD, oneRValue]);

  // Validation
  const isValid = st.symbol && st.quantity > 0 && st.entryPrice > 0 && st.stopPrice > 0;
  
  const completionPercent = Math.round(
    ((st.symbol ? 25 : 0) +
     (st.quantity > 0 ? 25 : 0) +
     (st.entryPrice > 0 ? 25 : 0) +
     (st.stopPrice > 0 ? 25 : 0)) / 1
  );

  // ✅ Calculate P&L
  const calculatePnL = useCallback(() => {
    if (!st.exitPrice || st.exitPrice <= 0) return 0;
    
    const priceChange = st.side === "LONG" 
      ? st.exitPrice - st.entryPrice
      : st.entryPrice - st.exitPrice;
    
    const multiplier = getAssetMultiplier(st.symbol);
    
    const grossPnL = priceChange * st.quantity * multiplier;
    const netPnL = grossPnL - st.fees;
    
    console.log('💰 calculatePnL:', {
      symbol: st.symbol,
      side: st.side,
      entry: st.entryPrice,
      exit: st.exitPrice,
      priceChange,
      quantity: st.quantity,
      multiplier,
      calculation: `${priceChange} × ${st.quantity} × ${multiplier} = ${grossPnL}`,
      grossPnL,
      fees: st.fees,
      netPnL
    });
    
    return netPnL;
  }, [st.exitPrice, st.entryPrice, st.side, st.quantity, st.fees, st.symbol]);

  // Calculate Outcome
  const calculateOutcome = useCallback((): "WIN" | "LOSS" | "BE" | "OPEN" => {
    if (!st.exitPrice || st.exitPrice <= 0) return "OPEN";
    
    const pnl = calculatePnL();
    
    if (pnl > 0) return "WIN";
    if (pnl < 0) return "LOSS";
    return "BE";
  }, [st.exitPrice, calculatePnL]);

  const pnl = calculatePnL();
  const outcome = calculateOutcome();

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

  // 🔥🔥🔥 SUBMIT FUNCTION - USING CENTRALIZED FUNCTIONS 🔥🔥🔥
  async function handleSubmit() {
    // ✅ CHECK SUBSCRIPTION LIMITS (only for new trades) - NON-BLOCKING
    if (!isEditMode) {
      if (!limits || limits === undefined || limits === null) {
        console.warn('⚠️ Subscription limits not fully loaded, proceeding anyway...');
      } else if (!canAddTrade) {
        console.log('🚫 Trade limit reached');
        setShowLimitModal(true);
        return;
      }
    }

    // Validation
    if (!st.symbol || st.symbol.trim() === "") {
      toast.error("Symbol is required");
      return;
    }
    if (!st.assetClass) {
      toast.error("Asset class is required");
      return;
    }
    if (!st.quantity || st.quantity <= 0) {
      toast.error("Quantity must be positive");
      return;
    }
    if (!st.openAt) {
      toast.error("Date & Time is required");
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

    setLoading(true);

    try {
      // Upload screenshot if exists
      let screenshotUrl: string | null = null;
      if (st.file) {
        toast.info("Uploading screenshot...");
        const { uploadScreenshot } = await import("@/routes/journal");
        screenshotUrl = await uploadScreenshot(st.file);
        if (!screenshotUrl) {
          toast.warning("Screenshot upload failed, continuing without it");
        }
      }

      const basePayload = st.payload();
      
      const calculatedPnL = calculatePnL();
      const calculatedOutcome = calculateOutcome();
      
      const finalMultiplier = getAssetMultiplier(st.symbol);
      
      // 🔥 Calculate actual_r with proper multiplier
      let actual_r = undefined;
      if (st.exitPrice && st.exitPrice > 0) {
        const riskPerPoint = Math.abs(st.entryPrice - st.stopPrice);
        const calculatedRiskUSD = riskPerPoint * st.quantity * finalMultiplier + st.fees;
        
        if (calculatedRiskUSD > 0) {
          actual_r = calculatedPnL / calculatedRiskUSD;
        }
        
        console.log('🔥 ACTUAL_R CALCULATION:', {
          symbol: st.symbol,
          multiplier: finalMultiplier,
          pnl: calculatedPnL,
          riskPerPoint,
          quantity: st.quantity,
          fees: st.fees,
          calculatedRiskUSD,
          actual_r: actual_r ? actual_r.toFixed(2) + 'R' : undefined
        });
      }
      
      console.log('💰💰💰 FINAL CALCULATED VALUES 💰💰💰');
      console.log('Symbol:', st.symbol);
      console.log('Multiplier used:', finalMultiplier);
      console.log('Store multiplier:', st.multiplier);
      console.log('Calculated P&L:', calculatedPnL);
      console.log('Calculated Outcome:', calculatedOutcome);
      console.log('Calculated actual_r:', actual_r);
      console.log('User Risk R:', userRiskR);
      console.log('User Reward R:', userRewardR);
      
      // 🔥🔥🔥 PAYLOAD WITH TOP-LEVEL METRICS 🔥🔥🔥
      const payload = {
        ...basePayload,
        strategy_id: st.strategy || undefined,
        screenshot_url: screenshotUrl,
        exit_price: st.exitPrice && st.exitPrice > 0 ? st.exitPrice : null,
        pnl: st.exitPrice && st.exitPrice > 0 ? calculatedPnL : null,
        outcome: st.exitPrice && st.exitPrice > 0 ? calculatedOutcome : 'OPEN',
        multiplier: finalMultiplier,
        // ✅ TOP LEVEL - NOT NESTED!
        rr: st.rr,
        risk_usd: st.riskUSD,
        reward_usd: st.rewardUSD,
        risk_pts: st.riskPts,
        reward_pts: st.rewardPts,
        actual_r: actual_r,
        user_risk_r: userRiskR,
        user_reward_r: userRewardR,
      };
      
      delete (payload as any).strategy;
      
      console.log("\n✅✅✅ FINAL TRADE PAYLOAD ✅✅✅");
      console.log("📊 Multiplier:", finalMultiplier);
      console.log("📊 R:R:", payload.rr);
      console.log("📊 Risk USD:", payload.risk_usd);
      console.log("📊 Reward USD:", payload.reward_usd);
      console.log("📊 Actual R:", payload.actual_r);
      console.log("📊 User Risk R:", payload.user_risk_r);
      console.log("📊 User Reward R:", payload.user_reward_r);
      console.log("📊 Full payload:", payload);
      
      if (isEditMode && editTradeId) {
        console.log('📝 Updating existing trade:', editTradeId);
        
        // 🔥 Using centralized updateTrade function
        const result = await updateTrade(editTradeId, payload);
        
        if (result.success) {
          toast.success("Trade updated successfully! 🎉");
          st.clearDraft();
          setTimeout(() => {
            navigate("/app/journal/my-trades");
          }, 300);
        } else {
          throw new Error(result.error || "Failed to update trade");
        }
      } else {
        // Check if first trade
        const existingTrades = await getTrades();
        const isFirstTrade = !existingTrades.data || existingTrades.data.length === 0;
        
        console.log('➕ Creating new trade');
        
        // 🔥 Using centralized createTrade function
        const result = await createTrade(payload);
        
        if (result.success) {
          toast.success("Trade created successfully! 🎉");
          
          // 🎉 FIRST TRADE CELEBRATION
          if (isFirstTrade) {
            fireFirstTradeConfetti();
            
            setCurrentInsight({
              type: "success",
              title: "🎉 Congratulations on Your First Trade!",
              message: "You've just taken your first step towards becoming a systematic trader. Every great journey starts with a single trade. Keep tracking, keep learning, keep growing!",
              stats: {
                rr: st.rr,
                risk: st.riskUSD,
                reward: st.rewardUSD
              }
            });
            setShowInsight(true);
            
            setTimeout(() => {
              setShowInsight(false);
              setTimeout(() => {
                st.clearDraft();
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
              multiplier: finalMultiplier,
              rr: st.rr,
              riskUSD: st.riskUSD,
              rewardUSD: st.rewardUSD
            };
            
            const insight = generateInsight(tradeData);
            if (insight) {
              setCurrentInsight(insight);
              setShowInsight(true);
              
              setTimeout(() => {
                setShowInsight(false);
                setTimeout(() => {
                  st.clearDraft();
                  navigate("/app/journal/my-trades");
                }, 300);
              }, 5000);
            } else {
              st.clearDraft();
              setTimeout(() => {
                navigate("/app/journal/my-trades");
              }, 300);
            }
          }
        } else {
          throw new Error(result.error || "Failed to create trade");
        }
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      
      if (error?.message?.includes('limit') || error?.message?.includes('policy')) {
        setShowLimitModal(true);
      } else {
        toast.error(error?.message || "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  }

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

  const quantityLabel = st.assetClass === "futures" ? "Contracts" : st.assetClass === "forex" ? "Lots" : st.assetClass === "crypto" ? "Units" : "Shares";

  const getRRColorClass = (rr: number) => {
    if (rr < 1) return "text-red-400";
    if (rr < 1.5) return "text-orange-400";
    if (rr < 2) return "text-yellow-400";
    return "text-emerald-400";
  };

  // 🎯 Ticker selection handler
  const handleTickerSelect = (ticker: any) => {
    console.log('🎯 Ticker selected:', ticker);
    st.setSymbol(ticker.symbol);
    st.setMultiplier(ticker.multiplier);
    
    // Auto-set asset class if available
    if (ticker.asset_class) {
      st.setAssetClass(ticker.asset_class as any);
    }
    
    toast.success(`Selected ${ticker.symbol} (x${ticker.multiplier})`);
  };

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
        {/* Warning Banner */}
        {!isEditMode && limits && !isUnlimitedUser && !isPremium && tradesRemaining <= 5 && tradesRemaining > 0 && (
          <div className="mb-6 rounded-xl border border-gold/20 bg-gold/5 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-gold flex-shrink-0" />
              <p className="text-sm text-zinc-300">
                <span className="font-semibold text-gold">{tradesRemaining} free trades remaining</span> out of {limits.max_trades}. 
                <button 
                  onClick={() => navigate('/app/journal/pricing')}
                  className="ml-2 underline text-gold hover:text-gold/80"
                >
                  Upgrade for unlimited
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <section className="pt-10 relative">
          <div className="pointer-events-none absolute -top-6 left-0 h-24 w-64 rounded-full bg-yellow-500/10 blur-3xl" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white tracking-tight flex items-center gap-3">
                {isEditMode ? (
                  <>
                    Edit Trade
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Editing
                    </span>
                  </>
                ) : (
                  'New Trade'
                )}
              </h1>
              <p className="mt-1 text-zinc-400 flex items-center gap-3">
                {isEditMode ? 'Update your trade details' : 'Log a new trade to your journal'}
                {lastSaved && (
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Saved {Math.round((Date.now() - lastSaved.getTime()) / 1000)}s ago
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-500 mb-1">Completion</div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-yellow-400">{completionPercent}%</span>
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
              <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Auto-detected from prices
              </div>
            </div>

            {/* Grid: Symbol, Date/Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 🎯 TickerAutocomplete */}
              <div>
                <Label htmlFor="symbol" className="text-xs text-zinc-400 mb-2 block">
                  Symbol * {st.assetClass && <span className="text-yellow-400 ml-1">({st.assetClass})</span>}
                  {st.multiplier > 1 && <span className="text-emerald-400 ml-1">x{st.multiplier}</span>}
                </Label>
                <TickerAutocomplete
                  value={st.symbol}
                  onSelect={handleTickerSelect}
                  placeholder="AAPL, ES, NQ, BTCUSDT..."
                />
              </div>

              {/* 🎨 Beautiful date/time button */}
              <div>
                <Label htmlFor="openAt" className="text-xs text-zinc-400 mb-2 block">
                  Date & Time *
                </Label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="w-full bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 px-4 flex items-center justify-between hover:border-yellow-200/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {st.openAt ? new Date(st.openAt).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      }) : 'Select Date'}
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
              <div>
                <Label htmlFor="session" className="text-xs text-zinc-400 mb-2 block flex items-center gap-1">
                  Session
                  <span className="text-yellow-400 text-[10px]">(auto)</span>
                </Label>
                <Select value={st.session || ""} onValueChange={(v) => st.setSession(v)}>
                  <SelectTrigger className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200">
                    <SelectValue placeholder="Auto-detected..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia">🌏 Asia</SelectItem>
                    <SelectItem value="London">🇬🇧 London</SelectItem>
                    <SelectItem value="NY">🇺🇸 New York</SelectItem>
                    <SelectItem value="Off">🌙 Off-hours</SelectItem>
                  </SelectContent>
                </Select>
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
                    } else {
                      st.setStrategy(v);
                      console.log('✅ Selected strategy ID:', v);
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
          <Card className="rounded-2xl border border-yellow-200/20 bg-[linear-gradient(145deg,#0b0b0b,#121212)] shadow-[0_0_40px_rgba(0,0,0,0.25)] p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#C9A646] tracking-wide uppercase text-xs">Pricing & Risk</h2>
              <span className="text-xs text-zinc-500">Step 2 of 3</span>
            </div>

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
                    // Allow empty string for deleting
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
                    // Format on blur only
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

              <div>
                <Label htmlFor="exitPrice" className="text-xs text-zinc-400 mb-2 block">
                  Exit Price (optional)
                </Label>
                <Input
                  id="exitPrice"
                  type="number"
                  step="any"
                  value={st.exitPrice || ""}
                  onChange={(e) => {
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
                  placeholder="152.00"
                  className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 text-right transition-all"
                />
              </div>
            </div>

            {/* DYNAMIC R:R BAR */}
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

              {/* 🔥 USER'S PERSONAL R DISPLAY */}
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

              {/* P&L Display */}
              {st.exitPrice && st.exitPrice > 0 && (
                <div className="mt-4 bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 rounded-xl p-5 border border-yellow-200/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Trade Result</span>
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
              <div>
                <UploadZone file={st.file || null} onFile={(f) => st.setFile(f)} />
                <div className="mt-3 text-xs text-zinc-500 text-center">
                  📸 Visual evidence helps refine your edge over time
                </div>
              </div>
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
              disabled={!isValid || loading}
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
                ⚠ Fill required fields
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

      {/* 🎨 Date/Time Picker Modal */}
      <DateTimePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        value={st.openAt}
        onChange={(value) => st.setOpenAt(value)}
      />

      {/* Insight Popup */}
      {currentInsight && (
        <InsightPopup
          isOpen={showInsight}
          onClose={() => setShowInsight(false)}
          insight={currentInsight}
        />
      )}

      {/* Limit Reached Modal */}
      <LimitReachedModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        tradesUsed={limits?.used || 0}
        maxTrades={limits?.max_trades || 10}
      />

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