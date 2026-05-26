-- RLS for copilot_synthesis_briefs (global, all authenticated users can read live)
ALTER TABLE copilot_synthesis_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read live briefs" ON copilot_synthesis_briefs;
CREATE POLICY "Authenticated users read live briefs"
  ON copilot_synthesis_briefs FOR SELECT
  TO authenticated
  USING (visibility = 'live');

DROP POLICY IF EXISTS "Service role full access briefs" ON copilot_synthesis_briefs;
CREATE POLICY "Service role full access briefs"
  ON copilot_synthesis_briefs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS for personalizations (user can only see their own row)
ALTER TABLE copilot_synthesis_brief_personalizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own personalization" ON copilot_synthesis_brief_personalizations;
CREATE POLICY "Users read own personalization"
  ON copilot_synthesis_brief_personalizations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access personalizations" ON copilot_synthesis_brief_personalizations;
CREATE POLICY "Service role full access personalizations"
  ON copilot_synthesis_brief_personalizations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
