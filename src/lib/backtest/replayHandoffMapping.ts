// ============================================================================
// REPLAY HANDOFF MAPPING — pure helpers for wiring a ReplayHandoff (auto
// backtest -> manual replay) into a BacktestSession + BacktestChart context.
// ============================================================================
//
// Extracted out of Chart.tsx so the mapping logic (asset-type derivation,
// focus-time -> replay-cursor conversion, balance fallback) is unit-testable
// without mounting the page component or a chart.
// ============================================================================

import { getContractSpec } from '@/core/auto/contractSpecs';
import type { BacktestAssetType } from '@/types/backtestSession';

/** Default starting balance used when a handoff doesn't carry one. */
export const DEFAULT_HANDOFF_BALANCE = 10000;

/**
 * Derive the BacktestSession assetType from a handoff symbol. The automated
 * engine addresses futures by their bare CME root (e.g. "MNQ", "ES") — see
 * contractSpecs.ts / FUTURES_SYMBOLS in candleSource.ts, which use the exact
 * same 14-symbol set. Anything not a recognized futures root is treated as
 * crypto, matching the previous hardcoded default for this flow.
 */
export function deriveAssetTypeFromSymbol(symbol: string): BacktestAssetType {
  return getContractSpec(symbol) !== null ? 'futures' : 'crypto';
}

/**
 * Resolve the starting balance for a replay session created from a handoff.
 * Falls back to DEFAULT_HANDOFF_BALANCE when the handoff doesn't carry
 * initialBalance (current producer state — see ReplayHandoff TODO).
 */
export function resolveHandoffStartBalance(initialBalance: number | undefined): number {
  return typeof initialBalance === 'number' && Number.isFinite(initialBalance) && initialBalance > 0
    ? initialBalance
    : DEFAULT_HANDOFF_BALANCE;
}

/**
 * Convert a handoff's focusTime (ms, Unix epoch) into the unix-seconds value
 * BacktestReplayChart's `replayStartTime` prop expects. `replayStartTime` is
 * the "now" moment of the replay — the last revealed bar — so pointing it at
 * focusTime lands the cursor exactly on the originating trade's setup bar,
 * with the pattern zone/signal visible and room to PLAY forward through the
 * outcome.
 */
export function focusTimeToReplayStartSeconds(focusTimeMs: number): number {
  return Math.floor(focusTimeMs / 1000);
}
