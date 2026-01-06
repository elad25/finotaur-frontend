// src/components/top-secret/TopSecretHero.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock } from "lucide-react";
import { motion } from "framer-motion";

const TopSecretHero = () => {
  const handleJoinClick = () => {
    // Scroll to pricing or open signup modal
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20">
      {/* ============================================
          LUXURY GRADIENT BACKGROUND
          ============================================ */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0C0C0E] via-[#1A1713] to-[#0D1118]" />

      {/* Breathing Gold Orbs */}
      <div className="absolute top-1/3 left-1/4 w-[700px] h-[700px] bg-[#C9A646]/[0.12] rounded-full blur-[150px] hero-background-orb" />
      <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-[#D4BF8E]/[0.08] rounded-full blur-[140px] hero-background-orb"
           style={{ animationDelay: '3s' }} />

      {/* ============================================
          MAIN CONTENT - CENTERED
          ============================================ */}
      <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10 text-center">

        {/* ============================================
            EXCLUSIVITY BADGE
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full backdrop-blur-xl">
            <Lock className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-sm tracking-wide uppercase">Exclusive Access</span>
          </div>
        </motion.div>

        {/* ============================================
            HEADLINE - Outcome + Anti-Noise
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-4 mb-8"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
            <span className="text-white block">Stop guessing.</span>
            <span className="relative inline-block mt-3">
              <span className="absolute inset-0 blur-3xl opacity-40 bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] animate-pulse" style={{ animationDuration: '4s' }} />
              <span className="relative text-[#C9A646] bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
                Read the market like money actually moves.
              </span>
            </span>
          </h1>
        </motion.div>

        {/* ============================================
            SUB-HEADLINE - Tangible Results
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-10"
        >
          <p className="text-xl md:text-2xl text-slate-300 leading-relaxed font-light max-w-2xl mx-auto">
            Clear macro conclusions.<br />
            Deep company analysis.<br />
            <span className="text-white font-medium">No noise. Only decisions.</span>
          </p>
        </motion.div>

        {/* ============================================
            CTA BUTTON
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col items-center gap-4"
        >
          <Button
            onClick={handleJoinClick}
            size="lg"
            className="group px-10 py-7 text-lg font-bold bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] text-black rounded-xl hover:scale-105 transition-all duration-300"
            style={{
              boxShadow: '0 4px 24px rgba(201,166,70,0.4)',
            }}
          >
            Join TOP SECRET
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>

          {/* Micro-copy - Fear reduction */}
          <p className="text-slate-500 text-sm">
            Cancel anytime. No commitment.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default TopSecretHero;
