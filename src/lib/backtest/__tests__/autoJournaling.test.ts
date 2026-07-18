import { describe, it, expect, vi } from 'vitest';

// autoJournaling.ts imports the real supabase client purely for the (untested
// here) async save function; the module throws at import time if
// VITE_SUPABASE_URL isn't set (not the case under vitest). Mock it out so
// only the pure mapping functions below are exercised — no network, no auth.
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

import {
  buildAutoJournalPayload,
  buildAutoJournalPayloads,
  runContextFromSetup,
  type AutoJournalRunContext,
} from '@/lib/backtest/autoJournaling';
import type { AutoPosition } from '@/core/auto/signalToPosition';
import { makeDefaultSetup } from '@/core/auto/types';
import { makeDefaultStrategyV2 } from '@/core/auto/v2/types';

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

/** Convenience: the v1 run context a real caller builds via `runContextFromSetup`. */
function v1RunContext(symbol = 'BTCUSDT', timeframe = '15m'): AutoJournalRunContext {
  const setup = makeDefaultSetup(symbol, timeframe);
  return runContextFromSetup(setup, setup.instrument.symbol);
}

describe('buildAutoJournalPayload', () => {
  it('returns null for open (unclosed) positions', () => {
    const run = v1RunContext();
    const open = makeClosedPosition({ status: 'open', exitPrice: undefined });
    expect(buildAutoJournalPayload(open, USER_ID, run, RUN_ID, 0)).toBeNull();
  });

  it('maps core fields (entry/exit/pnl/stop/target) onto the journal row', () => {
    const run = v1RunContext();
    const pos = makeClosedPosition();
    const row = buildAutoJournalPayload(pos, USER_ID, run, RUN_ID, 0);

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
    const run = v1RunContext();
    const longRow = buildAutoJournalPayload(makeClosedPosition({ type: 'long' }), USER_ID, run, RUN_ID, 0);
    const shortRow = buildAutoJournalPayload(
      makeClosedPosition({ type: 'short', realizedPnl: -5 }),
      USER_ID,
      run,
      RUN_ID,
      1,
    );
    expect(longRow!.side).toBe('LONG');
    expect(shortRow!.side).toBe('SHORT');
    expect(shortRow!.outcome).toBe('LOSS');
  });

  it('derives outcome BE for zero pnl and OPEN for null pnl', () => {
    const run = v1RunContext();
    const beRow = buildAutoJournalPayload(makeClosedPosition({ realizedPnl: 0 }), USER_ID, run, RUN_ID, 0);
    const openPnlRow = buildAutoJournalPayload(
      makeClosedPosition({ realizedPnl: undefined }),
      USER_ID,
      run,
      RUN_ID,
      1,
    );
    expect(beRow!.outcome).toBe('BE');
    expect(openPnlRow!.outcome).toBe('OPEN');
    expect(openPnlRow!.pnl).toBeNull();
  });

  it('produces a deterministic external_id keyed by runId + index', () => {
    const run = v1RunContext();
    const rowA = buildAutoJournalPayload(makeClosedPosition(), USER_ID, run, RUN_ID, 3);
    const rowB = buildAutoJournalPayload(makeClosedPosition(), USER_ID, run, RUN_ID, 3);
    const rowDifferentIndex = buildAutoJournalPayload(makeClosedPosition(), USER_ID, run, RUN_ID, 4);

    expect(rowA!.external_id).toBe('autobt_run-abc_3');
    expect(rowA!.external_id).toBe(rowB!.external_id); // idempotent re-save of the same run
    expect(rowA!.external_id).not.toBe(rowDifferentIndex!.external_id);
    expect(rowA!.idempotency_key).toBe(`${USER_ID}:backtest:autobt_run-abc_3`);
  });

  it('carries pattern type + run id in the notes', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m'); // default pattern = FVG
    const run = runContextFromSetup(setup, setup.instrument.symbol);
    const row = buildAutoJournalPayload(makeClosedPosition(), USER_ID, run, RUN_ID, 0);
    expect(row!.notes).toContain('FVG');
    expect(row!.notes).toContain(RUN_ID);
    expect(row!.setup).toBe(setup.name);
  });

  it('passes futures symbols through unchanged (e.g. MNQ)', () => {
    const run = v1RunContext('MNQ', '5m');
    const pos = makeClosedPosition({ symbol: 'AUTO' }); // engine falls back to 'AUTO' internally
    const row = buildAutoJournalPayload(pos, USER_ID, run, RUN_ID, 0);
    expect(row!.symbol).toBe('MNQ');
  });

  it('converts unix-seconds entry/exit times to ISO strings', () => {
    const run = v1RunContext();
    const pos = makeClosedPosition({ entryTime: 1_700_000_000, exitTime: 1_700_003_600 });
    const row = buildAutoJournalPayload(pos, USER_ID, run, RUN_ID, 0);
    expect(row!.open_at).toBe(new Date(1_700_000_000 * 1000).toISOString());
    expect(row!.close_at).toBe(new Date(1_700_003_600 * 1000).toISOString());
  });

  // ─── v2 (Strategy AI) — the reported production bug ────────────────────
  // A v2 run's journal save must map the v2 definition's OWN instrument/name,
  // never the v1 `currentSetup` slot (which can hold a stale, unrelated
  // symbol from an earlier classic run — e.g. saving an MNQ v2 run's trades
  // tagged as BTCUSDT because the v1 setup slot still said BTCUSDT).
  it('maps a v2 run context to its OWN instrument symbol and name, independent of any v1 setup', () => {
    const v2Def = makeDefaultStrategyV2('MNQ', '5m');
    const run: AutoJournalRunContext = {
      name: v2Def.name,
      instrumentSymbol: v2Def.instrument.symbol,
      patternLabel: 'AUTO',
    };
    const pos = makeClosedPosition({ symbol: 'AUTO' });
    const row = buildAutoJournalPayload(pos, USER_ID, run, RUN_ID, 0);

    expect(row!.symbol).toBe('MNQ');
    expect(row!.symbol).not.toBe('BTCUSDT');
    expect(row!.setup).toBe(v2Def.name);
    expect(row!.notes).toContain('AUTO');
    expect(row!.tags).toContain('pattern:AUTO');
  });
});

describe('buildAutoJournalPayloads', () => {
  it('skips open positions and maps only closed ones, preserving order for external_id indexing', () => {
    const run = v1RunContext();
    const trades: AutoPosition[] = [
      makeClosedPosition({ entryPrice: 100 }),
      makeClosedPosition({ status: 'open', exitPrice: undefined, entryPrice: 200 }),
      makeClosedPosition({ entryPrice: 300 }),
    ];

    const rows = buildAutoJournalPayloads(trades, USER_ID, run, RUN_ID);

    expect(rows).toHaveLength(2);
    expect(rows[0].entry_price).toBe(100);
    expect(rows[0].external_id).toBe('autobt_run-abc_0');
    expect(rows[1].entry_price).toBe(300);
    // Index reflects position in the ORIGINAL trades array (index 2), not the filtered position.
    expect(rows[1].external_id).toBe('autobt_run-abc_2');
  });

  it('returns an empty array when there are no closed trades', () => {
    const run = v1RunContext();
    const trades: AutoPosition[] = [makeClosedPosition({ status: 'open', exitPrice: undefined })];
    expect(buildAutoJournalPayloads(trades, USER_ID, run, RUN_ID)).toEqual([]);
  });
});

describe('runContextFromSetup', () => {
  it('derives name/instrumentSymbol/patternLabel from a v1 SetupDefinition', () => {
    const setup = makeDefaultSetup('BTCUSDT', '15m');
    const run = runContextFromSetup(setup, setup.instrument.symbol);
    expect(run.name).toBe(setup.name);
    expect(run.instrumentSymbol).toBe('BTCUSDT');
    expect(run.patternLabel).toBe('FVG');
  });

  it('lets the caller pass a resolved instrument symbol that differs from setup.instrument.symbol', () => {
    // Mirrors the real call site: `instrument.symbol` (selectEffectiveInstrument)
    // is always what's threaded in, even for v1 — this test just proves the
    // helper doesn't silently re-derive it from `setup` internally.
    const setup = makeDefaultSetup('BTCUSDT', '15m');
    const run = runContextFromSetup(setup, 'MNQ');
    expect(run.instrumentSymbol).toBe('MNQ');
  });
});
