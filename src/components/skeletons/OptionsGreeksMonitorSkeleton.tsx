/**
 * Bespoke skeleton for /app/options/greeks-monitor (Greeks Monitor)
 *
 * Stub page — mirrors anticipated layout:
 *   1. Stat row: Delta | Gamma | Theta | Vega | Rho (5 stats)
 *   2. Table: Ticker | Exp | Strike | Type | Delta | Gamma | Theta | Vega (8 cols), 12 rows
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonStatRow,
  SkeletonTable,
} from "@/components/skeletons/shell";

export function OptionsGreeksMonitorSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-44" />
      <SkeletonStatRow count={4} />
      <SkeletonTable rows={12} cols={6} />
    </SkeletonPage>
  );
}
