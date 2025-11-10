// src/components/overview/AISummaryLine.tsx
import React from "react";
import { apiGet } from "@/lib/api";

export default function AISummaryLine({ symbol }:{ symbol:string }){
  const [text, setText] = React.useState<string>("");
  React.useEffect(()=>{
    let m = true;
    apiGet<{summary:string}>("/api/ai/summary", { symbol }).then(r=>{
      if (m) setText(r?.summary || "");
    }).catch(()=>{});
    return ()=>{ m=false; };
  }, [symbol]);
  if (!text) return null;
  return (
    <div className="italic text-sm text-yellow-300/80">{text}</div>
  );
}
