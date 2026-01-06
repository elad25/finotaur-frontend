// src/components/top-secret/PainAmplification.tsx
import { motion } from "framer-motion";
import { AlertCircle, Brain, Clock, Users } from "lucide-react";

const painPoints = [
  {
    icon: AlertCircle,
    text: "You read CPI, ISM, earnings — and still hesitate."
  },
  {
    icon: Brain,
    text: "You consume more data, but trust yourself less."
  },
  {
    icon: Clock,
    text: "You know what happened, not what to do next."
  },
  {
    icon: Users,
    text: "Everyone sees the same information — and gets the same results."
  }
];

const PainAmplification = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background with gold warmth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#14110A] to-[#0A0A0A]" />

      {/* Gold glows - stronger */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#C9A646]/[0.10] rounded-full blur-[140px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#D4AF37]/[0.08] rounded-full blur-[120px]" />
      <div className="absolute top-0 right-0 w-[300px] h-[400px] bg-[#C9A646]/[0.06] rounded-full blur-[100px]" />

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />

      <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10">
        {/* ============================================
            HEADLINE - Empathetic, not accusatory
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            <span className="text-white">You're not confused.</span>
            <br />
            <span className="text-slate-400">You're overloaded.</span>
          </h2>
        </motion.div>

        {/* ============================================
            PAIN POINTS - Bullet list
            ============================================ */}
        <div className="space-y-6 mb-16">
          {painPoints.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex items-start gap-4 group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/20 flex items-center justify-center group-hover:border-[#C9A646]/40 transition-colors">
                <point.icon className="w-5 h-5 text-[#C9A646]" />
              </div>
              <p className="text-lg md:text-xl text-slate-300 leading-relaxed pt-1.5">
                {point.text}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ============================================
            🔥 MIRROR MOMENT - Gut punch line
            ============================================ */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-center mb-12"
        >
          <p className="text-xl md:text-2xl text-slate-400 italic">
            "You open your platform every morning…<br />
            <span className="text-white">and still don't know what matters today.</span>"
          </p>
        </motion.div>

        {/* ============================================
            STRONG CLOSING - The real problem
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center pt-8 border-t border-slate-800"
        >
          <p className="text-2xl md:text-3xl font-semibold">
            <span className="text-white">Information isn't the problem.</span>
            <br />
            <span className="text-[#C9A646]">Interpretation is.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PainAmplification;
