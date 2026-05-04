// src/components/landing-new/AISection.tsx
// ================================================
// AI SECTION — COMPACT
// "AI that thinks like an institutional analyst — and acts in seconds"
// ================================================

import { Brain, BarChart3, PieChart, Activity, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ds/Button";
import { SectionShell } from "./_shared/SectionShell";
import { SectionEyebrow } from "./_shared/SectionEyebrow";
import { SectionTitle } from "./_shared/SectionTitle";

const aiCapabilities = [
  {
    icon: BarChart3,
    title: "Stock Analyzer",
    description: "Deep analysis of any stock in 30 seconds. What takes an analyst 4 hours — AI does instantly.",
    stat: "30 sec",
    statLabel: "vs 4 hours",
  },
  {
    icon: PieChart,
    title: "Sector Analyzer",
    description: "See where money is flowing before the market reacts. Track sector rotation in real-time.",
    stat: "Real-time",
    statLabel: "rotation data",
  },
  {
    icon: Activity,
    title: "Options Intelligence",
    description: "Scans flow, shows Smart Money activity, identifies high-probability opportunities.",
    stat: "Smart $",
    statLabel: "flow tracking",
  },
  {
    icon: Search,
    title: "AI Scanner",
    description: "Scans the entire market and surfaces what's relevant — without you searching for anything.",
    stat: "Auto",
    statLabel: "market scan",
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
    <SectionShell id="ai" atmosphere="full" beam={false} constructionMarkers={true}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <SectionEyebrow>AI Co-Pilot</SectionEyebrow>
          <SectionTitle gradient="split" size="default">
            <span className="text-ink-primary">AI that thinks like an institutional analyst — </span>
            <span className="text-gold-primary">and acts in seconds</span>
          </SectionTitle>
          <p className="text-base text-ink-muted max-w-2xl mx-auto">
            4 AI engines that give you the same analysis institutions pay thousands for.
            What takes analysts hours, Finotaur does in <span className="text-ink-primary font-semibold">30 seconds</span>.
          </p>

          {/* Stat pill trio */}
          <div className="flex items-center justify-center gap-6 mt-6 text-[10px] uppercase tracking-[0.32em] text-ink-muted font-medium">
            <span>30 sec analysis</span>
            <span className="w-px h-3 bg-gold-eyebrow-hairline" />
            <span>4 AI engines</span>
            <span className="w-px h-3 bg-gold-eyebrow-hairline" />
            <span>24/7 active</span>
          </div>
        </div>

        {/* Hairline divider — header → AI Engine */}
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent mx-auto mb-12" aria-hidden="true" />

        {/* FLAGSHIP tag */}
        <div className="flex justify-center mb-4">
          <span
            className="inline-flex items-center gap-2 font-sans text-[9px] font-semibold uppercase tracking-[0.45em] px-3 py-1.5 rounded-sm"
            style={{
              color: '#FFE6A0',
              border: '1px solid rgba(255,230,160,0.3)',
              background: 'linear-gradient(90deg, rgba(255,220,140,0.12) 0%, rgba(201,166,70,0.06) 100%)',
            }}
          >
            <span
              className="w-1 h-1 rounded-full"
              style={{ background: 'rgba(255,220,140,1)', boxShadow: '0 0 8px rgba(255,220,140,0.8)' }}
              aria-hidden="true"
            />
            AI Engine · Live
          </span>
        </div>

        {/* AI Terminal — Flagship treatment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-10"
        >
          <div
            className="p-5 md:p-6 max-w-3xl mx-auto relative overflow-hidden rounded-xl animate-gold-border-shimmer"
            style={{
              background:
                'linear-gradient(135deg, rgba(20,20,20,0.85) 0%, rgba(12,12,12,0.7) 100%) padding-box, linear-gradient(135deg, rgba(230,195,100,0.4) 0%, rgba(201,166,70,0.15) 50%, rgba(230,195,100,0.3) 100%) border-box',
              border: '1.5px solid transparent',
              backgroundSize: '200% 200%',
              boxShadow:
                '0 50px 120px rgba(0,0,0,0.75), 0 20px 60px rgba(0,0,0,0.5), 0 0 60px rgba(201,166,70,0.18), 0 0 120px rgba(201,166,70,0.12), inset 0 1px 0 rgba(255,230,160,0.12)',
            }}
          >
            {/* Top-edge gold light bar */}
            <span
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                top: '-1px',
                width: '70%',
                height: '2px',
                borderRadius: '2px',
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,220,140,0.3) 20%, rgba(255,230,160,0.9) 50%, rgba(255,220,140,0.3) 80%, transparent 100%)',
                filter: 'blur(0.5px)',
                zIndex: 2,
              }}
              aria-hidden="true"
            />

            {/* Flagship corner brackets — larger, brighter */}
            <span className="absolute pointer-events-none" style={{ top: '10px', left: '10px', width: '14px', height: '14px', borderTop: '1px solid rgba(255,220,140,0.7)', borderLeft: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />
            <span className="absolute pointer-events-none" style={{ top: '10px', right: '10px', width: '14px', height: '14px', borderTop: '1px solid rgba(255,220,140,0.7)', borderRight: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />
            <span className="absolute pointer-events-none" style={{ bottom: '10px', left: '10px', width: '14px', height: '14px', borderBottom: '1px solid rgba(255,220,140,0.7)', borderLeft: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />
            <span className="absolute pointer-events-none" style={{ bottom: '10px', right: '10px', width: '14px', height: '14px', borderBottom: '1px solid rgba(255,220,140,0.7)', borderRight: '1px solid rgba(255,220,140,0.7)' }} aria-hidden="true" />

            {/* Scanning line animation */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-primary to-transparent pointer-events-none"
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              aria-hidden="true"
            />

            <div className="relative z-10">
              {/* Terminal header row */}
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gold-border">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center
                  bg-gold-border border border-gold-muted">
                  <Brain className="h-4 w-4 text-gold-primary" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-ink-primary text-sm flex items-center gap-2">
                    Finotaur AI Engine
                    <span className="flex gap-1" aria-hidden="true">
                      <span className="w-1 h-1 bg-gold-primary rounded-full animate-pulse" />
                      <span className="w-1 h-1 bg-gold-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="w-1 h-1 bg-gold-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </span>
                  </span>
                </div>
                {/* Active indicator */}
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full
                  bg-gold-border border border-gold-muted">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold-primary animate-pulse" />
                  <span className="text-gold-primary/85 text-[10px] font-semibold">ACTIVE</span>
                </div>
              </div>

              {/* Typing display */}
              <div className="min-h-[40px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentInsightIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-2"
                  >
                    <span className="text-gold-primary font-mono text-xs mt-0.5 shrink-0">▸</span>
                    <p className="text-sm md:text-base leading-relaxed text-ink-secondary font-medium">
                      {displayedText}
                      {isTyping && displayedText.length < currentInsight.length && (
                        <span className="inline-block w-0.5 h-4 bg-gold-primary ml-0.5 animate-pulse" />
                      )}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress dots + counter */}
              <div className="mt-4 pt-3 border-t border-gold-border flex items-center justify-between">
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
                <span className="text-[10px] text-ink-tertiary font-mono">
                  {currentInsightIndex + 1}/{insights.length}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Hairline divider — AI Engine → capability grid */}
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent mx-auto mb-12" aria-hidden="true" />

        {/* 4 AI Capability Cards */}
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
                className="group relative rounded-xl transition-all duration-500 overflow-hidden
                  bg-section-card-rest border border-gold-border
                  hover:bg-section-card-deep hover:scale-[1.02]"
                style={{
                  boxShadow: 'var(--shadow-card-rest)',
                  transition: 'transform 0.4s ease, box-shadow 0.4s ease, background-color 0.5s ease',
                }}
                whileHover={{ boxShadow: 'var(--shadow-card-hover)' }}
              >
                {/* Top-left gold radial beam — "lit from above" */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: 0,
                    left: 0,
                    width: '80px',
                    height: '80px',
                    background: 'radial-gradient(ellipse at 0% 0%, rgba(201,166,70,0.30) 0%, transparent 70%)',
                    borderRadius: '0 0 100% 0',
                  }}
                  aria-hidden="true"
                />

                {/* Hover accent line at top */}
                <div className="absolute top-0 left-0 right-0 h-[2px] scale-x-0 group-hover:scale-x-100
                  transition-transform duration-500 origin-left
                  bg-gold-primary"
                  aria-hidden="true"
                />

                {/* Corner brackets */}
                <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-construction-marker pointer-events-none" aria-hidden="true" />
                <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-construction-marker pointer-events-none" aria-hidden="true" />
                <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-construction-marker pointer-events-none" aria-hidden="true" />
                <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-construction-marker pointer-events-none" aria-hidden="true" />

                {/* Catalog number — top-right */}
                <span className="absolute top-3 right-3 font-mono text-[10px] tracking-widest text-gold-eyebrow/60 font-light pointer-events-none" aria-hidden="true">
                  /0{index + 1}
                </span>

                <div className="relative z-10 p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-lg flex items-center justify-center
                        group-hover:scale-110 transition-transform duration-300
                        bg-gold-border border border-gold-muted">
                        <Icon className="h-5 w-5 text-gold-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-ink-primary text-base group-hover:text-gold-primary transition-colors">
                          {cap.title}
                        </h3>
                        <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full
                          bg-gold-border border border-gold-muted">
                          <span className="text-gold-primary text-[10px] font-bold">{cap.stat}</span>
                          <span className="text-ink-tertiary text-[9px]">{cap.statLabel}</span>
                        </div>
                      </div>
                      <p className="text-ink-muted text-sm leading-relaxed">{cap.description}</p>
                    </div>
                  </div>

                  {/* Hover "→ Open" affordance */}
                  <div className="flex justify-end mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] text-gold-eyebrow font-medium">
                      Open <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/auth/register">
            <Button variant="gold" size="default">Try the AI — 14 days free</Button>
          </Link>
        </div>
      </div>
    </SectionShell>
  );
};

export default AISection;
