# Tier 1 Hand-off — Tradovate Cron Vault Wiring

**Audience:** Elad (manual run via Supabase Studio SQL Editor)
**Date created:** 2026-05-07
**Why hand-off, not auto:** Per LESSONS_LEARNED.md Lesson 8 — Vault secret creation and `cron.alter_job` calls are outside the MCP `apply_migration` scope. Direct UPDATE to `cron.job` is blocked by `42501: permission denied`. This file gives you ready-to-paste SQL with expected results so you can run + verify, then I continue.

**Why now:** OQ-10 (deferred since 2026-05-04) is now blocking. Token expired within 24h — confirmed Tradovate refresh-cron has been silently failing.

---

## Step 1 — Verify Vault contents (read-only)

Open **Supabase Studio → SQL Editor** for project `xsgbtptkueabylkxibly`. Run:

```sql
SELECT name, created_at
FROM vault.secrets
WHERE name IN ('supabase_url', 'service_role_key')
ORDER BY name;
```

**Expected outcome — one of these two:**

- **(A) 0 rows** → secrets do not exist yet. Go to **Step 2A**.
- **(B) 2 rows** (one for each name) → secrets exist. Skip to **Step 3**.

If you see only 1 of the 2 → tell me, we'll create the missing one only.

---

## Step 2A — Create the Vault secrets (only if Step 1 returned 0 rows)

⚠️ **DO NOT paste the service-role key into chat.** Get it from Supabase Dashboard → Project Settings → API → `service_role` key (secret). Copy and use directly in the SQL block below.

```sql
SELECT vault.create_secret(
  'https://xsgbtptkueabylkxibly.supabase.co',
  'supabase_url'
);

-- Replace <PASTE_SERVICE_ROLE_KEY_HERE> with the actual key from Dashboard.
-- Run this line separately so the key never lives in your shell history.
SELECT vault.create_secret(
  '<PASTE_SERVICE_ROLE_KEY_HERE>',
  'service_role_key'
);
```

**Verification:**

```sql
SELECT name, length(decrypted_secret) AS secret_length, created_at
FROM vault.decrypted_secrets
WHERE name IN ('supabase_url', 'service_role_key');
```

**Expected:** 2 rows. `supabase_url` length should be ~40 chars. `service_role_key` length should be ~200+ chars (JWT format).

---

## Step 3 — Update cron job 1374 (tradovate-auto-sync)

```sql
SELECT cron.alter_job(
  job_id => 1374,
  command => $cron$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/tradovate-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{"mode":"cron"}'::jsonb
    );
  $cron$
);
```

**Expected:** `cron.alter_job` returns void. No error.

---

## Step 4 — Update cron job 1373 (tradovate-token-refresh)

```sql
SELECT cron.alter_job(
  job_id => 1373,
  command => $cron$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/tradovate-auth',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{"mode":"refresh"}'::jsonb
    );
  $cron$
);
```

**Expected:** void. No error.

---

## Step 5 — Verify the new commands are stored

```sql
SELECT jobid, jobname, schedule, active, command
FROM cron.job
WHERE jobid IN (1373, 1374)
ORDER BY jobid;
```

**Expected:** both rows have `active = true`. The `command` field for each should reference `vault.decrypted_secrets`, not `current_setting('app.supabase_url')`.

---

## Step 6 — Trigger one manual run of 1374 (sync) to verify end-to-end

```sql
-- Run the cron job's command body directly, outside the schedule:
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/tradovate-sync',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
  ),
  body := '{"mode":"cron"}'::jsonb
);
```

**Expected:** returns a `request_id` (numeric) immediately. The HTTP POST runs async via pg_net.

Wait ~5 seconds, then:

```sql
SELECT id, status_code, content::text, error_msg
FROM net._http_response
ORDER BY id DESC
LIMIT 3;
```

**Expected:** `status_code = 200`. `content` should look like `{"synced":<N>,"totalInserted":<M>,"totalErrors":0,...}`. If `totalErrors > 0` — tell me, that's a different bug (likely auth-flow level, not cron).

---

## Step 7 — Wait for the next scheduled tick + verify cron.job_run_details

The next tick of 1374 fires at `MM:00`, `MM:05`, ... — wait until one passes. Then:

```sql
SELECT jobid, runid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid IN (1373, 1374)
ORDER BY start_time DESC
LIMIT 10;
```

**Expected:** the last row for jobid 1374 has `status = 'succeeded'`. No more `unrecognized configuration parameter` errors.

For 1373 (75-min cadence) you may need to wait longer — same expectation.

---

## What "good" looks like end-to-end

1. `cron.job_run_details` for 1373 + 1374: only `succeeded` rows from this point forward.
2. `broker_connections.token_expires_at` for any active Tradovate connection: refreshes every ~75 min automatically (visible by querying the row before/after).
3. New trades in Tradovate appear in `trades` table within 5 min — without you clicking "Sync Now".

When all 7 steps pass, ping me and I'll continue with Tier 2/3/4 (frontend resilience layers).

---

## Rollback (if anything goes wrong)

If Step 6 returns an unexpected error (not 200), you can revert each cron job to its pre-change state — the previous command was the broken one anyway, so a "rollback" doesn't restore working state, it just stops running. To pause:

```sql
SELECT cron.alter_job(job_id => 1374, active := false);
SELECT cron.alter_job(job_id => 1373, active := false);
```

This is safe — it just stops new ticks. No data is lost. Re-enable with `active := true` once we resolve the underlying issue.
