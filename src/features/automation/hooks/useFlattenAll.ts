// src/features/automation/hooks/useFlattenAll.ts
// ─────────────────────────────────────────────────────────────────────────────
// Sends a customer-initiated "flatten_all" command to every online desktop
// agent device the user owns via the automation_enqueue_command RPC.
//
// The RPC is user-scoped (RLS via auth.uid). It inserts a pending command row
// for EVERY online device and returns the inserted rows as SETOF. If the
// returned array is empty the user has no online agent devices.
//
// Nothing executes server-side — the local NinjaScript agent polls for pending
// commands, executes them locally (close all positions + cancel working orders),
// and reports back.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type FlattenResult =
  | { status: 'sent'; devices: number }
  | { status: 'no_agent' }
  | { status: 'error'; message: string };

export function useFlattenAll() {
  const [isFlattening, setIsFlattening] = useState(false);
  const [result, setResult] = useState<FlattenResult | null>(null);

  const flattenAll = useCallback(async (): Promise<FlattenResult> => {
    setIsFlattening(true);
    setResult(null);

    const { data, error } = await supabase.rpc('automation_enqueue_command', {
      p_command_type: 'flatten_all',
      p_symbol: null,
    });

    setIsFlattening(false);

    if (error) {
      const r: FlattenResult = { status: 'error', message: error.message };
      setResult(r);
      return r;
    }

    // RPC returns SETOF — data is an array of inserted rows (or [] if no online agent).
    const rows = Array.isArray(data) ? data : [];
    const r: FlattenResult =
      rows.length === 0
        ? { status: 'no_agent' }
        : { status: 'sent', devices: rows.length };

    setResult(r);
    return r;
  }, []);

  return { flattenAll, isFlattening, result };
}
