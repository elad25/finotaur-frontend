// src/components/landing-new/Vision.tsx
// ================================================
// 🔥 VALUE STACK — COMPACT + READABLE TEXT
// ================================================

import { motion } from "framer-motion";
import { Check, ArrowRight, Gift, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const valueItems = [
  { name: "AI Stock Analyzer (7/day)", value: "$99" },
  { name: "AI Sector Analyzer (unlimited)", value: "$79" },
  { name: "Options Intelligence AI", value: "$149" },
  { name: "AI Scanner", value: "$59" },
  { name: "War Zone Newsletter (daily)", value: "$69.99" },
  { name: "Top Secret Reports", value: "$89.99" },
  { name: "Trading Journal Premium", value: "$49" },
  { name: "Macro Analyzer", value: "$49" },
  { name: "Priority 24h Support", value: "$29" },
];

const Vision = () => {
  return (
    <section className="py-14 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-[#C9A646]/[0.08] rounded-full blur-[130px]" />

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      <div className="max-w-xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-5"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#C9A646]/10 border border-[#C9A646]/25 rounded-full mb-3">
            <Gift className="w-3.5 h-3.5 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-xs">Value Stack</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-1.5">
            <span className="text-white">What you get for </span>
            <span className="text-[#C9A646]">$109/month</span>
          </h2>
          <p className="text-sm text-slate-400">
            Everything you need to trade like an institution — in one subscription.
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(201,166,70,0.05) 0%, rgba(10,10,10,0.97) 100%)',
            border: '1px solid rgba(201,166,70,0.2)',
            boxShadow: '0 0 40px rgba(201,166,70,0.06)',
          }}
        >
          <div className="p-5">
            {/* Items */}
            <div className="mb-4">
              {valueItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-none"
                >
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#C9A646] shrink-0" />
                    <span className="text-white text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-slate-500 line-through text-xs font-mono">{item.value}/mo</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-[#C9A646]/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 text-sm">Total if purchased separately:</span>
                <span className="text-slate-500 line-through text-base font-mono">$672/mo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-base">You pay:</span>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-[#C9A646]">$109</span>
                  <span className="text-slate-400 text-sm mb-0.5">/month</span>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <Sparkles className="w-3 h-3" />
                  Save 84% — $563/month in your pocket
                </span>
              </div>
            </div>

            {/* CTA */}
            <Link to="/auth/register" className="block mt-5">
              <button
                className="group w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-bold rounded-xl transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000',
                  boxShadow: '0 4px 20px rgba(201,166,70,0.25)',
                }}
              >
                Get Full Access — 14 Days Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <p className="text-center text-slate-600 text-[10px] mt-1.5">Cancel anytime</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Vision;