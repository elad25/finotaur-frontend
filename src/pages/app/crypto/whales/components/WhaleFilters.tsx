// src/pages/app/crypto/whales/components/WhaleFilters.tsx
// Filter row: min USD input, symbol dropdown, buy/sell/all toggle.

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface WhaleFiltersProps {
  minUsd: number;
  symbol: string;
  side: 'all' | 'buy' | 'sell';
  onChange: (next: { minUsd?: number; symbol?: string; side?: 'all' | 'buy' | 'sell' }) => void;
  symbols: string[];
}

const SIDES: { id: 'all' | 'buy' | 'sell'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'buy', label: 'Buy' },
  { id: 'sell', label: 'Sell' },
];

export const WhaleFilters = memo(function WhaleFilters({
  minUsd,
  symbol,
  side,
  onChange,
  symbols,
}: WhaleFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Min USD */}
      <div>
        <label className="text-[10px] text-white/30 uppercase block mb-1">Min Size (USD)</label>
        <input
          type="number"
          value={minUsd || ''}
          min={0}
          placeholder="0"
          onChange={e => {
            const v = e.target.value === '' ? 0 : Number(e.target.value);
            onChange({ minUsd: v });
          }}
          className="w-28 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/30 font-mono"
        />
      </div>

      {/* Symbol */}
      {symbols.length > 0 && (
        <div>
          <label className="text-[10px] text-white/30 uppercase block mb-1">Symbol</label>
          <select
            value={symbol}
            onChange={e => onChange({ symbol: e.target.value })}
            className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/30"
          >
            <option value="all">All</option>
            {symbols.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Side toggle */}
      <div>
        <label className="text-[10px] text-white/30 uppercase block mb-1">Side</label>
        <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
          {SIDES.map(s => (
            <button
              key={s.id}
              onClick={() => onChange({ side: s.id })}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-all duration-150',
                side === s.id
                  ? s.id === 'buy'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : s.id === 'sell'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-white/[0.1] text-white/80'
                  : 'bg-white/[0.03] text-white/30 hover:text-white/60',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
