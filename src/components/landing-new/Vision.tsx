// src/components/landing-new/Vision.tsx
// ================================================
// 🔥 VALUE STACK — COMPACT
// "What You Get for $109/month"
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
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#C9A646]/[0.10] rounded-full blur-[150px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header — compact */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full mb-4">
            <Gift className="w-3.5 h-3.5 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-xs">Value Stack</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-white">What you get for </span>
            <span className="text-[#C9A646]">{youPay}/month</span>
          </h2>
          <p className="text-sm text-slate-400">
            Everything you need to trade like an institution — in one subscription.
          </p>
        </motion.div>

        {/* Value Stack Card — compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(201,166,70,0.06) 0%, rgba(10,10,10,0.97) 100%)',
            border: '1px solid rgba(201,166,70,0.25)',
            boxShadow: '0 0 50px rgba(201,166,70,0.08), 0 15px 40px rgba(0,0,0,0.4)',
          }}
        >
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A646]/25 rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#C9A646]/25 rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#C9A646]/25 rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A646]/25 rounded-br-xl" />

          <div className="p-6">
            {/* Items — tight rows */}
            <div className="space-y-0 mb-5">
              {valueItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + index * 0.03 }}
                  className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-none group/item hover:bg-white/[0.01] px-1.5 -mx-1.5 rounded transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#C9A646]/12 flex items-center justify-center shrink-0 group-hover/item:bg-[#C9A646]/20 transition-colors">
                      <Check className="w-3 h-3 text-[#C9A646]" />
                    </div>
                    <span className="text-white text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-slate-500 line-through text-xs font-mono">{item.value}</span>
                </motion.div>
              ))}
            </div>

            {/* Total / Price — compact */}
            <div className="pt-5 border-t-2 border-[#C9A646]/25">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total value if purchased separately:</span>
                <span className="text-lg font-bold text-slate-500 line-through font-mono">{totalValue}/mo</span>
              </div>

              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white font-bold text-lg">You pay:</span>
                <div className="flex items-end gap-1.5">
                  <span className="text-4xl font-bold text-[#C9A646]">{youPay}</span>
                  <span className="text-slate-400 text-base mb-1">/month</span>
                </div>
              </div>

              {/* Savings badge */}
              <div className="flex justify-end">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/12 border border-emerald-500/25">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-semibold">
                    Save 84% — that's $563/month in your pocket
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6">
              <Link to="/auth/register">
                <button
                  className="group w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 text-base font-bold rounded-xl transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    color: '#000',
                    boxShadow: '0 6px 30px rgba(201,166,70,0.3), inset 0 2px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  Get Full Access — 14 Days Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <p className="text-center text-slate-600 text-xs mt-2">Cancel anytime</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Vision;