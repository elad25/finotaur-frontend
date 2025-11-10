import React from "react";
import { useJournalStore } from "@/state/journalStore";

export default function DirectionToggle(){
  const side = useJournalStore(s=>s.side);
  const setSide = useJournalStore(s=>s.setSide);
  const Btn = ({v,label}:{v:"Long"|"Short"; label:string}) => (
    <button
      type="button"
      onClick={()=>setSide(v)}
      className={`px-4 py-2 rounded-xl border transition text-sm font-semibold
        ${side===v
          ? (v==="Long"
              ? "border-emerald-500/60 bg-emerald-600/15 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.25)]"
              : "border-red-500/60 bg-red-600/15 text-red-200 shadow-[0_0_24px_rgba(239,68,68,0.25)]")
          : "border-yellow-700/20 text-zinc-300 hover:bg-zinc-800"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-2">
      <Btn v="Long" label="LONG ↑" />
      <Btn v="Short" label="SHORT ↓" />
    </div>
  );
}
