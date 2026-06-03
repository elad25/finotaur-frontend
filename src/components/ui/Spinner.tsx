import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

/**
 * Canonical FINOTAUR loading spinner — dual gold ring with a soft glow.
 * Replaces every full-page / in-card rotating-wheel loader across the app.
 * (Button-level action spinners are intentionally NOT covered by this.)
 */
export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("relative inline-block", SIZE_CLASSES[size], className)}
      style={{ filter: "drop-shadow(0 0 6px rgba(201,166,70,0.35))" }}
    >
      <span className="absolute inset-0 rounded-full border-2 border-[rgba(201,166,70,0.15)]" />
      <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#C9A646] border-r-[#D4AF37] animate-spin" />
    </div>
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
