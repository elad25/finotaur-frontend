// src/components/landing-new/ForWho.tsx
import { motion } from "framer-motion";
import { Target, Brain, Clock, CheckCircle } from "lucide-react";

const ForWho = () => {
  const targetAudience = [
    {
      icon: Target,
      title: "Tired of news without knowing what to do",
      description: "You read everything, understand nothing actionable. Headlines create confusion, not clarity.",
    },
    {
      icon: Brain,
      title: "Traders & investors who want a clear bias",
      description: "You need to know which direction the market is leaning before placing a trade. Not opinions — conclusions.",
    },
    {
      icon: Clock,
      title: "Ready to pay to think less and decide better",
      description: "Your time is money. You'd rather pay for curated intelligence than spend hours filtering noise.",
    },
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1118] via-[#0C0C0E] to-[#0D1118]" />

      {/* Subtle glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C9A646]/[0.05] rounded-full blur-[200px]" />

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full text-[#C9A646] text-sm font-semibold tracking-wide uppercase mb-6">
            Who is this for?
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-tight">
            TOP SECRET is for those who
            <span className="block text-[#C9A646] mt-2">want an edge</span>
          </h2>
        </motion.div>

        {/* Target Audience Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {targetAudience.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group relative"
            >
              <div className="relative p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-[#C9A646]/30 transition-all duration-500 h-full">
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-[#C9A646]/10 border border-[#C9A646]/30 flex items-center justify-center mb-6 group-hover:bg-[#C9A646]/20 transition-colors duration-300">
                  <item.icon className="w-7 h-7 text-[#C9A646]" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-white mb-4 leading-snug">
                  {item.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {item.description}
                </p>

                {/* Check mark */}
                <div className="absolute top-6 right-6">
                  <CheckCircle className="w-5 h-5 text-[#C9A646]/40 group-hover:text-[#C9A646] transition-colors duration-300" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-16"
        >
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            If you're still comparing features and prices — this isn't for you.
            <span className="block text-white font-medium mt-2">
              This is for people who buy outcomes, not tools.
            </span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ForWho;
