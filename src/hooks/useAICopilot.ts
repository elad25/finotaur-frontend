// src/hooks/useAICopilot.ts
// FINOTAUR AI Copilot - Main hook for chat functionality

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { aiCopilotApi } from '@/services/aiCopilotApi';
import { toast } from 'sonner';
import { FINO_TIER_QUOTAS } from '@/lib/fino-tiers';

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

  // Typewriter drain state — ALL assistant text (streamed tokens AND
  // single-chunk pre-computed answers) is revealed character-by-character
  // instead of appearing in bursts. `pendingRef` buffers text that has
  // arrived from the server but not yet been "typed" into the visible
  // message; `drainTimerRef` is the interval that drips it into state;
  // `streamDoneRef` marks that the server's `done` event fired (but the
  // buffer may still be draining); `finalizeRef` stashes the done-event's
  // side effects (usage update, etc.) so they run exactly once, after the
  // last buffered character has been revealed — not the moment bytes land.
  const pendingRef = useRef('');
  const drainTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamDoneRef = useRef(false);
  const finalizeRef = useRef<(() => void) | null>(null);
  // Tracks whether the hook is still mounted — flipped false in the unmount
  // cleanup below. Checked defensively inside startDrainLoop and
  // appendToAssistantMessage so a chunk/interval tick that was already
  // scheduled before unmount can't fire setState on a gone component.
  const mountedRef = useRef(true);

  // Load usage on mount. Conversation history is intentionally not loaded in
  // AI Assistant; the screen should open as a clean workspace.
  useEffect(() => {
    if (user) {
      loadUsage();
    }
  }, [user]);

  // Abort any in-flight stream and clear the typewriter drain interval on
  // unmount, so neither keeps running (or firing setState) after the
  // component is gone. mountedRef is checked defensively inside
  // startDrainLoop/appendToAssistantMessage as a belt-and-suspenders guard
  // in case a chunk/interval tick was already scheduled before the abort
  // takes effect.
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (drainTimerRef.current) {
        clearInterval(drainTimerRef.current);
        drainTimerRef.current = null;
      }
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

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
        // Client-side fallback when the server omits daily_limit — mirrors the
        // FREE tier quota (see FINO_TIER_QUOTAS in fino-tiers.ts) so this can't drift.
        daily_limit: unlimited ? null : (raw.daily_limit ?? FINO_TIER_QUOTAS.free),
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

    // Placeholder shape for a fresh assistant message. Declared up front so
    // the typewriter closures below (defined before this send touches any
    // shared state, so the reentrancy guard can use them) can all close
    // over it — its shape never depends on per-call data.
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      sources: [],
    };

    // Appends `text` to the last assistant message. By the time this runs,
    // `ensureAssistantPlaceholder` (called synchronously from onChunk, or
    // the reentrancy guard below) has already guaranteed an assistant
    // message is last — this only ever appends. The push fallback remains
    // as a defensive no-op path in case that invariant is ever violated.
    const appendToAssistantMessage = (text: string) => {
      if (!mountedRef.current) return;
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;

        if (updated[lastIdx]?.role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: updated[lastIdx].content + text,
          };
        } else {
          updated.push({
            ...assistantMessage,
            content: text,
          });
        }

        return updated;
      });
    };

    // Synchronously ensures the assistant placeholder message is present as
    // the last message. Called from onChunk BEFORE buffering, so an
    // `onSources` event arriving before the first ~30ms drain tick still
    // finds an assistant message to attach sources to (the placeholder used
    // to be created lazily by the first drain tick, which silently dropped
    // sources that arrived first).
    const ensureAssistantPlaceholder = () => {
      if (!mountedRef.current) return;
      setMessages(prev => {
        const lastIdx = prev.length - 1;
        if (prev[lastIdx]?.role === 'assistant') return prev;
        return [...prev, { ...assistantMessage }];
      });
    };

    // If the buffer is fully drained AND the server's `done` event has
    // fired, run the stashed finalization (usage update etc.) exactly
    // once, stop the drain interval, and flip isLoading/isStreaming off —
    // this is what ends the visible typing period on the success path.
    const maybeFinalize = () => {
      if (pendingRef.current.length > 0 || !streamDoneRef.current) return;

      if (drainTimerRef.current) {
        clearInterval(drainTimerRef.current);
        drainTimerRef.current = null;
      }

      const finalize = finalizeRef.current;
      finalizeRef.current = null;
      finalize?.();
      // Reset so a later, unrelated maybeFinalize/finally check can never
      // mistake this already-finalized run for one still awaiting `done`.
      streamDoneRef.current = false;

      setIsLoading(false);
      setIsStreaming(false);
    };

    // Drips buffered text into the message ~every 30ms. N scales with
    // buffer size so a long buffer never lags more than ~4.5s behind —
    // instant answers still "type" smoothly instead of dumping all at once.
    const startDrainLoop = () => {
      if (!mountedRef.current) return;
      if (drainTimerRef.current) return;

      drainTimerRef.current = setInterval(() => {
        const buf = pendingRef.current;
        if (buf.length > 0) {
          const n = Math.max(3, Math.ceil(buf.length / 150));
          const take = buf.slice(0, n);
          pendingRef.current = buf.slice(n);
          appendToAssistantMessage(take);
        }
        maybeFinalize();
      }, 30);
    };

    // Error/abort/timeout paths skip the typewriter — flush whatever text
    // is still buffered straight into the message so nothing is lost, then
    // clear all drain state so the interval can't fire again for this send.
    const flushPendingInstantly = () => {
      if (drainTimerRef.current) {
        clearInterval(drainTimerRef.current);
        drainTimerRef.current = null;
      }
      const remaining = pendingRef.current;
      pendingRef.current = '';
      streamDoneRef.current = false;
      finalizeRef.current = null;

      if (remaining.length > 0) {
        appendToAssistantMessage(remaining);
      }
    };

    // Reentrancy guard — a previous send's typewriter drain (or in-flight
    // stream) may still be active when a new message is sent. Flush
    // whatever text is still buffered into the PREVIOUS assistant message
    // now, before this send adds the new user message or touches any
    // shared refs, so it isn't silently dropped — then abort the previous
    // in-flight request so it can't keep writing into state this send owns.
    if (drainTimerRef.current !== null || pendingRef.current.length > 0) {
      flushPendingInstantly();
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Add user message immediately
    const userMessage: Message = {
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    setIsLoading(true);
    setIsStreaming(true);
    setError(null);

    // Reset typewriter-drain state for this new message — clears any stale
    // interval/buffer left over from a previous send (defensive; the
    // reentrancy guard above and normal completion/error paths already
    // clean up after themselves).
    if (drainTimerRef.current) {
      clearInterval(drainTimerRef.current);
      drainTimerRef.current = null;
    }
    pendingRef.current = '';
    streamDoneRef.current = false;
    finalizeRef.current = null;

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
          // Ensure the assistant placeholder exists synchronously before
          // buffering — see ensureAssistantPlaceholder's comment above.
          ensureAssistantPlaceholder();
          // Buffer instead of displaying immediately — the drain loop
          // reveals it progressively (typewriter effect) rather than in
          // network-arrival bursts.
          pendingRef.current += chunk;
          startDrainLoop();
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
          // The server is done, but the typewriter may still be draining
          // buffered text — don't run these side effects (or flip
          // isStreaming) yet. Stash them; maybeFinalize() runs this exactly
          // once, after the last buffered character has been revealed.
          streamDoneRef.current = true;
          finalizeRef.current = () => {
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
          };

          // Covers the case where the buffer was already empty (or no
          // onChunk ever fired) by the time `done` arrived — nothing left
          // for the interval to drain, so finalize immediately.
          maybeFinalize();
        },
        onError: (errorMsg) => {
          // Don't lose buffered-but-not-yet-typed text — show it instantly.
          flushPendingInstantly();
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
      // Error/abort/timeout — don't lose buffered-but-not-yet-typed text,
      // show it instantly and stop the drain interval before handling the
      // error itself (unchanged below).
      flushPendingInstantly();

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
      abortControllerRef.current = null;

      // No `done` event ever arrived for this send — either the stream
      // closed cleanly without one (proxy cut, mid-response crash: this is
      // the zombie-interval bug — without this, the drain interval would
      // never clear while isLoading/isStreaming got reset below anyway), or
      // an error/abort/timeout path above already flushed. Either way,
      // make sure the drain interval and buffer are fully cleared BEFORE
      // this send's loading flags are reset, so the interval can never
      // keep running after this function returns.
      if (!streamDoneRef.current) {
        flushPendingInstantly();
      }

      // On the success path, the server may be done while the typewriter
      // is still draining buffered text — in that case isLoading/isStreaming
      // stay true and maybeFinalize() flips them off once the drain
      // interval empties the buffer. Every other path (error/abort/timeout,
      // or done-never-arrived) was just flushed above (buffer empty,
      // streamDoneRef reset to false), so it falls through and finalizes
      // immediately here.
      const stillTypingOut = streamDoneRef.current && (pendingRef.current.length > 0 || drainTimerRef.current !== null);
      if (!stillTypingOut) {
        setIsLoading(false);
        setIsStreaming(false);
      }
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
