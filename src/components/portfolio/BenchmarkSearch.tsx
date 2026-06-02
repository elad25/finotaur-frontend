// src/components/portfolio/BenchmarkSearch.tsx
// ═══════════════════════════════════════════════════════════════
// Autocomplete search for the portfolio benchmark symbol.
// Resolves to a single selected symbol rendered as a chip.
// Same /api/search/tickers endpoint as TickerCell.
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TickerSearchItem {
  symbol: string;
  name: string;
  cik: string;
}

export interface BenchmarkSearchProps {
  value: string | null;
  onChange: (symbol: string | null) => void;
  disabled?: boolean;
}

export function BenchmarkSearch({ value, onChange, disabled = false }: BenchmarkSearchProps) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<TickerSearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced fetch — 200 ms
  useEffect(() => {
    if (disabled || !query || query.length < 1) {
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

    return () => clearTimeout(timer);
  }, [query, disabled]);

  // Close on outside click
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
    onChange(symbol.toUpperCase());
    setQuery('');
    setItems([]);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery('');
  }

  // If a symbol is already selected, show the chip
  if (value) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium',
            'bg-surface-1 text-ink-primary border border-border-ds-subtle',
            disabled && 'opacity-50',
          )}
        >
          <span className="text-gold-primary">{value}</span>
          {!disabled && (
            <button
              type="button"
              onClick={clear}
              className="ml-0.5 text-ink-tertiary hover:text-ink-primary transition-colors"
              aria-label={`Remove benchmark ${value}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value.toUpperCase())}
        onFocus={() => items.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        placeholder="Search..."
        className={cn(
          'w-full bg-surface-1 border border-border-ds-subtle rounded-md px-2.5 py-1.5',
          'text-sm text-ink-primary placeholder:text-ink-tertiary',
          'focus:outline-none focus:border-gold-primary focus:ring-1 focus:ring-gold-primary',
          'transition-colors',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
      />

      {open && items.length > 0 && (
        <div className="absolute z-50 mt-0.5 left-0 w-64 rounded-md border border-border-ds-subtle bg-surface-1 shadow-lg overflow-hidden">
          {items.map((item) => (
            <button
              key={item.symbol}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
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
