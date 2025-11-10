import React, { useEffect, useMemo } from "react";
import { useJournalStore } from "@/state/journalStore";
import { computeRiskReward, inferSide, rrTone } from "@/utils/tradeMath";

export default function AutoDirectionCapsule(){
  const st = useJournalStore();
  const entry = Number(st.entryPrice||0);
  const exit  = Number(st.exitPrice||0);

  const side = useMemo(()=> inferSide(entry, exit) || (st.side?.toUpperCase?.() || "LONG"), [entry, exit, st.side]);
  useEffect(()=>{ if (st.setSide) st.setSide(side as any); }, [side]);

  const cls = side === "LONG"
    ? "bg-green-900/30 text-green-400 border-green-500/30"
    : "bg-red-900/30 text-red-400 border-red-500/30";

  // result in R after exit
  const { resultR } = computeRiskReward({ side, entry, stop: Number(st.stopPrice||0), tp: exit, qty: Number(st.quantity||0) });

  return (
    <div className="flex flex-wrap items-center gap-3 mt-2">
      <span className="text-xs font-medium tracking-wide text-[#C9A646] uppercase">Direction</span>
      <span className={`rounded-full border px-4 py-1 text-sm font-medium ${cls}`}>Direction: {side}</span>
      {typeof resultR === "number" && (
        <span className={`text-sm ${rrTone(resultR)}`}>
          {resultR >= 0 ? `Profit +${resultR.toFixed(2)}R` : `Loss ${resultR.toFixed(2)}R`}
        </span>
      )}
    </div>
  );
}
