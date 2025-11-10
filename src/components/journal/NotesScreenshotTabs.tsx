import React, { useState } from "react";
import UploadZone from "@/components/journal/UploadZone";
import { useJournalStore } from "@/state/journalStore";

export default function NotesScreenshotTabs(){
  const [tab, setTab] = useState<"notes"|"screenshot"|"mistakes">("notes");
  const st = useJournalStore();
  const count = (st.notes || "").trim().split(/\s+/).filter(Boolean).length;

  const pill = (k: typeof tab, label:string) => (
    <button type="button" onClick={()=>setTab(k)}
      className={`px-3 py-1.5 rounded-full text-xs transition border ${tab===k ? "bg-yellow-600/20 text-yellow-100 border-yellow-500/40" : "text-zinc-300 border-yellow-200/15 hover:bg-zinc-800"}`}>
      {label}
    </button>
  );

  return (
    <div className="rounded-2xl border border-yellow-200/10 bg-[linear-gradient(145deg,#0b0b0b,#121212)] shadow-[0_0_40px_rgba(0,0,0,0.25)] p-6">
      <div className="flex items-center gap-2 mb-4">
        {pill("notes","Notes")}
        {pill("screenshot","Screenshot")}
        {pill("mistakes","Mistakes")}
      </div>

      {tab === "notes" && (
        <div>
          <textarea
            value={st.notes || ""}
            onChange={e => st.setNotes ? st.setNotes(e.target.value) : (st.notes = e.target.value)}
            placeholder="Trade notes, lessons learned, catalysts, emotions…"
            className="w-full min-h-[220px] rounded-xl bg-[#0E0E0E] border border-yellow-200/15 p-3 text-[13px] text-zinc-200 outline-none transition focus:ring-1 focus:ring-[#C9A646]/40"
          />
          <div className="mt-1 text-right text-[12px] text-zinc-500">{count} words</div>
        </div>
      )}

      {tab === "screenshot" && (
        <div className="max-w-[800px] mx-auto rounded-2xl border-2 border-dashed border-yellow-500/30 bg-white/5 p-4 transition hover:shadow-[0_0_20px_rgba(255,215,0,0.15)]">
          <UploadZone file={st.file} onFile={(f)=>st.setFile(f)} />
        </div>
      )}

      {tab === "mistakes" && (
        <div className="grid gap-3">
          <div>
            <label className="text-xs text-zinc-400 mr-2">What went wrong?</label>
            <select
              value={st.mistake || ""}
              onChange={(e)=> st.setMistake ? st.setMistake(e.target.value) : (st.mistake = e.target.value)}
              className="bg-[#0E0E0E] border border-yellow-200/15 rounded-md px-2 py-2 text-xs text-zinc-200"
            >
              <option value="">—</option>
              <option>Slippage</option>
              <option>Emotional entry</option>
              <option>Missed TP</option>
              <option>Poor sizing</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mr-2">Next time I will…</label>
            <input
              type="text"
              value={st.nextTime || ""}
              onChange={e => st.setNextTime ? st.setNextTime(e.target.value) : (st.nextTime = e.target.value)}
              className="w-full bg-[#0E0E0E] border border-yellow-200/15 rounded-md px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-[#C9A646]/40"
              placeholder="Be patient for confirmation…"
            />
          </div>
        </div>
      )}
    </div>
  );
}
