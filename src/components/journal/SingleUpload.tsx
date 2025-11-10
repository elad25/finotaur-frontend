import React from "react";
import UploadZone from "@/components/journal/UploadZone";
import { useJournalStore } from "@/state/journalStore";

export default function SingleUpload(){
  const st = useJournalStore();
  return (
    <div className="mt-12 mb-12 p-8 rounded-2xl border border-yellow-200/10 bg-[linear-gradient(145deg,#0b0b0b,#121212)] shadow-[0_0_40px_rgba(0,0,0,0.25)]">
      <div className="text-[#C9A646] tracking-wide uppercase text-xs mb-3 text-center">Screenshot</div>
      <div className="max-w-[800px] mx-auto rounded-2xl border-2 border-dashed border-yellow-500/30 bg-white/5 p-4 transition hover:shadow-[0_0_20px_rgba(255,215,0,0.15)]">
        <UploadZone file={st.file} onFile={(f)=>st.setFile(f)} />
      </div>
    </div>
  );
}
