// src/components/landing-new/Vision.tsx
// ================================================
// 🔥 VALUE STACK — "What You Get for $109/month"
// Hormozi: Value Stack + Price Anchoring ($672 → $109)
// ================================================

import { motion } from "framer-motion";
import { Check, ArrowRight, Gift, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const valueItems = [
  { name: "AI Stock Analyzer (7/day)", value: "$99/mo" },
  { name: "AI Sector Analyzer (unlimited)", value: "$79/mo" },
  { name: "Options Intelligence AI", value: "$149/mo" },
  { name: "AI Scanner", value: "$59/mo" },
  { name: "War Zone Newsletter (daily)", value: "$69.99/mo" },
  { name: "Top Secret Reports", value: "$89.99/mo" },
  { name: "Trading Journal Premium", value: "$49/mo" },
  { name: "Macro Analyzer", value: "$49/mo" },
  { name: "Priority 24h Support", value: "$29/mo" },
];

const totalValue = "$672";
const youPay = "$109";

const Vision = () => {
  return (
    <section className="py-28 px-4 relative overflow-hidden">
      {/* ========== BACKGROUND ========== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />

      {/* Gold Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#C9A646]/[0.12] rounded-full blur-[170px]" />
      <div className="absolute top-1/3 right-1/3 w-[500px] h-[400px] bg-[#D4AF37]/[0.08] rounded-full blur-[130px]" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[300px] bg-[#F4D97B]/[0.05] rounded-full blur-[100px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* ========== HEADER ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full mb-6">
            <Gift className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-sm">Value Stack</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="text-white">What you get for </span>
            <span className="text-[#C9A646]">{youPay}/month</span>
          </h2>
          <p className="text-lg text-slate-400">
            Everything you need to trade like an institution — in one subscription.
          </p>
        </motion.div>

        {/* ========== VALUE STACK CARD ========== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(201,166,70,0.08) 0%, rgba(10,10,10,0.97) 100%)',
            border: '1px solid rgba(201,166,70,0.3)',
            boxShadow: '0 0 80px rgba(201,166,70,0.12), 0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#C9A646]/30 rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#C9A646]/30 rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#C9A646]/30 rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#C9A646]/30 rounded-br-2xl" />

          <div className="p-8 md:p-10">
            {/* Items */}
            <div className="space-y-0 mb-8">
              {valueItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.25 + index * 0.05 }}
                  className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-none group/item hover:bg-white/[0.01] px-2 -mx-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#C9A646]/15 flex items-center justify-center shrink-0 group-hover/item:bg-[#C9A646]/25 transition-colors">
                      <Check className="w-3.5 h-3.5 text-[#C9A646]" />
                    </div>
                    <span className="text-white font-medium">{item.name}</span>
                  </div>
                  <span className="text-slate-500 line-through text-sm font-mono">{item.value}</span>
                </motion.div>
              ))}
            </div>

            {/* ========== TOTAL / PRICE ========== */}
            <div
              className="pt-8 pb-2 border-t-2 border-[#C9A646]/30"
            >
              {/* Separate value row */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 font-medium">Total value if purchased separately:</span>
                <span className="text-2xl font-bold text-slate-500 line-through font-mono">{totalValue}/mo</span>
              </div>

              {/* You pay row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold text-xl">You pay:</span>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-bold text-[#C9A646]">{youPay}</span>
                  <span className="text-slate-400 text-lg mb-1.5">/month</span>
                </div>
              </div>

              {/* Savings badge */}
              <div className="flex justify-end">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8, type: "spring" }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-semibold">
                    Save 84% — that's $563/month in your pocket
                  </span>
                </motion.div>
              </div>
            </div>

            {/* ========== CTA ========== */}
            <div className="mt-8">
              <Link to="/auth/register">
                <button
                  className="group w-full inline-flex items-center justify-center gap-3 px-8 py-5 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    color: '#000',
                    boxShadow: '0 8px 40px rgba(201,166,70,0.35), inset 0 2px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  Get Full Access — 14 Days Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <p className="text-center text-slate-600 text-sm mt-3">Cancel anytime</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Vision;