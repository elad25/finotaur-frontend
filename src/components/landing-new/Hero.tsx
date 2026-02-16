// src/pages/landing/Hero.tsx
// ================================================
// 🔥 HERO — "All the tools an institutional trader uses — in one platform."
// Hormozi: Dream Outcome + Effort ↓ + Time Delay ↓
// ================================================

import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn, Users, Sparkles, Clock, X as XIcon, Brain, Activity, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";

const Hero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStartFree = () => {
    if (user) {
      navigate('/app');
    } else {
      navigate('/auth/register');
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* ========== RICH BACKGROUND (matching old War Zone quality) ========== */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#080808] via-[#0d0b08] to-[#080808]" />

      {/* Strong gold ambient glow — left side */}
      <div
        className="absolute top-1/4 left-0 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(201,166,70,0.35) 0%, rgba(201,166,70,0.15) 30%, rgba(201,166,70,0.05) 50%, transparent 70%)',
          filter: 'blur(100px)',
          transform: 'translateX(-40%)',
        }}
      />

      {/* Breathing orbs */}
      <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-[#C9A646]/[0.08] rounded-full blur-[150px] hero-background-orb" />
      <div className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-[#D4BF8E]/[0.06] rounded-full blur-[140px] hero-background-orb" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-[#F4D97B]/[0.04] rounded-full blur-[130px] hero-background-orb" style={{ animationDelay: '5s' }} />

      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(201,166,70,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(201,166,70,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ========== CONTENT ========== */}
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 relative z-10 w-full">
        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex justify-center mb-12 mt-8">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full backdrop-blur-xl">
            <Sparkles className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-sm tracking-wide">AI-Powered Trading Platform</span>
          </div>
        </motion.div>

        {/* Two-column grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* ===== LEFT — TEXT ===== */}
          <div className="space-y-8">
            {/* Headline — Playfair Display italic like old page */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight">
                <span className="text-white block heading-serif italic">All the Tools an</span>
                <span className="text-white block heading-serif italic">Institutional Trader Uses —</span>
                <span className="relative inline-block mt-2">
                  <span className="absolute inset-0 blur-3xl opacity-40 bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] animate-pulse" style={{ animationDuration: '4s' }} />
                  <span className="relative heading-serif italic text-transparent bg-clip-text bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646]">
                    In One Platform.
                  </span>
                </span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="text-lg md:text-xl text-slate-300 leading-relaxed font-light max-w-xl">
              AI that analyzes markets, sectors &amp; options. Institutional newsletters every morning. Smart trading journal. Everything under one roof — for{' '}
              <span className="text-white font-semibold">$109/month</span> instead of the{' '}
              <span className="text-white font-semibold">$2,000+</span> institutions pay.
            </motion.p>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="flex flex-wrap items-center gap-4">
              <Button
                onClick={handleStartFree}
                size="lg"
                className="group px-8 py-7 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #C9A646, #D4AF37, #C9A646)',
                  color: '#000',
                  boxShadow: '0 4px 24px rgba(201,166,70,0.4)',
                }}
              >
                {user ? 'Go to Platform' : 'Start 14-Day Free Trial'}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              {!user && (
                <Link to="/auth/login">
                  <Button variant="outline" size="lg" className="px-8 py-7 text-lg font-semibold border-2 border-[#C9A646]/40 text-white hover:border-[#C9A646] hover:bg-[#C9A646]/10 rounded-xl backdrop-blur-sm transition-all duration-300">
                    <LogIn className="mr-2 h-5 w-5" />
                    Login
                  </Button>
                </Link>
              )}
            </motion.div>

            {/* Trust Badges — styled like old page with icon boxes */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }} className="flex flex-wrap items-center gap-6">
              {[
                { icon: Users, label: '847+ Active', sub: 'Traders' },
                { icon: Brain, label: 'AI-Powered', sub: 'Analysis' },
                { icon: Clock, label: '14-Day Free', sub: 'Trial' },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
                    <badge.icon className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{badge.label}</div>
                    <div className="text-slate-400 text-xs">{badge.sub}</div>
                  </div>
                  {i < 2 && <div className="w-px h-10 bg-[#C9A646]/30 ml-3" />}
                </div>
              ))}
            </motion.div>
          </div>

          {/* ===== RIGHT — PLATFORM DASHBOARD MOCKUP ===== */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.4 }} className="relative hidden lg:block">
            {/* Glow */}
            <div className="absolute -inset-8 bg-gradient-to-r from-[#C9A646]/30 via-[#D4AF37]/20 to-transparent rounded-3xl blur-3xl opacity-60" />

            <div className="relative">
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #151515 0%, #0A0A0A 100%)',
                  border: '1px solid rgba(201,166,70,0.3)',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 60px rgba(201,166,70,0.15)',
                }}
              >
                {/* Dashboard Header */}
                <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(201,166,70,0.2)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C9A646, #F4D97B)' }}>
                      <span className="text-black font-bold text-xs">F</span>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">FINOTAUR</p>
                      <p className="text-[#C9A646] text-[10px] font-semibold tracking-wider">COMMAND CENTER</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 text-xs font-semibold">MARKETS OPEN</span>
                  </div>
                </div>

                {/* Dashboard Body */}
                <div className="p-5">
                  {/* AI Insight + Bias */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="col-span-2 p-3 rounded-xl bg-[#C9A646]/[0.08] border border-[#C9A646]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-[#C9A646]" />
                        <span className="text-[#C9A646] text-xs font-semibold">AI INSIGHT</span>
                      </div>
                      <p className="text-white text-sm font-medium leading-snug">Tech sector showing accumulation signals. Smart money rotating from energy → semiconductors.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-emerald-400 text-xs font-semibold mb-1">Market Bias</p>
                      <p className="text-white text-2xl font-bold">RISK ON</p>
                      <p className="text-emerald-400 text-xs">+0.8% Futures</p>
                    </div>
                  </div>

                  {/* Flow Scanner */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#C9A646]" />
                        <span className="text-white text-xs font-semibold">FLOW SCANNER</span>
                      </div>
                      <span className="text-[#C9A646] text-[10px] font-semibold">LIVE</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { ticker: 'NVDA', type: 'CALL', vol: '12.4K', color: 'text-emerald-400' },
                        { ticker: 'AAPL', type: 'PUT', vol: '8.2K', color: 'text-red-400' },
                        { ticker: 'TSLA', type: 'CALL', vol: '15.1K', color: 'text-emerald-400' },
                      ].map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/[0.02]">
                          <span className="text-white font-bold">{f.ticker}</span>
                          <span className={f.color + ' font-medium'}>{f.type}</span>
                          <span className="text-slate-400">{f.vol}</span>
                          <span className={f.color + ' text-[10px] font-semibold'}>{f.type === 'CALL' ? 'Bullish' : 'Bearish'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* War Zone Feed */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-white text-xs font-semibold">WAR ZONE — TODAY'S BRIEFING</span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <p>• Fed speakers hawkish — bond yields rising</p>
                      <p>• NVDA earnings Thursday — IV at 52-week high</p>
                      <p>• China stimulus: copper/steel rallying pre-market</p>
                    </div>
                  </div>
                </div>

                {/* Mini Chart */}
                <div className="px-5 pb-4">
                  <div className="h-24 rounded-xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.08), rgba(201,166,70,0.02))' }}>
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 96">
                      <defs>
                        <linearGradient id="heroChartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#C9A646" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#C9A646" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,70 Q30,65 60,60 T120,50 T180,55 T240,35 T300,40 T360,20 L400,25" fill="none" stroke="#C9A646" strokeWidth="2" />
                      <path d="M0,70 Q30,65 60,60 T120,50 T180,55 T240,35 T300,40 T360,20 L400,25 L400,96 L0,96 Z" fill="url(#heroChartGrad)" />
                    </svg>
                    <div className="absolute bottom-2 right-3 text-[10px] text-[#C9A646]/60">S&amp;P 500 • Today</div>
                    <div className="absolute top-2 left-3 text-[10px] text-emerald-400 font-semibold">+1.2%</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>


      </div>
    </section>
  );
};

export default Hero;