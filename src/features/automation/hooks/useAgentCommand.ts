// src/features/automation/hooks/useAgentCommand.ts
// ─────────────────────────────────────────────────────────────────────────────
// Generic hook for customer-initiated agent commands sent via
// automation_enqueue_command. The RPC is user-scoped (RLS via auth.uid) and
// inserts a pending row for every online desktop agent device. An empty result
// means no online agent is paired.
//
// Nothing executes server-side — the local NinjaScript agent polls for pending
// commands and executes them locally.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type AgentCommandResult =
  | { status: 'sent'; devices: number }
  | { status: 'no_agent' }
  | { status: 'error'; message: string };

async function enqueueCommand(
  commandType: string,
  symbol: string | null,
): Promise<AgentCommandResult> {
  const { data, error } = await supabase.rpc('automation_enqueue_command', {
    p_command_type: commandType,
    p_symbol: symbol,
  });

  if (error) {
    return { status: 'error', message: error.message };
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.length === 0
    ? { status: 'no_agent' }
    : { status: 'sent', devices: rows.length };
}

/** Hook for flatten_all — backward-compatible alias (preserves useFlattenAll consumers). */
export function useAgentCommand() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<AgentCommandResult | null>(null);

  const send = useCallback(
    async (commandType: string, symbol: string | null = null): Promise<AgentCommandResult> => {
      setIsRunning(true);
      setResult(null);
      const r = await enqueueCommand(commandType, symbol);
      setIsRunning(false);
      setResult(r);
      return r;
    },
    [],
  );

  const flattenAll = useCallback(
    () => send('flatten_all', null),
    [send],
  );

  const cancelOrders = useCallback(
    () => send('cancel_orders', null),
    [send],
  );

  const flattenSymbol = useCallback(
    (symbol: string) => send('flatten_symbol', symbol.trim().toUpperCase() || null),
    [send],
  );

  return { send, flattenAll, cancelOrders, flattenSymbol, isRunning, result };
}
