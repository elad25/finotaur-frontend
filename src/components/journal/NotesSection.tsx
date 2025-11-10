import React from "react";
import { useJournalStore } from "@/state/journalStore";

export default function NotesSection(){
  const st = useJournalStore();
  const count = (st.notes || "").trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="mt-12 mb-12 p-8 rounded-2xl border border-yellow-200/10 bg-[linear-gradient(145deg,#0b0b0b,#121212)] shadow-[0_0_40px_rgba(0,0,0,0.25)]">
      <div className="text-[#C9A646] tracking-wide uppercase text-xs mb-3">Notes</div>
      <textarea
        value={st.notes || ""}
        onChange={(e)=> st.setNotes ? st.setNotes(e.target.value) : (st.notes = e.target.value)}
        placeholder="Trade notes, lessons learned, catalysts, emotions…"
        className="w-full min-h-[220px] rounded-xl bg-[#0E0E0E] border border-yellow-200/15 p-3 text-[13px] text-zinc-200 outline-none transition focus:ring-1 focus:ring-[#C9A646]/40"
      />
      <div className="mt-1 text-right text-[12px] text-zinc-500">{count} words</div>
      <div className="mt-4">
        <label className="text-xs text-zinc-400 mr-2">What went wrong?</label>
        <select
          value={st.mistake || ""}
          onChange={(e)=> st.setMistake ? st.setMistake(e.target.value) : (st.mistake = e.target.value)}
          className="bg-[#0E0E0E] border border-yellow-200/15 rounded-md px-2 py-1 text-xs text-zinc-200"
        >
          <option value="">—</option>
          <option>Slippage</option>
          <option>Emotional entry</option>
          <option>Missed TP</option>
          <option>Poor sizing</option>
        </select>
      </div>
    </div>
  );
}
