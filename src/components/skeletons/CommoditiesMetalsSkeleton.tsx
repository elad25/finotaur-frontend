/**
 * Bespoke skeleton for /app/commodities/metals (Metals — stub)
 *
 * Stub page: header + two placeholder cards.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function CommoditiesMetalsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-28" />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={2} />
    </SkeletonPage>
  );
}
