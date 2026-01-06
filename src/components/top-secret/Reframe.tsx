// src/components/top-secret/Reframe.tsx
import { motion } from "framer-motion";
import { Lightbulb, Sparkles } from "lucide-react";

const Reframe = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background with strong gold tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#16120A] to-[#0A0A0A]" />

      {/* Multiple gold glows - very strong */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#C9A646]/[0.12] rounded-full blur-[130px]" />
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-[#D4AF37]/[0.08] rounded-full blur-[110px]" />
      <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] bg-[#C9A646]/[0.07] rounded-full blur-[100px]" />

      {/* Radial lines emanating from center - insight metaphor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-[2px] h-[200px] bg-gradient-to-b from-[#C9A646]/20 to-transparent origin-bottom"
            style={{
              transform: `rotate(${i * 30}deg) translateY(-100%)`,
            }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
              scaleY: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
      </div>

      {/* Floating sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${20 + i * 15}%`,
              top: `${25 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [0, -15, 0],
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2.5 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          >
            <Sparkles className="w-4 h-4 text-[#C9A646]/30" />
          </motion.div>
        ))}
      </div>

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />

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
