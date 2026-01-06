// src/components/top-secret/WhatIsTopSecret.tsx
import { motion } from "framer-motion";
import { BarChart3, Building2, Compass, Target } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Monthly macro conclusions",
    description: "ISM, CPI, NFP — decoded into actionable insights"
  },
  {
    icon: Building2,
    title: "Deep company research",
    description: "Beyond headlines, into what actually moves price"
  },
  {
    icon: Compass,
    title: "Clear directional bias",
    description: "Not opinions — structured conclusions you can trade"
  },
  {
    icon: Target,
    title: "Built for decision-makers",
    description: "Written for action, not content consumption"
  }
];

const WhatIsTopSecret = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background with gold warmth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#13100A] to-[#0A0A0A]" />

      {/* Gold glows */}
      <div className="absolute top-1/3 left-0 w-[500px] h-[600px] bg-[#C9A646]/[0.08] rounded-full blur-[130px]" />
      <div className="absolute bottom-1/4 right-0 w-[450px] h-[500px] bg-[#D4AF37]/[0.07] rounded-full blur-[120px]" />
      <div className="absolute top-0 left-1/2 w-[400px] h-[300px] bg-[#C9A646]/[0.05] rounded-full blur-[100px]" />

      {/* Top border accent */}
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
            What is <span className="text-[#C9A646]">TOP SECRET</span>?
          </h2>
        </motion.div>

        {/* ============================================
            FEATURE GRID - Outcome-oriented
            ============================================ */}
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative p-6 rounded-2xl bg-[#141414] border border-slate-800 hover:border-[#C9A646]/30 transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-[#C9A646]/10 border border-[#C9A646]/20 flex items-center justify-center mb-4 group-hover:border-[#C9A646]/40 transition-colors">
                <feature.icon className="w-6 h-6 text-[#C9A646]" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-400">
                {feature.description}
              </p>

              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#C9A646]/0 via-[#C9A646]/5 to-[#C9A646]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatIsTopSecret;
