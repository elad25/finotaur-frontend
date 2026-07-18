// src/lib/backtest/__tests__/replayHandoffMapping.test.ts
// Pure-function tests for the Inspect-in-Replay handoff -> session mapping.

import { describe, it, expect } from 'vitest';
import {
  deriveAssetTypeFromSymbol,
  resolveHandoffStartBalance,
  focusTimeToReplayStartSeconds,
  DEFAULT_HANDOFF_BALANCE,
} from '../replayHandoffMapping';

describe('deriveAssetTypeFromSymbol', () => {
  it('recognizes CME futures roots (micro + full-size), case-insensitively', () => {
    expect(deriveAssetTypeFromSymbol('MNQ')).toBe('futures');
    expect(deriveAssetTypeFromSymbol('ES')).toBe('futures');
    expect(deriveAssetTypeFromSymbol('mgc')).toBe('futures');
    expect(deriveAssetTypeFromSymbol('CL')).toBe('futures');
  });

  it('treats crypto pairs and unknown symbols as crypto', () => {
    expect(deriveAssetTypeFromSymbol('BTCUSDT')).toBe('crypto');
    expect(deriveAssetTypeFromSymbol('ETHUSDT')).toBe('crypto');
    expect(deriveAssetTypeFromSymbol('SOME_UNKNOWN')).toBe('crypto');
  });

  it('rejects a futures-shaped string that is not a real root', () => {
    // "MNQU6" (front-month expiry code) is not in the bare-root table.
    expect(deriveAssetTypeFromSymbol('MNQU6')).toBe('crypto');
  });

  it('handles empty string without throwing', () => {
    expect(deriveAssetTypeFromSymbol('')).toBe('crypto');
  });
});

describe('resolveHandoffStartBalance', () => {
  it('uses the handoff-provided balance when present and valid', () => {
    expect(resolveHandoffStartBalance(25000)).toBe(25000);
  });

  it('falls back to the default when undefined', () => {
    expect(resolveHandoffStartBalance(undefined)).toBe(DEFAULT_HANDOFF_BALANCE);
  });

  it('falls back to the default for non-finite or non-positive values', () => {
    expect(resolveHandoffStartBalance(0)).toBe(DEFAULT_HANDOFF_BALANCE);
    expect(resolveHandoffStartBalance(-500)).toBe(DEFAULT_HANDOFF_BALANCE);
    expect(resolveHandoffStartBalance(NaN)).toBe(DEFAULT_HANDOFF_BALANCE);
  });
});

describe('focusTimeToReplayStartSeconds', () => {
  it('converts ms to whole seconds, truncating any fractional remainder', () => {
    expect(focusTimeToReplayStartSeconds(1_700_000_000_000)).toBe(1_700_000_000);
    expect(focusTimeToReplayStartSeconds(1_700_000_000_999)).toBe(1_700_000_000);
  });

  it('handles zero', () => {
    expect(focusTimeToReplayStartSeconds(0)).toBe(0);
  });
});
