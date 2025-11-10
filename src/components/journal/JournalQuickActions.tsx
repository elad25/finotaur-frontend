import React from "react";
import { useNavigate } from "react-router-dom";

export default function JournalQuickActions(){
  const nav = useNavigate();
  const go = (side: "Long"|"Short") => nav(`/app/journal/new?side=${side}`);

  return (
    <div className="mt-2 space-y-2">
      <button
        onClick={()=>go("Long")}
        className="w-full rounded-full bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white shadow hover:scale-[1.01] hover:shadow-lg transition"
      >+ New Long Trade</button>
      <button
        onClick={()=>go("Short")}
        className="w-full rounded-full bg-red-500/90 px-4 py-2 text-sm font-semibold text-white shadow hover:scale-[1.01] hover:shadow-lg transition"
      >+ New Short Trade</button>
    </div>
  );
}
