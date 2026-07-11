// ─── SymbolAutocomplete — type-ahead ticker picker (replaces native <select>) ─
// Trader types a ticker (e.g. "E" → suggests ES, ES=F-backed); arrow keys +
// Enter select; Enter on no-match commits a custom symbol. Matches the toolbar
// styling (gold #C9A646 accent on dark zinc) like ActiveStrategyDropdown.
// variant="toolbar" (default) = compact 32-char-wide input + w-64 dropdown.
// variant="field" = full-width input + full-width dropdown (for modal use).

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ALL_SYMBOLS,
  normalizeRawSymbol,
  normalizeSymbolAuto,
  type AssetClass,
  type SymbolEntry,
} from './symbolUniverse';

export function SymbolAutocomplete({
  symbol,
  assetClass,
  onSelect,
  variant = 'toolbar',
  filterToAssetClass = false,
  filterSymbols,
  placeholder = 'Search ticker…',
}: {
  symbol: string;
  assetClass?: AssetClass;
  /** `assetClass` is only populated when the trader picked a suggestion
   *  (not on a free-typed custom commit) — callers that don't need it can
   *  ignore the second argument. */
  onSelect: (symbol: string, assetClass?: AssetClass) => void;
  variant?: 'toolbar' | 'field';
  filterToAssetClass?: boolean;
  /** Optional extra predicate applied on top of `filterToAssetClass` — e.g.
   *  restricting futures suggestions to symbols with a populated data cache.
   *  In single-class mode (`filterToAssetClass=true`) it applies to the whole
   *  (already homogeneous) list, same as before. In cross-class mode
   *  (`filterToAssetClass=false`, the default) it applies ONLY to futures-class
   *  entries — other classes are never filtered by it. */
  filterSymbols?: (entry: SymbolEntry & { assetClass: AssetClass }) => boolean;
  /** Input placeholder — defaults to the original toolbar copy. */
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const universe = useMemo(() => {
    let list = filterToAssetClass && assetClass
      ? ALL_SYMBOLS.filter((u) => u.assetClass === assetClass)
      : ALL_SYMBOLS;
    if (filterSymbols) {
      list = filterToAssetClass
        ? list.filter(filterSymbols)
        // Cross-class mode: only restrict the futures slice (e.g. to cached
        // roots) — stocks/crypto/forex entries are never touched by it.
        : list.filter((u) => u.assetClass !== 'futures' || filterSymbols(u));
    }
    return list;
  }, [filterToAssetClass, assetClass, filterSymbols]);

  // Best-effort reverse lookup: show the human ticker for the active symbol;
  // fall back to the raw source symbol if it isn't in the universe.
  const currentTicker = useMemo(() => {
    const hit = universe.find((u) => u.symbol === symbol);
    return hit?.ticker ?? symbol;
  }, [universe, symbol]);

  const matches = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return universe.slice(0, 8);
    // Rank ticker prefix-matches first (e.g. "TS" → TSLA), then fall back to
    // ticker/name substring matches — so the closest match always sorts top.
    const prefixHits: typeof universe = [];
    const substringHits: typeof universe = [];
    for (const u of universe) {
      const ticker = u.ticker.toUpperCase();
      if (ticker.startsWith(q)) {
        prefixHits.push(u);
      } else if (ticker.includes(q) || u.label.toUpperCase().includes(q)) {
        substringHits.push(u);
      }
    }
    return [...prefixHits, ...substringHits].slice(0, 8);
  }, [universe, query]);

  // Reset the keyboard highlight whenever the visible match list changes.
  useEffect(() => { setHighlight(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const commit = (entry: SymbolEntry & { assetClass?: AssetClass }) => {
    onSelect(entry.symbol, entry.assetClass);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const commitRaw = () => {
    const next = assetClass
      ? normalizeRawSymbol(normalizeSymbolAuto(query), assetClass)
      : normalizeSymbolAuto(query);
    if (!next) return;
    onSelect(next);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={open ? query : currentTicker}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        onFocus={() => { setQuery(''); setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, Math.max(matches.length - 1, 0)));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (matches[highlight]) commit(matches[highlight]);
            else commitRaw();
          } else if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        className={
          variant === 'field'
            ? 'w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium uppercase text-white placeholder:normal-case placeholder:text-gray-600 focus:border-[#C9A646] focus:outline-none'
            : 'w-32 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm font-medium uppercase text-zinc-200 placeholder:normal-case placeholder:text-zinc-600 focus:border-[#C9A646] focus:outline-none'
        }
      />
      {open && (
        <div className={`absolute left-0 top-full ${variant === 'field' ? 'z-[10001]' : 'z-30'} mt-1 max-h-72 ${variant === 'field' ? 'w-full' : 'w-64'} overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950 shadow-2xl`}>
          {matches.length === 0 ? (
            <button
              type="button"
              // onMouseDown (not onClick) fires before the input blur that would
              // otherwise close the dropdown and drop the click.
              onMouseDown={(e) => { e.preventDefault(); commitRaw(); }}
              className="block w-full px-3 py-2 text-left text-xs text-zinc-400 hover:bg-zinc-900"
            >
              Use <span className="font-mono font-semibold text-[#C9A646]">{normalizeSymbolAuto(query) || '—'}</span> as a custom symbol
            </button>
          ) : (
            matches.map((m, i) => (
              <button
                key={m.symbol}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); commit(m); }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-baseline gap-3 px-3 py-1.5 text-left transition-colors ${
                  i === highlight ? 'bg-[#C9A646]/10' : 'hover:bg-zinc-900'
                }`}
              >
                <span className={`shrink-0 font-mono text-sm font-semibold ${m.symbol === symbol ? 'text-[#C9A646]' : 'text-zinc-200'}`}>
                  {m.ticker}
                </span>
                <span className="flex-1 truncate text-[11px] text-zinc-500">{m.label}</span>
                <span className="ml-auto shrink-0 rounded bg-zinc-800 px-1 text-[9px] uppercase tracking-wider text-zinc-500">{m.assetClass}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
