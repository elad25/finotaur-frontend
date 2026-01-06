// src/components/landing-new/Hero.tsx
// ================================================
// 🔥 TOP SECRET LANDING HERO
// Institutional Research - Report Mockup Design
// ================================================

import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn, Lock, TrendingUp, Shield, Target } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";

const Hero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 🔥 Smart navigation based on login status
  const handleStartFree = () => {
    if (user) {
      navigate('/app/top-secret');
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
            CENTERED BADGE - ABOVE EVERYTHING
            ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-16 mt-8"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-full backdrop-blur-xl">
            <Lock className="w-4 h-4 text-[#C9A646]" />
            <span className="text-[#C9A646] font-semibold text-sm tracking-wide">Top Secret Intelligence</span>
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
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight">
                <span className="text-white block italic">Institutional</span>
                <span className="text-white block italic">Research</span>
                <span className="relative inline-block mt-2">
                  <span className="absolute inset-0 blur-3xl opacity-40 bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] animate-pulse" style={{ animationDuration: '4s' }} />
                  <span className="relative text-[#C9A646] bg-gradient-to-r from-[#C9A646] via-[#F4D97B] to-[#C9A646] bg-clip-text text-transparent">
                    Delivered Monthly
                  </span>
                </span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-slate-300 leading-relaxed font-light max-w-xl"
            >
              The same market intelligence that hedge funds pay <span className="text-white font-semibold">$2,000+/month</span> for —
              now available for serious traders who want an edge.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap items-center gap-4"
            >
              <Button
                onClick={handleStartFree}
                size="lg"
                className="group px-8 py-7 text-lg font-bold bg-gradient-to-r from-[#C9A646] via-[#D4AF37] to-[#C9A646] text-black rounded-xl hover:scale-105 transition-all duration-300"
                style={{
                  boxShadow: '0 4px 24px rgba(201,166,70,0.4)',
                }}
              >
                {user ? 'Access Reports' : 'Start 14-Day Free Trial'}
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

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-wrap items-center gap-6"
            >
              {/* 5 Reports */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
                  <TrendingUp className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-white font-bold text-base">5 Reports</div>
                  <div className="text-slate-400 text-xs">Every Month</div>
                </div>
              </div>

              <div className="w-px h-10 bg-[#C9A646]/30" />

              {/* Institutional Grade */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
                  <Shield className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-white font-bold text-base">Institutional</div>
                  <div className="text-slate-400 text-xs">Research Quality</div>
                </div>
              </div>

              <div className="w-px h-10 bg-[#C9A646]/30" />

              {/* Actionable */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg border border-[#C9A646]/40 flex items-center justify-center bg-[#C9A646]/5">
                  <Target className="w-4 h-4 text-[#C9A646]" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-white font-bold text-base">Actionable</div>
                  <div className="text-slate-400 text-xs">Trade Ideas</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ============================================
              RIGHT COLUMN - REPORT PREVIEW MOCKUP
              ============================================ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            {/* Glow effect behind report */}
            <div className="absolute -inset-8 bg-gradient-to-r from-[#C9A646]/30 via-[#D4AF37]/20 to-transparent rounded-3xl blur-3xl opacity-60" />

            {/* Report Card */}
            <div className="relative">
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #151515 0%, #0A0A0A 100%)',
                  border: '1px solid rgba(201,166,70,0.3)',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 60px rgba(201,166,70,0.15)'
                }}
              >
                {/* Report Header */}
                <div
                  className="p-5 flex items-center justify-between"
                  style={{ borderBottom: '1px solid rgba(201,166,70,0.2)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)'
                      }}
                    >
                      <span className="text-black font-bold text-sm">F</span>
                    </div>
                    <div>
                      <p className="text-white font-bold">FINOTAUR</p>
                      <p className="text-[#C9A646] text-xs font-semibold">TOP SECRET</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C9A646]/10 border border-[#C9A646]/30">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[#C9A646] text-xs font-semibold">LIVE</span>
                  </div>
                </div>

                {/* Report Content Preview */}
                <div className="p-6">
                  {/* Report Title */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-amber-400" />
                      <span className="text-amber-400 text-sm font-semibold">ISM Manufacturing Report</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">January 2025 Analysis</h3>
                    <p className="text-slate-500 text-sm">Published Jan 3, 2025</p>
                  </div>

                  {/* Key Metrics Preview */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-emerald-400 text-xs font-semibold mb-1">PMI Index</p>
                      <p className="text-white text-xl font-bold">52.8</p>
                      <p className="text-emerald-400 text-xs">+1.2 vs prev</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <p className="text-blue-400 text-xs font-semibold mb-1">New Orders</p>
                      <p className="text-white text-xl font-bold">54.3</p>
                      <p className="text-blue-400 text-xs">Expanding</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-amber-400 text-xs font-semibold mb-1">Market Bias</p>
                      <p className="text-white text-xl font-bold">RISK ON</p>
                      <p className="text-amber-400 text-xs">Bullish setup</p>
                    </div>
                  </div>

                  {/* Chart Placeholder */}
                  <div
                    className="h-32 rounded-xl mb-4 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.02) 100%)' }}
                  >
                    <svg className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="heroChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#C9A646" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#C9A646" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,80 Q50,60 100,65 T200,50 T300,55 T400,30"
                        fill="none"
                        stroke="#C9A646"
                        strokeWidth="2"
                      />
                      <path
                        d="M0,80 Q50,60 100,65 T200,50 T300,55 T400,30 L400,128 L0,128 Z"
                        fill="url(#heroChartGradient)"
                      />
                    </svg>
                    <div className="absolute bottom-2 right-2 text-xs text-[#C9A646]/60">
                      Sector Performance
                    </div>
                  </div>

                  {/* Trade Ideas Teaser */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold text-sm">Trade Ideas</span>
                      <span className="text-[#C9A646] text-xs">3 setups included</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-full rounded bg-white/10" />
                      <div className="h-2 w-4/5 rounded bg-white/10" />
                    </div>
                  </div>
                </div>

                {/* Blur Overlay */}
                <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-center pb-8">
                  <div className="text-center">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{
                        background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)',
                        boxShadow: '0 0 40px rgba(201,166,70,0.5)'
                      }}
                    >
                      <Lock className="w-8 h-8 text-black" />
                    </div>
                    <p className="text-white font-bold text-lg mb-1">Unlock Full Report</p>
                    <p className="text-slate-400 text-sm">Subscribe to access all reports</p>
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