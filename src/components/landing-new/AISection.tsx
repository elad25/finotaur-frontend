// src/components/landing-new/AISection.tsx
// ================================================
// 🔥 AI SECTION — COMPACT
// "AI that thinks like an institutional analyst — and acts in seconds"
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
    <section id="features" className="py-20 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0C0C0E] via-[#1A1713] to-[#0C0C0E]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#C9A646]/[0.08] rounded-full blur-[160px]" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#F4D97B]/[0.05] rounded-full blur-[120px]" />

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(rgba(201,166,70,0.4) 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
        }}
      />

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/50 to-transparent" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header — compact */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center gap-2 mb-5">
            <Brain className="h-7 w-7 text-[#C9A646]" />
            <Sparkles className="h-5 w-5 text-[#F4D97B]" />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">
            <span className="text-white">AI that thinks like an institutional analyst — </span>
            <span className="text-[#C9A646]">and acts in seconds</span>
          </h2>
          <p className="text-base text-slate-400 max-w-2xl mx-auto">
            4 AI engines that give you the same analysis institutions pay thousands for.
            What takes analysts hours, Finotaur does in <span className="text-white font-semibold">30 seconds</span>.
          </p>
        </motion.div>

        {/* AI Terminal — compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-10"
        >
          <div
            className="p-5 md:p-6 max-w-3xl mx-auto relative overflow-hidden rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.05) 0%, rgba(10,10,10,0.95) 40%, rgba(201,166,70,0.03) 100%)',
              border: '1px solid rgba(201,166,70,0.25)',
              boxShadow: '0 0 50px rgba(201,166,70,0.1), 0 10px 40px rgba(0,0,0,0.4)',
            }}
          >
            <motion.div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, #C9A646, transparent)' }}
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#C9A646]/15">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,166,70,0.25), rgba(201,166,70,0.08))',
                    border: '1px solid rgba(201,166,70,0.4)',
                  }}
                >
                  <Brain className="h-4 w-4 text-[#C9A646]" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-white text-sm flex items-center gap-2">
                    Finotaur AI Engine
                    <span className="flex gap-1">
                      <span className="w-1 h-1 bg-[#C9A646] rounded-full animate-pulse" />
                      <span className="w-1 h-1 bg-[#C9A646] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="w-1 h-1 bg-[#C9A646] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </span>
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 text-[10px] font-semibold">ACTIVE</span>
                </div>
              </div>

              <div className="min-h-[40px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentInsightIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-2"
                  >
                    <span className="text-[#C9A646] font-mono text-xs mt-0.5 shrink-0">▸</span>
                    <p className="text-sm md:text-base leading-relaxed text-slate-200 font-medium">
                      {displayedText}
                      {isTyping && displayedText.length < currentInsight.length && (
                        <span className="inline-block w-0.5 h-4 bg-[#C9A646] ml-0.5 animate-pulse" />
                      )}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-4 pt-3 border-t border-[#C9A646]/10 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {insights.map((_, idx) => (
                    <motion.div
                      key={idx}
                      animate={{
                        width: idx === currentInsightIndex ? 24 : 6,
                        backgroundColor: idx === currentInsightIndex ? '#C9A646' : 'rgba(100,100,100,0.3)',
                      }}
                      transition={{ duration: 0.3 }}
                      className="h-1 rounded-full"
                    />
                  ))}
                </div>
                <span className="text-[10px] text-slate-600 font-mono">
                  {currentInsightIndex + 1}/{insights.length}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 4 AI Cards — compact */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {aiCapabilities.map((cap, index) => {
            const Icon = cap.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 + index * 0.08 }}
                className="group relative rounded-xl transition-all duration-500 overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                  border: '1px solid rgba(201,166,70,0.1)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${cap.accentFrom}08 0%, transparent 50%)` }}
                />
                <div
                  className="absolute top-0 left-0 right-0 h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  style={{ background: `linear-gradient(90deg, ${cap.accentFrom}, ${cap.accentTo})` }}
                />

                <div className="relative z-10 p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{
                          background: `linear-gradient(135deg, ${cap.accentFrom}20, ${cap.accentTo}08)`,
                          border: `1px solid ${cap.accentFrom}30`,
                        }}
                      >
                        <Icon className="h-5 w-5 text-[#C9A646]" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-white text-base group-hover:text-[#C9A646] transition-colors">
                          {cap.title}
                        </h3>
                        <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#C9A646]/8 border border-[#C9A646]/15">
                          <span className="text-[#C9A646] text-[10px] font-bold">{cap.stat}</span>
                          <span className="text-slate-500 text-[9px]">{cap.statLabel}</span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">{cap.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA — compact */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Link to="/auth/register">
            <button
              className="group inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-xl transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
                color: '#000',
                boxShadow: '0 6px 30px rgba(201,166,70,0.3), inset 0 2px 0 rgba(255,255,255,0.2)',
              }}
            >
              Try the AI — 14 Days Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A646]/40 to-transparent" />
    </section>
  );
};

export default AISection;