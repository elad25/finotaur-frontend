// src/components/landing-new/ProductShowcase.tsx
// ================================================
// 🔥 TRADING JOURNAL — "The best traders measure. Do you?"
// Hormozi: "The tool that stops your losing streak"
// Layout: Text left + Calendar hero image right
// ================================================

import { motion } from "framer-motion";
import { BookOpen, Link2, Brain, BarChart3, Target, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const journalFeatures = [
  {
    icon: Link2,
    title: "12,000+ Broker Sync",
    description: "Auto-import every trade. No manual entry.",
    stat: "12K+",
    statLabel: "brokers",
  },
  {
    icon: Brain,
    title: "AI Pattern Detection",
    description: "Identifies costly mistakes you'd never spot.",
    stat: "AI",
    statLabel: "insights",
  },
  {
    icon: BarChart3,
    title: "Bloomberg-Level Analytics",
    description: "Equity curves and metrics at institutional level.",
    stat: "Pro",
    statLabel: "analytics",
  },
  {
    icon: Target,
    title: "Strategy Tracking",
    description: "Know what works and what doesn't. Data, not guesswork.",
    stat: "100%",
    statLabel: "clarity",
  },
];

const ProductShowcase = () => {
  return (
    <section className="py-28 px-4 relative overflow-hidden">
      {/* ========== BACKGROUND ========== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100d08] to-[#0a0a0a]" />

      {/* Gold atmosphere */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#C9A646]/[0.10] rounded-full blur-[170px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#D4AF37]/[0.07] rounded-full blur-[130px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* ========== TWO-COLUMN HERO: TEXT LEFT + IMAGE RIGHT ========== */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ===== LEFT — TEXT + MINI FEATURES ===== */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full mb-6">
                <BookOpen className="w-4 h-4 text-[#C9A646]" />
                <span className="text-[#C9A646] font-semibold text-sm">Smart Trading Journal</span>
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                <span className="text-white">The best traders</span>
                <br />
                <span className="text-white">measure. </span>
                <span className="text-[#C9A646]">Do you?</span>
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-lg">
                The tool that stops your losing streak. Track every trade, understand every pattern,
                and let AI show you exactly where you're leaving money on the table.
              </p>
            </motion.div>

            {/* Mini feature grid — 2x2 compact */}
            <div className="grid grid-cols-2 gap-4">
              {journalFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + index * 0.08 }}
                    className="group flex items-start gap-3 p-4 rounded-xl transition-all duration-300 hover:bg-[#C9A646]/[0.04]"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(201,166,70,0.1)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                      style={{
                        background: 'linear-gradient(135deg, rgba(201,166,70,0.18), rgba(201,166,70,0.05))',
                        border: '1px solid rgba(201,166,70,0.25)',
                      }}
                    >
                      <Icon className="h-5 w-5 text-[#C9A646]" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm mb-0.5 group-hover:text-[#C9A646] transition-colors">
                        {feature.title}
                      </h4>
                      <p className="text-slate-500 text-xs leading-relaxed">{feature.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <Link to="/auth/register">
                <button
                  className="group inline-flex items-center gap-2 px-8 py-4 text-base font-bold rounded-xl transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                    color: '#000',
                    boxShadow: '0 6px 30px rgba(201,166,70,0.35), inset 0 2px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  Try the Journal — 14 Days Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </motion.div>
          </div>

          {/* ===== RIGHT — CALENDAR IMAGE MOCKUP ===== */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 30 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            {/* Glow behind */}
            <div className="absolute -inset-8 bg-gradient-to-r from-[#C9A646]/25 via-[#D4AF37]/15 to-transparent rounded-3xl blur-3xl opacity-50 pointer-events-none" />

            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                border: '1px solid rgba(201,166,70,0.3)',
                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.8), 0 0 60px rgba(201,166,70,0.12)',
              }}
            >
              {/* Browser chrome bar */}
              <div
                className="flex items-center gap-2 px-5 py-3"
                style={{
                  background: 'linear-gradient(180deg, #151515 0%, #0f0f0f 100%)',
                  borderBottom: '1px solid rgba(201,166,70,0.15)',
                }}
              >
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                    <span className="text-[11px] text-slate-500 font-mono">finotaur.com/app/journal/calendar</span>
                  </div>
                </div>
                <div className="w-12" />
              </div>

              {/* Calendar image — update src to match your actual file path */}
              <img
                src="/assets/finotaur-calendar.png"
                alt="Finotaur Trading Journal — Calendar View with P&L tracking"
                className="w-full h-auto block"
                style={{ pointerEvents: 'none' }}
                draggable={false}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes('/assets/')) {
                    target.src = '/finotaur-calendar.png';
                  }
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;