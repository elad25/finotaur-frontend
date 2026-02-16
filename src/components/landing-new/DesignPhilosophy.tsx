// src/components/landing-new/DesignPhilosophy.tsx
// ================================================
// 🔥 BEFORE / AFTER — Transformation Table
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
    <section className="py-28 px-4 relative overflow-hidden">
      {/* ========== BACKGROUND ========== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0C0E] via-[#1A1713] to-[#0C0C0E]" />

      {/* Gold Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#C9A646]/[0.10] rounded-full blur-[170px]" />
      <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-[#D4AF37]/[0.06] rounded-full blur-[120px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* ========== HEADER ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="text-white">Before &amp; After </span>
            <span className="text-[#C9A646]">Finotaur</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            The transformation is real. Here's what changes on day one.
          </p>
        </motion.div>

        {/* ========== TABLE ========== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_40px_1fr] gap-0 mb-5 px-4">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 text-red-400 font-bold text-lg">
                <X className="w-5 h-5" />
                Before Finotaur
              </span>
            </div>
            <div /> {/* spacer for arrow */}
            <div className="text-center">
              <span className="inline-flex items-center gap-2 text-emerald-400 font-bold text-lg">
                <Check className="w-5 h-5" />
                After Finotaur
              </span>
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-3">
            {comparisons.map((comp, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + index * 0.08 }}
                className="grid grid-cols-[1fr_40px_1fr] gap-0 items-stretch group"
              >
                {/* Before */}
                <div
                  className="flex items-center gap-3 p-5 rounded-l-xl transition-all duration-300 group-hover:bg-red-500/[0.06]"
                  style={{
                    background: 'rgba(239,68,68,0.04)',
                    border: '1px solid rgba(239,68,68,0.1)',
                    borderRight: 'none',
                  }}
                >
                  <div className="w-7 h-7 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                    <X className="w-4 h-4 text-red-400" />
                  </div>
                  <p className="text-slate-400 text-sm md:text-base leading-snug">{comp.before}</p>
                </div>

                {/* Arrow connector */}
                <div className="flex items-center justify-center" style={{ background: 'rgba(201,166,70,0.04)' }}>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.08 }}
                  >
                    <ArrowRight className="w-4 h-4 text-[#C9A646]/60" />
                  </motion.div>
                </div>

                {/* After */}
                <div
                  className="flex items-center gap-3 p-5 rounded-r-xl transition-all duration-300 group-hover:bg-emerald-500/[0.06]"
                  style={{
                    background: 'rgba(16,185,129,0.04)',
                    border: '1px solid rgba(16,185,129,0.1)',
                    borderLeft: 'none',
                  }}
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-white text-sm md:text-base leading-snug font-medium">{comp.after}</p>
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