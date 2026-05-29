export type InsightCategory = 'symbol' | 'day_time' | 'setup' | 'risk' | 'tag' | 'behavioral';

export interface ScoreBreakdown {
  win_rate: number;       // 0-100
  profit_factor: number;
  avg_wl: number;
  max_dd: number;
  consistency: number;
  recovery: number;
}

export interface FinotaurScore {
  schema_version: 'v1';
  score: number | null;       // null = insufficient data
  prev_score: number | null;
  delta: number | null;
  breakdown: ScoreBreakdown | null;
  window_days?: number;
  total_trades?: number;
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

/** Phase 5 — convenience alias used by useFinotaurChat and sidebar components */
export type ConversationSummary = ConversationListItem;

/** Phase 5 — pending tool-call surfaced to the confirmation UI */
export interface PendingToolCall {
  previewId: string;
  toolName: ChatToolUse['tool_name'];
  summary: string;
  toolInput?: Record<string, unknown>;  // forwarded from ChatToolUse.tool_input for the modal preview
}
