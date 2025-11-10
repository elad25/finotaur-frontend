import React from "react";

const DEFAULT_TAGS = ["Momentum","Breakout","ICT","Reversal","News","Emotional"];

export default function NotesWithTags({
  notes, tags, onNotes, onToggleTag, onAnalyze
}: { notes?: string; tags: string[]; onNotes:(v:string)=>void; onToggleTag:(t:string)=>void; onAnalyze?: ()=>void; }){
  const wordCount = (notes ?? "").trim().split(/\s+/).filter(Boolean).length;
  const hint = "Trade notes, lessons learned, catalysts, emotions…";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-400">NOTES</div>
        {onAnalyze && (
          <button
            type="button"
            onClick={onAnalyze}
            className="rounded-full border border-yellow-600/40 px-3 py-1 text-xs text-yellow-100 hover:bg-yellow-900/30"
          >🧠 Analyze Trade with AI</button>
        )}
      </div>
      <div className="relative">
        <textarea
          value={notes ?? ""}
          onChange={(e)=>onNotes(e.target.value)}
          placeholder={hint}
          className="w-full min-h-[220px] resize-y rounded-xl border border-yellow-700/30 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-yellow-600/40"
        />
        <div className="pointer-events-none absolute bottom-2 right-3 text-xs text-zinc-500">{wordCount} words</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {DEFAULT_TAGS.map((t)=>{
          const on = tags.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={()=>onToggleTag(t)}
              className={`px-3 py-1.5 rounded-full text-xs border transition ${on ? "border-yellow-400/70 bg-yellow-900/20 text-yellow-100" : "border-yellow-700/30 text-zinc-300 hover:bg-zinc-800"}`}
            >{t}</button>
          );
        })}
      </div>
    </div>
  );
}
