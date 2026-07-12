// src/features/automation/lib/automationTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types for the Automation module.
// These mirror the DB schema (automation_settings, automation_risk_rules,
// automation_copier_routes, automation_copier_route_targets) exactly.
// DO NOT add business logic here — this file is types-only.
// ─────────────────────────────────────────────────────────────────────────────

// ── automation_settings (one row per user) ────────────────────────────────────
export interface AutomationSettings {
  user_id: string;
  master_enabled: boolean;
  kill_switch_engaged: boolean;
  updated_at: string;
}

// ── automation_risk_rules ─────────────────────────────────────────────────────
export interface AutomationRiskRule {
  id: string;
  user_id: string;
  /** null = global default; set = scoped to a specific broker_connection */
  broker_connection_id: string | null;
  label: string;
  daily_loss_limit_usd: number | null;
  max_contracts: number | null;
  max_position_usd: number | null;
  max_trades_per_day: number | null;
  tilt_loss_streak: number | null;
  tilt_cooldown_minutes: number | null;
  enforce: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Journal account identity (used by the copier picker) ─────────────────────
// Mirrors the tradeable-account universe from usePortfolios(), normalized to
// the account-based fields the copier RPC now expects.
export interface JournalAccount {
  account_id: string;   // String(tradovate_account_id)
  account_name: string;
  broker: string;       // e.g. 'tradovate'
  environment: string | null; // 'live' | 'demo' | null
  label?: string;       // connection_label (e.g. "Lucid", "MFFU")
}

// ── automation_copier_route_targets ──────────────────────────────────────────
export interface CopierRouteTarget {
  id: string;
  route_id: string;
  /** @deprecated — nullable in DB; prefer destination_account_id */
  destination_connection_id?: string | null;
  destination_account_id: string;
  destination_account_name: string;
  destination_broker: string;
  destination_environment: string | null;
  scale_ratio: number;
  max_contracts: number | null;
  is_active: boolean;
  cross_to_micro: boolean;
}

/** Shape accepted by the upsert RPC p_targets array for each target. */
export interface CopierRouteTargetInput {
  /** @deprecated — nullable in DB; prefer destination_account_id */
  destination_connection_id?: string | null;
  destination_account_id: string;
  destination_account_name: string;
  destination_broker: string;
  destination_environment: string | null;
  scale_ratio: number;
  max_contracts: number | null;
  is_active: boolean;
  cross_to_micro: boolean;
}

// ── automation_copier_routes ─────────────────────────────────────────────────
export interface CopierRoute {
  id: string;
  user_id: string;
  /** @deprecated — nullable in DB; prefer source_account_id */
  source_connection_id?: string | null;
  source_account_id: string;
  source_account_name: string;
  source_broker: string;
  source_environment: string | null;
  label: string;
  symbol_filter: string[];
  copy_opens: boolean;
  copy_closes: boolean;
  reverse: boolean;
  is_active: boolean;
  /** Populated by select with nested automation_copier_route_targets(*) */
  automation_copier_route_targets?: CopierRouteTarget[];
}

// ── automation_agent_devices ─────────────────────────────────────────────────

export type DeviceStatus = 'unpaired' | 'online' | 'offline' | 'error';

export interface AutomationAgentDevice {
  id: string;
  user_id: string;
  device_name: string;
  platform: string | null;
  pairing_code: string | null;
  pairing_code_expires_at: string | null;
  device_token_hash: string | null;
  status: DeviceStatus;
  last_heartbeat_at: string | null;
  agent_version: string | null;
  created_at: string;
  updated_at: string;
  /**
   * NT8 market-data bridge fields (see nt8Bridge.ts / fetchBridgeConfig.ts).
   * `bridge_port` — the local WS port the desktop agent's bridge is
   * listening on (heartbeat-reported, may drift 24888-24892 on port
   * conflict). `bridge_secret` — a distinct credential from
   * `device_token_hash` above: it authenticates the BROWSER to the agent's
   * local WebSocket server, never the agent to Supabase. Both null until
   * the agent has completed at least one config/heartbeat round-trip after
   * pairing.
   */
  bridge_port: number | null;
  bridge_secret: string | null;
  /** Derived client-side: status==='online' AND last_heartbeat_at within 90s. */
  isOnline?: boolean;
}

// ── Risk Monitor ─────────────────────────────────────────────────────────────

export type RiskAlertType =
  | 'daily_loss'
  | 'max_contracts'
  | 'max_trades'
  | 'tilt_streak';

export type RiskAlertStatus = 'ok' | 'warning' | 'breach';

export interface RiskAlert {
  /** Which risk dimension this alert covers. */
  type: RiskAlertType;
  /** ok = within normal bounds; warning = ≥80%; breach = ≥100%. */
  status: RiskAlertStatus;
  /** Current measured value (e.g. realized P&L, open contracts). */
  current: number;
  /** The configured limit that current is measured against. */
  limit: number;
  /** Human-readable description, e.g. "Daily loss: -$450 / -$500 limit". */
  message: string;
  /** The rule that produced this alert. */
  ruleId: string;
  ruleLabel: string;
}
