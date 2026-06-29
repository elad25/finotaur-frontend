// src/components/landing-new/JournalToolsTabs.tsx
// ================================================
// 🔥 JOURNAL TOOLS TABS — Tradezella-style tabbed product showcase
// Sits between ProductShowcase (Journal hero) and PartnershipRow (NinjaTrader vendor strip)
// Tabs: Meet FINO (Live), Automated Journal (Live), Shadow (Live), Backtesting (Coming Soon)
// ================================================

import { useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { BookOpen, LineChart, Brain, Layers, Sparkles, Lock, TrendingUp, Coins } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionShell } from "./_shared/SectionShell";
import { SectionEyebrow } from "./_shared/SectionEyebrow";
import { SectionTitle } from "./_shared/SectionTitle";

type TabKey = "journal" | "backtest" | "ai" | "shadow";

interface Tab {
  key: TabKey;
  icon: LucideIcon;
  label: string;
  status: "live" | "soon";
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  screenshot?: { src: string; alt: string; url: string; w?: number; h?: number };
}

const tabs: Tab[] = [
  {
    key: "ai",
    icon: Brain,
    label: "Meet FINO",
    status: "live",
    eyebrow: "Meet FINO",
    title: "Your AI assistant, everywhere you trade.",
    description:
      "Ask FINO anything — break down a trade in your journal, decode an options chain, or get context on any ticker. It's one tap away on every page of FINOTAUR.",
    bullets: [
      "Lives in your journal and across the whole site",
      "Ask about any trade, ticker, or setup",
      "Plain-English answers in seconds",
      "Always one tap away",
    ],
  },
  {
    key: "journal",
    icon: BookOpen,
    label: "Automated Journal",
    status: "live",
    eyebrow: "Automated Journal",
    title: "Every fill, journaled automatically.",
    description:
      "Connect once. Trades flow in real time from NinjaTrader and Tradovate — auto-tagged, fee-aware, and graded against your strategy.",
    bullets: [
      "Real-time NinjaTrader & Tradovate sync",
      "Auto strategy & setup tagging",
      "Notes, screenshots, voice memos",
    ],
    screenshot: {
      src: "/assets/finotaur-calender.webp",
      alt: "Finotaur Trading Journal — performance dashboard with equity curve",
      url: "finotaur.com/app/journal/dashboard",
      w: 1462,
      h: 853,
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
    key: "shadow",
    icon: Layers,
    label: "Shadow",
    status: "live",
    eyebrow: "Shadow",
    title: "See what your exit really cost you.",
    description:
      "Replay every closed trade against the exits you didn't take. Shadow models your stops and targets — held-to-plan, never-moved-stop, max favorable move — and tells you which habit is quietly costing you the most.",
    bullets: [
      "Stop & target what-if scenarios",
      "MFE / MAE on every closed trade",
      "Held-to-plan vs. what you actually did",
      "Confidence-scored gold verdicts",
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

// NOTE: status-success (green) used here per user's marketing-mockup reference style (their actual journal page uses green for positives). DS §14 says no green for new code; this is a marketing-mockup exception.
const JournalDashboardMock = () => {
  return (
    <div className="bg-section-card-deep p-3 lg:p-4">
      {/* 4 stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
        <StatCard
          label="Net P&L"
          value="+$8,247.30"
          valueClass="text-status-success"
          sub="18 closed trades"
          accent={<TrendingUp className="h-4 w-4 text-gold-primary" aria-hidden="true" />}
        />
        <StatCard
          label="Win Rate"
          value="64.3%"
          valueClass="text-status-success"
          sub="11W / 6L / 1BE"
          accent={<DonutAccent percent={64} />}
        />
        <StatCard
          label="Profit Factor"
          value="4.12"
          valueClass="text-status-success"
          sub="Per dollar risked"
          accent={<MiniSparkline />}
        />
        <StatCard
          label="Expectancy"
          value="+$458.18"
          valueClass="text-status-success"
          sub="Per Trade"
          accent={<Coins className="h-4 w-4 text-gold-primary" aria-hidden="true" />}
        />
      </div>

      {/* Equity curve panel */}
      <div className="bg-section-card-rest border border-gold-border rounded-[12px] p-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-ink-primary font-semibold text-xs">Equity Curve</div>
            <div className="text-ink-tertiary text-[10px] mt-0.5">Cumulative P&L over time</div>
          </div>
          <div className="text-[9px] uppercase tracking-[0.1em] text-ink-tertiary border border-gold-border rounded-sm px-1.5 py-0.5">
            Daily ▾
          </div>
        </div>
        <EquityCurveSVG />
        <div className="flex justify-between text-[9px] text-ink-tertiary mt-1.5 font-mono tabular-nums">
          <span>Start</span>
          <span>Dec 16</span>
          <span>Jan 04</span>
          <span>Feb 12</span>
          <span>Mar 19</span>
          <span>Apr 22</span>
          <span>May 21</span>
        </div>
      </div>
    </div>
  );
};

const MeetFinoIntro = () => {
  return (
    <div className="relative flex flex-col items-center justify-center px-3 py-4 overflow-hidden">
      <div className="flex flex-col items-center w-full">
        {/* Real 60s animated FINO (4 stitched clips, neutral-bracketed). Its
            pure-black background blends out via mix-blend-screen over the dark
            card — true transparent look, no box. */}
        <video
          className="w-full max-w-[352px] sm:max-w-[496px] h-auto mx-auto mix-blend-screen"
          src="/fino/fino-meet-60s-v2.mp4"
          poster="/fino/fino-meet-60s-v2-poster.png"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="FINO — the FINOTAUR AI assistant"
        />
      </div>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  valueClass,
  sub,
  accent,
}: {
  label: string;
  value: string;
  valueClass: string;
  sub: string;
  accent: ReactNode;
}) => {
  return (
    <div className="relative bg-section-card-rest border border-gold-border rounded-[12px] px-3 py-2.5 overflow-hidden">
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[9px] uppercase tracking-[0.1em] text-ink-tertiary">
          {label}
        </span>
        <div className="shrink-0">{accent}</div>
      </div>
      <div className={`font-sans tabular-nums text-base lg:text-lg font-semibold leading-none ${valueClass}`}>
        {value}
      </div>
      <div className="text-[9px] text-ink-tertiary mt-1 tabular-nums">{sub}</div>
    </div>
  );
};

const DonutAccent = ({ percent }: { percent: number }) => {
  const r = 7;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent / 100);
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" className="text-gold-primary" />
      <circle
        cx="9"
        cy="9"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-gold-primary"
        transform="rotate(-90 9 9)"
      />
    </svg>
  );
};

const MiniSparkline = () => (
  <svg width="32" height="14" viewBox="0 0 32 14" fill="none" aria-hidden="true">
    <path
      d="M0 11 L5 10 L9 8 L13 9 L17 5 L21 6 L25 3 L29 4 L32 1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-status-success"
    />
  </svg>
);

const EquityCurveSVG = () => (
  <svg
    viewBox="0 0 600 140"
    preserveAspectRatio="none"
    className="w-full h-[80px] block"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--gold-primary)" stopOpacity="0.35" />
        <stop offset="100%" stopColor="var(--gold-primary)" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* horizontal grid lines */}
    <line x1="0" y1="35" x2="600" y2="35" stroke="var(--gold-border)" strokeDasharray="2 4" />
    <line x1="0" y1="70" x2="600" y2="70" stroke="var(--gold-border)" strokeDasharray="2 4" />
    <line x1="0" y1="105" x2="600" y2="105" stroke="var(--gold-border)" strokeDasharray="2 4" />

    {/* Y-axis labels */}
    <text x="6" y="33" fontSize="9" fill="var(--ink-tertiary, rgba(255,255,255,0.45))" fontFamily="ui-monospace, monospace">$8.2k</text>
    <text x="6" y="68" fontSize="9" fill="var(--ink-tertiary, rgba(255,255,255,0.45))" fontFamily="ui-monospace, monospace">$4.1k</text>
    <text x="6" y="103" fontSize="9" fill="var(--ink-tertiary, rgba(255,255,255,0.45))" fontFamily="ui-monospace, monospace">$0</text>

    {/* Filled area under curve */}
    <path
      d="M 0 130 L 50 128 L 100 125 L 150 122 L 200 115 L 250 70 L 300 60 L 350 55 L 400 52 L 450 25 L 500 22 L 550 18 L 600 16 L 600 140 L 0 140 Z"
      fill="url(#equity-fill)"
    />

    {/* Curve line */}
    <path
      d="M 0 130 L 50 128 L 100 125 L 150 122 L 200 115 L 250 70 L 300 60 L 350 55 L 400 52 L 450 25 L 500 22 L 550 18 L 600 16"
      stroke="var(--gold-primary)"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// NOTE: status-success (green) / status-error (red) used here per the same
// marketing-mockup exception as JournalDashboardMock (DS §14 no-green is waived
// for these landing mocks that mirror the real journal's positive/negative colors).
const ScenarioCard = ({
  label,
  value,
  sub,
  tone,
  badge,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "gold" | "muted";
  badge?: string;
}) => (
  <div
    className={`relative bg-section-card-rest border rounded-[12px] px-3 py-2.5 overflow-hidden ${
      tone === "gold" ? "border-gold-primary/40" : "border-gold-border"
    }`}
  >
    {badge && (
      <span className="absolute top-1.5 right-1.5 text-[8px] font-medium uppercase tracking-[0.1em] text-gold-primary bg-gold-primary/10 border border-gold-primary/30 rounded-sm px-1 py-0.5">
        {badge}
      </span>
    )}
    <div className="text-[9px] uppercase tracking-[0.1em] text-ink-tertiary mb-1.5">
      {label}
    </div>
    <div
      className={`font-sans tabular-nums text-lg font-semibold leading-none ${
        tone === "gold" ? "text-gold-primary" : "text-ink-primary"
      }`}
    >
      {value}
    </div>
    <div className="text-[9px] text-status-success mt-1 tabular-nums">{sub}</div>
  </div>
);

const ShadowChartSVG = () => (
  <svg
    viewBox="0 0 600 150"
    preserveAspectRatio="none"
    className="w-full h-[110px] block"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="shadow-missed" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--gold-primary)" stopOpacity="0.22" />
        <stop offset="100%" stopColor="var(--gold-primary)" stopOpacity="0" />
      </linearGradient>
    </defs>

    {/* horizontal grid lines */}
    <line x1="0" y1="40" x2="600" y2="40" stroke="var(--gold-border)" strokeDasharray="2 4" />
    <line x1="0" y1="80" x2="600" y2="80" stroke="var(--gold-border)" strokeDasharray="2 4" />
    <line x1="0" y1="120" x2="600" y2="120" stroke="var(--gold-border)" strokeDasharray="2 4" />

    {/* missed-profit shaded zone between your early exit and the shadow target */}
    <rect x="300" y="30" width="300" height="42" fill="url(#shadow-missed)" />

    {/* actual market price path */}
    <path
      d="M 0 122 L 60 112 L 120 118 L 180 95 L 240 90 L 300 72 L 360 56 L 420 34 L 480 30 L 540 44 L 600 36"
      stroke="var(--ink-secondary, rgba(255,255,255,0.55))"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.55"
    />

    {/* entry marker */}
    <circle cx="180" cy="95" r="4" fill="var(--gold-primary)" />
    <text x="180" y="112" fontSize="9" textAnchor="middle" fill="var(--gold-primary)" fontFamily="ui-monospace, monospace">Entry</text>

    {/* your early exit — neutral dashed line */}
    <line x1="300" y1="72" x2="600" y2="72" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeDasharray="4 4" />
    <circle cx="300" cy="72" r="4" fill="rgba(255,255,255,0.75)" />
    <text x="310" y="68" fontSize="9" fill="rgba(255,255,255,0.6)" fontFamily="ui-monospace, monospace">You exited</text>

    {/* shadow target — gold dashed line */}
    <line x1="420" y1="34" x2="600" y2="34" stroke="var(--gold-primary)" strokeWidth="1.5" strokeDasharray="4 4" />
    <circle cx="420" cy="34" r="4" fill="var(--gold-primary)" />
    <text x="430" y="30" fontSize="9" fill="var(--gold-primary)" fontFamily="ui-monospace, monospace">Held to target</text>
  </svg>
);

const ShadowPerformanceMock = () => {
  return (
    <div className="bg-section-card-deep p-3 lg:p-4">
      {/* header: trade + verdict tag */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-wordmark text-sm text-ink-primary tracking-wide">NQ</span>
          <span className="text-[9px] uppercase tracking-[0.1em] text-status-success bg-status-success/10 border border-status-success/25 rounded-sm px-1.5 py-0.5">
            Long
          </span>
          <span className="text-[10px] text-ink-tertiary font-mono">Mar 19 · 2 contracts</span>
        </div>
        <div className="text-[9px] uppercase tracking-[0.18em] text-gold-primary/80 border border-gold-primary/30 rounded-sm px-2 py-0.5">
          Shadow Verdict
        </div>
      </div>

      {/* price chart: your exit vs held-to-target */}
      <div className="bg-section-card-rest border border-gold-border rounded-[12px] p-3 mb-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-ink-primary font-semibold text-xs">What could have been</div>
            <div className="text-ink-tertiary text-[10px] mt-0.5">Your exit vs. held-to-plan</div>
          </div>
          <div className="flex items-center gap-3 text-[9px]">
            <span className="flex items-center gap-1 text-ink-tertiary">
              <span className="w-2.5 h-[2px] bg-ink-secondary inline-block" aria-hidden="true" />You
            </span>
            <span className="flex items-center gap-1 text-gold-primary">
              <span className="w-2.5 h-[2px] bg-gold-primary inline-block" aria-hidden="true" />Shadow
            </span>
          </div>
        </div>
        <ShadowChartSVG />
      </div>

      {/* scenario comparison cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <ScenarioCard label="You exited" value="+1.4R" sub="+$612" tone="muted" />
        <ScenarioCard label="Held to target" value="+3.2R" sub="+$1,408" tone="gold" badge="Best" />
        <ScenarioCard label="Never moved stop" value="+2.1R" sub="+$924" tone="muted" />
      </div>

      {/* verdict line */}
      <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-[10px] bg-gold-primary/[0.06] border border-gold-primary/20">
        <Sparkles className="h-3.5 w-3.5 text-gold-primary shrink-0" aria-hidden="true" />
        <span className="text-[11px] text-ink-secondary leading-snug">
          You left <span className="text-status-success font-semibold">+1.8R ($796)</span> on the table by exiting early — your #1 recurring leak.
        </span>
      </div>
    </div>
  );
};

const JournalToolsTabs = () => {
  const [active, setActive] = useState<TabKey>("ai");
  const activeTab = tabs.find((t) => t.key === active)!;

  return (
    <SectionShell
      id="journal-toolkit"
      atmosphere="subtle"
      beam={false}
      className="pt-8 md:pt-12"
    >
      <div className="text-center mb-8">
        <SectionEyebrow className="mb-4">The Journal Toolkit</SectionEyebrow>
        <SectionTitle gradient="split" size="default" className="mb-4">
          One journal.{" "}
          <span className="text-gold-primary">Every angle.</span>
        </SectionTitle>
      </div>

      {/* Tab pills */}
      <div
        role="tablist"
        aria-label="Journal toolkit features"
        className="flex flex-wrap justify-center gap-3 mb-8"
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
            <h3 className="font-wordmark font-medium text-2xl lg:text-3xl text-ink-primary leading-tight mb-3">
              {activeTab.title}
            </h3>
            <p className="font-sans font-light text-ink-secondary text-base leading-relaxed mb-5">
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

              {/* Browser chrome — hidden for the AI/Fino tab (no mock frame) */}
              {activeTab.key !== "ai" && (
                <div className="flex items-center gap-2 px-3 sm:px-5 py-3 border-b border-gold-border/15 bg-gradient-to-b from-base-800 to-base-900">
                  <div className="flex gap-1.5 shrink-0">
                    <div className="w-3 h-3 rounded-full bg-status-error/60" />
                    <div className="w-3 h-3 rounded-full bg-status-warning/60" />
                    <div className="w-3 h-3 rounded-full bg-status-success/60" />
                  </div>
                  <div className="flex-1 min-w-0 flex justify-center">
                    <div className="px-4 py-1 rounded-lg bg-ink-primary/[0.04] border border-ink-primary/[0.06] min-w-0 max-w-full overflow-hidden">
                      <span className="block truncate text-[11px] text-ink-tertiary font-mono">
                        {activeTab.screenshot?.url ??
                          `finotaur.com/app/journal/${activeTab.key}`}
                      </span>
                    </div>
                  </div>
                  <div className="w-6 sm:w-12 shrink-0" />
                </div>
              )}

              {/* Body */}
              {activeTab.key === "journal" ? (
                <JournalDashboardMock />
              ) : activeTab.key === "ai" ? (
                <MeetFinoIntro />
              ) : activeTab.key === "shadow" ? (
                <ShadowPerformanceMock />
              ) : activeTab.screenshot ? (
                <img
                  src={activeTab.screenshot.src}
                  alt={activeTab.screenshot.alt}
                  width={activeTab.screenshot.w}
                  height={activeTab.screenshot.h}
                  loading="lazy"
                  decoding="async"
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
