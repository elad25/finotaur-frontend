import React, { useState } from 'react';
import SnapshotGrid from './SnapshotGrid';
import { useFundamentals } from './useFundamentals';

function CompareRow({ symbol }: { symbol: string }) {
  const { data } = useFundamentals(symbol);
  return (
    <div>
      <div className="text-sm text-zinc-400 mb-2">{symbol}</div>
      <SnapshotGrid data={data} />
    </div>
  );
}

export default function CompareDrawer({ open, onClose, baseSymbol }: { open: boolean; onClose: () => void; baseSymbol: string; }) {
  const [symbols, setSymbols] = useState<string[]>([baseSymbol]);
  const [input, setInput] = useState('');
  const add = () => {
    if (!input) return;
    const s = input.toUpperCase().trim();
    setSymbols((prev) => Array.from(new Set([...(prev||[]), s])).slice(0,5));
    setInput('');
  };
  return (
    <div className={`fixed inset-0 ${open?'pointer-events-auto':'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/50 transition-opacity ${open?'opacity-100':'opacity-0'}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-full max-w-4xl bg-[#0D0E10] border-l border-zinc-800 transition-transform ${open?'translate-x-0':'translate-x-full'}`}>
        <div className="p-4 flex items-center justify-between border-b border-zinc-800">
          <div className="text-white font-semibold">Compare (up to 5)</div>
          <button className="text-zinc-400" onClick={onClose}>Close</button>
        </div>
        <div className="p-4 flex gap-2">
          <input className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-48" placeholder="Add ticker" value={input} onChange={e=>setInput(e.target.value)} />
          <button onClick={add} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-white">Add</button>
        </div>
        <div className="p-4 space-y-6 overflow-y-auto h-[calc(100%-120px)]">
          {symbols.map(sym => <CompareRow key={sym} symbol={sym} />)}
        </div>
      </div>
    </div>
  );
}
