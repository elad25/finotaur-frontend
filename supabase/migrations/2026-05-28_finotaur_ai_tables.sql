-- ============================================
-- FINOTAUR AI Tables
-- ============================================
-- Core persistence layer for the FINOTAUR AI (Journal Coach) feature:
-- briefings, conversations, messages, tool-call previews, and user feedback.
--
-- Used by: finotaur-server/src/routes/journal-ai/* (all AI coach endpoints)
-- Read by: finotaur-frontend/src/components/journal/ai/* (chat UI, briefing panel)
-- ============================================

-- ============================================
-- Table: journal_ai_briefings
-- One row per user (upsert pattern). Cached Sonnet output.
-- ============================================
CREATE TABLE IF NOT EXISTS journal_ai_briefings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- When this briefing was generated (used for staleness checks)
  generated_at          timestamptz NOT NULL DEFAULT now(),

  -- Model that produced this briefing (e.g. 'claude-sonnet-4-20250514')
  model                 text NOT NULL,

  -- Cost of the Sonnet call that produced this briefing
  cost_usd              numeric(10, 6) NOT NULL DEFAULT 0,

  -- SHA-256 of the trades snapshot used as input — used to detect if a
  -- re-generate is needed when trades change
  trades_snapshot_hash  text NOT NULL,

  -- Array of AI-generated insight objects [ { key, title, body, importance } ]
  insights              jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Array of AI-generated recommendation objects [ { key, title, body, priority } ]
  recommendations       jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Full raw Anthropic response body (nullable — for debugging / replay)
  raw_payload           jsonb,

  -- Enforce one active briefing row per user (upsert on conflict user_id)
  UNIQUE (user_id)
);

-- Primary access pattern: load current briefing for a user
CREATE INDEX IF NOT EXISTS idx_journal_ai_briefings_user_gen
  ON journal_ai_briefings (user_id, generated_at DESC);

ALTER TABLE journal_ai_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "briefings_select_own" ON journal_ai_briefings;
CREATE POLICY "briefings_select_own" ON journal_ai_briefings
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "briefings_insert_own" ON journal_ai_briefings;
CREATE POLICY "briefings_insert_own" ON journal_ai_briefings
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "briefings_update_own" ON journal_ai_briefings;
CREATE POLICY "briefings_update_own" ON journal_ai_briefings
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "briefings_delete_own" ON journal_ai_briefings;
CREATE POLICY "briefings_delete_own" ON journal_ai_briefings
  FOR DELETE USING (user_id = auth.uid());

COMMENT ON TABLE  journal_ai_briefings IS 'Cached AI briefing per user — Sonnet output, refreshed via nightly cron or sync /briefing/refresh endpoint.';
COMMENT ON COLUMN journal_ai_briefings.trades_snapshot_hash IS 'SHA-256 of the trades data used as LLM input; compare against current hash to decide if re-generation is needed';
COMMENT ON COLUMN journal_ai_briefings.insights IS 'Array of AI insight objects: [ { key, title, body, importance } ]';
COMMENT ON COLUMN journal_ai_briefings.recommendations IS 'Array of AI recommendation objects: [ { key, title, body, priority } ]';
COMMENT ON COLUMN journal_ai_briefings.raw_payload IS 'Full Anthropic response body; nullable — only stored when debug mode is on or for replay purposes';

-- ============================================
-- Table: journal_ai_conversations
-- One conversation = one chat thread in the Journal Coach UI.
-- ============================================
CREATE TABLE IF NOT EXISTS journal_ai_conversations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Optional user-editable title; NULL until the user renames or an
  -- auto-title is generated from the first message
  title        text,

  created_at   timestamptz NOT NULL DEFAULT now(),

  -- Bumped on every new message — drives "recent conversations" sort order
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- Soft-delete; NULL = active, non-NULL = archived
  archived_at  timestamptz
);

-- Primary access pattern: list active conversations for a user, most-recent first
CREATE INDEX IF NOT EXISTS idx_journal_ai_convos_user_active
  ON journal_ai_conversations (user_id, updated_at DESC)
  WHERE archived_at IS NULL;

ALTER TABLE journal_ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "convos_select_own" ON journal_ai_conversations;
CREATE POLICY "convos_select_own" ON journal_ai_conversations
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "convos_insert_own" ON journal_ai_conversations;
CREATE POLICY "convos_insert_own" ON journal_ai_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "convos_update_own" ON journal_ai_conversations;
CREATE POLICY "convos_update_own" ON journal_ai_conversations
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "convos_delete_own" ON journal_ai_conversations;
CREATE POLICY "convos_delete_own" ON journal_ai_conversations
  FOR DELETE USING (user_id = auth.uid());

COMMENT ON TABLE  journal_ai_conversations IS 'One row per Journal Coach chat thread; soft-deleted via archived_at';
COMMENT ON COLUMN journal_ai_conversations.updated_at IS 'Bumped on every new message — used to sort "recent conversations"';
COMMENT ON COLUMN journal_ai_conversations.archived_at IS 'NULL = active; non-NULL = archived (soft delete)';

-- ============================================
-- Table: journal_ai_messages
-- Individual messages within a conversation.
-- user_id is denormalized for efficient RLS without a join.
-- ============================================
CREATE TABLE IF NOT EXISTS journal_ai_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  conversation_id  uuid NOT NULL REFERENCES journal_ai_conversations(id) ON DELETE CASCADE,

  -- Denormalized from conversation for direct RLS — avoids a join on every row read
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Anthropic message role
  role             text NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),

  -- Text content of the message; NULL for tool-use messages (content lives in tool_input/tool_output)
  content          text,

  -- Populated only when role = 'tool'
  tool_name        text,
  tool_input       jsonb,
  tool_output      jsonb,

  -- Token counts from Anthropic usage object
  tokens_in        int,
  tokens_out       int,

  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Load all messages in a conversation ordered by time
CREATE INDEX IF NOT EXISTS idx_journal_ai_messages_conv_time
  ON journal_ai_messages (conversation_id, created_at);

-- Load recent messages for a user across all conversations (admin / activity view)
CREATE INDEX IF NOT EXISTS idx_journal_ai_messages_user_time
  ON journal_ai_messages (user_id, created_at DESC);

ALTER TABLE journal_ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_own" ON journal_ai_messages;
CREATE POLICY "messages_select_own" ON journal_ai_messages
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: check both the denormalized user_id AND that the conversation belongs to this user
DROP POLICY IF EXISTS "messages_insert_own" ON journal_ai_messages;
CREATE POLICY "messages_insert_own" ON journal_ai_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM journal_ai_conversations
      WHERE id = conversation_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_update_own" ON journal_ai_messages;
CREATE POLICY "messages_update_own" ON journal_ai_messages
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "messages_delete_own" ON journal_ai_messages;
CREATE POLICY "messages_delete_own" ON journal_ai_messages
  FOR DELETE USING (user_id = auth.uid());

COMMENT ON TABLE  journal_ai_messages IS 'Individual messages within a Journal Coach conversation; user_id denormalized for RLS efficiency';
COMMENT ON COLUMN journal_ai_messages.user_id IS 'Denormalized from journal_ai_conversations.user_id — avoids a join on every RLS check';
COMMENT ON COLUMN journal_ai_messages.role IS 'Anthropic message role: user | assistant | tool';
COMMENT ON COLUMN journal_ai_messages.tool_name IS 'Populated only for role=tool messages; matches tool_name in journal_ai_tool_previews';
COMMENT ON COLUMN journal_ai_messages.tokens_in IS 'Anthropic usage.input_tokens for this message turn';
COMMENT ON COLUMN journal_ai_messages.tokens_out IS 'Anthropic usage.output_tokens for this message turn';

-- ============================================
-- Table: journal_ai_tool_previews
-- Server-stored AI tool-call previews awaiting user confirmation.
-- Flow: AI emits tool_use → server stores here → frontend modal → user
--       confirms via POST /tool/execute → executed_at + result populated.
-- TTL: 10 minutes (expires_at). Cron should purge expired rows.
-- ============================================
CREATE TABLE IF NOT EXISTS journal_ai_tool_previews (
  preview_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The conversation that triggered this tool call (nullable — survives conversation deletion)
  conversation_id uuid REFERENCES journal_ai_conversations(id) ON DELETE SET NULL,

  -- Which trade-mutation tool was called
  tool_name       text NOT NULL CHECK (tool_name IN (
    'add_trade',
    'update_trade',
    'delete_trade',
    'tag_trade'
  )),

  -- The parameters the AI passed to the tool
  tool_input      jsonb NOT NULL,

  -- Lifecycle state
  status          text NOT NULL DEFAULT 'awaiting' CHECK (status IN (
    'awaiting',    -- waiting for user action in the frontend modal
    'confirmed',   -- user confirmed; /tool/execute processed it
    'expired',     -- TTL elapsed without confirmation
    'rejected'     -- user explicitly dismissed
  )),

  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Hard expiry — frontend and backend both check this
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),

  -- Set by /tool/execute on confirmation
  executed_at     timestamptz,

  -- Result payload from the trade mutation (set on confirmed)
  result          jsonb,

  -- Set on first call to /tool/execute to prevent double-apply on retries
  idempotency_key text
);

-- Primary query: load pending tool previews for a user, newest first
CREATE INDEX IF NOT EXISTS idx_journal_ai_tool_previews_user_status
  ON journal_ai_tool_previews (user_id, status, created_at DESC);

-- TTL cleanup query: find expired awaiting previews efficiently
CREATE INDEX IF NOT EXISTS idx_journal_ai_tool_previews_expiry
  ON journal_ai_tool_previews (expires_at)
  WHERE status = 'awaiting';

ALTER TABLE journal_ai_tool_previews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tool_previews_select_own" ON journal_ai_tool_previews;
CREATE POLICY "tool_previews_select_own" ON journal_ai_tool_previews
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tool_previews_insert_own" ON journal_ai_tool_previews;
CREATE POLICY "tool_previews_insert_own" ON journal_ai_tool_previews
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tool_previews_update_own" ON journal_ai_tool_previews;
CREATE POLICY "tool_previews_update_own" ON journal_ai_tool_previews
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tool_previews_delete_own" ON journal_ai_tool_previews;
CREATE POLICY "tool_previews_delete_own" ON journal_ai_tool_previews
  FOR DELETE USING (user_id = auth.uid());

COMMENT ON TABLE  journal_ai_tool_previews IS 'Server-stored AI tool-call previews. AI emits tool_use → server stores → frontend modal → user confirms via /tool/execute. TTL 10 minutes.';
COMMENT ON COLUMN journal_ai_tool_previews.status IS 'awaiting = pending user action; confirmed = executed; expired = TTL elapsed; rejected = user dismissed';
COMMENT ON COLUMN journal_ai_tool_previews.expires_at IS 'Hard expiry (10 min from creation). Backend /tool/execute rejects any preview past this timestamp.';
COMMENT ON COLUMN journal_ai_tool_previews.idempotency_key IS 'Set by /tool/execute on first call; prevents double-apply on network retries';

-- ============================================
-- Table: journal_ai_feedback
-- Thumbs-up/thumbs-down feedback on briefing insights or chat messages.
-- ============================================
CREATE TABLE IF NOT EXISTS journal_ai_feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Feedback on a specific briefing (nullable — could be message feedback instead)
  briefing_id  uuid REFERENCES journal_ai_briefings(id) ON DELETE SET NULL,

  -- Feedback on a specific chat message (nullable — could be briefing feedback instead)
  message_id   uuid REFERENCES journal_ai_messages(id) ON DELETE SET NULL,

  -- Sub-key within a briefing insight array (e.g. 'streak_loss', 'sizing_drift')
  insight_key  text,

  -- Thumbs signal
  signal       text NOT NULL CHECK (signal IN ('up', 'down')),

  -- Optional free-text comment from the user
  comment      text,

  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Load feedback history for a user
CREATE INDEX IF NOT EXISTS idx_journal_ai_feedback_user_time
  ON journal_ai_feedback (user_id, created_at DESC);

ALTER TABLE journal_ai_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_select_own" ON journal_ai_feedback;
CREATE POLICY "feedback_select_own" ON journal_ai_feedback
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "feedback_insert_own" ON journal_ai_feedback;
CREATE POLICY "feedback_insert_own" ON journal_ai_feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "feedback_update_own" ON journal_ai_feedback;
CREATE POLICY "feedback_update_own" ON journal_ai_feedback
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "feedback_delete_own" ON journal_ai_feedback;
CREATE POLICY "feedback_delete_own" ON journal_ai_feedback
  FOR DELETE USING (user_id = auth.uid());

COMMENT ON TABLE  journal_ai_feedback IS 'Thumbs-up/down feedback on AI briefing insights and chat messages; used to improve future Sonnet prompts';
COMMENT ON COLUMN journal_ai_feedback.briefing_id IS 'Set when feedback targets a briefing insight; NULL for message feedback';
COMMENT ON COLUMN journal_ai_feedback.message_id IS 'Set when feedback targets a chat message; NULL for briefing feedback';
COMMENT ON COLUMN journal_ai_feedback.insight_key IS 'Sub-key within insights array (e.g. streak_loss); NULL for whole-message feedback';
COMMENT ON COLUMN journal_ai_feedback.signal IS 'up = helpful / agree; down = unhelpful / disagree';
