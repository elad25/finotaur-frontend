// src/pages/app/trading-arena/components/__tests__/footprintSettings.test.ts
//
// Coverage for the PR 2 Unified Footprint Settings model: default→config
// mapping (must reproduce today's DEFAULT_FOOTPRINT_CONFIG-derived render
// behavior for every field this PR doesn't intentionally change), the
// ratio/stacked numeric plumb-through, and rowSize-mode independence (the
// mapper never reads rowSizeMode/rowSizeValue — FootprintTab resolves the
// effective rowSize itself and feeds it to useOrderFlow, not through
// FootprintConfig).

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FOOTPRINT_SETTINGS,
  DEFAULT_FOOTPRINT_AUTO_TRANSFORM_MIN_PX,
  footprintSettingsToConfig,
  resolveEffectiveRowSize,
  snapRowSizePriceToTick,
  snapRowSizeTicksToInt,
  type FootprintSettings,
} from '../footprintSettings';
import {
  DEFAULT_FOOTPRINT_CONFIG,
  DEFAULT_IMBALANCE_MIN_VOL_PCT,
  DEFAULT_STACKED_MIN,
} from '@/components/charting/orderflow/types';

describe('DEFAULT_FOOTPRINT_SETTINGS', () => {
  it('mirrors DEFAULT_ORDER_FLOW_CONTROLS / DEFAULT_FOOTPRINT_CONFIG visual defaults', () => {
    expect(DEFAULT_FOOTPRINT_SETTINGS.content).toBe('bidAsk');
    expect(DEFAULT_FOOTPRINT_SETTINGS.layout).toBe('numbers');
    expect(DEFAULT_FOOTPRINT_SETTINGS.colorScheme).toBe('delta');
    expect(DEFAULT_FOOTPRINT_SETTINGS.imbalanceStackedCount).toBe(DEFAULT_STACKED_MIN);
    expect(DEFAULT_FOOTPRINT_SETTINGS.imbalanceStackedOnly).toBe(false);
    expect(DEFAULT_FOOTPRINT_SETTINGS.rowSizeMode).toBe('auto');
    expect(DEFAULT_FOOTPRINT_SETTINGS.rowSizeValue).toBeNull();
    expect(DEFAULT_FOOTPRINT_SETTINGS.autoTransform).toBe(true);
    expect(DEFAULT_FOOTPRINT_SETTINGS.autoTransformMinPx).toBe(DEFAULT_FOOTPRINT_AUTO_TRANSFORM_MIN_PX);
    expect(DEFAULT_FOOTPRINT_SETTINGS.showVolumeProfile).toBe(false);
    expect(DEFAULT_FOOTPRINT_SETTINGS.showPoc).toBe(true);
    expect(DEFAULT_FOOTPRINT_SETTINGS.showValueArea).toBe(false);
    expect(DEFAULT_FOOTPRINT_SETTINGS.magnifierEnabled).toBe(true);
    expect(DEFAULT_FOOTPRINT_SETTINGS.statsRows).toEqual({
      volume: true,
      delta: true,
      deltaPct: true,
      maxDelta: true,
      minDelta: true,
      sessionDelta: true,
    });
  });

  it('imbalanceRatioPct defaults to 300 (explicit spec default — a deliberate change from the old Standard preset\'s 150%)', () => {
    expect(DEFAULT_FOOTPRINT_SETTINGS.imbalanceRatioPct).toBe(300);
  });
});

describe('footprintSettingsToConfig', () => {
  it('defaults -> config preserves every field this PR does not touch (base spread)', () => {
    const config = footprintSettingsToConfig(DEFAULT_FOOTPRINT_SETTINGS);
    expect(config.showTotals).toBe(DEFAULT_FOOTPRINT_CONFIG.showTotals);
    expect(config.showStats).toBe(DEFAULT_FOOTPRINT_CONFIG.showStats);
    expect(config.forceFullDetail).toBe(DEFAULT_FOOTPRINT_CONFIG.forceFullDetail);
  });

  it('maps content -> cellMode', () => {
    const config = footprintSettingsToConfig({ ...DEFAULT_FOOTPRINT_SETTINGS, content: 'volumeDelta' });
    expect(config.cellMode).toBe('volumeDelta');
  });

  it('imbalanceMinVolPct always stays at the shared dust filter regardless of settings (not exposed in the new UI)', () => {
    const config = footprintSettingsToConfig(DEFAULT_FOOTPRINT_SETTINGS);
    expect(config.imbalanceMinVolPct).toBe(DEFAULT_IMBALANCE_MIN_VOL_PCT);
  });

  it('ratio/stacked plumb-through: imbalanceRatioPct/imbalanceStackedCount/imbalanceStackedOnly map 1:1 (percent -> decimal ratio)', () => {
    const settings: FootprintSettings = {
      ...DEFAULT_FOOTPRINT_SETTINGS,
      imbalanceRatioPct: 150,
      imbalanceStackedCount: 5,
      imbalanceStackedOnly: true,
    };
    const config = footprintSettingsToConfig(settings);
    expect(config.imbalanceRatio).toBe(1.5);
    expect(config.stackedMin).toBe(5);
    expect(config.imbalanceStackedOnly).toBe(true);
  });

  it('300% default maps to imbalanceRatio 3.0 (matches the old Strict preset\'s numeric ratio, even though nothing routes through resolveImbalancePreset anymore)', () => {
    const config = footprintSettingsToConfig(DEFAULT_FOOTPRINT_SETTINGS);
    expect(config.imbalanceRatio).toBe(3.0);
  });

  it('maps showPoc / showValueArea / magnifierEnabled / layout / colorScheme / statsRows straight through', () => {
    const settings: FootprintSettings = {
      ...DEFAULT_FOOTPRINT_SETTINGS,
      showPoc: false,
      showValueArea: true,
      magnifierEnabled: false,
      layout: 'histogram',
      colorScheme: 'volumeHeat',
      statsRows: { volume: false, delta: true, deltaPct: false, maxDelta: true, minDelta: false, sessionDelta: true },
    };
    const config = footprintSettingsToConfig(settings);
    expect(config.showPoc).toBe(false);
    expect(config.showValueArea).toBe(true);
    expect(config.magnifierEnabled).toBe(false);
    expect(config.layout).toBe('histogram');
    expect(config.colorScheme).toBe('volumeHeat');
    expect(config.statsRows).toEqual(settings.statsRows);
  });

  it('imbalancePreset is always normalized to "standard" (vestigial field once numeric-driven — never read by the renderer)', () => {
    const config = footprintSettingsToConfig(DEFAULT_FOOTPRINT_SETTINGS);
    expect(config.imbalancePreset).toBe('standard');
  });

  it('rowSizeMode/rowSizeValue are NOT part of FootprintConfig output — row size is resolved by the caller, not this mapper', () => {
    const config = footprintSettingsToConfig({ ...DEFAULT_FOOTPRINT_SETTINGS, rowSizeMode: 'price', rowSizeValue: 5 });
    expect(config).not.toHaveProperty('rowSizeMode');
    expect(config).not.toHaveProperty('rowSizeValue');
  });

  it('a custom base config is spread as the starting point (e.g. forceFullDetail from a caller)', () => {
    const config = footprintSettingsToConfig(DEFAULT_FOOTPRINT_SETTINGS, {
      ...DEFAULT_FOOTPRINT_CONFIG,
      forceFullDetail: true,
    });
    expect(config.forceFullDetail).toBe(true);
  });

  it('autoTransform=true (the default) maps autoTransformMinPx through, clamped to [8,60]', () => {
    const config = footprintSettingsToConfig(DEFAULT_FOOTPRINT_SETTINGS);
    expect(config.autoTransformMinPx).toBe(DEFAULT_FOOTPRINT_AUTO_TRANSFORM_MIN_PX);

    const clampedHigh = footprintSettingsToConfig({ ...DEFAULT_FOOTPRINT_SETTINGS, autoTransformMinPx: 999 });
    expect(clampedHigh.autoTransformMinPx).toBe(60);

    const clampedLow = footprintSettingsToConfig({ ...DEFAULT_FOOTPRINT_SETTINGS, autoTransformMinPx: 0 });
    expect(clampedLow.autoTransformMinPx).toBe(8);
  });

  it('autoTransform=false omits autoTransformMinPx (undefined) — reproduces today\'s always-full behavior via forceFullDetail', () => {
    const config = footprintSettingsToConfig({ ...DEFAULT_FOOTPRINT_SETTINGS, autoTransform: false });
    expect(config.autoTransformMinPx).toBeUndefined();
  });

  it('new ATAS-parity fields map straight through at their defaults', () => {
    // NOTE: DEFAULT_FOOTPRINT_SETTINGS.minCellPxForText (40, the user-facing
    // Settings-dialog default) is DELIBERATELY different from
    // DEFAULT_FOOTPRINT_CONFIG.minCellPxForText (50, FOOTPRINT_MIN_CANDLE_WIDTH_FOR_TEXT
    // — the renderer's own fallback for callers that never set the field at
    // all) — see footprintSettings.ts's DEFAULT_FOOTPRINT_MIN_CELL_PX_FOR_TEXT
    // doc comment. Every other new field IS a byte-identical no-op default.
    const config = footprintSettingsToConfig(DEFAULT_FOOTPRINT_SETTINGS);
    expect(config.valuesDivider).toBe(DEFAULT_FOOTPRINT_CONFIG.valuesDivider);
    expect(config.minCellPxForText).toBe(DEFAULT_FOOTPRINT_SETTINGS.minCellPxForText);
    expect(config.imbalanceMinDiff).toBe(DEFAULT_FOOTPRINT_CONFIG.imbalanceMinDiff);
    expect(config.imbalanceIgnoreZeros).toBe(DEFAULT_FOOTPRINT_CONFIG.imbalanceIgnoreZeros);
    expect(config.imbalanceBold).toBe(DEFAULT_FOOTPRINT_CONFIG.imbalanceBold);
    expect(config.proportionUpperPercentile).toBe(DEFAULT_FOOTPRINT_CONFIG.proportionUpperPercentile);
  });

  it('valuesDivider/imbalanceIgnoreZeros/imbalanceBold plumb through unchanged (non-clamped fields)', () => {
    const config = footprintSettingsToConfig({
      ...DEFAULT_FOOTPRINT_SETTINGS,
      valuesDivider: 1,
      imbalanceIgnoreZeros: false,
      imbalanceBold: false,
    });
    expect(config.valuesDivider).toBe(1);
    expect(config.imbalanceIgnoreZeros).toBe(false);
    expect(config.imbalanceBold).toBe(false);
  });

  it('minCellPxForText is clamped to [20, 80]', () => {
    expect(footprintSettingsToConfig({ ...DEFAULT_FOOTPRINT_SETTINGS, minCellPxForText: 5 }).minCellPxForText).toBe(20);
    expect(footprintSettingsToConfig({ ...DEFAULT_FOOTPRINT_SETTINGS, minCellPxForText: 500 }).minCellPxForText).toBe(80);
    expect(footprintSettingsToConfig({ ...DEFAULT_FOOTPRINT_SETTINGS, minCellPxForText: 42 }).minCellPxForText).toBe(42);
  });

  it('proportionUpperPercentile is clamped to [90, 100]', () => {
    expect(footprintSettingsToConfig({ ...DEFAULT_FOOTPRINT_SETTINGS, proportionUpperPercentile: 50 }).proportionUpperPercentile).toBe(90);
    expect(footprintSettingsToConfig({ ...DEFAULT_FOOTPRINT_SETTINGS, proportionUpperPercentile: 999 }).proportionUpperPercentile).toBe(100);
    expect(footprintSettingsToConfig({ ...DEFAULT_FOOTPRINT_SETTINGS, proportionUpperPercentile: 95 }).proportionUpperPercentile).toBe(95);
  });

  it('imbalanceMinDiff is floored at 0 (never negative)', () => {
    expect(footprintSettingsToConfig({ ...DEFAULT_FOOTPRINT_SETTINGS, imbalanceMinDiff: -5 }).imbalanceMinDiff).toBe(0);
    expect(footprintSettingsToConfig({ ...DEFAULT_FOOTPRINT_SETTINGS, imbalanceMinDiff: 25 }).imbalanceMinDiff).toBe(25);
  });
});

describe('snapRowSizePriceToTick', () => {
  it('snaps to the nearest tick multiple', () => {
    expect(snapRowSizePriceToTick(5.03, 0.01)).toBeCloseTo(5.03, 5);
    expect(snapRowSizePriceToTick(5.034, 0.01)).toBeCloseTo(5.03, 5);
    expect(snapRowSizePriceToTick(5.037, 0.01)).toBeCloseTo(5.04, 5);
  });

  it('never snaps below 1 tick', () => {
    expect(snapRowSizePriceToTick(0.001, 0.25)).toBe(0.25);
  });
});

describe('snapRowSizeTicksToInt', () => {
  it('rounds to the nearest integer, minimum 1', () => {
    expect(snapRowSizeTicksToInt(3.4)).toBe(3);
    expect(snapRowSizeTicksToInt(3.6)).toBe(4);
    expect(snapRowSizeTicksToInt(0.2)).toBe(1);
    expect(snapRowSizeTicksToInt(-5)).toBe(1);
  });
});

describe('resolveEffectiveRowSize', () => {
  it('auto mode defers to suggestedRowSize (matches pre-PR-2 Math.max(suggested, tickSize) behavior)', () => {
    const settings = { rowSizeMode: 'auto' as const, rowSizeValue: null };
    expect(resolveEffectiveRowSize(settings, 0.01, 0.5)).toBe(0.5);
    // suggestedRowSize below tickSize is floored up to tickSize.
    expect(resolveEffectiveRowSize(settings, 0.25, 0.1)).toBe(0.25);
  });

  it('price mode snaps rowSizeValue to the tick grid, ignoring suggestedRowSize entirely', () => {
    const settings = { rowSizeMode: 'price' as const, rowSizeValue: 5.037 };
    expect(resolveEffectiveRowSize(settings, 0.01, 999)).toBeCloseTo(5.04, 5);
  });

  it('ticks mode multiplies the snapped tick count by tickSize, ignoring suggestedRowSize entirely', () => {
    const settings = { rowSizeMode: 'ticks' as const, rowSizeValue: 4.6 };
    expect(resolveEffectiveRowSize(settings, 0.25, 999)).toBeCloseTo(5 * 0.25, 5);
  });

  it('falls back to auto behavior when rowSizeValue is null even if mode is price/ticks (defensive)', () => {
    expect(resolveEffectiveRowSize({ rowSizeMode: 'price', rowSizeValue: null }, 0.01, 0.5)).toBe(0.5);
    expect(resolveEffectiveRowSize({ rowSizeMode: 'ticks', rowSizeValue: null }, 0.01, 0.5)).toBe(0.5);
  });
});
