// src/features/automation/hooks/useAgentCommands.ts
// ─────────────────────────────────────────────────────────────────────────────
// Enqueue customer-initiated emergency commands to the desktop agent via RPC.
// NinjaTrader §1-compliant: ONLY fires when the user clicks a button —
// never auto-triggered from any logic.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type AgentCommandType = 'flatten_all' | 'flatten_symbol' | 'cancel_orders';

/** Known Postgres error messages from automation_enqueue_command. */
const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: 'You must be logged in to send commands.',
  invalid_command_type: 'Invalid command type.',
  symbol_required: 'A symbol is required for flatten_symbol commands.',
  device_not_owned: 'That device does not belong to your account.',
  no_paired_devices: 'No desktop agent is paired. Pair a device first.',
};

function friendlyError(raw: string): string {
  // Postgres RAISE exceptions surface as "message" in the error object.
  // Match known codes; fall back to the raw message.
  for (const [key, msg] of Object.entries(ERROR_MESSAGES)) {
    if (raw.toLowerCase().includes(key)) return msg;
  }
  return raw || 'Failed to send command to agent.';
}

export function useAgentCommands() {
  const [isSending, setIsSending] = useState(false);

  /**
   * Enqueue a command to ALL the user's paired devices (p_device_id = null).
   * Returns the number of devices the command was enqueued to.
   * Throws on error (caller should handle/toast as needed).
   */
  const enqueueCommand = useCallback(
    async (
      commandType: AgentCommandType,
      opts?: { symbol?: string },
    ): Promise<number> => {
      setIsSending(true);
      try {
        const { data, error } = await supabase.rpc('automation_enqueue_command', {
          p_command_type: commandType,
          p_symbol: opts?.symbol ?? null,
          p_device_id: null, // null = send to all the user's paired devices
        });

        if (error) {
          const msg = friendlyError(error.message);
          toast.error(msg);
          throw new Error(msg);
        }

        const deviceCount = (data as number) ?? 0;
        return deviceCount;
      } finally {
        setIsSending(false);
      }
    },
    [],
  );

  return { enqueueCommand, isSending };
}
