// src/components/landing-new/BeforeAfter.tsx
// ================================================
// 🔥 PAIN AMPLIFICATION SECTION
// Goal: Make visitor say "Yes... that's me"
// ================================================

import { motion } from "framer-motion";
import { AlertCircle, Brain, Clock, Users } from "lucide-react";

const painPoints = [
  {
    icon: Brain,
    text: "You read CPI, ISM, earnings — and still hesitate.",
  },
  {
    icon: Clock,
    text: "You consume more data, but trust yourself less.",
  },
  {
    icon: AlertCircle,
    text: "You know what happened, not what to do next.",
  },
  {
    icon: Users,
    text: "Everyone sees the same information — and gets the same results.",
  },
];

const BeforeAfter = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Luxury Dark Background with Rich Gold Undertone */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100c08] to-[#0a0a0a]" />

      {/* Stronger Gold Border Lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />

      {/* Enhanced Gold Ambient Glows */}
      <div className="absolute top-1/4 left-1/6 w-[600px] h-[500px] bg-[#C9A646]/[0.10] rounded-full blur-[160px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#D4AF37]/[0.08] rounded-full blur-[140px]" />
      <div className="absolute top-1/2 right-1/3 w-[400px] h-[350px] bg-[#F4D97B]/[0.06] rounded-full blur-[120px]" />

      {/* Subtle Red Glow for Pain */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-red-500/[0.015] rounded-full blur-[150px]" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            <span className="text-white block">You're not confused.</span>
            <span className="text-slate-500 block">You're overloaded.</span>
          </h2>
        </motion.div>

        {/* Pain Points */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-6 mb-16"
        >
          {painPoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-5 p-5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-red-500/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-red-400/80" />
                </div>
                <p className="text-lg md:text-xl text-slate-300 leading-relaxed">
                  {point.text}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Closing Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <div
            className="inline-block p-8 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.02) 100%)',
              border: '1px solid rgba(201,166,70,0.2)',
            }}
          >
            <p className="text-2xl md:text-3xl font-semibold text-white mb-2">
              Information isn't the problem.
            </p>
            <p className="text-2xl md:text-3xl font-bold text-[#C9A646]">
              Interpretation is.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BeforeAfter;
