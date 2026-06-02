// src/components/landing-new/ProductShowcase.tsx
// ================================================
// 🔥 TRADING JOURNAL — "The best traders measure. Do you?"
// Hormozi: "The tool that stops your losing streak"
// Layout: Text left + Calendar hero image right (overflows right)
// ================================================

import { motion } from "framer-motion";
import { BookOpen, Link2, Brain, BarChart3, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ds/Button";
import { SectionShell } from "./_shared/SectionShell";
import { SectionEyebrow } from "./_shared/SectionEyebrow";
import { SectionTitle } from "./_shared/SectionTitle";

const journalFeatures = [
  {
    icon: Link2,
    title: "12,000+ Broker Sync",
    description: "Auto-import every trade. No manual entry.",
  },
  {
    icon: Brain,
    title: "AI Pattern Detection",
    description: "Identifies costly mistakes you'd never spot.",
  },
  {
    icon: BarChart3,
    title: "Bloomberg-Level Analytics",
    description: "Equity curves and metrics at institutional level.",
  },
  {
    icon: Target,
    title: "Strategy Tracking",
    description: "Know what works and what doesn't. Data, not guesswork.",
  },
];

const ProductShowcase = () => {
  return (
    <SectionShell id="journal-feature" atmosphere="subtle" beam={false}>
      {/* ========== TWO-COLUMN: TEXT LEFT + OVERSIZED IMAGE RIGHT ========== */}
      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-12 lg:gap-8 items-center">

        {/* ===== LEFT — TEXT + MINI FEATURES ===== */}
        <div>
          {/* Eyebrow + heading — no extra motion wrapper; SectionShell provides the outer fade-in */}
          <div className="mb-6">
            <SectionEyebrow className="justify-start mb-4">
              <BookOpen className="w-4 h-4 text-gold-primary" aria-hidden="true" />
              Smart Trading Journal
            </SectionEyebrow>

            <SectionTitle
              gradient="split"
              size="default"
              className="text-left mb-4"
            >
              The best traders measure.{" "}
              <span className="text-gold-primary">Do you?</span>
            </SectionTitle>

            <p className="font-sans font-light text-ink-secondary text-lg leading-relaxed max-w-lg">
              The tool that stops your losing streak. Track every trade, understand every pattern,
              and let AI show you exactly where you're leaving money on the table.
            </p>
          </div>

          {/* Mini feature grid — 2x2 compact */}
          <div className="grid grid-cols-2 gap-4">
            {journalFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                  className="group relative flex items-start gap-3 p-4 rounded-xl
                    bg-section-card-rest border border-gold-border
                    hover:bg-gold-primary/[0.04]
                    transition-all duration-300"
                >
                  {/* Corner brackets */}
                  <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-construction-marker pointer-events-none" aria-hidden="true" />
                  <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-construction-marker pointer-events-none" aria-hidden="true" />
                  <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-construction-marker pointer-events-none" aria-hidden="true" />
                  <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-construction-marker pointer-events-none" aria-hidden="true" />

                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                      bg-gradient-to-br from-gold-primary/[0.18] to-gold-primary/[0.05]
                      border border-gold-primary/25
                      group-hover:scale-110 transition-transform"
                  >
                    <Icon className="h-5 w-5 text-gold-primary" />
                  </div>

                  <div>
                    <h4 className="text-ink-primary font-semibold text-sm mb-0.5 group-hover:text-gold-primary transition-colors">
                      {feature.title}
                    </h4>
                    <p className="text-ink-tertiary text-xs leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Link to="/auth/register">
              <Button variant="gold" size="xl">Try the Journal — 14 days free</Button>
            </Link>
          </motion.div>
        </div>

        {/* ===== RIGHT — OVERSIZED CALENDAR IMAGE (overflows right edge) ===== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 40 }}
          whileInView={{ opacity: 1, scale: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="relative hidden lg:block"
          style={{
            /* Push image wider to the right — overflows the section but stays clipped */
            marginRight: '-12vw',
          }}
        >
          {/* Glow behind */}
          <div className="absolute -inset-8 bg-gradient-to-r from-gold-primary/20 via-gold-primary/12 to-transparent rounded-3xl blur-3xl opacity-50 pointer-events-none" aria-hidden="true" />

          {/* Image frame with corner brackets */}
          <div className="relative rounded-2xl overflow-hidden border border-gold-border shadow-card-featured">
            {/* Corner brackets — slightly larger (w-4 h-4) for visual centerpiece emphasis */}
            <span className="absolute top-2 left-2 w-4 h-4 border-t border-l border-construction-marker pointer-events-none z-20" aria-hidden="true" />
            <span className="absolute top-2 right-2 w-4 h-4 border-t border-r border-construction-marker pointer-events-none z-20" aria-hidden="true" />
            <span className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-construction-marker pointer-events-none z-20" aria-hidden="true" />
            <span className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-construction-marker pointer-events-none z-20" aria-hidden="true" />

            {/* Browser chrome bar */}
            <div
              className="flex items-center gap-2 px-5 py-3 border-b border-gold-border/15 bg-gradient-to-b from-base-800 to-base-900"
            >
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-status-error/60" />
                <div className="w-3 h-3 rounded-full bg-status-warning/60" />
                <div className="w-3 h-3 rounded-full bg-status-success/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-lg bg-ink-primary/[0.04] border border-ink-primary/[0.06]">
                  <span className="text-[11px] text-ink-tertiary font-mono">finotaur.com/app/journal/calendar</span>
                </div>
              </div>
              <div className="w-12" />
            </div>

            {/* Calendar image */}
            <img
              src="/assets/finotaur-calender.webp"
              alt="Finotaur Trading Journal — Calendar View with P&L tracking"
              width={1462}
              height={853}
              loading="lazy"
              decoding="async"
              className="w-full h-auto block"
              style={{ pointerEvents: 'none' }}
              draggable={false}
            />
          </div>

          {/* Fade-out on right edge for smooth overflow */}
          <div
            className="absolute top-0 right-0 bottom-0 w-24 pointer-events-none z-10"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(10,10,10,0.8))',
            }}
          />
        </motion.div>
      </div>
    </SectionShell>
  );
};

export default ProductShowcase;
