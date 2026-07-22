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
  label: string;          // account-DERIVED firm identity (primary, unspoofable)
  portfolios: Portfolio[];
  userLabel?: string;     // user's connection_name, shown as secondary alias when set
  mismatch?: boolean;     // true when userLabel implies a DIFFERENT firm than the accounts
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

// ── Canonical account-derived firm identity ─────────────────────
// Distinct from detectFirmGroup: this is the unspoofable identity derived
// from ACCOUNT NAMES (never from user-entered connection_name), used to
// compute a group's display label AND to detect when a user-given name
// (connection_name) lies about which firm the accounts actually belong to.
export type FirmKey = 'apex'|'mffu'|'topstep'|'e2t'|'bulenox'|'tradeday'|'uprofit'|'takeprofit'|'personal'|'tradovate';
export const FIRM_LABEL: Record<FirmKey, string> = {
  apex:'APEX', mffu:'MFFU', topstep:'Topstep', e2t:'Earn2Trade', bulenox:'Bulenox',
  tradeday:'TradeDay', uprofit:'Uprofit', takeprofit:'Take Profit', personal:'Personal', tradovate:'Tradovate',
};
// Canonical firm detection used for BOTH account names and user-entered names.
export function firmKey(name: string | null | undefined): FirmKey {
  const n = (name ?? '').toUpperCase();
  if (!n.trim()) return 'tradovate';
  if (n.includes('APEX')) return 'apex';
  if (n.includes('MFFU') || n.includes('MYFUNDEDFUTURES') || n.startsWith('MFF')) return 'mffu';
  if (n.startsWith('TST') || n.includes('TOPSTEP')) return 'topstep';
  if (n.includes('EARN2TRADE') || n.startsWith('E2T')) return 'e2t';
  if (n.includes('BULENOX')) return 'bulenox';
  if (n.includes('TRADEDAY')) return 'tradeday';
  if (n.includes('UPROFIT')) return 'uprofit';
  if (n.includes('TAKEPROFIT') || n.includes('TAKE PROFIT')) return 'takeprofit';
  if (/^\d+$/.test(n.trim())) return 'personal';
  return 'tradovate';
}
// Dominant firm key across a group's accounts (prefers any specific firm over
// generic 'tradovate'). Accepts anything with a `name` field so callers that
// only have account names (not full Portfolio rows) can reuse it too.
export function deriveFirmKey(accounts: { name: string }[]): FirmKey {
  const counts = new Map<FirmKey, number>();
  for (const a of accounts) { const k = firmKey(a.name); counts.set(k, (counts.get(k) ?? 0) + 1); }
  let best: FirmKey = 'tradovate'; let bestCount = -1;
  for (const [k, c] of counts) { if (k === 'tradovate') continue; if (c > bestCount) { best = k; bestCount = c; } }
  return bestCount >= 0 ? best : 'tradovate';
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

    // Builds a PortfolioGroup whose label is the account-DERIVED firm identity
    // (unspoofable), carrying the user's connection_name as a secondary alias
    // and flagging a mismatch when that alias implies a different firm.
    const toGroup = (key: string, portfolios: Portfolio[]): PortfolioGroup => {
      const dk = deriveFirmKey(portfolios);
      const label = FIRM_LABEL[dk];
      let userLabel: string | undefined;
      for (const p of portfolios) {
        const l = p.connection_label?.trim();
        if (l) { userLabel = l; break; }
      }
      const nameKey = firmKey(userLabel);
      const mismatch = !!userLabel && nameKey !== 'tradovate' && nameKey !== dk;
      return { key, label, portfolios, userLabel, mismatch: mismatch || undefined };
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
