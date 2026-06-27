// src/features/automation/hooks/useAgentDevices.ts
// ─────────────────────────────────────────────────────────────────────────────
// List, pair, and unpair automation_agent_devices.
// Follows the canonical useTimedQuery + mutation + toast pattern.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTimedQuery } from '@/hooks/useTimedQuery';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';
import type { AutomationAgentDevice } from '../lib/automationTypes';

/** A device is considered online only if status==='online' AND last heartbeat ≤90s ago. */
function deriveIsOnline(device: AutomationAgentDevice): boolean {
  if (device.status !== 'online') return false;
  if (!device.last_heartbeat_at) return false;
  const ageMs = Date.now() - new Date(device.last_heartbeat_at).getTime();
  return ageMs <= 90_000;
}

const queryKey = (userId: string) => ['automation', 'agent_devices', userId] as const;

async function fetchDevices(userId: string): Promise<AutomationAgentDevice[]> {
  const { data, error } = await supabase
    .from('automation_agent_devices')
    .select(
      'id,user_id,device_name,platform,pairing_code,pairing_code_expires_at,device_token_hash,status,last_heartbeat_at,agent_version,created_at,updated_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error?.code === '42P01') return []; // table not yet migrated — defensive
  if (error) throw error;

  return ((data ?? []) as AutomationAgentDevice[]).map((d) => ({
    ...d,
    isOnline: deriveIsOnline(d),
  }));
}

export function useAgentDevices() {
  const { id: userId } = useEffectiveUser();
  const qc = useQueryClient();

  const { data: devices = [], isLoading, isError, error, refetch } = useTimedQuery({
    queryKey: queryKey(userId ?? ''),
    queryFn: () => fetchDevices(userId!),
    enabled: !!userId,
    staleTime: 15_000,   // short — device status changes frequently
    gcTime: 2 * 60_000,
  });

  const invalidate = useCallback(() => {
    if (!userId) return;
    qc.invalidateQueries({ queryKey: ['automation', 'agent_devices', userId] });
  }, [userId, qc]);

  /**
   * Call the RPC to generate a pairing code for a new device.
   * Returns {device_id, pairing_code, expires_at} or throws on error.
   */
  const generatePairingCode = useCallback(
    async (deviceName?: string): Promise<{ device_id: string; pairing_code: string; expires_at: string }> => {
      if (!userId) throw new Error('Not authenticated');

      const name = (deviceName?.trim() || 'My Agent').slice(0, 80);

      const { data, error: e } = await supabase.rpc('automation_generate_pairing_code', {
        p_device_name: name,
      });

      if (e) {
        if (e.message?.includes('subscription_required')) {
          throw new Error('Trade Copier requires a Premium subscription.');
        }
        throw new Error(e.message);
      }

      // supabase-js returns an array for RPCs that RETURN TABLE
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.device_id || !row?.pairing_code) {
        throw new Error('Invalid response from pairing code RPC');
      }

      invalidate();
      return {
        device_id: row.device_id as string,
        pairing_code: row.pairing_code as string,
        expires_at: row.expires_at as string,
      };
    },
    [userId, invalidate],
  );

  /**
   * Delete the device row (RLS ensures owner-only).
   * Invalidates the list query on success.
   */
  const unpairDevice = useCallback(
    async (id: string): Promise<{ success: boolean }> => {
      if (!userId) return { success: false };

      const { error: e } = await supabase
        .from('automation_agent_devices')
        .delete()
        .eq('id', id);

      if (e) {
        toast.error('Failed to unpair device');
        return { success: false };
      }

      invalidate();
      toast.success('Device unpaired');
      return { success: true };
    },
    [userId, invalidate],
  );

  return {
    devices,
    isLoading,
    isError,
    error,
    refetch,
    generatePairingCode,
    unpairDevice,
    invalidate,
  };
}
