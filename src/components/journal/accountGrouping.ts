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
  label: string;
  portfolios: Portfolio[];
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

  // Split tradovate portfolios by detected firm identity
  if (tradovatePortfolios.length > 0) {
    // Map: key → { label, portfolios[] } — preserves first-appearance order per bucket
    const firmMap = new Map<string, { label: string; portfolios: Portfolio[] }>();
    for (const p of tradovatePortfolios) {
      const { key, label } = detectFirmGroup(p.name);
      if (!firmMap.has(key)) {
        firmMap.set(key, { label, portfolios: [] });
      }
      firmMap.get(key)!.portfolios.push(p);
    }

    // Emit prop-firm groups (all except the generic 'tradovate' bucket) sorted by label
    const propFirmEntries = Array.from(firmMap.entries())
      .filter(([key]) => key !== 'tradovate')
      .sort(([, a], [, b]) => a.label.localeCompare(b.label));

    for (const [key, { label, portfolios }] of propFirmEntries) {
      result.push({ key, label, portfolios });
    }

    // Emit the generic 'Tradovate' bucket last among tradovate-derived groups.
    // Prefer the user's custom connection name when the bucket's accounts share
    // a single non-empty connection_label; else fall back to 'Tradovate'.
    if (firmMap.has('tradovate')) {
      const { label, portfolios } = firmMap.get('tradovate')!;
      const customLabels = new Set(
        portfolios
          .map(p => p.connection_label?.trim())
          .filter((l): l is string => Boolean(l)),
      );
      const groupLabel = customLabels.size === 1 ? [...customLabels][0] : label;
      result.push({ key: 'tradovate', label: groupLabel, portfolios });
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
