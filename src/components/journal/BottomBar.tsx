import React from "react";
import useAutosave from "@/hooks/useAutosave";
import { useJournalStore } from "@/state/journalStore";
import { createTrade } from "@/routes/journal";

export default function BottomBar(){
  const st = useJournalStore();
  const fp = () => JSON.stringify(st.payload());
  const status = useAutosave(fp, async ()=> await createTrade(st.payload()));

  async function onCreate(){
    await createTrade(st.payload());
    // TODO: optional navigate to list or toast is handled globally
  }

  function onCancel(){
    if (history.length > 1) window.history.back();
  }

  return (
    <div className="fixed left-0 right-0 bottom-0 z-40 border-t border-yellow-200/15 bg-[#0A0A0A]/85 backdrop-blur">
      <div className="mx-auto max-w-[1240px] px-6 py-3 flex flex-wrap items-center gap-3">
        <div className="text-xs text-zinc-400">Auto-save:&nbsp;
          <span className={status==='saving' ? 'text-yellow-200' : status==='saved' ? 'text-emerald-300' : status==='error' ? 'text-red-300' : 'text-zinc-400'}>
            {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Synced ✓' : status === 'error' ? 'Error' : 'Idle'}
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button onClick={onCancel}
                  className="rounded-xl border border-yellow-600/30 px-4 py-2 text-sm text-yellow-100 hover:bg-yellow-900/20 transition">
            Cancel
          </button>
          <button onClick={onCreate}
                  className="rounded-xl px-5 py-2 text-sm font-semibold text-black transition"
                  style={{ background: 'linear-gradient(135deg, #B8944E, #E6C675)' }}>
            Create Trade
          </button>
        </div>
      </div>
    </div>
  );
}
