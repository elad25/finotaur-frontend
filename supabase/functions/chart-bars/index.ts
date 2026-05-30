// supabase/functions/chart-bars/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   OHLCV bar proxy + cache for FinotaurChart (Trade Journal,
//   Backtest, future Live tab, Strategy Studio).
//
// INPUT (POST body):
//   { symbol: string, interval: Interval, from: number, to: number }
//     - symbol   : Yahoo-format ticker, e.g. 'MNQ=F', 'AAPL', '^NDX'
//     - interval : '1m' | '5m' | '15m' | '30m' | '60m' | '1h' | '4h' | '1d' | '1wk' | '1mo'
//     - from/to  : Unix seconds (UTC), inclusive
//
// OUTPUT:
//   { bars: Array<{time, open, high, low, close, volume?}>,
//     meta: { cached_count, fetched_count, source } }
//
// CACHE STRATEGY (chart_bars_cache):
//   - Historical bars (bar_time + interval_seconds <= now) are immutable —
//     written once via ON CONFLICT DO NOTHING.
//   - Currently-forming bar is never cached — always re-fetched.
//   - Partial-fetch: if cache covers part of [from, to], Yahoo is only
//     called for the missing tail. Saves Yahoo bandwidth at scale.
//
// SECURITY:
//   Uses SERVICE_ROLE_KEY → bypasses RLS on chart_bars_cache.
//   Endpoint itself is anonymous (no JWT verification) — OHLC bars are
//   public data and rate limiting can be added later via Supabase's
//   built-in throttling if abuse appears.
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Inlined CORS headers (kept inline rather than imported from ../_shared/cors.ts
// so the MCP deploy can ship a single file without relative-path gymnastics).
// Matches the existing ../_shared/cors.ts contract.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ─── Interval → seconds ──────────────────────────────────────
const INTERVAL_SECONDS: Record<string, number> = {
  '1m': 60,
  '2m': 120,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '60m': 3600,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1wk': 604800,
  '1mo': 2592000, // 30d approx — Yahoo treats `1mo` as calendar months internally
};

// ─── Yahoo accepts these as `interval` ────────────────────────
// We pass our internal vocabulary through directly — Yahoo uses the same
// strings for all values above EXCEPT '60m' which it also accepts as '1h'.
function toYahooInterval(internal: string): string {
  if (internal === '60m') return '1h';
  if (internal === '4h') return '4h'; // Yahoo supports this; not always documented
  return internal;
}

// Both Yahoo Finance hosts — query2 is primary, query1 is the fallback.
const YAHOO_HOSTS = [
  'https://query2.finance.yahoo.com/v8/finance/chart',
  'https://query1.finance.yahoo.com/v8/finance/chart',
] as const;

// Yahoo blocks requests without a real-looking User-Agent.
const YAHOO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept': 'application/json,text/javascript,*/*;q=0.01',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Statuses that are worth retrying (transient upstream failures).
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

// Fixed backoff schedule (ms) between attempt 1→2 and 2→3.
const BACKOFF_MS = [300, 800] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Supabase service-role client (bypasses RLS) ──────────────
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// ─── Types ────────────────────────────────────────────────────
interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ChartBarsRequest {
  symbol: string;
  interval: string;
  from: number;
  to: number;
}

// ═════════════════════════════════════════════════════════════
// Yahoo fetch — with retry/backoff + host fallback
// ═════════════════════════════════════════════════════════════

/** Parse a successful Yahoo JSON response into Bar[]. */
function parseYahooJson(json: unknown): Bar[] {
  // deno-lint-ignore no-explicit-any
  const data = json as any;
  const result = data?.chart?.result?.[0];
  if (!result) {
    const err = data?.chart?.error;
    if (err) throw new Error(`Yahoo error: ${err.code} — ${err.description}`);
    return [];
  }

  const timestamps: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote || timestamps.length === 0) return [];

  const opens: (number | null)[] = quote.open ?? [];
  const highs: (number | null)[] = quote.high ?? [];
  const lows: (number | null)[] = quote.low ?? [];
  const closes: (number | null)[] = quote.close ?? [];
  const volumes: (number | null)[] = quote.volume ?? [];

  const bars: Bar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const o = opens[i];
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    // Yahoo emits null for missing bars (holidays / pre-market gaps). Skip them.
    if (t == null || o == null || h == null || l == null || c == null) continue;
    bars.push({
      time: t,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: volumes[i] ?? undefined,
    });
  }
  return bars;
}

/**
 * Attempt a single fetch against one Yahoo base URL.
 * Returns { bars } on success.
 * Throws on non-retryable 4xx (fail fast — bad symbol, auth, etc.).
 * Returns { retryable: true, status } on transient failures so the
 * caller can back off and retry or switch hosts.
 */
async function tryYahooFetch(
  base: string,
  symbol: string,
  yahooInterval: string,
  from: number,
  to: number,
): Promise<{ bars: Bar[] } | { retryable: true; status: number; message: string }> {
  const url = new URL(`${base}/${encodeURIComponent(symbol)}`);
  url.searchParams.set('interval', yahooInterval);
  url.searchParams.set('period1', String(from));
  url.searchParams.set('period2', String(to));
  url.searchParams.set('includePrePost', 'false');

  let resp: Response;
  try {
    resp = await fetch(url.toString(), { headers: YAHOO_HEADERS });
  } catch (networkErr) {
    // Network-level failure (DNS, TCP reset, etc.) — always retryable.
    const message = networkErr instanceof Error ? networkErr.message : String(networkErr);
    return { retryable: true, status: 0, message: `network error: ${message}` };
  }

  if (!resp.ok) {
    if (RETRYABLE_STATUSES.has(resp.status)) {
      return { retryable: true, status: resp.status, message: `HTTP ${resp.status} ${resp.statusText}` };
    }
    // Non-retryable 4xx (e.g. 404 bad symbol, 400 bad params) — fail immediately.
    throw new Error(`Yahoo HTTP ${resp.status} ${resp.statusText}`);
  }

  const json = await resp.json();
  return { bars: parseYahooJson(json) };
}

async function fetchYahooBars(
  symbol: string,
  interval: string,
  from: number,
  to: number,
): Promise<Bar[]> {
  const yahooInterval = toYahooInterval(interval);

  // Strategy: up to 3 attempts on the primary host (YAHOO_HOSTS[0]) using
  // the fixed backoff schedule, then 1 final attempt on the fallback host
  // (YAHOO_HOSTS[1]) if all primary attempts fail with a retryable error.
  const MAX_ATTEMPTS = 3; // 1 initial + 2 retries on primary
  let lastMessage = '';

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(BACKOFF_MS[attempt - 1]);
    }

    const outcome = await tryYahooFetch(
      YAHOO_HOSTS[0],
      symbol,
      yahooInterval,
      from,
      to,
    );

    if ('bars' in outcome) return outcome.bars;

    // Retryable failure on primary.
    lastMessage = outcome.message;
    console.warn(
      `chart-bars: primary Yahoo attempt ${attempt + 1}/${MAX_ATTEMPTS} failed — ${lastMessage}`,
    );
  }

  // All primary attempts exhausted — try the fallback host once.
  console.warn('chart-bars: primary host exhausted, trying fallback host');
  const fallback = await tryYahooFetch(
    YAHOO_HOSTS[1],
    symbol,
    yahooInterval,
    from,
    to,
  );

  if ('bars' in fallback) return fallback.bars;

  // Both hosts failed.
  const totalAttempts = MAX_ATTEMPTS + 1;
  throw new Error(
    `Yahoo upstream failed after ${totalAttempts} attempts (last: ${fallback.message})`,
  );
}

// ═════════════════════════════════════════════════════════════
// Cache read
// ═════════════════════════════════════════════════════════════
async function readCache(
  symbol: string,
  interval: string,
  from: number,
  to: number,
): Promise<Bar[]> {
  const { data, error } = await supabaseAdmin
    .from('chart_bars_cache')
    .select('bar_time, open, high, low, close, volume')
    .eq('symbol', symbol)
    .eq('interval', interval)
    .gte('bar_time', from)
    .lte('bar_time', to)
    .order('bar_time', { ascending: true });

  if (error) throw new Error(`cache read failed: ${error.message}`);
  if (!data) return [];

  return data.map((r) => ({
    time: Number(r.bar_time),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: r.volume == null ? undefined : Number(r.volume),
  }));
}

// ═════════════════════════════════════════════════════════════
// Cache write (only complete bars)
// ═════════════════════════════════════════════════════════════
async function writeCache(
  symbol: string,
  interval: string,
  bars: Bar[],
): Promise<number> {
  if (bars.length === 0) return 0;
  const intervalSec = INTERVAL_SECONDS[interval];
  const nowSec = Math.floor(Date.now() / 1000);
  // Only persist bars whose interval has fully closed.
  const cacheable = bars.filter((b) => b.time + intervalSec <= nowSec);
  if (cacheable.length === 0) return 0;

  const rows = cacheable.map((b) => ({
    symbol,
    interval,
    bar_time: b.time,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume ?? null,
    source: 'yahoo',
  }));

  // UPSERT semantics: historical bars are immutable so duplicate key = no-op.
  // Supabase JS client uses ON CONFLICT DO NOTHING via { ignoreDuplicates: true }.
  const { error } = await supabaseAdmin
    .from('chart_bars_cache')
    .upsert(rows, { onConflict: 'symbol,interval,bar_time', ignoreDuplicates: true });

  if (error) {
    // Don't fail the whole request on a cache-write failure — log and continue.
    console.warn('chart_bars_cache write failed:', error.message);
    return 0;
  }
  return cacheable.length;
}

// ═════════════════════════════════════════════════════════════
// Merge cached + fresh (dedupe by time, sort ascending)
// ═════════════════════════════════════════════════════════════
function mergeBars(cached: Bar[], fresh: Bar[]): Bar[] {
  const map = new Map<number, Bar>();
  // Order matters: fresh bars from Yahoo override any cached duplicate
  // (relevant for the currently-forming bar boundary).
  for (const b of cached) map.set(b.time, b);
  for (const b of fresh) map.set(b.time, b);
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

// ═════════════════════════════════════════════════════════════
// Request parser — supports GET (query string) and POST (JSON body)
// ═════════════════════════════════════════════════════════════
async function parseRequest(req: Request): Promise<ChartBarsRequest> {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    return {
      symbol: url.searchParams.get('symbol') ?? '',
      interval: url.searchParams.get('interval') ?? '',
      from: Number(url.searchParams.get('from')),
      to: Number(url.searchParams.get('to')),
    };
  }
  return await req.json();
}

// ═════════════════════════════════════════════════════════════
// HTTP handler
// ═════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'GET or POST only' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: ChartBarsRequest;
  try {
    body = await parseRequest(req);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const symbol = (body.symbol ?? '').trim();
  const interval = (body.interval ?? '').trim();
  const from = Number(body.from);
  const to = Number(body.to);

  if (!symbol || !interval || !Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    return new Response(
      JSON.stringify({ error: 'symbol, interval, from, to (unix sec, to>from) required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (!(interval in INTERVAL_SECONDS)) {
    return new Response(JSON.stringify({ error: `unknown interval "${interval}"` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const intervalSec = INTERVAL_SECONDS[interval];
  const nowSec = Math.floor(Date.now() / 1000);
  // Boundary between "complete bar" (cacheable) and "currently forming" (always fresh)
  const completeBoundary = nowSec - intervalSec;

  try {
    // 1. Read cache for the requested range
    const cached = await readCache(symbol, interval, from, to);

    // 2. Decide what (if anything) to fetch from Yahoo
    let fetchFrom = from;
    let needsFetch = false;

    if (cached.length === 0) {
      // No cache at all → fetch the entire window
      needsFetch = true;
      fetchFrom = from;
    } else {
      const lastCachedTime = cached[cached.length - 1].time;
      // Bars between last_cached and min(to, completeBoundary) are missing complete bars
      if (lastCachedTime + intervalSec <= Math.min(to, completeBoundary)) {
        needsFetch = true;
        fetchFrom = lastCachedTime + intervalSec;
      }
      // Currently-forming bar (right edge) always fetched fresh
      if (to > completeBoundary) {
        needsFetch = true;
        if (!fetchFrom || fetchFrom > completeBoundary) {
          fetchFrom = Math.max(completeBoundary, from);
        }
      }
    }

    // 3. Fetch + cache
    let fresh: Bar[] = [];
    let writtenCount = 0;
    if (needsFetch) {
      fresh = await fetchYahooBars(symbol, interval, fetchFrom, to);
      writtenCount = await writeCache(symbol, interval, fresh);
    }

    // 4. Merge + respond
    const bars = mergeBars(cached, fresh);

    // Determine whether the response window is fully historical (no forming bar).
    // If `to` is at or before the completeBoundary, every bar in the response has
    // permanently closed and the data is immutable — safe for long CDN caching.
    const fullyHistorical = to <= completeBoundary;
    const cacheControl = fullyHistorical
      ? 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800, immutable'
      : 'public, max-age=5, s-maxage=10, stale-while-revalidate=60';

    return new Response(
      JSON.stringify({
        bars,
        meta: {
          cached_count: cached.length,
          fetched_count: fresh.length,
          written_to_cache: writtenCount,
          source: 'yahoo',
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': cacheControl,
          'Vary': 'Accept-Encoding',
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('chart-bars failure:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
