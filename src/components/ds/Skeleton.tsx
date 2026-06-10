/**
 * Skeleton — FINOTAUR canonical content-loading placeholder (single source of truth).
 *
 * The opposite number to `ds/Spinner`. The rule (see DESIGN_SYSTEM.md → Loaders):
 *   • Skeletons   → content / data / route loading (anything with a known layout).
 *   • Spinner     → in-button action feedback ONLY (mutations, "Saving…").
 *   • GlobeLoader → intentional exceptions (Copilot, Warzone landing).
 *
 * The base `Skeleton` is a single shimmer block. The exported variants
 * (`SkeletonText`, `SkeletonCard`, `SkeletonTable`, `SkeletonChart`,
 * `SkeletonStat`, `SkeletonStatRow`, `SkeletonGrid`) compose it into the
 * common page silhouettes so a loading state mirrors its loaded layout and
 * the swap is shift-free.
 *
 * Uses the gold `animate-shimmer` keyframe (tailwind.config) for a true
 * left-to-right sweep — not a flat pulse-fade.
 *
 * @see DESIGN_SYSTEM.md (Loaders)
 */
import { cn } from "@/lib/utils";

/**
 * The moving gold shimmer fill. Inline gradient (rgba) is the established
 * pattern for FINOTAUR loaders — see `ds/Spinner` (conic) and the original
 * `AIArenaSkeleton`. `animate-shimmer` slides backgroundPosition −200%→200%.
 */
const SHIMMER_STYLE: React.CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(255,255,255,0.035) 0%, rgba(201,166,70,0.11) 50%, rgba(255,255,255,0.035) 100%)",
  backgroundSize: "200% 100%",
};

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Disable the gold sweep (e.g. for reduced-motion contexts). Default: animated. */
  shimmer?: boolean;
}

/** Base shimmer block. Size it via className (`h-4 w-32`, etc.). */
export function Skeleton({ className, shimmer = true, style, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-[8px]",
        shimmer ? "animate-shimmer" : "bg-surface-2",
        className,
      )}
      style={shimmer ? { ...SHIMMER_STYLE, ...style } : style}
      {...props}
    />
  );
}

/** N lines of text. Last line is shortened to read like a paragraph. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-ds-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** A single KPI/metric cell — label + mono-footprint value. */
export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-4",
        className,
      )}
      aria-hidden="true"
    >
      <Skeleton className="h-3 w-16 mb-ds-3" />
      <Skeleton className="h-7 w-24" />
    </div>
  );
}

/** A row of KPI stats (dashboard headers). */
export function SkeletonStatRow({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-ds-3",
        count >= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3",
        className,
      )}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  );
}

/** A generic content card — title, body lines, optional sub-grid.
 *  If `children` are provided, they render inside the card frame instead of
 *  the default title+lines (lets a page skeleton place custom inner shapes). */
export function SkeletonCard({
  lines = 2,
  withGrid = false,
  className,
  children,
}: {
  lines?: number;
  withGrid?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  if (children) {
    return (
      <div
        className={cn(
          "rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5",
          className,
        )}
        aria-hidden="true"
      >
        {children}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5",
        className,
      )}
      aria-hidden="true"
    >
      <Skeleton className="h-5 w-40 mb-ds-4" />
      <div className="space-y-ds-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")} />
        ))}
      </div>
      {withGrid && (
        <div className="grid grid-cols-2 gap-ds-3 mt-ds-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-[8px] bg-surface-2 p-ds-3">
              <Skeleton className="h-3 w-16 mb-ds-1" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A data table — header row + N body rows, configurable column count. */
export function SkeletonTable({
  rows = 6,
  cols = 5,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  const colsClass =
    cols === 3
      ? "grid-cols-3"
      : cols === 4
        ? "grid-cols-4"
        : cols === 6
          ? "grid-cols-6"
          : "grid-cols-5";
  return (
    <div
      className={cn(
        "rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5",
        className,
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "grid gap-ds-3 pb-ds-3 mb-ds-3 border-b border-border-ds-subtle",
          colsClass,
        )}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={cn("grid gap-ds-3 py-ds-2", colsClass)}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A chart panel — title + plot area + x-axis ticks. */
export function SkeletonChart({
  height = "h-64",
  className,
}: {
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-5",
        className,
      )}
      aria-hidden="true"
    >
      <Skeleton className="h-5 w-32 mb-ds-4" />
      <Skeleton className={cn("w-full", height)} />
      <div className="mt-ds-3 flex justify-between gap-ds-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-3 w-12" />
        ))}
      </div>
    </div>
  );
}

/** A responsive grid of cards (markets overview, watchlists, etc.).
 *  Provide `count`, OR `rows` (× cols) for a rows×cols grid. `cardHeight`
 *  applies a fixed height to each card. */
export function SkeletonGrid({
  count,
  cols = 3,
  rows,
  cardLines = 2,
  cardHeight,
  className,
}: {
  count?: number;
  cols?: 2 | 3 | 4;
  rows?: number;
  cardLines?: number;
  cardHeight?: string;
  className?: string;
}) {
  const total = count ?? (rows ? rows * cols : 6);
  const colsClass =
    cols === 2
      ? "sm:grid-cols-2"
      : cols === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={cn("grid grid-cols-1 gap-ds-4", colsClass, className)} aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <SkeletonCard key={i} lines={cardLines} className={cardHeight} />
      ))}
    </div>
  );
}

export default Skeleton;
