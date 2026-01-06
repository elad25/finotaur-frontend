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
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0b08] to-[#0a0a0a]" />

      {/* Subtle Gold Border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

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
