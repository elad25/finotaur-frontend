/**
 * "Exclusive Daily Briefing" section — 5 bullets + dashboard mock.
 */

import { Button } from "@/components/ds/Button";
import { Check, ArrowRight } from "lucide-react";
import { SectionEyebrow, SectionTitle } from "./_shared";
import DashboardMock from "./DashboardMock";

const BULLETS = [
  "Global Macro Analysis",
  "Sector Rotation Intelligence",
  "Technical + Fundamental Blend",
  "Actionable Trade Ideas",
  "Risk Levels & Key Catalysts",
];

interface Props {
  onSubscribe: () => void;
}

export default function DailyBriefingPreviewSection({ onSubscribe }: Props) {
  return (
    <section
      id="daily-briefing-preview"
      className="relative w-full"
      style={{
        background:
          'radial-gradient(ellipse 1200px 600px at 75% 50%, rgba(201,166,70,0.10) 0%, transparent 60%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* LEFT */}
          <div className="lg:col-span-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-[0.5px] border-gold-border bg-surface-1">
              <SectionEyebrow className="text-[10px]" showDot>
                Exclusive Daily Briefing
              </SectionEyebrow>
            </div>

            <SectionTitle className="mt-5">
              <span className="block text-ink-primary">The Clarity</span>
              <span className="block text-ink-primary">You Need.</span>
              <span
                className="block mt-1"
                style={{
                  background:
                    "linear-gradient(135deg, #E8C766 0%, #F4D97B 50%, #C9A646 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                The Context Others Miss.
              </span>
            </SectionTitle>

            <p className="mt-5 text-ink-secondary text-sm md:text-base leading-relaxed max-w-[360px]">
              Macro. Flow. Positioning. All in one place.
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {BULLETS.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full border-[0.5px] border-gold-border bg-surface-1 flex items-center justify-center">
                    <Check
                      className="w-3 h-3 text-gold-primary"
                      strokeWidth={2}
                    />
                  </span>
                  <span className="text-sm text-ink-primary">{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Button
                variant="gold"
                size="default"
                onClick={onSubscribe}
                showArrow={false}
              >
                <span className="inline-flex items-center gap-2">
                  See today's full briefing
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                </span>
              </Button>
            </div>
          </div>

          {/* RIGHT — dashboard mock */}
          <div className="lg:col-span-8">
            <DashboardMock />
          </div>
        </div>
      </div>
    </section>
  );
}
