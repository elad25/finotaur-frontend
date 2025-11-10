import React from "react";
import { useJournalStore } from "@/state/journalStore";

export default function DirectionCapsule(){
  const st = useJournalStore();
  const side = (st.side || "Long").toUpperCase();
  const isLong = side === "LONG";
  const cls = isLong
    ? "bg-green-900/30 text-green-400"
    : "bg-red-900/30 text-red-400";
  return (
    <div className="mt-4">
      <span className="text-xs font-medium tracking-wide text-[#C9A646] uppercase mr-3">Direction</span>
      <span className={`rounded-full ${cls} px-4 py-1 text-sm font-medium`}>Direction: {side}</span>
    </div>
  );
}
