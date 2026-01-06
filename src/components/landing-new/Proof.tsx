// src/components/landing-new/Proof.tsx
import { motion } from "framer-motion";
import { TrendingUp, BarChart3, FileText, Quote } from "lucide-react";

const Proof = () => {
  const proofItems = [
    {
      icon: BarChart3,
      title: "ISM Analysis",
      description: "Monthly macro breakdown with clear market implications",
      badge: "Macro",
    },
    {
      icon: FileText,
      title: "Company Deep Dives",
      description: "Fundamental analysis that reveals what others miss",
      badge: "Research",
    },
    {
      icon: TrendingUp,
      title: "Market Bias Reports",
      description: "Actionable conclusions, not endless data",
      badge: "Insights",
    },
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1118] via-[#1A1713] to-[#0D1118]" />

      {/* Glow effects */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#C9A646]/[0.06] rounded-full blur-[180px]" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-[#D4BF8E]/[0.04] rounded-full blur-[150px]" />

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
            What's Inside
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-tight">
            Conclusions others
            <span className="block text-[#C9A646] mt-2">don't see</span>
          </h2>
        </motion.div>

        {/* Proof Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {proofItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group"
            >
              <div className="relative p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/50 hover:border-[#C9A646]/40 transition-all duration-500 h-full overflow-hidden">
                {/* Background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Badge */}
                <div className="absolute top-6 right-6">
                  <span className="px-3 py-1 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full text-[#C9A646] text-xs font-semibold">
                    {item.badge}
                  </span>
                </div>

                {/* Icon */}
                <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-[#C9A646]/20 to-[#C9A646]/5 border border-[#C9A646]/30 flex items-center justify-center mb-6">
                  <item.icon className="w-8 h-8 text-[#C9A646]" />
                </div>

                {/* Content */}
                <h3 className="relative text-2xl font-semibold text-white mb-3">
                  {item.title}
                </h3>
                <p className="relative text-slate-400 leading-relaxed text-lg">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Authority Quote */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative max-w-3xl mx-auto"
        >
          <div className="relative p-10 md:p-12 rounded-3xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-[#C9A646]/20">
            {/* Quote icon */}
            <div className="absolute -top-6 left-10">
              <div className="w-12 h-12 rounded-full bg-[#C9A646] flex items-center justify-center shadow-lg shadow-[#C9A646]/30">
                <Quote className="w-6 h-6 text-black" />
              </div>
            </div>

            {/* Quote content */}
            <blockquote className="text-2xl md:text-3xl font-light text-white leading-relaxed mb-8 pt-4">
              "This is how I personally build my market bias.
              <span className="block mt-4 text-[#C9A646]">
                Every decision I make starts here."
              </span>
            </blockquote>

            {/* Author */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C9A646] to-[#D4AF37] flex items-center justify-center">
                <span className="text-black font-bold text-xl">F</span>
              </div>
              <div>
                <div className="text-white font-semibold text-lg">Finotaur</div>
                <div className="text-slate-400 text-sm">Founder & Lead Analyst</div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#C9A646]/[0.05] rounded-tl-full" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Proof;
