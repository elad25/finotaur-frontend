import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Item = { symbol: string; name: string; cik: string };

export default function TickerAutocomplete({ initialSymbol, onSelect }: { initialSymbol?: string; onSelect?: (s: string)=>void }) {
  const [q, setQ] = useState(initialSymbol || '');
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!q || q.length < 1) { setItems([]); return; }
    const ctl = new AbortController();
    const run = async () => {
      const r = await fetch(`/api/search/tickers?q=${encodeURIComponent(q)}&limit=12`, { signal: ctl.signal, credentials: 'include' });
      if (!r.ok) return;
      const j = await r.json();
      setItems(j.items || []);
      setOpen(true);
    };
    run().catch(()=>{});
    return () => ctl.abort();
  }, [q]);

  function choose(symbol: string) {
    onSelect?.(symbol);
    setOpen(false);
    setHovered(null);
  }

  function go(path: string, symbol: string) {
    nav(`${path}?symbol=${encodeURIComponent(symbol)}`);
    setOpen(false);
  }

  return (
    <div className="relative w-[340px]">
      <input
        value={q}
        onChange={(e)=> setQ(e.target.value.toUpperCase())}
        onFocus={()=> setOpen(items.length>0)}
        placeholder="Search tickers…"
        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-500"
      />
      {open && items.length > 0 && (
        <div ref={listRef} className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-800 bg-[#0F1012] shadow-lg overflow-hidden">
          {items.map((it, idx) => (
            <div
              key={it.symbol}
              onMouseEnter={()=> setHovered(idx)}
              onMouseLeave={()=> setHovered(h=> h===idx ? null : h)}
              className="px-3 py-2 text-sm flex items-center justify-between hover:bg-zinc-800/40 cursor-pointer"
              onClick={()=> choose(it.symbol)}
            >
              <div className="truncate">
                <span className="text-white font-medium">{it.symbol}</span>
                <span className="text-zinc-400 ml-2">{it.name}</span>
              </div>
              {hovered===idx && (
                <div className="flex gap-2">
                  <button
                    onClick={(e)=> { e.stopPropagation(); go('/app/stocks/overview', it.symbol); }}
                    className="px-2 py-1 rounded-md border border-zinc-700 text-[11px] hover:bg-zinc-800 text-zinc-200"
                  >
                    CHART
                  </button>
                  <button
                    onClick={(e)=> { e.stopPropagation(); go('/app/stocks/summary', it.symbol); }}
                    className="px-2 py-1 rounded-md border border-yellow-700/50 hover:bg-yellow-600/20 text-[11px] text-yellow-400"
                  >
                    SUMMARY
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
