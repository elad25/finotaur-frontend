/**
 * RouteSkeleton — route-transition fallback (replaces the comet spinner in
 * App.tsx's `<Suspense fallback>`). Reads the current path and renders a
 * silhouette matching the destination route group so the lazy-chunk load
 * looks like the page filling in, not a spinner.
 *
 * One central mapping covers every route — no per-route edits needed.
 *
 * @see DESIGN_SYSTEM.md (Loaders)
 */
import { useLocation } from "react-router-dom";
import {
  Skeleton,
  SkeletonStatRow,
  SkeletonGrid,
  SkeletonChart,
  SkeletonTable,
} from "@/components/ds/Skeleton";

/** Page heading placeholder (eyebrow + title). */
function HeaderBar() {
  return (
    <div className="space-y-ds-2" aria-hidden="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-64" />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto w-full max-w-[1600px] space-y-ds-5 p-4 md:p-6"
      role="status"
      aria-label="Loading"
    >
      {children}
    </div>
  );
}

/** Tablesy route (calendars, movers, screeners, news, trade lists). */
function TablePage() {
  return (
    <Shell>
      <HeaderBar />
      <SkeletonStatRow count={4} />
      <SkeletonTable rows={8} cols={6} />
    </Shell>
  );
}

/** Chart-led route. */
function ChartPage() {
  return (
    <Shell>
      <HeaderBar />
      <SkeletonChart height="h-[420px]" />
      <SkeletonStatRow count={4} />
    </Shell>
  );
}

/** Dashboard / overview route (stat row + card grid). */
function OverviewPage() {
  return (
    <Shell>
      <HeaderBar />
      <SkeletonStatRow count={4} />
      <SkeletonGrid count={6} cols={3} />
    </Shell>
  );
}

/** Journal-style route (stats + equity chart + trades table). */
function JournalPage() {
  return (
    <Shell>
      <HeaderBar />
      <SkeletonStatRow count={4} />
      <SkeletonChart height="h-72" />
      <SkeletonTable rows={6} cols={6} />
    </Shell>
  );
}

const TABLE_HINTS = [
  "calendar",
  "movers",
  "screener",
  "news",
  "my-trades",
  "trades",
  "earnings",
  "upgrades",
  "transactions",
  "watchlist",
  "events",
  "unusual",
  "flow",
];

export function RouteSkeleton() {
  const { pathname } = useLocation();
  const p = pathname.toLowerCase();

  if (p.includes("/journal") || p.includes("/backtest")) return <JournalPage />;
  if (p.includes("chart")) return <ChartPage />;
  if (TABLE_HINTS.some((h) => p.includes(h))) return <TablePage />;
  // markets / stocks / crypto / macro / forex / commodities / futures / options / ai / copilot / settings / admin …
  return <OverviewPage />;
}

export default RouteSkeleton;
