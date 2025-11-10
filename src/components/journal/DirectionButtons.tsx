import React from "react";
import { useJournalStore } from "@/state/journalStore";

export default function DirectionButtons(){
  const st = useJournalStore();
  const side = (st.side || "LONG").toUpperCase();

  const btn = (k: "LONG" | "SHORT") => {
    const active = side === k;
    const color = k === "LONG" ? "text-[#00C46C]" : "text-[#E44545]";
    const bg = active ? (k === "LONG" ? "bg-green-900/30" : "bg-red-900/30") : "bg-black/20";
    const ring = active ? "ring-1 ring-[#C9A646]/40" : "hover:ring-1 hover:ring-[#C9A646]/30";
    return (
      <button
        type="button"
        onClick={()=> st.setSide && st.setSide(k)}
        className={`flex-1 rounded-2xl border border-yellow-200/20 px-4 py-3 text-sm font-semibold ${bg} ${ring} transition transform active:scale-[0.98]`}
      >
        <span className={color}>{k === "LONG" ? "⬆ Long" : "⬇ Short"}</span>
      </button>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {btn("LONG")}
      {btn("SHORT")}
    </div>
  );
}
