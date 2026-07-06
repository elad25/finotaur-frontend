// src/utils/demoCopierData.ts
// ─────────────────────────────────────────────────────────────────────────────
// Deterministic (no Math.random) demo data for the Copy Trading dashboard,
// mirroring the pattern in demoJournalData.ts. Every generator returns the
// EXACT type its real hook counterpart returns, built from a single shared
// account roster so names/ids stay internally consistent across connections,
// portfolios, routes, snapshots, and events.
// ─────────────────────────────────────────────────────────────────────────────

import dayjs from 'dayjs';
import type { BrokerConnection } from '@/lib/brokers/types';
import type { Portfolio } from '@/hooks/usePortfolios';
import type { CopierRoute } from '@/features/automation/lib/automationTypes';
import type {
  AgentAccountSnapshot,
  AgentPosition,
} from '@/features/automation/hooks/useAgentAccountSnapshots';
import type { AccountRiskSummary } from '@/features/automation/hooks/useAccountRiskSummaries';
import type { AutomationEvent } from '@/features/automation/hooks/useAutomationEvents';

// ── Seeded PRNG — deterministic pseudo-random in [0,1), sine-based, no ──────
// Math.random. Mirrors utils/demoJournalData.ts exactly so the preview looks
// identical every render/session.
function rand(i: number, salt = 1): number {
  const x = Math.sin((i + 1) * 12.9898 * salt + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ── Canonical account roster — single source of truth so every generator ───
// below stays internally consistent (same names/ids everywhere).
const DEMO_USER_ID = 'demo-user';
const DEMO_CONNECTION_ID_LIVE = 'demo-conn-tradovate-live';
const DEMO_CONNECTION_ID_EVAL = 'demo-conn-apex-eval';

type RosterRole = 'leader' | 'follower';

interface RosterAccount {
  /** Stable synthetic id — reused as portfolio id + snapshot account_name key. */
  id: string;
  accountId: string; // Tradovate-style numeric account id (string)
  accountName: string;
  role: RosterRole;
  broker: 'tradovate';
  connectionId: string;
  connectionName: string;
  environment: 'live' | 'demo';
  balance: number;
  dayPnl: number;
  symbol: 'ES' | 'NQ' | 'MES' | 'MNQ';
  positionQty: number; // signed — positive = long, negative = short, 0 = flat
  avgPrice: number;
  dailyLossLimitUsd: number;
  maxContracts: number;
}

const ROSTER: RosterAccount[] = [
  {
    id: 'demo-acct-leader',
    accountId: '9001001',
    accountName: 'Master — Live',
    role: 'leader',
    broker: 'tradovate',
    connectionId: DEMO_CONNECTION_ID_LIVE,
    connectionName: 'Tradovate Live',
    environment: 'live',
    balance: 52480.32,
    dayPnl: 420.5,
    symbol: 'ES',
    positionQty: 2,
    avgPrice: 5312.5,
    dailyLossLimitUsd: 1500,
    maxContracts: 6,
  },
  {
    id: 'demo-acct-eval-50k',
    accountId: '9002001',
    accountName: 'Eval 50K',
    role: 'follower',
    broker: 'tradovate',
    connectionId: DEMO_CONNECTION_ID_EVAL,
    connectionName: 'Apex Eval',
    environment: 'demo',
    balance: 50895.1,
    dayPnl: -180.25,
    symbol: 'NQ',
    positionQty: -1,
    avgPrice: 18512.75,
    dailyLossLimitUsd: 1000,
    maxContracts: 3,
  },
  {
    id: 'demo-acct-eval-150k',
    accountId: '9002002',
    accountName: 'Eval 150K',
    role: 'follower',
    broker: 'tradovate',
    connectionId: DEMO_CONNECTION_ID_EVAL,
    connectionName: 'Apex Eval',
    environment: 'demo',
    balance: 151240.8,
    dayPnl: 95.0,
    symbol: 'MES',
    positionQty: 4,
    avgPrice: 5311.0,
    dailyLossLimitUsd: 3000,
    maxContracts: 10,
  },
  {
    id: 'demo-acct-pa-micro',
    accountId: '9001002',
    accountName: 'PA — Micro',
    role: 'follower',
    broker: 'tradovate',
    connectionId: DEMO_CONNECTION_ID_LIVE,
    connectionName: 'Tradovate Live',
    environment: 'live',
    balance: 24610.45,
    dayPnl: 62.75,
    symbol: 'MNQ',
    positionQty: 0,
    avgPrice: 0,
    dailyLossLimitUsd: 500,
    maxContracts: 4,
  },
];

const LEADER = ROSTER.find((a) => a.role === 'leader')!;
const FOLLOWERS = ROSTER.filter((a) => a.role === 'follower');

// ── 1. useBrokerConnections → getDemoBrokerConnections ─────────────────────

export function getDemoBrokerConnections(): BrokerConnection[] {
  const now = dayjs();
  return [
    {
      id: DEMO_CONNECTION_ID_LIVE,
      user_id: DEMO_USER_ID,
      broker: 'tradovate',
      status: 'connected',
      is_active: true,
      purpose: 'copier',
      account_id: LEADER.accountId,
      account_name: LEADER.accountName,
      environment: 'live',
      auth_method: 'oauth',
      connection_name: 'Tradovate Live',
      connected_at: now.subtract(41, 'day').toISOString(),
      disconnected_at: null,
      last_sync_at: now.subtract(4, 'second').toISOString(),
      last_successful_sync_at: now.subtract(4, 'second').toISOString(),
      error_count: 0,
      last_error: null,
      last_error_at: null,
      token_expires_at: now.add(30, 'day').toISOString(),
      connection_data: null,
      created_at: now.subtract(41, 'day').toISOString(),
      updated_at: now.subtract(4, 'second').toISOString(),
    },
    {
      id: DEMO_CONNECTION_ID_EVAL,
      user_id: DEMO_USER_ID,
      broker: 'tradovate',
      status: 'connected',
      is_active: true,
      purpose: 'copier',
      account_id: FOLLOWERS[0].accountId,
      account_name: 'Apex Eval',
      environment: 'demo',
      auth_method: 'oauth',
      connection_name: 'Apex Eval',
      connected_at: now.subtract(23, 'day').toISOString(),
      disconnected_at: null,
      last_sync_at: now.subtract(6, 'second').toISOString(),
      last_successful_sync_at: now.subtract(6, 'second').toISOString(),
      error_count: 0,
      last_error: null,
      last_error_at: null,
      token_expires_at: now.add(30, 'day').toISOString(),
      connection_data: null,
      created_at: now.subtract(23, 'day').toISOString(),
      updated_at: now.subtract(6, 'second').toISOString(),
    },
  ];
}

// ── 2. usePortfolios → getDemoPortfolios ────────────────────────────────────
// CopyTradingDashboard consumes `tradovatePortfolios` (source==='tradovate')
// and `brokerPortfolios` (source==='broker') out of the full portfolios list —
// every roster account here is a Tradovate account, so all rows are
// source: 'tradovate'.

export function getDemoPortfolios(): Portfolio[] {
  const now = dayjs().toISOString();
  return ROSTER.map((a) => ({
    id: a.id,
    name: a.accountName,
    description: null,
    tradovate_account_id: Number(a.accountId),
    tradovate_account_spec: null,
    environment: a.environment,
    source: 'tradovate' as const,
    credential_id: a.connectionId,
    is_active: true,
    created_at: now,
    connection_label: a.connectionName,
    kill_switch_active: false,
    kill_switch_locked_until: null,
    max_daily_loss_usd: a.dailyLossLimitUsd,
    max_position_size: null,
    max_contracts_per_trade: a.maxContracts,
    max_loss_per_trade_usd: null,
    daily_stop_loss_usd: null,
    max_weekly_loss_usd: null,
    trade_profit_target_usd: null,
    daily_profit_target_usd: null,
    weekly_profit_target_usd: null,
    risk_management_enabled: true,
    risk_breach_action: null,
  }));
}

// ── 3. useCopierRoutes → getDemoCopierRoutes ────────────────────────────────
// One active group: leader → all 3 followers, ratio 1x for the two Evals,
// a micro cross for the live PA account, symbol_filter tracking ES.

export function getDemoCopierRoutes(): CopierRoute[] {
  return [
    {
      id: 'demo-route-main',
      user_id: DEMO_USER_ID,
      source_account_id: LEADER.accountId,
      source_account_name: LEADER.accountName,
      source_broker: 'tradovate',
      source_environment: 'live',
      label: 'Master Group',
      symbol_filter: ['ES'],
      copy_opens: true,
      copy_closes: true,
      reverse: false,
      is_active: true,
      automation_copier_route_targets: [
        {
          id: 'demo-target-eval-50k',
          route_id: 'demo-route-main',
          destination_account_id: FOLLOWERS[0].accountId,
          destination_account_name: FOLLOWERS[0].accountName,
          destination_broker: 'tradovate',
          destination_environment: 'demo',
          scale_ratio: 1,
          max_contracts: FOLLOWERS[0].maxContracts,
          is_active: true,
          cross_to_micro: false,
        },
        {
          id: 'demo-target-eval-150k',
          route_id: 'demo-route-main',
          destination_account_id: FOLLOWERS[1].accountId,
          destination_account_name: FOLLOWERS[1].accountName,
          destination_broker: 'tradovate',
          destination_environment: 'demo',
          scale_ratio: 2,
          max_contracts: FOLLOWERS[1].maxContracts,
          is_active: true,
          cross_to_micro: false,
        },
        {
          id: 'demo-target-pa-micro',
          route_id: 'demo-route-main',
          destination_account_id: FOLLOWERS[2].accountId,
          destination_account_name: FOLLOWERS[2].accountName,
          destination_broker: 'tradovate',
          destination_environment: 'live',
          scale_ratio: 1,
          max_contracts: FOLLOWERS[2].maxContracts,
          is_active: true,
          cross_to_micro: true,
        },
      ],
    } satisfies CopierRoute,
  ];
}

// ── 4. useAgentAccountSnapshots → getDemoAgentSnapshots + ──────────────────
//    demoSnapshotByAccountName(name)
// Values come from the seeded roster; `capturedAt`/online freshness are
// computed at call time (per the brief) so the live dot always reads "online".

function buildPosition(a: RosterAccount, seed: number): AgentPosition[] {
  if (a.positionQty === 0) return [];
  const isLong = a.positionQty > 0;
  const openPnl = +((rand(seed, 31) - 0.3) * 180).toFixed(2);
  return [
    {
      symbol: a.symbol,
      qty: Math.abs(a.positionQty),
      isLong,
      avgPrice: a.avgPrice,
      openPnl,
    },
  ];
}

export function getDemoAgentSnapshots(): AgentAccountSnapshot[] {
  const now = new Date();
  return ROSTER.map((a, i) => {
    const positions = buildPosition(a, i);
    const openPnl = positions.reduce((sum, p) => sum + p.openPnl, 0);
    return {
      accountName: a.accountName,
      env: a.environment,
      balance: a.balance,
      dayPnl: a.dayPnl,
      dayPnlToday: a.dayPnl,
      openPnl: positions.length > 0 ? openPnl : 0,
      positions,
      qty: positions.reduce((sum, p) => sum + Math.abs(p.qty), 0),
      capturedAt: now,
      online: true,
    };
  });
}

let _snapshotCache: AgentAccountSnapshot[] | null = null;

/** Case-insensitive / trimmed lookup by account name — mirrors the real hook's helper. */
export function demoSnapshotByAccountName(name: string): AgentAccountSnapshot | undefined {
  if (!_snapshotCache) _snapshotCache = getDemoAgentSnapshots();
  const needle = name.trim().toLowerCase();
  // Recompute capturedAt/online freshness on every call (call-time timestamp),
  // while keeping balances/PnL/positions stable across the session.
  const cached = _snapshotCache.find((s) => s.accountName.trim().toLowerCase() === needle);
  if (!cached) return undefined;
  return { ...cached, capturedAt: new Date(), online: true };
}

// ── 5. useAccountRiskSummaries → getDemoAccountRiskSummaries ────────────────

export function getDemoAccountRiskSummaries(): Map<string, AccountRiskSummary> {
  const map = new Map<string, AccountRiskSummary>();
  for (const a of ROSTER) {
    map.set(a.accountId, {
      dailyLossLimitUsd: a.dailyLossLimitUsd,
      maxContracts: a.maxContracts,
    });
  }
  return map;
}

// ── 6. MirroredOrdersPanel (via useAutomationEvents) → ──────────────────────
//    getDemoMirroredOrders(): AutomationEvent[]
// 3-5 WORKING order_copy_executed / order_copy_modified events (no matching
// order_copy_cancelled for the same order_id, so MirroredOrdersPanel's
// deriveLiveOrders() keeps them all "working").

export function getDemoMirroredOrders(): AutomationEvent[] {
  const now = dayjs();
  const targets = FOLLOWERS.map((f) => ({ account: f.accountName }));
  return [
    {
      id: 'demo-order-1',
      event_type: 'order_copy_executed',
      payload: {
        order_id: 'demo-ord-ES-1',
        side: 'buy',
        order_type: 'limit',
        source_qty: 2,
        symbol: 'ES',
        limit_price: 5312.5,
        tif: 'GTC',
        per_target: targets,
      },
      created_at: now.subtract(2, 'minute').toISOString(),
      broker_connection_id: DEMO_CONNECTION_ID_LIVE,
      symbol: 'ES',
      severity: 'info',
    },
    {
      id: 'demo-order-2',
      event_type: 'order_copy_executed',
      payload: {
        order_id: 'demo-ord-NQ-1',
        side: 'sell',
        order_type: 'stop',
        source_qty: 1,
        symbol: 'NQ',
        stop_price: 18490.0,
        tif: 'GTC',
        per_target: [{ account: FOLLOWERS[0].accountName }],
      },
      created_at: now.subtract(9, 'minute').toISOString(),
      broker_connection_id: DEMO_CONNECTION_ID_EVAL,
      symbol: 'NQ',
      severity: 'info',
    },
    {
      id: 'demo-order-3',
      event_type: 'order_copy_modified',
      payload: {
        order_id: 'demo-ord-MES-1',
        side: 'buy',
        order_type: 'stoplimit',
        source_qty: 4,
        symbol: 'MES',
        limit_price: 5311.0,
        stop_price: 5309.5,
        tif: 'GTC',
        per_target: [{ account: FOLLOWERS[1].accountName }],
      },
      created_at: now.subtract(17, 'minute').toISOString(),
      broker_connection_id: DEMO_CONNECTION_ID_EVAL,
      symbol: 'MES',
      severity: 'info',
    },
    {
      id: 'demo-order-4',
      event_type: 'order_copy_executed',
      payload: {
        order_id: 'demo-ord-MNQ-1',
        side: 'buy',
        order_type: 'market',
        source_qty: 2,
        symbol: 'MNQ',
        tif: 'DAY',
        per_target: [{ account: FOLLOWERS[2].accountName }],
      },
      created_at: now.subtract(26, 'minute').toISOString(),
      broker_connection_id: DEMO_CONNECTION_ID_LIVE,
      symbol: 'MNQ',
      severity: 'info',
    },
  ];
}

// ── 7. EnforcementFeed (via useAutomationEvents) → ──────────────────────────
//    getDemoEnforcementEvents(): AutomationEvent[]
// 2-3 events matching `risk_enforced` / `order_copy_failed` shapes parsed by
// parseEnforcementEvent() in useAutomationEvents.ts.

export function getDemoEnforcementEvents(): AutomationEvent[] {
  const now = dayjs();
  return [
    {
      id: 'demo-enforce-1',
      event_type: 'risk_enforced',
      payload: {
        rule_id: 'demo-rule-daily-loss',
        rule_label: 'Eval 50K — Daily Guard',
        check: 'daily_loss',
        action: 'pause_copies',
        total_pnl: -180.25,
        threshold: -1000,
      },
      created_at: now.subtract(38, 'minute').toISOString(),
      broker_connection_id: DEMO_CONNECTION_ID_EVAL,
      symbol: null,
      severity: 'warning',
    },
    {
      id: 'demo-enforce-2',
      event_type: 'order_copy_failed',
      payload: {
        side: 'sell',
        order_type: 'stop',
        source_qty: 3,
        symbol: 'NQ',
        stop_price: 18490.0,
        per_target: [{ account: FOLLOWERS[1].accountName, reason: 'max contracts reached' }],
      },
      created_at: now.subtract(54, 'minute').toISOString(),
      broker_connection_id: DEMO_CONNECTION_ID_EVAL,
      symbol: 'NQ',
      severity: 'error',
    },
    {
      id: 'demo-enforce-3',
      event_type: 'order_copy_executed',
      payload: {
        side: 'buy',
        order_type: 'limit',
        source_qty: 2,
        symbol: 'ES',
        limit_price: 5312.5,
        tif: 'GTC',
        per_target: [{ account: FOLLOWERS[0].accountName }, { account: FOLLOWERS[1].accountName }],
      },
      created_at: now.subtract(2, 'hour').toISOString(),
      broker_connection_id: DEMO_CONNECTION_ID_LIVE,
      symbol: 'ES',
      severity: 'info',
    },
  ];
}
