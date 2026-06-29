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
export type RiskBreachAction = 'pause_copies' | 'stop_copies' | 'close_lock';

export interface AutomationRiskRule {
  id: string;
  user_id: string;
  /** null = global default; set = scoped to a specific broker_connection (legacy) */
  broker_connection_id: string | null;
  /** Tradovate account_id (as text); null = global default. Used by NT8 agent for account resolution. */
  account_id: string | null;
  /** Portfolio display name the NT8 agent matches by; null = global default. */
  account_name: string | null;
  label: string;
  // ── Loss limits ────────────────────────────────────────────────────────────
  daily_loss_limit_usd: number | null;
  max_loss_per_trade_usd: number | null;
  max_weekly_loss_usd: number | null;
  // ── Profit targets ─────────────────────────────────────────────────────────
  /** Per-position profit target. Note: currently inert in the agent (per-position P&L = 0). */
  trade_profit_target_usd: number | null;
  daily_profit_target_usd: number | null;
  weekly_profit_target_usd: number | null;
  // ── Position / volume limits ───────────────────────────────────────────────
  /** Max open contracts per instrument. */
  max_contracts: number | null;
  /** Max total open contracts across the account. */
  max_position_size: number | null;
  max_position_usd: number | null;
  max_trades_per_day: number | null;
  // ── Tilt protection ────────────────────────────────────────────────────────
  tilt_loss_streak: number | null;
  tilt_cooldown_minutes: number | null;
  // ── Breach action ──────────────────────────────────────────────────────────
  /** What the agent does on breach. Default: 'pause_copies'. */
  risk_breach_action: RiskBreachAction | null;
  enforce: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Shared account identity (used by AccountPicker and copier types) ─────────
export interface SelectedAccount {
  account_id: string;
  account_name: string;
  broker: string | null;
  environment: string | null;
}

// ── automation_copier_route_targets ──────────────────────────────────────────
export interface CopierRouteTarget {
  id: string;
  route_id: string;
  destination_account_id: string;
  destination_account_name: string;
  destination_broker: string | null;
  destination_environment: string | null;
  scale_ratio: number;
  max_contracts: number | null;
  cross_to_micro: boolean;
  is_active: boolean;
}

/** Shape accepted by the upsert RPC for each target. */
export interface CopierRouteTargetInput {
  destination_account_id: string;
  destination_account_name: string;
  destination_broker: string | null;
  destination_environment: string | null;
  scale_ratio: number;
  max_contracts: number | null;
  cross_to_micro: boolean;
  is_active: boolean;
}

// ── automation_copier_routes ─────────────────────────────────────────────────
export interface CopierRoute {
  id: string;
  user_id: string;
  source_account_id: string;
  source_account_name: string;
  source_broker: string | null;
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
