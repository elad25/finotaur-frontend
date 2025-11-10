// src/components/markets/WatchlistPanel.tsx
import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { QuoteBadge } from "./QuoteBadge";

const DEFAULTS = ["TVC:DXY","BINANCE:BTCUSDT","AMEX:SPY","NASDAQ:QQQ","TVC:VIX","FOREXCOM:XAUUSD","FX:EURUSD"];

export type WatchlistPanelProps = {
  value: string;
  onChange: (sym: string) => void;
};

const SYMBOL_SUGGESTIONS: Record<string,string> = {
  DXY: "TVC:DXY",
  BTC: "BINANCE:BTCUSDT",
  SPY: "AMEX:SPY",
  QQQ: "NASDAQ:QQQ",
  VIX: "TVC:VIX",
  XAUUSD: "FOREXCOM:XAUUSD",
  EURUSD: "FX:EURUSD",
};

function normalize(input: string) {
  const t = input.trim().toUpperCase();
  if (SYMBOL_SUGGESTIONS[t]) return SYMBOL_SUGGESTIONS[t];
  return t;
}

function shortLabel(sym: string) {
  const i = sym.indexOf(":");
  const raw = i >= 0 ? sym.slice(i+1) : sym;
  if (sym.startsWith("BINANCE:")) {
    if (raw.endsWith("USDT")) return raw.replace("USDT","");
    if (raw.endsWith("USD")) return raw.replace("USD","");
  }
  return raw;
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({ value, onChange }) => {
  const [items, setItems] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("finotaur.watchlist");
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULTS;
  });
  const [input, setInput] = useState("");

  const save = (arr: string[]) => {
    setItems(arr);
    try { localStorage.setItem("finotaur.watchlist", JSON.stringify(arr)); } catch {}
  };

  const add = () => {
    const sym = normalize(input);
    if (!sym) return;
    if (items.includes(sym)) { setInput(""); onChange(sym); return; }
    const arr = [...items, sym];
    save(arr);
    setInput("");
    onChange(sym);
  };

  const remove = (sym: string) => {
    const arr = items.filter(s => s !== sym);
    save(arr);
    if (value === sym && arr.length) onChange(arr[0]);
  };

  return (
    <aside className="w-[330px] shrink-0 rounded-2xl border border-border bg-base-800 p-4 flex flex-col">
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          placeholder="Add symbol (e.g., AAPL / EURUSD / BTC)"
          className="flex-1 rounded-xl bg-base-900 border border-border px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={add}
          className="rounded-xl px-3 py-2 bg-gold text-black text-sm hover:bg-gold-600 transition"
          title="Add symbol"
        >
          <Plus className="w-4 h-4"/>
        </button>
      </div>

      <div className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Watchlist</div>

      <div className="mt-2 overflow-y-auto pr-1" style={{ maxHeight: 680 }}>
        {items.map((sym) => (
          <div key={sym} className={`group w-full rounded-xl px-3 py-2 mb-1 ${value===sym ? 'bg-base-700 border border-border' : 'hover:bg-base-750'}`}>
            <button onClick={()=>onChange(sym)} className="w-full flex items-center justify-between">
              <span className="truncate text-sm">{shortLabel(sym)}</span>
              <QuoteBadge symbol={sym} />
            </button>
            <button
              onClick={()=>remove(sym)}
              className="mt-1 text-xs opacity-60 hover:opacity-100 flex items-center gap-1"
              title="Remove"
            >
              <X className="w-3.5 h-3.5" /> remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground">
        Tip: use symbols like <b>AMEX:SPY</b>, <b>NASDAQ:QQQ</b>, <b>TVC:DXY</b>, <b>FX:EURUSD</b>, <b>FOREXCOM:XAUUSD</b>.
      </div>
    </aside>
  );
};
