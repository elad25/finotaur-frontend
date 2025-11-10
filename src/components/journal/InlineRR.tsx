import React, { useEffect, useMemo, useRef, useState } from "react";
import { useJournalStore } from "@/state/journalStore";
import { computeRiskReward, rrTone } from "@/utils/tradeMath";

function anim(from:number, to:number, cb:(v:number)=>void, dur=280){
  const start = performance.now();
  function step(ts:number){ const p=Math.min(1,(ts-start)/dur); cb(from+(to-from)*p); if(p<1) requestAnimationFrame(step); }
  requestAnimationFrame(step);
}

export default function InlineRR(){
  const st = useJournalStore();
  const [riskD, setRiskD] = useState(0);
  const [rewD, setRewD] = useState(0);
  const [rrD,  setRrD ] = useState(0);
  const prev = useRef({risk:0,reward:0,rr:0});

  const entry = Number(st.entryPrice||0);
  const stop  = Number(st.stopPrice||0);
  const tp    = Number(st.exitPrice||0);
  const qty   = Number(st.quantity||0);

  const { rr, risk, reward } = useMemo(()=> computeRiskReward({
    side: st.side as any, entry, stop, tp, qty
  }), [st.side, entry, stop, tp, qty]);

  useEffect(()=>{
    anim(prev.current.risk, risk, setRiskD);
    anim(prev.current.reward, reward, setRewD);
    anim(prev.current.rr, rr, setRrD);
    prev.current = { risk, reward, rr };
  }, [risk, reward, rr]);

  return (
    <div className="mt-2 text-xs text-zinc-400">
      R:R <span className={`font-semibold ${rrTone(rrD)}`}>{rrD.toFixed(2)}</span>
      <span className="mx-1">•</span>
      Risk: <span className="text-zinc-100">${riskD.toFixed(2)}</span>
      <span className="mx-1">•</span>
      Reward: <span className="text-zinc-100">${rewD.toFixed(2)}</span>
    </div>
  );
}
