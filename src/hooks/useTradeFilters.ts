import { useMemo, useState, useCallback } from 'react';
import { useDebouncedValue } from './useDebouncedValue'; // ✅ עכשיו זה קיים!
import { normalizeSymbol } from '@/utils/normalizeSymbol';

interface Trade {
  symbol: string;
  strategy_name?: string;
  setup?: string;
  notes?: string;
  _computed: {
    outcome: string;
  };
}

/**
 * 🚀 OPTIMIZED: חיפוש וסינון עם debounce
 * מונע re-render מיותר בכל הקשה
 */
export function useTradeFilters<T extends Trade>(trades: T[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  
  // 🔥 debounce על החיפוש - חוכה 300ms אחרי ההקשה האחרונה
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const filteredTrades = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    
    return trades.filter(trade => {
      // סינון חיפוש — מאפשר גם חיפוש לפי root symbol (NQ ימצא MNQM6, ES ימצא ESZ5)
      const symbolLower = trade.symbol?.toLowerCase() || '';
      const rootLower = normalizeSymbol(trade.symbol).toLowerCase();
      const matchesSearch =
        symbolLower.includes(query) ||
        rootLower.includes(query) ||
        (trade.strategy_name && trade.strategy_name.toLowerCase().includes(query)) ||
        trade.setup?.toLowerCase().includes(query) ||
        trade.notes?.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
      
      // סינון סטטוס
      if (filterType === "all") return true;
      
      const outcome = trade._computed.outcome;
      
      switch (filterType) {
        case "wins": return outcome === "WIN";
        case "losses": return outcome === "LOSS";
        case "open": return outcome === "OPEN";
        default: return true;
      }
    });
  }, [trades, debouncedSearch, filterType]);

  return {
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filteredTrades,
  };
}