// src/components/top-secret/FinalCTA.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CountdownTimer from "./CountdownTimer";

const FinalCTA = () => {
  const navigate = useNavigate();

  const handleJoinClick = () => {
    // Navigate to register with redirect to TOP SECRET pricing
    navigate('/register?redirect=top-secret-pricing');
  };

  return (
    <section id="pricing" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background with very strong gold presence */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#18140A] to-[#0A0A0A]" />

      {/* Multiple large gold glows - maximum impact */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[#C9A646]/[0.14] rounded-full blur-[150px]" />
      <div className="absolute top-0 left-1/3 w-[400px] h-[400px] bg-[#D4AF37]/[0.10] rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/3 w-[450px] h-[350px] bg-[#C9A646]/[0.08] rounded-full blur-[110px]" />

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/60 to-transparent" />

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
            COUNTDOWN TIMER
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="mb-10"
        >
          <CountdownTimer />
        </motion.div>

        {/* ============================================
            CTA BUTTON
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
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

          {/* 🧠 Micro-objection handling */}
          <div className="mt-6 pt-6 border-t border-slate-800/50">
            <p className="text-slate-500 text-sm">
              No signals. No hype. No predictions.
            </p>
            <p className="text-slate-400 text-sm mt-1">
              This won't tell you what to buy. <span className="text-slate-300">It will tell you how to think.</span>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
