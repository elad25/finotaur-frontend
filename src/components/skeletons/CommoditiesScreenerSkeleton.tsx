/**
 * Bespoke skeleton for /app/commodities/screener (Commodities Screener — stub)
 *
 * Stub page: header + two placeholder cards.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function CommoditiesScreenerSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-52" />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={2} />
    </SkeletonPage>
  );
}
