// src/components/fundamentals/AIInsights.tsx
import React from "react";
export const AIInsights:React.FC<{text?:string|null}>=({text})=>{ if(!text) return null; return (<div className="rounded-xl border border-zinc-800 p-4"><div className="text-sm font-semibold mb-2">AI Summary: What you should know about this company</div><p className="text-sm opacity-90">{text}</p></div>); };
export default AIInsights;
