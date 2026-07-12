// src/pages/app/trading-arena/components/chartStyleMapping.ts
//
// Pure functions translating a ChartStyleSettings object into
// lightweight-charts v4 option objects. Extracted from FinotaurChart.tsx's
// apply-effect so they're unit-testable without mounting a chart (no DOM /
// canvas needed) — see chartStyleMapping.test.ts.
//
// Nothing here reads or writes state; every function is (settings) => options.

import {
  ColorType,
  CrosshairMode,
  LineStyle,
  TickMarkType,
  type ChartOptions,
  type CandlestickSeriesPartialOptions,
  type DeepPartial,
  type Time,
} from 'lightweight-charts';

import type { ChartStyleSettings, ChartTimezone } from './chartStyleSettings';

// ═══════════════════════════════════════════════════════════════
// Timezone → lw-charts localization/timeScale formatters
// ═══════════════════════════════════════════════════════════════
// IANA zone name lw-charts should format timestamps against. 'local' has no
// entry — it's the "no override" case (browser-local, lw-charts' own
// default behavior). 'utc' maps to the literal 'UTC' zone.
const IANA_ZONE_MAP: Partial<Record<ChartTimezone, string>> = {
  utc: 'UTC',
  'America/New_York': 'America/New_York',
  'Europe/London': 'Europe/London',
  'Asia/Jerusalem': 'Asia/Jerusalem',
  'Asia/Tokyo': 'Asia/Tokyo',
};

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Resolves a unix-seconds timestamp's wall-clock parts in `ianaZone` using
 * Intl.DateTimeFormat — this is what makes the mapping DST-correct: Intl
 * looks up the zone's actual UTC offset for the SPECIFIC date given (not a
 * single global constant), so e.g. Asia/Jerusalem correctly flips between
 * IST (UTC+2) and IDT (UTC+3) around its real transition dates each year.
 * Exported for the dedicated timezone-formatter test.
 */
export function getZonedParts(timestampSeconds: number, ianaZone: string): ZonedParts {
  const date = new Date(timestampSeconds * 1000);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ianaZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? '0');

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function timeToSeconds(time: Time): number | null {
  // Intraday/EOD bars in this app always pass a UTCTimestamp (number of
  // unix seconds) as Time — see types.ts's Bar['time']. BusinessDay objects
  // (the other member of the Time union) aren't used anywhere in this repo;
  // guard defensively rather than throw.
  return typeof time === 'number' ? time : null;
}

/**
 * Builds the `localization.timeFormatter` + `timeScale.tickMarkFormatter`
 * pair for a given timezone selection.
 *
 * Returns `undefined` for `'local'` — that is the explicit "no override"
 * case (lw-charts' own default formatting, which reads the JS Date object
 * in the browser's local timezone — exactly today's/original behavior).
 */
export function buildTimezoneChartOptions(tz: ChartTimezone): DeepPartial<ChartOptions> | undefined {
  const ianaZone = IANA_ZONE_MAP[tz];
  if (!ianaZone) return undefined; // 'local' (or any unrecognized value) — no-op

  return {
    localization: {
      timeFormatter: (time: Time) => {
        const secs = timeToSeconds(time);
        if (secs === null) return '';
        const p = getZonedParts(secs, ianaZone);
        return `${MONTH_ABBR[p.month - 1]} ${p.day} '${String(p.year).slice(-2)}  ${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
      },
    },
    timeScale: {
      tickMarkFormatter: (time: Time, tickMarkType: TickMarkType) => {
        const secs = timeToSeconds(time);
        if (secs === null) return '';
        const p = getZonedParts(secs, ianaZone);
        switch (tickMarkType) {
          case TickMarkType.Year:
            return `${p.year}`;
          case TickMarkType.Month:
            return `${MONTH_ABBR[p.month - 1]} '${String(p.year).slice(-2)}`;
          case TickMarkType.DayOfMonth:
            return `${MONTH_ABBR[p.month - 1]} ${p.day}`;
          case TickMarkType.TimeWithSeconds:
            return `${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
          case TickMarkType.Time:
          default:
            return `${pad2(p.hour)}:${pad2(p.minute)}`;
        }
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Crosshair style → lw-charts crosshair options
// ═══════════════════════════════════════════════════════════════
function crosshairOptions(style: ChartStyleSettings['crosshairStyle']) {
  if (style === 'hidden') {
    // CrosshairMode.Hidden disables rendering of BOTH lines globally — the
    // cleanest lw-charts-native way to hide the crosshair entirely (vs.
    // toggling vertLine.visible/horzLine.visible individually).
    return { mode: CrosshairMode.Hidden };
  }
  // 'solid' | 'dashed' — line style only; mode stays Normal (today's mode).
  // 'dashed' maps to LargeDashed (3), matching FinotaurChart's current
  // hardcoded crosshair style — NOT lw-charts' own Dashed (2) — so the
  // default preset is pixel-identical to today's chart.
  const lineStyle = style === 'solid' ? LineStyle.Solid : LineStyle.LargeDashed;
  return {
    mode: CrosshairMode.Normal,
    vertLine: { style: lineStyle },
    horzLine: { style: lineStyle },
  };
}

// ═══════════════════════════════════════════════════════════════
// ChartStyleSettings → chart-level DeepPartial<ChartOptions>
// ═══════════════════════════════════════════════════════════════
/**
 * Maps the CANVAS / SCALES / TIME sections onto `chart.applyOptions()`.
 * Layered on top of (not replacing) FinotaurChart's own buildChartOptions —
 * callers `applyOptions` this AFTER the base build so only the fields the
 * user actually changed diverge from FINOTAUR_DARK_THEME.
 */
export function chartStyleToChartOptions(settings: ChartStyleSettings): DeepPartial<ChartOptions> {
  const timezoneOptions = buildTimezoneChartOptions(settings.timezone);

  return {
    layout: {
      background: { type: ColorType.Solid, color: settings.backgroundColor },
      // lw-charts v4 has no separate price-axis-only font-size option —
      // layout.fontSize is the single global text-size control (also used
      // by the time axis + crosshair labels). Documented tradeoff: the
      // "Price axis font size" setting affects chart text size globally.
      fontSize: settings.priceAxisFontSize,
    },
    grid: {
      vertLines: { visible: settings.gridVerticalVisible },
      horzLines: { visible: settings.gridHorizontalVisible },
    },
    crosshair: crosshairOptions(settings.crosshairStyle),
    watermark: { visible: settings.watermarkVisible },
    ...(timezoneOptions ?? {}),
  };
}

// ═══════════════════════════════════════════════════════════════
// ChartStyleSettings → candlestick series DeepPartial options
// ═══════════════════════════════════════════════════════════════
/**
 * Maps the CANDLES section (+ last-price-line + price precision) onto
 * `candleSeries.applyOptions()`.
 *
 * Border/wick colors mirror the up/down body color (the spec exposes only a
 * single up/down swatch — no separate border/wick color pickers — so
 * "Borders on/off" and "Wicks on/off" are pure visibility toggles, not color
 * choices). `borderVisible`/`wickVisible` fully hide the border/wick
 * regardless of color when off.
 */
export function chartStyleToSeriesOptions(settings: ChartStyleSettings): CandlestickSeriesPartialOptions {
  const base: CandlestickSeriesPartialOptions = {
    upColor: settings.candleUpColor,
    downColor: settings.candleDownColor,
    borderVisible: settings.candleBordersVisible,
    borderUpColor: settings.candleUpColor,
    borderDownColor: settings.candleDownColor,
    wickVisible: settings.candleWicksVisible,
    wickUpColor: settings.candleUpColor,
    wickDownColor: settings.candleDownColor,
    priceLineVisible: settings.lastPriceLineVisible,
  };

  // 'default' = per-symbol current behavior — omit priceFormat entirely so
  // the series keeps whatever precision it already has (no override).
  const precision = settings.pricePrecision;
  if (precision === 'default') return base;

  return {
    ...base,
    priceFormat: {
      type: 'price',
      precision,
      minMove: Math.pow(10, -precision),
    },
  };
}
