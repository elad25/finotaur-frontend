// lib/brokers/ib/ib-api.ts
// Fetch trades from Interactive Brokers API

import { BrokerTrade } from '../types';
import { getValidAccessToken } from './ib-oauth';

const IB_API_BASE = 'https://api.ibkr.com/v1';

interface IBTrade {
  orderId: string;
  symbol: string;
  side: string;
  quantity: number;
  avgFillPrice: number;
  commission: number;
  executionTime: string;
  orderType: string;
  status: string;
}

interface IBPosition {
  symbol: string;
  position: number;
  averagePrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

// Fetch account information
export async function getIBAccount(userId: string): Promise<any> {
  const accessToken = await getValidAccessToken(userId);
  
  const response = await fetch(`${IB_API_BASE}/portal/account`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch IB account');
  }
  
  return response.json();
}

// Fetch trade history
export async function getIBTrades(
  userId: string,
  accountId: string,
  startDate?: Date,
  endDate?: Date
): Promise<BrokerTrade[]> {
  const accessToken = await getValidAccessToken(userId);
  
  // Build query params
  const params = new URLSearchParams({
    accountId,
  });
  
  if (startDate) {
    params.append('startDate', startDate.toISOString().split('T')[0]);
  }
  if (endDate) {
    params.append('endDate', endDate.toISOString().split('T')[0]);
  }
  
  const response = await fetch(
    `${IB_API_BASE}/portal/iserver/account/${accountId}/orders?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch IB trades');
  }
  
  const data: IBTrade[] = await response.json();
  
  // Convert to unified format
  return data
    .filter(t => t.status === 'Filled')
    .map(trade => ({
      external_id: `ib_${trade.orderId}`,
      broker: 'interactive_brokers',
      symbol: trade.symbol,
      side: trade.side.toUpperCase() === 'BUY' ? 'LONG' : 'SHORT',
      entry_price: trade.avgFillPrice,
      quantity: Math.abs(trade.quantity),
      fees: Math.abs(trade.commission),
      open_at: new Date(trade.executionTime).toISOString(),
      asset_type: 'stock',
    }));
}

// Fetch current positions
export async function getIBPositions(
  userId: string,
  accountId: string
): Promise<IBPosition[]> {
  const accessToken = await getValidAccessToken(userId);
  
  const response = await fetch(
    `${IB_API_BASE}/portfolio/${accountId}/positions`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch IB positions');
  }
  
  return response.json();
}

// Sync trades from IB to Finotaur
export async function syncIBTrades(
  userId: string,
  accountId: string,
  supabase: any
): Promise<{ imported: number; errors: string[] }> {
  try {
    // Fetch trades from last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const trades = await getIBTrades(userId, accountId, startDate);
    
    // Check which trades already exist
    const { data: existingTrades } = await supabase
      .from('trades')
      .select('external_id')
      .eq('user_id', userId)
      .eq('broker', 'interactive_brokers');
    
    const existingIds = new Set(
      existingTrades?.map((t: any) => t.external_id) || []
    );
    
    // Filter out existing trades
    const newTrades = trades.filter(t => !existingIds.has(t.external_id));
    
    if (newTrades.length === 0) {
      return { imported: 0, errors: [] };
    }
    
    // Insert new trades
    const { error } = await supabase
      .from('trades')
      .insert(
        newTrades.map(trade => ({
          user_id: userId,
          ...trade,
        }))
      );
    
    if (error) {
      return {
        imported: 0,
        errors: [`Failed to save trades: ${error.message}`],
      };
    }
    
    // Update last sync time
    await supabase
      .from('broker_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('broker', 'interactive_brokers');
    
    return { imported: newTrades.length, errors: [] };
    
  } catch (error: any) {
    return {
      imported: 0,
      errors: [error.message],
    };
  }
}

// Setup automatic sync (call this from a cron job or webhook)
export async function setupIBAutoSync(
  userId: string,
  accountId: string,
  supabase: any
) {
  // This would be called by a scheduled job (e.g., every hour)
  // Or by a webhook from IB when new trades are executed
  
  const result = await syncIBTrades(userId, accountId, supabase);
  
  if (result.errors.length > 0) {
    console.error(`IB sync errors for user ${userId}:`, result.errors);
    
    // Update connection status to error
    await supabase
      .from('broker_connections')
      .update({
        status: 'error',
        error_message: result.errors.join(', '),
      })
      .eq('user_id', userId)
      .eq('broker', 'interactive_brokers');
  } else if (result.imported > 0) {
    console.log(`Synced ${result.imported} trades for user ${userId}`);
  }
  
  return result;
}

// Example cron job handler
/*
// app/api/cron/sync-brokers/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setupIBAutoSync } from '@/lib/brokers/ib/ib-api';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Get all active IB connections
  const { data: connections } = await supabase
    .from('broker_connections')
    .select('user_id, account_id')
    .eq('broker', 'interactive_brokers')
    .eq('status', 'connected');
  
  const results = [];
  
  for (const connection of connections || []) {
    const result = await setupIBAutoSync(
      connection.user_id,
      connection.account_id,
      supabase
    );
    results.push({ ...connection, ...result });
  }
  
  return NextResponse.json({ results });
}
*/