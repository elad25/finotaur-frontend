// src/services/aiCopilotApi.ts
// FINOTAUR AI Copilot - API Service
// 🔥 FIXED: Auth header now uses correct localStorage key

import { supabase } from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'https://finotaur-server-production.up.railway.app';

// 🔥 FIX: Get user ID from Supabase session properly
async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || '';
    const accessToken = session?.access_token || '';

    console.log('[AI Copilot API] Auth header - userId:', userId ? userId.substring(0, 8) + '...' : 'MISSING');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    };
    // The Anthropic chat endpoint (/api/ai/chat/stream-anthropic) authenticates via
    // a Supabase Bearer JWT (requireAuthJWT), not the legacy x-user-id header.
    // Send both so every AI endpoint authenticates correctly.
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    return headers;
  } catch (error) {
    console.error('[AI Copilot API] Failed to get session:', error);
    return {
      'Content-Type': 'application/json',
      'x-user-id': '',
    };
  }
}

// Types
interface ChatResponse {
  success: boolean;
  conversationId: string;
  message: {
    role: 'assistant';
    content: string;
    sources: any[];
    model: string;
  };
  usage: {
    tokens_used: number;
    questions_remaining: number | null;
  };
}

interface StreamCallbacks {
  message: string;
  /** Page-aware context (route + page-specific data) so FINO can ground its answer. */
  context?: unknown;
  conversationId?: string | null;
  /** User tier string from usage info — used for cost-safe endpoint routing. */
  tier?: string;
  onConversation?: (id: string) => void;
  onChunk?: (chunk: string) => void;
  onSources?: (sources: any[]) => void;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
}

interface ConversationsResponse {
  success: boolean;
  conversations: any[];
  pagination: {
    limit: number;
    offset: number;
  };
}

interface ConversationResponse {
  success: boolean;
  conversation: any;
  messages: any[];
}

interface UsageResponse {
  success: boolean;
  usage: {
    questions_today: number;
    tokens_today: number;
    daily_limit: number;
    remaining: number;
    remaining_questions: number;
    tier: string;
    user_tier: string;
    limit_reached: boolean;
  };
}

export const aiCopilotApi = {
  /**
   * Send a chat message (non-streaming)
   */
  async chat(message: string, conversationId?: string | null): Promise<ChatResponse> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        conversationId,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to send message');
    }
    
    return response.json();
  },
  
  /**
   * Send a chat message with streaming response
   */
  async chatStream(options: StreamCallbacks): Promise<void> {
    const {
      message,
      context,
      conversationId,
      onConversation,
      onChunk,
      onSources,
      onComplete,
      onError,
      signal,
    } = options;

    const headers = await getAuthHeaders();

    // All users use the enhanced Anthropic chat (page + journal aware); model tier is chosen server-side.
    const chatPath = '/api/ai/chat/stream-anthropic';

    const response = await fetch(`${API_BASE}${chatPath}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        conversationId,
        pageContext: context ?? undefined,
      }),
      signal,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to send message');
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'conversation':
                  if (onConversation) onConversation(data.id);
                  break;
                  
                case 'chunk':
                  if (onChunk) onChunk(data.content);
                  break;
                  
                case 'sources':
                  if (onSources) onSources(data.sources);
                  break;
                  
                case 'done':
                  if (onComplete) onComplete(data);
                  break;
                  
                case 'error':
                  if (onError) onError(data.message);
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE message:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
  
  /**
   * List user's conversations
   */
  async listConversations(limit = 20, offset = 0): Promise<ConversationsResponse> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_BASE}/api/ai/conversations?limit=${limit}&offset=${offset}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error('Failed to load conversations');
    }
    
    return response.json();
  },
  
  /**
   * Get a specific conversation with messages
   */
  async getConversation(id: string): Promise<ConversationResponse> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE}/api/ai/conversations/${id}`, {
      headers,
    });
    
    if (!response.ok) {
      throw new Error('Failed to load conversation');
    }
    
    return response.json();
  },
  
  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE}/api/ai/conversations/${id}`, {
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
  },
  
  /**
   * Update a conversation
   */
  async updateConversation(id: string, updates: { title?: string; is_archived?: boolean }): Promise<any> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE}/api/ai/conversations/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update conversation');
    }
    
    return response.json();
  },
  
  /**
   * Get user's usage stats
   */
  async getUsage(): Promise<UsageResponse> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE}/api/ai/usage`, {
      headers,
    });
    
    if (!response.ok) {
      throw new Error('Failed to load usage');
    }
    
    const data = await response.json();
    
    // Normalize the response
    const remaining = data.usage?.remaining ?? data.usage?.remaining_questions ?? 0;
    const tier = data.usage?.tier ?? data.usage?.user_tier ?? 'free';
    return {
      success: true,
      usage: {
        questions_today: data.usage?.questions_today ?? 0,
        tokens_today: data.usage?.tokens_today ?? 0,
        daily_limit: data.usage?.daily_limit ?? 3,
        remaining: remaining,
        remaining_questions: remaining,
        tier: tier,
        user_tier: tier,
        limit_reached: data.usage?.limit_reached ?? false,
      },
    };
  },
  
  /**
   * Submit feedback for a message
   */
  async submitFeedback(messageId: string, feedback: 'positive' | 'negative', comment?: string): Promise<void> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE}/api/ai/feedback`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messageId,
        feedback,
        comment,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit feedback');
    }
  },
  
  /**
   * Direct semantic search
   */
  async search(query: string, filters?: { reportType?: string; limit?: number }): Promise<any> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE}/api/ai/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        ...filters,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to search');
    }
    
    return response.json();
  },
  
  /**
   * Get available reports
   */
  async getReports(): Promise<any> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE}/api/ai/reports`, {
      headers,
    });
    
    if (!response.ok) {
      throw new Error('Failed to load reports');
    }
    
    return response.json();
  },
};

// ---------------------------------------------------------------
// FINO Morning Briefing types + fetch
// ---------------------------------------------------------------

export interface BriefMarketPulse {
  label: string;
  value: string | number;
  change: string | number;
}

export interface BriefKeyEvent {
  time: string;
  name: string;
  importance: 'high' | 'medium' | 'low';
}

export interface BriefSectorWatch {
  name: string;
  changePct: number;
}

export interface BriefPersonalWatchlistItem {
  symbol: string;
  price: number;
  changePct: number;
}

export interface BriefPortfolioPosition {
  symbol: string;
  qty: number;
}

export interface BriefPersonal {
  watchlist: BriefPersonalWatchlistItem[];
}

export interface BriefPortfolio {
  totalValue?: number;
  positions: BriefPortfolioPosition[];
}

export interface BriefContent {
  headline: string;
  summary: string;
  market_pulse: BriefMarketPulse[];
  key_events: BriefKeyEvent[];
  sector_watch: BriefSectorWatch[];
  deep_note?: string;
  personal?: BriefPersonal;
  portfolio?: BriefPortfolio;
}

export type FinoBriefingResult =
  | { status: 'locked'; reason: string }
  | { status: 'ready'; tier: 'core' | 'finotaur'; date: string; generatedAt: string; brief: BriefContent }
  | { status: 'not_ready' };

/**
 * Fetch the FINO Morning Briefing for today.
 * - 200 locked     → { status: 'locked', reason }
 * - 200 unlocked   → { status: 'ready', ... }
 * - 404 not ready  → { status: 'not_ready' }
 * - other errors   → throw
 */
export async function fetchFinoBriefing(): Promise<FinoBriefingResult> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/ai/fino/briefing`, { headers });

  if (response.status === 404) {
    return { status: 'not_ready' };
  }

  if (!response.ok) {
    throw new Error(`Briefing fetch failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.locked === true) {
    return { status: 'locked', reason: data.reason ?? 'free_tier' };
  }

  return {
    status: 'ready',
    tier: data.tier,
    date: data.date,
    generatedAt: data.generatedAt,
    brief: data.brief,
  };
}

export default aiCopilotApi;

// ---------------------------------------------------------------
// FINO Session Review types + fetch
// ---------------------------------------------------------------

export interface SessionReviewStats {
  trades: number;
  wins: number;
  losses: number;
  netPnl: number;
  best?: { symbol: string; pnl: number };
  worst?: { symbol: string; pnl: number };
}

export type FinoSessionReviewResult =
  | { status: 'locked' }
  | { status: 'ready'; date: string; review: string; stats: SessionReviewStats }
  | { status: 'none' };

/**
 * Fetch the FINO Session Review for today.
 * - 200 { locked: true }   → { status: 'locked' }
 * - 200 { locked: false }  → { status: 'ready', date, review, stats }
 * - 404                    → { status: 'none' }
 * - other errors           → throw
 */
export async function fetchFinoSessionReview(): Promise<FinoSessionReviewResult> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/ai/fino/session-review`, { headers });

  if (response.status === 404) {
    return { status: 'none' };
  }

  if (!response.ok) {
    throw new Error(`Session review fetch failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.locked === true) {
    return { status: 'locked' };
  }

  return {
    status: 'ready',
    date: data.date,
    review: data.review,
    stats: data.stats,
  };
}