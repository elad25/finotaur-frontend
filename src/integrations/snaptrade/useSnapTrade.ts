/**
 * SnapTrade React Hooks
 * Custom hooks for using SnapTrade in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { snaptradeService } from './snaptradeService';
import type {
  SnapTradeUser,
  BrokerageConnection,
  Account,
  Position,
  Order,
  Activity,
  PerformanceCustom,
  SnapTradeCredentials,
} from './snaptradeTypes';

// ============================================================================
// HOOK: useSnapTradeUser
// ============================================================================

export function useSnapTradeUser(userId?: string) {
  const [user, setUser] = useState<SnapTradeUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const registerUser = useCallback(async (newUserId: string) => {
    setLoading(true);
    setError(null);
    try {
      const registeredUser = await snaptradeService.registerUser({ userId: newUserId });
      setUser(registeredUser);
      return registeredUser;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      await snaptradeService.deleteUser(userId);
      setUser(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    user,
    loading,
    error,
    registerUser,
    deleteUser,
  };
}

// ============================================================================
// HOOK: useSnapTradeConnections
// ============================================================================

export function useSnapTradeConnections(credentials: SnapTradeCredentials | null) {
  const [connections, setConnections] = useState<BrokerageConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!credentials) return;

    setLoading(true);
    setError(null);
    try {
      const data = await snaptradeService.listConnections(credentials);
      setConnections(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  const deleteConnection = useCallback(async (connectionId: string) => {
    if (!credentials) return;

    setLoading(true);
    setError(null);
    try {
      await snaptradeService.deleteConnection(credentials, connectionId);
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  const refreshConnection = useCallback(async (connectionId: string) => {
    if (!credentials) return;

    setLoading(true);
    setError(null);
    try {
      const updated = await snaptradeService.refreshConnection(credentials, connectionId);
      setConnections(prev => 
        prev.map(conn => conn.id === connectionId ? updated : conn)
      );
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useEffect(() => {
    if (credentials) {
      fetchConnections();
    }
  }, [credentials, fetchConnections]);

  return {
    connections,
    loading,
    error,
    refetch: fetchConnections,
    deleteConnection,
    refreshConnection,
  };
}

// ============================================================================
// HOOK: useSnapTradeAccounts
// ============================================================================

export function useSnapTradeAccounts(credentials: SnapTradeCredentials | null) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!credentials) return;

    setLoading(true);
    setError(null);
    try {
      const data = await snaptradeService.listAccounts(credentials);
      setAccounts(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useEffect(() => {
    if (credentials) {
      fetchAccounts();
    }
  }, [credentials, fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
  };
}

// ============================================================================
// HOOK: useSnapTradeHoldings
// ============================================================================

export function useSnapTradeHoldings(
  credentials: SnapTradeCredentials | null,
  accountId?: string
) {
  const [holdings, setHoldings] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHoldings = useCallback(async () => {
    if (!credentials) return;

    setLoading(true);
    setError(null);
    try {
      let data: Position[];
      if (accountId) {
        data = await snaptradeService.getAccountHoldings(credentials, accountId);
      } else {
        const allHoldings = await snaptradeService.getAllHoldings(credentials);
        data = allHoldings.flatMap(ah => ah.positions);
      }
      setHoldings(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [credentials, accountId]);

  useEffect(() => {
    if (credentials) {
      fetchHoldings();
    }
  }, [credentials, accountId, fetchHoldings]);

  return {
    holdings,
    loading,
    error,
    refetch: fetchHoldings,
  };
}

// ============================================================================
// HOOK: useSnapTradeOrders
// ============================================================================

export function useSnapTradeOrders(
  credentials: SnapTradeCredentials | null,
  accountId?: string
) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!credentials || !accountId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await snaptradeService.getOrders(credentials, accountId);
      setOrders(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [credentials, accountId]);

  const placeOrder = useCallback(async (orderRequest: any) => {
    if (!credentials || !accountId) return;

    setLoading(true);
    setError(null);
    try {
      const newOrder = await snaptradeService.placeOrder(
        credentials,
        accountId,
        orderRequest
      );
      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [credentials, accountId]);

  const cancelOrder = useCallback(async (orderId: string) => {
    if (!credentials || !accountId) return;

    setLoading(true);
    setError(null);
    try {
      const cancelled = await snaptradeService.cancelOrder(
        credentials,
        accountId,
        orderId
      );
      setOrders(prev => 
        prev.map(order => order.id === orderId ? cancelled : order)
      );
      return cancelled;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [credentials, accountId]);

  useEffect(() => {
    if (credentials && accountId) {
      fetchOrders();
    }
  }, [credentials, accountId, fetchOrders]);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    placeOrder,
    cancelOrder,
  };
}

// ============================================================================
// HOOK: useSnapTradeActivities
// ============================================================================

export function useSnapTradeActivities(
  credentials: SnapTradeCredentials | null,
  filters?: {
    startDate?: string;
    endDate?: string;
    accountId?: string;
  }
) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

 const fetchActivities = useCallback(async () => {
  if (!credentials) return;

  setLoading(true);
  setError(null);
  try {
    let data: Activity[];
    if (filters?.accountId) {
      const transactions = await snaptradeService.getTransactions(
        credentials,
        filters.accountId,
        {
          startDate: filters.startDate,
          endDate: filters.endDate,
        }
      );
      // Convert transactions to activities format
      data = transactions as any as Activity[];
    } else {
      data = await snaptradeService.getActivities(credentials, filters);
    }
    setActivities(data);
    return data;
  } catch (err) {
    setError(err as Error);
    throw err;
  } finally {
    setLoading(false);
  }
}, [credentials, filters]);
  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
  };
}

// ============================================================================
// HOOK: useSnapTradePerformance
// ============================================================================

export function useSnapTradePerformance(
  credentials: SnapTradeCredentials | null,
  startDate: string,
  endDate: string
) {
  const [performance, setPerformance] = useState<PerformanceCustom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPerformance = useCallback(async () => {
    if (!credentials) return;

    setLoading(true);
    setError(null);
    try {
      const data = await snaptradeService.getPerformance(credentials, {
        startDate,
        endDate,
      });
      setPerformance(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [credentials, startDate, endDate]);

  useEffect(() => {
    if (credentials && startDate && endDate) {
      fetchPerformance();
    }
  }, [credentials, startDate, endDate, fetchPerformance]);

  return {
    performance,
    loading,
    error,
    refetch: fetchPerformance,
  };
}

// ============================================================================
// HOOK: useSnapTradeBrokerages
// ============================================================================

export function useSnapTradeBrokerages() {
  const [brokerages, setBrokerages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBrokerages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await snaptradeService.listBrokerages();
      setBrokerages(data);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrokerages();
  }, [fetchBrokerages]);

  return {
    brokerages,
    loading,
    error,
    refetch: fetchBrokerages,
  };
}