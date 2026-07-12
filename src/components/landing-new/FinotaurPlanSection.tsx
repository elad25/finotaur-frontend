// src/components/landing-new/FinotaurPlanSection.tsx
// ================================================
// THE FINOTAUR PLAN — everything, one terminal.
// 4 engine cards (adapted from AISection's card idiom) → value stack table
// (absorbed mechanically from Vision.tsx, numbers unchanged) → Copilot
// "coming soon" teaser (no CTA) → single gold CTA.
// ================================================

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Database, FileText, SlidersHorizontal, Brain, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ds/Button";
import { SectionShell, SectionEyebrow, SectionTitle } from "./_shared";

// ---------------------------------------------------------------------------
// Engine cards — 4 core value pillars (card idiom adapted from AISection.tsx)
// ---------------------------------------------------------------------------
const engineCards = [
  {
    icon: Database,
    title: "All Your Data, One Place",
    description: "Accounts, trades, markets and research — one terminal instead of ten tabs.",
  },
  {
    icon: FileText,
    title: "Institutional Research",
    description: "Daily briefings, weekly strategy and monthly deep dives, shipped on schedule.",
  },
  {
    icon: SlidersHorizontal,
    title: "Trading & Investing Tools",
    description: "Copier, risk manager, screeners, scanners and backtesting — built in.",
  },
  {
    icon: Brain,
    title: "Advanced AI",
    description: "FINO unlimited, the Leak Detector, options intelligence and 30-second stock verdicts.",
  },
];

// ---------------------------------------------------------------------------
// Value stack — absorbed as-is from Vision.tsx (numbers unchanged)
// ---------------------------------------------------------------------------
const valueItems = [
  { name: "AI Stock Analyzer (unlimited)", value: "$99" },
  { name: "AI Sector Analyzer (unlimited)", value: "$79" },
  { name: "Options Intelligence AI + Dark Pool flow", value: "$149" },
  { name: "AI Scanner — daily Top 5", value: "$59" },
  { name: "Investor — TOP SECRET intel + research hub", value: "$49" },
  { name: "Trader — journal, copier & analytics", value: "$45" },
  { name: "Macro Analyzer", value: "$49" },
  { name: "Priority 24h Support", value: "$29" },
];

// ---------------------------------------------------------------------------
// FinotaurPlanSection
// ---------------------------------------------------------------------------
const FinotaurPlanSection = () => {
  return (
    <SectionShell id="finotaur-plan" atmosphere="subtle" beam={false} constructionMarkers={true}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <SectionEyebrow>The Finotaur Plan</SectionEyebrow>
          <SectionTitle gradient="split" size="default">
            <span className="text-ink-primary">The only terminal you&apos;ll </span>
            <span className="text-gold-primary">ever need.</span>
          </SectionTitle>
          <p className="text-base text-ink-muted max-w-2xl mx-auto">
            Everything the Trader gets. Everything the Investor gets. Plus the tools we
            built for the members who want it all.
          </p>
        </div>

        {/* Row of 4 engine cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {engineCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.08 * index }}
                className="group relative rounded-[12px] overflow-hidden bg-section-card-rest border border-gold-border p-ds-5 transition-colors duration-500 hover:bg-section-card-deep"
              >
                {/* Corner brackets */}
                <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-construction-marker pointer-events-none" aria-hidden="true" />
                <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-construction-marker pointer-events-none" aria-hidden="true" />
                <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-construction-marker pointer-events-none" aria-hidden="true" />
                <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-construction-marker pointer-events-none" aria-hidden="true" />

                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-gold-border border border-gold-muted mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-5 w-5 text-gold-primary" />
                  </div>
                  <h3 className="font-bold text-ink-primary text-sm mb-1 group-hover:text-gold-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-ink-muted text-xs leading-relaxed">{card.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Hairline divider */}
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent mx-auto mb-16" aria-hidden="true" />

        {/* Value stack table — absorbed from Vision.tsx, numbers unchanged */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto relative rounded-xl overflow-hidden bg-section-card-rest border border-gold-border shadow-card-rest mb-16"
        >
          {/* Corner brackets */}
          <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-construction-marker pointer-events-none" aria-hidden="true" />
          <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-construction-marker pointer-events-none" aria-hidden="true" />
          <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-construction-marker pointer-events-none" aria-hidden="true" />
          <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-construction-marker pointer-events-none" aria-hidden="true" />

          <div className="p-5">
            {/* Items */}
            <div className="mb-4">
              {valueItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-border-ds-subtle last:border-none"
                >
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-gold-primary shrink-0" />
                    <span className="text-ink-primary text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-ink-muted line-through text-xs font-mono">{item.value}/mo</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-gold-muted">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-ink-secondary text-sm">Total if purchased separately:</span>
                <span className="text-ink-muted line-through text-base font-mono">$672/mo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-primary font-bold text-base">You pay:</span>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-gold-primary font-mono tabular-nums">$89</span>
                  <span className="text-ink-secondary text-sm mb-0.5">/month</span>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold-border border border-gold-muted text-gold-primary text-xs font-semibold">
                  <Sparkles className="w-3 h-3" />
                  Save 84% — $563/month in your pocket
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Copilot teaser strip — no CTA */}
        <div className="flex flex-col items-center gap-2 text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-gold-muted bg-gold-border text-gold-primary text-[9px] font-semibold uppercase tracking-[0.3em]">
            Coming Soon
          </span>
          <p className="text-ink-muted text-sm">
            Copilot — an AI portfolio manager that trades alongside you, 24/7.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/register">
            <Button variant="gold" size="default">Get full access — 14 days free</Button>
          </Link>
        </div>
      </div>
    </SectionShell>
  );
};

export default FinotaurPlanSection;
