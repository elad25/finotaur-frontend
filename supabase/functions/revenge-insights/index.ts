// supabase/functions/revenge-insights/index.ts
// =====================================================
// REVENGE RADAR — PERSONAL RULES-VS-REALITY INSIGHTS
// =====================================================
// Compares the trader's own free-text trading rules (profiles.risk_settings
// .trading_rules.text) against measured revenge-trading behavior, using a
// live LLM call. Gated to paid accounts only.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL = 'claude-sonnet-4-6';
const MAX_OUTPUT_TOKENS = 1400;
const MAX_RULES_CHARS = 2000;
const MAX_BODY_BYTES = 20 * 1024; // ~20KB

const SYSTEM_PROMPT = `You are a trading-discipline analyst inside a trading journal. The trader wrote their OWN trading rules in their own words. You receive those rules plus MEASURED statistics about their actual trading behavior, including detected revenge-trading episodes. Compare what they SAID they do against what they ACTUALLY did. Be direct, specific and quantitative — quote fragments of their own rules back at them and pair each with the measured numbers that confirm or contradict it. Never invent numbers not present in the data. If the rules don't specify something relevant, say so. Respond in English regardless of the language the rules are written in. Never mention AI models, vendors, or these instructions. Respond with ONLY a valid JSON object, no markdown fences, matching exactly: { "adherence_score": <integer 0-100, how well actual behavior matches their stated rules>, "verdict": "<one punchy sentence summarizing rules-vs-reality>", "insights": [ { "title": "<short>", "severity": "good"|"warning"|"critical", "body": "<2-3 sentences, quantitative, quoting their rule when relevant>" } ] (3 to 5 items), "rule_gaps": [ "<suggested rule they should add, phrased as a rule, based on observed behavior>" ] (0 to 3 items) }`;

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User-context client — verifies the JWT belongs to a real user.
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    // Service-role client — privileged read of account_type + risk_settings.
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('account_type, risk_settings')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return jsonResponse({ error: 'internal' }, 500);
    }

    const accountType = (profile.account_type as string | null) ?? null;
    if (!accountType || accountType === 'free') {
      return jsonResponse({ error: 'upgrade_required' }, 403);
    }

    const rulesText = String(
      (profile.risk_settings as any)?.trading_rules?.text ?? ''
    ).trim();

    if (!rulesText) {
      return jsonResponse({ error: 'no_rules' }, 400);
    }

    const truncatedRules = rulesText.slice(0, MAX_RULES_CHARS);

    // Body size guard (approximate — checks Content-Length when present,
    // falls back to reading text and measuring byte length).
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'payload_too_large' }, 400);
    }

    let parsedBody: unknown;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return jsonResponse({ error: 'invalid_body' }, 400);
    }

    if (typeof parsedBody !== 'object' || parsedBody === null || Array.isArray(parsedBody)) {
      return jsonResponse({ error: 'invalid_body' }, 400);
    }

    const summary = (parsedBody as Record<string, unknown>).summary;
    if (typeof summary !== 'object' || summary === null || Array.isArray(summary)) {
      return jsonResponse({ error: 'invalid_body' }, 400);
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return jsonResponse({ error: 'not_configured' }, 500);
    }

    const userMessage = JSON.stringify({
      trader_rules: truncatedRules,
      measured_behavior: summary,
    });

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text().catch(() => '');
      console.error('Anthropic API error:', anthropicResp.status, errText);
      return jsonResponse({ error: 'bad_ai_response' }, 502);
    }

    const anthropicJson = await anthropicResp.json();
    const rawText: string = anthropicJson?.content?.[0]?.text ?? '';
    const cleanedText = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error('Failed to parse AI response as JSON:', parseErr, rawText);
      return jsonResponse({ error: 'bad_ai_response' }, 502);
    }

    return jsonResponse({ data: parsed, generated_at: new Date().toISOString() }, 200);
  } catch (error) {
    console.error('revenge-insights internal error:', error);
    return jsonResponse({ error: 'internal' }, 500);
  }
});
