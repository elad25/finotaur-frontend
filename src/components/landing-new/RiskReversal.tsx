// src/components/landing-new/RiskReversal.tsx
// ================================================
// 🔥 RISK REVERSAL SECTION
// Goal: Remove fear of buying
// ================================================

import { motion } from "framer-motion";
import { Shield, Lock } from "lucide-react";

const RiskReversal = () => {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Luxury Background with Gold Undertone */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100d08] to-[#0a0a0a]" />

      {/* Gold Border Lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />

      {/* Enhanced Gold Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#C9A646]/[0.12] rounded-full blur-[150px]" />
      <div className="absolute top-1/3 left-1/3 w-[450px] h-[350px] bg-[#D4AF37]/[0.08] rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[300px] bg-[#F4D97B]/[0.06] rounded-full blur-[100px]" />

      <div className="max-w-3xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.05) 100%)',
                border: '1px solid rgba(201,166,70,0.3)',
                boxShadow: '0 0 40px rgba(201,166,70,0.15)',
              }}
            >
              <Shield className="w-8 h-8 text-[#C9A646]" />
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            No pressure. No lock-in.
          </h2>

          {/* Text */}
          <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-8">
            Join TOP SECRET.
            <br />
            If it doesn't change how you think about the market —{' '}
            <span className="text-white font-semibold">cancel anytime</span>.
          </p>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-500 text-sm">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#C9A646]" />
              <span>Secure payment</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#C9A646]" />
              <span>14-day free trial</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            <span>Cancel in one click</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RiskReversal;
