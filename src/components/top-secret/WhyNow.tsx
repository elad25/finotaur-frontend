// src/components/top-secret/WhyNow.tsx
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

const WhyNow = () => {
  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      {/* Background with gold warmth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#110F0A] to-[#0A0A0A]" />

      {/* Gold glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[250px] bg-[#C9A646]/[0.06] rounded-full blur-[90px]" />
      <div className="absolute bottom-0 right-1/4 w-[200px] h-[200px] bg-[#D4AF37]/[0.05] rounded-full blur-[70px]" />

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/25 to-transparent" />

      <div className="max-w-3xl mx-auto px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-6"
        >
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-xl bg-[#C9A646]/10 border border-[#C9A646]/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-[#C9A646]" />
            </div>
          </div>

          {/* ⏳ Soft urgency - not aggressive */}
          <div className="space-y-4">
            <p className="text-2xl md:text-3xl text-white font-semibold">
              The market doesn't wait for certainty.
            </p>
            <p className="text-lg text-slate-400">
              Every month without clarity compounds mistakes.
            </p>
            <p className="text-slate-500">
              The cost isn't the subscription — <span className="text-[#C9A646]">it's staying reactive.</span>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyNow;
