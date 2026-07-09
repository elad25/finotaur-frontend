-- ============================================
-- MEMBER REFERRAL PHASE 0 — CONFIG ALIGNMENT
-- ============================================
-- Purpose: align affiliate_config with the current $89/$890 flat-20%
--          commission structure, and stage the (disabled) member_referral
--          config key for the upcoming member-refers-friend program.
-- Date: 2026-07-09
--
-- 🔴 KILL-SWITCH: member_referral.enabled = false. The member-refers-friend
-- feature reads this flag before doing anything; flipping it to true is the
-- single activation step once the frontend/webhook logic ships. Nothing in
-- this migration turns the feature on.
--
-- Data-only migration — NO schema changes. All statements are idempotent
-- (safe to re-run).
-- ============================================

-- 1) Commission rates — flat 20% across all tiers (was tiered 10/15/20).
--    Tier boundaries (min_clients/max_clients) unchanged.
UPDATE affiliate_config
SET config_value = '{
  "tier_1": {"rate": 0.20, "min_clients": 0, "max_clients": 20},
  "tier_2": {"rate": 0.20, "min_clients": 20, "max_clients": 75},
  "tier_3": {"rate": 0.20, "min_clients": 75, "max_clients": null}
}'::JSONB,
    updated_at = NOW()
WHERE config_key = 'commission_rates';

-- 2) Annual commission rate — flat 20% (was 10-15% depending on prior state).
UPDATE affiliate_config
SET config_value = '{"rate": 0.20}'::JSONB,
    updated_at = NOW()
WHERE config_key = 'annual_commission_rate';

-- 3) Verification period — 7 days (was 21).
UPDATE affiliate_config
SET config_value = '{"days": 7}'::JSONB,
    updated_at = NOW()
WHERE config_key = 'verification_period_days';

-- 4) Default plan prices — fallback prices ONLY (Finotaur tier), used when
--    the webhook payload lacks an amount. Real pricing is $89/mo, $890/yr
--    (see finotaur MASTER_PLAN pricing decisions, 2026-07-05). No lifetime
--    plan currently sold — set to null rather than a stale $999.99.
UPDATE affiliate_config
SET config_value = '{
  "monthly": 89.00,
  "yearly": 890.00,
  "lifetime": null
}'::JSONB,
    updated_at = NOW()
WHERE config_key = 'default_plan_prices';

-- 5) member_referral — new config key, Phase 0 scaffold. enabled=false is
--    the kill-switch (see header). Insert-or-update so this migration is
--    safe to re-run and safe to run whether or not the key already exists.
INSERT INTO affiliate_config (config_key, config_value, description)
VALUES (
  'member_referral',
  '{
    "enabled": false,
    "friend_discount_percent": 20,
    "commission_rate": 0.20,
    "duration_months": 12
  }'::JSONB,
  'Member-refers-friend program config (Phase 0 scaffold) — disabled until frontend/webhook logic ships'
)
ON CONFLICT (config_key) DO UPDATE
SET config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    updated_at = NOW();
