// src/components/landing-new/BeforeAfter.tsx
// ================================================
// 🔥 THE PROBLEM — COMPACT
// "Retail Traders Fight with Tied Hands"
// ================================================

import { motion } from "framer-motion";
import { AlertCircle, Brain, Clock, Crosshair, Skull } from "lucide-react";

const painPoints = [
  {
    icon: Brain,
    text: "Institutions use AI, analyst teams, and $25K/year reports. You? Google and Twitter.",
  },
  {
    icon: Clock,
    text: "You get information — but not conclusions. 50 headlines each morning and zero clarity.",
  },
  {
    icon: Crosshair,
    text: "You react to the market instead of getting ahead of it.",
  },
  {
    icon: Skull,
    text: "You don't have a system — you trade on gut feeling.",
  },
];

const BeforeAfter = () => {
  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0e0a08] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-red-500/[0.03] rounded-full blur-[120px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="flex justify-center mb-5"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-400 font-semibold text-xs">The Problem</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
            <span className="text-white">Retail traders are fighting</span>{' '}
            <span className="text-red-400">with their hands tied.</span>
          </h2>
        </motion.div>

        {/* Pain Points — compact */}
        <div className="space-y-3">
          {painPoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + index * 0.08 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-red-500/8 hover:border-red-500/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500/8 border border-red-500/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-red-400/70" />
                </div>
                <p className="text-base text-slate-300 leading-relaxed">{point.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BeforeAfter;