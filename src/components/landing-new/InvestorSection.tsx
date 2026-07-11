// src/components/landing-new/InvestorSection.tsx
// ================================================
// THE INVESTOR — research desk zone.
// Daily briefing (flagship) → Weekly/Monthly research → Stock Analyzer (real
// screenshot) → Research Hub row (Insider Flow / 13F / ETF X-Ray / WAR ZONE).
//
// ClassifiedPanel is a placeholder for screenshots that are "coming later"
// (Top Secret, Weekly Report, Deep Dive, WAR ZONE). Swap for a real <img>
// later by passing the `image` prop — no structural change needed.
// ================================================

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { TrendingUp, Users, FileBarChart, Layers, Radio } from "lucide-react";
import { Button } from "@/components/ds/Button";
import { SectionShell, SectionEyebrow, SectionTitle } from "./_shared";
import stockAnalyzerSearch from "@/assets/landing/stock-analyzer-search.webp";

// ---------------------------------------------------------------------------
// ClassifiedPanel — intelligence-dossier placeholder for screenshots
// arriving later. Pass `image` to swap in a real screenshot (one-line change).
// ---------------------------------------------------------------------------
interface ClassifiedPanelProps {
  label: string;
  image?: string;
  alt?: string;
  className?: string;
}

function ClassifiedPanel({ label, image, alt, className }: ClassifiedPanelProps) {
  if (image) {
    return (
      <img
        src={image}
        alt={alt ?? label}
        loading="lazy"
        decoding="async"
        className={`w-full rounded-[12px] border border-border-ds-subtle ${className ?? ""}`}
      />
    );
  }

  return (
    <div
      className={`relative rounded-[12px] border border-gold-border bg-section-card-rest p-5 overflow-hidden ${className ?? ""}`}
    >
      {/* Corner brackets */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-gold-primary/50 pointer-events-none" aria-hidden="true" />
      <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-gold-primary/50 pointer-events-none" aria-hidden="true" />
      <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-gold-primary/50 pointer-events-none" aria-hidden="true" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-gold-primary/50 pointer-events-none" aria-hidden="true" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] uppercase tracking-[0.3em] text-gold-eyebrow font-medium">
            {label}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-gold-muted bg-gold-border text-gold-primary text-[9px] font-semibold uppercase tracking-[0.2em]">
            Classified
          </span>
        </div>

        {/* Skeleton text bars — blurred-looking gradient bars, no lorem ipsum */}
        <div className="space-y-2.5">
          <div className="h-3 w-[92%] rounded-sm bg-gradient-to-r from-ink-primary/15 via-ink-primary/8 to-transparent blur-[1px]" />
          <div className="h-3 w-[78%] rounded-sm bg-gradient-to-r from-ink-primary/15 via-ink-primary/8 to-transparent blur-[1px]" />
          <div className="h-3 w-[85%] rounded-sm bg-gradient-to-r from-ink-primary/15 via-ink-primary/8 to-transparent blur-[1px]" />
          <div className="h-3 w-[60%] rounded-sm bg-gradient-to-r from-ink-primary/15 via-ink-primary/8 to-transparent blur-[1px]" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Research Hub row data
// ---------------------------------------------------------------------------
const researchHubCards = [
  {
    icon: Users,
    title: "Insider Flow",
    description: "Who's buying their own stock",
  },
  {
    icon: FileBarChart,
    title: "13F Tracker",
    description: "Follow the funds' real positions",
  },
  {
    icon: Layers,
    title: "ETF X-Ray",
    description: "Compare holdings, overlap and cost",
  },
];

// ---------------------------------------------------------------------------
// InvestorSection
// ---------------------------------------------------------------------------
const InvestorSection = () => {
  return (
    <SectionShell id="investor" atmosphere="full" beam={false} constructionMarkers={true}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <SectionEyebrow>The Investor</SectionEyebrow>
          <SectionTitle gradient="split" size="default">
            <span className="text-ink-primary">The research desk you were </span>
            <span className="text-gold-primary">never given.</span>
          </SectionTitle>
          <p className="text-base text-ink-muted max-w-2xl mx-auto">
            Daily intelligence, weekly strategy, monthly deep dives — written like the
            desks that manage billions, priced like a subscription.
          </p>
        </div>

        {/* Block 1 — flagship: TOP SECRET */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid md:grid-cols-2 gap-8 items-center mb-16"
        >
          <ClassifiedPanel label="Top Secret — Daily Briefing" className="min-h-[220px]" />
          <div>
            <h3 className="font-wordmark font-medium text-2xl md:text-3xl text-ink-primary mb-3">
              Wake up knowing exactly what matters.
            </h3>
            <p className="text-ink-muted text-sm md:text-base leading-relaxed">
              Every morning before the bell: the overnight moves that matter, the flow
              worth watching, and the one thing not to miss. Five minutes, zero noise.
            </p>
          </div>
        </motion.div>

        {/* Hairline divider */}
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent mx-auto mb-16" aria-hidden="true" />

        {/* Block 2 — two-up: Weekly Report + Monthly Deep Dive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-6">
            <h3 className="font-wordmark font-medium text-2xl md:text-3xl text-ink-primary mb-3">
              Research with a spine.
            </h3>
            <p className="text-ink-muted text-sm md:text-base leading-relaxed max-w-xl mx-auto">
              A Sunday plan for the week ahead. A monthly institutional-grade thesis on
              one name — entry logic, risks, and a price framework.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <ClassifiedPanel label="The Weekly Report — Sundays" className="min-h-[180px]" />
            <ClassifiedPanel label="Deep Dive — Monthly" className="min-h-[180px]" />
          </div>
        </motion.div>

        {/* Hairline divider */}
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent mx-auto mb-16" aria-hidden="true" />

        {/* Block 3 — image: Stock Analyzer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid md:grid-cols-2 gap-8 items-center mb-16"
        >
          <div className="order-2 md:order-1">
            <h3 className="font-wordmark font-medium text-2xl md:text-3xl text-ink-primary mb-3">
              Any stock. Analyzed in 30 seconds.
            </h3>
            <p className="text-ink-muted text-sm md:text-base leading-relaxed">
              Fundamentals, technicals, flow and sentiment — compressed into one
              verdict by AI trained to think like an analyst, not a chatbot.
            </p>
          </div>
          <img
            src={stockAnalyzerSearch}
            alt="Stock Analyzer search screen showing an AAPL chart and AI analysis card"
            loading="lazy"
            decoding="async"
            className="order-1 md:order-2 w-full rounded-[12px] border border-border-ds-subtle"
          />
        </motion.div>

        {/* Hairline divider */}
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent mx-auto mb-16" aria-hidden="true" />

        {/* Block 4 — Research Hub row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="text-center mb-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-gold-eyebrow font-medium">
              Research Hub
            </span>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {researchHubCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-5"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gold-border border border-gold-muted mb-3">
                    <Icon className="h-4 w-4 text-gold-primary" />
                  </div>
                  <h4 className="font-semibold text-ink-primary text-sm mb-1">{card.title}</h4>
                  <p className="text-ink-muted text-xs leading-relaxed">{card.description}</p>
                </div>
              );
            })}

            {/* WAR ZONE — mini ClassifiedPanel styling */}
            <div className="relative rounded-[12px] border border-gold-border bg-section-card-rest p-ds-5 overflow-hidden">
              <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t border-l border-gold-primary/50 pointer-events-none" aria-hidden="true" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t border-r border-gold-primary/50 pointer-events-none" aria-hidden="true" />
              <span className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b border-l border-gold-primary/50 pointer-events-none" aria-hidden="true" />
              <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b border-r border-gold-primary/50 pointer-events-none" aria-hidden="true" />
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gold-border border border-gold-muted mb-3">
                  <Radio className="h-4 w-4 text-gold-primary" />
                </div>
                <h4 className="font-semibold text-ink-primary text-sm mb-1 flex items-center gap-1.5">
                  WAR ZONE
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm border border-gold-muted bg-gold-border text-gold-primary text-[8px] font-semibold uppercase tracking-[0.2em]">
                    Classified
                  </span>
                </h4>
                <p className="text-ink-muted text-xs leading-relaxed">Live macro situation room</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/register">
            <Button variant="gold" size="default">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              Unlock the research desk
            </Button>
          </Link>
        </div>
      </div>
    </SectionShell>
  );
};

export default InvestorSection;
