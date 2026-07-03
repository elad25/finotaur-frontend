import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SavedRun } from '../setupRepository';

// ---------------------------------------------------------------------------
// Mock @/lib/supabase BEFORE importing setupRepository (hoisted by vitest).
// The repository only ever calls `supabase.auth.getUser()` and
// `supabase.from(<table>).insert/select/single/delete/eq`, so the mock is a
// minimal chainable builder rather than a real Supabase client.
// ---------------------------------------------------------------------------

const getUserMock = vi.fn();
const runsInsertMock = vi.fn(); // bt_runs insert().select().single()
const detectionsInsertMock = vi.fn(); // bt_detections insert()
const runsDeleteEqMock = vi.fn(); // bt_runs delete().eq()

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: (...args: unknown[]) => getUserMock(...args),
      },
      from: (table: string) => {
        if (table === 'bt_runs') {
          return {
            insert: () => ({
              select: () => ({
                single: () => runsInsertMock(),
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

import { saveRun } from '../setupRepository';

function makeRun(overrides: Partial<SavedRun> = {}): SavedRun {
  return {
    id: 'client-generated-id',
    setupSnapshot: {
      instrument: { symbol: 'BTCUSDT', timeframe: '1h', source: 'binance' },
      risk: { initialBalance: 10_000 },
    } as unknown as SavedRun['setupSnapshot'],
    symbol: 'BTCUSDT',
    timeframe: '1h',
    from: 1000,
    to: 5000,
    statistics: {} as SavedRun['statistics'],
    equityCurve: [],
    detections: [
      {
        patternType: 'FVG',
        direction: 'long',
        formedAtIndex: 0,
        zone: { top: 1, bottom: 0.5 },
        meta: {},
      },
    ] as unknown as SavedRun['detections'],
    trades: [] as SavedRun['trades'],
    createdAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('setupRepository.saveRun', () => {
  it('degrades to localStorage and deletes the orphan bt_runs row when the detections insert fails twice', async () => {
    runsInsertMock.mockResolvedValue({ data: { id: 'server-run-id' }, error: null });
    detectionsInsertMock.mockResolvedValue({ error: { message: 'insert failed' } });
    runsDeleteEqMock.mockResolvedValue({ error: null });

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

    const run = makeRun();
    const resultPromise = saveRun(run);
    // Let the internal 500ms retry delay elapse without a real wait.
    await vi.advanceTimersByTimeAsync(500);
    const result = await resultPromise;

    // Retried exactly once (2 total attempts).
    expect(detectionsInsertMock).toHaveBeenCalledTimes(2);
    // The orphan bt_runs row was rolled back.
    expect(runsDeleteEqMock).toHaveBeenCalledWith('id', 'server-run-id');
    // Fell back to localStorage — the run is not lost.
    expect(result.ok).toBe(false);
    expect(result.storage).toBe('local');
    // `=== false` (not `!result.ok`) — this repo's tsconfig has
    // strictNullChecks off, which disables control-flow narrowing on `!x.ok`
    // for a boolean discriminant; `=== false` narrows correctly either way.
    if (result.ok === false) {
      expect(result.reason).toBe('detections-insert-failed');
    }
    expect(localStorageMock.getItem('finotaur.autobt.runs.v1')).toContain('server-run-id');
  });

  it('reports storage: "none" when both Supabase and the localStorage write fail', async () => {
    runsInsertMock.mockResolvedValue({ data: { id: 'server-run-id' }, error: null });
    detectionsInsertMock.mockResolvedValue({ error: { message: 'insert failed' } });
    runsDeleteEqMock.mockResolvedValue({ error: null });

    const quotaExceeded = () => {
      throw new Error('QuotaExceededError');
    };
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: quotaExceeded,
      removeItem: () => undefined,
    });

    const run = makeRun();
    const resultPromise = saveRun(run);
    await vi.advanceTimersByTimeAsync(500);
    const result = await resultPromise;

    expect(result.ok).toBe(false);
    expect(result.storage).toBe('none');
  });

  it('returns full success with storage: "supabase" when both inserts succeed', async () => {
    runsInsertMock.mockResolvedValue({ data: { id: 'server-run-id' }, error: null });
    detectionsInsertMock.mockResolvedValue({ error: null });

    const run = makeRun();
    const result = await saveRun(run);

    expect(detectionsInsertMock).toHaveBeenCalledTimes(1);
    expect(runsDeleteEqMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.storage).toBe('supabase');
  });
});
