/**
 * "Trusted By Serious Traders" — infinite-loop horizontal testimonial marquee.
 *
 * Cards scroll continuously right-to-left. Pauses on hover.
 * Side gradient fade-edges keep the strip looking framed.
 */

import { Star } from "lucide-react";
import { Change } from "@/components/ds/NumberDisplay";
import { SectionEyebrow, SectionTitle } from "./_shared";

interface Testimonial {
  initials: string;
  name: string;
  role: string;
  quote: string;
  ytd: number; // percent
  spark: number[];
}

const TESTIMONIALS: Testimonial[] = [
  {
    initials: "SM",
    name: "Sarah Mitchell",
    role: "Day Trader",
    quote:
      "WAR ZONE gives me the edge I was missing. This is the best investment I made this year.",
    ytd: 27.4,
    spark: [0.3, 0.35, 0.4, 0.5, 0.45, 0.55, 0.7, 0.72],
  },
  {
    initials: "MR",
    name: "Michael Rodriguez",
    role: "Prop Trader",
    quote:
      "I pay thousands for research subscriptions. WAR ZONE beats them all.",
    ytd: 41.8,
    spark: [0.2, 0.3, 0.5, 0.55, 0.65, 0.6, 0.78, 0.85],
  },
  {
    initials: "EW",
    name: "Emily Wang",
    role: "Portfolio Manager",
    quote:
      "Finally someone connects the macro to the moves. It saves me hours every day.",
    ytd: 19.6,
    spark: [0.4, 0.45, 0.5, 0.55, 0.5, 0.6, 0.62, 0.7],
  },
  {
    initials: "DC",
    name: "David Chen",
    role: "Hedge Fund Manager",
    quote:
      "The daily briefing is institutional-grade. I genuinely wait for it every morning.",
    ytd: 33.1,
    spark: [0.3, 0.4, 0.45, 0.5, 0.55, 0.6, 0.68, 0.78],
  },
  {
    initials: "JK",
    name: "James Kim",
    role: "Swing Trader",
    quote:
      "Writing quality and depth of analysis I haven't found anywhere else.",
    ytd: 22.6,
    spark: [0.35, 0.4, 0.42, 0.5, 0.55, 0.58, 0.62, 0.7],
  },
  {
    initials: "RG",
    name: "Rachel Green",
    role: "Options Trader",
    quote:
      "Like someone turned on the lights in a dark room. The full picture before market open.",
    ytd: 31.2,
    spark: [0.3, 0.35, 0.4, 0.55, 0.5, 0.62, 0.7, 0.78],
  },
  {
    initials: "AT",
    name: "Alex Thompson",
    role: "Crypto Investor",
    quote:
      "Tried the free trial and canceled all my other subscriptions. WAR ZONE is all I need.",
    ytd: 38.5,
    spark: [0.25, 0.35, 0.45, 0.5, 0.6, 0.65, 0.72, 0.82],
  },
  {
    initials: "LA",
    name: "Lisa Anderson",
    role: "Forex Trader",
    quote:
      "The macro analysis here is better than anything I got from Bloomberg Terminal.",
    ytd: 24.8,
    spark: [0.3, 0.35, 0.45, 0.5, 0.55, 0.55, 0.65, 0.72],
  },
];

function MiniLine({ points, color }: { points: number[]; color: string }) {
  const W = 260;
  const H = 64;
  const pad = 4;
  const stepX = (W - pad * 2) / (points.length - 1);
  const coords = points
    .map((v, i) => `${pad + i * stepX},${H - pad - v * (H - pad * 2)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-14"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`t-fill-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${pad},${H - pad} ${coords} ${W - pad},${H - pad}`}
        fill={`url(#t-fill-${color})`}
      />
      <polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="relative shrink-0 w-[320px] md:w-[360px] rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-5 hover:border-gold-border transition-colors duration-base">
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className="w-3.5 h-3.5 text-gold-primary fill-gold-primary"
            strokeWidth={1}
          />
        ))}
      </div>
      <p className="text-ink-primary text-sm leading-relaxed h-[60px]">
        &ldquo;{t.quote}&rdquo;
      </p>
      <div className="mt-5">
        <MiniLine points={t.spark} color="#C9A646" />
        <div className="mt-2 flex items-center justify-between">
          <Change
            value={t.ytd}
            format="percent"
            decimals={1}
            className="!text-num-default text-gold-primary"
          />
          <span className="font-sans text-[10px] uppercase tracking-[1.5px] text-ink-tertiary">
            YTD Performance
          </span>
        </div>
      </div>
      <div className="mt-5 pt-4 border-t-[0.5px] border-border-ds-subtle flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-gradient-gold text-ink-on-gold text-xs font-semibold flex items-center justify-center">
          {t.initials}
        </span>
        <div>
          <div className="text-sm text-ink-primary font-medium">{t.name}</div>
          <div className="text-[11px] text-ink-tertiary">{t.role}</div>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  // Duplicate the list so the marquee can loop seamlessly.
  const doubled = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className="relative w-full">
      <style>{`
        @keyframes wz-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .wz-marquee-track { animation: wz-marquee 60s linear infinite; }
        .wz-marquee-track:hover { animation-play-state: paused; }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-6">
        <div className="text-center max-w-3xl mx-auto">
          <SectionEyebrow showDot>Trusted by</SectionEyebrow>
          <SectionTitle className="mt-3">
            <span className="block">Trusted By</span>
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
              Serious Traders
            </span>
          </SectionTitle>
          <p className="mt-4 text-ink-secondary text-sm md:text-base leading-relaxed">
            Real feedback from traders who start their day with WAR ZONE.
          </p>
        </div>
      </div>

      {/* Marquee track — full-bleed so cards flow past the viewport edges */}
      <div className="relative overflow-hidden py-8 md:py-12">
        {/* Side fade-masks */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-20 md:w-40 z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(10,8,5,1) 0%, rgba(10,8,5,0) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-20 md:w-40 z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(270deg, rgba(10,8,5,1) 0%, rgba(10,8,5,0) 100%)",
          }}
        />

        <div className="wz-marquee-track flex gap-4 md:gap-5 w-max">
          {doubled.map((t, i) => (
            <TestimonialCard key={`${t.initials}-${i}`} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
