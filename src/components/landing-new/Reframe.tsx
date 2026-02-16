// src/components/landing-new/Reframe.tsx
// ================================================
// 🔥 THE SOLUTION / REFRAME — "Finotaur Changed the Rules"
// Bridge from problem → solution with 3 pillar columns
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
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#110d08] to-[#0a0a0a]" />

      {/* Gold Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[#C9A646]/[0.15] rounded-full blur-[160px]" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[400px] bg-[#D4AF37]/[0.10] rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 left-1/4 w-[450px] h-[350px] bg-[#F4D97B]/[0.07] rounded-full blur-[100px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.2) 0%, rgba(201,166,70,0.05) 100%)',
              border: '1px solid rgba(201,166,70,0.3)',
              boxShadow: '0 0 60px rgba(201,166,70,0.2)',
            }}
          >
            <Lightbulb className="w-10 h-10 text-[#C9A646]" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-6"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            <span className="text-white">What if you had a team of analysts,</span>
            <br />
            <span className="text-white">AI &amp; a journal — </span>
            <span className="text-[#C9A646]">all in one click?</span>
          </h2>
        </motion.div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center text-lg text-slate-400 leading-relaxed max-w-3xl mx-auto mb-16"
        >
          Finotaur isn't another app. It's a complete command center built to give retail traders the same edge institutions have — without the institutional price tag.
        </motion.p>

        {/* 3 Pillars */}
        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.15 }}
                className="group relative text-center p-8 rounded-2xl transition-all duration-300"
                style={{
                  background: 'linear-gradient(180deg, rgba(201,166,70,0.08) 0%, rgba(201,166,70,0.02) 100%)',
                  border: '1px solid rgba(201,166,70,0.15)',
                }}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#C9A646]/[0.06] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 relative group-hover:scale-110 transition-transform"
                  style={{
                    background: 'rgba(201,166,70,0.15)',
                    border: '1px solid rgba(201,166,70,0.3)',
                  }}
                >
                  <Icon className="w-8 h-8 text-[#C9A646]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#C9A646] transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-slate-400 leading-relaxed relative">{pillar.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Reframe;