import React from "react";
import { AutoSaveState } from "@/hooks/useAutoSave";

interface Props {
  pl: number;
  risk: number;
  rr: number;
  status: AutoSaveState;
  onSave: () => void;
  onSaveNew: () => void;
}

export default function JournalStatusBar({ pl, risk, rr, status, onSave, onSaveNew }: Props) {
  return (
    <div className="fixed left-0 right-0 bottom-0 z-40 border-t border-yellow-200/15 bg-[#0A0A0A]/85 backdrop-blur">
      <div className="mx-auto max-w-screen-xl px-4 md:px-8 lg:px-10 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-5 text-sm">
          <div className="font-semibold text-zinc-100">P/L <span className="text-green-400">${pl.toFixed(2)}</span></div>
          <div className="text-zinc-300">Risk <span className="text-zinc-100">${risk.toFixed(2)}</span></div>
          <div className="text-zinc-300">R:R <span className="text-zinc-100">{rr.toFixed(2)}</span></div>
          <div className="text-xs text-zinc-400">• Auto-save: {status}</div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={onSave}
            className="px-3 py-1.5 rounded-md border border-yellow-200/30 text-zinc-100 hover:border-yellow-400/50">
            Save
          </button>
          <button type="button" onClick={onSaveNew}
            className="px-3 py-1.5 rounded-md bg-[#C9A646] text-black font-medium rounded-lg">
            Save & New
          </button>
        </div>
      </div>
    </div>
  );
}
