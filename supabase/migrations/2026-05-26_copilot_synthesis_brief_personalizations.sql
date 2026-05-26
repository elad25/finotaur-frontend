-- Per-user lazy personalization of weekly synthesis brief
-- 24h TTL, invalidated when broker_connections row changes

CREATE TABLE IF NOT EXISTS copilot_synthesis_brief_personalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brief_id uuid NOT NULL REFERENCES copilot_synthesis_briefs(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  personal_commentary text,
  ranked_trade_ideas jsonb DEFAULT '[]'::jsonb,
  inputs_snapshot jsonb DEFAULT '{}'::jsonb,
  cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  model text,
  degenerate boolean NOT NULL DEFAULT false,
  UNIQUE(user_id, brief_id)
);

CREATE INDEX IF NOT EXISTS idx_copilot_personalizations_user_brief
  ON copilot_synthesis_brief_personalizations (user_id, brief_id);
CREATE INDEX IF NOT EXISTS idx_copilot_personalizations_expires
  ON copilot_synthesis_brief_personalizations (expires_at);

COMMENT ON TABLE copilot_synthesis_brief_personalizations IS
  'Per-user lazy personalization of weekly synthesis brief. 24h TTL. Invalidated on broker_connections change.';

-- Auto-invalidation trigger: when broker_connections changes, drop the user's personalizations
CREATE OR REPLACE FUNCTION invalidate_copilot_personalizations_on_broker_change()
RETURNS trigger AS $$
BEGIN
  DELETE FROM copilot_synthesis_brief_personalizations
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invalidate_copilot_personalizations ON broker_connections;
CREATE TRIGGER trg_invalidate_copilot_personalizations
AFTER INSERT OR UPDATE OR DELETE ON broker_connections
FOR EACH ROW EXECUTE FUNCTION invalidate_copilot_personalizations_on_broker_change();
