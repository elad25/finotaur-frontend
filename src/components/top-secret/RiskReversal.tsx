// src/components/top-secret/RiskReversal.tsx
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

const RiskReversal = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background with gold tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#16120A] to-[#0A0A0A]" />

      {/* Gold glows - very strong */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#C9A646]/[0.12] rounded-full blur-[130px]" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-[#D4AF37]/[0.08] rounded-full blur-[110px]" />
      <div className="absolute bottom-0 left-1/4 w-[350px] h-[350px] bg-[#C9A646]/[0.09] rounded-full blur-[100px]" />

      {/* Animated shield rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-[#C9A646]/10"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              left: `${-(100 + i * 50)}px`,
              top: `${-(100 + i * 50)}px`,
            }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />

      <div className="max-w-3xl mx-auto px-6 lg:px-8 relative z-10 text-center">
        {/* ============================================
            ICON with pulsing ring
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            {/* Pulsing ring */}
            <motion.div
              className="absolute inset-0 rounded-2xl bg-[#C9A646]/20"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <div className="relative w-16 h-16 rounded-2xl bg-[#C9A646]/10 border border-[#C9A646]/30 flex items-center justify-center">
              <Shield className="w-8 h-8 text-[#C9A646]" />
            </div>
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
