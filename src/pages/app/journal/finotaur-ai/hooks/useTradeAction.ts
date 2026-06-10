// src/pages/app/journal/finotaur-ai/hooks/useTradeAction.ts
// Mutation hook that confirms a pending tool call (mutation) and invalidates
// all trade-related query caches on success.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { executeToolCall, type ExecuteToolCallArgs } from '../services/finotaurAIApi';
import type { ToolExecuteResponse } from '../types';

/** @deprecated use ExecuteToolCallArgs from finotaurAIApi instead */
export interface ExecuteArgs {
  preview_id: string;
  idempotency_key: string;
  typed_confirmation?: string;
}

export function useTradeAction() {
  const qc = useQueryClient();
  return useMutation<ToolExecuteResponse, Error, ExecuteToolCallArgs>({
    mutationFn: executeToolCall,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trades'] });
      qc.invalidateQueries({ queryKey: ['useAnalyticsData'] });
      qc.invalidateQueries({ queryKey: ['finotaur-score'] });
      qc.invalidateQueries({ queryKey: ['finotaur-briefing'] });
    },
  });
}

/** Generates a unique idempotency key for tool-call confirmation requests. */
export function makeIdempotencyKey(): string {
  return `ik_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
