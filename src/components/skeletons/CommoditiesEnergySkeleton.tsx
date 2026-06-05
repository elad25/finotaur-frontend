/**
 * Bespoke skeleton for /app/commodities/energy (Energy Commodities — stub)
 *
 * Stub page: header + two placeholder cards.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function CommoditiesEnergySkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-48" />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={2} />
    </SkeletonPage>
  );
}
