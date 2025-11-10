import React from 'react';
import type { FundamentalsData } from './types';
import TickerAutocomplete from './TickerAutocomplete';

type Props = { data: FundamentalsData | null; onCompare: () => void; };
export default function Header({ data, onCompare }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="space-y-1">
          <div className="text-xl font-semibold text-white">
            {data?.companyName || '—'} <span className="text-zinc-400">({data?.symbol})</span>
          </div>
          <div className="text-xs text-zinc-500">Last updated: {data ? new Date(data.lastUpdated).toLocaleString() : '—'}</div>
        </div>
        <TickerAutocomplete initialSymbol={data?.symbol} onSelect={(sym)=> {
          const url = new URL(window.location.href);
          url.searchParams.set('symbol', sym);
          window.history.replaceState({}, '', url.toString());
          window.location.reload();
        }} />
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-full border border-yellow-700/40 px-3 py-1 text-xs text-yellow-400">Fair Value (beta)</div>
        <button onClick={onCompare} className="rounded-xl px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm">
          Compare with
        </button>
      </div>
    </div>
  );
}
