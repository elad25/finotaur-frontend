/**
 * Bespoke skeleton for /app/forex/tools (Forex Calculators)
 *
 * Mirrors the real layout (ForexTools.tsx):
 *   3-column grid (lg): Currency Converter | Pip Value | Position Size
 *   Each card: title + form fields (inputs/selects) + result panel.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  Skeleton,
} from "@/components/skeletons/shell";

function CalcCardSkeleton({ inputCount }: { inputCount: number }) {
  return (
    <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-5 space-y-4">
      {/* Title + subtitle */}
      <div className="space-y-1">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-32" />
      </div>
      {/* Input fields */}
      {Array.from({ length: inputCount }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
      {/* Result panel */}
      <div className="rounded-xl border border-border-ds-subtle bg-surface-1 p-4 space-y-2 text-center">
        <Skeleton className="h-3 w-24 mx-auto" />
        <Skeleton className="h-8 w-32 mx-auto" />
        <Skeleton className="h-3 w-20 mx-auto" />
      </div>
    </div>
  );
}

export function ForexToolsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Currency Converter: amount + from/to (2 selects) */}
        <CalcCardSkeleton inputCount={3} />
        {/* Pip Value: pair + lot size */}
        <CalcCardSkeleton inputCount={2} />
        {/* Position Size: pair + balance + risk% + stop pips */}
        <CalcCardSkeleton inputCount={4} />
      </div>
    </SkeletonPage>
  );
}
