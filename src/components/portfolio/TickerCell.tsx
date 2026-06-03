// src/components/portfolio/TickerCell.tsx
// ═══════════════════════════════════════════════════════════════
// Inline autocomplete input for a single ticker symbol.
// Mirrors TickerAutocomplete.tsx debounce + dropdown pattern but
// is designed for embedding inside a table cell (no fixed width).
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface TickerSearchItem {
  symbol: string;
  name: string;
}

export interface TickerCellProps {
  value: string;
  onChange: (ticker: string) => void;
  placeholder?: string;
}

export function TickerCell({ value, onChange, placeholder = 'Ticker' }: TickerCellProps) {
  const [query, setQuery] = useState(value);
  const [items, setItems] = useState<TickerSearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Stale-guard: track which query we last fired so out-of-order responses are discarded
  const latestQueryRef = useRef<string>('');
  // Suppress-guard: set to true after a suggestion is selected; one-shot skip of the next search
  const suppressSearchRef = useRef(false);

  // Sync external value changes (e.g. after CSV import)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced fetch via Supabase RPC — 200 ms
  useEffect(() => {
    // One-shot suppression: skip the search triggered by programmatic value set after selection
    if (suppressSearchRef.current) {
      suppressSearchRef.current = false;
      return;
    }

    const q = query.trim();
    if (!q || q.length < 1) {
      setItems([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      latestQueryRef.current = q;

      const { data } = await supabase.rpc('search_ticker_symbols', {
        p_query: q,
        p_asset_class: null,
        p_limit: 10,
      });

      // Discard if a newer query was fired while this one was in flight
      if (latestQueryRef.current !== q) return;

      const results = (data ?? []) as TickerSearchItem[];
      setItems(results);
      if (results.length > 0) setOpen(true);
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function select(symbol: string) {
    const upper = symbol.toUpperCase();
    // Suppress the search that would fire from the query state update
    suppressSearchRef.current = true;
    setQuery(upper);
    onChange(upper);
    setItems([]);
    setOpen(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.toUpperCase();
    setQuery(raw);
    // If user clears to empty, propagate the empty string immediately
    if (!raw) onChange('');
  }

  function handleBlur() {
    // On blur, commit whatever is typed (or empty)
    onChange(query.trim().toUpperCase());
    // Delay close so clicks on dropdown items register first
    setTimeout(() => setOpen(false), 150);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => items.length > 0 && setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(
          'w-full bg-surface-1 border border-border-ds-subtle rounded-md px-2 py-1.5',
          'text-sm text-ink-primary placeholder:text-ink-tertiary',
          'focus:outline-none focus:border-gold-primary focus:ring-1 focus:ring-gold-primary',
          'transition-colors',
        )}
      />

      {open && items.length > 0 && (
        <div className="absolute z-[70] mt-0.5 left-0 w-56 rounded-md border border-border-ds-subtle bg-surface-base shadow-xl overflow-hidden">
          {items.map((item) => (
            <button
              key={item.symbol}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur before click fires
                select(item.symbol);
              }}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/10 transition-colors"
            >
              <span className="text-ink-primary font-bold shrink-0">{item.symbol}</span>
              <span className="text-ink-secondary truncate">{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
