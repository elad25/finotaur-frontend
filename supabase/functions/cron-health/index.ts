// supabase/functions/cron-health/index.ts
//
// Public health endpoint. Returns:
//   200 OK  — all known jobs have heartbeat within 10 minutes
//   503     — one or more jobs are stale (>10 min since last_run_at)
//
// Used by external uptime monitor (UptimeRobot, BetterStack, etc.).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

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
    return {
      job_name: hb.job_name,
      last_run_at: hb.last_run_at,
      last_status: hb.last_status,
      age_ms: ageMs,
      stale: ageMs > STALE_THRESHOLD_MS,
    };
  });

  const anyStale = jobs.some(j => j.stale);
  const anyFailed = jobs.some(j => j.last_status === 'failed');
  const expectedJobs = ['tradovate-sync', 'tradovate-token-refresh'];
  const missingJobs = expectedJobs.filter(name => !jobs.some(j => j.job_name === name));
  const ok = !anyStale && !anyFailed && missingJobs.length === 0;

  return new Response(JSON.stringify({ ok, jobs, missingJobs, threshold_ms: STALE_THRESHOLD_MS }), {
    status: ok ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
