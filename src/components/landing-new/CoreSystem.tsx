// src/components/landing-new/CoreSystem.tsx
// ================================================
// 🔥 NEWSLETTERS & INTELLIGENCE
// "Every morning at 9:00 — you know exactly what's happening"
// War Zone (daily) + Top Secret (monthly/premium)
// ================================================

import { motion } from "framer-motion";
import { Zap, Lock, Globe, TrendingUp, BarChart3, FileText, Clock, Shield } from "lucide-react";

const CoreSystem = () => {
  return (
    <section className="py-28 px-4 relative overflow-hidden">
      {/* ========== BACKGROUND ========== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100d08] to-[#0a0a0a]" />

      {/* Layered gold atmosphere */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#C9A646]/[0.10] rounded-full blur-[170px]" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[400px] bg-[#D4AF37]/[0.07] rounded-full blur-[130px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[350px] bg-[#F4D97B]/[0.05] rounded-full blur-[110px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* ========== HEADER ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full mb-6">
            <Clock className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-sm">Daily & Monthly Intelligence</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            <span className="text-white">Every morning at 9:00 AM —</span>
            <br />
            <span className="text-[#C9A646]">you know exactly what to do</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Two layers of intelligence that keep you ahead of the market.
            Your coffee + War Zone = ready for battle.
          </p>
        </motion.div>

        {/* ========== TWO COLUMNS ========== */}
        <div className="grid md:grid-cols-2 gap-8">

          {/* ===== WAR ZONE — DAILY ===== */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="group relative rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(201,166,70,0.07) 0%, rgba(10,10,10,0.97) 100%)',
              border: '1px solid rgba(201,166,70,0.2)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* Hover glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.05] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {/* Daily badge */}
            <div className="absolute top-5 right-5">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                DAILY
              </span>
            </div>

            <div className="p-8 md:p-10">
              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.08))',
                    border: '1px solid rgba(245,158,11,0.4)',
                    boxShadow: '0 0 25px rgba(245,158,11,0.15)',
                  }}
                >
                  <Zap className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">WAR ZONE</h3>
                  <span className="text-amber-400/80 text-sm font-semibold">Daily Market Briefing</span>
                </div>
              </div>

              {/* Feature list */}
              <div className="space-y-5 mb-8">
                {[
                  { icon: Globe, text: "Complete pre-market overview", sub: "Know what matters before the bell" },
                  { icon: TrendingUp, text: "Global macro analysis", sub: "Asia → Europe → US flow" },
                  { icon: BarChart3, text: "Key levels & daily bias", sub: "Actionable setups with clear direction" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'rgba(201,166,70,0.1)', border: '1px solid rgba(201,166,70,0.2)' }}
                    >
                      <item.icon className="w-5 h-5 text-[#C9A646]" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{item.text}</p>
                      <p className="text-slate-500 text-sm">{item.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Signature quote */}
              <div
                className="p-5 rounded-xl relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(201,166,70,0.03))',
                  border: '1px solid rgba(245,158,11,0.15)',
                }}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-transparent rounded-full" />
                <p className="text-amber-300/90 text-sm italic font-medium pl-4">
                  "Your coffee + War Zone = ready for battle."
                </p>
              </div>
            </div>
          </motion.div>

          {/* ===== TOP SECRET — MONTHLY PREMIUM ===== */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="group relative rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(201,166,70,0.10) 0%, rgba(10,10,10,0.97) 100%)',
              border: '1px solid rgba(201,166,70,0.35)',
              boxShadow: '0 8px 40px rgba(201,166,70,0.12), 0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* Hover glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.06] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {/* Premium badge */}
            <div className="absolute top-5 right-5">
              <span
                className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider"
                style={{ background: 'linear-gradient(135deg, #C9A646, #F4D97B)', color: '#000' }}
              >
                PREMIUM
              </span>
            </div>

            <div className="p-8 md:p-10">
              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.3), rgba(201,166,70,0.1))',
                    border: '1px solid rgba(201,166,70,0.5)',
                    boxShadow: '0 0 30px rgba(201,166,70,0.2)',
                  }}
                >
                  <Lock className="w-7 h-7 text-[#C9A646]" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">TOP SECRET</h3>
                  <span className="text-[#C9A646]/80 text-sm font-semibold">Monthly Premium Reports</span>
                </div>
              </div>

              {/* Feature list */}
              <div className="space-y-5 mb-8">
                {[
                  { icon: FileText, text: "Deep company analysis", sub: "Institutional-grade stock research" },
                  { icon: TrendingUp, text: "Crypto reports", sub: "Macro-level digital asset analysis" },
                  { icon: Globe, text: "Monthly macro review", sub: "The big picture that shapes everything" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: 'rgba(201,166,70,0.15)',
                        border: '1px solid rgba(201,166,70,0.3)',
                      }}
                    >
                      <item.icon className="w-5 h-5 text-[#C9A646]" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{item.text}</p>
                      <p className="text-slate-500 text-sm">{item.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Signature quote */}
              <div
                className="p-5 rounded-xl relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.08), rgba(201,166,70,0.03))',
                  border: '1px solid rgba(201,166,70,0.2)',
                }}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A646] to-transparent rounded-full" />
                <p className="text-[#C9A646]/90 text-sm italic font-medium pl-4">
                  "What institutional desks read — now in your inbox."
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CoreSystem;