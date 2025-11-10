import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function RRSummary({ rr, profit, risk }:{ rr:number; profit:number; risk:number }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${rr}-${profit}-${risk}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mt-3 rounded-2xl border border-yellow-700/20 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-200 shadow-[0_0_40px_rgba(201,166,70,0.08)]"
        style={{ backdropFilter: "blur(4px)" }}
      >
        <div className="flex items-center gap-4">
          <Badge label="R:R" value={rr.toFixed(2)} />
          <Badge label="Profit" value={(profit>=0?"+":"") + "$" + profit.toFixed(2)} />
          <Badge label="Risk" value={"-$" + Math.abs(risk).toFixed(2)} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Badge({ label, value }:{label:string; value:string}){
  return (
    <div className="flex items-center gap-2 rounded-xl bg-zinc-800 px-3 py-1.5">
      <span className="text-zinc-400">{label}</span>
      <span className="font-semibold text-yellow-200">{value}</span>
    </div>
  );
}
