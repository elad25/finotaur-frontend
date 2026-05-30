export type InsightCategory = 'symbol' | 'day_time' | 'setup' | 'risk' | 'tag' | 'behavioral';

/**
 * One metric in the score breakdown.
 * `raw` is the real-world value (e.g. win rate 46.2, profit factor 2.1);
 * `score` is its normalised 0-100 contribution to the overall Finotaur score.
 * Either may be null when the backend has insufficient data for that metric.
 */
export interface ScoreMetric {
  raw: number | null;
  score: number | null;
}

/** Keys mirror the get_finotaur_score RPC breakdown exactly. */
export interface ScoreBreakdown {
  win_rate: ScoreMetric;
  profit_factor: ScoreMetric;
  avg_wl: ScoreMetric;
  max_drawdown_pct: ScoreMetric;
  consistency_cv: ScoreMetric;
  recovery_factor: ScoreMetric;
}

export interface FinotaurScore {
  schema_version: 'v1';
  score: number | null;       // null = insufficient data
  prev_score: number | null;
  delta: number | null;
  breakdown: ScoreBreakdown | null;
  window_days?: number;
  trade_count?: number;        // RPC field name
  total_trades?: number;       // legacy alias (kept for FinotaurAI no-trades check)
  generated_at?: string;       // ISO
}

export interface Insight {
  id: string;
  category: InsightCategory;
  severity: 'positive' | 'neutral' | 'critical';
  title: string;
  body: string;
  metric?: string;
  related_trade_ids?: string[];
  featured?: boolean;
  eyebrow?: string;
}

/** Inner briefing content returned inside BriefingResponse.briefing */
export interface Briefing {
  insights: Insight[];
  recommendations: string[];
}

/** Outer envelope returned by GET /api/journal-ai/briefing */
export interface BriefingResponse {
  schema_version: 'v1';
  briefing: Briefing | null;
  stale: boolean;
  refreshing: boolean;
  generated_at: string | null;
  model: string | null;
}

// ─── Phase 5: Chat types ──────────────────────────────────────────────────────

export type ChatMessageRole = 'user' | 'assistant' | 'tool' | 'system';

export interface ChatMessage {
  id: string;              // client-generated uuid (or server msg id when persisted)
  role: ChatMessageRole;
  content: string;
  pending?: boolean;       // true while streaming
  tool_use?: ChatToolUse;  // present when assistant proposed a mutation
  tool_result?: unknown;   // present when role='tool' (read-only result)
}

export interface ChatToolUse {
  preview_id: string;
  tool_name: 'add_trade' | 'update_trade' | 'delete_trade' | 'tag_trade';
  summary: string;
  tool_input?: Record<string, unknown>;  // yielded by agentLoop — drives modal diff preview
  resolved?: 'confirmed' | 'discarded';
}

export interface ChatStreamEvent {
  type: 'conversation' | 'chunk' | 'tool_use' | 'tool_result' | 'done' | 'error';
  // Conversation
  id?: string;
  // Chunk
  delta?: string;
  // Tool use (mutation)
  preview_id?: string;
  tool_name?: string;
  summary?: string;
  tool_input?: Record<string, unknown>;
  // Tool result (read)
  output?: unknown;
  // Done
  usage?: Record<string, number>;
  // Error
  code?: string;
  message_he?: string;
  message_en?: string;
}

export interface ToolExecuteResponse {
  success: true;
  action: string;
  trade_id: string | null;
  before: unknown;
  after: unknown;
}

export interface ConversationListItem {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Phase 5b: Daily usage (banner) ───────────────────────────────────────────
export interface UsageToday {
  briefing_refreshes_used?: number;
  briefing_refreshes_max?: number;
  journal_coach_calls_used?: number;
  journal_coach_calls_max?: number;
}

export interface UsageResponse {
  schema_version?: 'v1';
  today?: UsageToday;
  resets_at?: string;  // ISO timestamp
}

// ─── Conversation history (sidebar) ──────────────────────────────────────────

export interface ConversationMessageRow {
  id: string;
  role: ChatMessageRole;
  content: string | null;
  tool_name?: string | null;
  tool_input?: Record<string, unknown> | null;
  tool_output?: unknown;
  created_at: string;
}

export interface ConversationDetailResponse {
  schema_version?: 'v1';
  conversation: ConversationListItem;
  messages: ConversationMessageRow[];
}

// ─── Phase 5b: Narrowed tool_result shapes for inline renderers ───────────────
/** Common envelope — every read-tool result carries an `action`. */
export interface ToolResultEnvelope {
  action: string;
  [key: string]: unknown;
}

/** Phase 5 — convenience alias used by useFinotaurChat and sidebar components */
export type ConversationSummary = ConversationListItem;

/** Phase 5 — pending tool-call surfaced to the confirmation UI */
export interface PendingToolCall {
  previewId: string;
  toolName: ChatToolUse['tool_name'];
  summary: string;
  toolInput?: Record<string, unknown>;  // forwarded from ChatToolUse.tool_input for the modal preview
}

// ─── Phase B: Per-trade Scorecard ─────────────────────────────────────────────

export type ScorecardGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type ScorecardDimensionKey = 'entry' | 'sizing' | 'exit' | 'history' | 'emotional';

export interface ScorecardDimension {
  score: number | null;
  status: 'scored' | 'insufficient_data';
  detail: string;
  nudge?: string;
}

export interface TradeScorecard {
  overall: number | null;
  grade: ScorecardGrade | null;
  dimensions: Record<ScorecardDimensionKey, ScorecardDimension>;
}

export interface TradeScorecardResponse {
  schema_version: 'v1';
  trade_id: string;
  scorecard: TradeScorecard;
}
