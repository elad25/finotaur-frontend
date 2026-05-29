// src/pages/app/admin/SeoAnalyticsPage.tsx
// ==========================================
// Admin page — SEO analytics for /research/* pages (Wave 5).
// Fetches from the `seo-analytics` Supabase Edge Function.
// DO NOT modify App.tsx / AdminCRMShell.tsx — wiring is Phase 3.

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Eyebrow } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { HealthBadges } from '@/components/admin/seo/HealthBadges';
import { MetricTiles } from '@/components/admin/seo/MetricTiles';
import { ViewsSparkline } from '@/components/admin/seo/ViewsSparkline';
import { SourceBreakdown } from '@/components/admin/seo/SourceBreakdown';
import { TickerTable } from '@/components/admin/seo/TickerTable';
import { fetchSeoAnalytics } from '@/lib/seo/analyticsClient';
import type { AnalyticsResponse } from '@/lib/seo/analyticsTypes';

// ---------------------------------------------------------------------------
// Skeleton helpers
// ---------------------------------------------------------------------------
function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-white/5 animate-pulse ${className}`}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* badges row */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonBlock key={i} className="h-7 w-28" />
        ))}
      </div>
      {/* metric tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="h-28" />
        ))}
      </div>
      {/* charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonBlock className="h-[240px]" />
        <SkeletonBlock className="h-[240px]" />
      </div>
      {/* table */}
      <SkeletonBlock className="h-[360px]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mock / error banner
// ---------------------------------------------------------------------------
function MockBanner({ message, configRequired }: { message?: string; configRequired?: string[] }) {
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-sm text-yellow-300">
      <p className="font-semibold mb-1">Live data unavailable — showing example data</p>
      <p className="text-yellow-400/80">
        Configure <code className="text-yellow-200">POSTHOG_PERSONAL_API_KEY</code> and{' '}
        <code className="text-yellow-200">POSTHOG_PROJECT_ID</code> in Supabase Edge Function
        secrets to enable live analytics.
      </p>
      {configRequired && configRequired.length > 0 && (
        <p className="mt-1 text-xs text-yellow-400/60">
          Missing: {configRequired.join(', ')}
        </p>
      )}
      {message && (
        <p className="mt-1 text-xs text-yellow-400/60">{message}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// External quick-link footer
// ---------------------------------------------------------------------------
const QUICK_LINKS = [
  { label: 'Google Search Console', href: 'https://search.google.com/search-console' },
  { label: 'GA4', href: 'https://analytics.google.com/' },
  { label: 'PostHog', href: 'https://us.posthog.com/' },
  { label: 'Cloudflare Pages', href: 'https://dash.cloudflare.com/' },
] as const;

function QuickLinks() {
  return (
    <div className="flex flex-wrap gap-3 pt-2">
      {QUICK_LINKS.map(({ label, href }) => (
        <Button
          key={label}
          variant="goldOutline"
          size="compact"
          asChild
          showArrow={false}
        >
          <a href={href} target="_blank" rel="noopener noreferrer">
            {label} ↗
          </a>
        </Button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  /** If provided, skip fetching and render this directly (used by dev preview). */
  analyticsResponse?: AnalyticsResponse;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function SeoAnalyticsPage({ analyticsResponse }: Props = {}) {
  const [response, setResponse] = useState<AnalyticsResponse | null>(
    analyticsResponse ?? null
  );
  const [loading, setLoading] = useState(!analyticsResponse);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSeoAnalytics();
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error fetching SEO analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip fetching when data is injected via prop (dev preview / tests).
    if (analyticsResponse) return;
    void load();
  }, [load, analyticsResponse]);

  const showBanner =
    response?.status === 'mock' || response?.status === 'auth_error';

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Eyebrow className="mb-2">WAVE 5</Eyebrow>
            <h1 className="text-2xl font-bold text-white">
              SEO Analytics — /research/* pages
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Page views, traffic sources, and top tickers from PostHog
            </p>
          </div>
          <Button
            variant="goldOutline"
            size="compact"
            onClick={() => void load()}
            disabled={loading}
            showArrow={false}
            className="flex items-center gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>

        {/* Loading state */}
        {loading && <LoadingSkeleton />}

        {/* Error state */}
        {!loading && error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Failed to load SEO analytics</p>
              <p className="text-sm opacity-80 mt-1">{error}</p>
              <button
                onClick={() => void load()}
                className="mt-3 text-sm text-red-300 hover:text-white underline transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Data loaded */}
        {!loading && !error && response && (
          <>
            {/* Mock / auth_error banner */}
            {showBanner && (
              <MockBanner
                message={response.message}
                configRequired={response.configRequired}
              />
            )}

            {/* Health badges */}
            <HealthBadges
              status={response.status}
              generatedAt={response.generatedAt}
            />

            {/* Metric tiles */}
            <MetricTiles summary={response.data.summary} />

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-[#111111] border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-1">30-day views trend</h3>
                <p className="text-xs text-gray-500 mb-4">Page views per day across all /research/* pages</p>
                <ViewsSparkline data={response.data.viewsPerDay} />
              </div>
              <div className="bg-[#111111] border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-1">Traffic sources</h3>
                <p className="text-xs text-gray-500 mb-4">Where visitors are coming from</p>
                <SourceBreakdown data={response.data.sourceBreakdown} />
              </div>
            </div>

            {/* Ticker table — full width */}
            <TickerTable tickers={response.data.topTickers} />

            {/* Footer quick links */}
            <div className="pt-2 border-t border-gray-800">
              <p className="text-xs text-gray-500 mb-3">Quick links</p>
              <QuickLinks />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SeoAnalyticsPage;
