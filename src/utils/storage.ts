// utils/storage.ts
// ==========================================
// UNIFIED STORAGE LAYER FOR TRADES & STRATEGIES
// ==========================================

/**
 * Get current user ID from localStorage
 */
function getCurrentUserId(): string | null {
  try {
    const userStr = localStorage.getItem('finotaur_user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user?.id || null;
  } catch (e) {
    console.error('Failed to get current user:', e);
    return null;
  }
}

/**
 * Storage keys - single source of truth
 * Now includes user-specific keys
 */
export const STORAGE_KEYS = {
  TRADES: 'finotaur_trades',
  STRATEGIES: 'finotaur_strategies', // Legacy - for migration
  USER: 'finotaur_user',
  DRAFT: 'finotaur_journal_draft_v2',
  // User-specific keys
  getUserStrategiesKey: (userId: string) => `finotaur_strategies_${userId}`,
} as const;

/**
 * Event types for cross-component sync
 */
export const STORAGE_EVENTS = {
  TRADE_CREATED: 'finotaur:trade:created',
  TRADE_UPDATED: 'finotaur:trade:updated',
  TRADE_DELETED: 'finotaur:trade:deleted',
  STRATEGY_CREATED: 'finotaur:strategy:created',
  STRATEGY_UPDATED: 'finotaur:strategy:updated',
  STRATEGY_DELETED: 'finotaur:strategy:deleted',
} as const;

/**
 * Type-safe localStorage wrapper
 */
class StorageManager {
  /**
   * Get item from localStorage with error handling
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (e) {
      console.error(`Failed to get ${key}:`, e);
      return null;
    }
  }

  /**
   * Set item in localStorage with error handling
   */
  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Failed to set ${key}:`, e);
      return false;
    }
  }

  /**
   * Remove item from localStorage
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to remove ${key}:`, e);
    }
  }

  /**
   * Dispatch custom event for cross-component sync
   */
  dispatchEvent(eventName: string, detail?: any): void {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  /**
   * Listen to custom events
   */
  addEventListener(eventName: string, callback: (e: CustomEvent) => void): () => void {
    const handler = (e: Event) => callback(e as CustomEvent);
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }
}

export const storage = new StorageManager();

// ==========================================
// STRATEGY UTILITIES
// ==========================================

export interface Strategy {
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
  userId?: string; // ✅ NEW: Track which user owns this strategy
}

/**
 * Get the storage key for current user's strategies
 */
function getStrategiesStorageKey(): string {
  const userId = getCurrentUserId();
  if (!userId) {
    console.warn('⚠️  No user logged in - using legacy strategies key');
    return STORAGE_KEYS.STRATEGIES;
  }
  return STORAGE_KEYS.getUserStrategiesKey(userId);
}

/**
 * Get all strategies for current user
 * ✅ FIXED: Now returns only strategies for the logged-in user
 */
export function getStrategies(): Strategy[] {
  const userId = getCurrentUserId();
  if (!userId) {
    console.warn('⚠️  No user logged in - cannot get strategies');
    return [];
  }
  
  const storageKey = getStrategiesStorageKey();
  const strategies = storage.get<Strategy[]>(storageKey) || [];
  
  console.log(`📊 Loaded ${strategies.length} strategies for user ${userId}`);
  return strategies;
}

/**
 * Get strategy by ID for current user
 */
export function getStrategyById(id: string): Strategy | null {
  const strategies = getStrategies();
  return strategies.find(s => s.id === id) || null;
}

/**
 * Get strategy name by ID - handles both IDs and names
 */
export function getStrategyName(value: string | undefined | null): string {
  if (!value || value === 'none' || value === 'create_new') {
    return '—';
  }
  
  // If it looks like a name (not UUID), return it
  if (!/^[a-f0-9-]{36}$/i.test(value)) {
    return value;
  }
  
  // It's a UUID - try to convert to name
  const strategy = getStrategyById(value);
  return strategy ? strategy.name : value;
}

/**
 * Save strategies to localStorage for current user
 * ✅ FIXED: Now saves to user-specific key
 */
export function saveStrategies(strategies: Strategy[]): boolean {
  const userId = getCurrentUserId();
  if (!userId) {
    console.error('❌ Cannot save strategies - no user logged in');
    return false;
  }
  
  const storageKey = getStrategiesStorageKey();
  const success = storage.set(storageKey, strategies);
  
  if (success) {
    console.log(`✅ Saved ${strategies.length} strategies for user ${userId}`);
    storage.dispatchEvent(STORAGE_EVENTS.STRATEGY_UPDATED);
  }
  
  return success;
}

/**
 * Create new strategy for current user
 * ✅ FIXED: Now associates strategy with current user
 */
export function createStrategy(strategy: Strategy): boolean {
  const userId = getCurrentUserId();
  if (!userId) {
    console.error('❌ Cannot create strategy - no user logged in');
    return false;
  }
  
  // Ensure strategy has userId
  const strategyWithUser = {
    ...strategy,
    userId,
  };
  
  const strategies = getStrategies();
  strategies.push(strategyWithUser);
  
  const success = saveStrategies(strategies);
  if (success) {
    console.log(`✅ Created strategy "${strategy.name}" for user ${userId}`);
    storage.dispatchEvent(STORAGE_EVENTS.STRATEGY_CREATED, { strategy: strategyWithUser });
  }
  
  return success;
}

/**
 * Update strategy for current user
 */
export function updateStrategy(id: string, updates: Partial<Strategy>): boolean {
  const strategies = getStrategies();
  const index = strategies.findIndex(s => s.id === id);
  
  if (index === -1) {
    console.error(`❌ Strategy ${id} not found`);
    return false;
  }
  
  strategies[index] = { ...strategies[index], ...updates };
  const success = saveStrategies(strategies);
  
  if (success) {
    console.log(`✅ Updated strategy "${strategies[index].name}"`);
    storage.dispatchEvent(STORAGE_EVENTS.STRATEGY_UPDATED, { strategy: strategies[index] });
  }
  
  return success;
}

/**
 * Delete strategy for current user
 */
export function deleteStrategy(id: string): boolean {
  const strategies = getStrategies();
  const strategy = strategies.find(s => s.id === id);
  
  if (!strategy) {
    console.error(`❌ Strategy ${id} not found`);
    return false;
  }
  
  const filtered = strategies.filter(s => s.id !== id);
  const success = saveStrategies(filtered);
  
  if (success) {
    console.log(`✅ Deleted strategy "${strategy.name}"`);
    storage.dispatchEvent(STORAGE_EVENTS.STRATEGY_DELETED, { id });
  }
  
  return success;
}

/**
 * Migrate legacy strategies to user-specific storage
 * Run this once after user logs in to migrate old strategies
 */
export function migrateUserStrategies(): { migrated: number; message: string } {
  const userId = getCurrentUserId();
  if (!userId) {
    return { migrated: 0, message: 'No user logged in' };
  }
  
  // Check if user already has strategies
  const userKey = STORAGE_KEYS.getUserStrategiesKey(userId);
  const existingStrategies = storage.get<Strategy[]>(userKey);
  
  if (existingStrategies && existingStrategies.length > 0) {
    console.log('ℹ️  User already has strategies - skipping migration');
    return { migrated: 0, message: 'User already has strategies' };
  }
  
  // Get legacy strategies
  const legacyStrategies = storage.get<Strategy[]>(STORAGE_KEYS.STRATEGIES) || [];
  
  if (legacyStrategies.length === 0) {
    console.log('ℹ️  No legacy strategies to migrate');
    return { migrated: 0, message: 'No legacy strategies found' };
  }
  
  // Add userId to all legacy strategies and save to user-specific key
  const migratedStrategies = legacyStrategies.map(s => ({
    ...s,
    userId,
  }));
  
  storage.set(userKey, migratedStrategies);
  
  console.log(`✅ Migrated ${migratedStrategies.length} strategies to user ${userId}`);
  
  return {
    migrated: migratedStrategies.length,
    message: `Migrated ${migratedStrategies.length} strategies`,
  };
}

// ==========================================
// TRADE UTILITIES (for localStorage fallback)
// ==========================================

/**
 * Get trades from localStorage (for migration/fallback)
 */
export function getTradesFromLocalStorage(): any[] {
  return storage.get<any[]>(STORAGE_KEYS.TRADES) || [];
}

/**
 * Save trades to localStorage
 */
export function saveTradestoLocalStorage(trades: any[]): boolean {
  return storage.set(STORAGE_KEYS.TRADES, trades);
}

// ==========================================
// MIGRATION UTILITIES
// ==========================================

/**
 * Migrate old strategyId fields to strategy names
 * This runs once to fix all existing trades
 */
export function migrateTradeStrategies(): {
  migrated: number;
  errors: number;
  details: string[];
} {
  console.log('🔄 Starting trade strategy migration...');
  
  const trades = getTradesFromLocalStorage();
  const strategies = getStrategies();
  
  if (trades.length === 0) {
    console.log('  ℹ️  No trades to migrate');
    return { migrated: 0, errors: 0, details: [] };
  }
  
  if (strategies.length === 0) {
    console.log('  ⚠️  No strategies found - cannot migrate');
    return { migrated: 0, errors: 0, details: ['No strategies found'] };
  }
  
  let migratedCount = 0;
  let errorCount = 0;
  const details: string[] = [];
  
  const updatedTrades = trades.map((trade: any) => {
    let modified = false;
    
    // Case 1: Has strategyId but no strategy (or strategy is also an ID)
    if (trade.strategyId) {
      const isStrategyAlsoId = trade.strategy && /^[a-f0-9-]{36}$/i.test(trade.strategy);
      
      if (!trade.strategy || isStrategyAlsoId) {
        const strategy = strategies.find(s => s.id === trade.strategyId);
        if (strategy) {
          details.push(`✅ Migrated ${trade.symbol}: ${trade.strategyId} -> ${strategy.name}`);
          migratedCount++;
          modified = true;
          return {
            ...trade,
            strategy: strategy.name,
            _migrated: true,
            _migrated_at: new Date().toISOString()
          };
        } else {
          details.push(`⚠️  Strategy ID ${trade.strategyId} not found for ${trade.symbol}`);
          errorCount++;
        }
      }
    }
    
    // Case 2: strategy field looks like an ID
    if (trade.strategy && /^[a-f0-9-]{36}$/i.test(trade.strategy)) {
      const strategy = strategies.find(s => s.id === trade.strategy);
      if (strategy) {
        details.push(`✅ Converted ID to name for ${trade.symbol}: ${trade.strategy} -> ${strategy.name}`);
        migratedCount++;
        modified = true;
        return {
          ...trade,
          strategy: strategy.name,
          strategyId: trade.strategy, // Keep ID as backup
          _migrated: true,
          _migrated_at: new Date().toISOString()
        };
      } else {
        details.push(`⚠️  Strategy ID ${trade.strategy} not found for ${trade.symbol}`);
        errorCount++;
      }
    }
    
    return trade;
  });
  
  if (migratedCount > 0) {
    saveTradestoLocalStorage(updatedTrades);
    storage.dispatchEvent(STORAGE_EVENTS.TRADE_UPDATED);
    console.log(`✅ Migration complete: ${migratedCount} trades migrated, ${errorCount} errors`);
  } else {
    console.log('  ℹ️  No trades needed migration');
  }
  
  return { migrated: migratedCount, errors: errorCount, details };
}

/**
 * Hook to listen to storage events
 */
export function useStorageEvent(eventName: string, callback: (detail?: any) => void) {
  if (typeof window === 'undefined') return;
  
  return storage.addEventListener(eventName, (e: CustomEvent) => {
    callback(e.detail);
  });
}