import React from "react";
import { useJournalStore } from "@/state/journalStore";

type Props = { includeEntry?: boolean };

export default function EnhancedTradeFields({ includeEntry = false }: Props) {
  const st: any = useJournalStore();

  const entry = st.entry ?? st.entryPrice ?? "";
  const stop  = st.stop ?? st.stopLoss ?? "";
  const tp    = st.tp ?? st.takeProfit ?? "";

  function set(k: string, v: number | "") {
    if (typeof st[`set${k[0].toUpperCase()}${k.slice(1)}`] === "function") {
      st[`set${k[0].toUpperCase()}${k.slice(1)}`](v);
    } else if (typeof st.setField === "function") {
      st.setField(k, v);
    }
    const ev = new CustomEvent("journal:update", { detail: { [k]: v } });
    window.dispatchEvent(ev);
  }

  return (
    <div className={`grid ${includeEntry ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"} gap-4`}>
      {includeEntry && (
        <div className="flex flex-col">
          <label className="text-xs text-zinc-400 mb-1">Entry *</label>
          <input
            name="entry"
            type="number"
            inputMode="decimal"
            placeholder="Entry"
            className="bg-[#0E0E0E] border border-yellow-200/15 rounded-[14px] h-[50px] px-3 text-zinc-200 focus:ring-1 focus:ring-[#C9A646]/40"
            value={entry}
            onChange={(e) => set("entry", e.target.value === "" ? "" : +e.target.value)}
          />
        </div>
      )}
      <div className="flex flex-col">
        <label className="text-xs text-zinc-400 mb-1">Stop Loss</label>
        <input
          name="stop"
          type="number"
          inputMode="decimal"
          placeholder="Stop"
          className="bg-[#0E0E0E] border border-yellow-200/15 rounded-[14px] h-[50px] px-3 text-zinc-200 focus:ring-1 focus:ring-[#C9A646]/40"
          value={stop}
          onChange={(e) => set("stop", e.target.value === "" ? "" : +e.target.value)}
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-zinc-400 mb-1">Take Profit</label>
        <input
          name="tp"
          type="number"
          inputMode="decimal"
          placeholder="TP"
          className="bg-[#0E0E0E] border border-yellow-200/15 rounded-[14px] h-[50px] px-3 text-zinc-200 focus:ring-1 focus:ring-[#C9A646]/40"
          value={tp}
          onChange={(e) => set("tp", e.target.value === "" ? "" : +e.target.value)}
        />
      </div>
    </div>
  );
}
