// src/components/landing-new/JournalToolsTabs.tsx
// ================================================
// 🔥 JOURNAL TOOLS TABS — Tradezella-style tabbed product showcase
// Sits between ProductShowcase (Journal hero) and PartnershipRow (NinjaTrader vendor strip)
// Tabs: Automated Journal (Live), Backtesting / AI Insights / Trade Replay (Coming Soon)
// ================================================

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, LineChart, Brain, PlayCircle, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionShell } from "./_shared/SectionShell";
import { SectionEyebrow } from "./_shared/SectionEyebrow";
import { SectionTitle } from "./_shared/SectionTitle";

type TabKey = "journal" | "backtest" | "ai" | "replay";

interface Tab {
  key: TabKey;
  icon: LucideIcon;
  label: string;
  status: "live" | "soon";
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  screenshot?: { src: string; alt: string; url: string };
}

const tabs: Tab[] = [
  {
    key: "journal",
    icon: BookOpen,
    label: "Automated Journal",
    status: "live",
    eyebrow: "Automated Journal",
    title: "Every fill, journaled automatically.",
    description:
      "Connect once. Trades flow in real time from NinjaTrader and Tradovate — auto-tagged, fee-aware, and ready to review. Never log a trade by hand again.",
    bullets: [
      "NinjaTrader & Tradovate sync",
      "Real-time fills, no refresh",
      "Auto strategy & setup tagging",
      "Notes, screenshots, voice memos",
    ],
    screenshot: {
      src: "/assets/finotaur-calender.png",
      alt: "Finotaur Trading Journal — calendar view with daily P&L tracking",
      url: "finotaur.com/app/journal/calendar",
    },
  },
  {
    key: "backtest",
    icon: LineChart,
    label: "Backtesting",
    status: "soon",
    eyebrow: "Backtesting",
    title: "Test your setup. See if it has edge.",
    description:
      "Run your strategy against years of intraday data. Get equity curve, drawdown profile, and expectancy — before you risk a dollar.",
    bullets: [
      "Multi-year intraday replay",
      "Equity curve & drawdown",
      "Trade-by-trade audit log",
      "Strategy parameter sweeps",
    ],
  },
  {
    key: "ai",
    icon: Brain,
    label: "AI Insights",
    status: "soon",
    eyebrow: "AI Insights",
    title: "The mistakes you'd never spot yourself.",
    description:
      "FINOTAUR reads every trade you've logged, finds the costly patterns hidden in your history, and surfaces them in plain English.",
    bullets: [
      "Pattern detection across thousands of trades",
      "Tilt windows, revenge trades, sizing drift",
      "Personalized weekly review",
      "Plain-English plan to fix the leak",
    ],
  },
  {
    key: "replay",
    icon: PlayCircle,
    label: "Trade Replay",
    status: "soon",
    eyebrow: "Trade Replay",
    title: "Re-watch the chart, bar by bar.",
    description:
      "Step through any trade exactly as it printed. Spot the hesitation, the early exit, the level you should have respected — then annotate it for next time.",
    bullets: [
      "Synced with your fills",
      "Variable playback speed",
      "Drawing tools & annotations",
      "Share with your accountability space",
    ],
  },
];

const ComingSoonPlaceholder = ({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) => {
  return (
    <div className="relative aspect-[16/10] flex items-center justify-center overflow-hidden">
      {/* faint diagonal grid using construction tokens */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--construction-line-strong) 0 1px, transparent 1px 24px), repeating-linear-gradient(-45deg, var(--construction-line-strong) 0 1px, transparent 1px 24px)",
        }}
        aria-hidden="true"
      />
      {/* center radial glow using gold-border token */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, var(--gold-border) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 py-12">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br from-gold-primary/20 to-gold-primary/[0.04] border border-gold-primary/30 shadow-card-featured">
          <Lock className="h-7 w-7 text-gold-primary" aria-hidden="true" />
        </div>
        <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold-primary/80 mb-2">
          Coming Soon
        </div>
        <h4 className="font-wordmark font-medium text-2xl text-ink-primary mb-2">
          {label}
        </h4>
        <p className="text-sm text-ink-tertiary max-w-xs leading-relaxed">
          On the roadmap. We'll ship it as part of the journal.
        </p>
        {/* unused-prop guard */}
        <span className="sr-only">
          <Icon className="h-0 w-0" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
};

const JournalToolsTabs = () => {
  const [active, setActive] = useState<TabKey>("journal");
  const activeTab = tabs.find((t) => t.key === active)!;

  return (
    <SectionShell id="journal-toolkit" atmosphere="subtle" beam={false}>
      <div className="text-center mb-12">
        <SectionEyebrow className="mb-4">The Journal Toolkit</SectionEyebrow>
        <SectionTitle gradient="split" size="default" className="mb-4">
          One journal.{" "}
          <span className="text-gold-primary">Every angle.</span>
        </SectionTitle>
        <p className="font-sans font-light text-ink-secondary text-base leading-relaxed max-w-2xl mx-auto">
          Four modules under one roof. Start with the Automated Journal today —
          Backtesting, AI Insights, and Trade Replay roll out next.
        </p>
      </div>

      {/* Tab pills */}
      <div
        role="tablist"
        aria-label="Journal toolkit features"
        className="flex flex-wrap justify-center gap-3 mb-10"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.key}`}
              id={`tab-${tab.key}`}
              onClick={() => setActive(tab.key)}
              className={`group relative inline-flex items-center gap-2.5 px-5 py-3 rounded-[12px] border transition-all duration-200 ease-out ${
                isActive
                  ? "bg-gold-primary/[0.08] border-gold-primary/40 text-ink-primary"
                  : "bg-section-card-rest border-gold-border text-ink-secondary hover:border-gold-primary/30 hover:text-ink-primary"
              }`}
            >
              <span
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                  isActive
                    ? "bg-gradient-to-br from-gold-primary/30 to-gold-primary/10 border border-gold-primary/40"
                    : "bg-section-card-deep border border-gold-border group-hover:border-gold-primary/25"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${
                    isActive
                      ? "text-gold-primary"
                      : "text-ink-tertiary group-hover:text-gold-primary/70"
                  }`}
                  aria-hidden="true"
                />
              </span>
              <span className="text-sm font-medium whitespace-nowrap">
                {tab.label}
              </span>
              {tab.status === "soon" && (
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-gold-primary/80 bg-gold-primary/5 border border-gold-primary/30 rounded-sm px-1.5 py-0.5">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab panel — keyed motion.div remounts on tab change for fade-in */}
      <motion.div
        key={active}
        id={`tabpanel-${active}`}
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-12 items-center"
      >
          {/* LEFT — text */}
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[1.5px] text-gold-primary/80 mb-3">
              {activeTab.eyebrow}
            </div>
            <h3 className="font-wordmark font-medium text-3xl lg:text-4xl text-ink-primary leading-tight mb-4">
              {activeTab.title}
            </h3>
            <p className="font-sans font-light text-ink-secondary text-base leading-relaxed mb-6">
              {activeTab.description}
            </p>
            <ul className="space-y-2.5">
              {activeTab.bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-ink-secondary"
                >
                  <span
                    className="mt-1.5 w-1 h-1 rounded-full bg-gold-primary shrink-0"
                    aria-hidden="true"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT — screenshot OR placeholder */}
          <div className="relative">
            {/* outer glow */}
            <div
              className="absolute -inset-6 bg-gradient-to-r from-gold-primary/15 via-gold-primary/[0.08] to-transparent rounded-3xl blur-3xl opacity-50 pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative rounded-2xl overflow-hidden border border-gold-border shadow-card-featured bg-section-card-deep">
              {/* corner brackets */}
              <span
                className="absolute top-2 left-2 w-4 h-4 border-t border-l border-construction-marker pointer-events-none z-20"
                aria-hidden="true"
              />
              <span
                className="absolute top-2 right-2 w-4 h-4 border-t border-r border-construction-marker pointer-events-none z-20"
                aria-hidden="true"
              />
              <span
                className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-construction-marker pointer-events-none z-20"
                aria-hidden="true"
              />
              <span
                className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-construction-marker pointer-events-none z-20"
                aria-hidden="true"
              />

              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gold-border/15 bg-gradient-to-b from-base-800 to-base-900">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-status-error/60" />
                  <div className="w-3 h-3 rounded-full bg-status-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-status-success/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-lg bg-ink-primary/[0.04] border border-ink-primary/[0.06]">
                    <span className="text-[11px] text-ink-tertiary font-mono">
                      {activeTab.screenshot?.url ??
                        `finotaur.com/app/journal/${activeTab.key}`}
                    </span>
                  </div>
                </div>
                <div className="w-12" />
              </div>

              {/* Body */}
              {activeTab.screenshot ? (
                <img
                  src={activeTab.screenshot.src}
                  alt={activeTab.screenshot.alt}
                  className="w-full h-auto block"
                  draggable={false}
                />
              ) : (
                <ComingSoonPlaceholder
                  icon={activeTab.icon}
                  label={activeTab.label}
                />
              )}
            </div>
          </div>
      </motion.div>
    </SectionShell>
  );
};

export default JournalToolsTabs;
