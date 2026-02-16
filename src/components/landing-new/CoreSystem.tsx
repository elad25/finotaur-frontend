// src/components/landing-new/CoreSystem.tsx
// ================================================
// 🔥 NEWSLETTERS & INTELLIGENCE — COMPACT
// War Zone (daily) + Top Secret (monthly/premium)
// ================================================

import { motion } from "framer-motion";
import { Zap, Lock, Globe, TrendingUp, BarChart3, FileText, Clock } from "lucide-react";

const CoreSystem = () => {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#100d08] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#C9A646]/[0.08] rounded-full blur-[160px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header — compact */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full mb-4">
            <Clock className="w-3.5 h-3.5 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-xs">Daily & Monthly Intelligence</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 leading-tight">
            <span className="text-white">Every morning at 9:00 AM —</span>
            <br />
            <span className="text-[#C9A646]">you know exactly what to do</span>
          </h2>
          <p className="text-base text-slate-400 max-w-2xl mx-auto">
            Two layers of intelligence that keep you ahead of the market. Your coffee + War Zone = ready for battle.
          </p>
        </motion.div>

        {/* Two columns — compact cards */}
        <div className="grid md:grid-cols-2 gap-5">

          {/* WAR ZONE */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="group relative rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(201,166,70,0.06) 0%, rgba(10,10,10,0.97) 100%)',
              border: '1px solid rgba(201,166,70,0.18)',
            }}
          >
            <div className="absolute top-4 right-4">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25">
                DAILY
              </span>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.06))',
                    border: '1px solid rgba(245,158,11,0.35)',
                  }}
                >
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">WAR ZONE</h3>
                  <span className="text-amber-400/70 text-xs font-semibold">Daily Market Briefing</span>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                {[
                  { icon: Globe, text: "Complete pre-market overview", sub: "Know what matters before the bell" },
                  { icon: TrendingUp, text: "Global macro analysis", sub: "Asia → Europe → US flow" },
                  { icon: BarChart3, text: "Key levels & daily bias", sub: "Actionable setups with clear direction" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'rgba(201,166,70,0.08)', border: '1px solid rgba(201,166,70,0.15)' }}
                    >
                      <item.icon className="w-4 h-4 text-[#C9A646]" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{item.text}</p>
                      <p className="text-slate-500 text-xs">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="p-3.5 rounded-lg relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(201,166,70,0.02))',
                  border: '1px solid rgba(245,158,11,0.12)',
                }}
              >
                <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-amber-400 to-transparent rounded-full" />
                <p className="text-amber-300/80 text-xs italic font-medium pl-3">
                  "Your coffee + War Zone = ready for battle."
                </p>
              </div>
            </div>
          </motion.div>

          {/* TOP SECRET */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group relative rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(201,166,70,0.08) 0%, rgba(10,10,10,0.97) 100%)',
              border: '1px solid rgba(201,166,70,0.3)',
            }}
          >
            <div className="absolute top-4 right-4">
              <span
                className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider"
                style={{ background: 'linear-gradient(135deg, #C9A646, #F4D97B)', color: '#000' }}
              >
                PREMIUM
              </span>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.25), rgba(201,166,70,0.08))',
                    border: '1px solid rgba(201,166,70,0.4)',
                  }}
                >
                  <Lock className="w-5 h-5 text-[#C9A646]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">TOP SECRET</h3>
                  <span className="text-[#C9A646]/70 text-xs font-semibold">Monthly Premium Reports</span>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                {[
                  { icon: FileText, text: "Deep company analysis", sub: "Institutional-grade stock research" },
                  { icon: TrendingUp, text: "Crypto reports", sub: "Macro-level digital asset analysis" },
                  { icon: Globe, text: "Monthly macro review", sub: "The big picture that shapes everything" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'rgba(201,166,70,0.12)', border: '1px solid rgba(201,166,70,0.25)' }}
                    >
                      <item.icon className="w-4 h-4 text-[#C9A646]" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{item.text}</p>
                      <p className="text-slate-500 text-xs">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="p-3.5 rounded-lg relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,166,70,0.06), rgba(201,166,70,0.02))',
                  border: '1px solid rgba(201,166,70,0.15)',
                }}
              >
                <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-[#C9A646] to-transparent rounded-full" />
                <p className="text-[#C9A646]/80 text-xs italic font-medium pl-3">
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