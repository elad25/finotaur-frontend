/**
 * WAR ZONE landing — shared section utilities.
 *
 * Local to WAR ZONE. Mirrors the landing-new SectionShell pattern but kept
 * inside WarzoneComponents/ so the public marketing landing-new files stay
 * untouched. If these patterns generalize beyond WAR ZONE, hoist later.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// GoldRule — gradient hairline divider (top-of-section / band separator).
// ---------------------------------------------------------------------------
export function GoldRule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("relative w-full h-px", className)}
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(201,166,70,0.45) 20%, rgba(244,217,123,0.85) 50%, rgba(201,166,70,0.45) 80%, transparent 100%)",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// CornerBrackets — gold corner brackets used as a "frame" affordance on
// hero, dashboard mock, comparison ledger, and pricing cards.
// ---------------------------------------------------------------------------
export function CornerBrackets({
  size = 16,
  color = "rgba(201,166,70,0.55)",
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderColor: color,
  };
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      <span
        className="absolute top-0 left-0 border-l border-t"
        style={common}
      />
      <span
        className="absolute top-0 right-0 border-r border-t"
        style={common}
      />
      <span
        className="absolute bottom-0 left-0 border-l border-b"
        style={common}
      />
      <span
        className="absolute bottom-0 right-0 border-r border-b"
        style={common}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionEyebrow — uppercase gold label, optionally with a vertical pipe
// next to a "subtitle" word (e.g. "DAILY MARKET BRIEFING | BEFORE THE MARKET OPENS").
// ---------------------------------------------------------------------------
export function SectionEyebrow({
  children,
  className,
  showDot = false,
}: {
  children: React.ReactNode;
  className?: string;
  showDot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2",
        "font-sans text-[11px] font-medium tracking-[2px] uppercase",
        "text-gold-primary",
        className,
      )}
    >
      {showDot && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold-primary" />
      )}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SectionTitle — large editorial serif title. Optional gold-tinted word.
// ---------------------------------------------------------------------------
export function SectionTitle({
  children,
  className,
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "large";
}) {
  return (
    <h2
      className={cn(
        "text-ink-primary leading-[1.02] uppercase",
        size === "large"
          ? "text-4xl md:text-5xl lg:text-6xl"
          : "text-3xl md:text-4xl lg:text-5xl",
        className,
      )}
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 700,
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// SectionShell — outer wrapper for landing sections.
// Provides: max-width container, vertical padding, optional top gold rule,
// optional corner brackets (rare — for "framed" sections like dashboard mock).
// ---------------------------------------------------------------------------
export function SectionShell({
  children,
  className,
  innerClassName,
  topRule = false,
  bottomRule = false,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  topRule?: boolean;
  bottomRule?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("relative w-full", className)}
    >
      {topRule && <GoldRule />}
      <div
        className={cn(
          "max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24",
          innerClassName,
        )}
      >
        {children}
      </div>
      {bottomRule && <GoldRule />}
    </section>
  );
}

// ---------------------------------------------------------------------------
// FramedPanel — surface-1 panel with corner brackets + 0.5px border.
// Used inside sections (dashboard mock, comparison ledger).
// ---------------------------------------------------------------------------
export function FramedPanel({
  children,
  className,
  bracketColor,
}: {
  children: React.ReactNode;
  className?: string;
  bracketColor?: string;
}) {
  return (
    <div
      className={cn(
        "relative bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[12px] overflow-hidden",
        className,
      )}
    >
      <CornerBrackets size={14} color={bracketColor} />
      {children}
    </div>
  );
}
