// ================================================
// FINOTAUR IMPORT UTILITIES
// Supports: TradeZella, Tradervue, Edgewonk, TradesViz,
//           Kinfo, Excel/CSV generic, and more
// ================================================

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// ================================================
// TYPES
// ================================================

export interface FinotaurTrade {
  user_id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  open_at: string;
  close_at?: string;
  pnl?: number;
  commission?: number;
  notes?: string;
  strategy_id?: string;
  setup?: string;
  session?: 'ASIA' | 'LONDON' | 'NY_AM' | 'NY_PM' | 'OVERNIGHT';
  asset_type?: 'STOCK' | 'OPTION' | 'FUTURES' | 'FOREX' | 'CRYPTO';
  stop_loss?: number;
  take_profit?: number;
  risk_amount?: number;
  rr?: number;
  account_id?: string;
  tags?: string[];
  emotions?: string;
  mistakes?: string[];
  grade?: string;
  imported_from?: string;
  external_id?: string;
}

export interface ColumnMapping {
  symbol: string;
  side: string;
  quantity: string;
  entry_price: string;
  exit_price: string;
  open_at: string;
  close_at: string;
  pnl: string;
  commission: string;
  notes: string;
  setup: string;
  stop_loss: string;
  take_profit: string;
  asset_type: string;
  tags: string;
}

export interface ImportResult {
  success: boolean;
  trades: FinotaurTrade[];
  errors: ImportError[];
  warnings: string[];
  skipped: number;
  imported: number;
}

export interface ImportError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export type JournalSource = 
  | 'tradezella' 
  | 'tradervue' 
  | 'edgewonk' 
  | 'tradesviz' 
  | 'kinfo'
  | 'tradingview'
  | 'thinkorswim'
  | 'tradovate'
  | 'ninjatrader'
  | 'generic';

// ================================================
// JOURNAL-SPECIFIC COLUMN MAPPINGS
// ================================================

export const JOURNAL_MAPPINGS: Record<JournalSource, Partial<ColumnMapping>> = {
  tradezella: {
    symbol: 'Symbol',
    side: 'Side',
    quantity: 'Quantity',
    entry_price: 'Entry Price',
    exit_price: 'Exit Price',
    open_at: 'Open Date',
    close_at: 'Close Date',
    pnl: 'Net P&L',
    commission: 'Commission',
    notes: 'Notes',
    setup: 'Setup',
    tags: 'Tags',
  },
  tradervue: {
    symbol: 'Symbol',
    side: 'Long/Short',
    quantity: 'Shares',
    entry_price: 'Entry',
    exit_price: 'Exit',
    open_at: 'Date',
    close_at: 'Exit Date',
    pnl: 'Gross P/L',
    commission: 'Commissions',
    notes: 'Notes',
    tags: 'Tags',
  },
  edgewonk: {
    symbol: 'Instrument',
    side: 'Direction',
    quantity: 'Position Size',
    entry_price: 'Entry',
    exit_price: 'Exit',
    open_at: 'Entry Date',
    close_at: 'Exit Date',
    pnl: 'Net Result',
    notes: 'Comments',
    setup: 'Setup',
    stop_loss: 'Stop Loss',
    take_profit: 'Target',
  },
  tradesviz: {
    symbol: 'Symbol',
    side: 'Side',
    quantity: 'Qty',
    entry_price: 'Avg Entry',
    exit_price: 'Avg Exit',
    open_at: 'Open Time',
    close_at: 'Close Time',
    pnl: 'Realized P&L',
    commission: 'Fees',
    notes: 'Notes',
    asset_type: 'Asset Class',
  },
  kinfo: {
    symbol: 'Symbol',
    side: 'Action',
    quantity: 'Quantity',
    entry_price: 'Price',
    open_at: 'Date/Time',
    pnl: 'Realized Gain',
    commission: 'Commission',
    notes: 'Description',
  },
  tradingview: {
    symbol: 'Symbol',
    side: 'Type',
    quantity: 'Qty',
    entry_price: 'Price',
    open_at: 'Date',
    pnl: 'Profit',
    notes: 'Comment',
  },
  thinkorswim: {
    symbol: 'Symbol',
    side: 'Side',
    quantity: 'Qty',
    entry_price: 'Price',
    open_at: 'Exec Time',
    commission: 'Commissions',
    notes: 'Description',
  },
  tradovate: {
    symbol: 'Contract',
    side: 'B/S',
    quantity: 'Qty',
    entry_price: 'Fill Price',
    open_at: 'Fill Time',
    pnl: 'P&L',
    commission: 'Fee',
  },
  ninjatrader: {
    symbol: 'Instrument',
    side: 'Market pos.',
    quantity: 'Quantity',
    entry_price: 'Entry price',
    exit_price: 'Exit price',
    open_at: 'Entry time',
    close_at: 'Exit time',
    pnl: 'Profit',
    commission: 'Commission',
  },
  generic: {
    symbol: 'symbol',
    side: 'side',
    quantity: 'quantity',
    entry_price: 'entry_price',
    exit_price: 'exit_price',
    open_at: 'open_at',
    close_at: 'close_at',
    pnl: 'pnl',
    commission: 'commission',
    notes: 'notes',
  },
};

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Parse CSV string to array of objects
 */
export function parseCSV(csvString: string): Record<string, string>[] {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Detect delimiter (comma, semicolon, or tab)
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : 
                    firstLine.includes(';') ? ';' : ',';
  
  // Parse headers
  const headers = parseCSVLine(lines[0], delimiter);
  
  // Parse rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Auto-detect journal source from headers
 */
export function detectJournalSource(headers: string[]): JournalSource {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));
  
  // TradeZella specific headers
  if (headerSet.has('net p&l') && headerSet.has('setup')) {
    return 'tradezella';
  }
  
  // Tradervue specific
  if (headerSet.has('gross p/l') && headerSet.has('shares')) {
    return 'tradervue';
  }
  
  // Edgewonk specific
  if (headerSet.has('instrument') && headerSet.has('net result')) {
    return 'edgewonk';
  }
  
  // TradesViz specific
  if (headerSet.has('avg entry') && headerSet.has('realized p&l')) {
    return 'tradesviz';
  }
  
  // Kinfo specific
  if (headerSet.has('realized gain') && headerSet.has('action')) {
    return 'kinfo';
  }
  
  // Tradovate specific
  if (headerSet.has('contract') && headerSet.has('b/s')) {
    return 'tradovate';
  }
  
  // NinjaTrader specific
  if (headerSet.has('market pos.') && headerSet.has('entry price')) {
    return 'ninjatrader';
  }
  
  // ThinkorSwim specific
  if (headerSet.has('exec time') && headerSet.has('commissions')) {
    return 'thinkorswim';
  }
  
  return 'generic';
}

/**
 * Find the best matching column for a field
 */
export function findMatchingColumn(
  headers: string[], 
  fieldAliases: string[]
): string | null {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  for (const alias of fieldAliases) {
    const normalizedAlias = alias.toLowerCase().trim();
    
    // Exact match
    const exactIndex = normalizedHeaders.indexOf(normalizedAlias);
    if (exactIndex !== -1) {
      return headers[exactIndex];
    }
    
    // Partial match
    const partialIndex = normalizedHeaders.findIndex(h => 
      h.includes(normalizedAlias) || normalizedAlias.includes(h)
    );
    if (partialIndex !== -1) {
      return headers[partialIndex];
    }
  }
  
  return null;
}

/**
 * Auto-map columns based on detected source
 */
export function autoMapColumns(
  headers: string[], 
  source: JournalSource
): ColumnMapping {
  const mapping = JOURNAL_MAPPINGS[source];
  
  // ✅ FIXED: Initialize with empty strings for all fields
  const result: ColumnMapping = {
    symbol: '',
    side: '',
    quantity: '',
    entry_price: '',
    exit_price: '',
    open_at: '',
    close_at: '',
    pnl: '',
    commission: '',
    notes: '',
    setup: '',
    stop_loss: '',
    take_profit: '',
    asset_type: '',
    tags: '',
  };
  
  // Field aliases for intelligent matching
  const fieldAliases: Record<keyof ColumnMapping, string[]> = {
    symbol: ['symbol', 'ticker', 'instrument', 'contract', 'underlying'],
    side: ['side', 'direction', 'type', 'action', 'long/short', 'b/s', 'buy/sell', 'market pos'],
    quantity: ['quantity', 'qty', 'shares', 'contracts', 'position size', 'size', 'volume'],
    entry_price: ['entry price', 'entry', 'avg entry', 'fill price', 'open price', 'price'],
    exit_price: ['exit price', 'exit', 'avg exit', 'close price'],
    open_at: ['open date', 'entry date', 'date', 'entry time', 'open time', 'exec time', 'fill time', 'datetime'],
    close_at: ['close date', 'exit date', 'close time', 'exit time'],
    pnl: ['pnl', 'p&l', 'profit', 'net p&l', 'gross p/l', 'realized p&l', 'net result', 'realized gain'],
    commission: ['commission', 'commissions', 'fee', 'fees', 'costs'],
    notes: ['notes', 'comment', 'comments', 'description', 'remarks'],
    setup: ['setup', 'strategy', 'pattern'],
    stop_loss: ['stop loss', 'stop', 'sl'],
    take_profit: ['take profit', 'target', 'tp'],
    asset_type: ['asset type', 'asset class', 'instrument type', 'type'],
    tags: ['tags', 'labels', 'categories'],
  };
  
  // First, try to use journal-specific mapping
  for (const [field, column] of Object.entries(mapping)) {
    if (column && headers.some(h => h.toLowerCase() === column.toLowerCase())) {
      result[field as keyof ColumnMapping] = column;
    }
  }
  
  // Then, fill in missing fields with intelligent matching
  for (const [field, aliases] of Object.entries(fieldAliases)) {
    if (!result[field as keyof ColumnMapping]) {
      const match = findMatchingColumn(headers, aliases);
      if (match) {
        result[field as keyof ColumnMapping] = match;
      }
    }
  }
  
  return result;
}

/**
 * Parse side/direction value
 */
function parseSide(value: string): 'LONG' | 'SHORT' {
  const normalized = value.toLowerCase().trim();
  
  if (['long', 'buy', 'b', 'bullish', '1', 'true'].includes(normalized)) {
    return 'LONG';
  }
  
  return 'SHORT';
}

/**
 * Parse date/time value with multiple format support
 */
function parseDateTime(
  value: string, 
  userTimezone: string = 'UTC'
): string | null {
  if (!value) return null;
  
  // Try various date formats
  const formats = [
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DDTHH:mm:ss',
    'YYYY-MM-DDTHH:mm:ssZ',
    'MM/DD/YYYY HH:mm:ss',
    'MM/DD/YYYY HH:mm',
    'DD/MM/YYYY HH:mm:ss',
    'DD/MM/YYYY HH:mm',
    'YYYY-MM-DD',
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'M/D/YYYY H:mm:ss',
    'M/D/YYYY',
    'YYYY/MM/DD HH:mm:ss',
    'YYYY/MM/DD',
  ];
  
  for (const format of formats) {
    const parsed = dayjs(value, format, true);
    if (parsed.isValid()) {
      // Assume the time is in user's timezone and convert to UTC
      return dayjs.tz(value, format, userTimezone).utc().toISOString();
    }
  }
  
  // Try native Date parsing as fallback
  const nativeDate = new Date(value);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate.toISOString();
  }
  
  return null;
}

/**
 * Parse numeric value (handles currency symbols, commas, etc.)
 */
function parseNumber(value: string): number | null {
  if (!value) return null;
  
  // Remove currency symbols and commas
  const cleaned = value
    .replace(/[$€£¥₪,]/g, '')
    .replace(/\s/g, '')
    .replace(/[()]/g, (match) => match === '(' ? '-' : '');
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse asset type
 */
function parseAssetType(value: string): FinotaurTrade['asset_type'] {
  const normalized = value.toLowerCase().trim();
  
  if (['stock', 'stocks', 'equity', 'equities'].some(t => normalized.includes(t))) {
    return 'STOCK';
  }
  if (['option', 'options'].some(t => normalized.includes(t))) {
    return 'OPTION';
  }
  if (['future', 'futures', 'es', 'nq', 'cl', 'gc'].some(t => normalized.includes(t))) {
    return 'FUTURES';
  }
  if (['forex', 'fx', 'currency'].some(t => normalized.includes(t))) {
    return 'FOREX';
  }
  if (['crypto', 'btc', 'eth', 'bitcoin'].some(t => normalized.includes(t))) {
    return 'CRYPTO';
  }
  
  return 'STOCK';
}

/**
 * Detect trading session from timestamp
 */
function detectSession(dateTime: string): FinotaurTrade['session'] {
  const hour = dayjs(dateTime).utc().hour();
  
  // Asia: 23:00-08:00 UTC (Tokyo, Sydney, Singapore)
  if (hour >= 23 || hour < 8) {
    return 'ASIA';
  }
  
  // London: 08:00-13:00 UTC
  if (hour >= 8 && hour < 13) {
    return 'LONDON';
  }
  
  // NY AM: 13:00-17:00 UTC (9:30 AM - 12:00 PM ET)
  if (hour >= 13 && hour < 17) {
    return 'NY_AM';
  }
  
  // NY PM: 17:00-21:00 UTC (12:00 PM - 4:00 PM ET)
  if (hour >= 17 && hour < 21) {
    return 'NY_PM';
  }
  
  // Overnight: 21:00-23:00 UTC
  return 'OVERNIGHT';
}

/**
 * Parse tags from various formats
 */
function parseTags(value: string): string[] {
  if (!value) return [];
  
  // Handle comma-separated, semicolon-separated, or space-separated
  const separators = /[,;|]+/;
  return value.split(separators)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

// ================================================
// MAIN IMPORT FUNCTION
// ================================================

export async function importTrades(
  csvData: string,
  userId: string,
  mapping: ColumnMapping,
  source: JournalSource,
  userTimezone: string = 'UTC'
): Promise<ImportResult> {
  const rows = parseCSV(csvData);
  const trades: FinotaurTrade[] = [];
  const errors: ImportError[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for header row and 1-based indexing
    
    try {
      // Required fields
      const symbol = row[mapping.symbol]?.trim().toUpperCase();
      const sideRaw = row[mapping.side]?.trim();
      const quantityRaw = row[mapping.quantity];
      const entryPriceRaw = row[mapping.entry_price];
      const openAtRaw = row[mapping.open_at];
      
      // Validate required fields
      if (!symbol) {
        errors.push({ row: rowNum, field: 'symbol', value: '', message: 'Missing symbol' });
        skipped++;
        continue;
      }
      
      if (!openAtRaw) {
        errors.push({ row: rowNum, field: 'open_at', value: '', message: 'Missing open date' });
        skipped++;
        continue;
      }
      
      // Parse required fields
      const side = sideRaw ? parseSide(sideRaw) : 'LONG';
      const quantity = parseNumber(quantityRaw) ?? 1;
      const entryPrice = parseNumber(entryPriceRaw) ?? 0;
      const openAt = parseDateTime(openAtRaw, userTimezone);
      
      if (!openAt) {
        errors.push({ 
          row: rowNum, 
          field: 'open_at', 
          value: openAtRaw, 
          message: `Could not parse date: ${openAtRaw}` 
        });
        skipped++;
        continue;
      }
      
      // Parse optional fields
      const exitPriceRaw = row[mapping.exit_price];
      const closeAtRaw = row[mapping.close_at];
      const pnlRaw = row[mapping.pnl];
      const commissionRaw = row[mapping.commission];
      const notes = row[mapping.notes]?.trim();
      const setup = row[mapping.setup]?.trim();
      const stopLossRaw = row[mapping.stop_loss];
      const takeProfitRaw = row[mapping.take_profit];
      const assetTypeRaw = row[mapping.asset_type];
      const tagsRaw = row[mapping.tags];
      
      const exitPrice = parseNumber(exitPriceRaw);
      const closeAt = closeAtRaw ? parseDateTime(closeAtRaw, userTimezone) : null;
      const pnl = parseNumber(pnlRaw);
      const commission = parseNumber(commissionRaw);
      const stopLoss = parseNumber(stopLossRaw);
      const takeProfit = parseNumber(takeProfitRaw);
      const assetType = assetTypeRaw ? parseAssetType(assetTypeRaw) : 'STOCK';
      const tags = tagsRaw ? parseTags(tagsRaw) : [];
      
      // Calculate RR if stop loss and take profit are available
      let rr: number | undefined;
      if (stopLoss && takeProfit && entryPrice) {
        const risk = Math.abs(entryPrice - stopLoss);
        const reward = Math.abs(takeProfit - entryPrice);
        if (risk > 0) {
          rr = reward / risk;
        }
      }
      
      // Calculate PnL if not provided but we have entry/exit prices
      let calculatedPnl = pnl;
      if (calculatedPnl == null && exitPrice != null && entryPrice) {
        const priceDiff = side === 'LONG' 
          ? exitPrice - entryPrice 
          : entryPrice - exitPrice;
        calculatedPnl = priceDiff * quantity;
        if (commission) {
          calculatedPnl -= commission;
        }
      }
      
      // Build trade object
      const trade: FinotaurTrade = {
        user_id: userId,
        symbol,
        side,
        quantity,
        entry_price: entryPrice,
        open_at: openAt,
        session: detectSession(openAt),
        imported_from: source,
        external_id: `${source}_${rowNum}_${Date.now()}`,
      };
      
      // Add optional fields if present
      if (exitPrice != null) trade.exit_price = exitPrice;
      if (closeAt) trade.close_at = closeAt;
      if (calculatedPnl != null) trade.pnl = calculatedPnl;
      if (commission != null) trade.commission = commission;
      if (notes) trade.notes = notes;
      if (setup) trade.setup = setup;
      if (stopLoss != null) trade.stop_loss = stopLoss;
      if (takeProfit != null) trade.take_profit = takeProfit;
      if (assetType) trade.asset_type = assetType;
      if (rr != null) trade.rr = rr;
      if (tags.length > 0) trade.tags = tags;
      
      trades.push(trade);
      
    } catch (error) {
      errors.push({ 
        row: rowNum, 
        field: 'general', 
        value: '', 
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
      skipped++;
    }
  }
  
  // Add warnings for potential issues
  if (trades.length === 0 && rows.length > 0) {
    warnings.push('No trades could be imported. Please check your column mapping.');
  }
  
  const tradesWithoutPnL = trades.filter(t => t.pnl == null).length;
  if (tradesWithoutPnL > 0) {
    warnings.push(`${tradesWithoutPnL} trades are missing P&L data. You may need to add exit prices later.`);
  }
  
  return {
    success: trades.length > 0,
    trades,
    errors,
    warnings,
    skipped,
    imported: trades.length,
  };
}

// ================================================
// EXPORT FOR TESTING
// ================================================

export const testHelpers = {
  parseCSV,
  parseCSVLine,
  parseSide,
  parseDateTime,
  parseNumber,
  parseAssetType,
  detectSession,
  parseTags,
};