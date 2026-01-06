// src/services/brokers/interactive-brokers/ibTradeSync.service.ts
// 🔄 Sync trades from Interactive Brokers IBRIT to Finotaur trades table

import { supabase } from '@/lib/supabase';
import { ibritService, IBRITCredentials, IBRITActivityRecord } from './ibrit.service';
import { brokerConnectionService } from '../tradovate/brokerConnection.service';

// ============================================================================
// TYPES
// ============================================================================

export interface IBSyncResult {
  success: boolean;
  tradesImported: number;
  tradesUpdated: number;
  tradesSkipped: number;
  errors: string[];
  syncLogId?: string;
}

export interface IBSyncOptions {
  startDate?: Date;
  endDate?: Date;
  syncType?: 'full' | 'incremental';
}

// ============================================================================
// IB TRADE SYNC SERVICE
// ============================================================================

class IBTradeSyncService {
  
  /**
   * Main sync function - syncs trades from IB to Finotaur
   */
  async syncTrades(
    userId: string,
    connectionId: string,
    options: IBSyncOptions = {}
  ): Promise<IBSyncResult> {
    const result: IBSyncResult = {
      success: false,
      tradesImported: 0,
      tradesUpdated: 0,
      tradesSkipped: 0,
      errors: [],
    };

    try {
      console.log(`🔄 Starting IB trade sync for user ${userId}`);

      // 1. Get connection credentials
      const credentials = await this.getCredentials(connectionId);
      if (!credentials) {
        throw new Error('IB credentials not found');
      }

      // 2. Create sync log
      const syncLog = await brokerConnectionService.createSyncLog(
        connectionId,
        userId,
        'trades',
        undefined,
        options.syncType === 'full' ? 'full_sync' : 'incremental'
      );
      result.syncLogId = syncLog.id;

      // 3. Determine date range
      const { startDate, endDate } = this.calculateDateRange(options);

      console.log(`📅 Sync range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // 4. Fetch trades from IB
      const ibTrades = await ibritService.fetchTradesForDateRange(
        credentials,
        startDate,
        endDate
      );

      console.log(`📥 Fetched ${ibTrades.length} trades from IB`);

      // 5. Get existing trade IDs to avoid duplicates
      const existingIds = await this.getExistingTradeIds(userId, 'interactive_brokers');

      // 6. Process and import trades
      const tradesToInsert: any[] = [];
      
      for (const ibTrade of ibTrades) {
        const externalId = ibTrade.TransactionID || ibTrade.IBExecID;
        
        // Skip if already exists
        if (existingIds.has(externalId)) {
          result.tradesSkipped++;
          continue;
        }

        try {
          const finotaurTrade = ibritService.convertToFinotaurTrade(
            ibTrade,
            userId,
            connectionId
          );
          tradesToInsert.push(finotaurTrade);
        } catch (error: any) {
          result.errors.push(`Failed to convert trade ${externalId}: ${error.message}`);
        }
      }

      // 7. Batch insert trades
      if (tradesToInsert.length > 0) {
        const { data: insertedTrades, error: insertError } = await supabase
          .from('trades')
          .insert(tradesToInsert)
          .select('id');

        if (insertError) {
          throw new Error(`Failed to insert trades: ${insertError.message}`);
        }

        result.tradesImported = insertedTrades?.length || 0;
      }

      // 8. Update sync log with success
      await brokerConnectionService.completeSyncLog(syncLog.id, 'completed', {
        recordsFetched: ibTrades.length,
        recordsCreated: result.tradesImported,
        recordsSkipped: result.tradesSkipped,
        recordsFailed: result.errors.length,
        syncDetails: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      // 9. Update connection last sync
      await brokerConnectionService.updateLastSync(connectionId, true);

      result.success = true;
      console.log(`✅ IB sync completed: ${result.tradesImported} imported, ${result.tradesSkipped} skipped`);

    } catch (error: any) {
      console.error('❌ IB sync failed:', error);
      result.errors.push(error.message);

      // Update sync log with failure
      if (result.syncLogId) {
        await brokerConnectionService.completeSyncLog(result.syncLogId, 'failed', {
          errorMessage: error.message,
        });
      }
    }

    return result;
  }

  /**
   * Get credentials from connection
   */
  private async getCredentials(connectionId: string): Promise<IBRITCredentials | null> {
    const { data: connection, error } = await supabase
      .from('broker_connections')
      .select('connection_data')
      .eq('id', connectionId)
      .single();

    if (error || !connection?.connection_data) {
      return null;
    }

    const data = connection.connection_data;
    
    if (!data.token || !data.queryId) {
      return null;
    }

    return {
      token: data.token,
      queryId: data.queryId,
      serviceCode: data.serviceCode || 'Finotaur-ws',
    };
  }

  /**
   * Calculate sync date range
   */
  private calculateDateRange(options: IBSyncOptions): { startDate: Date; endDate: Date } {
    const endDate = options.endDate || new Date();
    
    let startDate: Date;
    if (options.startDate) {
      startDate = options.startDate;
    } else if (options.syncType === 'full') {
      // Full sync: last 365 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 365);
    } else {
      // Incremental: last 7 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    }

    return { startDate, endDate };
  }

  /**
   * Get existing trade external IDs
   */
  private async getExistingTradeIds(
    userId: string,
    broker: string
  ): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('trades')
      .select('external_id')
      .eq('user_id', userId)
      .eq('broker', broker)
      .not('external_id', 'is', null);

    if (error) {
      console.error('Error fetching existing trade IDs:', error);
      return new Set();
    }

    return new Set((data || []).map(t => t.external_id));
  }

  /**
   * Save IB credentials for a user
   */
  async saveCredentials(
    userId: string,
    connectionId: string,
    credentials: IBRITCredentials
  ): Promise<void> {
    // Validate credentials first
    const isValid = await ibritService.validateCredentials(credentials);
    if (!isValid) {
      throw new Error('Invalid IB credentials. Please check your token and query ID.');
    }

    // Update connection with credentials
    await brokerConnectionService.updateConnection(connectionId, {
      connection_data: {
        token: credentials.token,
        queryId: credentials.queryId,
        serviceCode: credentials.serviceCode,
      },
      status: 'connected',
      status_message: 'Credentials validated successfully',
    });

    console.log(`✅ IB credentials saved for connection ${connectionId}`);
  }

  /**
   * Create a new IB connection
   */
  async createConnection(
    userId: string,
    credentials: IBRITCredentials,
    connectionName?: string
  ): Promise<string> {
    // Validate credentials
    const isValid = await ibritService.validateCredentials(credentials);
    if (!isValid) {
      throw new Error('Invalid IB credentials');
    }

    // Create connection
    const connection = await brokerConnectionService.createConnection(
      userId,
      'interactive-brokers',
      'live', // IBRIT is always live data
      {
        token: credentials.token,
        queryId: credentials.queryId,
        serviceCode: credentials.serviceCode,
        integrationType: 'ibrit',
      },
      connectionName || 'Interactive Brokers'
    );

    // Update status to connected
    await brokerConnectionService.updateConnectionStatus(
      connection.id,
      'connected',
      'IBRIT credentials validated'
    );

    return connection.id;
  }

  /**
   * Manual sync trigger
   */
  async triggerManualSync(
    userId: string,
    connectionId: string,
    days: number = 30
  ): Promise<IBSyncResult> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.syncTrades(userId, connectionId, {
      startDate,
      endDate: new Date(),
      syncType: 'incremental',
    });
  }
}

export const ibTradeSyncService = new IBTradeSyncService();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick sync function for UI
 */
export async function syncIBTrades(userId: string): Promise<IBSyncResult> {
  // Find the user's IB connection
  const connections = await brokerConnectionService.getConnections(userId);
  const ibConnection = connections.find(c => 
    c.broker_id && c.connection_data?.integrationType === 'ibrit'
  );

  if (!ibConnection) {
    return {
      success: false,
      tradesImported: 0,
      tradesUpdated: 0,
      tradesSkipped: 0,
      errors: ['No Interactive Brokers connection found'],
    };
  }

  return ibTradeSyncService.syncTrades(userId, ibConnection.id);
}

/**
 * Connect IB account
 */
export async function connectIBAccount(
  userId: string,
  token: string,
  queryId: string,
  serviceCode: string = 'Finotaur-ws'
): Promise<{ success: boolean; connectionId?: string; error?: string }> {
  try {
    const connectionId = await ibTradeSyncService.createConnection(
      userId,
      { token, queryId, serviceCode }
    );

    return { success: true, connectionId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}