import { supabase } from '@/integrations/supabase/client';

// ================================================
// 🎯 TYPE DEFINITIONS
// ================================================

export interface TradeMetrics {
  rr?: number;
  riskUSD?: number;
  rewardUSD?: number;
  riskPts?: number;
  rewardPts?: number;
  actual_r?: number;
}

export interface Trade {
  id?: string;
  user_id?: string;
  open_at?: string;
  close_at?: string;
  symbol?: string;
  asset_class?: string;
  side?: "LONG" | "SHORT";
  quantity?: number;
  entry_price?: number;
  stop_price?: number;
  take_profit_price?: number;
  exit_price?: number;
  fees?: number;
  fees_mode?: string;
  session?: string;
  strategy_id?: string;
  strategy_name?: string;
  strategy?: any;
  setup?: string;
  notes?: string;
  mistake?: string;
  next_time?: string;
  tags?: string[];
  screenshot_url?: string;
  outcome?: "WIN" | "LOSS" | "BE" | "OPEN";
  pnl?: number;
  quality_tag?: string;
  metrics?: TradeMetrics;
  created_at?: string;
  updated_at?: string;
}

// ================================================
// 🚀 SESSION CACHE - Performance Optimization
// ================================================

let cachedSession: { userId: string | null; timestamp: number } = {
  userId: null,
  timestamp: 0
};

const SESSION_CACHE_DURATION = 60000; // 1 minute

/**
 * Get the effective user ID (with impersonation support)
 * 🚀 OPTIMIZED: Session caching to reduce auth calls
 */
export const getEffectiveUserId = async (): Promise<string | null> => {
  // Check for impersonation mode
  const impersonatedUserId = localStorage.getItem('impersonated_user_id');
  if (impersonatedUserId) {
    return impersonatedUserId;
  }
  
  // Check cache first
  const now = Date.now();
  if (cachedSession.userId && (now - cachedSession.timestamp) < SESSION_CACHE_DURATION) {
    return cachedSession.userId;
  }
  
  // Fetch from Supabase Auth
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.user) {
      cachedSession = { userId: null, timestamp: now };
      return null;
    }
    
    cachedSession = { userId: session.user.id, timestamp: now };
    return session.user.id;
  } catch (e) {
    cachedSession = { userId: null, timestamp: now };
    return null;
  }
};

/**
 * Clear the session cache
 */
export const clearSessionCache = () => {
  cachedSession = { userId: null, timestamp: 0 };
};

// ================================================
// 🚀 ASSET MULTIPLIERS - Performance Optimization
// ================================================

const ASSET_MULTIPLIERS: Record<string, number> = {
  'ES': 50, 'MES': 5, 'NQ': 20, 'MNQ': 2, 'YM': 5,
  'RTY': 50, 'CL': 1000, 'GC': 100, 'SI': 5000,
  'ZB': 1000, 'ZN': 1000,
};

const getAssetMultiplier = (symbol: string): number => {
  return ASSET_MULTIPLIERS[symbol.toUpperCase().trim()] || 1;
};

// ================================================
// 🎯 CALCULATION FUNCTIONS
// ================================================

/**
 * Calculate P&L and outcome for a trade
 * 🔥 FIXED: Proper actual_r calculation with multiplier consideration
 */
function calculateTradeOutcome(trade: Partial<Trade>) {
  if (!trade.exit_price) {
    return {
      outcome: 'OPEN' as const,
      pnl: 0,
      actual_r: 0
    };
  }

  const entry = trade.entry_price || 0;
  const stop = trade.stop_price || 0;
  const exit = trade.exit_price;
  const quantity = trade.quantity || 0;
  const fees = trade.fees || 0;
  const side = trade.side || 'LONG';

  // 🔥 CRITICAL FIX: Always use centralized multiplier lookup
  // This ensures futures contracts (NQ, ES, etc.) are calculated correctly
  const multiplier = getAssetMultiplier(trade.symbol || '');

  // Calculate P&L
  const priceDiff = side === 'LONG' 
    ? exit - entry
    : entry - exit;

  const grossPnL = priceDiff * quantity * multiplier;
  const netPnL = grossPnL - fees;

  // Determine outcome
  let outcome: 'WIN' | 'LOSS' | 'BE';
  if (netPnL > 0) {
    outcome = 'WIN';
  } else if (netPnL < 0) {
    outcome = 'LOSS';
  } else {
    outcome = 'BE';
  }

  // 🔥 CRITICAL FIX: Calculate actual_r with proper multiplier
  let actual_r = 0;
  let calculatedRiskUSD = 0;
  
  if (entry && stop && quantity) {
    // Recalculate riskUSD with proper multiplier
    const riskPerPoint = Math.abs(entry - stop);
    calculatedRiskUSD = riskPerPoint * quantity * multiplier + fees;
    
    if (calculatedRiskUSD > 0) {
      actual_r = netPnL / calculatedRiskUSD;
    }
  }

  console.log('💰 calculateTradeOutcome:', {
    symbol: trade.symbol,
    multiplier,
    entry,
    stop,
    exit,
    quantity,
    side,
    priceDiff,
    grossPnL,
    fees,
    netPnL,
    riskUSD: calculatedRiskUSD,
    actual_r: actual_r.toFixed(2) + 'R'
  });

  return {
    outcome,
    pnl: netPnL,
    actual_r
  };
}

// ================================================
// 🎯 UTILITY FUNCTIONS
// ================================================

const UUID_REGEX = /^[a-f0-9-]{36}$/i;

function normalizeStrategyValue(value: string | undefined): string | undefined {
  if (!value || value === 'none' || value === 'create_new') {
    return undefined;
  }
  
  if (UUID_REGEX.test(value)) {
    return value;
  }
  
  return undefined;
}

// ================================================
// 🎯 CRUD OPERATIONS
// ================================================

/**
 * Create a new trade
 * 🚀 OPTIMIZED: Fast validation, efficient processing
 */
export async function createTrade(payload: Partial<Trade>) {
  try {
    // Validation
    if (!payload.symbol || !payload.entry_price || !payload.stop_price || !payload.quantity) {
      return { ok: false, message: "Missing required fields: symbol, entry_price, stop_price, quantity" };
    }

    if (payload.stop_price === payload.entry_price) {
      return { ok: false, message: "Stop price cannot equal entry price" };
    }

    // Validate LONG/SHORT setup
    if (payload.take_profit_price && payload.entry_price && payload.stop_price && payload.side) {
      const { entry_price, stop_price, take_profit_price, side } = payload;
      
      const isValidLong = side === "LONG" && take_profit_price > entry_price && stop_price < entry_price;
      const isValidShort = side === "SHORT" && take_profit_price < entry_price && stop_price > entry_price;
      
      if (!isValidLong && !isValidShort) {
        return { 
          ok: false, 
          message: side === "LONG" 
            ? "Invalid LONG setup: TP must be above entry, SL below" 
            : "Invalid SHORT setup: TP must be below entry, SL above"
        };
      }
    }

    // Get user ID
    const userId = await getEffectiveUserId();
    if (!userId) {
      return { ok: false, message: "Not authenticated. Please log in." };
    }

    // Calculate outcome
    const { outcome, pnl, actual_r } = calculateTradeOutcome(payload);

    const metrics = payload.metrics || {};
    if (payload.exit_price && actual_r !== 0) {
      metrics.actual_r = actual_r;
    }

    // Normalize strategy_id
    const strategyValue = (payload as any).strategy_id || (payload as any).strategyId || payload.strategy;
    const normalizedStrategyId = normalizeStrategyValue(strategyValue);

    const tradeData: any = {
      user_id: userId,
      open_at: payload.open_at || new Date().toISOString(),
      symbol: payload.symbol.toUpperCase(),
      asset_class: payload.asset_class,
      side: payload.side || 'LONG',
      quantity: payload.quantity,
      entry_price: payload.entry_price,
      stop_price: payload.stop_price,
      take_profit_price: payload.take_profit_price,
      exit_price: payload.exit_price,
      fees: payload.fees || 0,
      fees_mode: payload.fees_mode || 'auto',
      session: payload.session,
      strategy_id: normalizedStrategyId,
      setup: payload.setup,
      notes: payload.notes,
      mistake: payload.mistake,
      next_time: payload.next_time,
      tags: payload.tags || [],
      screenshot_url: payload.screenshot_url,
      metrics: metrics,
      quality_tag: payload.quality_tag,
      outcome: payload.exit_price ? outcome : 'OPEN',
      pnl: payload.exit_price ? pnl : 0
    };

    console.log('✅ Creating trade with data:', {
      symbol: tradeData.symbol,
      outcome: tradeData.outcome,
      pnl: tradeData.pnl,
      actual_r: metrics.actual_r
    });

    const { data, error } = await supabase
      .from('trades')
      .insert(tradeData)
      .select()
      .single();

    if (error) {
      return { ok: false, message: error.message || "Failed to create trade" };
    }

    return { ok: true, data };
    
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error" };
  }
}

/**
 * Get all trades with strategy JOIN
 * 🚀 OPTIMIZED: Efficient query with only needed fields
 */
export async function getTrades(userId?: string) {
  try {
    const effectiveUserId = await getEffectiveUserId();
    
    if (!effectiveUserId) {
      return { ok: false, message: "Not authenticated", data: [] };
    }

    const { data, error } = await supabase
      .from('trades')
      .select(`
        id, user_id, open_at, close_at, symbol, asset_class, side,
        quantity, entry_price, stop_price, take_profit_price, exit_price,
        fees, fees_mode, session, strategy_id, setup, notes, mistake, next_time,
        tags, screenshot_url, outcome, pnl, quality_tag, metrics,
        strategy:strategies(id, name)
      `)
      .eq('user_id', effectiveUserId)
      .order('open_at', { ascending: false });

    if (error) {
      return { ok: false, message: error.message, data: [] };
    }

    // Process trades efficiently
const processedData = (data || []).map(trade => {
  const processedTrade: any = { ...trade };
  
  // Add strategy_name from JOIN result
  if (trade.strategy) {
    if (Array.isArray(trade.strategy) && trade.strategy.length > 0) {
      processedTrade.strategy_name = trade.strategy[0].name;
    } else if (typeof trade.strategy === 'object' && 'name' in trade.strategy) {
      processedTrade.strategy_name = (trade.strategy as any).name;
    }
  }
  
  // 🔥 CRITICAL FIX: Always recalculate actual_r if trade has exit_price
  // This ensures R values are always available for analytics
  if (trade.exit_price) {
    const { outcome, pnl, actual_r } = calculateTradeOutcome(trade);
    
    // Update outcome and pnl if missing
    if (!trade.outcome || trade.pnl === null || trade.pnl === undefined) {
      processedTrade.outcome = outcome;
      processedTrade.pnl = pnl;
    }
    
    // 🔥 ALWAYS ensure actual_r is calculated and available
    processedTrade.metrics = {
      ...trade.metrics,
      actual_r
    };
  }
  
  return processedTrade;
});
    return { ok: true, data: processedData };
    
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error", data: [] };
  }
}

/**
 * Update an existing trade
 * 🚀 OPTIMIZED: Efficient query with proper validation
 */
export async function updateTrade(id: string, payload: Partial<Trade>) {
  try {
    const userId = await getEffectiveUserId();
    
    if (!userId) {
      return { ok: false, message: "Not authenticated" };
    }

    // Get current trade
    const { data: currentTrade, error: fetchError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return { ok: false, message: fetchError.message };
    }

    let updatedPayload: any = { ...payload };
    
    // Normalize strategy_id
    if (payload.strategy || (payload as any).strategy_id) {
      const strategyValue = (payload as any).strategy_id || payload.strategy;
      updatedPayload.strategy_id = normalizeStrategyValue(strategyValue);
      delete updatedPayload.strategy;
    }

    // 🔥 CRITICAL: Calculate outcome if exit_price is being updated
    if (payload.exit_price !== undefined && currentTrade) {
      const mergedTrade = { ...currentTrade, ...updatedPayload };
      const { outcome, pnl, actual_r } = calculateTradeOutcome(mergedTrade);
      
      updatedPayload.outcome = outcome;
      updatedPayload.pnl = pnl;
      updatedPayload.metrics = {
        ...mergedTrade.metrics,
        ...payload.metrics,
        actual_r
      };

      console.log('✅ Updating trade with recalculated values:', {
        symbol: mergedTrade.symbol,
        outcome,
        pnl,
        actual_r: actual_r.toFixed(2) + 'R'
      });
    }

    const { data, error } = await supabase
      .from('trades')
      .update(updatedPayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, data };
    
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error" };
  }
}

/**
 * Close a trade
 * 🚀 OPTIMIZED: Reuses updateTrade function
 */
export async function closeTrade(id: string, exitPrice: number, additionalFees?: number) {
  try {
    const userId = await getEffectiveUserId();
    
    if (!userId) {
      return { ok: false, message: "Not authenticated" };
    }

    const { data: trade, error: fetchError } = await supabase
      .from('trades')
      .select('fees')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !trade) {
      return { ok: false, message: "Trade not found" };
    }

    const totalFees = (trade.fees || 0) + (additionalFees || 0);

    return updateTrade(id, {
      exit_price: exitPrice,
      fees: totalFees,
      close_at: new Date().toISOString()
    });
    
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error" };
  }
}

/**
 * Delete a trade
 * 🚀 OPTIMIZED: Clean and efficient
 */
export async function deleteTrade(id: string) {
  try {
    const userId = await getEffectiveUserId();
    
    if (!userId) {
      return { ok: false, message: "Not authenticated" };
    }

    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
    
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error" };
  }
}

/**
 * 🚀 NEW: Bulk delete trades
 * Deletes multiple trades at once for better performance
 */
export async function bulkDeleteTrades(ids: string[]) {
  try {
    const userId = await getEffectiveUserId();
    
    if (!userId) {
      return { ok: false, message: "Not authenticated" };
    }

    if (!ids || ids.length === 0) {
      return { ok: false, message: "No trade IDs provided" };
    }

    console.log('🗑️ Bulk deleting:', ids.length, 'trades');

    const { error } = await supabase
      .from('trades')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Bulk delete error:', error);
      return { ok: false, message: error.message };
    }

    console.log('✅ Bulk deleted successfully');
    return { ok: true };
    
  } catch (e: any) {
    console.error('❌ Bulk delete exception:', e);
    return { ok: false, message: e?.message || "Network error" };
  }
}

/**
 * Upload screenshot
 * 🚀 OPTIMIZED: With image compression
 * 🔥 FIXED: Corrected compressImage function signature
 */
export async function uploadScreenshot(file: File): Promise<string | null> {
  try {
    const userId = await getEffectiveUserId();
    
    if (!userId) {
      console.error('❌ No user ID for screenshot upload');
      return null;
    }

    let fileToUpload = file;
    
    // Try to compress image
    try {
      const { compressImage } = await import('@/utils/imageCompression');
      // 🔥 FIX: compressImage expects (file, maxSizeMB, maxWidthOrHeight, quality)
      // Parameters: file, maxSizeMB=0.15, maxWidthOrHeight=1600, quality=0.75
      fileToUpload = await compressImage(file, 0.15, 1600, 0.75);
      console.log('✅ Image compressed successfully');
    } catch (compressError) {
      console.log('⚠️ Compression failed, using original file:', compressError);
      fileToUpload = file;
    }

    const fileExt = 'jpg';
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('trade-screenshots')
      .upload(fileName, fileToUpload);

    if (error) {
      console.error('❌ Upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('trade-screenshots')
      .getPublicUrl(fileName);

    console.log('✅ Screenshot uploaded:', publicUrl);
    return publicUrl;
    
  } catch (e) {
    console.error('❌ Screenshot upload exception:', e);
    return null;
  }
}

/**
 * Analyze trade
 * 🚀 OPTIMIZED: Clean implementation
 */
export async function analyzeTrade(payload: any) {
  try {
    const r = await fetch("/api/journal/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    
    if (r.status === 501) {
      return { ok: false, summary: "Not implemented yet. Coming soon." };
    }
    
    const data = await r.json().catch(() => ({}));
    return { ok: true, summary: data?.summary || "Analysis complete." };
  } catch {
    return { ok: false, summary: "Service unavailable." };
  }
}

// ================================================
// 🎯 EXPORTS
// ================================================

export { calculateTradeOutcome };