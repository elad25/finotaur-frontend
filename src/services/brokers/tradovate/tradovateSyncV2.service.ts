// src/services/brokers/tradovate/tradovateSyncV2.service.ts
// 🎯 V2 - Updated to match the advanced multi-broker database schema

import { supabase } from '@/lib/supabase';
import { tradovateApiService } from './tradovateApi.service';
import { tradovateWebSocketService } from './tradovateWebSocket.service';
import { 
  brokerConnectionService,
  BrokerConnection,
  BrokerAccount 
} from './brokerConnection.service';
import {
  tradovateTradeMapperService,
  FinotaurTradeData
} from './tradovateTradeMapper.service';
import {
  TradovateFill,
  TradovateContract,
  TradovateProduct,
  TradovatePosition,
  TradovateAccount
} from '@/types/brokers/tradovate/tradovate.types';

// ============================================================================
// TYPES
// ============================================================================

interface FillWithDetails extends TradovateFill {
  contract: TradovateContract;
  product: TradovateProduct;
}

export interface SyncResult {
  success: boolean;
  tradesImported: number;
  tradesSkipped: number;
  tradesUpdated: number;
  errors: string[];
  syncLogId?: string;
}

interface ContractCache {
  [contractId: number]: {
    contract: TradovateContract;
    product: TradovateProduct;
  };
}

// ============================================================================
// TRADOVATE SYNC SERVICE V2
// ============================================================================

class TradovateSyncV2Service {
  private userId: string | null = null;
  private tradovateAccountId: number | null = null;
  private connectionId: string | null = null;
  private brokerAccountId: string | null = null;
  private contractCache: ContractCache = {};
  private syncInProgress: boolean = false;
  private environment: 'demo' | 'live' = 'demo';

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  public async initialize(
    userId: string, 
    tradovateAccountId: number,
    environment: 'demo' | 'live' = 'demo'
  ): Promise<void> {
    console.log('🚀 TradovateSyncV2: Initializing...', { userId, tradovateAccountId, environment });
    
    this.userId = userId;
    this.tradovateAccountId = tradovateAccountId;
    this.environment = environment;

    try {
      // Get Tradovate account details
      const tradovateAccount = await tradovateApiService.getAccount(tradovateAccountId);
      
      // Get or create broker connection
      let connection = await brokerConnectionService.getConnection(
        userId,
        'tradovate',
        environment
      );

      if (!connection) {
        console.log('📝 Creating new broker connection...');
        connection = await brokerConnectionService.createConnection(
          userId,
          'tradovate',
          environment,
          {
            tradovate_user_id: tradovateApiService.getUserInfo()?.userId,
            tradovate_user_name: tradovateApiService.getUserInfo()?.userName
          },
          `Tradovate ${environment === 'demo' ? 'Demo' : 'Live'}`
        );
      }

      this.connectionId = connection.id;

      // Update connection status to connected
      await brokerConnectionService.updateConnectionStatus(connection.id, 'connected');

      // Get or create broker account
      const brokerAccount = await brokerConnectionService.getOrCreateAccount(
        connection.id,
        userId,
        tradovateAccountId.toString(),
        tradovateAccount.name,
        tradovateAccount.accountType === 'Demo' ? 'paper' : 'individual',
        {
          clearingHouseId: tradovateAccount.clearingHouseId,
          riskCategoryId: tradovateAccount.riskCategoryId,
          marginAccountType: tradovateAccount.marginAccountType
        }
      );

      this.brokerAccountId = brokerAccount.id;

      // Setup WebSocket for real-time updates
      await this.setupRealtimeSync();

      console.log('✅ TradovateSyncV2: Initialized successfully', {
        connectionId: this.connectionId,
        brokerAccountId: this.brokerAccountId
      });

    } catch (error) {
      console.error('❌ TradovateSyncV2: Initialization failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // REAL-TIME SYNC
  // ============================================================================

  private async setupRealtimeSync(): Promise<void> {
    if (!tradovateApiService.isAuthenticated()) {
      console.warn('⚠️ Cannot setup realtime sync: not authenticated');
      return;
    }

    const token = localStorage.getItem('tradovate_token');
    if (!token) {
      console.warn('⚠️ Cannot setup realtime sync: no token');
      return;
    }

    try {
      await tradovateWebSocketService.connect(token);

      // Subscribe to fills (completed trades)
      tradovateWebSocketService.subscribeToFills(async (fill: TradovateFill) => {
        console.log('📥 Real-time fill received:', fill.id);
        if (fill.finallyPaired) {
          await this.handleRealtimeFill(fill);
        }
      });

      // Subscribe to position changes
      tradovateWebSocketService.subscribeToPositions(async (position: TradovatePosition) => {
        console.log('📥 Real-time position update:', position.id);
        await this.handleRealtimePosition(position);
      });

      console.log('✅ Real-time sync enabled');
    } catch (error) {
      console.error('❌ Failed to setup realtime sync:', error);
    }
  }

  private async handleRealtimeFill(fill: TradovateFill): Promise<void> {
    if (!this.userId) return;

    try {
      // Trigger a mini-sync for recent fills to ensure proper pairing
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      await this.syncHistoricalTrades(oneDayAgo, undefined, 'realtime');
    } catch (error) {
      console.error('❌ Error handling realtime fill:', error);
    }
  }

  private async handleRealtimePosition(position: TradovatePosition): Promise<void> {
    if (!this.userId) return;

    try {
      await this.syncCurrentPositions('realtime');
    } catch (error) {
      console.error('❌ Error handling realtime position:', error);
    }
  }

  // ============================================================================
  // HISTORICAL SYNC
  // ============================================================================

  public async syncHistoricalTrades(
    startDate?: Date,
    endDate?: Date,
    trigger: 'manual' | 'scheduled' | 'realtime' = 'manual'
  ): Promise<SyncResult> {
    if (!this.userId || !this.tradovateAccountId || !this.connectionId) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: false,
      tradesImported: 0,
      tradesSkipped: 0,
      tradesUpdated: 0,
      errors: []
    };

    // Create sync log
    let syncLog;
    try {
      syncLog = await brokerConnectionService.createSyncLog(
        this.connectionId,
        this.userId,
        'fills',
        this.brokerAccountId || undefined,
        trigger
      );
      result.syncLogId = syncLog.id;
    } catch (error) {
      console.warn('⚠️ Could not create sync log:', error);
    }

    try {
      console.log('🔄 Starting historical sync...', { startDate, endDate, trigger });

      // 1. Get existing external IDs to avoid duplicates
      const existingIds = await this.getExistingExternalIds();
      console.log(`📊 Found ${existingIds.size} existing trades`);

      // 2. Fetch fills from Tradovate
      const fills = await tradovateApiService.getFills(
        this.tradovateAccountId,
        startDate?.toISOString(),
        endDate?.toISOString()
      );
      console.log(`📥 Fetched ${fills.length} fills from Tradovate`);

      // 3. Filter to finalized fills only
      const finalizedFills = fills.filter(f => f.finallyPaired);
      console.log(`✅ ${finalizedFills.length} finalized fills`);

      // 4. Enrich fills with contract/product details
      const enrichedFills = await this.enrichFillsWithDetails(finalizedFills);

      // 5. Pair fills into trades
      const pairedTrades = tradovateTradeMapperService.pairFillsToTrades(
        enrichedFills,
        existingIds
      );
      console.log(`🔗 Paired into ${pairedTrades.length} trades`);

      // 6. Convert to Finotaur format and insert
      for (const pairedTrade of pairedTrades) {
        try {
          // Only sync closed trades
          if (!pairedTrade.isClosed) {
            result.tradesSkipped++;
            continue;
          }

          const tradeData = tradovateTradeMapperService.convertToFinotaurTrade(
            pairedTrade,
            this.userId
          );

          // Add broker connection references
          const enrichedTradeData = {
            ...tradeData,
            broker_connection_id: this.connectionId,
            broker_account_id: this.brokerAccountId,
            broker_name: 'tradovate',
            synced_at: new Date().toISOString(),
            sync_source: trigger
          };

          // Validate before insert
          const validation = tradovateTradeMapperService.validateTradeData(tradeData);
          if (!validation.valid) {
            console.error('❌ Invalid trade data:', validation.errors);
            result.errors.push(`Invalid trade: ${validation.errors.join(', ')}`);
            continue;
          }

          // Check if already exists
          if (existingIds.has(tradeData.external_id)) {
            result.tradesSkipped++;
            continue;
          }

          // Insert trade
          const { error } = await supabase
            .from('trades')
            .insert([enrichedTradeData]);

          if (error) {
            console.error('❌ Insert error:', error);
            result.errors.push(`Insert failed: ${error.message}`);
          } else {
            result.tradesImported++;
            console.log(`✅ Imported trade: ${tradeData.symbol} ${tradeData.side}`);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(errorMsg);
          console.error('❌ Error processing trade:', err);
        }
      }

      // 7. Update last sync timestamp
      await brokerConnectionService.updateLastSync(this.connectionId, result.errors.length === 0);

      // 8. Update account balance
      await this.updateAccountBalance();

      result.success = result.errors.length === 0;
      console.log('✅ Sync completed:', result);

      // Complete sync log
      if (syncLog) {
        await brokerConnectionService.completeSyncLog(syncLog.id, 
          result.success ? 'completed' : result.tradesImported > 0 ? 'partial' : 'failed',
          {
            recordsFetched: fills.length,
            recordsCreated: result.tradesImported,
            recordsSkipped: result.tradesSkipped,
            recordsFailed: result.errors.length,
            errorMessage: result.errors.length > 0 ? result.errors[0] : undefined,
            syncDetails: {
              finalizedFills: finalizedFills.length,
              pairedTrades: pairedTrades.length
            }
          }
        );
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      console.error('❌ Sync failed:', error);

      if (syncLog) {
        await brokerConnectionService.completeSyncLog(syncLog.id, 'failed', {
          errorMessage: errorMsg
        });
      }
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  // ============================================================================
  // POSITION SYNC
  // ============================================================================

  public async syncCurrentPositions(
    trigger: 'manual' | 'scheduled' | 'realtime' = 'manual'
  ): Promise<SyncResult> {
    if (!this.userId || !this.tradovateAccountId || !this.connectionId) {
      throw new Error('Service not initialized');
    }

    const result: SyncResult = {
      success: false,
      tradesImported: 0,
      tradesSkipped: 0,
      tradesUpdated: 0,
      errors: []
    };

    try {
      console.log('🔄 Syncing current positions...');

      const positions = await tradovateApiService.getPositions(this.tradovateAccountId);
      const openPositions = positions.filter(p => p.netPos !== 0);
      console.log(`📊 Found ${openPositions.length} open positions`);

      // Get existing open trades from Tradovate
      const { data: existingOpenTrades } = await supabase
        .from('trades')
        .select('external_id, id')
        .eq('user_id', this.userId)
        .eq('broker', 'tradovate')
        .is('close_at', null);

      const existingMap = new Map(
        existingOpenTrades?.map(t => [t.external_id, t.id]) ?? []
      );

      for (const position of openPositions) {
        try {
          const { contract, product } = await this.getContractDetails(position.contractId);

          const tradeData = tradovateTradeMapperService.convertPositionToFinotaurTrade(
            position,
            contract,
            product,
            this.userId
          );

          const enrichedTradeData = {
            ...tradeData,
            broker_connection_id: this.connectionId,
            broker_account_id: this.brokerAccountId,
            broker_name: 'tradovate',
            synced_at: new Date().toISOString(),
            sync_source: trigger
          };

          const existingTradeId = existingMap.get(tradeData.external_id);

          if (existingTradeId) {
            // Update existing position
            const { error } = await supabase
              .from('trades')
              .update({
                quantity: tradeData.quantity,
                entry_price: tradeData.entry_price,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingTradeId);

            if (error) {
              result.errors.push(`Update failed: ${error.message}`);
            } else {
              result.tradesUpdated++;
            }
          } else {
            // Insert new position
            const { error } = await supabase
              .from('trades')
              .insert([enrichedTradeData]);

            if (error) {
              result.errors.push(`Insert failed: ${error.message}`);
            } else {
              result.tradesImported++;
            }
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(errorMsg);
        }
      }

      // Update last sync timestamp
      await brokerConnectionService.updateLastSync(this.connectionId, result.errors.length === 0);

      result.success = result.errors.length === 0;
      console.log('✅ Position sync completed:', result);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      console.error('❌ Position sync failed:', error);
    }

    return result;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getExistingExternalIds(): Promise<Set<string>> {
    if (!this.userId) return new Set();

    const { data } = await supabase
      .from('trades')
      .select('external_id')
      .eq('user_id', this.userId)
      .eq('broker', 'tradovate')
      .not('external_id', 'is', null);

    return new Set(data?.map(t => t.external_id).filter(Boolean) ?? []);
  }

  private async enrichFillsWithDetails(fills: TradovateFill[]): Promise<FillWithDetails[]> {
    const enrichedFills: FillWithDetails[] = [];

    for (const fill of fills) {
      try {
        const { contract, product } = await this.getContractDetails(fill.contractId);
        enrichedFills.push({
          ...fill,
          contract,
          product
        });
      } catch (error) {
        console.error(`❌ Failed to get details for contract ${fill.contractId}:`, error);
      }
    }

    return enrichedFills;
  }

  private async getContractDetails(contractId: number): Promise<{
    contract: TradovateContract;
    product: TradovateProduct;
  }> {
    if (this.contractCache[contractId]) {
      return this.contractCache[contractId];
    }

    const contract = await tradovateApiService.getContract(contractId);
    const product = await tradovateApiService.getProduct(contract.productId);

    this.contractCache[contractId] = { contract, product };
    return { contract, product };
  }

  private async updateAccountBalance(): Promise<void> {
    if (!this.brokerAccountId || !this.tradovateAccountId) return;

    try {
      const [cashBalance, marginSnapshot] = await Promise.all([
        tradovateApiService.getCashBalance(this.tradovateAccountId),
        tradovateApiService.getMarginSnapshot(this.tradovateAccountId)
      ]);

      await brokerConnectionService.updateAccountBalance(this.brokerAccountId, {
        cash_balance: cashBalance.amount,
        open_pnl: cashBalance.openPnL,
        realized_pnl: cashBalance.realizedPnL,
        initial_margin: marginSnapshot.initialMargin,
        maintenance_margin: marginSnapshot.maintenanceMargin,
        margin_excess: marginSnapshot.marginExcess
      });
    } catch (error) {
      console.error('❌ Failed to update account balance:', error);
    }
  }

  // ============================================================================
  // ACCOUNT INFO
  // ============================================================================

  public async getAccountSummary(): Promise<{
    balance: number;
    openPnL: number;
    realizedPnL: number;
    marginUsed: number;
    marginAvailable: number;
  } | null> {
    if (!this.tradovateAccountId) return null;

    try {
      const [cashBalance, marginSnapshot] = await Promise.all([
        tradovateApiService.getCashBalance(this.tradovateAccountId),
        tradovateApiService.getMarginSnapshot(this.tradovateAccountId)
      ]);

      return {
        balance: cashBalance.amount,
        openPnL: cashBalance.openPnL,
        realizedPnL: cashBalance.realizedPnL,
        marginUsed: marginSnapshot.initialMargin,
        marginAvailable: marginSnapshot.marginExcess
      };
    } catch (error) {
      console.error('❌ Error getting account summary:', error);
      return null;
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  public async disconnect(): Promise<void> {
    console.log('👋 Disconnecting TradovateSyncV2...');

    tradovateWebSocketService.disconnect();

    if (this.connectionId) {
      await brokerConnectionService.updateConnectionStatus(this.connectionId, 'disconnected');
    }

    this.userId = null;
    this.tradovateAccountId = null;
    this.connectionId = null;
    this.brokerAccountId = null;
    this.contractCache = {};
  }

  // ============================================================================
  // STATUS
  // ============================================================================

  public isSyncing(): boolean {
    return this.syncInProgress;
  }

  public isInitialized(): boolean {
    return this.userId !== null && this.tradovateAccountId !== null;
  }

  public getConnectionId(): string | null {
    return this.connectionId;
  }

  public getBrokerAccountId(): string | null {
    return this.brokerAccountId;
  }
}

export const tradovateSyncV2Service = new TradovateSyncV2Service();