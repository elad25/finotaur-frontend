// src/components/landing-new/ProductShowcase.tsx
// ================================================
// 🔥 PROOF SECTION (Process Proof)
// Goal: Show you know what you're doing without promising profits
// ================================================

import { motion } from "framer-motion";
import { TrendingUp, Building2, Globe, Eye } from "lucide-react";

const proofExamples = [
  {
    icon: TrendingUp,
    category: "ISM Report",
    title: "What the data actually changed",
    description: "Manufacturing PMI dropped to 47.4 — but new orders component showed early bottoming. Bias shifted bullish before consensus caught on.",
    accent: "#F59E0B",
  },
  {
    icon: Building2,
    category: "Company Deep Dive",
    title: "Why the headline was wrong",
    description: "Media called it a 'miss' on earnings. The actual story: margin expansion + guide raise buried in footnotes. Stock up 23% in 2 weeks.",
    accent: "#A855F7",
  },
  {
    icon: Globe,
    category: "Macro Outlook",
    title: "How bias shifted before price reacted",
    description: "Fed minutes suggested pivot. Market priced it in 3 days later. TOP SECRET readers were positioned before the move.",
    accent: "#06B6D4",
  },
];

const ProductShowcase = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Luxury Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0b08] to-[#0a0a0a]" />

      {/* Gold Border Lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/25 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/20 to-transparent" />

      {/* Enhanced Gold Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#C9A646]/[0.07] rounded-full blur-[160px]" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#D4AF37]/[0.05] rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] bg-[#F4D97B]/[0.04] rounded-full blur-[100px]" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full mb-6">
            <Eye className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-sm">Process, Not Promises</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            See what others miss.
          </h2>
        </motion.div>

        {/* Proof Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          {proofExamples.map((example, index) => {
            const Icon = example.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.15 }}
                className="group"
              >
                <div
                  className="h-full rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(180deg, #151515 0%, #0A0A0A 100%)',
                    border: `1px solid ${example.accent}30`,
                    boxShadow: `0 0 40px ${example.accent}10`,
                  }}
                >
                  {/* Top Bar */}
                  <div
                    className="h-1 w-16 rounded-full mb-6"
                    style={{ background: example.accent }}
                  />

                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: `${example.accent}20`,
                      border: `1px solid ${example.accent}40`,
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: example.accent }} />
                  </div>

                  {/* Category */}
                  <p className="text-sm font-semibold mb-2" style={{ color: example.accent }}>
                    {example.category}
                  </p>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-3">
                    {example.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {example.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Caption */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <p className="text-slate-500 italic">
            This is how I personally build my market bias.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductShowcase;
