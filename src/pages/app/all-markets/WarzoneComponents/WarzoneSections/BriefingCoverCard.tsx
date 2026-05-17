/**
 * BriefingCoverCard — WAR ZONE Daily Report hero centerpiece.
 *
 * Polished against reference design via design:design-critique skill:
 *   - Date typography promoted to 32-40px (the cover's hero element)
 *   - Visible corner brackets (16px) — not tucked behind padding
 *   - Stronger outer glow + inner top-highlight band
 *   - Checkmark icon bullets (not pixelated dots)
 *   - Generous inner panel padding (20-22px)
 *   - Larger globe with better placement
 *   - Differentiated card chambers (Macro/Sentiment have distinct vibes)
 */

import * as React from "react";
import { Star, FileText, Mail, Check, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// MiniGlobe — dotted-globe illustration; bigger and better positioned
// ---------------------------------------------------------------------------
function MiniGlobe({ size = 120 }: { size?: number }) {
  const dots = [
    { cx: 50, cy: 28, r: 1.1 },
    { cx: 56, cy: 34, r: 1 },
    { cx: 64, cy: 28, r: 1.2 },
    { cx: 70, cy: 38, r: 1 },
    { cx: 78, cy: 34, r: 0.9 },
    { cx: 44, cy: 42, r: 1.1 },
    { cx: 38, cy: 50, r: 1.3 },
    { cx: 50, cy: 50, r: 1.5 },
    { cx: 60, cy: 48, r: 1.1 },
    { cx: 72, cy: 54, r: 1.2 },
    { cx: 80, cy: 50, r: 1 },
    { cx: 32, cy: 60, r: 1 },
    { cx: 44, cy: 64, r: 1.1 },
    { cx: 56, cy: 66, r: 1.2 },
    { cx: 70, cy: 64, r: 1.1 },
    { cx: 80, cy: 62, r: 1 },
    { cx: 38, cy: 72, r: 1 },
    { cx: 50, cy: 76, r: 1.1 },
    { cx: 62, cy: 74, r: 1 },
    { cx: 70, cy: 78, r: 0.9 },
    { cx: 26, cy: 50, r: 0.9 },
    { cx: 86, cy: 50, r: 0.9 },
  ];
  return (
    <svg viewBox="0 0 110 110" width={size} height={size} aria-hidden>
      <defs>
        <radialGradient id="mini-globe-bg" cx="40%" cy="35%" r="62%">
          <stop offset="0%" stopColor="#3a2c14" />
          <stop offset="100%" stopColor="#0a0805" />
        </radialGradient>
        <radialGradient id="mini-globe-halo" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="rgba(244,217,123,0.45)" />
          <stop offset="100%" stopColor="rgba(201,166,70,0)" />
        </radialGradient>
      </defs>
      <circle cx="55" cy="55" r="54" fill="url(#mini-globe-halo)" />
      <circle
        cx="55"
        cy="55"
        r="44"
        fill="url(#mini-globe-bg)"
        stroke="rgba(201,166,70,0.55)"
        strokeWidth="0.7"
      />
      {[24, 14, 4].map((ry, i) => (
        <ellipse
          key={i}
          cx="55"
          cy="55"
          rx="44"
          ry={ry}
          fill="none"
          stroke="rgba(201,166,70,0.28)"
          strokeWidth="0.45"
        />
      ))}
      {[44, 30, 16].map((rx, i) => (
        <ellipse
          key={i}
          cx="55"
          cy="55"
          rx={rx}
          ry="44"
          fill="none"
          stroke="rgba(201,166,70,0.28)"
          strokeWidth="0.45"
        />
      ))}
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill="#F4D97B"
          opacity={0.9}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SentimentSparkline — refined climbing chart
// ---------------------------------------------------------------------------
function SentimentSparkline() {
  const points = [32, 36, 41, 38, 44, 48, 53, 60, 64, 70, 76, 82, 90, 96];
  const W = 280;
  const H = 96;
  const padX = 4;
  const padY = 8;
  const stepX = (W - padX * 2) / (points.length - 1);
  const coords = points
    .map(
      (v, i) =>
        `${padX + i * stepX},${H - padY - (v / 100) * (H - padY * 2)}`,
    )
    .join(" ");

  const lastX = padX + (points.length - 1) * stepX;
  const lastY = H - padY - (points[points.length - 1] / 100) * (H - padY * 2);

  return (
    <div className="relative w-full mt-3">
      <div className="absolute right-0 inset-y-0 flex flex-col justify-between text-right font-mono text-[8px] tabular-nums text-ink-tertiary leading-none">
        <span>100</span>
        <span>75</span>
        <span>50</span>
        <span>25</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-[calc(100%-26px)] h-[96px]"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="sent-fill-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((p, i) => (
          <line
            key={i}
            x1="0"
            x2={W}
            y1={H * (1 - p)}
            y2={H * (1 - p)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.5"
          />
        ))}
        <polygon
          points={`${padX},${H - padY} ${coords} ${W - padX},${H - padY}`}
          fill="url(#sent-fill-grad)"
        />
        <polyline
          points={coords}
          fill="none"
          stroke="#4ADE80"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Glow + end dot */}
        <circle cx={lastX} cy={lastY} r="6" fill="#4ADE80" opacity="0.25" />
        <circle cx={lastX} cy={lastY} r="3" fill="#4ADE80" />
      </svg>

      <div className="flex justify-between text-[8px] font-mono uppercase tracking-[1px] text-ink-tertiary mt-1.5 pr-7">
        <span>May 9</span>
        <span>May 12</span>
        <span>May 14</span>
        <span>May 16</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function BriefingCoverCard({ className }: { className?: string }) {
  const today = new Date();
  const dateStr = today
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <div className={cn("relative w-full max-w-[680px] mx-auto", className)}>
      <style>{`
        @keyframes wz-dot-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>

      {/* Outer gold halo — bigger + more diffuse */}
      <div
        aria-hidden
        className="absolute -inset-16 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 800px 600px at 50% 50%, rgba(244,217,123,0.32) 0%, rgba(201,166,70,0.14) 35%, transparent 70%)",
        }}
      />

      {/* Card */}
      <div
        className="relative bg-surface-base/95 backdrop-blur-sm border-[0.5px] border-gold-border rounded-[18px] overflow-hidden"
        style={{
          boxShadow:
            "0 50px 120px -24px rgba(0,0,0,0.9), 0 0 100px -10px rgba(201,166,70,0.40), inset 0 0 0 1px rgba(201,166,70,0.08), inset 0 1px 0 rgba(244,217,123,0.18)",
        }}
      >
        {/* Inner top highlight band (subtle gold rim light) */}
        <div
          aria-hidden
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(244,217,123,0.65) 15%, rgba(244,217,123,0.9) 50%, rgba(244,217,123,0.65) 85%, transparent 100%)",
          }}
        />

        {/* Corner brackets — bigger, clearly visible */}
        <span className="absolute top-3 left-3 w-4 h-4 border-l-[1.5px] border-t-[1.5px] border-gold-primary z-20" />
        <span className="absolute top-3 right-3 w-4 h-4 border-r-[1.5px] border-t-[1.5px] border-gold-primary z-20" />
        <span className="absolute bottom-3 left-3 w-4 h-4 border-l-[1.5px] border-b-[1.5px] border-gold-primary z-20" />
        <span className="absolute bottom-3 right-3 w-4 h-4 border-r-[1.5px] border-b-[1.5px] border-gold-primary z-20" />

        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-7 md:px-8 py-4 border-b border-gold-border/40">
          <div className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="#C9A646" strokeWidth="1.4" />
              <circle cx="12" cy="12" r="5" stroke="#C9A646" strokeWidth="1.4" />
              <circle cx="12" cy="12" r="1.5" fill="#C9A646" />
              <line x1="12" y1="2" x2="12" y2="5" stroke="#C9A646" strokeWidth="1.4" />
              <line x1="12" y1="19" x2="12" y2="22" stroke="#C9A646" strokeWidth="1.4" />
              <line x1="2" y1="12" x2="5" y2="12" stroke="#C9A646" strokeWidth="1.4" />
              <line x1="19" y1="12" x2="22" y2="12" stroke="#C9A646" strokeWidth="1.4" />
            </svg>
            <span
              className="text-[11px] uppercase tracking-[3.5px] text-gold-primary"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
            >
              War Zone Report
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className="font-mono text-[10px] uppercase tracking-[1.8px] text-ink-secondary"
            >
              Delivered 9:00 AM ET
            </span>
            <span
              className="relative inline-flex w-2 h-2 rounded-full bg-gold-primary"
              style={{
                animation: "wz-dot-pulse 1.8s ease-in-out infinite",
                boxShadow: "0 0 8px 2px rgba(201,166,70,0.6)",
              }}
            />
          </div>
        </div>

        {/* DATE + CONVICTION — bigger date hero */}
        <div className="flex items-start justify-between gap-5 px-7 md:px-8 pt-6">
          <div className="flex-1 min-w-0">
            <h3
              className="text-[28px] md:text-[32px] uppercase text-ink-primary leading-[1.0]"
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              {dateStr}
            </h3>
            <p
              className="mt-2 text-[12px] uppercase tracking-[2.5px] text-ink-tertiary"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
            >
              Daily Market Intelligence Briefing
            </p>
          </div>

          {/* Conviction box — more substantial */}
          <div
            className="shrink-0 rounded-[12px] border-[0.5px] border-gold-border bg-surface-1 px-5 py-3 min-w-[160px]"
            style={{
              boxShadow: "inset 0 0 0 1px rgba(201,166,70,0.05), 0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            <div
              className="text-[10px] uppercase tracking-[2.5px] text-gold-primary mb-1.5"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
            >
              Conviction
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className="tabular-nums leading-none"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: "30px",
                  background:
                    "linear-gradient(135deg, #E8C766 0%, #F4D97B 50%, #C9A646 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                72
              </span>
              <span className="font-mono text-xs text-ink-tertiary">/100</span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: "72%",
                  background:
                    "linear-gradient(90deg, #A88838 0%, #C9A646 50%, #F4D97B 100%)",
                  boxShadow: "0 0 6px rgba(244,217,123,0.5)",
                }}
              />
            </div>
          </div>
        </div>

        {/* TWO INNER PANELS — generous padding, distinct vibes */}
        <div className="grid grid-cols-2 gap-4 px-7 md:px-8 pt-6">
          {/* MACRO OUTLOOK */}
          <div className="relative rounded-[12px] border-[0.5px] border-gold-border/60 bg-surface-1/70 p-5 overflow-hidden min-h-[230px]">
            <div
              className="text-[10px] uppercase tracking-[2.8px] text-gold-primary mb-3"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
            >
              Macro Outlook
            </div>
            <p
              className="text-ink-primary leading-[1.25] text-[17px] mb-4"
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 500,
                letterSpacing: "-0.005em",
              }}
            >
              Growth slowing,
              <br />
              liquidity still supportive.
            </p>
            <ul className="space-y-2 text-[12px] text-ink-secondary leading-tight relative z-10">
              <li className="flex items-start gap-2">
                <Check className="w-3 h-3 text-gold-primary mt-0.5 shrink-0" strokeWidth={2.5} />
                Disinflation trend intact
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3 h-3 text-gold-primary mt-0.5 shrink-0" strokeWidth={2.5} />
                Real yields declining
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3 h-3 text-gold-primary mt-0.5 shrink-0" strokeWidth={2.5} />
                Liquidity conditions stable
              </li>
            </ul>
            {/* Corner globe — bigger, peeks from bottom-right */}
            <div className="absolute -right-4 -bottom-4 opacity-95 pointer-events-none">
              <MiniGlobe size={120} />
            </div>
          </div>

          {/* MARKET SENTIMENT */}
          <div className="rounded-[12px] border-[0.5px] border-gold-border/60 bg-surface-1/70 p-5 min-h-[230px] flex flex-col">
            <div
              className="text-[10px] uppercase tracking-[2.8px] text-gold-primary mb-3"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
            >
              Market Sentiment
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="leading-none"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: "28px",
                  color: "#4ADE80",
                }}
              >
                Bullish
              </span>
              <TrendingUp className="w-5 h-5" strokeWidth={2.5} style={{ color: "#4ADE80" }} />
            </div>
            <p className="text-[12px] text-ink-secondary mb-2">Sentiment improving</p>
            <div className="flex-1">
              <SentimentSparkline />
            </div>
          </div>
        </div>

        {/* TOP TRADE IDEA STRIP */}
        <div
          className="mx-7 md:mx-8 mt-5 rounded-[12px] border-[0.5px] border-gold-border/60 bg-surface-1/70 p-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(201,166,70,0.05) 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="text-[10px] uppercase tracking-[2.8px] text-gold-primary"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
            >
              Top Trade Idea
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] uppercase tracking-[2.5px] text-ink-tertiary"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
              >
                Relevance
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5 text-gold-primary fill-gold-primary"
                    strokeWidth={1}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-[20px] text-ink-primary leading-none"
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              NVDA
            </span>
            <span
              className="px-2.5 py-1 rounded-full bg-gold-primary/15 border-[0.5px] border-gold-primary/50 text-[10px] uppercase tracking-[2px] text-gold-primary"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
            >
              Breakout
            </span>
            <span className="text-ink-tertiary text-xs">|</span>
            <span className="text-[13px] text-ink-secondary">
              AI demand + earnings momentum
            </span>
          </div>
        </div>

        {/* FOOTER */}
        <div
          className="flex items-center justify-between gap-4 px-7 md:px-8 py-4 mt-6 border-t border-gold-border/40"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(201,166,70,0.08) 100%)",
          }}
        >
          <div className="flex items-center gap-6 text-[11px]">
            <span className="inline-flex items-center gap-2 text-ink-secondary">
              <FileText className="w-3.5 h-3.5 text-gold-primary" strokeWidth={1.5} />
              <span
                className="uppercase tracking-[2px] text-[10px]"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
              >
                PDF Report
              </span>
            </span>
            <span className="inline-flex items-center gap-2 text-ink-secondary">
              <Mail className="w-3.5 h-3.5 text-gold-primary" strokeWidth={1.5} />
              <span
                className="uppercase tracking-[2px] text-[10px]"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
              >
                Email Report
              </span>
            </span>
          </div>
          <span
            className="text-[10px] uppercase tracking-[2.5px] text-ink-tertiary"
            style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
          >
            Vol. 1 · 2026
          </span>
        </div>
      </div>
    </div>
  );
}
