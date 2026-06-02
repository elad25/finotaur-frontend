// src/pages/app/Plans.tsx
// "Choose Your Plan" — hero-styled in-app screen.
// Gold-on-black atmosphere matching the landing Hero aesthetic.
// Two featured cards (Journal + FINOTAUR) with CarouselCard-style border treatment.

import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, TrendingUp, Globe, Check } from "lucide-react";
import { Button } from "@/components/ds/Button";
import { SectionEyebrow } from "@/components/landing-new/_shared/SectionEyebrow";
import { SectionTitle } from "@/components/landing-new/_shared/SectionTitle";

// ---------------------------------------------------------------------------
// Illustration — Journal: browser chrome + real calendar screenshot
// ---------------------------------------------------------------------------
function JournalIllustration() {
  return (
    <div className="relative rounded-xl overflow-hidden border border-[#C9A646]/20 shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_40px_rgba(201,166,70,0.10)]">
      {/* Corner brackets */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[rgba(255,220,140,0.4)] pointer-events-none z-20" aria-hidden="true" />
      <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[rgba(255,220,140,0.4)] pointer-events-none z-20" aria-hidden="true" />
      <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[rgba(255,220,140,0.4)] pointer-events-none z-20" aria-hidden="true" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[rgba(255,220,140,0.4)] pointer-events-none z-20" aria-hidden="true" />

      {/* Browser chrome bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#C9A646]/10 bg-gradient-to-b from-[rgba(20,20,20,0.95)] to-[rgba(12,12,12,0.90)]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E24B4A]/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-[rgba(255,255,255,0.25)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[rgba(255,255,255,0.25)]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
            <span className="text-[10px] text-white/40 font-mono">finotaur.com/app/journal/calendar</span>
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* Calendar screenshot */}
      <img
        src="/assets/finotaur-calender.png"
        alt="Finotaur Trading Journal — Calendar View with P&L tracking"
        className="w-full h-auto block"
        draggable={false}
        style={{ pointerEvents: "none" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Illustration — FINOTAUR Terminal: JSX mockup in PlatformPreview style
// ---------------------------------------------------------------------------
function FiNotaurIllustration() {
  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[#C9A646]/20 bg-black/40 shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_40px_rgba(201,166,70,0.10)]">
      {/* Corner brackets */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[rgba(255,220,140,0.4)] pointer-events-none z-20" aria-hidden="true" />
      <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[rgba(255,220,140,0.4)] pointer-events-none z-20" aria-hidden="true" />
      <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[rgba(255,220,140,0.4)] pointer-events-none z-20" aria-hidden="true" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[rgba(255,220,140,0.4)] pointer-events-none z-20" aria-hidden="true" />

      {/* AI badge */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-sm border border-[#C9A646]/40 bg-[#C9A646]/10">
        <span className="text-[#C9A646] text-[8px] font-sans font-bold uppercase tracking-[0.25em]">AI</span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Ticker row */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-3 text-[9.5px] font-mono">
            <span className="text-white/60">SPX <span className="text-white/85 tabular-nums">4892</span> <span className="text-white/50">+0.34%</span></span>
            <span className="text-white/60">NDX <span className="text-white/85 tabular-nums">17421</span> <span className="text-white/50">+0.52%</span></span>
            <span className="text-white/60">VIX <span className="text-num-negative tabular-nums">13.42</span> <span className="text-num-negative">−2.1%</span></span>
          </div>
          <div className="flex items-center gap-1 text-[8px] font-sans uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A646]/90" />
            <span className="text-[#C9A646]/80 font-medium">Live</span>
          </div>
        </div>

        {/* Mini area chart */}
        <div className="relative">
          <div className="flex items-baseline justify-between mb-1 text-[9.5px]">
            <span className="font-mono text-white/85 tracking-wider">QQQ</span>
            <span className="font-mono text-white/65 tabular-nums">$421.34</span>
            <span className="font-mono text-white/75">+1.84%</span>
          </div>
          <svg viewBox="0 0 320 50" className="w-full h-11" preserveAspectRatio="none">
            <defs>
              <linearGradient id="plans-chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(201,166,70,0.30)" />
                <stop offset="100%" stopColor="rgba(201,166,70,0)" />
              </linearGradient>
            </defs>
            <path d="M0,40 L40,36 L80,30 L120,28 L160,22 L200,18 L240,14 L280,10 L320,6 L320,50 L0,50 Z" fill="url(#plans-chart-grad)" />
            <path d="M0,40 L40,36 L80,30 L120,28 L160,22 L200,18 L240,14 L280,10 L320,6" stroke="rgba(201,166,70,0.75)" strokeWidth="1.2" fill="none" />
          </svg>
        </div>

        {/* 4 module tiles */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: "War Zone", glyph: "⚡" },
            { label: "AI Engine", glyph: "◆" },
            { label: "Top Secret", glyph: "✦" },
            { label: "Macro", glyph: "◧" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded border border-[#C9A646]/15 bg-[#C9A646]/[0.04] flex flex-col items-center justify-center gap-1 py-2"
            >
              <span className="text-[#C9A646]/85 text-sm leading-none">{m.glyph}</span>
              <span className="font-sans text-[7.5px] uppercase tracking-[0.15em] text-white/50 font-medium">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Corner bracket helper — mirrors CarouselCard's featured bracket treatment
// ---------------------------------------------------------------------------
function CornerBrackets() {
  return (
    <>
      <span className="absolute pointer-events-none" style={{ top: "10px", left: "10px",   width: "14px", height: "14px", borderTop: "1px solid rgba(255,220,140,0.7)", borderLeft: "1px solid rgba(255,220,140,0.7)" }} aria-hidden="true" />
      <span className="absolute pointer-events-none" style={{ top: "10px", right: "10px",  width: "14px", height: "14px", borderTop: "1px solid rgba(255,220,140,0.7)", borderRight: "1px solid rgba(255,220,140,0.7)" }} aria-hidden="true" />
      <span className="absolute pointer-events-none" style={{ bottom: "10px", left: "10px",  width: "14px", height: "14px", borderBottom: "1px solid rgba(255,220,140,0.7)", borderLeft: "1px solid rgba(255,220,140,0.7)" }} aria-hidden="true" />
      <span className="absolute pointer-events-none" style={{ bottom: "10px", right: "10px", width: "14px", height: "14px", borderBottom: "1px solid rgba(255,220,140,0.7)", borderRight: "1px solid rgba(255,220,140,0.7)" }} aria-hidden="true" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Checklist item
// ---------------------------------------------------------------------------
function CheckItem({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="w-3.5 h-3.5 text-[#C9A646]/85 shrink-0" aria-hidden="true" />
      <span className="text-white/65 text-sm">{label}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// PlansPage
// ---------------------------------------------------------------------------
export default function PlansPage() {
  const navigate = useNavigate();

  // CarouselCard isFeatured=true gradient-border style — mirrored exactly
  const featuredCardStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, rgba(20, 20, 20, 0.85) 0%, rgba(12, 12, 12, 0.7) 100%) padding-box,
                 linear-gradient(135deg, rgba(230, 195, 100, 0.4) 0%, rgba(201, 166, 70, 0.15) 50%, rgba(230, 195, 100, 0.3) 100%) border-box`,
    backdropFilter: "blur(32px) saturate(180%)",
    WebkitBackdropFilter: "blur(32px) saturate(180%)",
    border: "1.5px solid transparent",
    boxShadow:
      "0 50px 120px rgba(0,0,0,0.75), 0 20px 60px rgba(0,0,0,0.5), 0 0 60px rgba(201,166,70,0.18), 0 0 120px rgba(201,166,70,0.12), inset 0 1px 0 rgba(255,230,160,0.12)",
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">

      {/* ===== ATMOSPHERE — mirrors Hero ===== */}
      <div className="absolute inset-0 bg-[#080808]" aria-hidden="true" />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 0%, #0a0c10 0%, #050608 60%, #030406 100%)" }}
        aria-hidden="true"
      />

      {/* Star field */}
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(1.5px 1.5px at 17% 22%, rgba(255,255,255,0.85) 0%, transparent 50%),
                            radial-gradient(1px 1px at 33% 71%, rgba(255,255,255,0.6) 0%, transparent 50%),
                            radial-gradient(1px 1px at 51% 18%, rgba(255,255,255,0.5) 0%, transparent 50%),
                            radial-gradient(1.5px 1.5px at 73% 43%, rgba(255,255,255,0.75) 0%, transparent 50%),
                            radial-gradient(1px 1px at 89% 67%, rgba(255,255,255,0.65) 0%, transparent 50%),
                            radial-gradient(2px 2px at 67% 12%, rgba(255,255,255,0.9) 0%, transparent 50%),
                            radial-gradient(1.5px 1.5px at 85% 30%, rgba(255,255,255,0.7) 0%, transparent 50%),
                            radial-gradient(1px 1px at 41% 92%, rgba(255,255,255,0.6) 0%, transparent 50%),
                            radial-gradient(2px 2px at 95% 5%, rgba(255,255,255,0.85) 0%, transparent 50%)`,
          backgroundSize: "600px 600px, 700px 700px, 500px 500px, 800px 800px, 600px 600px, 500px 500px, 800px 800px, 500px 500px, 600px 600px",
        }}
        aria-hidden="true"
      />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)`,
          backgroundSize: "100px 100px",
        }}
        aria-hidden="true"
      />

      {/* Atmospheric gold beam — 3 layers */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "120%",
          height: "100%",
          background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(201,166,70,0.18) 0%, rgba(201,166,70,0.10) 25%, rgba(201,166,70,0.04) 50%, transparent 75%)",
          filter: "blur(40px)",
          zIndex: 1,
        }}
        aria-hidden="true"
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          height: "90%",
          background: "radial-gradient(ellipse 45% 70% at 50% 0%, rgba(230,195,100,0.22) 0%, rgba(220,180,80,0.12) 30%, rgba(201,166,70,0.05) 60%, transparent 85%)",
          mixBlendMode: "screen",
          filter: "blur(20px)",
          zIndex: 2,
        }}
        aria-hidden="true"
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-5%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "30%",
          height: "70%",
          background: "radial-gradient(ellipse 30% 50% at 50% 0%, rgba(255,220,140,0.25) 0%, rgba(230,195,100,0.10) 40%, transparent 80%)",
          mixBlendMode: "screen",
          filter: "blur(15px)",
          zIndex: 3,
        }}
        aria-hidden="true"
      />

      {/* ===== PAGE CONTENT ===== */}
      <div className="relative z-10 flex flex-col flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 pb-16">

        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink-primary transition-colors duration-200 mb-10"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        </motion.div>

        {/* ===== HEADING ===== */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-center mb-12 md:mb-14"
        >
          <SectionEyebrow>Pricing</SectionEyebrow>

          <SectionTitle as="h1" size="large" gradient="split" className="mb-4">
            Choose <span className="text-gold-primary">Your</span> Plan
          </SectionTitle>

          <p className="text-ink-secondary text-base md:text-lg max-w-md mx-auto font-light leading-relaxed">
            Pick the path that fits how you work the markets.
          </p>
        </motion.div>

        {/* ===== CARDS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">

          {/* ---- Card 1: Journal ---- */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="group relative rounded-2xl flex flex-col cursor-default transition-all duration-500"
            style={{
              ...featuredCardStyle,
              padding: "28px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                "0 50px 120px rgba(0,0,0,0.80), 0 20px 60px rgba(0,0,0,0.55), 0 0 80px rgba(201,166,70,0.26), 0 0 160px rgba(201,166,70,0.16), inset 0 1px 0 rgba(255,230,160,0.14)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = featuredCardStyle.boxShadow as string;
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
            }}
          >
            {/* Top-edge gold light bar */}
            <span
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                top: "-1px",
                width: "70%",
                height: "2px",
                borderRadius: "2px",
                background: "linear-gradient(90deg, transparent 0%, rgba(255,220,140,0.3) 20%, rgba(255,230,160,0.9) 50%, rgba(255,220,140,0.3) 80%, transparent 100%)",
                filter: "blur(0.5px)",
                zIndex: 2,
              }}
              aria-hidden="true"
            />

            <CornerBrackets />

            {/* Eyebrow row */}
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-3.5 h-3.5 text-[#C9A646]/75 shrink-0" aria-hidden="true" />
              <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#C9A646]/75 font-medium">
                For Traders
              </span>
            </div>

            {/* Title */}
            <h2 className="font-wordmark font-normal text-white/95 text-[28px] md:text-[32px] leading-[1.1] tracking-[-0.01em] mb-2">
              Journal
            </h2>

            {/* Tagline */}
            <p className="font-sans text-[#C9A646]/80 text-sm font-medium tracking-wide mb-3">
              Track. Analyze. Improve.
            </p>

            {/* Description */}
            <p className="font-sans text-white/60 text-[13px] leading-[1.55] mb-5">
              Connect your broker, track every trade, review performance and become a better trader.
            </p>

            {/* Illustration */}
            <div className="mb-5 overflow-hidden rounded-xl">
              <JournalIllustration />
            </div>

            {/* Perfect For */}
            <div className="mb-6">
              <p className="font-sans text-[9.5px] uppercase tracking-[0.28em] text-[#C9A646]/70 font-medium mb-2.5">
                Perfect for
              </p>
              <ul className="space-y-1.5">
                <CheckItem label="Active traders" />
                <CheckItem label="Day traders" />
                <CheckItem label="Futures &amp; options traders" />
                <CheckItem label="Anyone serious about improving" />
              </ul>
            </div>

            {/* CTA — pinned at bottom */}
            <div className="mt-auto">
              <Button
                variant="gold"
                size="full"
                onClick={() => navigate("/app/journal/pricing")}
              >
                View Journal pricing
              </Button>
            </div>
          </motion.div>

          {/* ---- Card 2: FINOTAUR ---- */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="group relative rounded-2xl flex flex-col cursor-default transition-all duration-500"
            style={{
              ...featuredCardStyle,
              padding: "28px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                "0 50px 120px rgba(0,0,0,0.80), 0 20px 60px rgba(0,0,0,0.55), 0 0 80px rgba(201,166,70,0.26), 0 0 160px rgba(201,166,70,0.16), inset 0 1px 0 rgba(255,230,160,0.14)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = featuredCardStyle.boxShadow as string;
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
            }}
          >
            {/* Top-edge gold light bar */}
            <span
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                top: "-1px",
                width: "70%",
                height: "2px",
                borderRadius: "2px",
                background: "linear-gradient(90deg, transparent 0%, rgba(255,220,140,0.3) 20%, rgba(255,230,160,0.9) 50%, rgba(255,220,140,0.3) 80%, transparent 100%)",
                filter: "blur(0.5px)",
                zIndex: 2,
              }}
              aria-hidden="true"
            />

            <CornerBrackets />

            {/* Eyebrow row */}
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-3.5 h-3.5 text-[#C9A646]/75 shrink-0" aria-hidden="true" />
              <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#C9A646]/75 font-medium">
                For Investors
              </span>
            </div>

            {/* Title */}
            <h2 className="font-wordmark font-normal text-white/95 text-[28px] md:text-[32px] leading-[1.1] tracking-[-0.01em] mb-2">
              FINOTAUR
            </h2>

            {/* Tagline */}
            <p className="font-sans text-[#C9A646]/80 text-sm font-medium tracking-wide mb-3">
              Research. Intelligence. Edge.
            </p>

            {/* Description */}
            <p className="font-sans text-white/60 text-[13px] leading-[1.55] mb-5">
              Full-market intelligence for investors — and for traders who also invest. AI analysis, screeners, macro insights and premium research tools.
            </p>

            {/* Illustration */}
            <div className="mb-5 overflow-hidden rounded-xl">
              <FiNotaurIllustration />
            </div>

            {/* Perfect For */}
            <div className="mb-6">
              <p className="font-sans text-[9.5px] uppercase tracking-[0.28em] text-[#C9A646]/70 font-medium mb-2.5">
                Perfect for
              </p>
              <ul className="space-y-1.5">
                <CheckItem label="Long-term investors" />
                <CheckItem label="Fundamental &amp; macro researchers" />
                <CheckItem label="Market analysts" />
                <CheckItem label="Traders who also invest" />
              </ul>
            </div>

            {/* CTA — pinned at bottom */}
            <div className="mt-auto">
              <Button
                variant="gold"
                size="full"
                onClick={() => navigate("/app/all-markets/pricing")}
              >
                View Platform pricing
              </Button>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
