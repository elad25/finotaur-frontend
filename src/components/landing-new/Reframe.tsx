// src/components/landing-new/Reframe.tsx
// ================================================
// 🔥 REFRAME SECTION
// Goal: Shift perception - "The problem isn't you"
// ================================================

import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

const Reframe = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Luxury Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0b08] to-[#0a0a0a]" />

      {/* Gold Border Lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/25 to-transparent" />

      {/* Enhanced Gold Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#C9A646]/[0.10] rounded-full blur-[140px]" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-[#D4AF37]/[0.06] rounded-full blur-[100px]" />
      <div className="absolute bottom-1/3 left-1/4 w-[350px] h-[250px] bg-[#F4D97B]/[0.04] rounded-full blur-[90px]" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.05) 100%)',
              border: '1px solid rgba(201,166,70,0.3)',
              boxShadow: '0 0 60px rgba(201,166,70,0.2)',
            }}
          >
            <Lightbulb className="w-10 h-10 text-[#C9A646]" />
          </div>
        </motion.div>

        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            <span className="text-slate-400 block mb-2">The market doesn't reward information.</span>
            <span className="text-white block">
              It rewards{' '}
              <span className="text-[#C9A646]">conclusions</span>.
            </span>
          </h2>
        </motion.div>

        {/* Supporting Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-xl text-slate-400 leading-relaxed">
              Most traders drown in data.
            </p>
            <p className="text-xl text-slate-300 leading-relaxed">
              Institutions distill it into{' '}
              <span className="text-white font-semibold">bias</span> and{' '}
              <span className="text-white font-semibold">direction</span>.
            </p>
            <p className="text-xl text-[#C9A646] font-semibold leading-relaxed pt-4">
              TOP SECRET exists to bridge that gap.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Reframe;
