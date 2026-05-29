// supabase/functions/journal-ai-recap/index.ts
// STATUS: SKELETON — NOT DEPLOYED.
// Implements cost-gate skeleton and 24h cache lookup. Real LLM call deferred.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_USD_CAP = 1.0;      // per-user hard cap, USD
const CACHE_TTL_HOURS = 24;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'unauthorized' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'unauthorized' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const period = body.period as 'weekly' | 'monthly' | 'quarterly';
    if (!['weekly', 'monthly', 'quarterly'].includes(period)) {
      return new Response(
        JSON.stringify({ error: 'invalid period' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // STEP 1: hard cost cap from ai_usage_daily
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await supabase
      .from('ai_usage_daily')
      .select('cost_usd')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .maybeSingle();

    if (usage && (usage.cost_usd ?? 0) >= DAILY_USD_CAP) {
      return new Response(
        JSON.stringify({ error: 'daily_cap_exceeded', cap_usd: DAILY_USD_CAP }),
        { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // STEP 2: cache lookup
    const { periodStart, periodEnd } = computeRange(period, new Date());
    const { data: cached } = await supabase
      .from('journal_recaps_cache')
      .select('*')
      .eq('user_id', user.id)
      .eq('period', period)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .maybeSingle();

    if (cached && isFresh(cached.generated_at, CACHE_TTL_HOURS)) {
      return new Response(
        JSON.stringify({ source: 'cache', ...cached.payload }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // STEP 3: generate (DEFERRED — currently returns 501)
    return new Response(
      JSON.stringify({
        error: 'not_implemented',
        message: 'LLM integration deferred. UI must fall back to mock.',
      }),
      { status: 501, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'internal', message: String(e) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});

function computeRange(
  period: 'weekly' | 'monthly' | 'quarterly',
  now: Date,
): { periodStart: string; periodEnd: string } {
  const d = new Date(now);
  if (period === 'weekly') {
    const day = d.getUTCDay();
    const offsetToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offsetToMon));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return { periodStart: iso(monday), periodEnd: iso(sunday) };
  }
  if (period === 'monthly') {
    const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    return { periodStart: iso(first), periodEnd: iso(last) };
  }
  // quarterly
  const q = Math.floor(d.getUTCMonth() / 3);
  const first = new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1));
  const last = new Date(Date.UTC(d.getUTCFullYear(), q * 3 + 3, 0));
  return { periodStart: iso(first), periodEnd: iso(last) };
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isFresh(generatedAt: string, ttlHours: number): boolean {
  const ageMs = Date.now() - new Date(generatedAt).getTime();
  return ageMs < ttlHours * 60 * 60 * 1000;
}
