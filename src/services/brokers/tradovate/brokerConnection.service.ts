// src/services/brokers/tradovate/brokerConnection.service.ts
// 🎯 Updated to match the advanced multi-broker schema

import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES - Matching the database schema
// ============================================================================

export interface BrokerDefinition {
  id: string;
  name: string;
  display_name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  broker_type: string;
  asset_classes: string[];
  auth_method: string;
  auth_config: Record<string, any>;
  api_config: Record<string, any>;
  features: Record<string, any>;
  is_active: boolean;
  is_beta: boolean;
}

export interface BrokerConnection {
  id: string;
  user_id: string;
  broker_id: string;
  connection_name: string | null;
  environment: 'demo' | 'live' | 'paper' | 'simulated';
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  connection_data: Record<string, any>;
  status: 'pending' | 'connected' | 'disconnected' | 'error' | 'expired' | 'revoked';
  status_message: string | null;
  last_error: string | null;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  last_successful_sync_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrokerAccount {
  id: string;
  connection_id: string;
  user_id: string;
  broker_account_id: string;
  account_name: string | null;
  account_number: string | null;
  account_type: string;
  base_currency: string;
  broker_status: string | null;
  balance_snapshot: Record<string, any>;
  account_data: Record<string, any>;
  is_primary: boolean;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

export interface BrokerSyncLog {
  id: string;
  connection_id: string;
  account_id: string | null;
  user_id: string;
  sync_type: string;
  sync_trigger: string;
  status: string;
  records_fetched: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  records_failed: number;
  sync_details: Record<string, any>;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

// ============================================================================
// BROKER CONNECTION SERVICE
// ============================================================================

class BrokerConnectionService {
  
  // ==========================================================================
  // BROKER DEFINITIONS
  // ==========================================================================

  async getBrokerDefinitions(): Promise<BrokerDefinition[]> {
    const { data, error } = await supabase
      .from('broker_definitions')
      .select('*')
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      console.error('Error fetching broker definitions:', error);
      throw error;
    }

    return data || [];
  }

  async getBrokerBySlug(slug: string): Promise<BrokerDefinition | null> {
    const { data, error } = await supabase
      .from('broker_definitions')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching broker definition:', error);
      throw error;
    }

    return data;
  }

  // ==========================================================================
  // BROKER CONNECTIONS
  // ==========================================================================

  async getConnections(userId: string): Promise<BrokerConnection[]> {
    const { data, error } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching broker connections:', error);
      throw error;
    }

    return data || [];
  }

  async getConnection(
    userId: string,
    brokerSlug: string,
    environment: string = 'demo'
  ): Promise<BrokerConnection | null> {
    // First get the broker definition
    const broker = await this.getBrokerBySlug(brokerSlug);
    if (!broker) return null;

    const { data, error } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('broker_id', broker.id)
      .eq('environment', environment)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching broker connection:', error);
      throw error;
    }

    return data;
  }

  async getConnectionById(connectionId: string): Promise<BrokerConnection | null> {
    const { data, error } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching broker connection:', error);
      throw error;
    }

    return data;
  }

  async createConnection(
    userId: string,
    brokerSlug: string,
    environment: 'demo' | 'live',
    connectionData: Record<string, any> = {},
    connectionName?: string
  ): Promise<BrokerConnection> {
    // Get broker definition
    const broker = await this.getBrokerBySlug(brokerSlug);
    if (!broker) {
      throw new Error(`Broker '${brokerSlug}' not found`);
    }

    const { data, error } = await supabase
      .from('broker_connections')
      .insert([{
        user_id: userId,
        broker_id: broker.id,
        connection_name: connectionName || `${broker.display_name} ${environment}`,
        environment,
        connection_data: connectionData,
        status: 'pending',
        is_active: true,
        auto_sync_enabled: true,
        sync_interval_minutes: 15
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating broker connection:', error);
      throw error;
    }

    return data;
  }

  async updateConnection(
    connectionId: string,
    updates: Partial<Pick<BrokerConnection, 
      'connection_name' | 'connection_data' | 'status' | 'status_message' |
      'access_token' | 'refresh_token' | 'token_expires_at' |
      'auto_sync_enabled' | 'sync_interval_minutes' | 'is_active'
    >>
  ): Promise<BrokerConnection> {
    const { data, error } = await supabase
      .from('broker_connections')
      .update(updates)
      .eq('id', connectionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating broker connection:', error);
      throw error;
    }

    return data;
  }

  async updateConnectionStatus(
    connectionId: string,
    status: BrokerConnection['status'],
    statusMessage?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('broker_connections')
      .update({
        status,
        status_message: statusMessage || null,
        connected_at: status === 'connected' ? new Date().toISOString() : undefined,
        disconnected_at: ['disconnected', 'expired', 'revoked'].includes(status) 
          ? new Date().toISOString() : undefined
      })
      .eq('id', connectionId);

    if (error) {
      console.error('Error updating connection status:', error);
      throw error;
    }
  }

  async updateLastSync(connectionId: string, successful: boolean = true): Promise<void> {
    const updates: Record<string, any> = {
      last_sync_at: new Date().toISOString()
    };

    if (successful) {
      updates.last_successful_sync_at = new Date().toISOString();
      updates.error_count = 0;
    }

    const { error } = await supabase
      .from('broker_connections')
      .update(updates)
      .eq('id', connectionId);

    if (error) {
      console.error('Error updating last sync timestamp:', error);
      throw error;
    }
  }

  async setActive(connectionId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('broker_connections')
      .update({ 
        is_active: isActive,
        status: isActive ? 'connected' : 'disconnected'
      })
      .eq('id', connectionId);

    if (error) {
      console.error('Error updating connection status:', error);
      throw error;
    }
  }

  async deleteConnection(connectionId: string): Promise<void> {
    // Soft delete - mark as inactive
    const { error } = await supabase
      .from('broker_connections')
      .update({ 
        is_active: false,
        status: 'disconnected',
        disconnected_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (error) {
      console.error('Error deleting broker connection:', error);
      throw error;
    }
  }

  // ==========================================================================
  // BROKER ACCOUNTS
  // ==========================================================================

  async getAccounts(connectionId: string): Promise<BrokerAccount[]> {
    const { data, error } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching broker accounts:', error);
      throw error;
    }

    return data || [];
  }

  async getAccount(connectionId: string, brokerAccountId: string): Promise<BrokerAccount | null> {
    const { data, error } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('broker_account_id', brokerAccountId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching broker account:', error);
      throw error;
    }

    return data;
  }

  async createAccount(
    connectionId: string,
    userId: string,
    brokerAccountId: string,
    accountName: string,
    accountType: string = 'individual',
    accountData: Record<string, any> = {}
  ): Promise<BrokerAccount> {
    const { data, error } = await supabase
      .from('broker_accounts')
      .insert([{
        connection_id: connectionId,
        user_id: userId,
        broker_account_id: brokerAccountId,
        account_name: accountName,
        account_type: accountType,
        account_data: accountData,
        is_active: true,
        sync_status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating broker account:', error);
      throw error;
    }

    return data;
  }

  async updateAccountBalance(
    accountId: string,
    balanceSnapshot: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase
      .from('broker_accounts')
      .update({
        balance_snapshot: {
          ...balanceSnapshot,
          updated_at: new Date().toISOString()
        },
        last_sync_at: new Date().toISOString(),
        sync_status: 'synced'
      })
      .eq('id', accountId);

    if (error) {
      console.error('Error updating account balance:', error);
      throw error;
    }
  }

  async getOrCreateAccount(
    connectionId: string,
    userId: string,
    brokerAccountId: string,
    accountName: string,
    accountType: string = 'individual',
    accountData: Record<string, any> = {}
  ): Promise<BrokerAccount> {
    // Try to get existing account
    let account = await this.getAccount(connectionId, brokerAccountId);
    
    if (!account) {
      // Create new account
      account = await this.createAccount(
        connectionId,
        userId,
        brokerAccountId,
        accountName,
        accountType,
        accountData
      );
    }

    return account;
  }

  // ==========================================================================
  // SYNC LOGS
  // ==========================================================================

  async createSyncLog(
    connectionId: string,
    userId: string,
    syncType: string,
    accountId?: string,
    syncTrigger: string = 'manual'
  ): Promise<BrokerSyncLog> {
    const { data, error } = await supabase
      .from('broker_sync_logs')
      .insert([{
        connection_id: connectionId,
        account_id: accountId || null,
        user_id: userId,
        sync_type: syncType,
        sync_trigger: syncTrigger,
        status: 'started',
        started_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating sync log:', error);
      throw error;
    }

    return data;
  }

  async completeSyncLog(
    logId: string,
    status: 'completed' | 'partial' | 'failed',
    results: {
      recordsFetched?: number;
      recordsCreated?: number;
      recordsUpdated?: number;
      recordsSkipped?: number;
      recordsFailed?: number;
      errorMessage?: string;
      syncDetails?: Record<string, any>;
    }
  ): Promise<void> {
    const startedAt = await this.getSyncLogStartTime(logId);
    const durationMs = startedAt 
      ? new Date().getTime() - new Date(startedAt).getTime() 
      : null;

    const { error } = await supabase
      .from('broker_sync_logs')
      .update({
        status,
        records_fetched: results.recordsFetched || 0,
        records_created: results.recordsCreated || 0,
        records_updated: results.recordsUpdated || 0,
        records_skipped: results.recordsSkipped || 0,
        records_failed: results.recordsFailed || 0,
        error_message: results.errorMessage || null,
        sync_details: results.syncDetails || {},
        completed_at: new Date().toISOString(),
        duration_ms: durationMs
      })
      .eq('id', logId);

    if (error) {
      console.error('Error completing sync log:', error);
      throw error;
    }
  }

  private async getSyncLogStartTime(logId: string): Promise<string | null> {
    const { data } = await supabase
      .from('broker_sync_logs')
      .select('started_at')
      .eq('id', logId)
      .single();

    return data?.started_at || null;
  }

  async getSyncLogs(
    connectionId: string,
    limit: number = 10
  ): Promise<BrokerSyncLog[]> {
    const { data, error } = await supabase
      .from('broker_sync_logs')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching sync logs:', error);
      throw error;
    }

    return data || [];
  }
}

export const brokerConnectionService = new BrokerConnectionService();