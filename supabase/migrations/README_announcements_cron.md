# Admin Announcements — pg_cron Wiring (manual step)

This is documentation only. **Do not run this automatically.** Elad applies
it manually, in this order, after the rest of the admin-announcements
backend has been reviewed and deployed:

1. Deploy the edge function: `supabase functions deploy dispatch-scheduled-announcements --no-verify-jwt`
2. Set the `CRON_SECRET` edge-function secret (same secret used by
   `newsletter-cron`, or a dedicated one — Elad's call). The exact secret
   wiring/storage (Supabase secrets vs. `app.cron_secret` Postgres setting)
   is left to Elad to finalize; the SQL below assumes
   `current_setting('app.cron_secret', true)` is populated, matching the
   pattern already used elsewhere in this project.
3. Apply the migration in this directory
   (`20260712120000_admin_announcements.sql`).
4. Only then run the `cron.schedule(...)` call below against the production
   database (Supabase SQL editor or `supabase db push` with a follow-up
   migration — Elad's choice).

```sql
select cron.schedule('dispatch-scheduled-announcements','* * * * *', $$
  select net.http_post(
    url := 'https://xsgbtptkueabylkxibly.supabase.co/functions/v1/dispatch-scheduled-announcements?secret=' || current_setting('app.cron_secret', true),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
$$);
```

Notes:
- Project ref `xsgbtptkueabylkxibly` is verified correct (production
  finotaur-frontend Supabase project).
- The cron job fires every minute; `dispatch-scheduled-announcements`
  only does work when there is at least one `update_center_notifications`
  row with `status = 'scheduled'` and `scheduled_at <= now()`, so idle
  ticks are cheap (one SELECT, no rows).
- To unschedule later: `select cron.unschedule('dispatch-scheduled-announcements');`
