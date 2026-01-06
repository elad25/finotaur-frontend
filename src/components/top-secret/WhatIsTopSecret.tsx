// src/components/top-secret/WhatIsTopSecret.tsx
import { motion } from "framer-motion";
import { Building2, BarChart3, Bitcoin, TrendingUp, FileText, Zap } from "lucide-react";

const reportTypes = [
  {
    icon: Building2,
    title: "Company Analysis",
    description: "Deep dive into earnings, fundamentals, and what the market really sees",
    color: "emerald",
    gradient: "from-emerald-500/20 to-emerald-500/5"
  },
  {
    icon: BarChart3,
    title: "Economic Reports",
    description: "ISM, CPI, NFP, FOMC — decoded into clear directional bias",
    color: "blue",
    gradient: "from-blue-500/20 to-blue-500/5"
  },
  {
    icon: Bitcoin,
    title: "Crypto Reports",
    description: "On-chain analysis, macro correlation, and institutional flows",
    color: "orange",
    gradient: "from-orange-500/20 to-orange-500/5"
  }
];

const features = [
  {
    icon: TrendingUp,
    text: "Clear directional bias — not opinions"
  },
  {
    icon: FileText,
    text: "Written for decision-makers"
  },
  {
    icon: Zap,
    text: "Actionable conclusions you can trade"
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

      {/* Animated floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-[#C9A646]/30 rounded-full"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
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
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            What is <span className="text-[#C9A646]">TOP SECRET</span>?
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Three types of institutional-grade research, delivered monthly
          </p>
        </motion.div>

        {/* ============================================
            REPORT TYPES - 3 Cards
            ============================================ */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {reportTypes.map((report, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group relative"
            >
              {/* Card glow on hover */}
              <div className={`absolute inset-0 bg-gradient-to-b ${report.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative h-full p-6 rounded-2xl bg-[#141414]/80 backdrop-blur-sm border border-slate-800 hover:border-[#C9A646]/40 transition-all duration-300">
                {/* Icon with animated ring */}
                <div className="relative w-16 h-16 mb-5">
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${report.gradient} animate-pulse`} style={{ animationDuration: '3s' }} />
                  <div className="relative w-full h-full rounded-2xl bg-[#1a1a1a] border border-slate-700 flex items-center justify-center group-hover:border-[#C9A646]/40 transition-colors">
                    <report.icon className="w-8 h-8 text-[#C9A646]" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-3">
                  {report.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {report.description}
                </p>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* ============================================
            ADDITIONAL FEATURES
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-6 md:gap-10"
        >
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 border border-[#C9A646]/20 flex items-center justify-center">
                <feature.icon className="w-4 h-4 text-[#C9A646]" />
              </div>
              <span className="text-slate-300 text-sm">{feature.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default WhatIsTopSecret;
