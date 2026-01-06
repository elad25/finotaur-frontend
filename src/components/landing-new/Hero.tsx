// src/components/landing-new/Hero.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn, Lock, Eye, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";

const Hero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleJoinTopSecret = () => {
    if (user) {
      navigate('/app/journal/overview');
    } else {
      navigate('/auth/register');
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
          MAIN CONTENT CONTAINER
          ============================================ */}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 relative z-10 w-full">

        {/* ============================================
            TOP SECRET BADGE
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-12 mt-8"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border border-red-500/40 rounded-full backdrop-blur-xl">
            <Lock className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-bold text-sm tracking-widest uppercase">TOP SECRET</span>
          </div>
        </motion.div>

        {/* ============================================
            CENTERED HERO CONTENT
            ============================================ */}
        <div className="text-center space-y-10 max-w-4xl mx-auto">

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4"
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold leading-[1.1] tracking-tight">
              <span className="text-white block">Stop guessing.</span>
              <span className="relative inline-block mt-4">
                <span className="absolute inset-0 blur-3xl opacity-40 bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] animate-pulse" style={{ animationDuration: '4s' }} />
                <span className="relative text-[#C9A646] bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
                  Read the market
                </span>
              </span>
              <span className="text-white block mt-2">like money actually moves.</span>
            </h1>
          </motion.div>

          {/* Sub-headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-3"
          >
            <p className="text-xl md:text-2xl text-slate-300 leading-relaxed font-light">
              Monthly macro conclusions.
            </p>
            <p className="text-xl md:text-2xl text-slate-300 leading-relaxed font-light">
              Deep company analysis.
            </p>
            <p className="text-xl md:text-2xl text-[#C9A646] leading-relaxed font-semibold">
              No noise. Only decisions.
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              onClick={handleJoinTopSecret}
              size="lg"
              className="group px-10 py-8 text-xl font-bold bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] text-black rounded-xl hover:scale-105 transition-all duration-300"
              style={{
                boxShadow: '0 4px 24px rgba(201,166,70,0.4)',
              }}
            >
              Join TOP SECRET
              <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" />
            </Button>

            {!user && (
              <Link to="/auth/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-8 text-lg font-semibold border-2 border-[#C9A646]/40 text-white hover:border-[#C9A646] hover:bg-[#C9A646]/10 rounded-xl backdrop-blur-sm transition-all duration-300"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Login
                </Button>
              </Link>
            )}
          </motion.div>

          {/* Value Props Strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-8 pt-8"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
                <Eye className="w-5 h-5 text-[#C9A646]" strokeWidth={1.5} />
              </div>
              <span className="text-slate-300 font-medium">Exclusive Insights</span>
            </div>

            <div className="w-px h-10 bg-[#C9A646]/30 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
                <Lock className="w-5 h-5 text-[#C9A646]" strokeWidth={1.5} />
              </div>
              <span className="text-slate-300 font-medium">Members Only</span>
            </div>

            <div className="w-px h-10 bg-[#C9A646]/30 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
                <Zap className="w-5 h-5 text-[#C9A646]" strokeWidth={1.5} />
              </div>
              <span className="text-slate-300 font-medium">Actionable Bias</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
