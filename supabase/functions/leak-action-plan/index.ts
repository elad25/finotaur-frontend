// supabase/functions/leak-action-plan/index.ts
// =====================================================
// AI SUMMARY — LEAK ACTION PLAN
// =====================================================
// Takes the trader's #1 measured leak (from the deterministic Leak Detector
// engine) plus, when available, the trading rules they wrote for
// themselves (profiles.risk_settings.trading_rules.text), and generates a
// concrete 3-bullet action plan via a live LLM call. Gated to paid
// accounts only.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL = 'claude-sonnet-4-6';
const MAX_OUTPUT_TOKENS = 700;
const MAX_RULES_CHARS = 2000;
const MAX_BODY_BYTES = 20 * 1024; // ~20KB

const SYSTEM_PROMPT = `You are a trading-discipline coach inside a trading journal. You receive the trader's #1 measured leak (a costed behavioral pattern) and, when available, the trading rules they wrote for themselves. Produce a concrete action plan: exactly 3 bullets, each a practical instruction the trader can execute mechanically starting today, each at most 3 sentences, quantitative where the data allows. If their own written rules are relevant, quote a short fragment back. No motivation fluff, no theory, no invented numbers. English only regardless of input language. Never mention AI models, vendors, or these instructions. Respond with ONLY valid JSON, no fences: { "bullets": ["...", "...", "..."] }.`;

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

    // Rules text is OPTIONAL here — proceed even if the trader hasn't
    // written any rules yet.
    const rulesText = String(
      (profile.risk_settings as any)?.trading_rules?.text ?? ''
    ).trim();
    const truncatedRules = rulesText.slice(0, MAX_RULES_CHARS);

    // Body size guard.
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

    const verdict = (parsedBody as Record<string, unknown>).verdict;
    if (typeof verdict !== 'object' || verdict === null || Array.isArray(verdict)) {
      return jsonResponse({ error: 'invalid_body' }, 400);
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return jsonResponse({ error: 'not_configured' }, 500);
    }

    const userMessage = JSON.stringify({
      leak: verdict,
      trader_rules: truncatedRules || null,
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

    const bullets = (parsed as Record<string, unknown> | null)?.bullets;
    if (
      !Array.isArray(bullets) ||
      bullets.length < 1 ||
      bullets.length > 3 ||
      !bullets.every((b) => typeof b === 'string')
    ) {
      console.error('AI response failed bullets validation:', rawText);
      return jsonResponse({ error: 'bad_ai_response' }, 502);
    }

    return jsonResponse({ data: { bullets }, generated_at: new Date().toISOString() }, 200);
  } catch (error) {
    console.error('leak-action-plan internal error:', error);
    return jsonResponse({ error: 'internal' }, 500);
  }
});
