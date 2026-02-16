// src/components/landing-new/FinalCTA.tsx
// ================================================
// 🔥 FINAL CTA — ULTRA COMPACT
// "Start Trading Like an Institution — Today."
// ================================================

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const FinalCTA = () => {
  return (
    <section className="py-12 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1A1713] to-[#0a0a0a]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#C9A646]/[0.12] rounded-full blur-[120px]" />

      {/* Borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/25 to-transparent" />

      <div className="max-w-2xl mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-5"
        >
          {/* Headline */}
          <h2 className="text-2xl md:text-3xl font-bold leading-tight">
            <span className="text-white">Start trading like an institution — </span>
            <span className="heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">
              Today.
            </span>
          </h2>

          {/* Sub + CTA inline */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <p className="text-slate-400 text-sm">
              14 days free · Full access · 847+ traders
            </p>
            <Link to="/auth/register">
              <button
                className="group inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-xl transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000',
                  boxShadow: '0 6px 30px rgba(201,166,70,0.35), inset 0 2px 0 rgba(255,255,255,0.2)',
                }}
              >
                Start 14-Day Free Trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;