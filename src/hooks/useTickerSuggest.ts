
import { useEffect, useRef, useState } from 'react';

type Suggest = { symbol: string; name?: string };

export function useTickerSuggest(q: string) {
  const [suggestions, setSuggestions] = useState<Suggest[]>([]);
  const [isLoading, setLoading] = useState(false);
  const debRef = useRef<number | null>(null);

  useEffect(() => {
    const term = (q || '').trim();
    if (!term) { setSuggestions([]); return; }
    if (debRef.current) window.clearTimeout(debRef.current);
    setLoading(true);
    debRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/sec/tickers?q=${encodeURIComponent(term)}`);
        if (!res.ok) throw new Error('suggest failed');
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data.slice(0, 50) : (data?.tickers || []).slice(0, 50));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 160) as unknown as number;
    return () => { if (debRef.current) window.clearTimeout(debRef.current); };
  }, [q]);

  return { suggestions, isLoading };
}
