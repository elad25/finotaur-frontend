// src/components/top-secret/FinalCTA.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { motion } from "framer-motion";

const FinalCTA = () => {
  const handleJoinClick = () => {
    // Scroll to pricing or navigate to signup
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="pricing" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background with strong gold presence */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#12100A] to-[#0A0A0A]" />

      {/* Large gold glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#C9A646]/[0.08] rounded-full blur-[150px]" />

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent" />

      <div className="max-w-3xl mx-auto px-6 lg:px-8 relative z-10 text-center">
        {/* ============================================
            ICON
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#C9A646]/20 border border-[#C9A646]/40 flex items-center justify-center">
            <Zap className="w-8 h-8 text-[#C9A646]" />
          </div>
        </motion.div>

        {/* ============================================
            HEADLINE
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-6"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">
            Ready to stop guessing?
          </h2>
        </motion.div>

        {/* ============================================
            SUB-HEADLINE
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-10"
        >
          <p className="text-xl md:text-2xl text-slate-300">
            Join TOP SECRET and think like money moves.
          </p>
        </motion.div>

        {/* ============================================
            CTA BUTTON
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col items-center gap-4"
        >
          <Button
            onClick={handleJoinClick}
            size="lg"
            className="group px-12 py-8 text-xl font-bold bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] text-black rounded-xl hover:scale-105 transition-all duration-300"
            style={{
              boxShadow: '0 8px 32px rgba(201,166,70,0.5)',
            }}
          >
            Join TOP SECRET
            <ArrowRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-1" />
          </Button>

          {/* Micro-copy */}
          <p className="text-slate-400 text-sm">
            Instant access. Cancel anytime.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
