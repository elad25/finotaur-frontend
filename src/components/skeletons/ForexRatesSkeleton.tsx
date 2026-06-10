/**
 * Bespoke skeleton for /app/forex/rates
 *
 * Mirrors the real layout (ForexRates.tsx — stub page):
 *   Simple header + two placeholder cards.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function ForexRatesSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-40" />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={2} />
    </SkeletonPage>
  );
}
