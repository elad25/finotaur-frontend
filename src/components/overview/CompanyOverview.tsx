import React, { useEffect, useState } from "react";
import { getJSON } from "@/lib/api";

export default function CompanyOverview({ symbol }: { symbol: string }){
  const [desc,setDesc]=useState<string>("");

  useEffect(()=>{
    let stop=false;
    (async()=>{
      try{
        const p = await getJSON<{profile?:{description?:string}}>(`/api/profile?symbol=${encodeURIComponent(symbol)}`);
        const fromProfile = p?.profile?.description?.trim() || "";
        if(!stop && fromProfile){ setDesc(fromProfile); return; }
      }catch{}
      try{
        const r = await getJSON<{description?:string}>(`/api/overview/reference?symbol=${encodeURIComponent(symbol)}`);
        if(!stop) setDesc((r?.description||"").trim());
      }catch{ if(!stop) setDesc(""); }
    })();
    return ()=>{stop=true};
  },[symbol]);

  return (
    <div className="rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21] h-full">
      <div className="text-base mb-2">Company Overview</div>
      <div className="text-sm text-gray-200 min-h-[80px] leading-relaxed">{desc || "—"}</div>
      <div className="text-xs text-gray-500 mt-3">Source: SEC EDGAR / Polygon</div>
    </div>
  );
}
