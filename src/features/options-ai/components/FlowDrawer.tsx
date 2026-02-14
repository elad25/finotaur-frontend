// src/features/options-ai/components/FlowDrawer.tsx

import { memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Target, Clock, DollarSign, BarChart3 } from 'lucide-react';
import type { UnusualFlow } from '../types/options-ai.types';
import { Card } from './ui';

export const FlowDrawer = memo(function FlowDrawer({ isOpen, onClose, flow }: { isOpen: boolean; onClose: () => void; flow: UnusualFlow | null }) {
  useEffect(() => { if (isOpen) { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; } }, [isOpen]);
  useEffect(() => { if (!isOpen) return; const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [isOpen, onClose]);

  if (!isOpen || !flow) return null;
  const tc = flow.type === 'call' ? '#22C55E' : '#EF4444';
  const sc = flow.unusualScore >= 90 ? '#EF4444' : flow.unusualScore >= 80 ? '#F59E0B' : '#C9A646';

  return (<>
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[998]" />
    <motion.div initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }} transition={{ type:'spring',damping:30,stiffness:300 }}
      className="fixed top-0 right-0 bottom-0 w-[500px] max-w-[90vw] z-[999] flex flex-col" style={{ background:'linear-gradient(135deg,#0d0b08,#151210)', borderLeft:'1px solid rgba(201,166,70,0.2)' }}>
      <div className="relative p-6 border-b border-[#C9A646]/10 shrink-0">
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background:'linear-gradient(90deg,transparent,#C9A646,#F4D97B,#C9A646,transparent)' }} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,rgba(201,166,70,0.2),rgba(201,166,70,0.05))', border:'2px solid rgba(201,166,70,0.3)' }}>
              <span className="text-[#C9A646] font-bold text-lg">{flow.symbol.slice(0,2)}</span>
            </div>
            <div><h3 className="text-xl font-bold text-white">{flow.symbol}</h3><p className="text-sm text-[#6B6B6B]">Flow Analysis</p></div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all" aria-label="Close"><X className="h-5 w-5 text-[#8B8B8B]" /></button>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="flex flex-wrap gap-3">
          <span className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background:`${tc}15`,border:`1px solid ${tc}30`,color:tc }}>{flow.type.toUpperCase()} OPTION</span>
          <span className="px-4 py-2 rounded-xl text-sm font-semibold capitalize" style={{ background:flow.sentiment==='bullish'?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)', border:`1px solid ${flow.sentiment==='bullish'?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)'}`, color:flow.sentiment==='bullish'?'#22C55E':'#EF4444' }}>{flow.sentiment}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[{ l:'Strike',v:`$${flow.strike}`,i:Target },{ l:'Expiry',v:flow.expiry,i:Clock },{ l:'Premium',v:flow.premium,i:DollarSign,c:'#22C55E' },{ l:'Vol/OI',v:`${flow.volOiRatio.toFixed(2)}x`,i:BarChart3,c:'#F59E0B' }].map(s => (
            <div key={s.l} className="p-4 rounded-xl bg-white/[0.03]"><div className="flex items-center gap-2 mb-2"><s.i className="h-4 w-4 text-[#6B6B6B]" /><span className="text-[10px] text-[#6B6B6B] uppercase tracking-wider">{s.l}</span></div><div className="text-xl font-bold" style={{ color:s.c||'#fff' }}>{s.v}</div></div>
          ))}
        </div>
        <Card><div className="p-5"><h4 className="text-sm font-semibold text-white mb-4">Volume Analysis</h4>
          <div className="space-y-4">{[{ l:'Volume',v:flow.volume,pct:Math.min((flow.volume/flow.openInterest)*100,100),gold:true },{ l:'Open Interest',v:flow.openInterest,pct:100,gold:false }].map(x => (
            <div key={x.l}><div className="flex justify-between text-sm mb-2"><span className="text-[#8B8B8B]">{x.l}</span><span className="text-white font-semibold">{x.v.toLocaleString()}</span></div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width:`${x.pct}%`, background:x.gold?'linear-gradient(90deg,#C9A646,#F4D97B)':'#8B8B8B' }} /></div></div>
          ))}</div>
        </div></Card>
        <Card highlight><div className="relative p-5"><div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] to-transparent" />
          <div className="flex items-center gap-2 mb-3"><Sparkles className="h-5 w-5 text-[#C9A646]" /><span className="text-sm text-[#C9A646] font-bold">AI Analysis</span></div>
          <p className="text-[#E8DCC4] leading-relaxed">{flow.aiInsight}</p>
        </div></Card>
        <div className="text-center p-6 rounded-xl" style={{ background:`${sc}15`,border:`1px solid ${sc}30` }}>
          <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider mb-2">Unusual Score</div>
          <div className="text-5xl font-bold" style={{ color:sc }}>{flow.unusualScore}</div>
          <div className="text-xs text-[#8B8B8B] mt-1">out of 100</div>
        </div>
      </div>
      <div className="p-6 border-t border-[#C9A646]/10 shrink-0">
        <button className="w-full py-4 rounded-xl font-semibold transition-all hover:scale-[1.02]" style={{ background:'linear-gradient(135deg,#C9A646 0%,#F4D97B 50%,#C9A646 100%)',color:'#000',boxShadow:'0 4px 20px rgba(201,166,70,0.3)' }}>Add to Watchlist</button>
      </div>
    </motion.div>
  </>);
});
