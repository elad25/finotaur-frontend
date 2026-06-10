/**
 * RouteSkeleton — route-transition fallback (the Suspense fallback in App.tsx).
 *
 * Renders the BESPOKE skeleton for the destination page, so navigating into a
 * page shows a silhouette that matches THAT page's real layout (not a generic
 * shape). Every page has a skeleton in `@/components/skeletons/*Skeleton.tsx`;
 * we eager-import them all and resolve the right one from the current path.
 *
 * Resolution order:
 *   1. explicit OVERRIDES (routes whose tab name ≠ file name, dynamic details)
 *   2. auto-match: <area><tab>Skeleton  (case/hyphen-insensitive)
 *   3. area overview skeleton
 *   4. generic silhouette (never a spinner)
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

type SkelComp = React.ComponentType;

// Eagerly import every per-page skeleton (pure/presentational, cheap).
const modules = import.meta.glob("../skeletons/*Skeleton.tsx", { eager: true }) as Record<
  string,
  Record<string, unknown>
>;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// normalized file base (e.g. "allmarketsoverviewskeleton") -> component
const REGISTRY: Record<string, SkelComp> = {};
for (const path in modules) {
  const mod = modules[path];
  const exportName =
    Object.keys(mod).find((k) => k.endsWith("SkeletonPage")) ??
    Object.keys(mod).find((k) => k !== "default" && typeof mod[k] === "function") ??
    "default";
  const comp = mod[exportName] as SkelComp | undefined;
  if (typeof comp !== "function") continue;
  const base = path.split("/").pop()!.replace(/\.tsx$/, "");
  REGISTRY[norm(base)] = comp;
}

const lookup = (base: string): SkelComp | null => REGISTRY[norm(base)] ?? null;

// Routes whose path segment doesn't map cleanly to a file name.
const OVERRIDES: Array<[RegExp, string]> = [
  // Copilot standalone (/copilot/*) — files are "AiCopilot*"; index = MyPortfolio
  [/\/copilot\/top-opportunities/, "AiCopilotTopOpportunitiesSkeleton"],
  [/\/copilot\/macro/, "AiCopilotMacroSkeleton"],
  [/\/copilot\/holdings/, "AiCopilotHoldingsSkeleton"],
  [/\/copilot\/risks/, "AiCopilotRisksSkeleton"],
  [/\/copilot\/(ai-analyst|analyst)/, "AiCopilotAiAnalystSkeleton"],
  [/\/copilot\/(ai-chat|chat)/, "AiCopilotAiChatSkeleton"],
  [/\/copilot\/?$/, "AiMyPortfolioSkeleton"],
  // AI detail/index aliases
  [/\/ai\/my-portfolio/, "AiMyPortfolioSkeleton"],
  [/\/ai\/assistant/, "AiAssistantSkeleton"],
  // Dynamic detail pages
  [/\/crypto\/coin\//, "CryptoCoinDetailSkeleton"],
  [/\/forex\/pair\//, "ForexPairDetailSkeleton"],
  // Journal trade detail: /app/journal/<uuid-ish>
  [/\/journal\/[0-9a-f]{6,}/, "JournalTradeDetailSkeleton"],
  // Top-level singletons
  [/\/app\/home/, "HomePageSkeleton"],
  [/\/app\/settings/, "SettingsLayoutSkeleton"],
  [/\/top-secret/, "TopSecretPageSkeleton"],
];

const KNOWN_AREAS = new Set([
  "all-markets", "stocks", "crypto", "futures", "forex", "commodities",
  "macro", "options", "ai", "journal", "funding", "admin",
]);

function resolve(pathname: string): SkelComp | null {
  const p = pathname.toLowerCase();

  // 1. explicit overrides
  for (const [re, base] of OVERRIDES) {
    if (re.test(p)) {
      const c = lookup(base);
      if (c) return c;
    }
  }

  const segs = p.split("/").filter(Boolean); // e.g. ['app','all-markets','overview']
  const ai = segs.indexOf("app");
  const area = ai >= 0 ? segs[ai + 1] : segs[0];
  let tab = ai >= 0 ? segs[ai + 2] : segs[1];

  if (!area) return null;
  if (!tab) tab = "overview"; // area index → its overview

  // 2. auto-match <area><tab>Skeleton
  const direct = lookup(`${area}${tab}skeleton`);
  if (direct) return direct;

  // 3. area overview fallback (only for known areas)
  if (KNOWN_AREAS.has(area)) {
    const overview = lookup(`${area}overviewskeleton`);
    if (overview) return overview;
  }

  return null;
}

// ── Generic silhouettes — last-resort fallback (never a spinner) ───────────
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
function HeaderBar() {
  return (
    <div className="space-y-ds-2" aria-hidden="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-64" />
    </div>
  );
}
function GenericPage({ pathname }: { pathname: string }) {
  const p = pathname.toLowerCase();
  if (p.includes("/journal") || p.includes("/backtest")) {
    return (
      <Shell>
        <HeaderBar />
        <SkeletonStatRow count={4} />
        <SkeletonChart height="h-72" />
        <SkeletonTable rows={6} cols={6} />
      </Shell>
    );
  }
  if (p.includes("chart")) {
    return (
      <Shell>
        <HeaderBar />
        <SkeletonChart height="h-[420px]" />
        <SkeletonStatRow count={4} />
      </Shell>
    );
  }
  if (/calendar|movers|screener|news|trades|earnings|upgrades|transactions|events|unusual|flow/.test(p)) {
    return (
      <Shell>
        <HeaderBar />
        <SkeletonStatRow count={4} />
        <SkeletonTable rows={8} cols={6} />
      </Shell>
    );
  }
  return (
    <Shell>
      <HeaderBar />
      <SkeletonStatRow count={4} />
      <SkeletonGrid count={6} cols={3} />
    </Shell>
  );
}

export function RouteSkeleton() {
  const { pathname } = useLocation();
  // Skeletons are ONLY for the authenticated app shell, whose layouts are known.
  // Public/marketing/auth/legal pages (landing "/", "/auth/*", "/legal/*", …)
  // must NOT show an app-content skeleton — they have their own hero/markup and
  // the lazy chunk loads fast. Render nothing for them.
  if (!pathname.startsWith("/app") && !pathname.startsWith("/copilot")) {
    return null;
  }
  const Bespoke = resolve(pathname);
  if (Bespoke) return <Bespoke />;
  return <GenericPage pathname={pathname} />;
}

export default RouteSkeleton;
