// src/components/landing-new/InvestorSection.tsx
// ================================================
// THE INVESTOR — research desk zone.
// Publishing-cadence block (single cover + release-schedule ledger) →
// Stock Analyzer (real screenshot).
// ================================================

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ds/Button";
import { SectionShell, SectionEyebrow, SectionTitle } from "./_shared";
import stockAnalyzerSearch from "@/assets/landing/stock-analyzer-search.webp";
import reportTopsecret from "@/assets/landing/report-topsecret.webp";

// ---------------------------------------------------------------------------
// Release schedule ledger data
// ---------------------------------------------------------------------------
const releaseSchedule = [
  {
    chip: "DAILY",
    name: "TOP SECRET — Morning Intelligence Briefing",
    detail: "Every trading day, before the bell",
  },
  {
    chip: "SUNDAYS",
    name: "The Weekly Tactical Review",
    detail: "Latest: July 6 — macro signal, sector drifts, trade implications",
  },
  {
    chip: "MONTHLY",
    name: "Company Intelligence — Deep Dive",
    detail: "Latest: Johnson & Johnson (JNJ), July 10",
  },
  {
    chip: "EVENT",
    name: "Macro Event Reports",
    detail: "Latest: ISM Manufacturing, July 2",
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

        {/* Block 1+2 — publishing cadence: single cover + release-schedule ledger */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid md:grid-cols-5 gap-8 items-start mb-10"
        >
          <div className="md:col-span-2">
            <img
              src={reportTopsecret}
              alt="FINOTAUR Top Secret market intelligence report cover"
              loading="lazy"
              decoding="async"
              className="w-full max-h-[440px] object-contain rounded-[12px] border border-border-ds-subtle shadow-glow-gold-resting"
            />
          </div>

          <div className="md:col-span-3">
            <h3 className="font-wordmark font-medium text-2xl md:text-3xl text-ink-primary mb-3">
              Research that ships on schedule.
            </h3>
            <p className="text-ink-muted text-sm md:text-base leading-relaxed mb-6">
              Not a newsletter when we feel like it. A publishing desk with a calendar —
              a daily briefing before the bell, a Sunday plan for the week ahead, and a
              monthly institutional-grade thesis on one name.
            </p>

            <div className="relative pl-4">
              <div
                className="absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-gold-primary/40 via-gold-primary/15 to-transparent"
                aria-hidden="true"
              />
              {releaseSchedule.map((row, index) => (
                <div
                  key={row.chip}
                  className={`flex items-start gap-3 py-3 ${
                    index < releaseSchedule.length - 1 ? "border-b border-border-ds-subtle" : ""
                  }`}
                >
                  <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-[72px] text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm border border-gold-primary/40 text-gold-primary bg-gold-primary/5">
                    {row.chip}
                  </span>
                  <div>
                    <p className="text-ink-primary font-medium text-sm md:text-base">{row.name}</p>
                    <p className="text-ink-secondary text-sm">{row.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Hairline divider */}
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent mx-auto mb-10" aria-hidden="true" />

        {/* Block 3 — image: Stock Analyzer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid md:grid-cols-2 gap-8 items-center mb-10"
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
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent mx-auto mb-8" aria-hidden="true" />

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
