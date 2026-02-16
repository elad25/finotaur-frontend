// src/components/landing-new/AISection.tsx
// ================================================
// 🔥 AI SECTION — The Core USP
// "AI that thinks like an institutional analyst — and acts in seconds"
// Hormozi: Time Delay ↓ + Effort ↓
// ================================================

import { Brain, Sparkles, BarChart3, PieChart, Activity, Search, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

const aiCapabilities = [
  {
    icon: BarChart3,
    title: "Stock Analyzer",
    description: "Deep analysis of any stock in 30 seconds. What takes an analyst 4 hours — AI does instantly.",
    stat: "30 sec",
    statLabel: "vs 4 hours",
    accentFrom: "#C9A646",
    accentTo: "#F4D97B",
  },
  {
    icon: PieChart,
    title: "Sector Analyzer",
    description: "See where money is flowing before the market reacts. Track sector rotation in real-time.",
    stat: "Real-time",
    statLabel: "rotation data",
    accentFrom: "#D4AF37",
    accentTo: "#C9A646",
  },
  {
    icon: Activity,
    title: "Options Intelligence",
    description: "Scans flow, shows Smart Money activity, identifies high-probability opportunities.",
    stat: "Smart $",
    statLabel: "flow tracking",
    accentFrom: "#F4D97B",
    accentTo: "#D4AF37",
  },
  {
    icon: Search,
    title: "AI Scanner",
    description: "Scans the entire market and surfaces what's relevant — without you searching for anything.",
    stat: "Auto",
    statLabel: "market scan",
    accentFrom: "#C9A646",
    accentTo: "#F4D97B",
  },
];

const insights = [
  "NVDA showing unusual call activity — 3x average volume at $950 strike.",
  "Sector rotation detected: Smart money moving from Energy → Semiconductors.",
  "AAPL earnings in 3 days — IV rank at 82%. Consider selling premium.",
  "S&P 500 above 200-day MA with increasing breadth — bullish bias confirmed.",
  "Gold breaking out above $2,100 resistance — macro regime shift in progress.",
];

const AISection = () => {
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  const currentInsight = insights[currentInsightIndex];

  useEffect(() => {
    if (isTyping) {
      if (displayedText.length < currentInsight.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentInsight.slice(0, displayedText.length + 1));
        }, 22);
        return () => clearTimeout(timeout);
      } else {
        setIsTyping(false);
        const timeout = setTimeout(() => {
          setDisplayedText("");
          setCurrentInsightIndex((prev) => (prev + 1) % insights.length);
          setIsTyping(true);
        }, 3000);
        return () => clearTimeout(timeout);
      }
    }
  }, [displayedText, isTyping, currentInsight]);

  return (
    <section id="features" className="py-28 px-4 relative overflow-hidden">
      {/* ========== RICH BACKGROUND ========== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0C0E] via-[#1A1713] to-[#0C0C0E]" />

      {/* Layered gold orbs for depth */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C9A646]/[0.10] rounded-full blur-[180px]" />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#F4D97B]/[0.06] rounded-full blur-[140px]" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-[#D4AF37]/[0.08] rounded-full blur-[120px]" />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(rgba(201,166,70,0.4) 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
        }}
      />

      {/* Top border with glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
      <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-[#C9A646]/30 to-transparent blur-sm" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* ========== SECTION HEADER ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          {/* Animated icon cluster */}
          <div className="inline-flex items-center justify-center gap-3 mb-8">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <Brain className="h-10 w-10 text-[#C9A646]" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-7 w-7 text-[#F4D97B]" />
            </motion.div>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            <span className="text-white">AI that thinks like an</span>
            <br />
            <span className="text-white">institutional analyst — </span>
            <span className="relative inline-block">
              <span className="absolute inset-0 blur-2xl opacity-50 bg-gradient-to-r from-[#C9A646] to-[#F4D97B]" />
              <span className="relative text-[#C9A646]">and acts in seconds</span>
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            4 AI engines that give you the same analysis institutions pay thousands for.
            What takes analysts hours, Finotaur does in <span className="text-white font-semibold">30 seconds</span>.
          </p>
        </motion.div>

        {/* ========== LIVE AI TYPING TERMINAL ========== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mb-16"
        >
          <div
            className="p-8 md:p-10 max-w-4xl mx-auto relative overflow-hidden rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.06) 0%, rgba(10,10,10,0.95) 40%, rgba(201,166,70,0.04) 100%)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(201,166,70,0.3)',
              boxShadow: '0 0 80px rgba(201,166,70,0.15), 0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Animated scan line */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, #C9A646, transparent)' }}
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />

            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A646]/40 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#C9A646]/40 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#C9A646]/40 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A646]/40 rounded-br-lg" />

            <div className="relative z-10">
              {/* Terminal header */}
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#C9A646]/20">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.3), rgba(201,166,70,0.1))',
                    border: '1px solid rgba(201,166,70,0.5)',
                    boxShadow: '0 0 20px rgba(201,166,70,0.2)',
                  }}
                >
                  <Brain className="h-5 w-5 text-[#C9A646]" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white flex items-center gap-3">
                    Finotaur AI Engine
                    <span className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#C9A646] rounded-full animate-pulse" />
                      <span className="w-1.5 h-1.5 bg-[#C9A646] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="w-1.5 h-1.5 bg-[#C9A646] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Scanning 8,000+ securities in real-time...</div>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 text-xs font-semibold">ACTIVE</span>
                </div>
              </div>

              {/* Typing area */}
              <div className="min-h-[60px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentInsightIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-start gap-3"
                  >
                    <span className="text-[#C9A646] font-mono text-sm mt-1 shrink-0">▸</span>
                    <p className="text-lg md:text-xl leading-relaxed text-slate-200 font-medium">
                      {displayedText}
                      {isTyping && displayedText.length < currentInsight.length && (
                        <span className="inline-block w-0.5 h-5 bg-[#C9A646] ml-1 animate-pulse" />
                      )}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress dots */}
              <div className="mt-6 pt-5 border-t border-[#C9A646]/15 flex items-center justify-between">
                <div className="flex gap-2">
                  {insights.map((_, idx) => (
                    <motion.div
                      key={idx}
                      animate={{
                        width: idx === currentInsightIndex ? 32 : 8,
                        backgroundColor: idx === currentInsightIndex ? '#C9A646' : 'rgba(100,100,100,0.3)',
                      }}
                      transition={{ duration: 0.4 }}
                      className="h-1.5 rounded-full"
                    />
                  ))}
                </div>
                <div className="text-xs text-slate-600 font-mono">
                  insight {currentInsightIndex + 1}/{insights.length}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ========== 4 AI CAPABILITY CARDS ========== */}
        <div className="grid md:grid-cols-2 gap-6 mb-14">
          {aiCapabilities.map((cap, index) => {
            const Icon = cap.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                className="group relative rounded-2xl transition-all duration-500 overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                  border: '1px solid rgba(201,166,70,0.12)',
                  boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
                }}
              >
                {/* Hover reveal gradient */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${cap.accentFrom}10 0%, transparent 50%, ${cap.accentTo}08 100%)`,
                  }}
                />

                {/* Top accent line that reveals on hover */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  style={{ background: `linear-gradient(90deg, ${cap.accentFrom}, ${cap.accentTo})` }}
                />

                <div className="relative z-10 p-7">
                  <div className="flex items-start gap-5">
                    {/* Icon with glow */}
                    <div className="relative shrink-0">
                      <div
                        className="absolute inset-0 rounded-xl blur-md opacity-0 group-hover:opacity-60 transition-opacity duration-500"
                        style={{ background: cap.accentFrom }}
                      />
                      <div
                        className="relative w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{
                          background: `linear-gradient(135deg, ${cap.accentFrom}25, ${cap.accentTo}10)`,
                          border: `1px solid ${cap.accentFrom}40`,
                        }}
                      >
                        <Icon className="h-7 w-7 text-[#C9A646]" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white text-lg group-hover:text-[#C9A646] transition-colors duration-300">
                          {cap.title}
                        </h3>
                        {/* Stat badge */}
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C9A646]/10 border border-[#C9A646]/20">
                          <span className="text-[#C9A646] text-xs font-bold">{cap.stat}</span>
                          <span className="text-slate-500 text-[10px]">{cap.statLabel}</span>
                        </div>
                      </div>
                      <p className="text-slate-400 leading-relaxed">{cap.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ========== CTA ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <Link to="/auth/register">
            <button
              className="group inline-flex items-center gap-3 px-10 py-5 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                color: '#000',
                boxShadow: '0 8px 40px rgba(201,166,70,0.35), inset 0 2px 0 rgba(255,255,255,0.2)',
              }}
            >
              Try the AI — 14 Days Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>

        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />
    </section>
  );
};

export default AISection;