// src/lib/brokers/connectionLabel.ts
// ──────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for a broker connection's display label.
// Both the "Manage Connections" modal and the "Broker Connections"
// picker MUST use resolveConnectionLabel so they never disagree.
//
// Priority: user-given connection_name → detected prop-firm →
//           broker config displayName → humanised broker key.
// ──────────────────────────────────────────────────────────────
import { BROKER_CONFIGS, type BrokerName, type BrokerConnection } from '@/lib/brokers/types';
import { firmKey, deriveFirmKey, FIRM_LABEL } from '@/components/journal/accountGrouping';

// Unified prop-firm detector. Returns a display label for a Tradovate
// account/portfolio name, or null when no known firm keyword matches.
// This is the ONE detector; do not re-implement firm regexes elsewhere.
export function detectPropFirmLabel(name: string | null | undefined): string | null {
  const n = (name ?? '').toUpperCase();
  if (!n) return null;
  if (n.includes('APEX')) return 'Apex';
  if (n.includes('MFFU') || n.includes('MYFUNDEDFUTURES') || n.startsWith('MFF')) return 'MyFundedFutures';
  if (n.startsWith('TST') || n.includes('TOPSTEP')) return 'Topstep';
  if (n.includes('EARN2TRADE') || n.startsWith('E2T')) return 'Earn2Trade';
  if (n.includes('BULENOX')) return 'Bulenox';
  if (n.includes('TRADEDAY')) return 'TradeDay';
  if (n.includes('UPROFIT')) return 'Uprofit';
  if (n.includes('TAKEPROFIT') || n.includes('TAKE PROFIT')) return 'Take Profit';
  return null;
}

// Canonical label for a connection. connection_name always wins when set.
export function resolveConnectionLabel(conn: BrokerConnection): string {
  const named = conn.connection_name?.trim();
  if (named) return named;
  if (conn.broker === 'tradovate' || conn.broker === 'ninja_trader') {
    const firm = detectPropFirmLabel(conn.account_name);
    if (firm) return firm;
    return conn.broker === 'ninja_trader' ? 'NinjaTrader' : 'Tradovate';
  }
  const cfg = BROKER_CONFIGS[conn.broker as BrokerName];
  if (cfg) return cfg.displayName;
  return conn.broker.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ── Account-derived connection identity ─────────────────────────────────────
// The account-derived firm (from actual account names) is the truth; the
// user-given connection_name is a secondary alias, surfaced with a mismatch
// warning when it implies a different firm than the accounts.
export interface ConnectionIdentity {
  label: string;
  alias?: string;
  mismatch: boolean;
}

// accountNames = the names of the portfolios linked to this connection.
export function resolveConnectionIdentity(conn: BrokerConnection, accountNames: string[]): ConnectionIdentity {
  // Non-tradovate brokers keep their existing name-first label — no accounts
  // to derive a firm from.
  if (conn.broker !== 'tradovate' && conn.broker !== 'ninja_trader') {
    return { label: resolveConnectionLabel(conn), mismatch: false };
  }
  const dk = accountNames.length ? deriveFirmKey(accountNames.map(name => ({ name }))) : 'tradovate';
  const label = FIRM_LABEL[dk];
  const name = conn.connection_name?.trim();
  const nameKey = firmKey(name);
  const mismatch = !!name && nameKey !== 'tradovate' && nameKey !== dk;
  const alias = name && name.toUpperCase() !== label.toUpperCase() ? name : undefined;
  return { label, alias, mismatch };
}
