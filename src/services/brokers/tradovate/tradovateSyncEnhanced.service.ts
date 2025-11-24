// src/services/brokers/tradovate/tradovateSyncEnhanced.service.ts
// Enhanced version with broker_connections table integration

import { supabase } from '@/lib/supabase';
import { tradovateApiService } from './tradovateApi.service';
import { tradovateWebSocketService } from './tradovateWebSocket.service';
import { brokerConnectionService } from '../brokerConnection.service';
import {
  TradovateFill,
  TradovateContract,
  TradovateProduct,
  TradovateAccount,
  TradovatePosition
} from '@/types/brokers/tradovate/tradovate.types';

interface TradeData {
  user_id: string;
  symbol: string;
  entry_date: string;
  entry_time: string;
  exit_date?: string;
  exit_time?: string;
  direction: 'long' | 'short';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  pnl?: number;
  commission?: number;
  strategy?: string;
  notes?: string;
  broker: string;
  broker_trade_id: string;
  status: 'open' | 'closed';
  contract_size?: number;
  tick_size?: number;
  tick_value?: number;
}

interface ContractCache {
  [contractId: number]: {
    contract: TradovateContract;
    product: TradovateProduct;
  };
}

class TradovateSyncEnhancedService {
  private userId: string | null = null;
  private accountId: number | null = null;
  private connectionId: string | null = null;
  private contractCache: ContractCache = {};
  private syncInProgress: boolean = false;

  public async initialize(userId: string, accountId: number): Promise<void> {
    this.userId = userId;
    this.accountId = accountId;
    
    // Get or create broker connection record
    const account = await tradovateApiService.getAccount(accountId);
    let connection = await brokerConnectionService.getConnection(
      userId, 
      'tradovate', 
      accountId.toString()
    );

    if (!connection) {
      // Create new connection record
      connection = await brokerConnectionService.createConnection({
        user_id: userId,
        broker_name: 'tradovate',
        broker_account_id: accountId.toString(),
        broker_account_name: account.name,
        is_active: true,
        last_sync_at: null,
        connection_data: {
          accountType: account.accountType,
          clearingHouseId: account.clearingHouseId
        }
      });
    }

    this.connectionId = connection.id;
    
    // Connect to WebSocket for real-time updates
    if (tradovateApiService.isAuthenticated()) {
      const token = localStorage.getItem('tradovate_token');
      if (token) {
        await tradovateWebSocketService.connect(token);
        this.setupRealtimeListeners();
      }
    }
  }

  private setupRealtimeListeners(): void {
    tradovateWebSocketService.subscribeToFills(async (fill: TradovateFill) => {
      if (fill.finallyPaired) {
        await this.processFill(fill);
        
        // Update last sync timestamp
        if (this.connectionId) {
          await brokerConnectionService.updateLastSync(this.connectionId);
        }
      }
    });

    tradovateWebSocketService.subscribeToPositions(async (position: TradovatePosition) => {
      await this.processOpenPosition(position);
    });
  }

  private async getContractDetails(contractId: number): Promise<{ contract: TradovateContract; product: TradovateProduct }> {
    if (this.contractCache[contractId]) {
      return this.contractCache[contractId];
    }

    const contract = await tradovateApiService.getContract(contractId);
    const product = await tradovateApiService.getProduct(contract.productId);

    this.contractCache[contractId] = { contract, product };
    return { contract, product };
  }

  private async processFill(fill: TradovateFill): Promise<void> {
    if (!this.userId) {
      console.error('User ID not set');
      return;
    }

    try {
      const { contract, product } = await this.getContractDetails(fill.contractId);

      // Check if this fill is already in our database
      const { data: existingTrade } = await supabase
        .from('trades')
        .select('id')
        .eq('broker_trade_id', fill.id.toString())
        .eq('broker', 'tradovate')
        .single();

      if (existingTrade) {
        console.log('Trade already exists, skipping');
        return;
      }

      // Calculate P&L for closed positions
      let pnl: number | undefined;
      if (fill.finallyPaired) {
        const pointValue = product.valuePerPoint;
        const priceMove = fill.action === 'Buy' 
          ? (fill.price - (fill.price)) // Will be calculated properly with paired trades
          : ((fill.price) - fill.price);
        pnl = priceMove * fill.qty * pointValue;
      }

      const tradeData: TradeData = {
        user_id: this.userId,
        symbol: contract.name,
        entry_date: fill.tradeDate.year + '-' + 
                    String(fill.tradeDate.month).padStart(2, '0') + '-' + 
                    String(fill.tradeDate.day).padStart(2, '0'),
        entry_time: new Date(fill.timestamp).toTimeString().split(' ')[0],
        direction: fill.action === 'Buy' ? 'long' : 'short',
        quantity: fill.qty,
        entry_price: fill.price,
        broker: 'tradovate',
        broker_trade_id: fill.id.toString(),
        status: 'closed',
        contract_size: product.valuePerPoint,
        tick_size: product.tickSize,
        tick_value: product.valuePerPoint,
        pnl: pnl
      };

      const { error } = await supabase
        .from('trades')
        .insert([tradeData]);

      if (error) {
        console.error('Error inserting trade:', error);
      } else {
        console.log('Successfully synced trade:', fill.id);
      }
    } catch (error) {
      console.error('Error processing fill:', error);
    }
  }

  public async syncHistoricalTrades(startDate?: Date, endDate?: Date): Promise<number> {
    if (!this.userId || !this.accountId || !this.connectionId) {
      throw new Error('Service not initialized');
    }

    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    let syncedCount = 0;

    try {
      const startDateStr = startDate?.toISOString();
      const endDateStr = endDate?.toISOString();

      const fills = await tradovateApiService.getFills(
        this.accountId,
        startDateStr,
        endDateStr
      );

      console.log(`Found ${fills.length} fills to sync`);

      const finalizedFills = fills.filter(fill => fill.finallyPaired);

      for (const fill of finalizedFills) {
        await this.processFill(fill);
        syncedCount++;
      }

      // Update last sync timestamp
      await brokerConnectionService.updateLastSync(this.connectionId);

      return syncedCount;
    } catch (error) {
      console.error('Error syncing historical trades:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  public async syncCurrentPositions(): Promise<void> {
    if (!this.userId || !this.accountId || !this.connectionId) {
      throw new Error('Service not initialized');
    }

    try {
      const positions = await tradovateApiService.getPositions(this.accountId);

      for (const position of positions) {
        if (position.netPos !== 0) {
          await this.processOpenPosition(position);
        }
      }

      // Update last sync timestamp
      await brokerConnectionService.updateLastSync(this.connectionId);
    } catch (error) {
      console.error('Error syncing positions:', error);
      throw error;
    }
  }

  private async processOpenPosition(position: TradovatePosition): Promise<void> {
    if (!this.userId) return;

    try {
      const { contract, product } = await this.getContractDetails(position.contractId);

      const { data: existingTrade } = await supabase
        .from('trades')
        .select('id')
        .eq('broker_trade_id', `pos_${position.id}`)
        .eq('broker', 'tradovate')
        .eq('status', 'open')
        .single();

      if (existingTrade) {
        const { error } = await supabase
          .from('trades')
          .update({
            quantity: Math.abs(position.netPos),
            entry_price: position.netPrice
          })
          .eq('id', existingTrade.id);

        if (error) {
          console.error('Error updating position:', error);
        }
      } else {
        const tradeData: TradeData = {
          user_id: this.userId,
          symbol: contract.name,
          entry_date: new Date(position.timestamp).toISOString().split('T')[0],
          entry_time: new Date(position.timestamp).toTimeString().split(' ')[0],
          direction: position.netPos > 0 ? 'long' : 'short',
          quantity: Math.abs(position.netPos),
          entry_price: position.netPrice,
          broker: 'tradovate',
          broker_trade_id: `pos_${position.id}`,
          status: 'open',
          contract_size: product.valuePerPoint,
          tick_size: product.tickSize,
          tick_value: product.valuePerPoint
        };

        const { error } = await supabase
          .from('trades')
          .insert([tradeData]);

        if (error) {
          console.error('Error inserting position:', error);
        }
      }
    } catch (error) {
      console.error('Error processing open position:', error);
    }
  }

  public async getAccountSummary(): Promise<{
    balance: number;
    openPnL: number;
    realizedPnL: number;
    marginUsed: number;
    marginAvailable: number;
  } | null> {
    if (!this.accountId) {
      return null;
    }

    try {
      const [cashBalance, marginSnapshot] = await Promise.all([
        tradovateApiService.getCashBalance(this.accountId),
        tradovateApiService.getMarginSnapshot(this.accountId)
      ]);

      return {
        balance: cashBalance.amount,
        openPnL: cashBalance.openPnL,
        realizedPnL: cashBalance.realizedPnL,
        marginUsed: marginSnapshot.initialMargin,
        marginAvailable: marginSnapshot.marginExcess
      };
    } catch (error) {
      console.error('Error getting account summary:', error);
      return null;
    }
  }

  public async disconnect(): Promise<void> {
    tradovateWebSocketService.disconnect();
    
    // Mark connection as inactive
    if (this.connectionId) {
      await brokerConnectionService.setActive(this.connectionId, false);
    }
    
    this.userId = null;
    this.accountId = null;
    this.connectionId = null;
    this.contractCache = {};
  }

  public isSyncing(): boolean {
    return this.syncInProgress;
  }

  public getConnectionId(): string | null {
    return this.connectionId;
  }
}

export const tradovateSyncEnhancedService = new TradovateSyncEnhancedService();