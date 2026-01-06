// src/components/top-secret/Exclusivity.tsx
import { motion } from "framer-motion";
import { Lock, Users } from "lucide-react";

const Exclusivity = () => {
  return (
    <section className="relative py-20 md:py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0D0D0D] to-[#0A0A0A]" />

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/20 to-transparent" />

      <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Exclusive badge */}
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-2xl backdrop-blur-xl mb-6">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#C9A646]" />
              <Users className="w-5 h-5 text-[#C9A646]" />
            </div>
            <div className="w-px h-6 bg-[#C9A646]/30" />
            <p className="text-lg md:text-xl text-slate-200">
              <span className="text-[#C9A646] font-semibold">TOP SECRET</span> is intentionally kept small.
            </p>
          </div>

          <p className="text-lg text-slate-400 mb-4">
            This isn't mass-market content.
          </p>

          <p className="text-slate-500 text-sm">
            Access may close at any time.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Exclusivity;
