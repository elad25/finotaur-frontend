/**
 * Bespoke skeleton for /app/forex/alerts
 *
 * Mirrors the real layout (ForexAlerts.tsx — stub page):
 *   Simple header + two placeholder cards.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonCard,
} from "@/components/skeletons/shell";

export function ForexAlertsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-52" />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={2} />
    </SkeletonPage>
  );
}
