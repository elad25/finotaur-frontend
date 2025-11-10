import { X, Check, ArrowRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const BeforeAfter = () => {
  const beforeItems = [
    "Overtrading from emotion",
    "No clear risk rules",
    "Guesswork on which setups win"
  ];

  const afterItems = [
    "Controlled position sizing",
    "AI highlights profitable setups",
    "Weekly plan + real behavior alerts"
  ];

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Pure Black Background */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      
      {/* Subtle Gold Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#C9A646]/[0.08] rounded-full blur-[150px]" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-slate-400">Before</span>
            <span className="mx-4 text-[#C9A646]">→</span>
            <span className="text-white">After</span>
          </h2>
          <p className="text-xl text-slate-400">
            See what changes when data meets discipline
          </p>
        </motion.div>

        {/* Comparison Container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          {/* Gold Border Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#C9A646]/20 via-[#C9A646]/40 to-[#C9A646]/20 rounded-2xl blur-xl" />

          {/* Content Grid */}
          <div className="relative grid md:grid-cols-2 gap-px bg-gradient-to-r from-[#C9A646]/30 via-[#C9A646]/50 to-[#C9A646]/30 rounded-2xl overflow-hidden">
            
            {/* ============================================
                BEFORE Column (Left)
                ============================================ */}
            <div className="bg-[#0f0f0f] backdrop-blur-xl p-8 md:p-12">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full mb-4">
                  <X className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-medium text-sm">Without Finotaur</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-3">Trading Blind</h3>
                <p className="text-slate-500 text-lg">Patterns you can't see are patterns that repeat</p>
              </div>

              <ul className="space-y-5">
                {beforeItems.map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-start gap-4 group"
                  >
                    <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                      <X className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-slate-300 text-lg leading-relaxed">{item}</span>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-14 pt-8 border-t border-white/5">
                <div className="text-sm text-slate-600 italic">
                  "I kept making the same mistakes..."
                </div>
              </div>
            </div>

            {/* ============================================
                AFTER Column (Right) - GOLD ACCENT
                ============================================ */}
            <div className="bg-[#0a0a0a] p-8 md:p-12 relative overflow-hidden">
              {/* Gold Glow Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/10 via-transparent to-[#C9A646]/5 pointer-events-none" />
              
              {/* Gold Light Effect */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A646]/10 rounded-full blur-[100px]" />
              
              <div className="mb-8 relative">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A646]/20 border border-[#C9A646]/40 rounded-full mb-4 shadow-lg shadow-[#C9A646]/10">
                  <Check className="w-4 h-4 text-[#C9A646]" />
                  <span className="text-[#C9A646] font-medium text-sm">With Finotaur</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-3">Trading Smart</h3>
                <p className="text-slate-400 text-lg">Every trade teaches. Every pattern is clear.</p>
              </div>

              <ul className="space-y-5 relative">
                {afterItems.map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-start gap-4 group"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#C9A646]/30 border border-[#C9A646]/50 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 group-hover:bg-[#C9A646]/40 transition-all shadow-lg shadow-[#C9A646]/10">
                      <Check className="w-4 h-4 text-[#C9A646]" />
                    </div>
                    <span className="text-white text-lg leading-relaxed font-medium">{item}</span>
                  </motion.li>
                ))}
              </ul>

              {/* Stats Section with Gold Accent */}
              <div className="mt-14 pt-8 border-t border-[#C9A646]/20 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#C9A646]/5 to-transparent rounded-lg blur-xl" />
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#C9A646]/20 border border-[#C9A646]/40 flex items-center justify-center shadow-lg shadow-[#C9A646]/20">
                    <TrendingUp className="w-7 h-7 text-[#C9A646]" />
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-[#C9A646] mb-1">+47%</div>
                    <div className="text-sm text-slate-400">
                      Average win rate improvement
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      after first 30 days
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="text-center mt-16"
        >
          <p className="text-slate-400 text-xl mb-6">
            Ready to trade with clarity?
          </p>
          <a 
            href="/auth/register"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] bg-[length:200%_auto] hover:bg-[position:right_center] text-black font-bold rounded-xl shadow-lg shadow-[#C9A646]/40 hover:shadow-[#C9A646]/60 transition-all duration-500 hover:scale-105"
          >
            Start your transformation
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default BeforeAfter;