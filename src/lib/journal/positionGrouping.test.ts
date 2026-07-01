// Regression test for the copier micro+mini "double trade" bug.
//
// Background (2026-06-30): the Copier fans ONE trading decision across N
// accounts and translates mini -> micro (e.g. NQ -> MNQ). So a single short on
// NQ becomes 1 mini master row (NQU6) + many micro copy rows (MNQU6) in the
// `trades` table. The journal MUST collapse those copy rows back into ONE
// logical decision in BOTH the "All Accounts" (sum $) and "Trader" (average $)
// scopes. Before PR #1168/#1169 the grouping keyed on the exact `symbol`, so
// micro (MNQU6) and mini (NQU6) of the same decision showed as TWO rows — the
// "double trade" Elad reported. The fix groups by contract-family root
// (MNQ -> NQ) + net-flat interval overlap. This test pins the real production
// scenario so that merge can never silently regress (there is no other test
// covering positionGrouping / tradeAggregation / traderNormalization).

import { describe, it, expect } from 'vitest';
import { contractRoot, clusterByOverlap, displaySymbol } from '@/lib/journal/positionGrouping';
import { aggregateCopiedTrades } from '@/lib/tradeAggregation';
import { normalizeTraderTrades } from '@/lib/journal/traderNormalization';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// One short decision (NQ) fanned by the copier across 4 accounts: 1 mini
// (NQU6) master + 3 micro (MNQU6) copies. All open within ~0.4s and close
// together, so their [open_at, close_at] intervals overlap = one net-flat
// position. Values mirror Elad's real 2026-06-30 10:00 NY short.
const SHORT_DECISION: Row[] = [
  { id: 'mini-master', symbol: 'NQU6',  side: 'SHORT', open_at: '2026-06-30T14:00:41.923Z', close_at: '2026-06-30T14:03:08.202Z', pnl: -710, quantity: 1, entry_price: 30325.5,  stop_price: 30356.75, multiplier: 20, partial_entries: [{ price: 30325.5,  quantity: 1 }], portfolio_id: 'acct-A' },
  { id: 'micro-1',     symbol: 'MNQU6', side: 'SHORT', open_at: '2026-06-30T14:00:42.271Z', close_at: '2026-06-30T14:03:08.070Z', pnl: -278, quantity: 4, entry_price: 30325.25, stop_price: 30356.75, multiplier: 2,  partial_entries: [{ price: 30325.25, quantity: 4 }], portfolio_id: 'acct-B' },
  { id: 'micro-2',     symbol: 'MNQU6', side: 'SHORT', open_at: '2026-06-30T14:00:42.273Z', close_at: '2026-06-30T14:03:08.070Z', pnl: -360, quantity: 5, entry_price: 30324,    stop_price: 30356.75, multiplier: 2,  partial_entries: [{ price: 30324,    quantity: 5 }], portfolio_id: 'acct-C' },
  { id: 'micro-3',     symbol: 'MNQU6', side: 'SHORT', open_at: '2026-06-30T14:00:42.276Z', close_at: '2026-06-30T14:03:08.070Z', pnl: -288, quantity: 4, entry_price: 30324,    stop_price: 30356.75, multiplier: 2,  partial_entries: [{ price: 30324,    quantity: 4 }], portfolio_id: 'acct-D' },
];
const SHORT_SUM_PNL = -710 - 278 - 360 - 288; // -1636
const SHORT_ACCOUNTS = 4;

describe('contractRoot — micro and mini collapse to one contract-family key', () => {
  it('maps the micro (MNQU6) to its mini root (NQU6)', () => {
    expect(contractRoot('MNQU6')).toBe('NQU6');
    expect(contractRoot('NQU6')).toBe('NQU6');
  });

  it('collapses other micro/mini families to the same root', () => {
    expect(contractRoot('MESZ5')).toBe('ESZ5'); // micro S&P -> mini S&P
    expect(contractRoot('M2KU6')).toBe('RTYU6'); // micro Russell -> mini Russell
  });

  it('passes non-futures symbols through unchanged', () => {
    expect(contractRoot('AAPL')).toBe('AAPL');
    expect(contractRoot('BTCUSD')).toBe('BTCUSD');
  });
});

describe('clusterByOverlap — a copier micro+mini fan-out is ONE decision', () => {
  it('merges 1 mini + 3 micro overlapping shorts into a single cluster', () => {
    const clusters = clusterByOverlap(SHORT_DECISION);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(4);
  });

  it('keeps the opposite-side re-entry (LONG) as its own decision', () => {
    const withReentry: Row[] = [
      ...SHORT_DECISION,
      { id: 'reentry-long', symbol: 'MNQU6', side: 'LONG', open_at: '2026-06-30T14:03:03.241Z', close_at: null, pnl: null, quantity: 5, entry_price: 30350.75, stop_price: null, multiplier: 2, partial_entries: [{ price: 30350.75, quantity: 5 }], portfolio_id: 'acct-D' },
    ];
    expect(clusterByOverlap(withReentry)).toHaveLength(2);
  });

  it('keeps a later, non-overlapping same-root short as its own decision', () => {
    const withLater: Row[] = [
      ...SHORT_DECISION,
      { id: 'later-short', symbol: 'NQU6', side: 'SHORT', open_at: '2026-06-30T15:00:00.000Z', close_at: '2026-06-30T15:05:00.000Z', pnl: -100, quantity: 1, entry_price: 30200, stop_price: 30230, multiplier: 20, partial_entries: [{ price: 30200, quantity: 1 }], portfolio_id: 'acct-A' },
    ];
    expect(clusterByOverlap(withLater)).toHaveLength(2);
  });
});

describe('aggregateCopiedTrades — ALL ACCOUNTS shows one row per decision', () => {
  it('collapses the micro+mini copier fan-out into a single summed row', () => {
    const rows = aggregateCopiedTrades(SHORT_DECISION, 'all-accounts');
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].pnl)).toBeCloseTo(SHORT_SUM_PNL, 6); // -1636, summed
    expect(String(rows[0].side).toUpperCase()).toBe('SHORT');
    expect(rows[0].group_trade_ids).toHaveLength(4);
  });
});

describe('normalizeTraderTrades — TRADER shows one row per decision', () => {
  it('collapses the micro+mini copier fan-out into a single per-account-averaged row', () => {
    const rows = normalizeTraderTrades(SHORT_DECISION, 'per-account');
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].pnl)).toBeCloseTo(SHORT_SUM_PNL / SHORT_ACCOUNTS, 6); // -409
    expect(rows[0].group_trade_ids).toHaveLength(4);
  });
});

describe('displaySymbol — uniform MICRO label for micro+mini decisions', () => {
  it('shows the micro symbol when a decision mixes micro and mini', () => {
    expect(displaySymbol(SHORT_DECISION)).toBe('MNQU6'); // mixes NQU6 (mini) + MNQU6 (micro)
  });

  it('keeps the symbol for a pure mini/standard decision', () => {
    const pureMini: Row[] = [
      { id: 'a', symbol: 'NQU6', side: 'SHORT', open_at: '2026-06-30T14:00:00.000Z', close_at: '2026-06-30T14:01:00.000Z' },
      { id: 'b', symbol: 'NQU6', side: 'SHORT', open_at: '2026-06-30T14:00:00.500Z', close_at: '2026-06-30T14:01:00.000Z' },
    ];
    expect(displaySymbol(pureMini)).toBe('NQU6');
  });

  it('keeps the symbol for a pure micro decision', () => {
    expect(displaySymbol([{ id: 'a', symbol: 'MESZ5' }])).toBe('MESZ5');
  });
});

describe('merged rows expose the uniform micro symbol in both scopes', () => {
  it('ALL ACCOUNTS: the merged micro+mini short row is labeled MNQU6', () => {
    const rows = aggregateCopiedTrades(SHORT_DECISION, 'all-accounts');
    expect(rows).toHaveLength(1);
    expect(rows[0].symbol).toBe('MNQU6');
  });

  it('TRADER: the merged micro+mini short row is labeled MNQU6', () => {
    const rows = normalizeTraderTrades(SHORT_DECISION, 'per-account');
    expect(rows).toHaveLength(1);
    expect(rows[0].symbol).toBe('MNQU6');
  });
});
