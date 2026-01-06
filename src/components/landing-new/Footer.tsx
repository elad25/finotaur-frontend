// src/components/landing-new/Footer.tsx
// ================================================
// 🔥 FINAL CTA SECTION
// Goal: Capture those who are ready
// ================================================

import { ArrowRight, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="relative overflow-hidden">
      {/* Final CTA Section */}
      <section className="py-24 px-4 relative">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0b08] to-[#0a0a0a]" />

        {/* Gold Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#C9A646]/[0.1] rounded-full blur-[150px]" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Headline */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Ready to stop guessing?
            </h2>

            {/* Sub */}
            <p className="text-xl text-slate-400 mb-10 leading-relaxed">
              Join TOP SECRET and think like money moves.
            </p>

            {/* CTA Button */}
            <Link to="/auth/register">
              <button
                className="group inline-flex items-center gap-3 px-10 py-5 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                  color: '#000',
                  boxShadow: '0 8px 40px rgba(201,166,70,0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
                }}
              >
                <Lock className="w-5 h-5" />
                Join TOP SECRET
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            {/* Micro-copy */}
            <p className="text-slate-500 text-sm mt-6">
              Instant access. Cancel anytime.
            </p>
          </motion.div>

          {/* Soft Journal Intro */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-16 pt-8 border-t border-white/5"
          >
            <p className="text-slate-500 text-sm italic">
              Execution matters too.
              <br />
              That's why FINOTAUR also includes a{' '}
              <span className="text-slate-400">professional trading journal</span>.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer Bottom */}
      <div className="border-t border-white/5 py-8 px-4 bg-[#050505]">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-600 mb-2 text-sm">
            Institutional research. Clear direction. Smarter trading.
          </p>
          <p className="text-xs text-slate-700">
            © 2025 FINOTAUR — All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
