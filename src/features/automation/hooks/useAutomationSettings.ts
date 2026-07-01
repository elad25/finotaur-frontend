// src/features/automation/hooks/useAutomationSettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Get + upsert automation_settings (one row per user).
// Follows the canonical useTimedQuery + mutation + toast pattern from
// useBrokerConnections.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTimedQuery } from '@/hooks/useTimedQuery';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';
import type { AutomationSettings } from '../lib/automationTypes';

// Stable default so callers don't get undefined on first render.
// master_enabled defaults to TRUE to match the backend's COALESCE(master_enabled, true)
// behaviour: when no settings row exists yet, the agent IS enabled from the server's
// perspective. Showing the toggle as OFF while the agent is ON is misleading.
const DEFAULT_SETTINGS: Omit<AutomationSettings, 'user_id' | 'updated_at'> = {
  master_enabled: true,
  kill_switch_engaged: false,
};

const queryKey = (userId: string) => ['automation', 'settings', userId] as const;

async function fetchSettings(userId: string): Promise<AutomationSettings | null> {
  const { data, error } = await supabase
    .from('automation_settings')
    .select('user_id,master_enabled,kill_switch_engaged,updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error?.code === '42P01') return null; // table missing — defensive
  if (error) throw error;
  return data as AutomationSettings | null;
}

export function useAutomationSettings() {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useTimedQuery({
    queryKey: queryKey(userId ?? ''),
    queryFn: () => fetchSettings(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Resolved settings: DB row or safe defaults.
  const settings: AutomationSettings = data ?? {
    user_id: userId ?? '',
    updated_at: new Date().toISOString(),
    ...DEFAULT_SETTINGS,
  };

  const invalidate = useCallback(() => {
    if (!userId) return;
    qc.invalidateQueries({ queryKey: ['automation', 'settings', userId] });
  }, [userId, qc]);

  /**
   * Upsert automation_settings on conflict of user_id (PK).
   * Partial updates: pass only the fields you want to change.
   */
  const upsert = useCallback(
    async (patch: Partial<Pick<AutomationSettings, 'master_enabled' | 'kill_switch_engaged'>>) => {
      if (!userId) return { success: false };

      const { error: e } = await supabase
        .from('automation_settings')
        .upsert(
          { user_id: userId, ...settings, ...patch, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );

      if (e) {
        toast.error('Failed to save automation settings');
        return { success: false, error: e.message };
      }
      invalidate();
      toast.success('Automation settings saved');
      return { success: true };
    },
    [userId, settings, invalidate],
  );

  return {
    settings,
    isLoading,
    isError,
    error,
    refetch,
    upsert,
    invalidate,
  };
}
