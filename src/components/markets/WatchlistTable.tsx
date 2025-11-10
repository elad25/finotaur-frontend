// src/components/markets/WatchlistTable.tsx
import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { fetchQuote, shortLabel, Quote } from "./quotes";

const DEFAULTS = ["TVC:DXY","BINANCE:BTCUSDT","AMEX:SPY","NASDAQ:QQQ","TVC:VIX","FOREXCOM:XAUUSD","FX:EURUSD"];

export type WatchlistTableProps = {
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

type Row = { sym: string; q?: Quote };

export const WatchlistTable: React.FC<WatchlistTableProps> = ({ value, onChange }) => {
  const [items, setItems] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("finotaur.watchlist");
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULTS;
  });
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<Row[]>(items.map((sym)=>({sym})));

  // Live polling every 5s
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const data: Row[] = [];
      for (const sym of items) {
        const q = await fetchQuote(sym);
        if (!alive) return;
        data.push({ sym, q });
      }
      if (alive) setRows(data);
    };
    load();
    const iv = setInterval(load, 5000);
    return () => { alive = false; clearInterval(iv); };
  }, [items]);

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

  const fmtNum = (n: number | null) => n == null ? "—" : (Math.abs(n) >= 1000 ? n.toLocaleString(undefined, {maximumFractionDigits: 2}) : n.toFixed(2));
  const fmtPct = (n: number | null) => n == null ? "—" : ((n>=0?"+":"") + n.toFixed(2) + "%");
  const color = (n: number | null) => n == null ? "" : (n >= 0 ? "text-emerald-400" : "text-rose-400");

  return (
    <aside className="w-[360px] shrink-0 rounded-2xl border border-border bg-base-800 p-4 flex flex-col">
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
        >+</button>
      </div>

      <div className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Watchlist</div>

      <div className="mt-2 overflow-y-auto" style={{ maxHeight: 720 }}>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground sticky top-0 bg-base-800">
            <tr className="border-b border-border/60">
              <th className="py-2 text-left">Symbol</th>
              <th className="py-2 text-right">Last</th>
              <th className="py-2 text-right">Chg</th>
              <th className="py-2 text-right">Chg%</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.sym}
                onClick={()=>onChange(r.sym)}
                className={`group cursor-pointer hover:bg-base-750 ${value===r.sym ? 'bg-base-700' : ''}`}
              >
                <td className="py-2">{shortLabel(r.sym)}</td>
                <td className="py-2 text-right">{fmtNum(r.q?.price ?? null)}</td>
                <td className={`py-2 text-right ${color(r.q?.ch ?? null)}`}>{fmtNum(r.q?.ch ?? null)}</td>
                <td className={`py-2 text-right ${color(r.q?.chp ?? null)}`}>{fmtPct(r.q?.chp ?? null)}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={(e)=>{ e.stopPropagation(); remove(r.sym); }}
                    className="opacity-0 group-hover:opacity-100 transition"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
};
