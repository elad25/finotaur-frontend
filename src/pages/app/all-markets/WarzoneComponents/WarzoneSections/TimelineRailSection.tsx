/**
 * "Inside Today's Briefing" — showcases the 6 real editorial sections that
 * appear in every WAR ZONE daily briefing.
 *
 * These match the actual product (see `useWarZoneData.ts` content agents):
 *   1. Macro      2. Sector Rotation     3. Tactical Posture
 *   4. Catalysts  5. Options Intel       6. Trade Ideas
 *
 * Below the cards: a 6-stage delivery rail showing the pre-market workflow.
 */

import { Button } from "@/components/ds/Button";
import { SectionEyebrow, SectionTitle } from "./_shared";
import {
  Globe2,
  Layers,
  Crosshair,
  Zap,
  TrendingUp,
  Target,
  FileText,
} from "lucide-react";

interface EditorialCard {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  title: string;
  preview: string;
  tags: string[];
}

const CARDS: EditorialCard[] = [
  {
    icon: Globe2,
    label: "Section 01",
    title: "Macro Outlook",
    preview:
      "Global liquidity, central-bank posture, and the catalysts driving today's tape.",
    tags: ["Fed", "USD", "Yields"],
  },
  {
    icon: Layers,
    label: "Section 02",
    title: "Sector Rotation",
    preview:
      "Where institutional capital is flowing right now — and where it's leaving.",
    tags: ["Tech", "Energy", "Defensives"],
  },
  {
    icon: Crosshair,
    label: "Section 03",
    title: "Tactical Posture",
    preview:
      "Today's bias — bullish, neutral, or defensive — with the conviction score behind it.",
    tags: ["Bias", "Conviction"],
  },
  {
    icon: Zap,
    label: "Section 04",
    title: "Catalysts & Calendar",
    preview:
      "The earnings, macro prints, and events that will move tape this session.",
    tags: ["Earnings", "Fed", "Data"],
  },
  {
    icon: TrendingUp,
    label: "Section 05",
    title: "Options Intel",
    preview:
      "Unusual flow, dealer positioning, max-pain levels and gamma walls in play.",
    tags: ["Flow", "Gamma", "Max Pain"],
  },
  {
    icon: Target,
    label: "Section 06",
    title: "Trade Ideas",
    preview:
      "Specific setups with entry, target, and risk — institutional-grade conviction.",
    tags: ["Setup", "R/R", "Levels"],
  },
];

const TIMELINE = [
  { time: "11:00 PM ET", label: "Asia close scanned" },
  { time: "2:00 AM ET", label: "Europe flow captured" },
  { time: "3:30 AM ET", label: "Bond + dollar read" },
  { time: "5:00 AM ET", label: "Editorial drafted" },
  { time: "7:00 AM ET", label: "QA + conviction set" },
  { time: "9:00 AM ET", label: "Delivered to inbox" },
];

function EditorialCardEl({ card }: { card: EditorialCard }) {
  const Icon = card.icon;
  return (
    <div className="group relative rounded-[14px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-5 h-full hover:border-gold-border transition-colors duration-base overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-base"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(244,217,123,0.85) 50%, transparent 100%)",
        }}
      />

      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-[10px] border-[0.5px] border-gold-border bg-surface-2 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gold-primary" strokeWidth={1.5} />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-ink-tertiary">
          {card.label}
        </span>
      </div>

      <div
        className="text-lg uppercase text-ink-primary leading-tight"
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}
      >
        {card.title}
      </div>

      <p className="mt-2 text-sm text-ink-secondary leading-relaxed">
        {card.preview}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {card.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full bg-surface-2 border-[0.5px] border-border-ds-subtle text-[10px] font-mono uppercase tracking-[1px] text-ink-tertiary"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function TimelineRailSection() {
  const scrollToBriefing = () => {
    const el = document.getElementById("daily-briefing-preview");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative w-full">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12 items-end">
          <div className="lg:col-span-7">
            <SectionEyebrow showDot>Inside today's briefing</SectionEyebrow>
            <SectionTitle className="mt-3" size="large">
              <span className="block">Six editorial sections.</span>
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
                Zero noise.
              </span>
            </SectionTitle>
          </div>
          <div className="lg:col-span-5">
            <p className="text-ink-secondary text-sm md:text-base leading-relaxed">
              Every weekday at 9:00 AM ET you get the same structured briefing the
              best desks read before the bell — analyst-grade research scored for
              quality before it ships.
            </p>
            <div className="mt-5">
              <Button
                variant="goldOutline"
                size="default"
                onClick={scrollToBriefing}
                showArrow={false}
              >
                <span className="inline-flex items-center gap-2">
                  See a sample briefing
                  <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                </span>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map((card) => (
            <EditorialCardEl key={card.title} card={card} />
          ))}
        </div>

        <div className="hidden md:block mt-16">
          <div className="font-sans text-[10px] uppercase tracking-[2.5px] text-ink-tertiary text-center mb-6">
            From Asia close to your inbox — pre-market workflow
          </div>
          <div className="relative">
            <div
              className="absolute left-0 right-0 top-1/2 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(201,166,70,0.5) 10%, rgba(244,217,123,0.85) 50%, rgba(201,166,70,0.5) 90%, transparent 100%)",
              }}
            />
            <div className="relative grid grid-cols-6">
              {TIMELINE.map((stage, i) => (
                <div key={i} className="flex flex-col items-center gap-3 py-4">
                  <span className="relative inline-flex w-3 h-3">
                    {i === TIMELINE.length - 1 && (
                      <span className="absolute inline-flex w-full h-full rounded-full bg-gold-primary opacity-70 animate-ping" />
                    )}
                    <span
                      className={
                        i === TIMELINE.length - 1
                          ? "relative inline-flex w-3 h-3 rounded-full bg-gradient-gold shadow-[0_0_12px_4px_rgba(201,166,70,0.6)]"
                          : "relative inline-flex w-2.5 h-2.5 rounded-full bg-gold-primary shadow-[0_0_8px_2px_rgba(201,166,70,0.5)] mt-0.5 mx-auto"
                      }
                    />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-ink-tertiary">
                    {stage.time}
                  </span>
                  <span className="font-sans text-[10px] text-ink-secondary text-center max-w-[120px] leading-tight">
                    {stage.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
