/**
 * Bespoke skeleton for /app/forex/deep-analysis (Macro Reports)
 *
 * Mirrors the real layout (ForexDeepAnalysis.tsx — stub page):
 *   Simple header + two placeholder cards.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function ForexDeepAnalysisSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-40" />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={2} />
    </SkeletonPage>
  );
}
