// src/pages/app/trading-arena/components/__tests__/chartStyleSettings.test.ts
//
// Coverage for the Chart Settings model: DEFAULT_CHART_STYLE must reproduce
// FinotaurChart's CURRENT hardcoded look (see chartStyleSettings.ts's header
// comment for the exact verified values), sanitize must degrade gracefully
// per-field on corrupt/foreign JSON, and round-tripping through
// JSON.stringify/parse + sanitize must be lossless for well-formed input.

import { describe, it, expect } from 'vitest';
import {
  CANDLE_COLOR_PRESETS,
  BACKGROUND_PRESETS,
  DEFAULT_CHART_STYLE,
  DEFAULT_SESSION_VOLUME_PROFILE_SETTINGS,
  sanitizeChartStyleSettings,
  sanitizeSessionVolumeProfileSettings,
  type ChartStyleSettings,
} from '../chartStyleSettings';

describe('DEFAULT_CHART_STYLE', () => {
  it('matches FinotaurChart.tsx\'s current hardcoded look (locked defaults)', () => {
    // Candles — FINOTAUR_DARK_THEME.candleUp/candleDown
    expect(DEFAULT_CHART_STYLE.candleUpColor).toBe('#22c55e');
    expect(DEFAULT_CHART_STYLE.candleDownColor).toBe('#dc2626');
    expect(DEFAULT_CHART_STYLE.candleBordersVisible).toBe(true);
    expect(DEFAULT_CHART_STYLE.candleWicksVisible).toBe(true);

    // Canvas — buildChartOptions() background/grid/watermark
    expect(DEFAULT_CHART_STYLE.backgroundColor).toBe('#08080a');
    expect(DEFAULT_CHART_STYLE.gridVerticalVisible).toBe(true);
    expect(DEFAULT_CHART_STYLE.gridHorizontalVisible).toBe(true);
    expect(DEFAULT_CHART_STYLE.watermarkVisible).toBe(true);
    // Today's hardcoded crosshair line style is LineStyle.LargeDashed (3),
    // not lw-charts' own "Dashed" (2) — 'dashed' is mapped to LargeDashed
    // in chartStyleMapping.ts specifically so this default is a true no-op.
    expect(DEFAULT_CHART_STYLE.crosshairStyle).toBe('dashed');

    // Scales & lines
    expect(DEFAULT_CHART_STYLE.lastPriceLineVisible).toBe(true);
    expect(DEFAULT_CHART_STYLE.priceAxisFontSize).toBe(11);

    // Time
    expect(DEFAULT_CHART_STYLE.timezone).toBe('local');
    expect(DEFAULT_CHART_STYLE.pricePrecision).toBe('default');

    // Session Volume Profile
    expect(DEFAULT_CHART_STYLE.volumeProfile).toEqual(DEFAULT_SESSION_VOLUME_PROFILE_SETTINGS);
    // footprintOnZoom is a dead/deprecated field (Chart tab footprint bridge
    // removed 2026-07-18) — defaults to false, has no effect on rendering.
    expect(DEFAULT_CHART_STYLE.footprintOnZoom).toBe(false);
  });

  it('candle default is exactly the "classic" preset', () => {
    const classic = CANDLE_COLOR_PRESETS.find((p) => p.id === 'classic');
    expect(classic).toBeDefined();
    expect(DEFAULT_CHART_STYLE.candleUpColor).toBe(classic!.up);
    expect(DEFAULT_CHART_STYLE.candleDownColor).toBe(classic!.down);
  });

  it('background default is exactly the "pitchBlack" preset', () => {
    const pitchBlack = BACKGROUND_PRESETS.find((p) => p.id === 'pitchBlack');
    expect(pitchBlack).toBeDefined();
    expect(DEFAULT_CHART_STYLE.backgroundColor).toBe(pitchBlack!.color);
  });
});

describe('CANDLE_COLOR_PRESETS / BACKGROUND_PRESETS', () => {
  it('exposes exactly 6 candle presets and 3 background presets (per spec)', () => {
    expect(CANDLE_COLOR_PRESETS).toHaveLength(6);
    expect(BACKGROUND_PRESETS).toHaveLength(3);
  });

  it('every candle preset has distinct up/down hex colors', () => {
    for (const preset of CANDLE_COLOR_PRESETS) {
      expect(preset.up).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      expect(preset.down).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      expect(preset.up).not.toBe(preset.down);
    }
  });
});

describe('sanitizeChartStyleSettings', () => {
  it('returns the fallback unchanged for null/non-object input', () => {
    expect(sanitizeChartStyleSettings(null)).toEqual(DEFAULT_CHART_STYLE);
    expect(sanitizeChartStyleSettings(undefined)).toEqual(DEFAULT_CHART_STYLE);
    expect(sanitizeChartStyleSettings('garbage')).toEqual(DEFAULT_CHART_STYLE);
    expect(sanitizeChartStyleSettings(42)).toEqual(DEFAULT_CHART_STYLE);
  });

  it('degrades per-field on partial/corrupt JSON instead of throwing', () => {
    const result = sanitizeChartStyleSettings({
      candleUpColor: 'not-a-color',
      candleBordersVisible: 'yes', // wrong type
      crosshairStyle: 'invisible', // not a valid enum value
      priceAxisFontSize: 999, // not in {11,12,13}
      timezone: 'Mars/Colony', // not a supported zone
      pricePrecision: 7, // not in {'default',1,2}
      lastPriceLineVisible: false, // valid — should pass through
    });

    expect(result.candleUpColor).toBe(DEFAULT_CHART_STYLE.candleUpColor);
    expect(result.candleBordersVisible).toBe(DEFAULT_CHART_STYLE.candleBordersVisible);
    expect(result.crosshairStyle).toBe(DEFAULT_CHART_STYLE.crosshairStyle);
    expect(result.priceAxisFontSize).toBe(DEFAULT_CHART_STYLE.priceAxisFontSize);
    expect(result.timezone).toBe(DEFAULT_CHART_STYLE.timezone);
    expect(result.pricePrecision).toBe(DEFAULT_CHART_STYLE.pricePrecision);
    expect(result.lastPriceLineVisible).toBe(false);
  });

  it('round-trips a fully well-formed settings object losslessly through JSON', () => {
    const custom: ChartStyleSettings = {
      candleUpColor: '#3b82f6',
      candleDownColor: '#f97316',
      candleBordersVisible: false,
      candleWicksVisible: false,
      candleBorderUpColor: '#22c55e',
      candleBorderDownColor: '#ef4444',
      candleWickUpColor: '#16a34acc',
      candleWickDownColor: '#dc2626cc',
      backgroundColor: '#16181d',
      gridVerticalVisible: false,
      gridHorizontalVisible: false,
      crosshairStyle: 'hidden',
      watermarkVisible: false,
      lastPriceLineVisible: false,
      priceAxisFontSize: 13,
      timezone: 'Asia/Jerusalem',
      pricePrecision: 2,
      volumeProfile: {
        enabled: false,
        period: 'custom',
        customSessionStart: '18:00',
        customSessionEnd: '06:00',
        showVpoc: false,
        showVahVal: false,
        anchorSide: 'right',
        profileWidthPct: 45,
        opacity: 0.6,
      },
      footprintOnZoom: true,
    };

    const roundTripped = sanitizeChartStyleSettings(JSON.parse(JSON.stringify(custom)));
    expect(roundTripped).toEqual(custom);
  });

  it('accepts pricePrecision values 1 and 2 as valid (not just "default")', () => {
    expect(sanitizeChartStyleSettings({ pricePrecision: 1 }).pricePrecision).toBe(1);
    expect(sanitizeChartStyleSettings({ pricePrecision: 2 }).pricePrecision).toBe(2);
  });

  it('accepts every documented timezone option', () => {
    const zones = ['local', 'utc', 'America/New_York', 'Europe/London', 'Asia/Jerusalem', 'Asia/Tokyo'];
    for (const tz of zones) {
      expect(sanitizeChartStyleSettings({ timezone: tz }).timezone).toBe(tz);
    }
  });

  it('degrades a corrupt/foreign nested volumeProfile object to defaults instead of throwing', () => {
    const result = sanitizeChartStyleSettings({ volumeProfile: 'not-an-object', footprintOnZoom: 'yes' });
    expect(result.volumeProfile).toEqual(DEFAULT_SESSION_VOLUME_PROFILE_SETTINGS);
    // 'yes' is not a boolean — degrades to the fallback (DEFAULT_CHART_STYLE.footprintOnZoom = false).
    expect(result.footprintOnZoom).toBe(false);
  });
});

describe('sanitizeSessionVolumeProfileSettings', () => {
  it('returns the fallback unchanged for null/non-object input', () => {
    expect(sanitizeSessionVolumeProfileSettings(null)).toEqual(DEFAULT_SESSION_VOLUME_PROFILE_SETTINGS);
    expect(sanitizeSessionVolumeProfileSettings('garbage')).toEqual(DEFAULT_SESSION_VOLUME_PROFILE_SETTINGS);
  });

  it('clamps profileWidthPct to [5, 60] and opacity to [0, 1]', () => {
    expect(sanitizeSessionVolumeProfileSettings({ profileWidthPct: 999 }).profileWidthPct).toBe(60);
    expect(sanitizeSessionVolumeProfileSettings({ profileWidthPct: -5 }).profileWidthPct).toBe(5);
    expect(sanitizeSessionVolumeProfileSettings({ opacity: 5 }).opacity).toBe(1);
    expect(sanitizeSessionVolumeProfileSettings({ opacity: -1 }).opacity).toBe(0);
  });

  it('rejects malformed HH:MM custom session strings, falling back to default', () => {
    expect(sanitizeSessionVolumeProfileSettings({ customSessionStart: 'nine-thirty' }).customSessionStart)
      .toBe(DEFAULT_SESSION_VOLUME_PROFILE_SETTINGS.customSessionStart);
    expect(sanitizeSessionVolumeProfileSettings({ customSessionStart: '09:30' }).customSessionStart).toBe('09:30');
  });

  it('rejects an invalid period enum value', () => {
    expect(sanitizeSessionVolumeProfileSettings({ period: 'quarter' }).period).toBe('day');
    expect(sanitizeSessionVolumeProfileSettings({ period: 'custom' }).period).toBe('custom');
  });
});
