// src/services/aiCopilotApi.ts
// FINOTAUR AI Copilot - API Service

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
  // Get user ID from localStorage or auth context
  const user = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
  const userId = user?.currentSession?.user?.id;
  
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId || '',
  };
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
  conversationId?: string | null;
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
    tier: string;
    limit_reached: boolean;
  };
}

export const aiCopilotApi = {
  /**
   * Send a chat message (non-streaming)
   */
  async chat(message: string, conversationId?: string | null): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
      conversationId,
      onConversation,
      onChunk,
      onSources,
      onComplete,
      onError,
      signal,
    } = options;
    
    const response = await fetch(`${API_BASE}/api/ai/chat/stream`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        message,
        conversationId,
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
    const response = await fetch(
      `${API_BASE}/api/ai/conversations?limit=${limit}&offset=${offset}`,
      {
        headers: getAuthHeaders(),
      }
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
    const response = await fetch(`${API_BASE}/api/ai/conversations/${id}`, {
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE}/api/ai/conversations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
  },
  
  /**
   * Update a conversation
   */
  async updateConversation(id: string, updates: { title?: string; is_archived?: boolean }): Promise<any> {
    const response = await fetch(`${API_BASE}/api/ai/conversations/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE}/api/ai/usage`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to load usage');
    }
    
    const data = await response.json();
    
    // Normalize the response
    return {
      success: true,
      usage: {
        questions_today: data.usage?.questions_today || 0,
        tokens_today: data.usage?.tokens_today || 0,
        daily_limit: data.usage?.daily_limit || 5,
        remaining: data.usage?.remaining || 5,
        tier: data.usage?.tier || 'FREE',
        limit_reached: data.usage?.limit_reached || false,
      },
    };
  },
  
  /**
   * Submit feedback for a message
   */
  async submitFeedback(messageId: string, feedback: 'positive' | 'negative', comment?: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/ai/feedback`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE}/api/ai/search`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE}/api/ai/reports`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to load reports');
    }
    
    return response.json();
  },
};

export default aiCopilotApi;