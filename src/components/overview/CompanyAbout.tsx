import React, { useEffect, useState } from "react";
export default function CompanyAbout({symbol}:{symbol:string}){
  const [text,setText]=useState<string>(""); const [source,setSource]=useState<string>("");
  useEffect(()=>{ let ab=new AbortController(); fetch(`/api/overview/about?symbol=${symbol}`, {signal:ab.signal}).then(r=>r.json()).then(d=>{ setText(d?.about || ""); setSource(d?.source || ""); }).catch(()=>{}); return ()=>ab.abort(); },[symbol]);
  return (<div className="rounded-2xl bg-[#0F1114] p-4 border border-white/5">
    <h3 className="text-zinc-200 font-medium">Company Overview</h3>
    <p className="mt-2 text-sm text-zinc-300">{text || "—"}</p>
    <div className="mt-3 text-xs text-zinc-500">{source ? `Source: ${source}` : ""}</div>
  </div>); }
