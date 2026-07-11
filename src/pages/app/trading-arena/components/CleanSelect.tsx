// ─── CleanSelect — tiny custom dropdown (replaces native <select>) ─────────
// Dark zinc-900/zinc-950 + gold #C9A646 accent, matching the Arena toolbar's
// SymbolAutocomplete visual language. Click to open, click a row to select,
// outside-click + Escape to close. Generic over a string literal union so
// callers get type-safe values (e.g. 'GTC' | 'Day').

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CleanSelectOption<T extends string> {
  value: T;
  label: string;
}

export function CleanSelect<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: CleanSelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
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

  const current = options.find((o) => o.value === value);

  return (
    <div className={`relative ${className ?? ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-1 rounded-md border border-[#C9A646]/20 bg-black/40 px-2 py-1 text-[11px] font-semibold text-zinc-300 transition-colors hover:border-[#C9A646]/40 focus:border-[#C9A646]/40 focus:outline-none"
      >
        <span>{current?.label ?? '—'}</span>
        <ChevronDown
          className={`h-3 w-3 flex-shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 shadow-2xl">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`block w-full px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                o.value === value ? 'bg-[#C9A646]/10 text-[#C9A646]' : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
