// src/components/landing-new/WhatIsFinotaur.tsx
// ================================================
// 🔥 WHAT TOP SECRET ACTUALLY IS
// Goal: Define product without making it a generic newsletter
// ================================================

import { motion } from "framer-motion";
import { TrendingUp, Building2, Target, Compass } from "lucide-react";

const outcomes = [
  {
    icon: TrendingUp,
    text: "Monthly macro conclusions",
  },
  {
    icon: Building2,
    text: "Deep company research beyond headlines",
  },
  {
    icon: Compass,
    text: "Clear directional bias — not opinions",
  },
  {
    icon: Target,
    text: "Written for decision-makers, not content consumers",
  },
];

const WhatIsFinotaur = () => {
  return (
    <section id="features" className="py-24 px-4 relative overflow-hidden">
      {/* Luxury Background with Rich Gold Undertone */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />

      {/* Stronger Gold Border Lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/45 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />

      {/* Intense Gold Glows */}
      <div className="absolute top-1/4 right-1/4 w-[700px] h-[700px] bg-[#C9A646]/[0.12] rounded-full blur-[160px]" />
      <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-[#D4AF37]/[0.10] rounded-full blur-[140px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#F4D97B]/[0.06] rounded-full blur-[120px]" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-white">What is </span>
            <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
              TOP SECRET
            </span>
            <span className="text-white">?</span>
          </h2>
        </motion.div>

        {/* Outcome Points */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-5 mb-12"
        >
          {outcomes.map((outcome, index) => {
            const Icon = outcome.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-5 p-5 rounded-xl transition-all duration-300 hover:bg-[#C9A646]/[0.05]"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.08) 0%, rgba(201,166,70,0.02) 100%)',
                  border: '1px solid rgba(201,166,70,0.15)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(201,166,70,0.15)',
                    border: '1px solid rgba(201,166,70,0.3)',
                  }}
                >
                  <Icon className="w-6 h-6 text-[#C9A646]" />
                </div>
                <p className="text-lg md:text-xl text-white leading-relaxed">
                  {outcome.text}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Important Note - What it's NOT */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7 }}
          className="text-center"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-6 text-slate-500 text-sm">
            <span className="flex items-center gap-2">
              <span className="text-slate-600">✕</span>
              <span>Not PDFs</span>
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-2">
              <span className="text-slate-600">✕</span>
              <span>Not email frequency</span>
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-2">
              <span className="text-slate-600">✕</span>
              <span>Not newsletters</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-3 italic">
            Just clarity. Just direction. Just decisions.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default WhatIsFinotaur;
