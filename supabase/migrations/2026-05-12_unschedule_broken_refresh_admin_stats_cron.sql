-- 2026-05-12: Unschedule cron job 1 (refresh-admin-stats).
--
-- WHY: admin_stats_view is a regular VIEW, not a MATERIALIZED VIEW. The cron
-- command `REFRESH MATERIALIZED VIEW CONCURRENTLY admin_stats_view` has been
-- failing every 5 minutes for an unknown duration with:
--   ERROR: "admin_stats_view" is not a table or materialized view
--
-- The view itself remains usable as a regular view (computed on demand at
-- query time). No data is lost; no downstream consumer breaks. Only the
-- broken refresh schedule is removed.
--
-- Discovered during 2026-05-12 cron-health flap investigation. Pre-existing
-- failure surfaced; NOT caused by today's edge-function changes (Lesson 9).
--
-- Rollback: SELECT cron.schedule('refresh-admin-stats', '*/5 * * * *',
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY admin_stats_view');
-- (but this will fail again unless admin_stats_view is converted to a
-- materialized view first — separate decision.)

SELECT cron.unschedule(1);
