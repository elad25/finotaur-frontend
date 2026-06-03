import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

// Ring thickness (px) per size — used by the radial mask that carves out the comet ring.
const RING_THICKNESS: Record<SpinnerSize, number> = {
  sm: 3,
  md: 4,
  lg: 5,
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

/**
 * Canonical FINOTAUR loading spinner — a slow "comet sweep": a bright gold head
 * trailing into a transparent tail, rotating with a soft glow.
 * Replaces every full-page / in-card rotating-wheel loader across the app.
 * (Button-level action spinners are intentionally NOT covered by this.)
 */
export function Spinner({ size = "md", className }: SpinnerProps) {
  const thickness = RING_THICKNESS[size];
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("inline-block rounded-full animate-spin", SIZE_CLASSES[size], className)}
      style={{
        background:
          "conic-gradient(from 0deg, rgba(240,199,94,0) 0deg, rgba(201,166,70,0.15) 200deg, #C9A646 330deg, #F0C75E 360deg)",
        WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 0)`,
        mask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 0)`,
        animationDuration: "1.2s",
        filter: "drop-shadow(0 0 7px rgba(201,166,70,0.45))",
      }}
    />
  );
}

interface LoaderProps {
  label?: string;
  className?: string;
}

/** Full-screen centered loader — for route / navigation / refresh boundaries. */
export function FullPageSpinner({ label, className }: LoaderProps) {
  return (
    <div
      className={cn(
        "min-h-screen w-full flex flex-col items-center justify-center gap-4",
        className
      )}
    >
      <Spinner size="lg" />
      {label && (
        <p className="text-xs tracking-[0.14em] uppercase text-[#9a9484]">{label}</p>
      )}
    </div>
  );
}

/** Section / in-card centered loader — for sub-section data loads. */
export function SectionSpinner({ label, className }: LoaderProps) {
  return (
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center gap-3 py-12",
        className
      )}
    >
      <Spinner size="md" />
      {label && (
        <p className="text-xs tracking-[0.14em] uppercase text-[#9a9484]">{label}</p>
      )}
    </div>
  );
}
