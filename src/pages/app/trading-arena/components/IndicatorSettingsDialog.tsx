/**
 * Trading Arena — TradingView-style per-indicator settings dialog
 * (Inputs / Style / Visibility), opened from the gear icon on
 * ActiveIndicatorsLegend.tsx.
 *
 * Deliberately a SEPARATE dialog from IndicatorsDialog.tsx (the "+
 * Indicators" catalog, which stays as-is for adding/removing indicators and
 * editing Inputs inline). This dialog is per-indicator and adds two new
 * concerns IndicatorsDialog never had:
 *
 *  - Style tab — per-line color/opacity/thickness/line-style, persisted via
 *    useArenaIndicatorPreferences's `styles` (see indicatorsSettings.ts's
 *    ArenaIndicatorStyles). Threaded into FinotaurChart through
 *    `Indicator.lineStyles` (see indicatorsSettings.ts's
 *    buildIndicatorsFromArenaSettings + FinotaurChart.tsx's series creation).
 *  - Visibility tab — a GLOBAL (not per-indicator) timeframe-bucket gate,
 *    persisted via `visibility` (indicatorsSettings.ts's
 *    ArenaIndicatorVisibility) and applied in TradingArena.tsx via
 *    `isIntervalVisibleForIndicators`.
 *
 * The Inputs tab reuses `renderIndicatorInputsFields` from
 * IndicatorsDialog.tsx (module-level export, not a component) so the exact
 * same fields render in both dialogs with zero duplication/drift.
 */

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { NumberField, pillClass, renderIndicatorInputsFields } from './IndicatorsDialog';
import {
  ARENA_VISIBILITY_BUCKET_RANGE,
  INDICATOR_COLOR_SWATCHES,
  MACD_HISTOGRAM_AUTO_COLOR,
  getArenaIndicatorDefinition,
  type ArenaIndicatorKey,
  type ArenaIndicatorLineStyle,
  type ArenaIndicatorParams,
  type ArenaIndicatorStylePatch,
  type ArenaIndicatorStyles,
  type ArenaIndicatorVisibility,
  type ArenaVisibilityBucket,
  type ArenaVisibilityBucketKey,
  type ArenaLineStyleKind,
} from './indicatorsSettings';
import type { ChartStyleSettings } from './chartStyleSettings';

export interface IndicatorSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicatorKey: ArenaIndicatorKey | null;
  params: ArenaIndicatorParams;
  onUpdateParams: <K extends keyof ArenaIndicatorParams>(key: K, patch: Partial<ArenaIndicatorParams[K]>) => void;
  styles: ArenaIndicatorStyles;
  onUpdateStyles: <K extends keyof ArenaIndicatorStyles>(key: K, patch: ArenaIndicatorStylePatch<K>) => void;
  visibility: ArenaIndicatorVisibility;
  onUpdateVisibility: (patch: Partial<ArenaIndicatorVisibility>) => void;
  chartStyle: ChartStyleSettings;
  onChartStyleChange: (patch: Partial<ChartStyleSettings>) => void;
  intraday: boolean;
  onResetIndicator: (key: ArenaIndicatorKey) => void;
}

type SettingsTab = 'inputs' | 'style' | 'visibility';

const VISIBILITY_BUCKET_LABELS: { key: ArenaVisibilityBucketKey; label: string }[] = [
  { key: 'seconds', label: 'Seconds' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'hours', label: 'Hours' },
  { key: 'days', label: 'Days' },
  { key: 'weeks', label: 'Weeks' },
  { key: 'months', label: 'Months' },
];

const LINE_STYLE_KIND_OPTIONS: { value: ArenaLineStyleKind; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

const THICKNESS_OPTIONS: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

// ═══════════════════════════════════════════════════════════════
// One line/output row on the Style tab: visibility + color swatch +
// opacity + (optionally) thickness/line-style.
// ═══════════════════════════════════════════════════════════════
function LineStyleRow({
  label,
  style,
  onChange,
  showLineControls = true,
  autoColorValue,
}: {
  label: string;
  style: ArenaIndicatorLineStyle;
  onChange: (patch: Partial<ArenaIndicatorLineStyle>) => void;
  /** Histogram bars have no meaningful thickness/dash pattern — hide those controls. */
  showLineControls?: boolean;
  /** When set (MACD histogram only), the swatch popover offers an "Auto (Up/Down)" tile that reverts to per-bar green/red coloring. */
  autoColorValue?: string;
}) {
  const [swatchOpen, setSwatchOpen] = useState(false);
  const isAuto = autoColorValue !== undefined && style.color === autoColorValue;

  return (
    <div className="flex flex-col gap-2 rounded border p-2.5" style={{ borderColor: 'rgba(201,166,70,0.12)' }}>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[11px] font-semibold text-[#C0C0C0]">
          <input
            type="checkbox"
            checked={style.visible}
            onChange={(e) => onChange({ visible: e.target.checked })}
            style={{ accentColor: '#C9A646' }}
            className="h-3.5 w-3.5"
          />
          {label}
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSwatchOpen((o) => !o)}
            aria-haspopup="dialog"
            aria-expanded={swatchOpen}
            aria-label={`${label} color`}
            className="h-6 w-9 rounded border"
            style={{
              background: isAuto ? 'linear-gradient(90deg, #22c55e 50%, #dc2626 50%)' : style.color,
              borderColor: 'rgba(201,166,70,0.25)',
            }}
          />
          {swatchOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSwatchOpen(false)} aria-hidden="true" />
              <div
                role="dialog"
                aria-label={`${label} color swatches`}
                className="absolute right-0 top-[calc(100%+4px)] z-20 grid w-[168px] grid-cols-5 gap-1 rounded border p-2"
                style={{ background: '#0D0D0F', borderColor: 'rgba(201,166,70,0.25)' }}
              >
                {autoColorValue !== undefined && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ color: autoColorValue });
                      setSwatchOpen(false);
                    }}
                    className="col-span-5 mb-1 flex h-6 items-center justify-center rounded-sm border text-[9px] font-semibold text-[#0D0D0F]"
                    style={{ background: 'linear-gradient(90deg, #22c55e 50%, #dc2626 50%)', borderColor: 'rgba(201,166,70,0.25)' }}
                  >
                    Auto (Up/Down)
                  </button>
                )}
                {INDICATOR_COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onChange({ color: c });
                      setSwatchOpen(false);
                    }}
                    aria-label={c}
                    className={cn('h-5 w-5 rounded-sm border', !isAuto && style.color === c ? 'border-[#C9A646]' : 'border-white/10')}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-[10px] text-[#707070]">
          <span>Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(style.opacity * 100)}
            onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
            style={{ accentColor: '#C9A646' }}
            className="h-1 w-20"
          />
          <span className="w-8 text-right tabular-nums text-[#9A9A9A]">{Math.round(style.opacity * 100)}%</span>
        </label>

        {showLineControls && (
          <>
            <div className="flex items-center gap-1" role="group" aria-label={`${label} thickness`}>
              {THICKNESS_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChange({ thickness: t })}
                  aria-label={`${t}px`}
                  aria-pressed={style.thickness === t}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded border',
                    style.thickness === t ? 'border-[#C9A646] bg-[rgba(201,166,70,0.12)]' : 'border-transparent hover:bg-white/5',
                  )}
                >
                  <span className="w-3 rounded-full bg-[#C0C0C0]" style={{ height: t }} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1" role="group" aria-label={`${label} line style`}>
              {LINE_STYLE_KIND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ lineStyle: opt.value })}
                  className={pillClass(style.lineStyle === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Renders the Style tab's line rows for one indicator. `volumeProfile` is handled by the caller (no style rows — see the dialog body below). */
function renderStyleRows(
  key: Exclude<ArenaIndicatorKey, 'volumeProfile'>,
  styles: ArenaIndicatorStyles,
  onUpdateStyles: IndicatorSettingsDialogProps['onUpdateStyles'],
) {
  switch (key) {
    case 'macd':
      return (
        <>
          <LineStyleRow label="MACD" style={styles.macd.macdLine} onChange={(patch) => onUpdateStyles('macd', { macdLine: patch })} />
          <LineStyleRow label="Signal" style={styles.macd.signalLine} onChange={(patch) => onUpdateStyles('macd', { signalLine: patch })} />
          <LineStyleRow
            label="Histogram"
            style={styles.macd.histogram}
            onChange={(patch) => onUpdateStyles('macd', { histogram: patch })}
            showLineControls={false}
            autoColorValue={MACD_HISTOGRAM_AUTO_COLOR}
          />
        </>
      );
    case 'bbands':
      return (
        <>
          <LineStyleRow label="Basis" style={styles.bbands.basis} onChange={(patch) => onUpdateStyles('bbands', { basis: patch })} />
          <LineStyleRow label="Upper" style={styles.bbands.upper} onChange={(patch) => onUpdateStyles('bbands', { upper: patch })} />
          <LineStyleRow label="Lower" style={styles.bbands.lower} onChange={(patch) => onUpdateStyles('bbands', { lower: patch })} />
        </>
      );
    case 'ema':
    case 'sma':
    case 'vwap':
    case 'rsi':
    case 'atr':
    default:
      return (
        <LineStyleRow
          label={getArenaIndicatorDefinition(key).shortLabel}
          style={styles[key].line}
          onChange={(patch) => onUpdateStyles(key, { line: patch })}
        />
      );
  }
}

// ═══════════════════════════════════════════════════════════════
// One bucket row on the Visibility tab.
// ═══════════════════════════════════════════════════════════════
function VisibilityRow({
  label,
  bucket,
  range,
  onChange,
}: {
  label: string;
  bucket: ArenaVisibilityBucket;
  range: { min: number; max: number };
  onChange: (patch: Partial<ArenaVisibilityBucket>) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded px-2 py-1.5"
      style={{ background: bucket.enabled ? 'rgba(201,166,70,0.04)' : 'transparent' }}
    >
      <label className="flex items-center gap-2 text-[11px] font-semibold text-[#C0C0C0]">
        <input
          type="checkbox"
          checked={bucket.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          style={{ accentColor: '#C9A646' }}
          className="h-3.5 w-3.5"
        />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <NumberField label="Min" value={bucket.min} min={range.min} max={bucket.max} step={1} onCommit={(v) => onChange({ min: v })} />
        <NumberField label="Max" value={bucket.max} min={bucket.min} max={range.max} step={1} onCommit={(v) => onChange({ max: v })} />
      </div>
    </div>
  );
}

export function IndicatorSettingsDialog({
  open,
  onOpenChange,
  indicatorKey,
  params,
  onUpdateParams,
  styles,
  onUpdateStyles,
  visibility,
  onUpdateVisibility,
  chartStyle,
  onChartStyleChange,
  intraday,
  onResetIndicator,
}: IndicatorSettingsDialogProps) {
  const [tab, setTab] = useState<SettingsTab>('inputs');

  // Reset to the Inputs tab every time the dialog opens for a (possibly
  // different) indicator — a stale "Style"/"Visibility" tab selection from
  // the previous indicator would be confusing.
  useEffect(() => {
    if (open) setTab('inputs');
  }, [open, indicatorKey]);

  if (!indicatorKey) return null;
  const definition = getArenaIndicatorDefinition(indicatorKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[420px] gap-0 border-[rgba(201,166,70,0.25)] bg-[rgba(10,10,11,0.98)] p-0 text-white shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex-row items-center justify-between space-y-0 border-b px-5 py-4" style={{ borderColor: 'rgba(201,166,70,0.12)' }}>
          <DialogTitle className="text-[15px] font-semibold text-[#E8E8E8]">{definition.label}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 border-b px-4 py-2" style={{ borderColor: 'rgba(201,166,70,0.12)' }}>
          {(['inputs', 'style', 'visibility'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={pillClass(tab === t)}>
              {t === 'inputs' ? 'Inputs' : t === 'style' ? 'Style' : 'Visibility'}
            </button>
          ))}
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          {tab === 'inputs' && (
            <div className="flex flex-col gap-2">
              {indicatorKey === 'vwap' && !intraday && (
                <p className="text-[10px] text-amber-400">VWAP is intraday-only.</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {renderIndicatorInputsFields(indicatorKey, params, onUpdateParams, chartStyle, onChartStyleChange)}
              </div>
            </div>
          )}

          {tab === 'style' && (
            <div className="flex flex-col gap-2.5">
              {indicatorKey === 'volumeProfile' ? (
                <p className="text-[10px] text-[#707070]">Styling for Volume Profile is in chart settings.</p>
              ) : (
                renderStyleRows(indicatorKey, styles, onUpdateStyles)
              )}
            </div>
          )}

          {tab === 'visibility' && (
            <div className="flex flex-col gap-2.5">
              <p className="text-[10px] text-[#707070]">Applies to all indicators.</p>
              {VISIBILITY_BUCKET_LABELS.map(({ key, label }) => (
                <VisibilityRow
                  key={key}
                  label={label}
                  bucket={visibility[key]}
                  range={ARENA_VISIBILITY_BUCKET_RANGE[key]}
                  onChange={(patch) => onUpdateVisibility({ [key]: { ...visibility[key], ...patch } })}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t px-5 py-3 sm:justify-between" style={{ borderColor: 'rgba(201,166,70,0.12)' }}>
          <button
            type="button"
            onClick={() => onResetIndicator(indicatorKey)}
            className="flex h-7 items-center gap-1.5 rounded px-2 text-[11px] font-semibold text-[#707070] transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#C0C0C0]"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-7 rounded border border-[rgba(201,166,70,0.35)] bg-[rgba(201,166,70,0.10)] px-3 text-[11px] font-semibold text-[#C9A646] transition-colors duration-150 hover:bg-[rgba(201,166,70,0.18)]"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
