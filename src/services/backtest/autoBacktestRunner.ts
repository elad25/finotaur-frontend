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
import type { StrategyDefinitionV2 } from '@/core/auto/v2/types';

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
  /**
   * Called when Worker construction fails and the run falls back to the
   * main thread. Lets the caller surface a UI warning (this service stays
   * free of UI imports — no toast here).
   */
  onWorkerFallback?: () => void,
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
    onWorkerFallback?.();
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

// ---------------------------------------------------------------------------
// v2 — same worker plumbing, `runV2` message + `runStrategyV2` fallback.
// ---------------------------------------------------------------------------

/**
 * Run a v2 `StrategyDefinitionV2` backtest in a Web Worker. Mirrors
 * `runAutoBacktestInWorker` exactly (same worker file, same fallback
 * behavior) — the only difference is the message shape (`runV2`) and the
 * v2 engine (`runStrategyV2`) used for the synchronous fallback.
 */
export function runStrategyV2InWorker(
  strategy: StrategyDefinitionV2,
  candles: Candle[],
  onProgress?: (scanned: number, total: number, found: number) => void,
  onWorkerFallback?: () => void,
): Promise<AutoBacktestResult> {
  let worker: Worker;
  try {
    worker = new Worker(
      new URL('../../core/auto/autoBacktest.worker.ts', import.meta.url),
      { type: 'module' },
    );
  } catch {
    onWorkerFallback?.();
    return syncFallbackV2(strategy, candles, onProgress);
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
          break;
        }
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(`Worker error: ${err.message ?? 'unknown'}`));
    };

    worker.postMessage({ type: 'runV2', strategy, candles });
  });
}

async function syncFallbackV2(
  strategy: StrategyDefinitionV2,
  candles: Candle[],
  onProgress?: (scanned: number, total: number, found: number) => void,
): Promise<AutoBacktestResult> {
  const { runStrategyV2 } = await import('@/core/auto/v2/StrategyEngine');
  return runStrategyV2(strategy, candles, { onProgress });
}
