// src/components/landing-warzone/PainAmplification.tsx
import { motion } from "framer-motion";
import { AlertTriangle, Brain, TrendingDown, Clock, Frown } from "lucide-react";

/**
 * 🔥 Pain Amplification Section
 *
 * Based on Hormozi: "If they don't feel stupid or frustrated without you – they won't buy."
 *
 * This section makes the reader feel the pain of their current situation
 * in an embarrassingly specific way.
 */
const PainAmplification = () => {
  const painPoints = [
    {
      icon: Brain,
      pain: "You read CPI, NFP, earnings — and still freeze when it's time to act.",
      color: "#ef4444"
    },
    {
      icon: TrendingDown,
      pain: "You consume more information than ever, yet your confidence keeps shrinking.",
      color: "#f97316"
    },
    {
      icon: Clock,
      pain: "You spend hours on research, then second-guess yourself in seconds.",
      color: "#eab308"
    },
    {
      icon: Frown,
      pain: "You know more than most traders... and trust yourself less.",
      color: "#C9A646"
    }
  ];

  return (
    <section className="relative py-20 px-4 overflow-hidden">
      {/* Dark Background with Red Accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0C] via-[#0D0A0A] to-[#0A0A0C]" />

      {/* Danger Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-red-900/10 rounded-full blur-[150px]" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full mb-6">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">Sound Familiar?</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Here's what your trading life looks like
            <span className="text-red-400"> without clarity</span>
          </h2>
        </motion.div>

        {/* Pain Points */}
        <div className="space-y-4">
          {painPoints.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div
                className="relative p-6 rounded-xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/[0.08] backdrop-blur-sm transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/5"
                style={{
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                    style={{
                      background: `${item.color}15`,
                      border: `1px solid ${item.color}40`
                    }}
                  >
                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <p className="text-lg md:text-xl text-slate-300 font-medium leading-relaxed">
                    "{item.pain}"
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-xl md:text-2xl text-slate-400">
            The problem isn't <span className="text-white font-semibold">lack of information</span>.
          </p>
          <p className="text-2xl md:text-3xl text-white font-bold mt-2">
            It's <span className="text-[#C9A646]">lack of conclusions</span>.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PainAmplification;
