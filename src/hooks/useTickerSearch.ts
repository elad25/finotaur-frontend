import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface TickerSymbol {
  symbol: string;
  name: string;
  asset_class: string;
  multiplier: number;
  exchange: string;
  popularity_rank: number;
}

export function useTickerSearch() {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<TickerSymbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTickers = useCallback(async (searchText: string) => {
    if (!searchText || searchText.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('search_ticker_symbols', {
        p_query: searchText,  // ✅ תוקן מ-search_text
        p_limit: 10           // ✅ תוקן מ-limit_count
      });

      if (rpcError) {
        throw rpcError;
      }

      setSuggestions(data || []);
    } catch (err: any) {
      console.error('Error searching tickers:', err);
      setError(err.message || 'Failed to search tickers');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchTickers(search);
    }, 200);

    return () => clearTimeout(timer);
  }, [search, searchTickers]);

  return {
    search,
    setSearch,
    suggestions,
    loading,
    error
  };
}