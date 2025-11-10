import React, { useMemo } from "react";
import { useJournalStore } from "@/state/journalStore";

export default function NotesPanelLite({ analyze }:{ analyze?: (txt:string)=>Promise<void> }){
  const st = useJournalStore();
  const tags = st.tags ?? []; // safe default
  const setTags = (arr:string[]) => st.setTags?.(arr) || (st.tags = arr);
  const onToggle = (t:string) => setTags(tags.includes(t) ? tags.filter(x=>x!==t) : [...tags, t]);

  const presets = ["Momentum","Breakout","ICT","Reversal","News","Emotional"];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-zinc-300">NOTES</div>
        <button type="button"
          onClick={async ()=>{ if(analyze) await analyze(st.notes||""); }}
          className="rounded-md border border-yellow-200/25 px-3 py-1 text-xs text-zinc-200 hover:border-yellow-400/40">
          Analyze Trade with AI
        </button>
      </div>
      <textarea
        value={st.notes || ""}
        onChange={e=> st.setNotes ? st.setNotes(e.target.value) : (st.notes = e.target.value)}
        placeholder="Trade notes, lessons learned, catalysts, emotions..."
        className="w-full min-h-[220px] rounded-xl bg-black/30 border border-yellow-200/15 p-3 text-[13px] text-zinc-200 outline-none focus:ring-1 focus:ring-[#C9A646]/40"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map(p => {
          const active = tags.includes(p);
          return (
            <button key={p} type="button" onClick={()=>onToggle(p)}
              className={`${active ? "border-yellow-500/50 bg-yellow-600/20 text-yellow-100" : "text-zinc-300 hover:bg-zinc-800"} px-3 py-1.5 rounded-full text-[13px] border border-yellow-200/20`}>
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}
