import React, { Suspense, useMemo, useState } from "react";
import UploadDropzone from "./UploadDropzone";
import { JournalUpload } from "@/types/journal";

const LazyMarkdown = React.lazy(() => import(/* @vite-ignore */"@/components/markdown/SimpleMarkdown").catch(() => ({ default: (p:any)=> <textarea {...p} /> })));

type Tab = "notes" | "uploads" | "strategy" | "review";

interface Props {
  notes: string;
  onNotes: (s: string) => void;
  uploads: JournalUpload[];
  onUploads: (u: JournalUpload[]) => void;
  strategy: string[];
  onStrategy: (s: string[]) => void;
  emotion: number;
  onEmotion: (n: number) => void;
  mistake?: string;
  onMistake: (s: string) => void;
  nextTime?: string;
  onNextTime: (s: string) => void;
}

export default function JournalTabs(props: Props) {
  const [tab, setTab] = useState<Tab>("notes");
  const tabs: { key: Tab; label: string }[] = [
    { key: "notes", label: "Notes" },
    { key: "uploads", label: "Uploads" },
    { key: "strategy", label: "Strategy" },
    { key: "review", label: "Review" },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-yellow-200/15 bg-[#141414]">
      <div className="sticky top-0 z-10 backdrop-blur supports-backdrop-blur:bg-black/20 border-b border-yellow-200/10 px-4 md:px-6 py-2 flex gap-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm transition ${tab === t.key ? "bg-yellow-600/25 text-yellow-100 border border-yellow-500/40" : "text-zinc-300 hover:bg-zinc-800"}`}>
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <button type="button"
          className="px-3 py-1.5 rounded-md text-xs border border-yellow-200/20 text-zinc-200 hover:border-yellow-400/40">
          Analyze Trade with AI
        </button>
      </div>

      <div className="max-h-[56vh] md:max-h-[60vh] overflow-y-auto px-4 md:px-6 py-5">
        {tab === "notes" && (
          <div>
            <label className="block text-sm text-zinc-300 mb-2">NOTES</label>
            <textarea
              value={props.notes} onChange={e => props.onNotes(e.target.value)}
              placeholder="Trade notes, lessons learned, catalysts, emotions…"
              className="w-full min-h-[240px] rounded-xl bg-black/30 border border-yellow-200/15 p-3 text-[13px] text-zinc-200 outline-none focus:ring-1 focus:ring-[#C9A646]/40"
            />
            <div className="mt-2 text-[12px] text-zinc-400">{props.notes?.length ?? 0} words</div>
            <div className="mt-3 text-[12px] text-zinc-400">Hints: Plan • Execution • Post-mortem</div>
          </div>
        )}

        {tab === "uploads" && (
          <UploadDropzone value={props.uploads} onChange={props.onUploads} />
        )}

        {tab === "strategy" && (
          <div className="space-y-5">
            <div>
              <div className="text-sm text-zinc-200 mb-2">Strategy presets</div>
              <div className="flex flex-wrap gap-2">
                {["ICT","ORB","FVG","Breakout","Reversal","News"].map(s => {
                  const active = props.strategy?.includes(s);
                  return (
                    <button type="button" key={s}
                      onClick={() => props.onStrategy(active ? props.strategy.filter(x=>x!==s) : [...(props.strategy||[]), s])}
                      className={`px-3 py-1.5 rounded-full text-[13px] border ${active ? "border-yellow-500/50 bg-yellow-600/20 text-yellow-100" : "border-yellow-200/20 text-zinc-300 hover:bg-zinc-800"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-sm text-zinc-200 mb-2">Confidence</div>
              <input type="range" min={1} max={5} value={props.emotion || 3} onChange={e => props.onEmotion(parseInt(e.target.value))} className="w-full" />
              <div className="text-xs text-zinc-400 mt-1">1=Low • 5=High</div>
            </div>

            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-yellow-500" /> Followed plan</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-yellow-500" /> No oversized entries</label>
            </div>
          </div>
        )}

        {tab === "review" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Primary mistake?</label>
              <select value={props.mistake ?? ""} onChange={e => props.onMistake(e.target.value)} className="w-full bg-black/30 border border-yellow-200/15 rounded-xl px-3 py-2 text-sm text-zinc-200">
                <option value="">—</option>
                <option value="late">Late entry</option>
                <option value="early">Early entry</option>
                <option value="size">Oversized position</option>
                <option value="bias">Bias / ignored plan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Next time I will…</label>
              <input value={props.nextTime ?? ""} onChange={e => props.onNextTime(e.target.value)}
                     className="w-full bg-black/30 border border-yellow-200/15 rounded-xl px-3 py-2 text-sm text-zinc-200" />
            </div>
            <div className="col-span-full">
              <button type="button" className="px-3 py-1.5 rounded-md border border-yellow-200/25 text-[13px] text-zinc-200 hover:border-yellow-400/40">
                ★ Flag for Team Review
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
