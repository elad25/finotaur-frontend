// src/components/top-secret/RiskReversal.tsx
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

const RiskReversal = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background with subtle gold */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0F0D09] to-[#0A0A0A]" />

      {/* Gold glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#C9A646]/[0.06] rounded-full blur-[100px]" />

      <div className="max-w-3xl mx-auto px-6 lg:px-8 relative z-10 text-center">
        {/* ============================================
            ICON
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#C9A646]/10 border border-[#C9A646]/30 flex items-center justify-center">
            <Shield className="w-8 h-8 text-[#C9A646]" />
          </div>
        </motion.div>

        {/* ============================================
            HEADLINE
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            No pressure. No lock-in.
          </h2>
        </motion.div>

        {/* ============================================
            TEXT
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <p className="text-xl md:text-2xl text-slate-300 leading-relaxed">
            Join TOP SECRET.
            <br />
            If it doesn't change how you think about the market —
            <br />
            <span className="text-[#C9A646] font-medium">cancel anytime.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default RiskReversal;
