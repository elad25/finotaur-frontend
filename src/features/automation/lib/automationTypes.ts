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

// ── automation_copier_route_targets ──────────────────────────────────────────
export interface CopierRouteTarget {
  id: string;
  route_id: string;
  destination_connection_id: string;
  scale_ratio: number;
  max_contracts: number | null;
  is_active: boolean;
}

/** Shape accepted by the upsert RPC for each target. */
export interface CopierRouteTargetInput {
  destination_connection_id: string;
  scale_ratio: number;
  max_contracts: number | null;
  is_active: boolean;
}

// ── automation_copier_routes ─────────────────────────────────────────────────
export interface CopierRoute {
  id: string;
  user_id: string;
  source_connection_id: string;
  label: string;
  symbol_filter: string[];
  copy_opens: boolean;
  copy_closes: boolean;
  reverse: boolean;
  is_active: boolean;
  /** Populated by select with nested automation_copier_route_targets(*) */
  automation_copier_route_targets?: CopierRouteTarget[];
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
