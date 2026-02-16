// src/components/landing-new/DesignPhilosophy.tsx
// ================================================
// 🔥 BEFORE / AFTER — Transformation Table — COMPACT
// Hormozi: Perceived Likelihood + Dream Outcome (visual)
// ================================================

import { motion } from "framer-motion";
import { X, Check, ArrowRight } from "lucide-react";

const comparisons = [
  {
    before: "Wake up to 50 headlines and zero clarity",
    after: "Wake up with War Zone — know exactly what matters",
  },
  {
    before: "Analyze a stock in 4 hours",
    after: "AI analyzes it in 30 seconds",
  },
  {
    before: "Trade on gut feeling",
    after: "Trade on data and conclusions",
  },
  {
    before: "No idea why you're losing",
    after: "AI journal shows exactly where the problem is",
  },
  {
    before: "Pay $2,000+/month for separate tools",
    after: "Everything for $109/month — one place",
  },
];

const DesignPhilosophy = () => {
  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0C0E] via-[#1A1713] to-[#0C0C0E]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#C9A646]/[0.08] rounded-full blur-[150px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header — compact */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-white">Before & After </span>
            <span className="text-[#C9A646]">Finotaur</span>
          </h2>
          <p className="text-sm text-slate-400">
            The transformation is real. Here's what changes on day one.
          </p>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_32px_1fr] gap-0 mb-3 px-3">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 text-red-400 font-bold text-sm">
                <X className="w-4 h-4" />
                Before Finotaur
              </span>
            </div>
            <div />
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                <Check className="w-4 h-4" />
                After Finotaur
              </span>
            </div>
          </div>

          {/* Rows — tight */}
          <div className="space-y-2">
            {comparisons.map((comp, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + index * 0.06 }}
                className="grid grid-cols-[1fr_32px_1fr] gap-0 items-stretch group"
              >
                {/* Before */}
                <div
                  className="flex items-center gap-2.5 px-4 py-3 rounded-l-lg transition-all duration-300 group-hover:bg-red-500/[0.06]"
                  style={{
                    background: 'rgba(239,68,68,0.04)',
                    border: '1px solid rgba(239,68,68,0.08)',
                    borderRight: 'none',
                  }}
                >
                  <div className="w-5.5 h-5.5 rounded-full bg-red-500/12 flex items-center justify-center shrink-0">
                    <X className="w-3 h-3 text-red-400" />
                  </div>
                  <p className="text-slate-400 text-sm leading-snug">{comp.before}</p>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center" style={{ background: 'rgba(201,166,70,0.03)' }}>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C9A646]/50" />
                </div>

                {/* After */}
                <div
                  className="flex items-center gap-2.5 px-4 py-3 rounded-r-lg transition-all duration-300 group-hover:bg-emerald-500/[0.06]"
                  style={{
                    background: 'rgba(16,185,129,0.04)',
                    border: '1px solid rgba(16,185,129,0.08)',
                    borderLeft: 'none',
                  }}
                >
                  <div className="w-5.5 h-5.5 rounded-full bg-emerald-500/12 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <p className="text-white text-sm leading-snug font-medium">{comp.after}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DesignPhilosophy;