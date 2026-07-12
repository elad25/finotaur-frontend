// src/components/landing-new/SocialProof.tsx
// ================================================
// SOCIAL PROOF — Bloomberg-Terminal-style horizontal stat strip
// Premium institutional feel: hairline rules, vertical separators,
// lit-from-above gradient numbers, count-up animation on viewport entry.
// ================================================

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Users, Cpu, Star, Swords } from "lucide-react";
import { SectionShell } from "./_shared/SectionShell";
import { SectionEyebrow } from "./_shared/SectionEyebrow";
import { cn } from "@/lib/utils";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  'https://finotaur-server-production.up.railway.app';

// ---------------------------------------------------------------------------
// Stat definitions
// ---------------------------------------------------------------------------
type StatDef = {
  icon: React.ElementType;
  /** The final numeric target to count up to */
  target: number;
  /** Text appended after the animated number, e.g. "+" or "/5" */
  suffix: string;
  /** Whether to format with toLocaleString() (adds commas) */
  format?: "locale" | "decimal1" | "none";
  label: string;
};

// Raw shape returned by GET /api/public/stats
interface PublicStats {
  activeTraders: number;
  aiAnalysesRun: number;
  warZoneDays: number;
  userRating: number | null;
}

/** Build the visible stat array from fetched data, hiding zeros / nulls. */
function buildStats(data: PublicStats): StatDef[] {
  const result: StatDef[] = [];

  if (data.warZoneDays >= 1) {
    result.push({
      icon: Swords,
      target: data.warZoneDays,
      suffix: "",
      format: "none",
      label: "Days of Top Secret",
    });
  }

  if (data.aiAnalysesRun >= 50) {
    result.push({
      icon: Cpu,
      target: data.aiAnalysesRun,
      suffix: "+",
      format: "locale",
      label: "AI Analyses Run",
    });
  }

  if (data.activeTraders >= 25) {
    result.push({
      icon: Users,
      target: data.activeTraders,
      suffix: "+",
      format: "none",
      label: "Active Traders",
    });
  }

  if (typeof data.userRating === "number" && data.userRating > 0) {
    result.push({
      icon: Star,
      target: data.userRating,
      suffix: "/5",
      format: "decimal1",
      label: "User Rating",
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// useCountUp — animates a number from 0 to target over `duration` ms
// ---------------------------------------------------------------------------
function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    let startTime: number | null = null;
    let raf: number;

    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);

  return value;
}

// ---------------------------------------------------------------------------
// StatCell — individual stat with icon, animated number, micro-label
// ---------------------------------------------------------------------------
type StatCellProps = {
  stat: StatDef;
  index: number;
  active: boolean;
};

function StatCell({ stat, index, active }: StatCellProps) {
  const raw = useCountUp(stat.target, 1200, active);

  let display: string;
  if (stat.format === "locale") {
    display = Math.floor(raw).toLocaleString('en-US');
  } else if (stat.format === "decimal1") {
    display = raw.toFixed(1);
  } else {
    display = Math.floor(raw).toString();
  }

  const Icon = stat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: "easeOut" }}
      className="flex flex-col items-center gap-3 px-6 py-4 md:py-0 flex-1 min-w-0"
    >
      {/* Tiny gold icon — subtle, doesn't compete with the number */}
      <Icon
        className="w-3.5 h-3.5 text-gold-eyebrow opacity-60"
        aria-hidden="true"
        strokeWidth={1.5}
      />

      {/* Hero-sized animated number — lit-from-above gold gradient, monospace */}
      <span
        className={cn(
          "font-mono font-medium tabular-nums tracking-[-0.02em]",
          "text-5xl lg:text-6xl",
          "bg-gradient-gold-vertical bg-clip-text text-transparent",
          "leading-none",
        )}
        aria-label={`${display}${stat.suffix}`}
      >
        {display}
        <span className="text-3xl lg:text-4xl">{stat.suffix}</span>
      </span>

      {/* Micro hairline under number */}
      <div
        className="w-6 h-px bg-gold-eyebrow-hairline opacity-30"
        aria-hidden="true"
      />

      {/* Uppercase label */}
      <span
        className="font-sans text-[11px] tracking-[0.2em] uppercase text-ink-secondary"
      >
        {stat.label}
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Hairline — animated horizontal gold rule (scaleX 0→1)
// ---------------------------------------------------------------------------
function AnimatedHairline({ active }: { active: boolean }) {
  return (
    <motion.div
      className="w-full h-px bg-gradient-to-r from-transparent via-gold-eyebrow-hairline to-transparent"
      initial={{ scaleX: 0 }}
      animate={active ? { scaleX: 1 } : { scaleX: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{ transformOrigin: "center" }}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// IntegrationsStrip — static "SYNCS WITH" trust band, renders regardless of
// the stats fetch outcome (fetch failure / zeros must not hide this).
// ---------------------------------------------------------------------------
function IntegrationsStrip() {
  return (
    <div className="py-6 md:py-8">
      <p className="text-center text-xs tracking-[0.3em] text-gold-primary/80 uppercase mb-6">
        Syncs With
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 md:gap-x-14">
        <img
          src="/brokers/ninjatrader-official.svg"
          alt="NinjaTrader"
          className="h-6 w-auto opacity-60 hover:opacity-100 transition-opacity"
        />
        <span className="text-lg font-semibold tracking-tight text-white/60 hover:text-white transition-colors">
          Tradovate
        </span>
        <span className="text-lg font-semibold tracking-tight text-white/60 hover:text-white transition-colors">
          Interactive Brokers
        </span>
        <span className="flex flex-col items-center leading-tight">
          <span className="text-lg font-semibold tracking-tight text-white/60 hover:text-white transition-colors">
            Apex
          </span>
          <span className="text-[9px] tracking-[0.2em] uppercase text-white/40">
            Trader Funding
          </span>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SocialProof
// ---------------------------------------------------------------------------
const SocialProof = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "-80px" });
  const [stats, setStats] = useState<StatDef[] | null>(null);
  // The stat band mounts only after the async fetch resolves, so the
  // useInView observer can attach too late to ever fire. Force the reveal
  // shortly after the cards mount so they never stay stuck at opacity 0.
  const [ready, setReady] = useState(false);
  const active = inView || ready;

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/public/stats`)
      .then((res) => {
        if (!res.ok) throw new Error("stats fetch failed");
        return res.json() as Promise<PublicStats>;
      })
      .then((data) => {
        if (!cancelled) setStats(buildStats(data));
      })
      .catch(() => {
        if (!cancelled) setStats([]);
      });
    return () => { cancelled = true; };
  }, []);

  // Once the qualifying cards are in state, trigger the reveal animation
  // even if the IntersectionObserver never reports the late-mounted node.
  useEffect(() => {
    if (stats && stats.length > 0) {
      const t = setTimeout(() => setReady(true), 60);
      return () => clearTimeout(t);
    }
  }, [stats]);

  const hasStats = stats !== null && stats.length > 0;

  return (
    <SectionShell
      atmosphere="none"
      beam={false}
      className="py-12 md:py-16"
    >
      <div ref={containerRef} className="max-w-6xl mx-auto px-6 relative">
        {/* Subtle ambient gold beam — behind content */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 50% 50%, rgba(201,166,70,0.05) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />

        {/* TOP hairline rule */}
        <AnimatedHairline active={active} />

        {/* The stat cards depend on the fetch resolving with qualifying
            data; the SYNCS WITH strip below is static and always renders. */}
        {hasStats && (
          <>
            {/* Eyebrow */}
            <div className="py-4 md:py-6">
              <SectionEyebrow className="mb-0">
                Trusted by the Community
              </SectionEyebrow>
            </div>

            {/* ── STAT ROW — 2x2 grid on mobile, single row on desktop ── */}
            <div className="grid grid-cols-2 gap-y-8 gap-x-6 md:flex md:flex-row md:gap-ds-7 items-stretch md:items-center justify-center">
              {stats!.map((stat, index) => (
                <div key={stat.label} className="contents">
                  <StatCell stat={stat} index={index} active={active} />

                  {/* Vertical separator between cells — desktop only */}
                  {index < stats!.length - 1 && (
                    <div
                      className="hidden md:block w-px self-stretch bg-gradient-to-b from-transparent via-gold-eyebrow-hairline to-transparent opacity-50"
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Divider between stats and the integrations strip */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-gold-primary/20 to-transparent"
          aria-hidden="true"
        />

        {/* ── SYNCS WITH ── static trust band, renders even if stats fetch fails */}
        <IntegrationsStrip />

        {/* BOTTOM hairline rule */}
        <AnimatedHairline active={active} />
      </div>
    </SectionShell>
  );
};

export default SocialProof;
