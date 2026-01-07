// src/components/landing-new/Scarcity.tsx
// ================================================
// 🔥 SCARCITY / EXCLUSIVITY SECTION
// Goal: Create urgency without being cheap
// ================================================

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

const Scarcity = () => {
  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Luxury Background with Gold Undertone */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />

      {/* Stronger Gold Border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/45 to-transparent" />

      {/* Enhanced Gold Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#C9A646]/[0.12] rounded-full blur-[140px]" />
      <div className="absolute top-1/3 right-1/3 w-[350px] h-[250px] bg-[#D4AF37]/[0.08] rounded-full blur-[100px]" />
      <div className="absolute bottom-1/3 left-1/3 w-[300px] h-[200px] bg-[#F4D97B]/[0.06] rounded-full blur-[90px]" />

      <div className="max-w-3xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Lock Icon */}
          <div className="flex justify-center mb-4">
            <Lock className="w-6 h-6 text-[#C9A646]/60" />
          </div>

          {/* Text */}
          <p className="text-lg text-slate-400 leading-relaxed">
            <span className="text-[#C9A646] font-semibold">TOP SECRET</span> is intentionally kept small.
            <br />
            <span className="text-slate-500">This isn't mass-market content.</span>
          </p>

          <p className="text-sm text-slate-600 mt-4 italic">
            Access may close at any time.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Scarcity;
