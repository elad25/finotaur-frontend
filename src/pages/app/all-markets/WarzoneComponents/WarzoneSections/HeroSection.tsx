/**
 * Hero section — TOP SECRET visual DNA transplanted onto WAR ZONE.
 *
 * Mirrors `TopSecretLanding.tsx`:
 *   - 5-layer radial glow background (top center main + middle + 2 corners)
 *   - Lock-icon eyebrow badge with gradient border + inset highlight
 *   - Locked-preview report card (WarZoneReportPreviewCard)
 *   - Same color palette + framing
 */

import { Button } from "@/components/ds/Button";
import {
  Clock,
  Users,
  ShieldCheck,
  MessagesSquare,
  ArrowRight,
  FileText,
  Lock,
} from "lucide-react";
import WarZoneReportPreviewCard from "./WarZoneReportPreviewCard";

interface HeroSectionProps {
  onSubscribe: () => void;
}

interface StatTile {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: string;
  label: string;
}

const STAT_TILES: StatTile[] = [
  { icon: Clock, value: "9:00 AM ET", label: "Daily Delivery" },
  { icon: Users, value: "847+", label: "Active Operators" },
  { icon: ShieldCheck, value: "7 Days", label: "Free Trial" },
  { icon: MessagesSquare, value: "24/7", label: "Discord Access" },
];

function StatTileEl({ tile }: { tile: StatTile }) {
  const Icon = tile.icon;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-full border-[0.5px] border-gold-border bg-surface-1 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gold-primary" strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <div
          className="text-[12px] uppercase tracking-[1.5px] text-ink-primary leading-tight"
          style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
        >
          {tile.value}
        </div>
        <div
          className="text-[9px] uppercase tracking-[2px] text-ink-tertiary leading-tight mt-1"
          style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
        >
          {tile.label}
        </div>
      </div>
    </div>
  );
}

export default function HeroSection({ onSubscribe }: HeroSectionProps) {
  const scrollToBriefing = () => {
    const el = document.getElementById("daily-briefing-preview");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative w-full overflow-hidden">
      {/* TOP SECRET DNA — 5-layer ambient glow */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#12100D] to-[#0B0B0B] pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center top, rgba(201,166,70,0.15) 0%, rgba(180,140,50,0.08) 30%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(201,166,70,0.10) 0%, rgba(150,120,40,0.05) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-1/4 left-0 w-[500px] h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, rgba(180,140,50,0.06) 0%, transparent 60%)",
          filter: "blur(100px)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-1/4 right-0 w-[400px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, rgba(201,166,70,0.05) 0%, transparent 60%)",
          filter: "blur(80px)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 pt-20 md:pt-28 pb-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-12 items-center">
          {/* LEFT — editorial copy */}
          <div className="lg:col-span-6">
            {/* TOP SECRET-style lock badge */}
            <div
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, rgba(201,166,70,0.20) 0%, rgba(201,166,70,0.05) 100%)",
                border: "1px solid rgba(201,166,70,0.40)",
                boxShadow:
                  "0 0 40px rgba(201,166,70,0.20), inset 0 1px 0 rgba(255,255,255,0.10)",
              }}
            >
              <Lock className="w-4 h-4 text-[#C9A646]" strokeWidth={2} />
              <span
                className="text-[#C9A646] tracking-wider text-sm"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
              >
                Pre-Market Intelligence
              </span>
            </div>

            <h1
              className="mt-6 text-[52px] md:text-[72px] lg:text-[96px] leading-[0.94] uppercase"
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 700,
                letterSpacing: "-0.035em",
              }}
            >
              <span className="block text-ink-primary">Top Secret</span>
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
                Daily Report
              </span>
            </h1>

            <div
              aria-hidden
              className="mt-8 h-px w-28"
              style={{
                background:
                  "linear-gradient(90deg, rgba(244,217,123,0.95) 0%, rgba(201,166,70,0.2) 100%)",
              }}
            />

            <p
              className="mt-6 text-ink-secondary leading-relaxed max-w-[440px]"
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 400,
                fontSize: "16px",
                lineHeight: "1.55",
              }}
            >
              Institutional-grade market intelligence.
              <br />
              Delivered every market day at 9:00 AM ET.
            </p>

            {/* Stat tiles */}
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
              {STAT_TILES.map((tile) => (
                <StatTileEl key={tile.label} tile={tile} />
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button
                variant="gold"
                size="xl"
                onClick={onSubscribe}
                showArrow={false}
                className="!uppercase tracking-[1.8px] text-[13px]"
              >
                <span className="inline-flex items-center gap-2.5">
                  Open Today's Briefing
                  <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                </span>
              </Button>
              <Button
                variant="goldOutline"
                size="xl"
                onClick={scrollToBriefing}
                showArrow={false}
                className="!uppercase tracking-[1.8px] text-[13px]"
              >
                <span className="inline-flex items-center gap-2.5">
                  View Latest Report
                  <FileText className="w-4 h-4" strokeWidth={1.8} />
                </span>
              </Button>
            </div>
          </div>

          {/* RIGHT — locked report preview (TopSecret DNA) */}
          <div className="lg:col-span-6 relative">
            <WarZoneReportPreviewCard />
          </div>
        </div>
      </div>
    </section>
  );
}
