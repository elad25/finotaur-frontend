/**
 * Bespoke skeleton for /app/options/shortcuts (Shortcuts)
 *
 * Stub page — mirrors anticipated layout:
 *   Simple header + grid of shortcut cards.
 */
import {
  SkeletonPage,
  SkeletonHeader,
  SkeletonGrid,
} from "@/components/skeletons/shell";

export function OptionsShortcutsSkeletonPage() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-32" />
      <SkeletonGrid count={6} cols={3} cardLines={2} />
    </SkeletonPage>
  );
}
