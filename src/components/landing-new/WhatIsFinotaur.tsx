// src/components/landing-new/WhatIsFinotaur.tsx
// ================================================
// 🔥 WHAT TOP SECRET ACTUALLY IS
// Goal: Define product without making it a generic newsletter
// ================================================

import { motion } from "framer-motion";
import { TrendingUp, Building2, Target, Compass } from "lucide-react";
import { SectionShell } from "./_shared/SectionShell";
import { SectionEyebrow } from "./_shared/SectionEyebrow";
import { SectionTitle } from "./_shared/SectionTitle";

const outcomes = [
  {
    icon: TrendingUp,
    text: "Monthly macro conclusions",
  },
  {
    icon: Building2,
    text: "Deep company research beyond headlines",
  },
  {
    icon: Compass,
    text: "Clear directional bias — not opinions",
  },
  {
    icon: Target,
    text: "Written for decision-makers, not content consumers",
  },
];

const WhatIsFinotaur = () => {
  return (
    <SectionShell id="features" atmosphere="subtle" beam={false} constructionMarkers={false}>
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <SectionEyebrow>The Platform</SectionEyebrow>
          <SectionTitle gradient="split">
            <span className="text-ink-primary">What is </span>
            <span className="text-gold-primary">TOP SECRET</span>
            <span className="text-ink-primary">?</span>
          </SectionTitle>
        </div>

        {/* Outcome Points */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-5 mb-12"
        >
          {outcomes.map((outcome, index) => {
            const Icon = outcome.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="relative flex items-center gap-5 p-5 rounded-xl
                  bg-section-card-rest border border-gold-border
                  shadow-card-rest hover:shadow-card-hover
                  hover:bg-gold-border
                  transition-all duration-300"
              >
                {/* Corner brackets — matching Hero non-flagship pattern */}
                <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-construction-marker pointer-events-none" aria-hidden="true" />
                <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-construction-marker pointer-events-none" aria-hidden="true" />
                <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-construction-marker pointer-events-none" aria-hidden="true" />
                <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-construction-marker pointer-events-none" aria-hidden="true" />

                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gold-border border border-gold-muted">
                  <Icon className="w-6 h-6 text-gold-primary" />
                </div>
                <p className="text-lg md:text-xl text-ink-primary leading-relaxed">
                  {outcome.text}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Important Note - What it's NOT */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7 }}
          className="text-center"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-6 text-ink-muted text-sm">
            <span className="flex items-center gap-2">
              <span className="text-ink-tertiary">✕</span>
              <span>Not PDFs</span>
            </span>
            <span className="text-ink-tertiary">•</span>
            <span className="flex items-center gap-2">
              <span className="text-ink-tertiary">✕</span>
              <span>Not email frequency</span>
            </span>
            <span className="text-ink-tertiary">•</span>
            <span className="flex items-center gap-2">
              <span className="text-ink-tertiary">✕</span>
              <span>Not newsletters</span>
            </span>
          </div>
          <p className="text-ink-muted text-sm mt-3 italic">
            Just clarity. Just direction. Just decisions.
          </p>
        </motion.div>
      </div>
    </SectionShell>
  );
};

export default WhatIsFinotaur;
