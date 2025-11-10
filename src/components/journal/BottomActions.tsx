import React, { useState } from "react";
import { useJournalStore } from "@/state/journalStore";
import { createTrade } from "@/routes/journal";

export default function BottomActions(){
  const st = useJournalStore();
  const [saving, setSaving] = useState(false);

  async function onCreate(){
    try {
      setSaving(true);
      await createTrade(st.payload());
      // success toast (assumes global toast or implement simple one)
      const el = document.createElement("div");
      el.textContent = "Trade saved successfully — View it now in your Journal";
      el.className = "fixed left-1/2 -translate-x-1/2 bottom-6 z-50 bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg";
      document.body.appendChild(el);
      setTimeout(()=>el.remove(), 1800);
    } finally {
      setSaving(false);
    }
  }
  function onCancel(){ if (history.length > 1) history.back(); }

  return (
    <div className="flex justify-center gap-6 mt-16 mb-8">
      <button onClick={onCancel}
              className="px-5 py-2 rounded-xl border border-yellow-200/30 text-yellow-100 hover:bg-yellow-900/20 transition">
        Cancel
      </button>
      <button onClick={onCreate} disabled={saving}
              className="px-6 py-2 rounded-xl font-semibold text-black disabled:opacity-70 transition transform hover:scale-[1.03]"
              style={{ background: "linear-gradient(135deg, #B8944E, #E6C675)" }}>
        {saving ? "Saving…" : "Create Trade"}
      </button>
    </div>
  );
}
