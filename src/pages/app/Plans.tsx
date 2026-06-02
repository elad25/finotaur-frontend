// src/pages/app/Plans.tsx
// "Choose Your Plan" intermediate screen — routes users to the correct pricing page.
// Unlocked: no JournalRoute / LockedRoute wrapper.

import { useNavigate } from "react-router-dom";
import { ChevronLeft, BookOpen, Globe } from "lucide-react";
import { Card, Eyebrow } from "@/components/ds/Card";
import { Button } from "@/components/ds/Button";

export default function PlansPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-base text-ink-primary">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Back button — matches JournalPricingPage pattern */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-ink-secondary hover:text-ink-primary transition-colors duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Page heading */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-ink-primary mb-3">
            Choose Your Plan
          </h1>
          <p className="text-ink-secondary max-w-md mx-auto text-sm sm:text-base">
            Pick the path that fits how you work the markets.
          </p>
        </div>

        {/* Two-card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-ds-5">

          {/* Card 1 — Journal (For Traders) */}
          <Card
            variant="featured"
            padding="spacious"
            className="flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(201,166,70,0.18)]"
          >
            <div className="flex flex-col flex-1">
              {/* Icon + eyebrow */}
              <div className="flex items-center gap-ds-2 mb-ds-3">
                <BookOpen className="w-4 h-4 text-gold-muted shrink-0" aria-hidden="true" />
                <Eyebrow>For Traders</Eyebrow>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-semibold text-ink-primary mb-ds-3">
                Journal
              </h2>

              {/* Description */}
              <p className="text-ink-secondary text-sm leading-relaxed flex-1 mb-ds-6">
                Connect your broker, track every trade, tag and analyze your performance.
              </p>

              {/* CTA */}
              <Button
                variant="gold"
                size="full"
                onClick={() => navigate("/app/journal/pricing")}
              >
                View Journal pricing
              </Button>
            </div>
          </Card>

          {/* Card 2 — FINOTAUR (For Investors) */}
          <Card
            variant="featured"
            padding="spacious"
            className="flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(201,166,70,0.18)]"
          >
            <div className="flex flex-col flex-1">
              {/* Icon + eyebrow */}
              <div className="flex items-center gap-ds-2 mb-ds-3">
                <Globe className="w-4 h-4 text-gold-muted shrink-0" aria-hidden="true" />
                <Eyebrow>For Investors</Eyebrow>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-semibold text-ink-primary mb-ds-3">
                FINOTAUR
              </h2>

              {/* Description */}
              <p className="text-ink-secondary text-sm leading-relaxed flex-1 mb-ds-6">
                Full-market intelligence — screeners, AI analysis, macro &amp; equity research.
              </p>

              {/* CTA */}
              <Button
                variant="gold"
                size="full"
                onClick={() => navigate("/app/all-markets/pricing")}
              >
                View platform pricing
              </Button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
