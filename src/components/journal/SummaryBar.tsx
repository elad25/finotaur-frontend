import React, { useEffect, useRef, useState } from "react";
import { useJournalStore } from "@/state/journalStore";

function animateNumber(from:number, to:number, cb:(v:number)=>void, dur=300){
  const start = performance.now();
  function step(ts:number){ const p=Math.min(1,(ts-start)/dur); cb(from+(to-from)*p); if(p<1) requestAnimationFrame(step); }
  requestAnimationFrame(step);
}
function tone(rr:number){ if(rr>=2) return "text-emerald-400"; if(rr>=1) return "text-yellow-300"; return "text-red-400"; }

export default function SummaryBar(){
  const st = useJournalStore();
  const side = (st.side || "LONG").toUpperCase();
  const sgn = side === "LONG" ? 1 : -1;
  const entry = Number(st.entryPrice||0), stop=Number(st.stopPrice||0), tp=Number(st.exitPrice||0), qty=Number(st.quantity||0);
  const risk = Math.max(0, (entry - stop) * qty * sgn);
  const reward = Math.max(0, (tp - entry) * qty * sgn);
  const rr = reward && risk ? reward/Math.abs(risk) : 0;

  const prev = useRef({risk:0,reward:0,rr:0});
  const [rD,setRD] = useState(0); const [wD,setWD] = useState(0); const [rrD,setRR] = useState(0);
  useEffect(()=>{ animateNumber(prev.current.risk, Math.abs(risk), setRD, 350);
                  animateNumber(prev.current.reward, Math.abs(reward), setWD, 350);
                  animateNumber(prev.current.rr, rr, setRR, 350);
                  prev.current={risk,reward,rr}; }, [risk,reward,rr]);

  return (
    <div className="mt-10 mb-8 p-4 rounded-xl bg-[rgba(255,215,0,0.05)] text-sm font-medium text-zinc-300"
         title="R:R = (TP – Entry) / (Entry – Stop)">
      📊 R:R <span className={`${tone(rrD)} font-semibold`}>{rrD.toFixed(2)}</span>
      <span className="mx-1">•</span>
      Risk: <span className="text-zinc-100">${Math.abs(rD).toFixed(2)}</span>
      <span className="mx-1">•</span>
      Reward: <span className="text-zinc-100">${Math.abs(wD).toFixed(2)}</span>
    </div>
  );
}
