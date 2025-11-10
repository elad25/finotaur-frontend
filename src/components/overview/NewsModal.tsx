import React from "react"; export default function NewsModal({ open, onClose, item }:{open:boolean; onClose:()=>void; item?:any;}){
  if(!open) return null; return (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 grid place-items-center" onClick={onClose}>
    <div className="max-w-xl w-full rounded-2xl bg-[#0F1114] border border-white/10 p-5" onClick={e=>e.stopPropagation()}>
      <div className="flex justify-between items-center"><h3 className="text-zinc-100 font-medium">{item?.title || "Headline"}</h3><button className="text-zinc-400 hover:text-zinc-200" onClick={onClose}>✕</button></div>
      <p className="mt-3 text-sm text-zinc-300">{item?.summary || "—"}</p><div className="mt-4 text-xs text-zinc-500">Source: {item?.source || "—"} · {item?.timeAgo || ""}</div>
    </div></div>); }
