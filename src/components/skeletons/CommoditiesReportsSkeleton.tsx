/**
 * Bespoke skeleton for /app/commodities/reports (Commodities Reports — stub)
 *
 * Stub page: header + two placeholder cards.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function CommoditiesReportsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-48" />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={2} />
    </SkeletonPage>
  );
}
