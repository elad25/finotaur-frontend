// supabase/functions/journal-ai-recap/index.ts
// STATUS: ACTIVE — real LLM integration via claude-haiku-4-5-20251001.
// Cost-safety: per-user $1/day cap + global $20/day cap + 24h server-side cache.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.32.1';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_USD_CAP = 1.0;         // per-user hard cap, USD
const GLOBAL_DAILY_USD_CAP = 20.0; // across all users, USD
const CACHE_TTL_HOURS = 24;

// Haiku pricing per 1M tokens (as of claude-haiku-4-5)
const HAIKU_PRICE = { input: 1.0, output: 5.0 };

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_OUTPUT_TOKENS = 700;

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

    // User-context client (RLS-enforced reads on the user's own data)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Service-role client for cross-user reads and privileged writes
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
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

    const today = new Date().toISOString().slice(0, 10);

    // STEP 1: per-user daily cap
    // PK is (user_id, service, date) — a user may have multiple rows/day across services.
    // Sum all rows for this user today to get total daily spend.
    const { data: userUsageRows } = await supabase
      .from('ai_usage_daily')
      .select('cost_usd')
      .eq('user_id', user.id)
      .eq('date', today);

    const userDailySpend = (userUsageRows ?? []).reduce(
      (sum, row) => sum + (Number(row.cost_usd) || 0),
      0,
    );

    if (userDailySpend >= DAILY_USD_CAP) {
      return new Response(
        JSON.stringify({ error: 'daily_cap_exceeded', cap_usd: DAILY_USD_CAP }),
        { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // STEP 1b: global daily cap (all users combined)
    const { data: globalUsageRows } = await serviceClient
      .from('ai_usage_daily')
      .select('cost_usd')
      .eq('date', today);

    const globalDailySpend = (globalUsageRows ?? []).reduce(
      (sum, row) => sum + (Number(row.cost_usd) || 0),
      0,
    );

    if (globalDailySpend >= GLOBAL_DAILY_USD_CAP) {
      return new Response(
        JSON.stringify({ error: 'global_cap_exceeded', cap_usd: GLOBAL_DAILY_USD_CAP }),
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

    // STEP 3: generate

    // 3a. Fetch trades for the period (RLS-safe via user supabase client)
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('pnl,outcome,open_at,close_at,symbol,side,setup,mistake,entry_price,stop_price,exit_price')
      .eq('user_id', user.id)
      .gte('open_at', `${periodStart}T00:00:00Z`)
      .lte('open_at', `${periodEnd}T23:59:59Z`);

    if (tradesError) {
      return new Response(
        JSON.stringify({ error: 'internal', message: String(tradesError.message) }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const tradeList = trades ?? [];

    // 3b. Compute deterministic aggregates — never let the LLM invent numbers
    const tradeCount = tradeList.length;
    const winners = tradeList.filter((t) => (Number(t.pnl) || 0) > 0).length;
    const losers = tradeList.filter((t) => (Number(t.pnl) || 0) < 0).length;
    const decided = winners + losers;
    const winRatePct = decided > 0 ? (winners / decided) * 100 : 0;
    const netPnl = tradeList.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);

    // avgR: mean realized R = (exit - entry) / (entry - stop) per trade where stop != entry
    const rValues: number[] = tradeList
      .map((t) => {
        const entry = Number(t.entry_price);
        const stop = Number(t.stop_price);
        const exit = Number(t.exit_price);
        if (!entry || !stop || entry === stop) return null;
        return (exit - entry) / (entry - stop);
      })
      .filter((r): r is number => r !== null);
    const avgR = rValues.length > 0
      ? rValues.reduce((s, r) => s + r, 0) / rValues.length
      : null;

    // topSetup: most common non-empty setup value
    const setupFreq: Record<string, number> = {};
    for (const t of tradeList) {
      const s = (t.setup as string | null)?.trim();
      if (s) setupFreq[s] = (setupFreq[s] ?? 0) + 1;
    }
    const topSetup = Object.keys(setupFreq).sort((a, b) => setupFreq[b] - setupFreq[a])[0] ?? null;

    // topMistake: most common non-empty mistake value
    const mistakeFreq: Record<string, number> = {};
    for (const t of tradeList) {
      const m = (t.mistake as string | null)?.trim();
      if (m) mistakeFreq[m] = (mistakeFreq[m] ?? 0) + 1;
    }
    const topMistake = Object.keys(mistakeFreq).sort((a, b) => mistakeFreq[b] - mistakeFreq[a])[0] ?? null;

    const keyMetrics = [
      { label: 'Trades', value: String(tradeCount) },
      { label: 'Win rate', value: `${winRatePct.toFixed(0)}%` },
      { label: 'Net P&L', value: formatUsd(netPnl) },
      { label: 'Avg R', value: avgR === null ? '—' : `${avgR >= 0 ? '+' : ''}${avgR.toFixed(2)}R` },
    ];

    const periodLabel =
      period === 'weekly' ? 'this week'
      : period === 'monthly' ? 'this month'
      : 'this quarter';

    // 3c. Empty-period guard — free path, no LLM call
    if (tradeCount === 0) {
      const recapData = {
        period,
        periodStart,
        periodEnd,
        generatedAt: new Date().toISOString(),
        tradeCount: 0,
        narrative: 'No trades recorded in this period.',
        keyMetrics,
        observations: ['Start placing trades to receive an AI-powered performance recap.'],
        isMock: false,
      };

      await serviceClient.from('journal_recaps_cache').upsert(
        {
          user_id: user.id,
          period,
          period_start: periodStart,
          period_end: periodEnd,
          payload: recapData,
          generated_at: recapData.generatedAt,
          trade_count_hash: '0:0.00',
        },
        { onConflict: 'user_id,period,period_start,period_end' },
      );

      return new Response(
        JSON.stringify({ source: 'live', ...recapData }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // 3d. LLM call (only when tradeCount > 0)
    let narrative: string;
    let observations: string[];
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

      const statsMessage = JSON.stringify({
        period: periodLabel,
        periodStart,
        periodEnd,
        tradeCount,
        winners,
        losers,
        winRatePct: Number(winRatePct.toFixed(1)),
        netPnl: Number(netPnl.toFixed(2)),
        avgR: avgR !== null ? Number(avgR.toFixed(2)) : null,
        topSetup: topSetup ?? 'N/A',
        topMistake: topMistake ?? 'N/A',
      });

      const resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.5,
        system:
          'You are a professional trading coach writing a brief performance recap. ' +
          'Write a 2-4 sentence "narrative" and 2-4 short "observations" based ONLY on the stats provided. ' +
          'Never invent numbers not given. Be direct and professional. Output in English only. ' +
          'Use the emit_recap tool to return your response.',
        messages: [
          {
            role: 'user',
            content: `Here are the trading stats for the period:\n${statsMessage}`,
          },
        ],
        tools: [
          {
            name: 'emit_recap',
            description: 'Return the trading period recap',
            input_schema: {
              type: 'object' as const,
              properties: {
                narrative: { type: 'string' },
                observations: { type: 'array', items: { type: 'string' } },
              },
              required: ['narrative', 'observations'],
            },
          },
        ],
        tool_choice: { type: 'tool' as const, name: 'emit_recap' },
      });

      inputTokens = resp.usage?.input_tokens ?? 0;
      outputTokens = resp.usage?.output_tokens ?? 0;

      // Find the tool_use block named emit_recap
      const toolBlock = resp.content.find(
        (block): block is Anthropic.ToolUseBlock =>
          block.type === 'tool_use' && block.name === 'emit_recap',
      );

      if (!toolBlock) throw new Error('emit_recap tool block missing from response');

      const input = toolBlock.input as { narrative?: unknown; observations?: unknown };
      if (typeof input.narrative !== 'string') throw new Error('narrative is not a string');
      if (!Array.isArray(input.observations)) throw new Error('observations is not an array');

      narrative = input.narrative;
      observations = (input.observations as unknown[]).map((o) => String(o));
    } catch (llmErr) {
      // LLM/network/parse failure — return 502 so the UI mock fallback triggers
      console.error('LLM generation failed:', llmErr);
      return new Response(
        JSON.stringify({ error: 'generation_failed' }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // 3e. Cost write-back via service_role
    const callCost =
      (inputTokens * HAIKU_PRICE.input + outputTokens * HAIKU_PRICE.output) / 1_000_000;

    const { data: existingUsage } = await serviceClient
      .from('ai_usage_daily')
      .select('count,tokens,cost_usd')
      .eq('user_id', user.id)
      .eq('service', 'journal_ai_recap')
      .eq('date', today)
      .maybeSingle();

    const prevCount = Number(existingUsage?.count) || 0;
    const prevTokens = Number(existingUsage?.tokens) || 0;
    const prevCost = Number(existingUsage?.cost_usd) || 0;

    await serviceClient.from('ai_usage_daily').upsert(
      {
        user_id: user.id,
        service: 'journal_ai_recap',
        date: today,
        count: prevCount + 1,
        tokens: prevTokens + inputTokens + outputTokens,
        cost_usd: prevCost + callCost,
      },
      { onConflict: 'user_id,service,date' },
    );

    // 3f. Assemble full RecapData and write to cache
    const recapData = {
      period,
      periodStart,
      periodEnd,
      generatedAt: new Date().toISOString(),
      tradeCount,
      narrative,
      keyMetrics,
      observations,
      isMock: false,
    };

    const tradeCountHash = `${tradeCount}:${netPnl.toFixed(2)}`;

    await serviceClient.from('journal_recaps_cache').upsert(
      {
        user_id: user.id,
        period,
        period_start: periodStart,
        period_end: periodEnd,
        payload: recapData,
        generated_at: recapData.generatedAt,
        trade_count_hash: tradeCountHash,
      },
      { onConflict: 'user_id,period,period_start,period_end' },
    );

    return new Response(
      JSON.stringify({ source: 'live', ...recapData }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'internal', message: String(e) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});

function formatUsd(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs >= 1000
    ? `$${(abs / 1000).toFixed(1)}k`
    : `$${abs.toFixed(0)}`;
  return amount < 0 ? `-${formatted}` : formatted;
}

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
