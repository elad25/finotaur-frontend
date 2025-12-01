// src/hooks/brokers/tradovate/useTradovate.ts
// 🎯 V3.0 - Uses AuthProvider directly, supports demo/live switching

import { useState, useEffect, useCallback } from 'react';
import { tradovateApiService } from '@/services/brokers/tradovate/tradovateApi.service';
import { tradovateWebSocketService } from '@/services/brokers/tradovate/tradovateWebSocket.service';
import { tradovateSyncV2Service, SyncResult } from '@/services/brokers/tradovate/tradovateSyncV2.service';
import {
  TradovateCredentials,
  TradovateAccount,
  TradovatePosition,
  TRADOVATE_API_URLS,
} from '@/types/brokers/tradovate/tradovate.types';
// ✅ Using AuthProvider directly - no useAuth.ts wrapper
import { useAuth } from '@/providers/AuthProvider';

// ============================================================================
// TYPES
// ============================================================================

interface AccountSummary {
  balance: number;
  openPnL: number;
  realizedPnL: number;
  marginUsed: number;
  marginAvailable: number;
}

interface UseTradovateReturn {
  // Authentication
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: TradovateCredentials) => Promise<void>;
  logout: () => Promise<void>;
  
  // Account Management
  accounts: TradovateAccount[];
  selectedAccount: TradovateAccount | null;
  selectAccount: (accountId: number) => Promise<void>;
  loadAccounts: () => Promise<void>;
  
  // Data Sync
  syncHistoricalTrades: (startDate?: Date, endDate?: Date) => Promise<SyncResult>;
  syncCurrentPositions: () => Promise<SyncResult>;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  
  // Real-time Data
  isConnected: boolean;
  positions: TradovatePosition[];
  accountSummary: AccountSummary | null;
  
  // Refresh
  refreshAccountSummary: () => Promise<void>;
  refreshPositions: () => Promise<void>;
  
  // Account Type
  accountType: 'demo' | 'live';
  setAccountType: (type: 'demo' | 'live') => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useTradovate = (
  initialAccountType: 'demo' | 'live' = 'demo'
): UseTradovateReturn => {
  // ✅ Using AuthProvider directly
  const { user } = useAuth();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Account state
  const [accounts, setAccounts] = useState<TradovateAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<TradovateAccount | null>(null);
  const [accountType, setAccountTypeState] = useState<'demo' | 'live'>(initialAccountType);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  
  // Real-time state
  const [isConnected, setIsConnected] = useState(false);
  const [positions, setPositions] = useState<TradovatePosition[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Set API URL based on account type
  useEffect(() => {
    const apiUrl = accountType === 'demo'
      ? TRADOVATE_API_URLS.demo
      : TRADOVATE_API_URLS.live;
    
    console.log(`🔧 Setting Tradovate API URL: ${apiUrl}`);
    tradovateApiService.setApiUrl(apiUrl);
    
    // Also update WebSocket URL
    tradovateWebSocketService.setEnvironment(accountType);
  }, [accountType]);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const authenticated = tradovateApiService.isAuthenticated();
        setIsAuthenticated(authenticated);
        
        if (authenticated) {
          await loadAccountsInternal();
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Monitor WebSocket connection
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(tradovateWebSocketService.isConnected());
    };

    const interval = setInterval(checkConnection, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh when account selected
  useEffect(() => {
    if (selectedAccount && isAuthenticated) {
      refreshAccountSummary();
      refreshPositions();
      
      const interval = setInterval(() => {
        refreshAccountSummary();
        refreshPositions();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [selectedAccount, isAuthenticated]);

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  const loadAccountsInternal = async () => {
    try {
      console.log('📊 Loading accounts...');
      const accountsList = await tradovateApiService.getAccounts();
      setAccounts(accountsList);
      
      // Auto-select first account
      if (accountsList.length > 0) {
        await selectAccountInternal(accountsList[0]);
      }
      
      console.log(`✅ Loaded ${accountsList.length} accounts`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load accounts';
      setError(errorMessage);
      console.error('❌ Failed to load accounts:', err);
    }
  };

  const selectAccountInternal = async (account: TradovateAccount) => {
    console.log('📌 Selecting account:', account.name);
    setSelectedAccount(account);
    
    // Detect environment from account type
    const detectedEnv: 'demo' | 'live' = account.accountType === 'Demo' ? 'demo' : 'live';
    console.log(`🔍 Detected environment: ${detectedEnv} (from accountType: ${account.accountType})`);
    
    // Initialize sync service with correct environment
    if (user?.id) {
      try {
        await tradovateSyncV2Service.initialize(user.id, account.id, detectedEnv);
        await refreshAccountSummaryInternal(account.id);
        await refreshPositionsInternal(account.id);
      } catch (err) {
        console.error('❌ Failed to initialize sync service:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize sync');
      }
    } else {
      console.warn('⚠️ No user ID available, sync service not initialized');
    }
  };

  const refreshAccountSummaryInternal = async (accountId: number) => {
    try {
      const summary = await tradovateSyncV2Service.getAccountSummary();
      setAccountSummary(summary);
    } catch (err) {
      console.error('❌ Failed to refresh account summary:', err);
    }
  };

  const refreshPositionsInternal = async (accountId: number) => {
    try {
      const updatedPositions = await tradovateApiService.getPositions(accountId);
      setPositions(updatedPositions.filter(p => p.netPos !== 0));
    } catch (err) {
      console.error('❌ Failed to refresh positions:', err);
    }
  };

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  const login = useCallback(async (credentials: TradovateCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 Logging in to Tradovate...');
      await tradovateApiService.login(credentials);
      setIsAuthenticated(true);
      
      // Connect WebSocket
      const token = localStorage.getItem('tradovate_token');
      if (token) {
        try {
          await tradovateWebSocketService.connect(token);
          console.log('✅ WebSocket connected');
        } catch (wsErr) {
          console.warn('⚠️ WebSocket connection failed, continuing without real-time:', wsErr);
        }
      }
      
      // Load accounts
      await loadAccountsInternal();
      
      console.log('✅ Login successful');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      console.error('❌ Login failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('👋 Logging out...');
      
      // Disconnect sync service
      try {
        await tradovateSyncV2Service.disconnect();
      } catch (e) {
        console.warn('⚠️ Sync service disconnect error:', e);
      }
      
      // Disconnect WebSocket
      tradovateWebSocketService.disconnect();
      
      // Logout from API
      try {
        await tradovateApiService.logout();
      } catch (e) {
        console.warn('⚠️ API logout error:', e);
      }
      
      // Clear state
      setIsAuthenticated(false);
      setAccounts([]);
      setSelectedAccount(null);
      setPositions([]);
      setAccountSummary(null);
      setLastSyncResult(null);
      
      console.log('✅ Logout successful');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      console.error('❌ Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // ACCOUNT MANAGEMENT
  // ============================================================================

  const loadAccounts = useCallback(async () => {
    setError(null);
    await loadAccountsInternal();
  }, []);

  const selectAccount = useCallback(async (accountId: number) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) {
      console.error('Account not found:', accountId);
      setError('Account not found');
      return;
    }
    await selectAccountInternal(account);
  }, [accounts]);

  const setAccountType = useCallback((type: 'demo' | 'live') => {
    if (type !== accountType) {
      console.log(`🔄 Switching to ${type} environment`);
      setAccountTypeState(type);
      
      // Clear current state when switching environments
      setSelectedAccount(null);
      setAccounts([]);
      setPositions([]);
      setAccountSummary(null);
      setLastSyncResult(null);
      setIsAuthenticated(false);
      setError(null);
      
      // Clear stored auth (different environment = different credentials)
      localStorage.removeItem('tradovate_token');
      localStorage.removeItem('tradovate_token_expiration');
      localStorage.removeItem('tradovate_user');
    }
  }, [accountType]);

  // ============================================================================
  // DATA SYNC
  // ============================================================================

  const syncHistoricalTrades = useCallback(async (
    startDate?: Date,
    endDate?: Date
  ): Promise<SyncResult> => {
    if (!selectedAccount || !user?.id) {
      const result: SyncResult = {
        success: false,
        tradesImported: 0,
        tradesSkipped: 0,
        tradesUpdated: 0,
        errors: ['No account selected or user not authenticated']
      };
      setLastSyncResult(result);
      return result;
    }

    setIsSyncing(true);
    setError(null);

    try {
      console.log('🔄 Starting historical sync...', { 
        startDate: startDate?.toISOString(), 
        endDate: endDate?.toISOString(),
        accountId: selectedAccount.id
      });
      
      const result = await tradovateSyncV2Service.syncHistoricalTrades(startDate, endDate, 'manual');
      setLastSyncResult(result);
      
      if (!result.success && result.errors.length > 0) {
        setError(result.errors[0]);
      }
      
      console.log('✅ Historical sync completed:', result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);
      console.error('❌ Sync failed:', err);
      
      const result: SyncResult = {
        success: false,
        tradesImported: 0,
        tradesSkipped: 0,
        tradesUpdated: 0,
        errors: [errorMessage]
      };
      setLastSyncResult(result);
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [selectedAccount, user]);

  const syncCurrentPositions = useCallback(async (): Promise<SyncResult> => {
    if (!selectedAccount || !user?.id) {
      const result: SyncResult = {
        success: false,
        tradesImported: 0,
        tradesSkipped: 0,
        tradesUpdated: 0,
        errors: ['No account selected or user not authenticated']
      };
      setLastSyncResult(result);
      return result;
    }

    setIsSyncing(true);
    setError(null);

    try {
      console.log('🔄 Syncing current positions for account:', selectedAccount.id);
      const result = await tradovateSyncV2Service.syncCurrentPositions('manual');
      setLastSyncResult(result);
      
      // Refresh positions display
      await refreshPositionsInternal(selectedAccount.id);
      
      if (!result.success && result.errors.length > 0) {
        setError(result.errors[0]);
      }
      
      console.log('✅ Position sync completed:', result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);
      console.error('❌ Position sync failed:', err);
      
      const result: SyncResult = {
        success: false,
        tradesImported: 0,
        tradesSkipped: 0,
        tradesUpdated: 0,
        errors: [errorMessage]
      };
      setLastSyncResult(result);
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [selectedAccount, user]);

  // ============================================================================
  // REFRESH METHODS
  // ============================================================================

  const refreshAccountSummary = useCallback(async () => {
    if (!selectedAccount) return;
    await refreshAccountSummaryInternal(selectedAccount.id);
  }, [selectedAccount]);

  const refreshPositions = useCallback(async () => {
    if (!selectedAccount) return;
    await refreshPositionsInternal(selectedAccount.id);
  }, [selectedAccount]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Authentication
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    
    // Account Management
    accounts,
    selectedAccount,
    selectAccount,
    loadAccounts,
    
    // Data Sync
    syncHistoricalTrades,
    syncCurrentPositions,
    isSyncing,
    lastSyncResult,
    
    // Real-time Data
    isConnected,
    positions,
    accountSummary,
    
    // Refresh
    refreshAccountSummary,
    refreshPositions,
    
    // Account Type
    accountType,
    setAccountType
  };
};