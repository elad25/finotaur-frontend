// src/components/portfolio/TickerCell.tsx
// ═══════════════════════════════════════════════════════════════
// Inline autocomplete input for a single ticker symbol.
// Mirrors TickerAutocomplete.tsx debounce + dropdown pattern but
// is designed for embedding inside a table cell (no fixed width).
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface TickerSearchItem {
  symbol: string;
  name: string;
  cik: string;
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
  const abortRef = useRef<AbortController | null>(null);

  // Sync external value changes (e.g. after CSV import)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced fetch — 200 ms
  useEffect(() => {
    if (!query || query.length < 1) {
      setItems([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;

      try {
        const res = await fetch(
          `/api/search/tickers?q=${encodeURIComponent(query)}&limit=12`,
          { signal: ctl.signal, credentials: 'include' },
        );
        if (!res.ok) return;
        const json = await res.json() as { items?: TickerSearchItem[] };
        setItems(json.items ?? []);
        setOpen(true);
      } catch {
        // AbortError or network error — ignore
      }
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
    setQuery(upper);
    onChange(upper);
    setOpen(false);
    setItems([]);
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
        <div className="absolute z-50 mt-0.5 left-0 w-56 rounded-md border border-border-ds-subtle bg-surface-1 shadow-lg overflow-hidden">
          {items.map((item) => (
            <button
              key={item.symbol}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur before click fires
                select(item.symbol);
              }}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
            >
              <span className="text-ink-primary font-medium shrink-0">{item.symbol}</span>
              <span className="text-ink-secondary truncate">{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
