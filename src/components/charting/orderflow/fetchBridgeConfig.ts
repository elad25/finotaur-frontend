// src/components/charting/orderflow/fetchBridgeConfig.ts
// Resolves the current user's paired NinjaTrader agent's LOCAL bridge
// connection info (port + secret) for nt8Bridge.ts's connectNt8Bridge().
//
// Least-new-surface choice: reads straight off `automation_agent_devices`
// (same table src/features/automation/hooks/useAgentDevices.ts already
// queries for the Copy Trade device list), extended with the `bridge_port`
// / `bridge_secret` columns (see the automation-bridge-fields migration).
// RLS (`automation_agent_devices_owner`, auth.uid() = user_id) is the
// entire access boundary here — no explicit user_id filter is needed (and
// deliberately not added: this always resolves the ACTUAL signed-in user's
// own device, never an admin's impersonated view, which is correct — you
// can only bridge to a NinjaTrader instance running on the browser's own
// machine).
//
// `bridge_secret` is a distinct credential from the device's
// `device_token` (used to authenticate the desktop agent to the
// automation-agent edge function) — it exists ONLY to let the browser
// authenticate to the agent's LOCAL WebSocket server. Never logged.

import { supabase } from '@/lib/supabase';

export interface Nt8BridgeDeviceConfig {
  port: number;
  token: string;
  online: boolean;
  deviceName: string | null;
}

/** Mirrors useAgentDevices.ts's deriveIsOnline: online only if status==='online' AND heartbeat <=90s old. */
function isOnline(status: string, lastHeartbeatAt: string | null): boolean {
  if (status !== 'online') return false;
  if (!lastHeartbeatAt) return false;
  return Date.now() - new Date(lastHeartbeatAt).getTime() <= 90_000;
}

/**
 * Returns the bridge config for the user's most-recently-active paired
 * NinjaTrader agent, or null when no device has completed pairing yet
 * (bridge_secret not yet set) — the caller (Nt8ConnectPanel) shows a
 * "pair your agent" prompt in that case instead of a "Connect" button.
 */
export async function fetchBridgeConfig(): Promise<Nt8BridgeDeviceConfig | null> {
  const { data, error } = await supabase
    .from('automation_agent_devices')
    .select('device_name,platform,bridge_port,bridge_secret,status,last_heartbeat_at')
    .eq('platform', 'ninjatrader')
    .not('bridge_secret', 'is', null)
    .order('last_heartbeat_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  // 42P01 = table not migrated yet; 42703 = bridge_port/bridge_secret
  // columns not migrated yet (see the automation-bridge-fields migration
  // file) — both defensive: no paired device is resolvable either way.
  if (error?.code === '42P01' || error?.code === '42703') return null;
  if (error || !data) return null;
  if (!data.bridge_port || !data.bridge_secret) return null;

  return {
    port: data.bridge_port as number,
    token: data.bridge_secret as string,
    online: isOnline(data.status as string, data.last_heartbeat_at as string | null),
    deviceName: (data.device_name as string | null) ?? null,
  };
}
