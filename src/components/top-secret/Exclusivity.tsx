// src/components/top-secret/Exclusivity.tsx
import { motion } from "framer-motion";
import { Lock, Users } from "lucide-react";

const Exclusivity = () => {
  return (
    <section className="relative py-20 md:py-24 overflow-hidden">
      {/* Background with gold tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#100E09] to-[#0A0A0A]" />

      {/* Gold glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#C9A646]/[0.07] rounded-full blur-[100px]" />
      <div className="absolute top-0 left-1/3 w-[200px] h-[200px] bg-[#D4AF37]/[0.04] rounded-full blur-[80px]" />

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

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
