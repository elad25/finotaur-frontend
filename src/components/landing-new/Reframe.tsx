// src/components/landing-new/Reframe.tsx
// ================================================
// 🔥 THE SOLUTION / REFRAME — COMPACT
// Bridge from problem → solution with 3 pillars
// ================================================

import { motion } from "framer-motion";
import { Lightbulb, Brain, BarChart3, BookOpen } from "lucide-react";

const pillars = [
  {
    icon: Brain,
    title: "AI That Works for You",
    description: "Analyzes markets, companies, sectors & options — so you don't have to.",
  },
  {
    icon: BarChart3,
    title: "Daily Intelligence",
    description: "War Zone + Top Secret Reports every morning. Know exactly what's happening.",
  },
  {
    icon: BookOpen,
    title: "Smart Trading Journal",
    description: "Tracks, analyzes, and teaches you from your own data. AI-powered insights.",
  },
];

const Reframe = () => {
  return (
    <section className="py-18 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#C9A646]/[0.10] rounded-full blur-[150px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Icon — smaller */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="flex justify-center mb-5"
        >
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.18) 0%, rgba(201,166,70,0.04) 100%)',
              border: '1px solid rgba(201,166,70,0.25)',
              boxShadow: '0 0 40px rgba(201,166,70,0.15)',
            }}
          >
            <Lightbulb className="w-7 h-7 text-[#C9A646]" />
          </div>
        </motion.div>

        {/* Headline — smaller */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-center mb-4"
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
            <span className="text-white">What if you had a team of analysts,</span>
            <br />
            <span className="text-white">AI & a journal — </span>
            <span className="text-[#C9A646]">all in one click?</span>
          </h2>
        </motion.div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center text-base text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10"
        >
          Finotaur isn't another app. It's a complete command center built to give retail traders the same edge institutions have — without the institutional price tag.
        </motion.p>

        {/* 3 Pillars — compact */}
        <div className="grid md:grid-cols-3 gap-4">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
                className="group relative text-center p-6 rounded-xl transition-all duration-300"
                style={{
                  background: 'linear-gradient(180deg, rgba(201,166,70,0.06) 0%, rgba(201,166,70,0.01) 100%)',
                  border: '1px solid rgba(201,166,70,0.12)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.04] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none" />

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 relative group-hover:scale-110 transition-transform"
                  style={{
                    background: 'rgba(201,166,70,0.12)',
                    border: '1px solid rgba(201,166,70,0.25)',
                  }}
                >
                  <Icon className="w-6 h-6 text-[#C9A646]" />
                </div>
                <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#C9A646] transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed relative">{pillar.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Reframe;