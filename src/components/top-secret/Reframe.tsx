// src/components/top-secret/Reframe.tsx
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

const Reframe = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background with subtle gold tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0F0D09] to-[#0A0A0A]" />

      {/* Gold glow accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#C9A646]/[0.05] rounded-full blur-[100px]" />

      <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10">
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
            <Lightbulb className="w-8 h-8 text-[#C9A646]" />
          </div>
        </motion.div>

        {/* ============================================
            HEADLINE - Perception shift
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            <span className="text-white">The market doesn't reward information.</span>
            <br />
            <span className="text-[#C9A646]">It rewards conclusions.</span>
          </h2>
        </motion.div>

        {/* ============================================
            SUPPORTING TEXT
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center"
        >
          <p className="text-xl md:text-2xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Most traders drown in data.
            <br />
            Institutions distill it into bias and direction.
            <br />
            <span className="text-white font-medium">TOP SECRET exists to bridge that gap.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Reframe;
