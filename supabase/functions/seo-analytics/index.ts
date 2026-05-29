// supabase/functions/seo-analytics/index.ts
//
// PostHog Query API proxy for the FINOTAUR SEO analytics admin widget.
//
// Endpoints:
//   GET  /seo-analytics  → aggregated SEO analytics JSON
//   OPTIONS /seo-analytics → CORS preflight
//
// Required secrets (Supabase Edge Function):
//   POSTHOG_PERSONAL_API_KEY  — PostHog personal API key (not the project/ingestion key)
//   POSTHOG_PROJECT_ID        — PostHog project numeric ID
//
// Optional secrets:
//   POSTHOG_HOST              — defaults to https://us.posthog.com
//
// Graceful fallback: if either required secret is missing, returns HTTP 200
// with status="mock" and realistic mock data so the frontend widget renders
// immediately while prompting the operator to add the secrets.

import { corsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SummaryRow {
  views_7d: number;
  views_30d: number;
  uniques_7d: number;
  uniques_30d: number;
}

interface TickerRow {
  path: string;
  views: number;
  uniques: number;
}

interface SourceRow {
  source: string;
  views: number;
}

interface DayRow {
  day: string;
  views: number;
}

interface AvgTimeRow {
  avg_seconds: number | null;
}

interface PostHogResult {
  results: unknown[][];
  columns: string[];
}

interface AnalyticsData {
  summary: {
    totalViews7d: number;
    totalViews30d: number;
    uniqueVisitors7d: number;
    uniqueVisitors30d: number;
    avgTimeOnPageSeconds: number | null;
  };
  topTickers: Array<{
    ticker: string;
    path: string;
    views: number;
    uniqueVisitors: number;
  }>;
  sourceBreakdown: Array<{
    source: string;
    label: string;
    views: number;
  }>;
  viewsPerDay: Array<{
    date: string;
    views: number;
  }>;
}

interface SuccessResponse {
  status: 'live' | 'mock';
  generatedAt?: string;
  cachedFor?: number;
  configRequired?: string[];
  message?: string;
  data: AnalyticsData;
}

interface ErrorResponse {
  status: 'auth_error' | 'upstream_error';
  message: string;
  data?: AnalyticsData;
}

// ---------------------------------------------------------------------------
// In-memory cache (warm-instance only, 5-minute TTL)
// ---------------------------------------------------------------------------

let cache: { value: SuccessResponse; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Source label map
// ---------------------------------------------------------------------------

const SOURCE_LABELS: Record<string, string> = {
  organic_search: 'Organic Search',
  social: 'Social',
  direct: 'Direct',
  referral: 'Referral',
};

// ---------------------------------------------------------------------------
// Mock data (used when secrets are missing or PostHog is unreachable)
// ---------------------------------------------------------------------------

function buildMockData(): AnalyticsData {
  // 30 days of views with a mild growth curve
  const today = new Date();
  const viewsPerDay: Array<{ date: string; views: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    // Start ~8, grow to ~22 with some noise
    const base = Math.round(8 + (29 - i) * 0.5);
    const noise = Math.round((Math.random() - 0.5) * 6);
    viewsPerDay.push({ date: dateStr, views: Math.max(1, base + noise) });
  }

  return {
    summary: {
      totalViews7d: 247,
      totalViews30d: 1842,
      uniqueVisitors7d: 189,
      uniqueVisitors30d: 1204,
      avgTimeOnPageSeconds: 87,
    },
    topTickers: [
      { ticker: 'AAPL', path: '/research/AAPL', views: 312, uniqueVisitors: 241 },
      { ticker: 'NVDA', path: '/research/NVDA', views: 278, uniqueVisitors: 215 },
      { ticker: 'MSFT', path: '/research/MSFT', views: 234, uniqueVisitors: 189 },
      { ticker: 'TSLA', path: '/research/TSLA', views: 198, uniqueVisitors: 156 },
      { ticker: 'GOOGL', path: '/research/GOOGL', views: 167, uniqueVisitors: 134 },
      { ticker: 'META', path: '/research/META', views: 145, uniqueVisitors: 118 },
      { ticker: 'AMZN', path: '/research/AMZN', views: 123, uniqueVisitors: 99 },
      { ticker: 'AMD', path: '/research/AMD', views: 98, uniqueVisitors: 79 },
    ],
    sourceBreakdown: [
      { source: 'organic_search', label: 'Organic Search', views: 1197 },
      { source: 'direct', label: 'Direct', views: 368 },
      { source: 'social', label: 'Social', views: 184 },
      { source: 'referral', label: 'Referral', views: 93 },
    ],
    viewsPerDay,
  };
}

// ---------------------------------------------------------------------------
// PostHog query helper
// ---------------------------------------------------------------------------

async function queryPostHog(
  host: string,
  projectId: string,
  apiKey: string,
  sql: string,
): Promise<PostHogResult> {
  const url = `${host}/api/projects/${projectId}/query/`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(`posthog_auth:${res.status}`);
  }
  if (!res.ok) {
    throw new Error(`posthog_upstream:${res.status}`);
  }

  return res.json() as Promise<PostHogResult>;
}

// ---------------------------------------------------------------------------
// Result mappers — parse raw PostHog [row, row, ...] arrays
// ---------------------------------------------------------------------------

function mapSummary(result: PostHogResult): SummaryRow {
  const row = result.results?.[0] ?? [];
  return {
    views_7d: Number(row[0]) || 0,
    views_30d: Number(row[1]) || 0,
    uniques_7d: Number(row[2]) || 0,
    uniques_30d: Number(row[3]) || 0,
  };
}

function mapTickers(result: PostHogResult): TickerRow[] {
  return (result.results ?? []).map((row) => ({
    path: String(row[0] ?? ''),
    views: Number(row[1]) || 0,
    uniques: Number(row[2]) || 0,
  }));
}

function mapSources(result: PostHogResult): SourceRow[] {
  return (result.results ?? []).map((row) => ({
    source: String(row[0] ?? 'referral'),
    views: Number(row[1]) || 0,
  }));
}

function mapDays(result: PostHogResult): DayRow[] {
  return (result.results ?? []).map((row) => ({
    day: String(row[0] ?? ''),
    views: Number(row[1]) || 0,
  }));
}

function mapAvgTime(result: PostHogResult): AvgTimeRow {
  const val = result.results?.[0]?.[0];
  return { avg_seconds: val != null && val !== '' ? Number(val) : null };
}

// ---------------------------------------------------------------------------
// Ticker path → ticker symbol
// ---------------------------------------------------------------------------

function pathToTicker(path: string): string {
  // "/research/AAPL" → "AAPL", "/research/AAPL/something" → "AAPL"
  const parts = path.replace(/^\/research\//, '').split('/');
  return parts[0].toUpperCase();
}

// ---------------------------------------------------------------------------
// Fetch live data from PostHog (5 parallel queries)
// ---------------------------------------------------------------------------

async function fetchLiveData(
  host: string,
  projectId: string,
  apiKey: string,
): Promise<SuccessResponse> {
  const querySummary = `
SELECT
  countIf(timestamp >= now() - INTERVAL 7 DAY) AS views_7d,
  countIf(timestamp >= now() - INTERVAL 30 DAY) AS views_30d,
  uniqIf(distinct_id, timestamp >= now() - INTERVAL 7 DAY) AS uniques_7d,
  uniqIf(distinct_id, timestamp >= now() - INTERVAL 30 DAY) AS uniques_30d
FROM events
WHERE event = '$pageview'
  AND properties.$pathname LIKE '/research/%'
`.trim();

  const queryTopTickers = `
SELECT properties.$pathname AS path, count() AS views, uniq(distinct_id) AS uniques
FROM events
WHERE event = '$pageview'
  AND properties.$pathname LIKE '/research/%'
  AND properties.$pathname != '/research'
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY path
ORDER BY views DESC
LIMIT 20
`.trim();

  const querySources = `
SELECT
  multiIf(
    coalesce(properties.$referring_domain, '') = '', 'direct',
    properties.$referring_domain LIKE '%google%', 'organic_search',
    properties.$referring_domain LIKE '%bing%', 'organic_search',
    properties.$referring_domain LIKE '%duckduckgo%', 'organic_search',
    properties.$referring_domain LIKE '%yahoo%', 'organic_search',
    properties.$referring_domain IN ('t.co','twitter.com','x.com'), 'social',
    properties.$referring_domain LIKE '%facebook%', 'social',
    properties.$referring_domain LIKE '%linkedin%', 'social',
    properties.$referring_domain LIKE '%reddit%', 'social',
    properties.$referring_domain LIKE '%instagram%', 'social',
    'referral'
  ) AS source,
  count() AS views
FROM events
WHERE event = '$pageview'
  AND properties.$pathname LIKE '/research/%'
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY source
ORDER BY views DESC
`.trim();

  const queryDays = `
SELECT toDate(timestamp) AS day, count() AS views
FROM events
WHERE event = '$pageview'
  AND properties.$pathname LIKE '/research/%'
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY day
ORDER BY day ASC
`.trim();

  const queryAvgTime = `
SELECT avg(toFloat(properties.$time_on_page)) AS avg_seconds
FROM events
WHERE event = '$pageleave'
  AND properties.$pathname LIKE '/research/%'
  AND timestamp >= now() - INTERVAL 7 DAY
`.trim();

  // Run all 5 queries in parallel; per-query failures produce null, not a throw
  const [summaryResult, tickersResult, sourcesResult, daysResult, avgTimeResult] =
    await Promise.all([
      queryPostHog(host, projectId, apiKey, querySummary).catch((e: Error) => {
        // Re-throw auth errors so the caller can handle them
        if (e.message.startsWith('posthog_auth:')) throw e;
        return null;
      }),
      queryPostHog(host, projectId, apiKey, queryTopTickers).catch((e: Error) => {
        if (e.message.startsWith('posthog_auth:')) throw e;
        return null;
      }),
      queryPostHog(host, projectId, apiKey, querySources).catch((e: Error) => {
        if (e.message.startsWith('posthog_auth:')) throw e;
        return null;
      }),
      queryPostHog(host, projectId, apiKey, queryDays).catch((e: Error) => {
        if (e.message.startsWith('posthog_auth:')) throw e;
        return null;
      }),
      // avg time is best-effort — never throw upstream errors upward
      queryPostHog(host, projectId, apiKey, queryAvgTime).catch(() => null),
    ]);

  const summary = summaryResult ? mapSummary(summaryResult) : { views_7d: 0, views_30d: 0, uniques_7d: 0, uniques_30d: 0 };
  const tickers = tickersResult ? mapTickers(tickersResult) : [];
  const sources = sourcesResult ? mapSources(sourcesResult) : [];
  const days = daysResult ? mapDays(daysResult) : [];
  const avgTime = avgTimeResult ? mapAvgTime(avgTimeResult) : { avg_seconds: null };

  const data: AnalyticsData = {
    summary: {
      totalViews7d: summary.views_7d,
      totalViews30d: summary.views_30d,
      uniqueVisitors7d: summary.uniques_7d,
      uniqueVisitors30d: summary.uniques_30d,
      avgTimeOnPageSeconds: avgTime.avg_seconds,
    },
    topTickers: tickers.map((t) => ({
      ticker: pathToTicker(t.path),
      path: t.path,
      views: t.views,
      uniqueVisitors: t.uniques,
    })),
    sourceBreakdown: sources.map((s) => ({
      source: s.source,
      label: SOURCE_LABELS[s.source] ?? s.source,
      views: s.views,
    })),
    viewsPerDay: days.map((d) => ({ date: d.day, views: d.views })),
  };

  return {
    status: 'live',
    generatedAt: new Date().toISOString(),
    cachedFor: CACHE_TTL_MS / 1000,
    data,
  };
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  const apiKey = Deno.env.get('POSTHOG_PERSONAL_API_KEY') ?? '';
  const projectId = Deno.env.get('POSTHOG_PROJECT_ID') ?? '';
  const host = Deno.env.get('POSTHOG_HOST') ?? 'https://us.posthog.com';

  // --- Graceful fallback: missing secrets → mock mode ---
  if (!apiKey || !projectId) {
    const missing: string[] = [];
    if (!apiKey) missing.push('POSTHOG_PERSONAL_API_KEY');
    if (!projectId) missing.push('POSTHOG_PROJECT_ID');

    const mockResponse: SuccessResponse = {
      status: 'mock',
      configRequired: missing,
      message: 'Add POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID to Supabase Edge Function secrets to enable live data.',
      data: buildMockData(),
    };

    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: responseHeaders,
    });
  }

  // --- Cache check ---
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return new Response(JSON.stringify(cache.value), {
      status: 200,
      headers: responseHeaders,
    });
  }

  // --- Fetch live data ---
  try {
    const liveData = await fetchLiveData(host, projectId, apiKey);

    // Store in warm-instance cache
    cache = { value: liveData, expiresAt: now + CACHE_TTL_MS };

    return new Response(JSON.stringify(liveData), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    // Auth errors (401 / 403 from PostHog)
    if (msg.startsWith('posthog_auth:')) {
      const authError: ErrorResponse = {
        status: 'auth_error',
        message:
          'PostHog rejected the API key. Verify that POSTHOG_PERSONAL_API_KEY is a valid PostHog Personal API Key (not the project ingestion key) and has read access to the project.',
      };
      return new Response(JSON.stringify(authError), {
        status: 200, // Return 200 so the frontend can render the error gracefully
        headers: responseHeaders,
      });
    }

    // Upstream / network errors — serve stale cache if available, else mock
    const fallbackData = cache?.value ?? {
      status: 'mock' as const,
      configRequired: [],
      message: 'PostHog is unreachable. Showing example data.',
      data: buildMockData(),
    };

    const upstreamError: ErrorResponse = {
      status: 'upstream_error',
      message: `PostHog query failed: ${msg}. ${cache ? 'Serving cached data.' : 'Falling back to mock data.'}`,
      data: fallbackData.data,
    };

    return new Response(JSON.stringify(upstreamError), {
      status: 200,
      headers: responseHeaders,
    });
  }
});
