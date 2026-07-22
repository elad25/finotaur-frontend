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
