// supabase/functions/automation-agent/index.ts
// ═══════════════════════════════════════════════════════════════
// PURPOSE: Ongoing channel for the desktop automation agent —
//          config pull, heartbeat, and event ingest.
//
// Auth: device token (Authorization: Bearer <token>). verify_jwt:false;
//       token verified in-function by SHA-256 hash lookup against
//       automation_agent_devices.device_token_hash.
//
// IMPORTANT: device token never logged.
//
// Supported actions (POST body: { action, ...rest }):
//   'config'         — pull current settings/rules/routes + bump presence;
//                      response always includes pending_commands (claimed atomically)
//   'heartbeat'      — update last_heartbeat_at + status
//   'event'          — ingest an agent-emitted event into automation_events
//   'command_result' — report execution outcome for a claimed command
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sha256Hex } from '../_shared/hash.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// ─── Valid enum values ────────────────────────────────────────

const VALID_EVENT_TYPES = new Set([
  'risk_alert',
  'risk_enforced',
  'copy_executed',
  'copy_failed',
  'agent_status',
  'kill_switch',
] as const);

type EventType = 'risk_alert' | 'risk_enforced' | 'copy_executed' | 'copy_failed' | 'agent_status' | 'kill_switch';

const VALID_SEVERITIES = new Set(['info', 'warning', 'critical'] as const);
type Severity = 'info' | 'warning' | 'critical';

const VALID_STATUSES = new Set(['online', 'offline', 'error'] as const);
type DeviceStatus = 'online' | 'offline' | 'error';

// ─── Auth helper ──────────────────────────────────────────────

interface Device {
  id: string;
  user_id: string;
  status: string;
}

/**
 * Extract and verify the Bearer device token from the Authorization header.
 * Returns the device row on success, or a Response on failure (caller should return it).
 */
async function authenticateDevice(
  req: Request,
): Promise<{ device: Device } | { errorResponse: Response }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'missing_token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  // Extract token — everything after 'Bearer '.
  // IMPORTANT: token value is never logged.
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'missing_token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  const hash = await sha256Hex(token);

  const { data: device, error } = await supabaseAdmin
    .from('automation_agent_devices')
    .select('id, user_id, status')
    .eq('device_token_hash', hash)
    .maybeSingle();

  if (error || !device) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'invalid_token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  return { device: device as Device };
}

// ─── Main handler ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'method_not_allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Auth ──────────────────────────────────────────────────
  const authResult = await authenticateDevice(req);
  if ('errorResponse' in authResult) {
    return authResult.errorResponse;
  }
  const { device } = authResult;

  // ── Parse body ────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const action = body.action as string | undefined;

  // ══════════════════════════════════════════════════════════
  // action: config — pull settings/rules/routes + bump presence
  // ══════════════════════════════════════════════════════════
  if (action === 'config') {
    // Bump presence atomically in one update.
    // agent_version is only updated when provided; COALESCE preserves the existing value.
    const presenceUpdate: Record<string, unknown> = {
      last_heartbeat_at: new Date().toISOString(),
      status: 'online',
    };
    if (body.agent_version !== undefined && typeof body.agent_version === 'string') {
      presenceUpdate.agent_version = body.agent_version;
    }

    await supabaseAdmin
      .from('automation_agent_devices')
      .update(presenceUpdate)
      .eq('id', device.id);

    // Pull config — the RPC returns a jsonb object. With versioning, the agent
    // sends its last-seen config_version; if nothing changed the RPC returns a
    // tiny { unchanged:true, config_version, master_enabled, kill_switch_engaged }
    // payload instead of rebuilding the full config (scale: many users × ~60
    // connections polling frequently). Full shape otherwise:
    // { unchanged:false, config_version, settings, risk_rules, copier_routes, connections, ... }
    const knownVersion =
      typeof body.config_version === 'string' ? body.config_version : null;
    const { data: config, error: configError } = await supabaseAdmin.rpc(
      'automation_get_config',
      { p_user_id: device.user_id, p_known_version: knownVersion },
    );

    if (configError) {
      return new Response(
        JSON.stringify({ error: 'config_unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Claim any pending commands for this device atomically.
    // Commands are independent of config_version — always include them even on
    // the { unchanged:true } branch so the agent never misses a queued action.
    const { data: claimed } = await supabaseAdmin.rpc('automation_claim_commands', {
      p_device_id: device.id,
    });
    const payload = { ...(config as Record<string, unknown>), pending_commands: claimed ?? [] };

    return new Response(
      JSON.stringify(payload),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ══════════════════════════════════════════════════════════
  // action: heartbeat — update last_heartbeat_at + status
  // ══════════════════════════════════════════════════════════
  if (action === 'heartbeat') {
    const rawStatus = body.status as string | undefined;
    const resolvedStatus: DeviceStatus =
      rawStatus !== undefined && VALID_STATUSES.has(rawStatus as DeviceStatus)
        ? (rawStatus as DeviceStatus)
        : 'online';

    const heartbeatUpdate: Record<string, unknown> = {
      last_heartbeat_at: new Date().toISOString(),
      status: resolvedStatus,
    };
    if (body.agent_version !== undefined && typeof body.agent_version === 'string') {
      heartbeatUpdate.agent_version = body.agent_version;
    }

    const { error: hbError } = await supabaseAdmin
      .from('automation_agent_devices')
      .update(heartbeatUpdate)
      .eq('id', device.id);

    if (hbError) {
      return new Response(
        JSON.stringify({ error: 'heartbeat_failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ══════════════════════════════════════════════════════════
  // action: event — ingest an agent-emitted event
  // ══════════════════════════════════════════════════════════
  if (action === 'event') {
    const eventType = body.event_type as string | undefined;
    if (!eventType || !VALID_EVENT_TYPES.has(eventType as EventType)) {
      return new Response(
        JSON.stringify({ error: 'invalid_event_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const rawSeverity = body.severity as string | undefined;
    const severity: Severity =
      rawSeverity !== undefined && VALID_SEVERITIES.has(rawSeverity as Severity)
        ? (rawSeverity as Severity)
        : 'info';

    const { error: insertError } = await supabaseAdmin
      .from('automation_events')
      .insert({
        user_id:              device.user_id,
        device_id:            device.id,
        event_type:           eventType as EventType,
        severity,
        broker_connection_id: (body.broker_connection_id as string | undefined) ?? null,
        symbol:               (body.symbol as string | undefined) ?? null,
        payload:              (body.payload as Record<string, unknown> | undefined) ?? {},
      });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'event_insert_failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ══════════════════════════════════════════════════════════
  // action: command_result — report execution outcome for a claimed command
  // ══════════════════════════════════════════════════════════
  if (action === 'command_result') {
    const command_id = body.command_id as string | undefined;
    const status = body.status as string | undefined;
    const error = body.error;

    if (!command_id || typeof command_id !== 'string' || !command_id.trim()) {
      return new Response(
        JSON.stringify({ error: 'invalid_args' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (status !== 'executed' && status !== 'failed') {
      return new Response(
        JSON.stringify({ error: 'invalid_args' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Security: verify the command belongs to THIS device before completing.
    const { data: cmd } = await supabaseAdmin
      .from('automation_commands')
      .select('device_id')
      .eq('id', command_id)
      .maybeSingle();

    if (!cmd || cmd.device_id !== device.id) {
      return new Response(
        JSON.stringify({ error: 'command_not_found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { error: completeError } = await supabaseAdmin.rpc('automation_complete_command', {
      p_command_id: command_id,
      p_status:     status,
      p_error:      typeof error === 'string' ? error : null,
    });

    if (completeError) {
      return new Response(
        JSON.stringify({ error: 'command_update_failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Unknown action ────────────────────────────────────────
  return new Response(
    JSON.stringify({ error: 'unknown_action' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
