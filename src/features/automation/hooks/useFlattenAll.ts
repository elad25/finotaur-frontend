// src/features/automation/hooks/useFlattenAll.ts
// ─────────────────────────────────────────────────────────────────────────────
// Backward-compatible re-export shim.
// The real implementation lives in useAgentCommand.ts — all command types
// (flatten_all, cancel_orders, flatten_symbol) are handled there.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { useAgentCommand, type AgentCommandResult } from './useAgentCommand';

export type FlattenResult = AgentCommandResult;

export function useFlattenAll() {
  const { flattenAll: _flattenAll, isRunning, result } = useAgentCommand();

  // Expose under the original name so all existing callers continue to work.
  const flattenAll = useCallback(async (): Promise<FlattenResult> => {
    return _flattenAll();
  }, [_flattenAll]);

  return { flattenAll, isFlattening: isRunning, result };
}
