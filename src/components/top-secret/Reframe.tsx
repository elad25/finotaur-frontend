// src/components/top-secret/Reframe.tsx
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

const Reframe = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background with strong gold tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#12100A] to-[#0A0A0A]" />

      {/* Multiple gold glows for stronger effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#C9A646]/[0.08] rounded-full blur-[120px]" />
      <div className="absolute top-0 left-1/3 w-[300px] h-[300px] bg-[#D4AF37]/[0.06] rounded-full blur-[100px]" />
      <div className="absolute bottom-0 right-1/3 w-[350px] h-[350px] bg-[#C9A646]/[0.05] rounded-full blur-[90px]" />

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />

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
