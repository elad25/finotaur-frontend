// src/hooks/useAICopilot.ts
// FINOTAUR AI Copilot - Main hook for chat functionality

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { aiCopilotApi } from '@/services/aiCopilotApi';
import { toast } from 'sonner';

// Types
export interface MessageSource {
  report_id: string;
  report_type: string;
  report_date: string;
  section?: string;
  similarity?: number;
  pdf_url?: string;
  excerpt?: string;
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: MessageSource[];
  created_at?: string;
}

export interface Conversation {
  id: string;
  title?: string;
  messages_count: number;
  created_at: string;
  updated_at: string;
}

export interface UsageInfo {
  questions_today: number;
  tokens_today: number;
  daily_limit: number | null;
  remaining: number;
  questions_remaining: number;
  user_tier: string;
  limit_reached: boolean;
  unlimited: boolean;
}

interface UseAICopilotReturn {
  // State
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  usage: UsageInfo | null;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  
  // Actions
  sendMessage: (message: string, context?: unknown) => Promise<string | null>;
  startNewConversation: () => void;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  clearError: () => void;
}

export function useAICopilot(initialConversationId?: string | null): UseAICopilotReturn {
  const { user } = useAuth();
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  
  // Refs for streaming
  const abortControllerRef = useRef<AbortController | null>(null);
  // Inactivity timeout — aborts the stream if no bytes arrive for this long,
  // so the loading dot can't spin forever on a genuine silent hang. The FINO SSE
  // now streams in real time (the server sets Content-Encoding: identity +
  // Cache-Control: no-store,no-transform so Railway's edge no longer buffers the
  // response), and it emits a heartbeat ping every 15s during the cold tool
  // phase — so 90s comfortably outlasts any real gap between bytes while still
  // catching a genuine silent hang far sooner than the old buffered-era 150s.
  const INACTIVITY_TIMEOUT_MS = 90_000;
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timedOutRef = useRef(false);
  
  // Load usage on mount. Conversation history is intentionally not loaded in
  // AI Assistant; the screen should open as a clean workspace.
  useEffect(() => {
    if (user) {
      loadUsage();
    }
  }, [user]);
  
  // Load usage stats
  // FIX: Removed camelCase fallbacks (questionsToday, tokensToday, dailyLimit, limitReached)
  // that don't exist on the UsageResponse type from aiCopilotApi.ts.
  // The API returns snake_case only. Map 'tier' → 'user_tier' for the UsageInfo interface.
  const loadUsage = useCallback(async () => {
    try {
      const data = await aiCopilotApi.getUsage();
      const raw = data.usage;
      const unlimited = Boolean(raw.unlimited);
      const remaining = unlimited
        ? Number.POSITIVE_INFINITY
        : (raw.remaining ?? raw.remaining_questions ?? 0);
      setUsage({
        questions_today: raw.questions_today ?? 0,
        tokens_today: raw.tokens_today ?? 0,
        daily_limit: unlimited ? null : (raw.daily_limit ?? 3),
        remaining: remaining,
        questions_remaining: remaining,
        user_tier: raw.tier ?? raw.user_tier ?? 'free',
        limit_reached: unlimited ? false : (raw.limit_reached ?? false),
        unlimited,
      });
    } catch (err) {
      console.error('Failed to load usage:', err);
    }
  }, []);
  
  // Refresh conversations list
  const refreshConversations = useCallback(async () => {
    setConversations([]);
  }, [user]);
  
  // Load a specific conversation
  const loadConversation = useCallback(async (id: string) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const data = await aiCopilotApi.getConversation(id);
      
      if (data.conversation) {
        setCurrentConversation(data.conversation);
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  // Start new conversation
  const startNewConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
    setError(null);
  }, []);
  
  // Delete conversation
  const deleteConversation = useCallback(async (id: string) => {
    try {
      await aiCopilotApi.deleteConversation(id);
      
      // Update local state
      setConversations(prev => prev.filter(c => c.id !== id));
      
      // If deleting current conversation, clear it
      if (currentConversation?.id === id) {
        startNewConversation();
      }
      
      toast.success('Conversation deleted');
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      toast.error('Failed to delete conversation');
    }
  }, [currentConversation, startNewConversation]);
  
  // Send message (streaming)
  const sendMessage = useCallback(async (message: string, context?: unknown): Promise<string | null> => {
    if (!user || !message.trim()) return null;
    
    // Check usage limit — never blocks unlimited tiers (finotaur/ultimate)
    if (usage?.limit_reached && !usage?.unlimited) {
      setError('Daily limit reached. Upgrade for unlimited access.');
      return null;
    }
    
    // Add user message immediately
    const userMessage: Message = {
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Prepare assistant message placeholder
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      sources: [],
    };
    
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    timedOutRef.current = false;

    // Start the inactivity watchdog — reset on every chunk in onChunk below.
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        timedOutRef.current = true;
        abortControllerRef.current?.abort();
      }, INACTIVITY_TIMEOUT_MS);
    };
    resetInactivityTimer();

    let conversationId = currentConversation?.id || null;

    try {
      // Use streaming endpoint
      await aiCopilotApi.chatStream({
        message,
        context,
        tier: usage?.user_tier,
        conversationId,
        onActivity: () => resetInactivityTimer(),
        onConversation: (id) => {
          conversationId = id;
          // Update current conversation
          setCurrentConversation(prev => prev ? prev : { 
            id, 
            messages_count: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        },
        onChunk: (chunk) => {
          resetInactivityTimer();
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            
            // If last message is assistant, append to it
            if (updated[lastIdx]?.role === 'assistant') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: updated[lastIdx].content + chunk,
              };
            } else {
              // Add new assistant message
              updated.push({
                ...assistantMessage,
                content: chunk,
              });
            }
            
            return updated;
          });
        },
        onSources: (sources) => {
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            
            if (updated[lastIdx]?.role === 'assistant') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                sources,
              };
            }
            
            return updated;
          });
        },
        onComplete: (data) => {
          // Update usage — unlimited tiers keep remaining at Infinity and
          // never flip limit_reached, regardless of how many questions were asked.
          if (data.usage) {
            setUsage(prev => {
              if (!prev) return null;
              if (prev.unlimited) {
                return { ...prev, questions_today: prev.questions_today + 1 };
              }
              return {
                ...prev,
                questions_today: prev.questions_today + 1,
                remaining: Math.max(0, prev.remaining - 1),
                questions_remaining: Math.max(0, prev.remaining - 1),
                limit_reached: prev.remaining <= 1,
              };
            });
          }

          setConversations([]);
        },
        onError: (errorMsg) => {
          setError(errorMsg);
          // Remove the empty assistant message if error occurred
          setMessages(prev => {
            const updated = [...prev];
            if (updated[updated.length - 1]?.role === 'assistant' && !updated[updated.length - 1]?.content) {
              updated.pop();
            }
            return updated;
          });
        },
        signal: abortControllerRef.current.signal,
      });
      
      return conversationId;
      
    } catch (err: any) {
      if (err.name === 'AbortError' && timedOutRef.current) {
        // Inactivity watchdog fired — surface it as a real error, not a
        // silent user-cancel, and drop the empty pending assistant message
        // the same way onError does.
        const errorMsg = 'FINO took too long to respond. Please try again.';
        setError(errorMsg);
        toast.error(errorMsg);
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.role === 'assistant' && !updated[updated.length - 1]?.content) {
            updated.pop();
          }
          return updated;
        });
      } else if (err.name !== 'AbortError') {
        const errorMsg = err.message || 'Failed to send message';
        setError(errorMsg);
        toast.error(errorMsg);
      }
      return null;

    } finally {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [user, usage, currentConversation, refreshConversations]);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    // State
    messages,
    isLoading,
    isStreaming,
    error,
    usage,
    conversations,
    currentConversation,
    
    // Actions
    sendMessage,
    startNewConversation,
    loadConversation,
    deleteConversation,
    refreshConversations,
    clearError,
  };
}
