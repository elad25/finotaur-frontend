// ─── AccountSelector — real-account picker for the Arena header ───────────
// Flat list of the user's accounts (via usePortfolios), matching the
// toolbar's clean dark/gold dropdown language (see SymbolAutocomplete).
// No groups, no Reset/Settings actions, no checkboxes — just selectable
// account rows. Click to open, click a row to select, outside-click +
// Escape to close.
//
// NOTE: selecting an account here is CONTEXT/display only for now — it is
// NOT wired into the paper-trading engine or order routing. The Arena stays
// 100% paper; real execution is out of scope for this control.

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePortfolios, type Portfolio } from '@/hooks/usePortfolios';

function accountTag(p: Pick<Portfolio, 'environment' | 'source'>): string {
  if (p.environment === 'live') return 'Live';
  if (p.environment === 'demo') return 'Demo';
  if (p.source === 'broker') return 'Broker';
  return 'Manual';
}

export function AccountSelector({
  value,
  onChange,
  light = false,
}: {
  value: string | null;
  onChange: (id: string) => void;
  /**
   * Light-gray pill + white dropdown when the Arena chrome is light-themed
   * (chart Light Mode). Default false — dark styling identical to today.
   */
  light?: boolean;
}) {
  const { portfolios, isLoading } = usePortfolios();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const hasAccounts = portfolios.length > 0;
  const selected = portfolios.find((p) => p.id === value) ?? portfolios[0] ?? null;

  const triggerLabel = isLoading
    ? 'Loading…'
    : selected
      ? selected.name
      : 'No accounts';

  return (
    <div className="relative flex-shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          if (isLoading) return;
          setOpen((o) => !o);
        }}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
          light ? 'bg-[#eef1f5]' : 'bg-zinc-900'
        } ${
          open ? 'border-[#C9A646]' : light ? 'border-[#dfe3ea]' : 'border-zinc-800'
        } ${
          isLoading
            ? light ? 'cursor-default text-[#8a8d98]' : 'cursor-default text-zinc-600'
            : hasAccounts
              ? light ? 'text-[#131722] hover:border-[#c9cdd6]' : 'text-zinc-200 hover:border-zinc-700'
              : light ? 'text-[#8a8d98] hover:border-[#c9cdd6]' : 'text-zinc-600 hover:border-zinc-700'
        }`}
      >
        <span className="max-w-[140px] truncate">{triggerLabel}</span>
        {selected && !isLoading && (
          <span className={`rounded px-1 text-[9px] uppercase tracking-wider ${light ? 'bg-[#e9ecf1] text-[#6a6d78]' : 'bg-zinc-800 text-zinc-500'}`}>
            {accountTag(selected)}
          </span>
        )}
        <ChevronDown
          className={`h-3 w-3 flex-shrink-0 transition-transform ${light ? 'text-[#8a8d98]' : 'text-zinc-500'} ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className={`absolute right-0 top-full z-30 mt-1 max-h-72 w-64 overflow-y-auto rounded-md border shadow-2xl ${light ? 'border-[#e0e3eb] bg-white' : 'border-zinc-800 bg-zinc-950'}`}>
          {!hasAccounts ? (
            <p className={`px-3 py-2 text-[11px] ${light ? 'text-[#6a6d78]' : 'text-zinc-500'}`}>
              Connect an account in the Journal.
            </p>
          ) : (
            portfolios.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setOpen(false); }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left transition-colors ${
                  p.id === selected?.id
                    ? 'bg-[#C9A646]/10 text-[#C9A646]'
                    : light
                      ? 'text-[#131722] hover:bg-[rgba(0,0,0,0.04)]'
                      : 'text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <span className="truncate text-sm font-medium">{p.name}</span>
                <span className={`rounded px-1 text-[9px] uppercase tracking-wider ${light ? 'bg-[#e9ecf1] text-[#6a6d78]' : 'bg-zinc-800 text-zinc-500'}`}>
                  {accountTag(p)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
