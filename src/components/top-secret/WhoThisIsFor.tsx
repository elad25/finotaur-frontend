// src/components/top-secret/WhoThisIsFor.tsx
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const forItems = [
  "Traders & investors who want clarity, not content",
  "People willing to pay to think less and decide better",
  "Those tired of second-guessing every move"
];

const notForItems = [
  "Signal hunters",
  "Get-rich-quick mindset",
  "People who want certainty instead of probabilities"
];

const WhoThisIsFor = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background with gold tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#14110A] to-[#0A0A0A]" />

      {/* Gold glows - stronger */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-[#C9A646]/[0.09] rounded-full blur-[130px]" />
      <div className="absolute bottom-1/4 right-0 w-[450px] h-[450px] bg-[#C9A646]/[0.08] rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-[#D4AF37]/[0.06] rounded-full blur-[100px]" />

      {/* Diagonal lines pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `repeating-linear-gradient(45deg, #C9A646 0, #C9A646 1px, transparent 1px, transparent 30px)`,
      }} />

      {/* Animated divider line between the two columns concept */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-[200px] overflow-hidden hidden md:block">
        <motion.div
          className="w-full h-full bg-gradient-to-b from-transparent via-[#C9A646]/40 to-transparent"
          animate={{
            y: ['-100%', '100%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />

      <div className="max-w-5xl mx-auto px-6 lg:px-8 relative z-10">
        {/* ============================================
            HEADLINE
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            This is <span className="text-slate-400">not</span> for everyone.
          </h2>
        </motion.div>

        {/* ============================================
            TWO COLUMNS
            ============================================ */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* FOR Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="p-8 rounded-2xl bg-[#141414] border border-emerald-500/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-emerald-400">For</h3>
            </div>

            <ul className="space-y-4">
              {forItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* NOT FOR Column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="p-8 rounded-2xl bg-[#141414] border border-red-500/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-red-400">Not For</h3>
            </div>

            <ul className="space-y-4">
              {notForItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-400">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WhoThisIsFor;
