// src/utils/brokerParsers/ibkr.ts
// Interactive Brokers CSV Parser

import type { ParserResult, ParsedTrade } from './index';
import dayjs from 'dayjs';

// ============================================================================
// IBKR CSV FORMAT
// ============================================================================
// Expected columns (Flex Query format):
// Symbol, DateTime, Quantity, T. Price, C. Price, Proceeds, Comm/Fee, Basis, Realized P/L, MTM P/L, Code

interface IBKRRow {
  symbol: string;
  dateTime: string;
  quantity: string;
  tradePrice: string;
  closePrice: string;
  proceeds: string;
  commFee: string;
  basis: string;
  realizedPL: string;
  mtmPL: string;
  code: string;
}

// ============================================================================
// PARSER
// ============================================================================

export async function parseIBKR(csvContent: string): Promise<ParserResult> {
  const lines = csvContent.trim().split('\n');
  const trades: ParsedTrade[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Skip header
  const dataLines = lines.slice(1);
  
  // Group trades by symbol and date (to match open/close)
  const tradeGroups = new Map<string, any[]>();
  
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line.trim()) continue;
    
    try {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      
      // Parse IBKR row
      const row: IBKRRow = {
        symbol: values[0],
        dateTime: values[1],
        quantity: values[2],
        tradePrice: values[3],
        closePrice: values[4],
        proceeds: values[5],
        commFee: values[6],
        basis: values[7],
        realizedPL: values[8],
        mtmPL: values[9],
        code: values[10],
      };
      
      // Validate
      if (!row.symbol || !row.dateTime) {
        warnings.push(`Line ${i + 2}: Missing symbol or date`);
        continue;
      }
      
      // Group by symbol
      const key = row.symbol;
      if (!tradeGroups.has(key)) {
        tradeGroups.set(key, []);
      }
      tradeGroups.get(key)!.push(row);
      
    } catch (error: any) {
      errors.push(`Line ${i + 2}: ${error.message}`);
    }
  }
  
  // Process groups into trades
  for (const [symbol, rows] of tradeGroups) {
    // Sort by date
    rows.sort((a, b) => 
      dayjs(a.dateTime).valueOf() - dayjs(b.dateTime).valueOf()
    );
    
    // Match buy/sell pairs
    let i = 0;
    while (i < rows.length) {
      const openRow = rows[i];
      const closeRow = rows[i + 1];
      
      if (!closeRow) {
        warnings.push(`${symbol}: Unmatched trade (no closing position)`);
        break;
      }
      
      const qty = Math.abs(parseFloat(openRow.quantity));
      const entryPrice = parseFloat(openRow.tradePrice);
      const exitPrice = parseFloat(closeRow.closePrice);
      const pnl = parseFloat(closeRow.realizedPL);
      const fees = Math.abs(parseFloat(openRow.commFee)) + Math.abs(parseFloat(closeRow.commFee));
      
      const trade: ParsedTrade = {
        symbol,
        open_at: dayjs(openRow.dateTime).toISOString(),
        close_at: dayjs(closeRow.dateTime).toISOString(),
        side: parseFloat(openRow.quantity) > 0 ? 'long' : 'short',
        qty,
        entry_price: entryPrice,
        exit_price: exitPrice,
        pnl,
        fees,
        commissions: fees,
        broker_id: openRow.code,
        broker_name: 'Interactive Brokers',
      };
      
      trades.push(trade);
      i += 2; // Skip to next pair
    }
  }
  
  return {
    trades,
    errors,
    warnings,
    stats: {
      total: dataLines.length,
      success: trades.length,
      failed: errors.length,
    }
  };
}