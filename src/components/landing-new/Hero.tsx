// src/components/landing-new/Hero.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn, Lock, Eye, Zap, TrendingUp } from "lucide-react";
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
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 relative z-10 w-full">

        {/* ============================================
            TOP SECRET BADGE - CENTERED
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-16 mt-8"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border border-red-500/40 rounded-full backdrop-blur-xl">
            <Lock className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-bold text-sm tracking-widest uppercase">TOP SECRET</span>
          </div>
        </motion.div>

        {/* ============================================
            TWO COLUMN LAYOUT
            ============================================ */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ============================================
              LEFT COLUMN - TEXT CONTENT
              ============================================ */}
          <div className="space-y-10">
            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-4"
            >
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.1] tracking-tight">
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

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap items-center gap-4"
            >
              <Button
                onClick={handleJoinTopSecret}
                size="lg"
                className="group px-8 py-7 text-lg font-bold bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] text-black rounded-xl hover:scale-105 transition-all duration-300"
                style={{
                  boxShadow: '0 4px 24px rgba(201,166,70,0.4)',
                }}
              >
                Join TOP SECRET
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

              {!user && (
                <Link to="/auth/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-8 py-7 text-lg font-semibold border-2 border-[#C9A646]/40 text-white hover:border-[#C9A646] hover:bg-[#C9A646]/10 rounded-xl backdrop-blur-sm transition-all duration-300"
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
              className="flex flex-wrap items-center gap-6"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
                  <Eye className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
                </div>
                <span className="text-slate-300 font-medium text-sm">Exclusive Insights</span>
              </div>

              <div className="w-px h-10 bg-[#C9A646]/30" />

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
                  <Lock className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
                </div>
                <span className="text-slate-300 font-medium text-sm">Members Only</span>
              </div>

              <div className="w-px h-10 bg-[#C9A646]/30" />

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
                  <Zap className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
                </div>
                <span className="text-slate-300 font-medium text-sm">Actionable Bias</span>
              </div>
            </motion.div>
          </div>

          {/* ============================================
              RIGHT COLUMN - CALENDAR SCREENSHOT
              ============================================ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            {/* Glow effect behind calendar */}
            <div className="absolute -inset-8 bg-gradient-to-r from-[#C9A646]/30 via-[#D4AF37]/20 to-transparent rounded-3xl blur-3xl opacity-60" />

            {/* Calendar Container */}
            <div className="relative">
              {/* Screenshot */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-700/50 shadow-2xl"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 80px rgba(201, 166, 70, 0.2)'
                }}
              >
                {/* Top gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent z-10 pointer-events-none" />

                {/* Calendar Image */}
                <img
                  src="/assets/finotaur-calender.png"
                  alt="Finotaur Trading Calendar"
                  className="w-full h-auto"
                  style={{
                    filter: 'brightness(0.95) contrast(1.1)',
                  }}
                />

                {/* Bottom glow */}
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#C9A646]/10 to-transparent pointer-events-none" />

                {/* Live Badge */}
                <div className="absolute top-6 right-6 z-20">
                  <div className="bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/40 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50" />
                    <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Live Platform</span>
                  </div>
                </div>
              </div>

              {/* Floating Monthly P&L Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="absolute -bottom-8 -left-8 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-5 shadow-2xl"
                style={{
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-emerald-400">+$45,335</div>
                    <div className="text-xs text-zinc-400 font-medium">This month</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
