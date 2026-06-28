// src/components/landing-new/Vision.tsx
// ================================================
// 🔥 VALUE STACK — COMPACT + READABLE TEXT
// ================================================

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ds/Button";
import { SectionShell, SectionEyebrow, SectionTitle } from "./_shared";

const valueItems = [
  { name: "AI Stock Analyzer (7/day)", value: "$99" },
  { name: "AI Sector Analyzer (unlimited)", value: "$79" },
  { name: "Options Intelligence AI", value: "$149" },
  { name: "AI Scanner", value: "$59" },
  { name: "Top Secret Reports (daily + research)", value: "$50" },
  { name: "Trading Journal Premium", value: "$49" },
  { name: "Macro Analyzer", value: "$49" },
  { name: "Priority 24h Support", value: "$29" },
];

const Vision = () => {
  return (
    <SectionShell id="vision" atmosphere="subtle" beam={false} constructionMarkers={false} className="py-14">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-5">
          <SectionEyebrow className="mb-3">Value Stack</SectionEyebrow>
          <SectionTitle size="default" gradient="split" className="text-2xl md:text-3xl mb-1.5">
            What you get for{" "}
            <span className="text-gold-primary">$109/month</span>
          </SectionTitle>
          <p className="text-sm text-ink-secondary">
            Everything you need to trade like an institution — in one subscription.
          </p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-xl overflow-hidden bg-section-card-rest border border-gold-border shadow-card-rest"
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
                  <span className="text-3xl font-bold text-gold-primary">$109</span>
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

            {/* CTA */}
            <Link to="/auth/register" className="block mt-5">
              <Button variant="gold" size="full">Get full access — 14 days free</Button>
            </Link>
            <p className="text-center text-ink-muted text-[10px] mt-1.5">Cancel anytime</p>
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
};

export default Vision;
