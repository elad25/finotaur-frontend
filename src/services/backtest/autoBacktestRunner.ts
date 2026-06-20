// ============================================================================
// AUTO BACKTEST RUNNER
// Thin client wrapper hiding Web Worker plumbing from the store.
// Falls back to synchronous main-thread execution on environments where
// Worker construction is not available (SSR, older engines).
// ============================================================================

import type { Candle } from '@/components/ReplayChart/types';
import type { SetupDefinition } from '@/core/auto/types';
import type { AutoBacktestResult } from '@/core/auto/AutoBacktestEngine';
import type { WorkerOutMessage } from '@/core/auto/autoBacktest.worker';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run an auto backtest in a Web Worker.
 * Resolves with the full result when the run completes.
 * Rejects on engine errors or Worker construction failures (after attempting
 * a synchronous fallback).
 *
 * @param onProgress  Called on every progress tick from the worker.
 */
export function runAutoBacktestInWorker(
  setup: SetupDefinition,
  candles: Candle[],
  htfCandles: Candle[] | undefined,
  onProgress?: (scanned: number, total: number, found: number) => void,
): Promise<AutoBacktestResult> {
  // --- Attempt Worker path ---
  let worker: Worker;
  try {
    worker = new Worker(
      new URL('../../core/auto/autoBacktest.worker.ts', import.meta.url),
      { type: 'module' },
    );
  } catch {
    // Worker construction failed (SSR / unsupported env) — fallback to sync.
    return syncFallback(setup, candles, htfCandles, onProgress);
  }

  return new Promise<AutoBacktestResult>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'progress':
          onProgress?.(msg.scanned, msg.total, msg.found);
          break;
        case 'done':
          worker.terminate();
          resolve(msg.result);
          break;
        case 'error':
          worker.terminate();
          reject(new Error(msg.message));
          break;
        default: {
          // Exhaustiveness guard — unknown message type, ignore.
          break;
        }
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(`Worker error: ${err.message ?? 'unknown'}`));
    };

    // Post the run command.
    worker.postMessage({ type: 'run', setup, candles, htfCandles });
  });
}

// ---------------------------------------------------------------------------
// Synchronous fallback (main thread)
// ---------------------------------------------------------------------------

async function syncFallback(
  setup: SetupDefinition,
  candles: Candle[],
  htfCandles: Candle[] | undefined,
  onProgress?: (scanned: number, total: number, found: number) => void,
): Promise<AutoBacktestResult> {
  // Dynamic import to avoid pulling heavy engine into the initial bundle
  // when the Worker path is taken.
  const { runAutoBacktest } = await import('@/core/auto/AutoBacktestEngine');
  return runAutoBacktest(setup, candles, htfCandles, onProgress);
}
