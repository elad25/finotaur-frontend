// src/components/journal/accountGrouping.ts
// ══════════════════════════════════════════════════════════════
// Shared pure functions for prop-firm grouping of Tradovate
// accounts. Consumed by AccountFilterDropdown and
// BrokerConnectionsPopover so their grouping logic stays
// byte-for-byte identical.
// ══════════════════════════════════════════════════════════════

import type { Portfolio } from '@/hooks/usePortfolios';

// ── Types ──────────────────────────────────────────────────────
export interface PortfolioGroup {
  key: string;
  label: string;          // user-given connection name (falls back to account name)
  portfolios: Portfolio[];
  userLabel?: string;     // kept for backward compat; no longer set
  mismatch?: boolean;     // kept for backward compat; no longer set
}

// ── Prop-firm detection ────────────────────────────────────────
// Returns the group key + label for a Tradovate account name.
// Evaluated in declaration order; first match wins.
export function detectFirmGroup(name: string): { key: string; label: string } {
  const n = name.toUpperCase();
  if (n.includes('APEX'))                                    return { key: 'pf_apex',    label: 'APEX' };
  if (n.includes('MFFU') || n.includes('MYFUNDEDFUTURES') || n.startsWith('MFF'))
                                                             return { key: 'pf_mffu',    label: 'MFFU' };
  if (n.startsWith('TST') || n.includes('TOPSTEP'))         return { key: 'pf_topstep', label: 'Topstep' };
  if (n.includes('EARN2TRADE') || n.startsWith('E2T'))      return { key: 'pf_e2t',     label: 'Earn2Trade' };
  if (n.includes('BULENOX'))                                 return { key: 'pf_bulenox', label: 'Bulenox' };
  if (n.includes('TRADEDAY'))                                return { key: 'pf_tradeday',label: 'TradeDay' };
  if (n.includes('UPROFIT'))                                 return { key: 'pf_uprofit', label: 'Uprofit' };
  if (n.includes('TAKEPROFIT'))                              return { key: 'pf_takeprofit', label: 'Take Profit' };
  if (/^\d+$/.test(name.trim()))                             return { key: 'personal',  label: 'Personal' };
  // Personal / individual Tradovate account
  return { key: 'tradovate', label: 'Tradovate' };
}

// ── Group builder ──────────────────────────────────────────────
// Produces an ordered list of groups:
//   prop-firm buckets (sorted by label) → generic Tradovate →
//   broker groups (by connection_id) → Manual
export function buildAccountGroups(
  tradovatePortfolios: Portfolio[],
  brokerPortfolios: Portfolio[],
  manualPortfolios: Portfolio[],
): PortfolioGroup[] {
  const result: PortfolioGroup[] = [];

  // Split tradovate portfolios by connection/firm identity. Grouping KEY logic
  // is unchanged: conn-${credential_id} when available, else detectFirmGroup(p.name).key.
  if (tradovatePortfolios.length > 0) {
    // Map: key → portfolios[] — preserves first-appearance order per bucket
    const groupMap = new Map<string, Portfolio[]>();
    for (const p of tradovatePortfolios) {
      const key = p.credential_id ? `conn-${p.credential_id}` : detectFirmGroup(p.name).key;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(p);
    }

    const toGroup = (key: string, portfolios: Portfolio[]): PortfolioGroup => {
      // Label = the user-given connection name. connection_label mirrors the
      // connection's connection_name for every credentialed portfolio (see
      // usePortfolios). No firm detection, no mismatch warning — the user
      // controls the name (Elad, 2026-07-22; reverts the #1624 firm layer).
      let label = '';
      for (const p of portfolios) {
        const l = p.connection_label?.trim();
        if (l) { label = l; break; }
      }
      if (!label) label = portfolios[0]?.name?.trim() || 'Tradovate';
      return { key, label, portfolios };
    };

    // Emit prop-firm groups (all except the generic 'tradovate' bucket) sorted by label
    const propFirmEntries = Array.from(groupMap.entries())
      .filter(([key]) => key !== 'tradovate')
      .map(([key, portfolios]) => toGroup(key, portfolios))
      .sort((a, b) => a.label.localeCompare(b.label));

    result.push(...propFirmEntries);

    // Emit the generic 'Tradovate' bucket last among tradovate-derived groups.
    if (groupMap.has('tradovate')) {
      result.push(toGroup('tradovate', groupMap.get('tradovate')!));
    }
  }

  // Group broker portfolios by broker_connection_id (fallback to portfolio id)
  const brokerGroupMap = new Map<string, Portfolio[]>();
  for (const p of brokerPortfolios) {
    const groupKey = p.broker_connection_id ?? p.id;
    if (!brokerGroupMap.has(groupKey)) {
      brokerGroupMap.set(groupKey, []);
    }
    brokerGroupMap.get(groupKey)!.push(p);
  }
  for (const [connectionKey, portfs] of brokerGroupMap) {
    const first = portfs[0];
    const groupLabel = first.connection_label ?? first.name;
    result.push({ key: `broker-${connectionKey}`, label: groupLabel, portfolios: portfs });
  }

  if (manualPortfolios.length > 0) {
    result.push({ key: 'manual', label: 'Manual', portfolios: manualPortfolios });
  }

  return result;
}
