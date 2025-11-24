// src/integrations/snaptrade/snaptradeService.ts
// ✅ FIXED VERSION - Properly sends credentials to Edge Function + Public endpoint support

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
   * ✅ FIXED: Sends userId/userSecret at root level of request body
   */
  private async makeProxyRequest<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any,
    credentials?: SnapTradeCredentials,
    isPublic: boolean = false
  ): Promise<T> {
    console.log(`[SnapTrade Service] ${method} ${endpoint}${isPublic ? ' (public)' : ''}`);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      console.log('🔑 Sending request with auth token');

      // ✅ Check if this is registerUser endpoint
      const isRegisterUser = endpoint.includes('registerUser');

      // ✅ FIX: Build request body with userId/userSecret at root level
      const requestBody: any = {
        endpoint,
        method,
        isPublic
      };

      // Add credentials if provided (at ROOT level, not nested in body)
      if (credentials && !isPublic) {
        requestBody.userId = credentials.userId;
        requestBody.userSecret = credentials.userSecret;
        console.log('✅ Added credentials:', {
          userId: credentials.userId,
          hasUserSecret: !!credentials.userSecret
        });
      }

      // Add actual body data (if any)
      if (body && Object.keys(body).length > 0) {
        if (isRegisterUser) {
          // ✅ SPECIAL CASE: For registerUser, keep userId in body
          requestBody.body = body;
          console.log('✅ Added body for registerUser:', body);
        } else {
          // For other endpoints: Remove userId/userSecret from body
          const { userId, userSecret, ...cleanBody } = body;
          if (Object.keys(cleanBody).length > 0) {
            requestBody.body = cleanBody;
          }
        }
      }

      console.log('📤 Request to Edge Function:', {
        endpoint: requestBody.endpoint,
        method: requestBody.method,
        isPublic: requestBody.isPublic,
        hasUserId: !!requestBody.userId,
        hasUserSecret: !!requestBody.userSecret,
        hasBody: !!requestBody.body
      });

      const { data, error } = await supabase.functions.invoke('snaptrade-proxy', {
        body: requestBody,
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
   * ✅ FIXED: Sends body parameter correctly
   */
  async registerUser(userId: string): Promise<SnapTradeUser> {
    console.log('📝 Registering SnapTrade user:', userId);
    
    const endpoint = `/snapTrade/registerUser`;
    
    // ✅ FIXED: Use makeProxyRequest with body parameter
    try {
      const result = await this.makeProxyRequest<SnapTradeUser>(
        endpoint,
        'POST',
        { userId },  // ✅ body goes here
        undefined,   // no credentials for registerUser
        false        // not public
      );
      
      console.log('✅ User registered successfully:', result);
      return result;
      
    } catch (error: any) {
      console.error('❌ Failed to register user:', error);
      throw error;
    }
  }

  /**
   * Delete a SnapTrade user
   */
  async deleteUser(userId: string, userSecret: string): Promise<void> {
    console.log('🗑️ Deleting SnapTrade user:', userId);
    
    try {
      const endpoint = `/deleteUser`;
      
      await this.makeProxyRequest<void>(
        endpoint, 
        'POST', 
        undefined,
        { userId, userSecret }
      );
      console.log('✅ User deleted successfully');
    } catch (error: any) {
      console.warn('⚠️ Could not delete user:', error.message);
    }
  }

  // ============================================================================
  // BROKERAGE CONNECTIONS
  // ============================================================================

  /**
   * Get authorization URL for connecting a brokerage
   * ✅ Uses /snapTrade/login endpoint (POST)
   */
  async getAuthorizationUrl(request: GetAuthUrlRequest): Promise<AuthorizationUrl> {
    console.log('🔗 Getting authorization URL for broker:', request.broker);
    
    const endpoint = `/snapTrade/login`;
    
    const credentials: SnapTradeCredentials = {
      userId: request.userId,
      userSecret: request.userSecret
    };

    const requestBody = {
      broker: request.broker,
      immediateRedirect: request.immediateRedirect ?? true,
      customRedirect: request.customRedirect,
      reconnect: request.reconnect,
      connectionType: request.connectionType ?? 'read',
      connectionPortalVersion: request.connectionPortalVersion ?? 'v4',
    };
    
    console.log('📤 Request body:', {
      ...requestBody,
      customRedirect: requestBody.customRedirect ? '✅' : '❌'
    });
    
    return this.makeProxyRequest<AuthorizationUrl>(
      endpoint, 
      'POST', 
      requestBody,
      credentials
    );
  }

  /**
   * List all brokerage connections for a user
   */
  async listConnections(credentials: SnapTradeCredentials): Promise<BrokerageConnection[]> {
    const endpoint = `/connections`;
    return this.makeProxyRequest<BrokerageConnection[]>(
      endpoint, 
      'GET', 
      undefined,
      credentials
    );
  }

  /**
   * Delete a specific brokerage connection
   */
  async deleteConnection(
    credentials: SnapTradeCredentials,
    connectionId: string
  ): Promise<void> {
    const endpoint = `/connections/${connectionId}`;
    return this.makeProxyRequest<void>(
      endpoint, 
      'DELETE', 
      undefined,
      credentials
    );
  }

  /**
   * Refresh a brokerage connection
   */
  async refreshConnection(
    credentials: SnapTradeCredentials,
    connectionId: string
  ): Promise<any> {
    const endpoint = `/connections/${connectionId}/refresh`;
    return this.makeProxyRequest<any>(
      endpoint, 
      'POST', 
      undefined,
      credentials
    );
  }

  // ============================================================================
  // BROKERAGES
  // ============================================================================

  /**
   * Get list of all available brokerages
   * ✅ PUBLIC ENDPOINT - doesn't need credentials
   */
  async listBrokerages(): Promise<Brokerage[]> {
    console.log('📋 Fetching available brokerages (public endpoint)...');
    const endpoint = '/brokerages';
    
    // ✅ Call with isPublic flag - no credentials needed
    return this.makeProxyRequest<Brokerage[]>(
      endpoint, 
      'GET',
      undefined,
      undefined,
      true  // isPublic = true
    );
  }

  // ============================================================================
  // ACCOUNTS
  // ============================================================================

  /**
   * List all accounts for a user
   */
  async listAccounts(credentials: SnapTradeCredentials): Promise<Account[]> {
    const endpoint = `/accounts`;
    return this.makeProxyRequest<Account[]>(
      endpoint, 
      'GET', 
      undefined,
      credentials
    );
  }

  /**
   * Get account details
   */
  async getAccountDetails(
    credentials: SnapTradeCredentials,
    accountId: string
  ): Promise<Account> {
    const endpoint = `/accounts/${accountId}`;
    return this.makeProxyRequest<Account>(
      endpoint, 
      'GET', 
      undefined,
      credentials
    );
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
    const endpoint = `/accounts/${accountId}/holdings`;
    return this.makeProxyRequest<Position[]>(
      endpoint, 
      'GET', 
      undefined,
      credentials
    );
  }

  /**
   * Get all holdings across all accounts
   */
  async getAllHoldings(credentials: SnapTradeCredentials): Promise<AccountHoldings[]> {
    const endpoint = `/holdings`;
    return this.makeProxyRequest<AccountHoldings[]>(
      endpoint, 
      'GET', 
      undefined,
      credentials
    );
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
    const endpoint = `/activities`;
    return this.makeProxyRequest<Activity[]>(
      endpoint, 
      'GET', 
      params,
      credentials
    );
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
    const endpoint = `/accounts/${accountId}/transactions`;
    return this.makeProxyRequest<any[]>(
      endpoint, 
      'GET', 
      params,
      credentials
    );
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
    const endpoint = `/accounts/${accountId}/orders`;
    return this.makeProxyRequest<any[]>(
      endpoint, 
      'GET', 
      params,
      credentials
    );
  }

  /**
   * Place a new order
   */
  async placeOrder(
    credentials: SnapTradeCredentials,
    accountId: string,
    orderRequest: any
  ): Promise<any> {
    const endpoint = `/accounts/${accountId}/orders`;
    return this.makeProxyRequest<any>(
      endpoint, 
      'POST', 
      orderRequest,
      credentials
    );
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    credentials: SnapTradeCredentials,
    accountId: string,
    orderId: string
  ): Promise<any> {
    const endpoint = `/accounts/${accountId}/orders/${orderId}/cancel`;
    return this.makeProxyRequest<any>(
      endpoint, 
      'POST', 
      undefined,
      credentials
    );
  }

  /**
   * Get performance data
   */
  async getPerformance(
    credentials: SnapTradeCredentials,
    request: any
  ): Promise<any> {
    console.log('⚠️ getPerformance may not be available in all plans');
    const endpoint = `/performance`;
    return this.makeProxyRequest<any>(
      endpoint, 
      'GET', 
      request,
      credentials
    );
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