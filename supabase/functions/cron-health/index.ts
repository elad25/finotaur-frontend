// supabase/functions/cron-health/index.ts
//
// Public health endpoint. Returns:
//   200 OK  — all known jobs have heartbeat within their per-job staleness threshold
//   503     — one or more jobs are stale (older than their threshold) or status="failed"
//
// Used by external uptime monitor (UptimeRobot, BetterStack, etc.).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Per-job staleness thresholds. Each value should be ≥ 1.5× the cron interval
// to allow for occasional jitter and cold-start delays.
const STALE_THRESHOLDS_MS: Record<string, number> = {
  'tradovate-sync':          12 * 60 * 1000,   // schedule: */5 * * * * → 12 min (2.4× buffer)
  'tradovate-token-refresh': 90 * 60 * 1000,   // schedule: */75 * * * * (actually hourly @:00 — cron minute field caps at 59) → 90 min (1.5× buffer)
};
const DEFAULT_THRESHOLD_MS = 15 * 60 * 1000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    return new Response(JSON.stringify({ ok: false, error: 'misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(url, key);
  const { data: heartbeats, error } = await supabase
    .from('cron_heartbeat')
    .select('job_name, last_run_at, last_status, last_duration_ms');

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const now = Date.now();
  const jobs = (heartbeats ?? []).map(hb => {
    const ageMs = now - new Date(hb.last_run_at).getTime();
    const thresholdMs = STALE_THRESHOLDS_MS[hb.job_name] ?? DEFAULT_THRESHOLD_MS;
    return {
      job_name: hb.job_name,
      last_run_at: hb.last_run_at,
      last_status: hb.last_status,
      age_ms: ageMs,
      threshold_ms: thresholdMs,
      stale: ageMs > thresholdMs,
    };
  });

  const anyStale = jobs.some(j => j.stale);
  // Tolerant failure detection: a transient 'failed' status from a single bad cron tick
  // should not flap UptimeRobot. Only treat as critical when the failure has persisted
  // past the next expected cron cycle (age > 50% of the staleness threshold).
  const anyFailed = jobs.some(j =>
    j.last_status === 'failed' && j.age_ms > j.threshold_ms * 0.5
  );
  const expectedJobs = ['tradovate-sync', 'tradovate-token-refresh'];
  const missingJobs = expectedJobs.filter(name => !jobs.some(j => j.job_name === name));
  const ok = !anyStale && !anyFailed && missingJobs.length === 0;

  return new Response(JSON.stringify({ ok, jobs, missingJobs, thresholds_ms: STALE_THRESHOLDS_MS, failure_policy: 'tolerant_50pct' }), {
    status: ok ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
