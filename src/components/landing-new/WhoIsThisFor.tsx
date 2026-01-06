// src/components/landing-new/WhoIsThisFor.tsx
// ================================================
// 🔥 WHO THIS IS FOR / NOT FOR
// Goal: Raise status & reduce refunds through qualification
// ================================================

import { motion } from "framer-motion";
import { Check, X, Shield } from "lucide-react";

const forItems = [
  "Traders & investors who want clarity, not content",
  "People willing to pay to think less and decide better",
  "Those tired of second-guessing every move",
];

const notForItems = [
  "Signal hunters",
  "Get-rich-quick mindset",
  "People who want certainty instead of probabilities",
];

const WhoIsThisFor = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />

      {/* Subtle Glows */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-red-500/[0.03] rounded-full blur-[120px]" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full mb-6">
            <Shield className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-sm">Qualification</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white">
            This is not for everyone.
          </h2>
        </motion.div>

        {/* Two Columns */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid md:grid-cols-2 gap-8"
        >
          {/* FOR Column */}
          <div
            className="p-8 rounded-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-emerald-400">This is for you if:</h3>
            </div>

            <ul className="space-y-4">
              {forItems.map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300 leading-relaxed">{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* NOT FOR Column */}
          <div
            className="p-8 rounded-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.01) 100%)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-red-400">Not for you if:</h3>
            </div>

            <ul className="space-y-4">
              {notForItems.map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <X className="w-5 h-5 text-red-400/70 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-500 leading-relaxed">{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhoIsThisFor;
