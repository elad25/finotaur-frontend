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
  "Manage risk effectively",
];

const RiskReversal = () => {
  return (
    <section className="py-5 px-4 relative overflow-hidden bg-section-base">
      {/* Ambient gold atmosphere — richer warmth behind the card */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[280px] bg-gold-primary/[0.06] rounded-full blur-[110px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          {/* Gold-framed band — hairline top */}
          <div
            className="h-px w-full bg-gradient-to-r from-transparent via-gold-primary/40 to-transparent"
            aria-hidden="true"
          />

          <div className="flex flex-col items-center gap-4 py-6">
            {/* Shield + headline — inline compact */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center relative shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.18), rgba(201,166,70,0.08))',
                  border: '1px solid rgba(201,166,70,0.25)',
                }}
              >
                <Shield className="w-5 h-5 text-gold-primary" />
                <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-gold-primary" />
              </div>
              <div>
                <span className="text-xl font-bold text-ink-primary">14 days. Free. </span>
                <span className="text-xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                  Cancel in one click.
                </span>
              </div>
            </div>

            {/* Guarantees — gold-bordered chips, single row on desktop */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              {guarantees.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 rounded-full border border-gold-primary/30 bg-gold-primary/5 px-3 py-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-gold-primary shrink-0" />
                  <span className="text-ink-secondary text-xs">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gold-framed band — hairline bottom */}
          <div
            className="h-px w-full bg-gradient-to-r from-transparent via-gold-primary/40 to-transparent"
            aria-hidden="true"
          />
        </motion.div>
      </div>
    </section>
  );
};

export default RiskReversal;