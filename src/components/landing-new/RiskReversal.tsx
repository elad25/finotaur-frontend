// src/components/landing-new/RiskReversal.tsx
// ================================================
// 🔥 RISK REVERSAL — COMPACT
// "14 days. Free. Cancel in one click."
// ================================================

import { motion } from "framer-motion";
import { Shield, Check, Sparkles } from "lucide-react";

const guarantees = [
  "14 days full access — no restrictions",
  "Cancel in one click — no questions asked",
  "Zero risk — you can only gain",
];

const RiskReversal = () => {
  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100d08] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[130px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#C9A646]/[0.06] rounded-full blur-[140px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      <div className="max-w-2xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Shield icon — smaller */}
          <div className="flex justify-center mb-5">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(201,166,70,0.12))',
                border: '1px solid rgba(16,185,129,0.25)',
                boxShadow: '0 0 40px rgba(16,185,129,0.1)',
              }}
            >
              <Shield className="w-7 h-7 text-emerald-400" />
              <Sparkles className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[#C9A646]" />
            </div>
          </div>

          {/* Headline — smaller */}
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
            14 days. Free.
            <br />
            <span className="text-[#C9A646]">If you don't love it — cancel in one click.</span>
          </h2>

          {/* Guarantees — inline/compact */}
          <div className="flex flex-col items-center gap-2.5 mt-6">
            {guarantees.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + index * 0.08 }}
                className="flex items-center gap-2.5"
              >
                <div className="w-5.5 h-5.5 rounded-full bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-base text-slate-300">{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RiskReversal;