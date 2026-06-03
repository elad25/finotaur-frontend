/**
 * Pure trade filter — NO side effects.
 *
 * All date comparisons use ISO string prefix (YYYY-MM-DD slice of open_at).
 * Array filters use inclusive OR within the field, AND across fields.
 */

import type { Trade } from '@/hooks/useTradesData';

export type TradeFilter = {
  dateFrom?: string;       // YYYY-MM-DD inclusive
  dateTo?: string;         // YYYY-MM-DD inclusive
  symbols?: string[];
  sides?: ('LONG' | 'SHORT')[];
  sessions?: string[];
  tags?: string[];
  strategyIds?: string[];
  outcomes?: string[];
};

export function filterTrades(trades: Trade[], filter: TradeFilter): Trade[] {
  return trades.filter(trade => {
    // Date range — compare against open_at date portion
    const tradeDate = trade.open_at.slice(0, 10);
    if (filter.dateFrom && tradeDate < filter.dateFrom) return false;
    if (filter.dateTo && tradeDate > filter.dateTo) return false;

    // Symbol (case-insensitive)
    if (filter.symbols && filter.symbols.length > 0) {
      const sym = (trade.symbol ?? '').toUpperCase();
      if (!filter.symbols.some(s => s.toUpperCase() === sym)) return false;
    }

    // Side
    if (filter.sides && filter.sides.length > 0) {
      if (!filter.sides.includes(trade.side)) return false;
    }

    // Session (case-insensitive)
    if (filter.sessions && filter.sessions.length > 0) {
      const sess = (trade.session ?? '').toLowerCase();
      if (!filter.sessions.some(s => s.toLowerCase() === sess)) return false;
    }

    // Tags — trade must have at least one matching tag
    if (filter.tags && filter.tags.length > 0) {
      const tradeTags: string[] = (trade as Trade & { tags?: string[] }).tags ?? [];
      const hasMatch = filter.tags.some(ft => tradeTags.includes(ft));
      if (!hasMatch) return false;
    }

    // Strategy IDs
    if (filter.strategyIds && filter.strategyIds.length > 0) {
      if (!trade.strategy_id || !filter.strategyIds.includes(trade.strategy_id)) return false;
    }

    // Outcomes
    if (filter.outcomes && filter.outcomes.length > 0) {
      if (!trade.outcome || !filter.outcomes.includes(trade.outcome)) return false;
    }

    return true;
  });
}
