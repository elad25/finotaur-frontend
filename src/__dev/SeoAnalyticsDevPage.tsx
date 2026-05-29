// src/__dev/SeoAnalyticsDevPage.tsx
// DEV-ONLY screen-verification page — NOT part of production.
// Route: /__dev/seo-analytics (public, no auth required).
// REMOVE this file + its import + route in App.tsx before merging Wave 5 to main.
// The production surface is /app/admin/seo (behind ProtectedAdminRoute).

import SeoAnalyticsPage from '@/pages/app/admin/SeoAnalyticsPage';
import type { AnalyticsResponse, ViewsPerDayRow } from '@/lib/seo/analyticsTypes';

// ---------------------------------------------------------------------------
// Helper: 30-day growth curve ending today
// ---------------------------------------------------------------------------
function generate30DaysGrowthCurve(): ViewsPerDayRow[] {
  const today = new Date();
  const rows: ViewsPerDayRow[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    // Ramp from ~10/day on day 0 to ~95/day on day 29 with mild noise
    const base = 10 + Math.round((85 / 29) * (29 - i));
    const noise = Math.round((Math.random() - 0.5) * 8);
    rows.push({ date: dateStr, views: Math.max(1, base + noise) });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Mock 1: status = 'mock' (env vars not configured)
// ---------------------------------------------------------------------------
const MOCK_RESPONSE_NOT_CONFIGURED: AnalyticsResponse = {
  status: 'mock',
  configRequired: ['POSTHOG_PERSONAL_API_KEY', 'POSTHOG_PROJECT_ID'],
  message:
    'Add POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID to Supabase Edge Function secrets to enable live data.',
  data: {
    summary: {
      totalViews7d: 247,
      totalViews30d: 1842,
      uniqueVisitors7d: 168,
      uniqueVisitors30d: 1124,
      avgTimeOnPageSeconds: 87,
    },
    topTickers: [
      { ticker: 'AAPL', path: '/research/AAPL', views: 89, uniqueVisitors: 67 },
      { ticker: 'MSFT', path: '/research/MSFT', views: 76, uniqueVisitors: 58 },
      { ticker: 'NVDA', path: '/research/NVDA', views: 68, uniqueVisitors: 51 },
      { ticker: 'GOOGL', path: '/research/GOOGL', views: 54, uniqueVisitors: 42 },
      { ticker: 'TSLA', path: '/research/TSLA', views: 47, uniqueVisitors: 38 },
      { ticker: 'AMZN', path: '/research/AMZN', views: 39, uniqueVisitors: 31 },
      { ticker: 'META', path: '/research/META', views: 32, uniqueVisitors: 26 },
      { ticker: 'AMD', path: '/research/AMD', views: 28, uniqueVisitors: 22 },
    ],
    sourceBreakdown: [
      { source: 'organic_search', label: 'Organic Search', views: 1198 },
      { source: 'direct', label: 'Direct', views: 368 },
      { source: 'social', label: 'Social', views: 184 },
      { source: 'referral', label: 'Referral', views: 92 },
    ],
    viewsPerDay: generate30DaysGrowthCurve(),
  },
};

// ---------------------------------------------------------------------------
// Mock 2: status = 'live' (mature traffic — ~10x larger numbers)
// ---------------------------------------------------------------------------
const MOCK_RESPONSE_LIVE: AnalyticsResponse = {
  status: 'live',
  generatedAt: new Date().toISOString(),
  cachedFor: 300,
  data: {
    summary: {
      totalViews7d: 2470,
      totalViews30d: 18420,
      uniqueVisitors7d: 1680,
      uniqueVisitors30d: 11240,
      avgTimeOnPageSeconds: 112,
    },
    topTickers: [
      { ticker: 'AAPL', path: '/research/AAPL', views: 890, uniqueVisitors: 670 },
      { ticker: 'MSFT', path: '/research/MSFT', views: 760, uniqueVisitors: 580 },
      { ticker: 'NVDA', path: '/research/NVDA', views: 680, uniqueVisitors: 510 },
      { ticker: 'GOOGL', path: '/research/GOOGL', views: 540, uniqueVisitors: 420 },
      { ticker: 'TSLA', path: '/research/TSLA', views: 470, uniqueVisitors: 380 },
      { ticker: 'AMZN', path: '/research/AMZN', views: 390, uniqueVisitors: 310 },
      { ticker: 'META', path: '/research/META', views: 320, uniqueVisitors: 260 },
      { ticker: 'AMD', path: '/research/AMD', views: 280, uniqueVisitors: 220 },
    ],
    sourceBreakdown: [
      { source: 'organic_search', label: 'Organic Search', views: 11980 },
      { source: 'direct', label: 'Direct', views: 3680 },
      { source: 'social', label: 'Social', views: 1840 },
      { source: 'referral', label: 'Referral', views: 920 },
    ],
    viewsPerDay: generate30DaysGrowthCurve().map((row) => ({
      ...row,
      views: row.views * 10,
    })),
  },
};

// ---------------------------------------------------------------------------
// Dev preview page
// ---------------------------------------------------------------------------
export default function SeoAnalyticsDevPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Dev banner */}
      <div className="border-b border-white/10 px-4 py-3 bg-yellow-500/10 text-yellow-200 text-sm">
        DEV PREVIEW — not part of production. Mock data only. Remove this route before merge.
      </div>

      {/* Variant 1 header */}
      <div className="px-4 py-6 bg-[#0a0a0a]">
        <h2 className="text-white text-lg font-semibold mb-2">
          Variant 1: Mock mode (env not configured)
        </h2>
        <p className="text-white/50 text-xs mb-4">
          Banner should show "configure secrets" message.
        </p>
      </div>
      <SeoAnalyticsPage analyticsResponse={MOCK_RESPONSE_NOT_CONFIGURED} />

      {/* Variant 2 header */}
      <div className="px-4 py-6 mt-12 border-t border-white/10 bg-[#0a0a0a]">
        <h2 className="text-white text-lg font-semibold mb-2">
          Variant 2: Live mode (PostHog wired)
        </h2>
        <p className="text-white/50 text-xs mb-4">
          No banner — full live data display.
        </p>
      </div>
      <SeoAnalyticsPage analyticsResponse={MOCK_RESPONSE_LIVE} />
    </div>
  );
}
