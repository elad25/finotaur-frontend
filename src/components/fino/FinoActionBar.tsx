// src/components/fino/FinoActionBar.tsx
// =====================================================
// FINO Action Approval Bar
//
// Listens for `fino:action` CustomEvents dispatched by the SSE parser
// in aiCopilotApi.ts. When an action arrives, renders a slim bar above
// the chat input with Approve / Dismiss controls.
//
// Communicates via window events (no extra props threaded through
// ChatInterface or FinoChatDrawer).
// =====================================================

import { useEffect, useCallback, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Spinner } from '@/components/ds/Spinner';
import { aiCopilotApi } from '@/services/aiCopilotApi';

// ---- Types ----------------------------------------------------------------

interface FinoActionDetail {
  action: string;
  count: number;
  label: string;
}

type BarState =
  | { phase: 'idle' }
  | { phase: 'pending'; detail: FinoActionDetail }
  | { phase: 'approving'; detail: FinoActionDetail }
  | { phase: 'success'; tagged: number }
  | { phase: 'error' };

// ---- Component ------------------------------------------------------------

export function FinoActionBar() {
  const [state, setState] = useState<BarState>({ phase: 'idle' });
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule auto-clear after a result is shown (success / error).
  const scheduleAutoClear = useCallback((delayMs: number) => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setState({ phase: 'idle' });
      clearTimerRef.current = null;
    }, delayMs);
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  // Listen for fino:action events from the SSE parser.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<FinoActionDetail>).detail;
      // Latest action wins — clear any pending timer.
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
      setState({ phase: 'pending', detail });
    };

    window.addEventListener('fino:action', handler);
    return () => window.removeEventListener('fino:action', handler);
  }, []);

  // ---- Handlers -----------------------------------------------------------

  const handleApprove = useCallback(async () => {
    if (state.phase !== 'pending') return;
    const { detail } = state;

    setState({ phase: 'approving', detail });

    try {
      const result = await aiCopilotApi.approveFinoAction(detail.action);
      setState({ phase: 'success', tagged: result.tagged });
      scheduleAutoClear(4_000);
    } catch (err) {
      setState({ phase: 'error' });
      scheduleAutoClear(4_000);
    }
  }, [state, scheduleAutoClear]);

  const handleDismiss = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    setState({ phase: 'idle' });
  }, []);

  // ---- Render -------------------------------------------------------------

  if (state.phase === 'idle') return null;

  return (
    <div
      className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
      style={{
        backgroundColor: '#0D0C0A',
        borderColor: 'rgba(201,166,70,0.25)',
      }}
    >
      {/* Left — label / status */}
      <div className="flex min-w-0 items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#C9A646]" />

        {state.phase === 'pending' && (
          <span className="truncate text-[11px] text-[#C9A646]">
            {state.detail.label}
          </span>
        )}

        {state.phase === 'approving' && (
          <span className="truncate text-[11px] text-[#C9A646]/70">
            {state.detail.label}
          </span>
        )}

        {state.phase === 'success' && (
          <span className="truncate text-[11px] text-[#C9A646]">
            ✅ Tagged {state.tagged} trade{state.tagged !== 1 ? 's' : ''}
          </span>
        )}

        {state.phase === 'error' && (
          <span className="truncate text-[11px] text-[#EF4444]">
            Couldn&apos;t complete the action — try again later
          </span>
        )}
      </div>

      {/* Right — action buttons */}
      {(state.phase === 'pending' || state.phase === 'approving') && (
        <div className="flex shrink-0 items-center gap-2">
          {/* Approve */}
          <button
            type="button"
            onClick={handleApprove}
            disabled={state.phase === 'approving'}
            className="flex h-6 items-center gap-1.5 rounded px-2 text-[11px] font-semibold text-[#0D0C0A] transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#C9A646' }}
          >
            {state.phase === 'approving' ? (
              <Spinner size="sm" color="inherit" />
            ) : (
              'Approve'
            )}
          </button>

          {/* Dismiss */}
          <button
            type="button"
            onClick={handleDismiss}
            disabled={state.phase === 'approving'}
            className="flex h-6 items-center rounded px-2 text-[11px] text-[#9a9484] transition-colors hover:text-[#C9A646] disabled:opacity-60"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default FinoActionBar;
