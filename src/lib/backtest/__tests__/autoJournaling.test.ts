import { describe, it, expect, vi } from 'vitest';

// autoJournaling.ts imports the real supabase client purely for the (untested
// here) async save function; the module throws at import time if
// VITE_SUPABASE_URL isn't set (not the case under vitest). Mock it out so
// only the pure mapping functions below are exercised — no network, no auth.
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

import { buildAutoJournalPayload, buildAutoJournalPayloads } from '@/lib/backtest/autoJournaling';
import type { AutoPosition } from '@/core/auto/signalToPosition';
import { makeDefaultSetup } from '@/core/auto/types';

const USER_ID = 'user-123';
const RUN_ID = 'run-abc';

function makeClosedPosition(overrides: Partial<AutoPosition> = {}): AutoPosition {
  return {
    symbol: 'BTCUSDT',
    type: 'long',
    entryPrice: 100,
    size: 2,
    stopLoss: 95,
    takeProfit: 115,
    entryTime: 1_700_000_000, // seconds
    status: 'closed',
    exitPrice: 110,
    exitTime: 1_700_003_600, // seconds
    exitReason: 'take_profit' as never,
    realizedPnl: 20,
    realizedPnlPercent: 10,
    ...overrides,
  };
}

describe('buildAutoJournalPayload', () => {
  it('returns null for open (unclosed) positions', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m');
    const open = makeClosedPosition({ status: 'open', exitPrice: undefined });
    expect(buildAutoJournalPayload(open, USER_ID, setup, RUN_ID, 0)).toBeNull();
  });

  it('maps core fields (entry/exit/pnl/stop/target) onto the journal row', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m');
    const pos = makeClosedPosition();
    const row = buildAutoJournalPayload(pos, USER_ID, setup, RUN_ID, 0);

    expect(row).not.toBeNull();
    expect(row!.entry_price).toBe(100);
    expect(row!.exit_price).toBe(110);
    expect(row!.stop_price).toBe(95);
    expect(row!.take_profit_price).toBe(115);
    expect(row!.quantity).toBe(2);
    expect(row!.pnl).toBe(20);
    expect(row!.outcome).toBe('WIN');
    expect(row!.broker).toBe('backtest');
    expect(row!.user_id).toBe(USER_ID);
  });

  it('maps direction: long -> LONG, short -> SHORT', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m');
    const longRow = buildAutoJournalPayload(makeClosedPosition({ type: 'long' }), USER_ID, setup, RUN_ID, 0);
    const shortRow = buildAutoJournalPayload(
      makeClosedPosition({ type: 'short', realizedPnl: -5 }),
      USER_ID,
      setup,
      RUN_ID,
      1,
    );
    expect(longRow!.side).toBe('LONG');
    expect(shortRow!.side).toBe('SHORT');
    expect(shortRow!.outcome).toBe('LOSS');
  });

  it('derives outcome BE for zero pnl and OPEN for null pnl', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m');
    const beRow = buildAutoJournalPayload(makeClosedPosition({ realizedPnl: 0 }), USER_ID, setup, RUN_ID, 0);
    const openPnlRow = buildAutoJournalPayload(
      makeClosedPosition({ realizedPnl: undefined }),
      USER_ID,
      setup,
      RUN_ID,
      1,
    );
    expect(beRow!.outcome).toBe('BE');
    expect(openPnlRow!.outcome).toBe('OPEN');
    expect(openPnlRow!.pnl).toBeNull();
  });

  it('produces a deterministic external_id keyed by runId + index', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m');
    const rowA = buildAutoJournalPayload(makeClosedPosition(), USER_ID, setup, RUN_ID, 3);
    const rowB = buildAutoJournalPayload(makeClosedPosition(), USER_ID, setup, RUN_ID, 3);
    const rowDifferentIndex = buildAutoJournalPayload(makeClosedPosition(), USER_ID, setup, RUN_ID, 4);

    expect(rowA!.external_id).toBe('autobt_run-abc_3');
    expect(rowA!.external_id).toBe(rowB!.external_id); // idempotent re-save of the same run
    expect(rowA!.external_id).not.toBe(rowDifferentIndex!.external_id);
    expect(rowA!.idempotency_key).toBe(`${USER_ID}:backtest:autobt_run-abc_3`);
  });

  it('carries pattern type + run id in the notes', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m'); // default pattern = FVG
    const row = buildAutoJournalPayload(makeClosedPosition(), USER_ID, setup, RUN_ID, 0);
    expect(row!.notes).toContain('FVG');
    expect(row!.notes).toContain(RUN_ID);
    expect(row!.setup).toBe(setup.name);
  });

  it('passes futures symbols through unchanged (e.g. MNQ)', () => {
    const setup = makeDefaultSetup('MNQ', '5m');
    const pos = makeClosedPosition({ symbol: 'AUTO' }); // engine falls back to 'AUTO' internally
    const row = buildAutoJournalPayload(pos, USER_ID, setup, RUN_ID, 0);
    expect(row!.symbol).toBe('MNQ');
  });

  it('converts unix-seconds entry/exit times to ISO strings', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m');
    const pos = makeClosedPosition({ entryTime: 1_700_000_000, exitTime: 1_700_003_600 });
    const row = buildAutoJournalPayload(pos, USER_ID, setup, RUN_ID, 0);
    expect(row!.open_at).toBe(new Date(1_700_000_000 * 1000).toISOString());
    expect(row!.close_at).toBe(new Date(1_700_003_600 * 1000).toISOString());
  });
});

describe('buildAutoJournalPayloads', () => {
  it('skips open positions and maps only closed ones, preserving order for external_id indexing', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m');
    const trades: AutoPosition[] = [
      makeClosedPosition({ entryPrice: 100 }),
      makeClosedPosition({ status: 'open', exitPrice: undefined, entryPrice: 200 }),
      makeClosedPosition({ entryPrice: 300 }),
    ];

    const rows = buildAutoJournalPayloads(trades, USER_ID, setup, RUN_ID);

    expect(rows).toHaveLength(2);
    expect(rows[0].entry_price).toBe(100);
    expect(rows[0].external_id).toBe('autobt_run-abc_0');
    expect(rows[1].entry_price).toBe(300);
    // Index reflects position in the ORIGINAL trades array (index 2), not the filtered position.
    expect(rows[1].external_id).toBe('autobt_run-abc_2');
  });

  it('returns an empty array when there are no closed trades', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m');
    const trades: AutoPosition[] = [makeClosedPosition({ status: 'open', exitPrice: undefined })];
    expect(buildAutoJournalPayloads(trades, USER_ID, setup, RUN_ID)).toEqual([]);
  });
});
