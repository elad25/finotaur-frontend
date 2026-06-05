/**
 * AiStockAnalyzerSkeleton — mirrors /app/ai/stock-analyzer (landing state).
 *
 * The first-load / before-ticker-selected state is the StockAnalyzerLandingHero:
 * a full-bleed premium hero card (min-h-[580px], rounded-[8px]) laid out as
 * a 2-column (lg) split:
 *
 *   Left column (always visible):
 *     1. h1 "Stock Analyzer" (text-[44px]→[66px])
 *     2. Subtitle line
 *     3. SearchBar (hero variant with Analyze button, max-w-[760px])
 *     4. "Popular tickers" label + 8 ticker chips
 *
 *   Right column (hidden below lg):
 *     Two decorative preview cards (MarketPreviewCard + AnalysisPreviewCard)
 *
 * The tabs + content area only appear after a ticker is resolved, so they
 * are NOT part of this skeleton.
 *
 * Container: AIArenaShell adds no extra wrapper beyond the page scroll area,
 * and the hero is edge-to-edge within the shell's padding.
 */
import {
  SkeletonPage,
  Skeleton,
} from "@/components/skeletons/shell";

export function AiStockAnalyzerSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1600px]">
      {/* Full-bleed hero card */}
      <div className="relative min-h-[580px] overflow-hidden rounded-[8px] border border-border-ds-subtle bg-surface-1 px-ds-5 py-ds-8 md:px-8 lg:px-[72px]">
        <div className="grid min-h-[580px] items-center gap-ds-9 lg:grid-cols-[1.02fr_0.98fr]">

          {/* Left column — always visible */}
          <div className="max-w-3xl space-y-ds-7">
            {/* h1 title */}
            <Skeleton className="h-[60px] w-72 md:h-[72px]" />
            {/* Subtitle */}
            <Skeleton className="h-5 w-[420px] max-w-full" />

            {/* SearchBar (hero, with Analyze button) */}
            <div className="flex items-center gap-ds-3 rounded-[16px] border border-border-ds-subtle bg-surface-base p-ds-3 max-w-[760px]">
              <Skeleton className="h-5 w-5 flex-shrink-0 rounded-full" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-10 w-32 flex-shrink-0 rounded-[12px]" />
            </div>

            {/* "Popular tickers" label */}
            <Skeleton className="h-3 w-28" />

            {/* 8 ticker chips */}
            <div className="flex flex-wrap gap-ds-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-16 rounded-[8px]" />
              ))}
            </div>
          </div>

          {/* Right column — decorative preview cards (visible at lg+) */}
          <div className="relative hidden min-h-[390px] lg:block">
            {/* MarketPreviewCard */}
            <Skeleton className="absolute right-[126px] top-[8px] h-[320px] w-[404px] rounded-[16px]" />
            {/* AnalysisPreviewCard */}
            <Skeleton className="absolute right-0 top-[82px] h-[220px] w-[216px] rounded-[14px]" />
          </div>

        </div>
      </div>
    </SkeletonPage>
  );
}
