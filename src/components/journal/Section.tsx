import React from "react";
import { motion } from "framer-motion";

export default function Section({ title, children }:{ title:string; children:any }){
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-2xl border border-yellow-700/20 bg-zinc-950/40 p-5"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-yellow-700/30" />
        <div className="text-xs tracking-wider text-yellow-200/90">{title.upper ? title : title}</div>
        <div className="h-px flex-1 bg-yellow-700/30" />
      </div>
      {children}
    </motion.section>
  );
}
