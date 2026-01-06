// src/components/top-secret/Proof.tsx
import { motion } from "framer-motion";
import { Building2, BarChart3, Bitcoin, Eye, ArrowUpRight } from "lucide-react";

const proofCards = [
  {
    icon: Building2,
    category: "Company Analysis",
    title: "Why NVDA dropped on a beat",
    description: "Earnings crushed estimates. Stock fell 8%. Here's what guidance revealed that headlines ignored — and how institutions positioned before the move.",
    color: "emerald",
    borderColor: "border-emerald-500/30",
    bgGlow: "bg-emerald-500/10"
  },
  {
    icon: BarChart3,
    category: "Economic Report",
    title: "What CPI actually changed",
    description: "Inflation came in hot. Bonds sold off. But the Fed's reaction function shifted — here's the bias change that mattered more than the print.",
    color: "blue",
    borderColor: "border-blue-500/30",
    bgGlow: "bg-blue-500/10"
  },
  {
    icon: Bitcoin,
    category: "Crypto Report",
    title: "BTC correlation breakdown",
    description: "Risk-on rally, but BTC lagged. On-chain showed whale accumulation while retail sold. The setup before the 40% move.",
    color: "orange",
    borderColor: "border-orange-500/30",
    bgGlow: "bg-orange-500/10"
  }
];

const Proof = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background with gold warmth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#14110A] to-[#0A0A0A]" />

      {/* Multiple gold glows - stronger */}
      <div className="absolute top-1/2 right-0 w-[600px] h-[800px] bg-[#C9A646]/[0.10] rounded-full blur-[140px]" />
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-[#D4AF37]/[0.08] rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-1/2 w-[700px] h-[400px] bg-[#C9A646]/[0.06] rounded-full blur-[130px]" />

      {/* Animated grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(#C9A646 1px, transparent 1px), linear-gradient(90deg, #C9A646 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      {/* Top border */}
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
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10 border border-[#C9A646]/20 rounded-full mb-6">
            <Eye className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] text-sm font-medium">Real Examples</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            See what others miss.
          </h2>
          <p className="text-slate-400 text-lg">
            Here's how each report type delivers actionable insights
          </p>
        </motion.div>

        {/* ============================================
            PROOF CARDS
            ============================================ */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {proofCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30, rotateX: 10 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group relative"
            >
              {/* Hover glow effect */}
              <div className={`absolute inset-0 ${card.bgGlow} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className={`relative h-full p-6 rounded-2xl bg-[#141414]/90 backdrop-blur-sm border border-slate-800 group-hover:${card.borderColor} transition-all duration-300`}>
                {/* Category badge with icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl ${card.bgGlow} flex items-center justify-center`}>
                      <card.icon className="w-5 h-5 text-[#C9A646]" />
                    </div>
                    <span className="text-[#C9A646] text-xs font-semibold uppercase tracking-wider">
                      {card.category}
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-[#C9A646] transition-colors" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-white mb-3">
                  {card.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {card.description}
                </p>

                {/* Bottom animated line */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden rounded-b-2xl">
                  <motion.div
                    className="h-full bg-gradient-to-r from-transparent via-[#C9A646] to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 1, ease: 'easeInOut' }}
                  />
                </div>
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
          className="text-center"
        >
          <div className="inline-flex items-center gap-4 px-6 py-4 bg-[#141414]/80 backdrop-blur-sm border border-[#C9A646]/20 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A646] to-[#D4AF37] flex items-center justify-center">
              <span className="text-black font-bold text-lg">E</span>
            </div>
            <div className="text-left">
              <p className="text-white font-medium">
                "This is the same framework I use before I risk my own capital."
              </p>
              <p className="text-slate-500 text-sm">
                I don't publish content. I document decisions.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Proof;
