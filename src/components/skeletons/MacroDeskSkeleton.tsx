/**
 * Bespoke skeleton for src/pages/app/macro/tabs/MacroDesk.tsx
 * Real layout:
 *   1. Page header: h1 "Macro Desk"
 *   2. Sub-nav (3 tabs): Reports / Sentiment / News
 *   3. Inner Reports page (default sub-tab = MacroReports):
 *      a. Report selection tab bar: scrollable row of ~7 icon+label buttons
 *      b. Report Header Card (full-width, gradient): large icon + title + importance
 *         badge + description text + frequency/source meta row
 *      c. Key Indicators card: "Key Indicators" heading + flex-wrap of ~9 tag chips
 *      d. AI Analysis card: header row (AI Analysis label + Live badge) + CTA section
 *         with 2×2 grid of analysis-section buttons (Executive Summary, Key Changes,
 *         Market Impact, Historical Context)
 *      e. Original Report card: header row (FileText icon + title) +
 *         large report-access block with 2 link buttons
 */
import {
  SkeletonPage,
  SkeletonTabs,
  SkeletonText,
  Skeleton,
} from '@/components/skeletons/shell';

export function MacroDeskSkeletonPage() {
  return (
    <SkeletonPage maxWidth="max-w-[1400px]">
      {/* 1. Page header */}
      <Skeleton className="h-8 w-40" aria-hidden="true" />

      {/* 2. Sub-nav: 3 tabs */}
      <SkeletonTabs count={3} />

      {/* 3a. Report selection tab bar: 7 icon+label buttons */}
      <div
        className="rounded-2xl border border-border-ds-subtle p-2 flex gap-1 overflow-x-auto"
        aria-hidden="true"
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-ds-2 px-4 py-3 rounded-xl border border-border-ds-subtle flex-1 min-w-[100px]"
          >
            <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* 3b. Report Header Card */}
      <div
        className="rounded-2xl border border-border-ds-subtle p-8 space-y-ds-4"
        aria-hidden="true"
      >
        <div className="flex items-start gap-6">
          <Skeleton className="h-20 w-20 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-ds-3">
            <div className="flex items-center gap-ds-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <SkeletonText lines={2} />
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-ds-2">
                <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                <div className="space-y-ds-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-ds-2">
                <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                <div className="space-y-ds-1">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3c. Key Indicators card */}
      <div
        className="rounded-2xl border border-border-ds-subtle p-6 space-y-ds-4"
        aria-hidden="true"
      >
        <div className="flex items-center gap-ds-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-xl" />
          ))}
        </div>
      </div>

      {/* 3d. AI Analysis card */}
      <div
        className="rounded-2xl border border-border-ds-subtle overflow-hidden"
        aria-hidden="true"
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-ds-subtle">
          <div className="flex items-center gap-ds-3">
            <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
            <div className="space-y-ds-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
        {/* CTA body */}
        <div className="p-8 flex flex-col items-center space-y-ds-4">
          <Skeleton className="h-20 w-20 rounded-2xl" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-80" />
          <Skeleton className="h-3 w-64" />
          {/* 2×2 analysis-section grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-ds-2 px-4 py-3 rounded-xl border border-border-ds-subtle"
              >
                <Skeleton className="h-4 w-4 flex-shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-4 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3e. Original Report card */}
      <div
        className="rounded-2xl border border-border-ds-subtle overflow-hidden"
        aria-hidden="true"
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-ds-subtle">
          <div className="flex items-center gap-ds-3">
            <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
            <div className="space-y-ds-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        {/* Report access block */}
        <div className="p-8 space-y-ds-4">
          <div className="rounded-2xl border border-border-ds-subtle p-8 space-y-ds-4">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <div className="flex gap-ds-3">
              <Skeleton className="h-10 w-40 rounded-xl" />
              <Skeleton className="h-10 w-40 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
