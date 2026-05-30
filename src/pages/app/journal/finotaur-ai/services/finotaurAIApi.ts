// src/pages/app/journal/finotaur-ai/services/finotaurAIApi.ts
// Auth: authFetch injects Authorization: Bearer <token> from supabase.auth.getSession().
// The server's requireAuth middleware validates the Bearer JWT.

import { authFetch } from '@/utils/authFetch';
import type {
  BriefingResponse,
  ChatMessage,
  ConversationDetailResponse,
  ConversationListItem,
  ConversationMessageRow,
  FinotaurScore,
  ToolExecuteResponse,
  UsageResponse,
} from '../types';

export async function fetchFinotaurScore(windowDays: number = 30): Promise<FinotaurScore> {
  const res = await authFetch(`/api/journal-ai/score?window=${windowDays}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`fetchFinotaurScore failed (${res.status})${text ? ': ' + text : ''}`);
  }

  const data: FinotaurScore = await res.json();
  return data;
}

// ---------------------------------------------------------------------------
// Typed error for briefing API — UI reads err.status for 429 / 409 branches
// ---------------------------------------------------------------------------
export class BriefingApiError extends Error {
  status: number;
  code?: string;
  message_he?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;

  constructor(
    message: string,
    status: number,
    code?: string,
    message_he?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any,
  ) {
    super(message);
    this.name = 'BriefingApiError';
    this.status = status;
    this.code = code;
    this.message_he = message_he;
    this.details = details;
  }
}

export async function fetchBriefing(): Promise<BriefingResponse> {
  const res = await authFetch('/api/journal-ai/briefing', {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BriefingApiError(
      body?.message_en ?? `fetchBriefing failed (${res.status})`,
      res.status,
      body?.code,
      body?.message_he,
      body,
    );
  }

  const data: BriefingResponse = await res.json();
  return data;
}

export async function refreshBriefing(): Promise<BriefingResponse> {
  const res = await authFetch('/api/journal-ai/briefing/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BriefingApiError(
      body?.message_en ?? `refreshBriefing failed (${res.status})`,
      res.status,
      body?.code,
      body?.message_he,
      body,
    );
  }

  const data: BriefingResponse = await res.json();
  return data;
}

// ─── Phase 5: Chat API ────────────────────────────────────────────────────────

export interface ExecuteToolCallArgs {
  preview_id: string;
  idempotency_key: string;
  confirm: true;
  typed_confirmation?: string;
}

export async function executeToolCall(args: ExecuteToolCallArgs): Promise<ToolExecuteResponse> {
  const res = await authFetch('/api/journal-ai/tool/execute', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BriefingApiError(
      body?.message_en ?? `executeToolCall failed (${res.status})`,
      res.status,
      body?.error,
      body?.message_he,
      body,
    );
  }
  return res.json() as Promise<ToolExecuteResponse>;
}

export async function listConversations(): Promise<ConversationListItem[]> {
  const res = await authFetch('/api/journal-ai/conversations', {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BriefingApiError(
      body?.message_en ?? `listConversations failed (${res.status})`,
      res.status,
      body?.code,
      body?.message_he,
      body,
    );
  }
  const data = await res.json();
  return (data?.conversations ?? []) as ConversationListItem[];
}

export async function fetchUsage(): Promise<UsageResponse> {
  const res = await authFetch('/api/journal-ai/usage', {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BriefingApiError(
      body?.message_en ?? `fetchUsage failed (${res.status})`,
      res.status,
      body?.code,
      body?.message_he,
      body,
    );
  }
  return res.json() as Promise<UsageResponse>;
}

export async function fetchConversation(
  id: string,
): Promise<{ conversation: ConversationListItem; messages: ChatMessage[] }> {
  const res = await authFetch(`/api/journal-ai/conversations/${encodeURIComponent(id)}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BriefingApiError(
      body?.message_en ?? `fetchConversation failed (${res.status})`,
      res.status,
      body?.code,
      body?.message_he,
      body,
    );
  }
  const data: ConversationDetailResponse = await res.json();

  // Map server message rows → ChatMessage (client shape)
  const messages: ChatMessage[] = (data.messages ?? []).map(
    (row: ConversationMessageRow): ChatMessage => {
      const base: ChatMessage = {
        id: row.id,
        role: row.role,
        content: row.content ?? '',
      };
      if (row.role === 'tool') {
        return { ...base, tool_result: row.tool_output };
      }
      return base;
    },
  );

  return { conversation: data.conversation, messages };
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await authFetch(`/api/journal-ai/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BriefingApiError(
      body?.message_en ?? `deleteConversation failed (${res.status})`,
      res.status,
      body?.code,
      body?.message_he,
      body,
    );
  }
}
