// lib/brokers/csv-import.ts
// Parse broker CSV statements and convert to unified format

import Papa from 'papaparse';
import dayjs from 'dayjs';
import { BrokerTrade, BrokerName } from './types';

interface CSVParseResult {
  trades: BrokerTrade[];
  errors: string[];
  skipped: number;
}

// Detect broker from CSV structure
export function detectBrokerType(headers: string[]): BrokerName | null {
  const headersLower = headers.map(h => h.toLowerCase().trim());
  
  // Interactive Brokers
  if (headersLower.includes('symbol') && headersLower.includes('datetime') && headersLower.includes('quantity')) {
    return 'interactive_brokers';
  }
  
  // TD Ameritrade
  if (headersLower.includes('date') && headersLower.includes('transaction type') && headersLower.includes('symbol')) {
    return 'td_ameritrade';
  }
  
  // Alpaca
  if (headersLower.includes('created_at') && headersLower.includes('side') && headersLower.includes('filled_avg_price')) {
    return 'alpaca';
  }
  
  return null;
}

// Parse Interactive Brokers CSV
function parseInteractiveBrokersTrade(row: any): BrokerTrade | null {
  try {
    // IB format: Symbol, DateTime, Quantity, T. Price, Commission, Basis, Realized P/L
    return {
      external_id: `ib_${row['DateTime']}_${row['Symbol']}_${row['Quantity']}`,
      broker: 'interactive_brokers',
      symbol: row['Symbol'] || row['symbol'],
      side: parseFloat(row['Quantity'] || row['quantity']) > 0 ? 'LONG' : 'SHORT',
      entry_price: parseFloat(row['T. Price'] || row['price'] || row['entry_price']),
      quantity: Math.abs(parseFloat(row['Quantity'] || row['quantity'])),
      fees: Math.abs(parseFloat(row['Commission'] || row['commission'] || 0)),
      open_at: dayjs(row['DateTime'] || row['date']).toISOString(),
      asset_type: 'stock',
    };
  } catch (error) {
    console.error('Failed to parse IB row:', error);
    return null;
  }
}

// Parse TD Ameritrade CSV
function parseTDAmeritradeTrade(row: any): BrokerTrade | null {
  try {
    const isBuy = row['Transaction Type']?.toLowerCase().includes('buy');
    const isSell = row['Transaction Type']?.toLowerCase().includes('sell');
    
    if (!isBuy && !isSell) return null;
    
    return {
      external_id: `td_${row['Date']}_${row['Symbol']}_${row['Quantity']}`,
      broker: 'td_ameritrade',
      symbol: row['Symbol'],
      side: isBuy ? 'LONG' : 'SHORT',
      entry_price: parseFloat(row['Price']),
      quantity: Math.abs(parseFloat(row['Quantity'])),
      fees: Math.abs(parseFloat(row['Commission'] || 0)),
      open_at: dayjs(row['Date']).toISOString(),
      asset_type: 'stock',
    };
  } catch (error) {
    console.error('Failed to parse TD row:', error);
    return null;
  }
}

// Parse Alpaca CSV
function parseAlpacaTrade(row: any): BrokerTrade | null {
  try {
    return {
      external_id: `alpaca_${row['id']}`,
      broker: 'alpaca',
      symbol: row['symbol'],
      side: row['side'].toUpperCase() === 'BUY' ? 'LONG' : 'SHORT',
      entry_price: parseFloat(row['filled_avg_price']),
      quantity: parseFloat(row['filled_qty']),
      fees: 0, // Alpaca is commission-free
      open_at: dayjs(row['created_at']).toISOString(),
      asset_type: row['asset_class'] || 'stock',
    };
  } catch (error) {
    console.error('Failed to parse Alpaca row:', error);
    return null;
  }
}

// Main CSV parser
export async function parseCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const trades: BrokerTrade[] = [];
        const errors: string[] = [];
        let skipped = 0;
        
        // Detect broker type
        const brokerType = detectBrokerType(results.meta.fields || []);
        
        if (!brokerType) {
          resolve({
            trades: [],
            errors: ['Could not detect broker type. Please ensure you uploaded a valid broker statement.'],
            skipped: results.data.length,
          });
          return;
        }
        
        // Parse each row based on broker type
        results.data.forEach((row: any, index: number) => {
          try {
            let trade: BrokerTrade | null = null;
            
            switch (brokerType) {
              case 'interactive_brokers':
                trade = parseInteractiveBrokersTrade(row);
                break;
              case 'td_ameritrade':
                trade = parseTDAmeritradeTrade(row);
                break;
              case 'alpaca':
                trade = parseAlpacaTrade(row);
                break;
            }
            
            if (trade) {
              trades.push(trade);
            } else {
              skipped++;
            }
          } catch (error: any) {
            errors.push(`Row ${index + 1}: ${error.message}`);
            skipped++;
          }
        });
        
        resolve({ trades, errors, skipped });
      },
      error: (error) => {
        resolve({
          trades: [],
          errors: [`Failed to parse CSV: ${error.message}`],
          skipped: 0,
        });
      },
    });
  });
}

// Match open and close trades
export function matchTradesOpenClose(trades: BrokerTrade[]): BrokerTrade[] {
  const matched: BrokerTrade[] = [];
  const openTrades = new Map<string, BrokerTrade>();
  
  // Sort by date
  const sorted = [...trades].sort((a, b) => 
    new Date(a.open_at).getTime() - new Date(b.open_at).getTime()
  );
  
  for (const trade of sorted) {
    const key = `${trade.symbol}_${trade.side}`;
    
    // Check if this is a closing trade
    const openTrade = openTrades.get(key);
    
    if (openTrade) {
      // This closes the open trade
      matched.push({
        ...openTrade,
        exit_price: trade.entry_price,
        close_at: trade.open_at,
        fees: openTrade.fees + trade.fees,
      });
      
      openTrades.delete(key);
    } else {
      // This is a new open trade
      openTrades.set(key, trade);
    }
  }
  
  // Add remaining open trades
  openTrades.forEach(trade => matched.push(trade));
  
  return matched;
}

// Example usage:
/*
import { parseCSV, matchTradesOpenClose } from '@/lib/brokers/csv-import';

const handleFileUpload = async (file: File) => {
  const result = await parseCSV(file);
  
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  }
  
  console.log(`Imported ${result.trades.length} trades`);
  console.log(`Skipped ${result.skipped} rows`);
  
  // Match open/close trades
  const matched = matchTradesOpenClose(result.trades);
  
  // Save to database
  await saveTradesToDatabase(matched);
};
*/