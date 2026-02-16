// src/components/landing-new/RiskReversal.tsx
// ================================================
// 🔥 RISK REVERSAL — "Zero Risk"
// Hormozi: Effort/Sacrifice ↓ minimal
// "14 days. Free. If you don't love it — cancel in one click."
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
    <section className="py-24 px-4 relative overflow-hidden">
      {/* ========== BACKGROUND ========== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100d08] to-[#0a0a0a]" />

      {/* Green-gold glow for trust feeling */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-emerald-500/[0.04] rounded-full blur-[150px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#C9A646]/[0.08] rounded-full blur-[160px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      <div className="max-w-3xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Shield icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, type: "spring" }}
            className="flex justify-center mb-8"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(201,166,70,0.15))',
                border: '1px solid rgba(16,185,129,0.3)',
                boxShadow: '0 0 60px rgba(16,185,129,0.15), 0 0 60px rgba(201,166,70,0.1)',
              }}
            >
              <Shield className="w-10 h-10 text-emerald-400" />
              {/* Sparkle accent */}
              <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-[#C9A646]" />
            </div>
          </motion.div>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            14 days. Free.
            <br />
            <span className="text-[#C9A646]">If you don't love it — cancel in one click.</span>
          </h2>

          {/* 3 Guarantee Points */}
          <div className="flex flex-col items-center gap-4 mt-10 mb-8">
            {guarantees.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-lg text-slate-300 font-medium">{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RiskReversal;