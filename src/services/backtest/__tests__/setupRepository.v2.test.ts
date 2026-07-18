// ============================================================================
// setupRepository — v1/v2 discriminator + SavedRun v2 round-trip
// (Increment 4b — v2 strategy persistence)
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AutoBacktestResult } from '@/core/auto/AutoBacktestEngine';
import { makeDefaultSetup } from '@/core/auto/types';
import { makeDefaultStrategyV2 } from '@/core/auto/v2/types';
import type { SavedSetupDefinition } from '../setupRepository';

// ---------------------------------------------------------------------------
// Mock @/lib/supabase BEFORE importing setupRepository (hoisted by vitest).
// Same minimal chainable-builder pattern as setupRepository.saveRun.test.ts,
// extended to CAPTURE the insert payload so we can assert on
// engine_version / setup_snapshot.
// ---------------------------------------------------------------------------

const getUserMock = vi.fn();
const runsInsertMock = vi.fn(); // called with the raw insert payload
const detectionsInsertMock = vi.fn();
const runsDeleteEqMock = vi.fn();

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: (...args: unknown[]) => getUserMock(...args),
      },
      from: (table: string) => {
        if (table === 'bt_runs') {
          return {
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: () => runsInsertMock(payload),
              }),
            }),
            delete: () => ({
              eq: (...args: unknown[]) => runsDeleteEqMock(...args),
            }),
          };
        }
        if (table === 'bt_detections') {
          return {
            insert: (rows: unknown[]) => detectionsInsertMock(rows),
          };
        }
        throw new Error(`Unexpected table in test: ${table}`);
      },
    },
  };
});

import {
  saveRun,
  buildSavedRun,
  isV2SetupDefinition,
  setupTimeframe,
  setupUpdatedAt,
} from '../setupRepository';

function makeEmptyResult(): AutoBacktestResult {
  return {
    detections: [],
    trades: [],
    statistics: {} as AutoBacktestResult['statistics'],
    equityCurve: [],
    rMultipleDistribution: undefined,
  } as unknown as AutoBacktestResult;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Discriminator
// ---------------------------------------------------------------------------

describe('isV2SetupDefinition', () => {
  it('returns false for a v1 SetupDefinition (schemaVersion: 1)', () => {
    const v1 = makeDefaultSetup('BTCUSDT', '15m');
    expect(v1.schemaVersion).toBe(1);
    expect(isV2SetupDefinition(v1)).toBe(false);
  });

  it('returns true for a v2 StrategyDefinitionV2 (schemaVersion: 2)', () => {
    const v2 = makeDefaultStrategyV2('BTCUSDT', '15m');
    expect(v2.schemaVersion).toBe(2);
    expect(isV2SetupDefinition(v2)).toBe(true);
  });

  it('treats a legacy record with no schemaVersion field as v1 (absent -> v1)', () => {
    const legacy = { ...makeDefaultSetup('BTCUSDT', '15m') } as Record<string, unknown>;
    delete legacy.schemaVersion;
    expect(isV2SetupDefinition(legacy as unknown as SavedSetupDefinition)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Accessors (setupTimeframe / setupUpdatedAt)
// ---------------------------------------------------------------------------

describe('setup accessors', () => {
  it('setupTimeframe reads instrument.timeframe for v1 and timeframes.execution for v2', () => {
    const v1 = makeDefaultSetup('BTCUSDT', '15m');
    const v2 = makeDefaultStrategyV2('BTCUSDT', '1h');
    expect(setupTimeframe(v1)).toBe('15m');
    expect(setupTimeframe(v2)).toBe('1h');
  });

  it('setupUpdatedAt reads the v1 field directly and defaults to 0 for an un-stamped v2 def', () => {
    const v1 = makeDefaultSetup('BTCUSDT', '15m');
    const v2 = makeDefaultStrategyV2('BTCUSDT', '1h');
    expect(setupUpdatedAt(v1)).toBe(v1.updatedAt);
    expect(setupUpdatedAt(v2)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// SavedRun v2 round-trip (build -> save -> assert persisted shape)
// ---------------------------------------------------------------------------

describe('SavedRun v2 persistence', () => {
  it('persists a v2 run to bt_runs with engine_version "auto-v2" and an untouched v2 setup_snapshot', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    runsInsertMock.mockResolvedValue({ data: { id: 'server-run-id' }, error: null });
    detectionsInsertMock.mockResolvedValue({ error: null });

    const def = makeDefaultStrategyV2('BTCUSDT', '15m');
    const run = buildSavedRun(def, makeEmptyResult(), {
      symbol: 'BTCUSDT',
      timeframe: '15m',
      from: 1000,
      to: 5000,
    });

    expect(isV2SetupDefinition(run.setupSnapshot)).toBe(true);
    // detections always empty for v2 (the rules engine doesn't emit v1-shaped
    // pattern-zone Detections) — no special-casing needed in the repository.
    expect(run.detections).toEqual([]);

    const result = await saveRun(run);

    expect(result.ok).toBe(true);
    expect(result.storage).toBe('supabase');
    expect(runsInsertMock).toHaveBeenCalledTimes(1);
    // detections insert is skipped entirely — buildDetectionRows produces no
    // rows when run.detections is empty.
    expect(detectionsInsertMock).not.toHaveBeenCalled();

    const payload = runsInsertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.engine_version).toBe('auto-v2');
    expect(payload.setup_snapshot).toEqual(def);
    expect(isV2SetupDefinition(payload.setup_snapshot as SavedSetupDefinition)).toBe(true);
  });

  it('still persists a v1 run with engine_version "auto-v1" (byte-identical behavior)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    runsInsertMock.mockResolvedValue({ data: { id: 'server-run-id' }, error: null });
    detectionsInsertMock.mockResolvedValue({ error: null });

    const def = makeDefaultSetup('BTCUSDT', '15m');
    const run = buildSavedRun(def, makeEmptyResult(), {
      symbol: 'BTCUSDT',
      timeframe: '15m',
      from: 1000,
      to: 5000,
    });

    await saveRun(run);

    const payload = runsInsertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.engine_version).toBe('auto-v1');
  });

  it('falls back to localStorage for a v2 run when there is no authenticated user, preserving the v2 setup_snapshot', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const localStorageMock = (() => {
      const store = new Map<string, string>();
      return {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => store.delete(k),
      };
    })();
    vi.stubGlobal('localStorage', localStorageMock);

    const def = makeDefaultStrategyV2('ETHUSDT', '5m');
    const run = buildSavedRun(def, makeEmptyResult(), {
      symbol: 'ETHUSDT',
      timeframe: '5m',
      from: 0,
      to: 1,
    });

    const result = await saveRun(run);

    expect(result.ok).toBe(true);
    expect(result.storage).toBe('local');
    expect(runsInsertMock).not.toHaveBeenCalled();

    const stored = JSON.parse(
      localStorageMock.getItem('finotaur.autobt.runs.v1') ?? '[]',
    ) as Array<{ setupSnapshot: SavedSetupDefinition }>;
    expect(stored).toHaveLength(1);
    expect(stored[0].setupSnapshot.schemaVersion).toBe(2);
    expect(isV2SetupDefinition(stored[0].setupSnapshot)).toBe(true);
  });
});
