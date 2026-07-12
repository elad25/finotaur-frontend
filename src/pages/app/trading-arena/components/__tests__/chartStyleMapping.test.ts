// src/pages/app/trading-arena/components/__tests__/chartStyleMapping.test.ts
//
// Coverage for the pure lw-charts options builders (chartStyleToChartOptions
// / chartStyleToSeriesOptions) and the timezone formatter builder
// (buildTimezoneChartOptions / getZonedParts), including a DST-correctness
// check for Asia/Jerusalem (Israel flips between IST=UTC+2 in winter and
// IDT=UTC+3 in summer — a fixed-offset implementation would get one of the
// two wrong; Intl.DateTimeFormat resolves each timestamp independently).

import { describe, it, expect } from 'vitest';
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  TickMarkType,
  type TickMarkFormatter,
  type TimeFormatterFn,
  type Time,
} from 'lightweight-charts';
import {
  buildTimezoneChartOptions,
  chartStyleToChartOptions,
  chartStyleToSeriesOptions,
  getZonedParts,
} from '../chartStyleMapping';
import { DEFAULT_CHART_STYLE, type ChartStyleSettings } from '../chartStyleSettings';

// DeepPartial<T> (lightweight-charts' own utility type) maps a function
// property's own keys individually, which strips its call signature — so
// `opts.timeScale.tickMarkFormatter` types as a non-callable object shape.
// These two helpers cast back to the real function type at the single call
// boundary, keeping every actual test assertion type-safe.
function asTickMarkFormatter(fn: unknown): TickMarkFormatter {
  return fn as TickMarkFormatter;
}
function asTimeFormatter(fn: unknown): TimeFormatterFn<Time> {
  return fn as TimeFormatterFn<Time>;
}

describe('getZonedParts', () => {
  it('resolves Asia/Jerusalem winter (IST, UTC+2) correctly', () => {
    // 2026-01-15T12:00:00Z — winter, no DST in Israel.
    const ts = Date.UTC(2026, 0, 15, 12, 0, 0) / 1000;
    const parts = getZonedParts(ts, 'Asia/Jerusalem');
    expect(parts).toEqual({ year: 2026, month: 1, day: 15, hour: 14, minute: 0, second: 0 });
  });

  it('resolves Asia/Jerusalem summer (IDT, UTC+3) correctly — DST-aware, not a fixed offset', () => {
    // 2026-07-15T12:00:00Z — summer, Israel is on IDT.
    const ts = Date.UTC(2026, 6, 15, 12, 0, 0) / 1000;
    const parts = getZonedParts(ts, 'Asia/Jerusalem');
    expect(parts).toEqual({ year: 2026, month: 7, day: 15, hour: 15, minute: 0, second: 0 });
  });

  it('winter and summer offsets for the SAME UTC instant differ by exactly 1 hour (proves per-timestamp DST resolution)', () => {
    const winterTs = Date.UTC(2026, 0, 15, 12, 0, 0) / 1000;
    const summerTs = Date.UTC(2026, 6, 15, 12, 0, 0) / 1000;
    const winterHour = getZonedParts(winterTs, 'Asia/Jerusalem').hour;
    const summerHour = getZonedParts(summerTs, 'Asia/Jerusalem').hour;
    expect(summerHour - winterHour).toBe(1);
  });

  it('resolves UTC with zero offset', () => {
    const ts = Date.UTC(2026, 5, 1, 9, 30, 0) / 1000;
    expect(getZonedParts(ts, 'UTC')).toEqual({ year: 2026, month: 6, day: 1, hour: 9, minute: 30, second: 0 });
  });
});

describe('buildTimezoneChartOptions', () => {
  it('returns undefined for "local" — explicit no-override / current-behavior case', () => {
    expect(buildTimezoneChartOptions('local')).toBeUndefined();
  });

  it('returns localization.timeFormatter + timeScale.tickMarkFormatter for a named zone', () => {
    const opts = buildTimezoneChartOptions('Asia/Tokyo');
    expect(opts).toBeDefined();
    expect(typeof opts!.localization?.timeFormatter).toBe('function');
    expect(typeof opts!.timeScale?.tickMarkFormatter).toBe('function');
  });

  it('tickMarkFormatter renders each TickMarkType distinctly for UTC', () => {
    const opts = buildTimezoneChartOptions('utc');
    const formatter = asTickMarkFormatter(opts!.timeScale!.tickMarkFormatter);
    const ts = Date.UTC(2026, 2, 5, 8, 45, 30) / 1000; // 2026-03-05T08:45:30Z

    expect(formatter(ts as Time, TickMarkType.Year, 'en-US')).toBe('2026');
    expect(formatter(ts as Time, TickMarkType.Month, 'en-US')).toBe("Mar '26");
    expect(formatter(ts as Time, TickMarkType.DayOfMonth, 'en-US')).toBe('Mar 5');
    expect(formatter(ts as Time, TickMarkType.Time, 'en-US')).toBe('08:45');
    expect(formatter(ts as Time, TickMarkType.TimeWithSeconds, 'en-US')).toBe('08:45:30');
  });

  it('timeFormatter produces a non-empty human string for a named zone', () => {
    const opts = buildTimezoneChartOptions('Europe/London');
    const ts = Date.UTC(2026, 5, 20, 14, 0, 0) / 1000;
    const formatter = asTimeFormatter(opts!.localization!.timeFormatter);
    const formatted = formatter(ts as Time);
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).toContain('Jun');
  });
});

describe('chartStyleToChartOptions', () => {
  it('maps DEFAULT_CHART_STYLE to options matching FinotaurChart\'s hardcoded current look', () => {
    const opts = chartStyleToChartOptions(DEFAULT_CHART_STYLE);

    expect(opts.layout?.background).toEqual({ type: ColorType.Solid, color: '#08080a' });
    expect(opts.layout?.fontSize).toBe(11);
    expect(opts.grid?.vertLines?.visible).toBe(true);
    expect(opts.grid?.horzLines?.visible).toBe(true);
    expect(opts.watermark?.visible).toBe(true);
    // 'dashed' (the default) maps to LargeDashed — matching today's hardcoded
    // crosshair style, not lw-charts' own "Dashed".
    expect(opts.crosshair?.mode).toBe(CrosshairMode.Normal);
    expect(opts.crosshair?.vertLine?.style).toBe(LineStyle.LargeDashed);
    expect(opts.crosshair?.horzLine?.style).toBe(LineStyle.LargeDashed);
    // timezone='local' → no localization/timeScale override.
    expect(opts.localization).toBeUndefined();
    expect(opts.timeScale).toBeUndefined();
  });

  it('crosshairStyle "solid" maps to LineStyle.Solid, mode stays Normal', () => {
    const settings: ChartStyleSettings = { ...DEFAULT_CHART_STYLE, crosshairStyle: 'solid' };
    const opts = chartStyleToChartOptions(settings);
    expect(opts.crosshair?.mode).toBe(CrosshairMode.Normal);
    expect(opts.crosshair?.vertLine?.style).toBe(LineStyle.Solid);
  });

  it('crosshairStyle "hidden" maps to CrosshairMode.Hidden with no per-line style override', () => {
    const settings: ChartStyleSettings = { ...DEFAULT_CHART_STYLE, crosshairStyle: 'hidden' };
    const opts = chartStyleToChartOptions(settings);
    expect(opts.crosshair?.mode).toBe(CrosshairMode.Hidden);
    expect(opts.crosshair?.vertLine).toBeUndefined();
    expect(opts.crosshair?.horzLine).toBeUndefined();
  });

  it('a non-"local" timezone adds localization/timeScale formatters', () => {
    const settings: ChartStyleSettings = { ...DEFAULT_CHART_STYLE, timezone: 'utc' };
    const opts = chartStyleToChartOptions(settings);
    expect(typeof opts.localization?.timeFormatter).toBe('function');
    expect(typeof opts.timeScale?.tickMarkFormatter).toBe('function');
  });

  it('grid/watermark visibility toggles pass through 1:1', () => {
    const settings: ChartStyleSettings = {
      ...DEFAULT_CHART_STYLE,
      gridVerticalVisible: false,
      gridHorizontalVisible: false,
      watermarkVisible: false,
    };
    const opts = chartStyleToChartOptions(settings);
    expect(opts.grid?.vertLines?.visible).toBe(false);
    expect(opts.grid?.horzLines?.visible).toBe(false);
    expect(opts.watermark?.visible).toBe(false);
  });
});

describe('chartStyleToSeriesOptions', () => {
  it('maps DEFAULT_CHART_STYLE to series options matching current defaults, no priceFormat override', () => {
    const opts = chartStyleToSeriesOptions(DEFAULT_CHART_STYLE);
    expect(opts.upColor).toBe('#22c55e');
    expect(opts.downColor).toBe('#dc2626');
    expect(opts.borderVisible).toBe(true);
    expect(opts.wickVisible).toBe(true);
    expect(opts.priceLineVisible).toBe(true);
    expect(opts.priceFormat).toBeUndefined();
  });

  it('border/wick colors mirror the up/down body color', () => {
    const settings: ChartStyleSettings = { ...DEFAULT_CHART_STYLE, candleUpColor: '#3b82f6', candleDownColor: '#f97316' };
    const opts = chartStyleToSeriesOptions(settings);
    expect(opts.borderUpColor).toBe('#3b82f6');
    expect(opts.borderDownColor).toBe('#f97316');
    expect(opts.wickUpColor).toBe('#3b82f6');
    expect(opts.wickDownColor).toBe('#f97316');
  });

  it('borders/wicks off maps to borderVisible/wickVisible false regardless of color', () => {
    const settings: ChartStyleSettings = { ...DEFAULT_CHART_STYLE, candleBordersVisible: false, candleWicksVisible: false };
    const opts = chartStyleToSeriesOptions(settings);
    expect(opts.borderVisible).toBe(false);
    expect(opts.wickVisible).toBe(false);
  });

  it('pricePrecision "default" omits priceFormat entirely (per-symbol current behavior preserved)', () => {
    const opts = chartStyleToSeriesOptions({ ...DEFAULT_CHART_STYLE, pricePrecision: 'default' });
    expect(opts.priceFormat).toBeUndefined();
  });

  it('pricePrecision 1 -> precision=1, minMove=0.1', () => {
    const opts = chartStyleToSeriesOptions({ ...DEFAULT_CHART_STYLE, pricePrecision: 1 });
    expect(opts.priceFormat).toEqual({ type: 'price', precision: 1, minMove: 0.1 });
  });

  it('pricePrecision 2 -> precision=2, minMove=0.01', () => {
    const opts = chartStyleToSeriesOptions({ ...DEFAULT_CHART_STYLE, pricePrecision: 2 });
    expect(opts.priceFormat).toEqual({ type: 'price', precision: 2, minMove: 0.01 });
  });

  it('lastPriceLineVisible false maps to priceLineVisible false', () => {
    const opts = chartStyleToSeriesOptions({ ...DEFAULT_CHART_STYLE, lastPriceLineVisible: false });
    expect(opts.priceLineVisible).toBe(false);
  });
});
