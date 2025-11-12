// src/integrations/snaptrade/snaptradeService.ts
// ✅ COMPLETE PAY-AS-YOU-GO VERSION with registerUser support

import { supabase } from '@/integrations/supabase/client';
import type {
  BrokerageConnection,
  AuthorizationUrl,
  GetAuthUrlRequest,
  Brokerage,
  Account,
  Position,
  AccountHoldings,
  Activity,
  SnapTradeCredentials,
  SnapTradeUser,
} from './snaptradeTypes';

export class SnapTradeService {
  /**
   * Make request through Edge Function proxy
   */
  private async makeProxyRequest<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<T> {
    console.log(`[SnapTrade Service] ${method} ${endpoint}`);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('snaptrade-proxy', {
        body: {
          endpoint,
          method,
          body,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Edge function invocation failed');
      }

      if (data?.error) {
        console.error('❌ API error:', data.error);
        throw new Error(data.error || data.details || 'API request failed');
      }

      console.log('✅ Response received');
      return data as T;
      
    } catch (error: any) {
      console.error('❌ Failed to make request:', error);
      throw error;
    }
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  /**
   * Register a new SnapTrade user
   * ✅ REQUIRED for Pay-as-you-go before making any connections!
   */
  async registerUser(userId: string): Promise<SnapTradeUser> {
    console.log('📝 Registering SnapTrade user:', userId);
    
    const endpoint = `/registerUser`;
    const body = { userId };
    
    const response = await this.makeProxyRequest<SnapTradeUser>(endpoint, 'POST', body);
    console.log('✅ User registered successfully');
    
    return response;
  }

  /**
   * Delete a SnapTrade user
   */
  async deleteUser(userId: string): Promise<void> {
    console.log('🗑️ Deleting SnapTrade user:', userId);
    
    const endpoint = `/deleteUser`;
    const body = { userId };
    
    await this.makeProxyRequest<void>(endpoint, 'POST', body);
    console.log('✅ User deleted successfully');
  }

  // ============================================================================
  // BROKERAGE CONNECTIONS
  // ============================================================================

  /**
   * Get authorization URL for connecting a brokerage
   * ✅ Pay-as-you-go: Works WITHOUT userSecret using direct OAuth
   */
  async getAuthorizationUrl(request: GetAuthUrlRequest): Promise<AuthorizationUrl> {
    console.log('🔗 Getting authorization URL for broker:', request.broker);
    
    // ✅ For Pay-as-you-go: Use minimal params - OAuth creates user automatically
    const params = new URLSearchParams({
      userId: request.userId,
      broker: request.broker,
      immediateRedirect: String(request.immediateRedirect ?? true),
      connectionType: request.connectionType ?? 'read',
      connectionPortalVersion: request.connectionPortalVersion ?? 'v4',
    });
    
    // Only add userSecret if provided and not empty
    if (request.userSecret && request.userSecret.trim() !== '') {
      params.append('userSecret', request.userSecret);
    }
    
    if (request.customRedirect) {
      params.append('customRedirect', request.customRedirect);
    }
    if (request.reconnect) {
      params.append('reconnect', request.reconnect);
    }
    
    const endpoint = `/snapTrade/login?${params.toString()}`;
    
    console.log('📤 Request endpoint:', endpoint);
    // POST with no body - all params in query string
    return this.makeProxyRequest<AuthorizationUrl>(endpoint, 'POST', null);
  }

  /**
   * List all brokerage connections for a user
   */
  async listConnections(credentials: SnapTradeCredentials): Promise<BrokerageConnection[]> {
    const endpoint = `/connections?userId=${credentials.userId}&userSecret=${credentials.userSecret}`;
    return this.makeProxyRequest<BrokerageConnection[]>(endpoint, 'GET');
  }

  /**
   * Delete a specific brokerage connection
   */
  async deleteConnection(
    credentials: SnapTradeCredentials,
    connectionId: string
  ): Promise<void> {
    const endpoint = `/connections/${connectionId}?userId=${credentials.userId}&userSecret=${credentials.userSecret}`;
    return this.makeProxyRequest<void>(endpoint, 'DELETE');
  }

  /**
   * Refresh a brokerage connection
   */
  async refreshConnection(
    credentials: SnapTradeCredentials,
    connectionId: string
  ): Promise<any> {
    const endpoint = `/connections/${connectionId}/refresh?userId=${credentials.userId}&userSecret=${credentials.userSecret}`;
    return this.makeProxyRequest<any>(endpoint, 'POST');
  }

  // ============================================================================
  // BROKERAGES
  // ============================================================================

  /**
   * Get list of all available brokerages
   */
  async listBrokerages(): Promise<Brokerage[]> {
    console.log('📋 Fetching available brokerages...');
    const endpoint = '/brokerages';
    return this.makeProxyRequest<Brokerage[]>(endpoint, 'GET');
  }

  // ============================================================================
  // ACCOUNTS
  // ============================================================================

  /**
   * List all accounts for a user
   */
  async listAccounts(credentials: SnapTradeCredentials): Promise<Account[]> {
    const endpoint = `/accounts?userId=${credentials.userId}&userSecret=${credentials.userSecret}`;
    return this.makeProxyRequest<Account[]>(endpoint, 'GET');
  }

  /**
   * Get account details
   */
  async getAccountDetails(
    credentials: SnapTradeCredentials,
    accountId: string
  ): Promise<Account> {
    const endpoint = `/accounts/${accountId}?userId=${credentials.userId}&userSecret=${credentials.userSecret}`;
    return this.makeProxyRequest<Account>(endpoint, 'GET');
  }

  // ============================================================================
  // HOLDINGS & POSITIONS
  // ============================================================================

  /**
   * Get holdings for a specific account
   */
  async getAccountHoldings(
    credentials: SnapTradeCredentials,
    accountId: string
  ): Promise<Position[]> {
    const endpoint = `/accounts/${accountId}/holdings?userId=${credentials.userId}&userSecret=${credentials.userSecret}`;
    return this.makeProxyRequest<Position[]>(endpoint, 'GET');
  }

  /**
   * Get all holdings across all accounts
   */
  async getAllHoldings(credentials: SnapTradeCredentials): Promise<AccountHoldings[]> {
    const endpoint = `/holdings?userId=${credentials.userId}&userSecret=${credentials.userSecret}`;
    return this.makeProxyRequest<AccountHoldings[]>(endpoint, 'GET');
  }

  // ============================================================================
  // ACTIVITIES & TRANSACTIONS
  // ============================================================================

  /**
   * Get activities across all accounts
   */
  async getActivities(
    credentials: SnapTradeCredentials,
    params?: {
      startDate?: string;
      endDate?: string;
      accounts?: string;
      type?: string;
    }
  ): Promise<Activity[]> {
    let endpoint = `/activities?userId=${credentials.userId}&userSecret=${credentials.userSecret}`;
    
    if (params?.startDate) endpoint += `&startDate=${params.startDate}`;
    if (params?.endDate) endpoint += `&endDate=${params.endDate}`;
    if (params?.accounts) endpoint += `&accounts=${params.accounts}`;
    if (params?.type) endpoint += `&type=${params.type}`;
    
    return this.makeProxyRequest<Activity[]>(endpoint, 'GET');
  }

  /**
   * Get transactions for a specific account
   */
  async getTransactions(
    credentials: SnapTradeCredentials,
    accountId: string,
    params?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any[]> {
    let endpoint = `/accounts/${accountId}/transactions?userId=${credentials.userId}&userSecret=${credentials.userSecret}`;
    
    if (params?.startDate) endpoint += `&startDate=${params.startDate}`;
    if (params?.endDate) endpoint += `&endDate=${params.endDate}`;
    
    return this.makeProxyRequest<any[]>(endpoint, 'GET');
  }

  // ============================================================================
  // ORDERS & TRADING
  // ============================================================================

  /**
   * Get orders for an account
   */
  async getOrders(
    credentials: SnapTradeCredentials,
    accountId: string,
    params?: {
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any[]> {
    let endpoint = `/accounts/${accountId}/orders?userId=${credentials.userId}&userSecret=${credentials.userSecret}`;
    
    if (params?.status) endpoint += `&status=${params.status}`;
    if (params?.startDate) endpoint += `&startDate=${params.startDate}`;
    if (params?.endDate) endpoint += `&endDate=${params.endDate}`;
    
    return this.makeProxyRequest<any[]>(endpoint, 'GET');
  }

  /**
   * Place a new order
   */
  async placeOrder(
    credentials: SnapTradeCredentials,
    accountId: string,
    orderRequest: any
  ): Promise<any> {
    const endpoint = `/accounts/${accountId}/orders?userId=${credentials.userId}&userSecret=${credentials.userSecret}`;
    return this.makeProxyRequest<any>(endpoint, 'POST', orderRequest);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    credentials: SnapTradeCredentials,
    accountId: string,
    orderId: string
  ): Promise<any> {
    const endpoint = `/accounts/${accountId}/orders/${orderId}/cancel?userId=${credentials.userId}&userSecret=${credentials.userSecret}`;
    return this.makeProxyRequest<any>(endpoint, 'POST');
  }

  /**
   * Get performance data (stub - may not be available in all plans)
   */
  async getPerformance(
    credentials: SnapTradeCredentials,
    request: any
  ): Promise<any> {
    console.log('⚠️ getPerformance may not be available in all plans');
    const endpoint = `/performance?userId=${credentials.userId}&userSecret=${credentials.userSecret}`;
    return this.makeProxyRequest<any>(endpoint, 'GET', request);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if user has any connected brokerages
   */
  async hasActiveConnections(credentials: SnapTradeCredentials): Promise<boolean> {
    try {
      const connections = await this.listConnections(credentials);
      return connections.some(conn => conn.status === 'CONNECTED');
    } catch (error) {
      console.error('Error checking connections:', error);
      return false;
    }
  }

  /**
   * Get total portfolio value across all accounts
   */
  async getTotalPortfolioValue(credentials: SnapTradeCredentials): Promise<number> {
    try {
      const accounts = await this.listAccounts(credentials);
      let total = 0;

      for (const account of accounts) {
        if (account.balance?.total?.amount) {
          total += account.balance.total.amount;
        }
      }

      return total;
    } catch (error) {
      console.error('Error calculating portfolio value:', error);
      return 0;
    }
  }

  /**
   * Disconnect all brokerages for a user (cost optimization)
   */
  async disconnectAllBrokerages(credentials: SnapTradeCredentials): Promise<void> {
    console.log('🔌 Disconnecting all brokerages...');
    
    try {
      const connections = await this.listConnections(credentials);
      
      for (const conn of connections) {
        if (conn.status === 'CONNECTED') {
          await this.deleteConnection(credentials, conn.id);
          console.log(`✅ Disconnected: ${conn.brokerage.name}`);
        }
      }
      
      console.log('✅ All brokerages disconnected');
    } catch (error) {
      console.error('Failed to disconnect brokerages:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const snaptradeService = new SnapTradeService();