import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, createSearchParams, useLocation } from 'react-router-dom';
import { useTickerSuggest } from '@/hooks/useTickerSuggest';

type Props = {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};

export default function GlobalTickerSearch({ placeholder = 'Search tickers... (Ctrl+K)', className = '', autoFocus = false }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { suggestions, isLoading } = useTickerSuggest(open ? q : '');
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (!open) return;
      if (e.key === 'ArrowDown') { setHoverIdx(i => Math.min(i + 1, suggestions.length - 1)); }
      if (e.key === 'ArrowUp') { setHoverIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Escape') { setOpen(false); }
      if (e.key === 'Enter' && hoverIdx >= 0) {
        goSummary(suggestions[hoverIdx].symbol);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, suggestions, hoverIdx]);

  function goSummary(sym: string) {
    const search = createSearchParams({ symbol: sym.toUpperCase(), tab: 'overview' }).toString();
    navigate({ pathname: '/app/all-markets/summary', search });
    setOpen(false);
    setQ('');
  }

  function goChart(sym: string) {
    const search = createSearchParams({ symbol: sym.toUpperCase() }).toString();
    navigate({ pathname: '/app/all-markets/chart', search });
    setOpen(false);
    setQ('');
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); setHoverIdx(-1); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-[320px] rounded-xl bg-black/40 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-amber-400/50"
        autoFocus={autoFocus}
      />
      {open && q && (
        <div className="absolute z-50 mt-2 w-[420px] rounded-xl border border-white/10 bg-[#111]/95 shadow-2xl backdrop-blur">
          <ul className="max-h-[360px] overflow-auto py-2">
            {isLoading && <li className="px-3 py-2 text-xs text-zinc-400">Searching…</li>}
            {!isLoading && suggestions.length === 0 && (
              <li className="px-3 py-2 text-xs text-zinc-400">No matches</li>
            )}
            {suggestions.map((s, idx) => (
              <li
                key={s.symbol + idx}
                onMouseEnter={() => setHoverIdx(idx)}
                className={`group relative flex items-center justify-between px-3 py-2 text-sm ${idx===hoverIdx ? 'bg-white/5' : ''}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-medium text-white">{s.symbol}</span>
                  {s.name && <span className="truncate text-zinc-400">· {s.name}</span>}
                </div>

                {/* Action flyout (like TradingView): shows on hover */}
                <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 gap-2 group-hover:flex">
                  <button
                    onClick={() => goChart(s.symbol)}
                    className="pointer-events-auto rounded-md border border-white/12 bg-black/60 px-2 py-1 text-xs text-zinc-200 hover:bg-white/10"
                    title="Open Chart"
                  >
                    CHART
                  </button>
                  <button
                    onClick={() => goSummary(s.symbol)}
                    className="pointer-events-auto rounded-md border border-amber-400/30 bg-amber-400/15 px-2 py-1 text-xs text-amber-200 hover:bg-amber-400/25"
                    title="Open Summary"
                  >
                    SUMMARY
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
