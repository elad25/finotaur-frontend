// src/components/landing-new/RiskReversal.tsx
// ================================================
// RISK REVERSAL — ULTRA COMPACT TRUST STRIP
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
    <section className="py-10 px-4 relative overflow-hidden bg-section-base">
      {/* Ambient gold glow — subtle warmth behind the shield */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-gold-primary/[0.03] rounded-full blur-[100px]" />

      {/* Hairline borders — gold-tinted top and bottom */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-primary/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-primary/25 to-transparent" />

      <div className="max-w-xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          {/* Shield + headline — inline compact */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center relative shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.15), rgba(201,166,70,0.08))',
                border: '1px solid rgba(201,166,70,0.2)',
              }}
            >
              <Shield className="w-5 h-5 text-gold-primary" />
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-gold-primary" />
            </div>
            <div>
              <span className="text-xl font-bold text-ink-primary">14 days. Free. </span>
              <span className="text-xl font-bold text-gold-primary">Cancel in one click.</span>
            </div>
          </div>

          {/* Guarantees — single row on desktop */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
            {guarantees.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-gold-primary shrink-0" />
                <span className="text-ink-secondary text-xs">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RiskReversal;