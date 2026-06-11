/**
 * Spinner — FINOTAUR canonical loading spinner (single source of truth).
 *
 * A slow gold "comet sweep": a bright gold head trailing into a transparent
 * tail over a faint track, rotating once every 1.2s with a soft gold glow.
 * This is THE loader for the whole app — `@/components/ui/Spinner` re-exports
 * from here for backwards-compatible imports.
 *
 *   color="gold"    → gold comet (default), for dark surfaces
 *   color="inherit" → currentColor comet, for use INSIDE gold-filled buttons
 *                     where a gold-on-gold ring would be invisible.
 *
 * @see DESIGN_SYSTEM.md (Loaders)
 */
import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";
type SpinnerColor = "gold" | "inherit";

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

// Ring thickness (px) per size — used by the radial mask that carves the ring.
const RING_THICKNESS: Record<SpinnerSize, number> = { sm: 3, md: 4, lg: 5 };

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
}

export function Spinner({ size = "md", color = "gold", className }: SpinnerProps) {
  const thickness = RING_THICKNESS[size];
  const mask = `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 0)`;
  const background =
    color === "gold"
      ? "conic-gradient(from 0deg, rgba(240,199,94,0) 0deg, rgba(201,166,70,0.15) 200deg, #C9A646 330deg, #F0C75E 360deg)"
      : "conic-gradient(from 0deg, rgba(255,255,255,0) 0deg, currentColor 360deg)";
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("inline-block rounded-full animate-spin", SIZE_CLASSES[size], className)}
      style={{
        background,
        WebkitMask: mask,
        mask,
        ...(color === "gold"
          ? { filter: "drop-shadow(0 0 7px rgba(201,166,70,0.45))" }
          : {}),
      }}
    />
  );
}

interface LoaderProps {
  label?: string;
  className?: string;
}

/** Full-screen centered loader — route / navigation / refresh boundaries. */
export function FullPageSpinner({ label, className }: LoaderProps) {
  return (
    <div
      className={cn(
        "min-h-screen w-full flex flex-col items-center justify-center gap-4",
        className,
      )}
    >
      <Spinner size="lg" />
      {label && (
        <p className="text-xs tracking-[0.14em] uppercase text-[#9a9484]">{label}</p>
      )}
    </div>
  );
}

/** Section / in-card centered loader — sub-section data loads. */
export function SectionSpinner({ label, className }: LoaderProps) {
  return (
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center gap-3 py-12",
        className,
      )}
    >
      <Spinner size="md" />
      {label && (
        <p className="text-xs tracking-[0.14em] uppercase text-[#9a9484]">{label}</p>
      )}
    </div>
  );
}

export interface PageLoaderProps {
  text?: string;
  timedOut?: boolean;
  className?: string;
}

/**
 * PageLoader — full-screen route/auth loader with a "taking longer" fallback
 * (preserves the old ProtectedRoute 20s timeout behavior).
 */
export function PageLoader({ text = "Loading...", timedOut = false, className }: PageLoaderProps) {
  if (timedOut) {
    return (
      <div className={cn("flex min-h-screen items-center justify-center bg-[#0A0A0A]", className)}>
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-zinc-300">This is taking longer than expected.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded px-5 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#C9A646', color: '#0A0A0A' }}
          >
            Reload
          </button>
          <p className="text-xs text-zinc-500">Contact support if this persists.</p>
        </div>
      </div>
    );
  }
  return <FullPageSpinner label={text} className={cn("bg-[#0A0A0A]", className)} />;
}

export default Spinner;
