// src/hooks/brokers/tradovate/useTradovate.ts

import { useState, useEffect, useCallback } from 'react';
import { tradovateApiService } from '@/services/brokers/tradovate/tradovateApi.service';
import { tradovateWebSocketService } from '@/services/brokers/tradovate/tradovateWebSocket.service';
import { tradovateSyncService } from '@/services/brokers/tradovate/tradovateSync.service';
import {
  TradovateCredentials,
  TradovateAccount,
  TradovatePosition,
  TradovateCashBalance
} from '@/types/brokers/tradovate/tradovate.types';
import { useAuth } from '@/hooks/useAuth';

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
  selectAccount: (accountId: number) => void;
  loadAccounts: () => Promise<void>;
  
  // Data Sync
  syncHistoricalTrades: (startDate?: Date, endDate?: Date) => Promise<number>;
  syncCurrentPositions: () => Promise<void>;
  isSyncing: boolean;
  
  // Real-time Data
  isConnected: boolean;
  positions: TradovatePosition[];
  accountSummary: {
    balance: number;
    openPnL: number;
    realizedPnL: number;
    marginUsed: number;
    marginAvailable: number;
  } | null;
  
  // Refresh
  refreshAccountSummary: () => Promise<void>;
  
  // Account Type
  accountType: 'demo' | 'live';
}

export const useTradovate = (accountType: 'demo' | 'live' = 'demo'): UseTradovateReturn => {
  const { user } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<TradovateAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<TradovateAccount | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [positions, setPositions] = useState<TradovatePosition[]>([]);
  const [accountSummary, setAccountSummary] = useState<{
    balance: number;
    openPnL: number;
    realizedPnL: number;
    marginUsed: number;
    marginAvailable: number;
  } | null>(null);

  // Set API URL based on account type
  useEffect(() => {
    const apiUrl = accountType === 'demo' 
      ? 'https://demo.tradovateapi.com/v1'
      : 'https://live.tradovateapi.com/v1';
    
    console.log(`🔧 useTradovate: Setting API URL to ${apiUrl}`);
    tradovateApiService.setApiUrl(apiUrl);
  }, [accountType]);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = tradovateApiService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        loadAccounts();
      }
    };

    checkAuth();
  }, []);

  // Monitor WebSocket connection
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(tradovateWebSocketService.isConnected());
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  const login = useCallback(async (credentials: TradovateCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      await tradovateApiService.login(credentials);
      setIsAuthenticated(true);
      
      // Connect WebSocket
      const token = localStorage.getItem('tradovate_token');
      if (token) {
        await tradovateWebSocketService.connect(token);
      }
      
      // Load accounts
      await loadAccounts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await tradovateApiService.logout();
      tradovateWebSocketService.disconnect();
      tradovateSyncService.disconnect();
      
      setIsAuthenticated(false);
      setAccounts([]);
      setSelectedAccount(null);
      setPositions([]);
      setAccountSummary(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const accountsList = await tradovateApiService.getAccounts();
      setAccounts(accountsList);
      
      // Auto-select first account if none selected
      if (accountsList.length > 0 && !selectedAccount) {
        setSelectedAccount(accountsList[0]);
        
        // Initialize sync service
        if (user?.id) {
          await tradovateSyncService.initialize(user.id, accountsList[0].id);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load accounts';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccount, user]);

  const selectAccount = useCallback(async (accountId: number) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      setSelectedAccount(account);
      
      // Initialize sync service with new account
      if (user?.id) {
        await tradovateSyncService.initialize(user.id, account.id);
        await refreshAccountSummary();
      }
    }
  }, [accounts, user]);

  const syncHistoricalTrades = useCallback(async (startDate?: Date, endDate?: Date): Promise<number> => {
    if (!selectedAccount || !user?.id) {
      throw new Error('No account selected or user not authenticated');
    }

    setIsSyncing(true);
    setError(null);

    try {
      const count = await tradovateSyncService.syncHistoricalTrades(startDate, endDate);
      return count;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [selectedAccount, user]);

  const syncCurrentPositions = useCallback(async () => {
    if (!selectedAccount || !user?.id) {
      throw new Error('No account selected or user not authenticated');
    }

    setIsSyncing(true);
    setError(null);

    try {
      await tradovateSyncService.syncCurrentPositions();
      
      // Refresh positions display
      const updatedPositions = await tradovateApiService.getPositions(selectedAccount.id);
      setPositions(updatedPositions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync positions';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [selectedAccount, user]);

  const refreshAccountSummary = useCallback(async () => {
    if (!selectedAccount) {
      return;
    }

    try {
      const summary = await tradovateSyncService.getAccountSummary();
      setAccountSummary(summary);
      
      const updatedPositions = await tradovateApiService.getPositions(selectedAccount.id);
      setPositions(updatedPositions);
    } catch (err) {
      console.error('Failed to refresh account summary:', err);
    }
  }, [selectedAccount]);

  // Auto-refresh account summary every 30 seconds
  useEffect(() => {
    if (selectedAccount && isAuthenticated) {
      refreshAccountSummary();
      
      const interval = setInterval(refreshAccountSummary, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedAccount, isAuthenticated, refreshAccountSummary]);

  return {
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    accounts,
    selectedAccount,
    selectAccount,
    loadAccounts,
    syncHistoricalTrades,
    syncCurrentPositions,
    isSyncing,
    isConnected,
    positions,
    accountSummary,
    refreshAccountSummary,
    accountType
  };
};