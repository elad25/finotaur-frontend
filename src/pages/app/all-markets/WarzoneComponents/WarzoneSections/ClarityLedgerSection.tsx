/**
 * "The Difference Is Clarity. Not Noise." — two-column comparison ledger.
 */

import { X, Check } from "lucide-react";
import { SectionEyebrow, SectionTitle } from "./_shared";

const WITHOUT = [
  "Wake up to 50+ headlines and zero clarity",
  "React to moves you should have anticipated",
  "Miss sector rotations until it's too late",
  "Trade on noise instead of conviction",
  "Second-guess every decision",
];

const WITH = [
  "Wake up knowing exactly what matters",
  "Position before the crowd reacts",
  "Catch rotations as they begin",
  "Trade with institutional-grade conviction",
  "Execute with clarity and confidence",
];

export default function ClarityLedgerSection() {
  return (
    <section
      className="relative w-full"
      style={{
        background:
          'radial-gradient(ellipse 1000px 500px at 80% 50%, rgba(244,217,123,0.08) 0%, transparent 60%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-4">
            <SectionEyebrow showDot>The difference is</SectionEyebrow>
            <SectionTitle className="mt-3">
              <span className="block text-ink-primary">The Difference Is</span>
              <span
                className="block"
                style={{
                  background:
                    "linear-gradient(135deg, #E8C766 0%, #F4D97B 50%, #C9A646 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Clarity.
              </span>
              <span className="block text-ink-primary">Not Noise.</span>
            </SectionTitle>
          </div>

          <div className="lg:col-span-8 relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative">
              {/* Without */}
              <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b-[0.5px] border-border-ds-subtle">
                  <span className="w-6 h-6 rounded-full border-[0.5px] border-num-negative/40 flex items-center justify-center">
                    <X className="w-3.5 h-3.5 text-num-negative" strokeWidth={2} />
                  </span>
                  <span className="font-sans text-[11px] uppercase tracking-[2px] text-ink-secondary">
                    Without TOP SECRET
                  </span>
                </div>
                <ul className="flex flex-col gap-3">
                  {WITHOUT.map((line) => (
                    <li key={line} className="flex items-start gap-3 text-sm text-ink-secondary">
                      <X
                        className="w-3.5 h-3.5 text-num-negative shrink-0 mt-1"
                        strokeWidth={2}
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* With */}
              <div className="rounded-[12px] border-[0.5px] border-gold-border bg-surface-1 p-5 shadow-[0_24px_60px_-24px_rgba(201,166,70,0.25)]">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b-[0.5px] border-gold-border">
                  <span className="w-6 h-6 rounded-full border-[0.5px] border-gold-border flex items-center justify-center">
                    <Check
                      className="w-3.5 h-3.5 text-gold-primary"
                      strokeWidth={2}
                    />
                  </span>
                  <span className="font-sans text-[11px] uppercase tracking-[2px] text-gold-primary">
                    With TOP SECRET
                  </span>
                </div>
                <ul className="flex flex-col gap-3">
                  {WITH.map((line) => (
                    <li key={line} className="flex items-start gap-3 text-sm text-ink-primary">
                      <Check
                        className="w-3.5 h-3.5 text-gold-primary shrink-0 mt-1"
                        strokeWidth={2}
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* VS badge */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex">
                <span
                  className="w-12 h-12 rounded-full flex items-center justify-center font-serif italic text-base text-ink-on-gold"
                  style={{
                    background:
                      "linear-gradient(135deg, #E8C766 0%, #C9A646 50%, #A88838 100%)",
                    boxShadow: "0 0 24px rgba(201,166,70,0.5)",
                  }}
                >
                  VS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
