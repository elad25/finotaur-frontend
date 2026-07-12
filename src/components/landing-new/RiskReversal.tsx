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
    <section className="py-4 md:py-6 px-4 relative overflow-hidden bg-section-base">
      {/* Ambient gold atmosphere — richer warmth behind the card */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[280px] bg-gold-primary/[0.06] rounded-full blur-[110px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl mx-auto p-ds-6 relative overflow-hidden rounded-xl animate-gold-border-shimmer"
          style={{
            background:
              'linear-gradient(135deg, rgba(20,20,20,0.85) 0%, rgba(12,12,12,0.7) 100%) padding-box, linear-gradient(135deg, rgba(230,195,100,0.4) 0%, rgba(201,166,70,0.15) 50%, rgba(230,195,100,0.3) 100%) border-box',
            border: '1.5px solid transparent',
            backgroundSize: '200% 200%',
            boxShadow:
              '0 12px 32px rgba(201,166,70,0.2), 0 0 60px rgba(201,166,70,0.12), inset 0 1px 0 rgba(255,230,160,0.12)',
          }}
        >
          {/* Inner gold tint */}
          <div className="absolute inset-0 bg-gold-primary/[0.04] pointer-events-none" aria-hidden="true" />

          {/* Top-edge gold light bar */}
          <span
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              top: '-1px',
              width: '70%',
              height: '2px',
              borderRadius: '2px',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,220,140,0.3) 20%, rgba(255,230,160,0.9) 50%, rgba(255,220,140,0.3) 80%, transparent 100%)',
              filter: 'blur(0.5px)',
              zIndex: 2,
            }}
            aria-hidden="true"
          />

          {/* Flagship corner brackets */}
          <span className="absolute pointer-events-none" style={{ top: '10px', left: '10px', width: '14px', height: '14px', borderTop: '1px solid rgba(255,220,140,0.7)', borderLeft: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />
          <span className="absolute pointer-events-none" style={{ top: '10px', right: '10px', width: '14px', height: '14px', borderTop: '1px solid rgba(255,220,140,0.7)', borderRight: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />
          <span className="absolute pointer-events-none" style={{ bottom: '10px', left: '10px', width: '14px', height: '14px', borderBottom: '1px solid rgba(255,220,140,0.7)', borderLeft: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />
          <span className="absolute pointer-events-none" style={{ bottom: '10px', right: '10px', width: '14px', height: '14px', borderBottom: '1px solid rgba(255,220,140,0.7)', borderRight: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />

          <div className="relative z-[3] flex flex-col items-center gap-4">
            {/* Shield + headline — inline compact */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center relative shrink-0 bg-gradient-to-br from-gold-primary/30 to-gold-primary/10 border border-gold-primary/40"
                style={{ boxShadow: '0 0 16px rgba(201,166,70,0.25)' }}
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
                  className="flex items-center gap-1.5 rounded-full border border-gold-primary/40 bg-gold-primary/[0.08] px-3 py-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-gold-primary shrink-0" />
                  <span className="text-ink-secondary text-xs">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RiskReversal;