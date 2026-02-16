// src/components/landing-new/FinalCTA.tsx
// ================================================
// 🔥 FINAL CTA — "Start Trading Like an Institution — Today."
// Hormozi: Final push — Dream Outcome + Urgency
// ================================================

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const FinalCTA = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* ========== BACKGROUND ========== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1A1713] to-[#0a0a0a]" />

      {/* Strong gold atmosphere */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-[#C9A646]/[0.15] rounded-full blur-[180px]" />
      <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-[#D4AF37]/[0.10] rounded-full blur-[140px]" />
      <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-[#F4D97B]/[0.06] rounded-full blur-[120px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      <div className="max-w-3xl mx-auto relative z-10 text-center">
        {/* Sparkle badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, type: "spring" }}
          className="flex justify-center mb-8"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(201,166,70,0.25), rgba(201,166,70,0.08))",
              border: "1px solid rgba(201,166,70,0.4)",
              boxShadow: "0 0 60px rgba(201,166,70,0.2)",
            }}
          >
            <Sparkles className="w-8 h-8 text-[#C9A646]" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6"
        >
          <span className="text-white">Start trading like an</span>
          <br />
          <span className="text-white">institution — </span>
          <span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">
            today.
          </span>
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed"
        >
          14 days free. Full access. No credit card required.
          <br />
          Join 847+ traders who made the switch.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link to="/auth/register">
            <button
              className="group inline-flex items-center gap-3 px-12 py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105"
              style={{
                background:
                  "linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)",
                color: "#000",
                boxShadow:
                  "0 8px 40px rgba(201,166,70,0.4), inset 0 2px 0 rgba(255,255,255,0.2)",
              }}
            >
              Start 14-Day Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          <p className="text-slate-600 text-sm mt-4">
            Cancel anytime · No questions asked
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;