// src/components/portfolio/TickerCell.tsx
// ═══════════════════════════════════════════════════════════════
// Inline autocomplete input for a single ticker symbol.
// Mirrors TickerAutocomplete.tsx debounce + dropdown pattern but
// is designed for embedding inside a table cell (no fixed width).
// Dropdown rendered via portal to document.body (fixed positioning)
// so it escapes overflow-x-auto table containers.
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  // Position for the portal dropdown (fixed coords relative to viewport)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  // Stale-guard: track which query we last fired so out-of-order responses are discarded
  const latestQueryRef = useRef<string>('');
  // Suppress-guard: set to true after a suggestion is selected; one-shot skip of the next search
  const suppressSearchRef = useRef(false);

  // Compute portal position from input bounding rect
  function reposition() {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: r.bottom + 2,
      left: r.left,
      width: Math.max(r.width, 224),
    });
  }

  // Sync external value changes (e.g. after CSV import)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Add/remove scroll+resize listeners while dropdown is open to keep position fresh
  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounced fetch via Supabase RPC — 200 ms
  useEffect(() => {
    // One-shot suppression: skip the search triggered by programmatic value set after selection
    if (suppressSearchRef.current) {
      suppressSearchRef.current = false;
      return;
    }

    const q = query.trim();
    // Require at least 2 chars before querying — single-char queries return irrelevant fuzzy junk
    if (q.length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      latestQueryRef.current = q;

      const { data } = await supabase.rpc('search_ticker_symbols', {
        p_query: q,
        p_asset_class: null,
        p_limit: 20,
      });

      // Discard if a newer query was fired while this one was in flight
      if (latestQueryRef.current !== q) return;

      const raw = (data ?? []) as TickerSearchItem[];
      const qUp = q.toUpperCase();

      // Client-side relevance filter + sort so only actually matching items are shown.
      // Category 0: symbol starts with query (strongest match)
      // Category 1: symbol contains query but doesn't start with it
      // Category 2: company name contains query
      // Items that match none are dropped entirely.
      const scored = raw
        .map((item) => {
          const sym = item.symbol.toUpperCase();
          const name = item.name.toUpperCase();
          if (sym.startsWith(qUp)) return { item, rank: 0 };
          if (sym.includes(qUp)) return { item, rank: 1 };
          if (name.includes(qUp)) return { item, rank: 2 };
          return null;
        })
        .filter((x): x is { item: TickerSearchItem; rank: number } => x !== null)
        .sort((a, b) => a.rank - b.rank)
        .map((x) => x.item);

      setItems(scored);
      if (scored.length > 0) {
        reposition();
        setOpen(true);
      } else {
        setOpen(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Close dropdown on outside mousedown — must check both input and portal container
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideInput = inputRef.current?.contains(target) ?? false;
      const insidePortal = portalRef.current?.contains(target) ?? false;
      if (!insideInput && !insidePortal) {
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

  const dropdown = open && items.length > 0
    ? createPortal(
        <div
          ref={portalRef}
          style={dropdownStyle}
          className="z-[100] rounded-md border border-border-ds-subtle bg-surface-base shadow-xl overflow-hidden"
        >
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
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
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

      {dropdown}
    </div>
  );
}
