// src/components/landing-warzone/Proof.tsx
import { motion } from "framer-motion";
import { Quote, BarChart3, Building2, TrendingUp, FileText, Shield, ArrowRight, Brain } from "lucide-react";

/**
 * 🧠 Proof Section - ENHANCED
 *
 * Shows:
 * - Before/After thinking transformations
 * - Screenshot of ISM analysis
 * - Example of company analysis
 * - Authority statements
 *
 * Based on Hormozi: "Specific proof beats generic authority."
 */
const Proof = () => {
  // Before/After Examples - Specific thinking transformations
  const transformations = [
    {
      before: "ISM comes out at 48.2... what does that even mean for my trades?",
      after: "ISM → Manufacturing contraction confirmed. Bias shifts from bullish to neutral on industrials. Clear.",
      icon: BarChart3,
      category: "Macro Analysis"
    },
    {
      before: "NVDA earnings beat expectations... should I buy? Everyone's talking about it...",
      after: "NVDA → Forward guidance weak despite beat. We avoided while headlines were bullish. Saved 12%.",
      icon: Building2,
      category: "Company Research"
    },
    {
      before: "Fed says 'data dependent'... I have no idea what to expect next month.",
      after: "Fed → 73% probability of hold. Market already priced it. Focus on earnings season instead.",
      icon: Brain,
      category: "Decision Clarity"
    }
  ];

  const proofItems = [
    {
      icon: BarChart3,
      title: "Macro Analysis",
      subtitle: "ISM, NFP, CPI Decoded",
      description: "Every major economic release broken down into actionable market bias. Know what the data means before the market reacts.",
      placeholder: "📊 ISM Analysis Preview",
      color: "#C9A646"
    },
    {
      icon: Building2,
      title: "Deep Company Research",
      subtitle: "Beyond the Headlines",
      description: "Institutional-level analysis of companies that actually move. Earnings, sector trends, and hidden catalysts revealed.",
      placeholder: "🏢 Company Analysis Preview",
      color: "#60a5fa"
    }
  ];

  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0C] via-[#111114] to-[#0A0A0C]" />

      {/* Accent Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#C9A646]/[0.06] rounded-full blur-[150px]" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-white">See What </span>
            <span className="bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
              Others Miss
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Real analysis. Real insights. Real edge.
          </p>
        </motion.div>

        {/* ============================================
            NEW: Before/After Thinking Transformations
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
            Before TOP SECRET <span className="text-slate-500">vs</span> <span className="text-[#C9A646]">After</span>
          </h3>

          <div className="space-y-6">
            {transformations.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <div className="grid md:grid-cols-[1fr,auto,1fr] gap-4 items-stretch">
                  {/* Before */}
                  <div className="p-5 rounded-xl bg-red-500/5 border border-red-500/20 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Before</span>
                      <span className="text-xs text-slate-600">• Confused</span>
                    </div>
                    <p className="text-slate-400 italic">"{item.before}"</p>
                  </div>

                  {/* Arrow */}
                  <div className="hidden md:flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[#C9A646]/20 border border-[#C9A646]/40 flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 text-[#C9A646]" />
                    </div>
                  </div>

                  {/* After */}
                  <div className="p-5 rounded-xl bg-[#C9A646]/5 border border-[#C9A646]/30 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-[#C9A646] uppercase tracking-wider">After</span>
                      <span className="text-xs text-slate-600">• Clear Decision</span>
                    </div>
                    <p className="text-white font-medium">"{item.after}"</p>
                  </div>
                </div>

                {/* Category Tag */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full">
                  <span className="text-xs text-slate-400">{item.category}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Proof Cards - 2 Columns */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {proofItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group"
            >
              <div className="relative h-full p-6 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.1] backdrop-blur-sm overflow-hidden"
                   style={{
                     boxShadow: '0 8px 40px rgba(0,0,0,0.4)'
                   }}>
                {/* Top Glow */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                       style={{
                         background: `${item.color}15`,
                         border: `1px solid ${item.color}40`
                       }}>
                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{item.title}</h3>
                    <p className="text-sm" style={{ color: item.color }}>{item.subtitle}</p>
                  </div>
                </div>

                {/* Screenshot Placeholder */}
                <div className="relative rounded-xl overflow-hidden mb-6 border border-white/[0.1]"
                     style={{
                       background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)'
                     }}>
                  <div className="aspect-[16/10] flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="text-6xl mb-4">{item.placeholder.split(' ')[0]}</div>
                      <p className="text-slate-500 text-sm">
                        {item.placeholder.split(' ').slice(1).join(' ')}
                      </p>
                      <p className="text-slate-600 text-xs mt-2">
                        (Add your screenshot here)
                      </p>
                    </div>
                  </div>

                  {/* Blur Overlay for "Preview" feel */}
                  <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-6">
                    <span className="px-4 py-2 rounded-full text-sm font-medium bg-white/10 text-white border border-white/20 backdrop-blur-sm">
                      Members Only Preview
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-slate-400 leading-relaxed">
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
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative"
        >
          <div className="relative p-8 md:p-12 rounded-2xl bg-gradient-to-br from-[#C9A646]/[0.08] to-transparent border border-[#C9A646]/30 backdrop-blur-sm"
               style={{
                 boxShadow: '0 8px 50px rgba(201,166,70,0.15)'
               }}>
            {/* Quote Icon */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8">
              <Quote className="w-10 h-10 md:w-12 md:h-12 text-[#C9A646]/30" />
            </div>

            {/* Quote Content */}
            <div className="text-center pt-8">
              <blockquote className="text-2xl md:text-3xl lg:text-4xl font-medium text-white leading-relaxed mb-8 max-w-4xl mx-auto">
                "This is how I personally build my market bias.
                <br className="hidden md:block" />
                <span className="text-[#C9A646]">Every decision I make starts here.</span>"
              </blockquote>

              {/* Author */}
              <div className="flex items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C9A646] to-[#8B7335] flex items-center justify-center text-black font-bold text-xl">
                  F
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-lg">FINOTAUR</p>
                  <p className="text-slate-400 text-sm">Creator of TOP SECRET</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-8 text-slate-500"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#C9A646]" />
            <span className="text-sm">Data-Driven Analysis</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-600" />
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#C9A646]" />
            <span className="text-sm">Monthly Reports</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-600" />
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#C9A646]" />
            <span className="text-sm">Exclusive Access</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Proof;
