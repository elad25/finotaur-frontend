// src/components/top-secret/Proof.tsx
import { motion } from "framer-motion";
import { BarChart3, Building2, TrendingUp, Eye } from "lucide-react";

const proofCards = [
  {
    icon: BarChart3,
    category: "ISM",
    title: "What the data actually changed",
    description: "Breaking down the ISM print to show exactly how manufacturing sentiment shifted — and what it means for sector rotation."
  },
  {
    icon: Building2,
    category: "Company",
    title: "Why the headline was wrong",
    description: "Earnings beat expectations, stock dropped. Here's what the market saw that the headlines missed."
  },
  {
    icon: TrendingUp,
    category: "Macro",
    title: "How bias shifted before price reacted",
    description: "The bond market moved 3 days before equities. This is how to read the sequence."
  }
];

const Proof = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background with gold warmth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#110F09] to-[#0A0A0A]" />

      {/* Multiple gold glows */}
      <div className="absolute top-1/2 right-0 w-[500px] h-[700px] bg-[#C9A646]/[0.07] rounded-full blur-[130px]" />
      <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-[#D4AF37]/[0.05] rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-1/2 w-[600px] h-[300px] bg-[#C9A646]/[0.04] rounded-full blur-[120px]" />

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
        {/* ============================================
            HEADLINE
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10 border border-[#C9A646]/20 rounded-full mb-6">
            <Eye className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] text-sm font-medium">Process Proof</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            See what others miss.
          </h2>
        </motion.div>

        {/* ============================================
            PROOF CARDS
            ============================================ */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {proofCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group relative"
            >
              <div className="h-full p-6 rounded-2xl bg-[#141414] border border-slate-800 hover:border-[#C9A646]/30 transition-all duration-300">
                {/* Category badge */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 flex items-center justify-center">
                    <card.icon className="w-4 h-4 text-[#C9A646]" />
                  </div>
                  <span className="text-[#C9A646] text-sm font-semibold uppercase tracking-wide">
                    {card.category}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-white mb-3">
                  {card.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {card.description}
                </p>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#C9A646]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* ============================================
            👤 HUMAN PROOF - Personal presence
            ============================================ */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center space-y-3"
        >
          <p className="text-slate-300 text-lg">
            This is the same framework I use <span className="text-white font-medium">before I risk my own capital.</span>
          </p>
          <p className="text-slate-500 text-sm">
            I don't publish content. I document decisions.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Proof;
