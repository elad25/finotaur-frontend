// src/utils/brokerParsers/index.ts
// Central hub for all broker CSV parsers

import { parseIBKR } from './ibkr';
import { parseNinjaTrader } from './ninjatrader';
import { parseTradovate } from './tradovate';
import { parseTradeStation } from './tradestation';
import { parseTastytrade } from './tastytrade';
import { parseSchwab } from './schwab';
import { parseFidelity } from './fidelity';
import { parseETrade } from './etrade';
import { parseRobinhood } from './robinhood';
import { parseWebull } from './webull';

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedTrade {
  // Required fields
  symbol: string;
  open_at: string;      // ISO date
  close_at: string;     // ISO date
  side: 'long' | 'short';
  qty: number;
  pnl: number;
  
  // Optional fields
  entry_price?: number;
  exit_price?: number;
  fees?: number;
  commissions?: number;
  notes?: string;
  strategy?: string;
  tags?: string[];
  
  // Advanced fields
  stop_loss?: number;
  take_profit?: number;
  rr?: number;          // R-multiple
  
  // Metadata
  broker_id?: string;
  broker_name?: string;
  order_id?: string;
}

export interface ParserResult {
  trades: ParsedTrade[];
  errors: string[];
  warnings: string[];
  stats: {
    total: number;
    success: number;
    failed: number;
  };
}

export type BrokerParser = (csvContent: string) => Promise<ParserResult>;

// ============================================================================
// BROKER PARSERS MAP
// ============================================================================

export const BROKER_PARSERS: Record<string, BrokerParser> = {
  'ibkr': parseIBKR,
  'ninjatrader': parseNinjaTrader,
  'tradovate': parseTradovate,
  'tradestation': parseTradeStation,
  'tastytrade': parseTastytrade,
  'schwab': parseSchwab,
  'fidelity': parseFidelity,
  'etrade': parseETrade,
  'robinhood': parseRobinhood,
  'webull': parseWebull,
};

// ============================================================================
// MAIN PARSER FUNCTION
// ============================================================================

export async function parseBrokerCSV(
  brokerId: string,
  csvContent: string
): Promise<ParserResult> {
  const parser = BROKER_PARSERS[brokerId];
  
  if (!parser) {
    return {
      trades: [],
      errors: [`No parser found for broker: ${brokerId}`],
      warnings: [],
      stats: {
        total: 0,
        success: 0,
        failed: 0,
      }
    };
  }
  
  try {
    return await parser(csvContent);
  } catch (error: any) {
    return {
      trades: [],
      errors: [`Parser failed: ${error.message}`],
      warnings: [],
      stats: {
        total: 0,
        success: 0,
        failed: 0,
      }
    };
  }
}

// ============================================================================
// GENERIC CSV PARSER (fallback)
// ============================================================================

export async function parseGenericCSV(csvContent: string): Promise<ParserResult> {
  // Generic parser for unknown brokers
  // Tries to detect common column names
  
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].toLowerCase().split(',');
  
  const trades: ParsedTrade[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    
    try {
      // Try to map common column names
      const trade: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        
        // Map common headers
        if (header.includes('symbol') || header.includes('ticker')) {
          trade.symbol = value;
        }
        if (header.includes('date') || header.includes('time')) {
          if (!trade.open_at) trade.open_at = value;
          else if (!trade.close_at) trade.close_at = value;
        }
        if (header.includes('side') || header.includes('action')) {
          trade.side = value.toLowerCase().includes('sell') ? 'short' : 'long';
        }
        if (header.includes('qty') || header.includes('quantity')) {
          trade.qty = parseFloat(value);
        }
        if (header.includes('pnl') || header.includes('profit')) {
          trade.pnl = parseFloat(value);
        }
        if (header.includes('price')) {
          if (!trade.entry_price) trade.entry_price = parseFloat(value);
          else if (!trade.exit_price) trade.exit_price = parseFloat(value);
        }
      });
      
      // Validate required fields
      if (trade.symbol && trade.qty && trade.pnl != null) {
        trades.push(trade);
      } else {
        warnings.push(`Line ${i + 1}: Missing required fields`);
      }
      
    } catch (error: any) {
      errors.push(`Line ${i + 1}: ${error.message}`);
    }
  }
  
  return {
    trades,
    errors,
    warnings,
    stats: {
      total: lines.length - 1,
      success: trades.length,
      failed: errors.length,
    }
  };
}