// src/components/landing-new/BeforeAfter.tsx
// ================================================
// 🔥 THE PROBLEM — "Retail Traders Fight with Tied Hands"
// Hormozi: Position as the painkiller
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
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Dark background with subtle red tension */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0e0a08] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-red-500/[0.03] rounded-full blur-[150px]" />

      {/* Gold borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-semibold text-sm">The Problem</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            <span className="text-white">Retail traders are fighting</span>{' '}
            <span className="text-red-400">with their hands tied.</span>
          </h2>
        </motion.div>

        {/* Pain Points */}
        <div className="space-y-5">
          {painPoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-5 p-5 rounded-xl bg-white/[0.02] border border-red-500/10 hover:border-red-500/25 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-red-400/80" />
                </div>
                <p className="text-lg md:text-xl text-slate-300 leading-relaxed">{point.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BeforeAfter;