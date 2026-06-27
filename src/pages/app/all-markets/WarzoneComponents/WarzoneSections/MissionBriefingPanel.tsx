/**
 * MissionBriefingPanel — WAR ZONE-themed hero visualization.
 *
 * Shows a stylized preview of today's briefing including the 6 real editorial
 * sections that subscribers actually get: Macro, Sector Rotation, Tactical
 * Posture, Catalysts, Options Intel, Trade Ideas.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Globe2,
  Layers,
  Crosshair,
  Zap,
  TrendingUp,
  Target,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Countdown to next NYSE open (9:30 AM ET, Mon-Fri)
// ---------------------------------------------------------------------------
function useCountdownToOpen(): string {
  const [text, setText] = React.useState("--:--:--");
  React.useEffect(() => {
    const compute = () => {
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
      const et = new Date(utcMs - 4 * 60 * 60 * 1000);
      const target = new Date(et);
      target.setHours(9, 30, 0, 0);
      if (et.getTime() >= target.getTime()) target.setDate(target.getDate() + 1);
      while (target.getDay() === 0 || target.getDay() === 6) {
        target.setDate(target.getDate() + 1);
      }
      const diff = Math.max(0, target.getTime() - et.getTime());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setText(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, []);
  return text;
}

// ---------------------------------------------------------------------------
// Crosshair / scope ornament — pure SVG
// ---------------------------------------------------------------------------
function CrosshairBackdrop() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.30]"
      aria-hidden
    >
      <defs>
        <radialGradient id="scope-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(244,217,123,0.30)" />
          <stop offset="50%" stopColor="rgba(201,166,70,0.10)" />
          <stop offset="100%" stopColor="rgba(201,166,70,0)" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="180" fill="url(#scope-glow)" />
      {[180, 145, 110, 75, 40].map((r, i) => (
        <circle
          key={r}
          cx="200"
          cy="200"
          r={r}
          fill="none"
          stroke="rgba(201,166,70,0.35)"
          strokeWidth={i === 0 ? 0.8 : 0.5}
          strokeDasharray={i === 0 ? "2 4" : undefined}
        />
      ))}
      {[0, 90, 180, 270].map((angle) => (
        <line
          key={angle}
          x1="200"
          y1="20"
          x2="200"
          y2="40"
          stroke="rgba(201,166,70,0.6)"
          strokeWidth="1"
          transform={`rotate(${angle} 200 200)`}
        />
      ))}
      <line x1="20" y1="200" x2="380" y2="200" stroke="rgba(201,166,70,0.25)" strokeWidth="0.5" />
      <line x1="200" y1="20" x2="200" y2="380" stroke="rgba(201,166,70,0.25)" strokeWidth="0.5" />
    </svg>
  );
}

function ScopeSweep() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
      style={{ animation: "wz-scope-sweep 9s linear infinite", transformOrigin: "50% 50%" }}
    >
      <defs>
        <linearGradient id="sweep-grad" x1="50%" y1="50%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="rgba(244,217,123,0)" />
          <stop offset="80%" stopColor="rgba(244,217,123,0.5)" />
          <stop offset="100%" stopColor="rgba(244,217,123,0.85)" />
        </linearGradient>
      </defs>
      <line x1="200" y1="200" x2="200" y2="22" stroke="url(#sweep-grad)" strokeWidth="2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Editorial section row
// ---------------------------------------------------------------------------
interface EditorialRow {
  num: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  status: string;
  statusTone: "neutral" | "bullish" | "active";
}

const ROWS: EditorialRow[] = [
  { num: "01", Icon: Globe2, title: "Macro Outlook", status: "Risk-on", statusTone: "bullish" },
  { num: "02", Icon: Layers, title: "Sector Rotation", status: "Tech leading", statusTone: "active" },
  { num: "03", Icon: Crosshair, title: "Tactical Posture", status: "Bullish · 72", statusTone: "bullish" },
  { num: "04", Icon: Zap, title: "Catalysts", status: "3 events", statusTone: "active" },
  { num: "05", Icon: TrendingUp, title: "Options Intel", status: "Gamma wall 5300", statusTone: "neutral" },
  { num: "06", Icon: Target, title: "Trade Ideas", status: "4 setups", statusTone: "bullish" },
];

function EditorialRowEl({ row }: { row: EditorialRow }) {
  const toneClass =
    row.statusTone === "bullish"
      ? "text-gold-primary"
      : row.statusTone === "active"
      ? "text-ink-primary"
      : "text-ink-secondary";
  return (
    <div className="flex items-center justify-between py-1.5 border-b-[0.5px] border-border-ds-subtle last:border-b-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-[9px] text-ink-tertiary">{row.num}</span>
        <row.Icon className="w-3.5 h-3.5 text-gold-primary shrink-0" strokeWidth={1.5} />
        <span
          className="text-[11px] uppercase tracking-[1px] text-ink-primary truncate"
          style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600 }}
        >
          {row.title}
        </span>
      </div>
      <span className={cn("font-mono text-[10px] uppercase tracking-[1px] shrink-0", toneClass)}>
        {row.status}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function MissionBriefingPanel({ className }: { className?: string }) {
  const countdown = useCountdownToOpen();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={cn(
        "relative w-full aspect-square max-w-[620px] mx-auto",
        className,
      )}
    >
      <style>{`
        @keyframes wz-scope-sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes wz-stamp-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(201,166,70,0.45); } 50% { box-shadow: 0 0 0 8px rgba(201,166,70,0); } }
      `}</style>

      <CrosshairBackdrop />
      <ScopeSweep />

      {/* Central briefing card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[82%] max-w-[460px]">
        <div
          className="relative bg-surface-base/85 backdrop-blur-[2px] border-[0.5px] border-gold-border rounded-[14px] p-5"
          style={{
            boxShadow:
              "0 24px 60px -20px rgba(0,0,0,0.7), 0 0 80px -10px rgba(201,166,70,0.30), inset 0 0 0 1px rgba(201,166,70,0.05)",
          }}
        >
          {/* Corner ticks */}
          <span className="absolute top-0 left-0 w-3 h-3 border-l-[1.5px] border-t-[1.5px] border-gold-primary" />
          <span className="absolute top-0 right-0 w-3 h-3 border-r-[1.5px] border-t-[1.5px] border-gold-primary" />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-l-[1.5px] border-b-[1.5px] border-gold-primary" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-r-[1.5px] border-b-[1.5px] border-gold-primary" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                className="relative inline-flex w-2 h-2 rounded-full bg-gold-primary"
                style={{ animation: "wz-stamp-pulse 2s ease-in-out infinite" }}
              />
              <span
                className="text-[10px] tracking-[2.5px] text-gold-primary uppercase"
                style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600 }}
              >
                Top Secret · Today's Briefing
              </span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-ink-tertiary">
              {today}
            </span>
          </div>

          {/* Bottom-line headline */}
          <div className="py-3 border-y-[0.5px] border-border-ds-subtle">
            <div className="font-sans text-[9px] uppercase tracking-[2.5px] text-ink-tertiary mb-1">
              Bottom Line
            </div>
            <div
              className="text-[15px] leading-snug text-ink-primary"
              style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 500 }}
            >
              Tech leadership extends.{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #E8C766 0%, #F4D97B 50%, #C9A646 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontWeight: 700,
                }}
              >
                Watch SPX 5,300
              </span>{" "}
              for the breakout trigger.
            </div>
          </div>

          {/* Six editorial sections */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <div className="font-sans text-[9px] uppercase tracking-[2.5px] text-ink-tertiary">
                Today's Sections
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-gold-primary">
                6 / 6 ready
              </div>
            </div>
            <div>
              {ROWS.map((row) => (
                <EditorialRowEl key={row.num} row={row} />
              ))}
            </div>
          </div>

          {/* Footer — Countdown + operators */}
          <div className="mt-3 pt-3 border-t-[0.5px] border-border-ds-subtle flex items-center justify-between">
            <div>
              <div className="font-sans text-[9px] uppercase tracking-[2.5px] text-ink-tertiary">
                Opening Bell In
              </div>
              <div className="font-mono text-xl tabular-nums text-ink-primary leading-tight tracking-tight">
                {countdown}
              </div>
            </div>
            <div className="text-right">
              <div className="font-sans text-[9px] uppercase tracking-[2.5px] text-ink-tertiary">
                Operators On Watch
              </div>
              <div className="font-mono text-xl tabular-nums text-gold-primary leading-tight">847</div>
            </div>
          </div>
        </div>
      </div>

      {/* Orbital callouts — editorial deliverables */}
      <div
        className="absolute top-[3%] left-[2%] px-3 py-2 rounded-[10px] bg-surface-glass backdrop-blur-glass border-[0.5px] border-gold-border z-20"
        style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}
      >
        <div
          className="text-[9px] tracking-[2px] uppercase text-gold-primary"
          style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600 }}
        >
          Daily Briefing
        </div>
        <div className="mt-1 font-mono text-[11px] text-ink-primary">9:00 AM ET · Mon–Fri</div>
      </div>

      <div
        className="absolute top-[8%] right-[2%] px-3 py-2 rounded-[10px] bg-surface-glass backdrop-blur-glass border-[0.5px] border-gold-border z-20"
        style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}
      >
        <div
          className="text-[9px] tracking-[2px] uppercase text-gold-primary"
          style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600 }}
        >
          Weekly Review
        </div>
        <div className="mt-1 font-mono text-[11px] text-ink-primary">Sun · 10:00 AM ET</div>
      </div>

      <div
        className="absolute bottom-[6%] left-[1%] px-3 py-2 rounded-[10px] bg-surface-glass backdrop-blur-glass border-[0.5px] border-gold-border z-20"
        style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}
      >
        <div
          className="text-[9px] tracking-[2px] uppercase text-gold-primary"
          style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600 }}
        >
          QA Score
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-[11px] text-ink-primary tabular-nums">96 / 100</span>
          <span className="block w-1.5 h-1.5 rounded-full bg-gold-primary" />
        </div>
      </div>

      <div
        className="absolute bottom-[3%] right-[2%] px-3 py-2 rounded-[10px] bg-surface-glass backdrop-blur-glass border-[0.5px] border-gold-border z-20"
        style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}
      >
        <div
          className="text-[9px] tracking-[2px] uppercase text-gold-primary"
          style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600 }}
        >
          Format
        </div>
        <div className="mt-1 font-mono text-[11px] text-ink-primary">PDF · Discord · Email</div>
      </div>
    </div>
  );
}
