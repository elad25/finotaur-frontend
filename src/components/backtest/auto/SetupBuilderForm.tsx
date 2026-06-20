/**
 * SetupBuilderForm — the heart of the Automated Backtest tab.
 *
 * A form-driven, non-coder-friendly composer for an ICT `SetupDefinition`,
 * bound to the auto-backtest store's `currentSetup`. It exposes:
 *   - Pattern selection (FVG / IFVG / Breaker / OB / Liquidity) with the
 *     selected pattern's params surfaced as plain-English controls.
 *   - Entry, Stop loss, Take profit rules.
 *   - Filters & risk (session windows, HTF bias, direction, risk %, balance).
 *
 * Every control writes back through the store (setPattern / updateSetup), so
 * the form stays fully controlled and reactive.
 *
 * MVP UX: single-pattern is the obvious default (selecting a pattern replaces
 * the active one). The store's `patterns` is an array, so this is future-proof.
 */

import { useCallback } from 'react';
import { Card } from '@/components/ds/Card';
import { cn } from '@/lib/utils';
import {
  useAutoBacktestStore,
  selectAutoSetup,
} from '@/store/useAutoBacktestStore';
import {
  DEFAULT_PATTERN_PARAMS,
  type Direction,
  type EntryRule,
  type FVGParams,
  type IFVGParams,
  type BreakerParams,
  type LiquidityParams,
  type Mitigation,
  type OBParams,
  type PatternParams,
  type PatternType,
  type SetupDefinition,
  type StopRule,
  type TargetRule,
} from '@/core/auto/types';
import {
  Field,
  NumberField,
  SelectField,
  SliderField,
  ToggleField,
  SectionTitle,
} from './formControls';

// ---------------------------------------------------------------------------
// Static option lists & copy
// ---------------------------------------------------------------------------

const PATTERN_CARDS: ReadonlyArray<{
  type: PatternType;
  name: string;
  blurb: string;
}> = [
  { type: 'FVG', name: 'Fair Value Gap', blurb: 'Imbalance gap between candles.' },
  { type: 'IFVG', name: 'Inversion FVG', blurb: 'A flipped, mitigated fair value gap.' },
  { type: 'BREAKER', name: 'Breaker Block', blurb: 'Failed order block after a sweep.' },
  { type: 'OB', name: 'Order Block', blurb: 'Last opposing candle before a move.' },
  { type: 'LIQUIDITY', name: 'Liquidity', blurb: 'Stop-runs and equal-high/low pools.' },
];

const MITIGATION_OPTIONS: ReadonlyArray<{ value: Mitigation; label: string }> = [
  { value: 'none', label: 'No mitigation allowed' },
  { value: 'partial', label: 'Partial mitigation allowed' },
  { value: 'full', label: 'Full mitigation allowed' },
];

const DIRECTION_OPTIONS: ReadonlyArray<{ value: Direction; label: string }> = [
  { value: 'both', label: 'Long & Short' },
  { value: 'long', label: 'Long only' },
  { value: 'short', label: 'Short only' },
];

const ENTRY_TRIGGER_OPTIONS: ReadonlyArray<{ value: EntryRule['trigger']; label: string }> = [
  { value: 'zone-tap', label: 'Tap the zone edge' },
  { value: 'zone-50', label: 'Tap the zone midpoint (50%)' },
  { value: 'close-confirm', label: 'Confirming close' },
  { value: 'sweep-then-mss', label: 'Sweep, then market-structure shift' },
];

const ORDER_TYPE_OPTIONS: ReadonlyArray<{ value: EntryRule['orderType']; label: string }> = [
  { value: 'limit', label: 'Limit order' },
  { value: 'market', label: 'Market order' },
];

const STOP_BASIS_OPTIONS: ReadonlyArray<{ value: StopRule['basis']; label: string }> = [
  { value: 'swing', label: 'Beyond the reference swing' },
  { value: 'zone-far-edge', label: 'Beyond the zone far edge' },
  { value: 'atr', label: 'ATR multiple from entry' },
  { value: 'fixed-pct', label: 'Fixed % from entry' },
];

const TARGET_BASIS_OPTIONS: ReadonlyArray<{ value: TargetRule['basis']; label: string }> = [
  { value: 'r-multiple', label: 'R-multiple of the stop' },
  { value: 'opposing-liquidity', label: 'Nearest opposing liquidity' },
  { value: 'fixed-pct', label: 'Fixed % from entry' },
];

const BIAS_METHOD_OPTIONS: ReadonlyArray<{ value: 'ema' | 'structure'; label: string }> = [
  { value: 'ema', label: 'EMA slope' },
  { value: 'structure', label: 'Market structure' },
];

const HTF_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '1h', label: '1 hour' },
  { value: '4h', label: '4 hours' },
  { value: '1d', label: '1 day' },
];

/** Session presets (timezone + windows). "custom" keeps current windows. */
const SESSION_PRESETS: ReadonlyArray<{
  value: string;
  label: string;
  timezone: string;
  windows: Array<{ start: string; end: string }>;
}> = [
  {
    value: 'ny-open',
    label: 'New York 09:30–11:00',
    timezone: 'America/New_York',
    windows: [{ start: '09:30', end: '11:00' }],
  },
  {
    value: 'london',
    label: 'London 03:00–06:00',
    timezone: 'Europe/London',
    windows: [{ start: '03:00', end: '06:00' }],
  },
  {
    value: 'asia',
    label: 'Asia 19:00–22:00',
    timezone: 'Asia/Tokyo',
    windows: [{ start: '19:00', end: '22:00' }],
  },
  { value: 'custom', label: 'Custom window', timezone: 'America/New_York', windows: [] },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SetupBuilderForm() {
  const setup = useAutoBacktestStore(selectAutoSetup);
  const setPattern = useAutoBacktestStore((s) => s.setPattern);
  const togglePattern = useAutoBacktestStore((s) => s.togglePattern);
  const updateSetup = useAutoBacktestStore((s) => s.updateSetup);

  const activePattern: PatternParams | undefined = setup.patterns[0];

  // -------------------------------------------------------------------------
  // Pattern selection helpers
  // -------------------------------------------------------------------------

  const handleTogglePattern = useCallback(
    (type: PatternType) => {
      // Fresh deep copy of the defaults so toggling on always restores a valid
      // params object for that family.
      const next = JSON.parse(JSON.stringify(DEFAULT_PATTERN_PARAMS[type])) as PatternParams;
      togglePattern(next);
    },
    [togglePattern],
  );

  /** Patch the active pattern's params (preserving its discriminant). */
  const patchPattern = useCallback(
    <P extends PatternParams>(patch: Partial<P>) => {
      if (!activePattern) return;
      setPattern({ ...activePattern, ...patch } as PatternParams);
    },
    [activePattern, setPattern],
  );

  // -------------------------------------------------------------------------
  // Sub-object update helpers (keep updateSetup calls terse & typed)
  // -------------------------------------------------------------------------

  const patchEntry = (patch: Partial<EntryRule>) =>
    updateSetup({ entry: { ...setup.entry, ...patch } });
  const patchStop = (patch: Partial<StopRule>) =>
    updateSetup({ stop: { ...setup.stop, ...patch } });
  const patchTarget = (patch: Partial<TargetRule>) =>
    updateSetup({ target: { ...setup.target, ...patch } });
  const patchRisk = (patch: Partial<SetupDefinition['risk']>) =>
    updateSetup({ risk: { ...setup.risk, ...patch } });
  const patchSession = (patch: Partial<SetupDefinition['session']>) =>
    updateSetup({ session: { ...setup.session, ...patch } });
  const patchBias = (patch: Partial<SetupDefinition['bias']>) =>
    updateSetup({ bias: { ...setup.bias, ...patch } });

  // Which session preset best matches the current windows (for the select).
  const currentPreset =
    SESSION_PRESETS.find(
      (p) =>
        p.value !== 'custom' &&
        p.timezone === setup.session.timezone &&
        p.windows.length === setup.session.windows.length &&
        p.windows.every(
          (w, i) =>
            w.start === setup.session.windows[i]?.start &&
            w.end === setup.session.windows[i]?.end,
        ),
    )?.value ?? 'custom';

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Identity ──────────────────────────────────────────────── */}
      <Card padding="default">
        <SectionTitle title="Setup" subtitle="Name this setup so you can save and reuse it." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Setup name">
            <input
              type="text"
              value={setup.name}
              onChange={(e) => updateSetup({ name: e.target.value })}
              className="w-full rounded-lg border-[0.5px] border-border-ds-default bg-surface-1 px-3 py-2 text-sm text-ink-primary transition-colors focus:border-gold-primary focus:outline-none"
            />
          </Field>
          <SelectField<Direction>
            label="Direction"
            hint="Which side(s) the setup is allowed to trade."
            value={setup.direction}
            options={DIRECTION_OPTIONS}
            onChange={(direction) => updateSetup({ direction })}
          />
        </div>
      </Card>

      {/* ─── Pattern ───────────────────────────────────────────────── */}
      <Card padding="default">
        <SectionTitle
          title="Pattern"
          subtitle="Pick the ICT pattern to scan for. Selecting one reveals its settings."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PATTERN_CARDS.map((p) => {
            const selected = activePattern?.type === p.type;
            return (
              <button
                key={p.type}
                type="button"
                aria-pressed={selected}
                onClick={() => handleTogglePattern(p.type)}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-xl border-[0.5px] p-3 text-left transition-all',
                  selected
                    ? 'border-gold-border bg-gold-primary/10 shadow-glow-gold-resting'
                    : 'border-border-ds-subtle bg-surface-1 hover:border-border-ds-default',
                )}
              >
                <span
                  className={cn(
                    'text-sm font-semibold',
                    selected ? 'text-gold-primary' : 'text-ink-primary',
                  )}
                >
                  {p.name}
                </span>
                <span className="text-[11px] leading-snug text-ink-tertiary">{p.blurb}</span>
              </button>
            );
          })}
        </div>

        {activePattern ? (
          <div className="mt-5 border-t border-border-ds-subtle pt-5">
            <PatternParamsEditor pattern={activePattern} patch={patchPattern} />
          </div>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed border-border-ds-subtle bg-surface-1 p-4 text-center text-sm text-ink-tertiary">
            Select a pattern above to configure how it is detected.
          </p>
        )}
      </Card>

      {/* ─── Entry ─────────────────────────────────────────────────── */}
      <Card padding="default">
        <SectionTitle title="Entry" subtitle="How a detected zone turns into an order." />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField<EntryRule['trigger']>
            label="Entry trigger"
            hint="What price action arms the entry."
            value={setup.entry.trigger}
            options={ENTRY_TRIGGER_OPTIONS}
            onChange={(trigger) => patchEntry({ trigger })}
          />
          <SelectField<EntryRule['orderType']>
            label="Order type"
            hint="Limit waits at a price; market fills on the next bar."
            value={setup.entry.orderType}
            options={ORDER_TYPE_OPTIONS}
            onChange={(orderType) => patchEntry({ orderType })}
          />
          <NumberField
            label="Cancel pending after (bars)"
            hint="Drop the armed signal if it has not filled within this many bars."
            value={setup.entry.validForBars}
            min={1}
            max={500}
            onChange={(validForBars) => patchEntry({ validForBars })}
          />
        </div>
      </Card>

      {/* ─── Stop loss ─────────────────────────────────────────────── */}
      <Card padding="default">
        <SectionTitle title="Stop loss" subtitle="Where the protective stop is placed." />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField<StopRule['basis']>
            label="Stop basis"
            value={setup.stop.basis}
            options={STOP_BASIS_OPTIONS}
            onChange={(basis) => patchStop({ basis })}
          />
          {setup.stop.basis === 'atr' && (
            <NumberField
              label="ATR multiple"
              hint="Stop = entry ∓ this many ATRs."
              value={setup.stop.atrMult ?? 1.5}
              min={0.1}
              step={0.1}
              onChange={(atrMult) => patchStop({ atrMult })}
            />
          )}
          {setup.stop.basis === 'fixed-pct' && (
            <NumberField
              label="Fixed stop (%)"
              hint="Stop distance as a percent of entry price."
              value={setup.stop.fixedPct ?? 1}
              min={0.01}
              step={0.01}
              onChange={(fixedPct) => patchStop({ fixedPct })}
            />
          )}
          <NumberField
            label="Buffer (%)"
            hint="Extra padding added beyond the computed stop."
            value={setup.stop.bufferPct ?? 0}
            min={0}
            step={0.01}
            onChange={(bufferPct) => patchStop({ bufferPct })}
          />
        </div>
      </Card>

      {/* ─── Take profit ───────────────────────────────────────────── */}
      <Card padding="default">
        <SectionTitle title="Take profit" subtitle="Where the trade is closed in profit." />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField<TargetRule['basis']>
            label="Target basis"
            value={setup.target.basis}
            options={TARGET_BASIS_OPTIONS}
            onChange={(basis) => patchTarget({ basis })}
          />
          {setup.target.basis === 'r-multiple' && (
            <SliderField
              label="R-multiple"
              hint="Reward as a multiple of the risked distance."
              value={setup.target.rMultiple ?? 2}
              min={0.5}
              max={10}
              step={0.5}
              suffix="R"
              onChange={(rMultiple) => patchTarget({ rMultiple })}
            />
          )}
          {setup.target.basis === 'fixed-pct' && (
            <NumberField
              label="Fixed target (%)"
              hint="Target distance as a percent of entry price."
              value={setup.target.fixedPct ?? 2}
              min={0.01}
              step={0.01}
              onChange={(fixedPct) => patchTarget({ fixedPct })}
            />
          )}
        </div>
      </Card>

      {/* ─── Filters & risk ────────────────────────────────────────── */}
      <Card padding="default">
        <SectionTitle
          title="Filters & risk"
          subtitle="Session windows, higher-timeframe bias, and money management."
        />

        {/* Session */}
        <div className="mb-5 rounded-lg border border-border-ds-subtle bg-surface-1 p-4">
          <ToggleField
            label="Session filter"
            hint="Only take trades inside the chosen intraday window."
            checked={setup.session.enabled}
            onChange={(enabled) => patchSession({ enabled })}
          />
          {setup.session.enabled && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Session window"
                value={currentPreset}
                options={SESSION_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
                onChange={(value) => {
                  const preset = SESSION_PRESETS.find((p) => p.value === value);
                  if (!preset) return;
                  if (value === 'custom') {
                    // Keep timezone; ensure at least one editable window exists.
                    patchSession({
                      windows:
                        setup.session.windows.length > 0
                          ? setup.session.windows
                          : [{ start: '09:30', end: '11:00' }],
                    });
                  } else {
                    patchSession({ timezone: preset.timezone, windows: preset.windows });
                  }
                }}
              />
              <Field label="Timezone" hint="IANA timezone for the window times.">
                <input
                  type="text"
                  value={setup.session.timezone}
                  onChange={(e) => patchSession({ timezone: e.target.value })}
                  className="w-full rounded-lg border-[0.5px] border-border-ds-default bg-surface-1 px-3 py-2 text-sm text-ink-primary transition-colors focus:border-gold-primary focus:outline-none"
                />
              </Field>
              {currentPreset === 'custom' && setup.session.windows[0] && (
                <>
                  <Field label="Window start (HH:MM)">
                    <input
                      type="time"
                      value={setup.session.windows[0].start}
                      onChange={(e) =>
                        patchSession({
                          windows: [
                            { start: e.target.value, end: setup.session.windows[0]?.end ?? '11:00' },
                          ],
                        })
                      }
                      className="w-full rounded-lg border-[0.5px] border-border-ds-default bg-surface-1 px-3 py-2 text-sm text-ink-primary transition-colors focus:border-gold-primary focus:outline-none"
                    />
                  </Field>
                  <Field label="Window end (HH:MM)">
                    <input
                      type="time"
                      value={setup.session.windows[0].end}
                      onChange={(e) =>
                        patchSession({
                          windows: [
                            { start: setup.session.windows[0]?.start ?? '09:30', end: e.target.value },
                          ],
                        })
                      }
                      className="w-full rounded-lg border-[0.5px] border-border-ds-default bg-surface-1 px-3 py-2 text-sm text-ink-primary transition-colors focus:border-gold-primary focus:outline-none"
                    />
                  </Field>
                </>
              )}
            </div>
          )}
        </div>

        {/* HTF bias */}
        <div className="mb-5 rounded-lg border border-border-ds-subtle bg-surface-1 p-4">
          <ToggleField
            label="Higher-timeframe bias"
            hint="Only take trades aligned with the higher-timeframe trend."
            checked={setup.bias.enabled}
            onChange={(enabled) => patchBias({ enabled })}
          />
          {setup.bias.enabled && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Bias timeframe"
                value={setup.bias.htfTimeframe}
                options={HTF_OPTIONS}
                onChange={(htfTimeframe) => patchBias({ htfTimeframe })}
              />
              <SelectField<'ema' | 'structure'>
                label="Bias method"
                value={setup.bias.method}
                options={BIAS_METHOD_OPTIONS}
                onChange={(method) => patchBias({ method })}
              />
              {setup.bias.method === 'ema' && (
                <NumberField
                  label="EMA length"
                  value={setup.bias.emaLength ?? 50}
                  min={2}
                  max={400}
                  onChange={(emaLength) => patchBias({ emaLength })}
                />
              )}
            </div>
          )}
        </div>

        {/* Risk */}
        <div className="grid gap-4 sm:grid-cols-2">
          <SliderField
            label="Risk per trade (%)"
            hint="Account percent risked on each trade."
            value={setup.risk.riskPerTradePct}
            min={0.1}
            max={5}
            step={0.1}
            suffix="%"
            onChange={(riskPerTradePct) => patchRisk({ riskPerTradePct })}
          />
          <NumberField
            label="Initial balance ($)"
            hint="Starting account size for the simulation."
            value={setup.risk.initialBalance}
            min={100}
            step={100}
            onChange={(initialBalance) => patchRisk({ initialBalance })}
          />
        </div>
      </Card>
    </div>
  );
}

// ===========================================================================
// Per-pattern params editor (discriminated union → labeled controls)
// ===========================================================================

interface PatternParamsEditorProps {
  pattern: PatternParams;
  patch: <P extends PatternParams>(patch: Partial<P>) => void;
}

function PatternParamsEditor({ pattern, patch }: PatternParamsEditorProps) {
  switch (pattern.type) {
    case 'FVG':
      return <FVGEditor params={pattern} patch={patch} />;
    case 'IFVG':
      return <IFVGEditor params={pattern} patch={patch} />;
    case 'BREAKER':
      return <BreakerEditor params={pattern} patch={patch} />;
    case 'OB':
      return <OBEditor params={pattern} patch={patch} />;
    case 'LIQUIDITY':
      return <LiquidityEditor params={pattern} patch={patch} />;
    default: {
      // Exhaustiveness check.
      const _never: never = pattern;
      return _never;
    }
  }
}

// --- FVG ---

function FVGEditor({
  params,
  patch,
}: {
  params: FVGParams;
  patch: PatternParamsEditorProps['patch'];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SliderField
        label="Minimum gap size (%)"
        hint="Ignore gaps smaller than this fraction of price."
        value={params.minGapPct}
        min={0.01}
        max={1}
        step={0.01}
        suffix="%"
        onChange={(minGapPct) => patch<FVGParams>({ minGapPct })}
      />
      <SelectField<Mitigation>
        label="Mitigation"
        hint="How much of the gap price may consume before it is dead."
        value={params.mitigation}
        options={MITIGATION_OPTIONS}
        onChange={(mitigation) => patch<FVGParams>({ mitigation })}
      />
      <NumberField
        label="Invalidate after (bars)"
        hint="Drop the zone this many bars after it forms."
        value={params.maxAgeBars}
        min={1}
        max={500}
        onChange={(maxAgeBars) => patch<FVGParams>({ maxAgeBars })}
      />
      <ToggleField
        label="Require displacement candle"
        hint="Only count gaps left by a strong impulse candle."
        checked={params.requireDisplacement}
        onChange={(requireDisplacement) => patch<FVGParams>({ requireDisplacement })}
      />
      {params.requireDisplacement && (
        <SliderField
          label="Displacement strength (× ATR)"
          hint="Impulse candle body must be at least this many ATRs."
          value={params.displacementBodyMult}
          min={0.5}
          max={5}
          step={0.1}
          suffix="× ATR"
          onChange={(displacementBodyMult) => patch<FVGParams>({ displacementBodyMult })}
        />
      )}
    </div>
  );
}

// --- IFVG ---

function IFVGEditor({
  params,
  patch,
}: {
  params: IFVGParams;
  patch: PatternParamsEditorProps['patch'];
}) {
  const base = params.baseFvg;
  const patchBase = (p: Partial<IFVGParams['baseFvg']>) =>
    patch<IFVGParams>({ baseFvg: { ...base, ...p } });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SliderField
        label="Minimum gap size (%)"
        hint="Ignore base gaps smaller than this fraction of price."
        value={base.minGapPct}
        min={0.01}
        max={1}
        step={0.01}
        suffix="%"
        onChange={(minGapPct) => patchBase({ minGapPct })}
      />
      <SelectField<Mitigation>
        label="Base mitigation"
        value={base.mitigation}
        options={MITIGATION_OPTIONS}
        onChange={(mitigation) => patchBase({ mitigation })}
      />
      <ToggleField
        label="Confirm close through"
        hint="Require a candle close through the far side to confirm inversion."
        checked={params.confirmCloseThrough}
        onChange={(confirmCloseThrough) => patch<IFVGParams>({ confirmCloseThrough })}
      />
      <NumberField
        label="Invalidate after (bars)"
        hint="Drop the inverted zone this many bars after it forms."
        value={params.maxAgeBars}
        min={1}
        max={500}
        onChange={(maxAgeBars) => patch<IFVGParams>({ maxAgeBars })}
      />
    </div>
  );
}

// --- Breaker ---

function BreakerEditor({
  params,
  patch,
}: {
  params: BreakerParams;
  patch: PatternParamsEditorProps['patch'];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NumberField
        label="Swing lookback (bars)"
        hint="Bars on each side used to mark a swing high/low."
        value={params.swing.lookback}
        min={1}
        max={20}
        onChange={(lookback) => patch<BreakerParams>({ swing: { lookback } })}
      />
      <NumberField
        label="Invalidate after (bars)"
        value={params.maxAgeBars}
        min={1}
        max={500}
        onChange={(maxAgeBars) => patch<BreakerParams>({ maxAgeBars })}
      />
      <ToggleField
        label="Require liquidity sweep"
        hint="Only count breakers that swept liquidity first."
        checked={params.requireLiquiditySweep}
        onChange={(requireLiquiditySweep) => patch<BreakerParams>({ requireLiquiditySweep })}
      />
      <ToggleField
        label="Require market-structure shift"
        hint="Only count breakers followed by a structure shift."
        checked={params.requireMSS}
        onChange={(requireMSS) => patch<BreakerParams>({ requireMSS })}
      />
    </div>
  );
}

// --- OB ---

function OBEditor({
  params,
  patch,
}: {
  params: OBParams;
  patch: PatternParamsEditorProps['patch'];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NumberField
        label="Swing lookback (bars)"
        hint="Bars on each side used to mark a swing high/low."
        value={params.swing.lookback}
        min={1}
        max={20}
        onChange={(lookback) => patch<OBParams>({ swing: { lookback } })}
      />
      <SelectField<OBParams['obKind']>
        label="Order block kind"
        value={params.obKind}
        options={[
          { value: 'last-opposite-candle', label: 'Last opposing candle' },
          { value: 'last-down-before-up', label: 'Last down candle before up move' },
        ]}
        onChange={(obKind) => patch<OBParams>({ obKind })}
      />
      <SelectField<Mitigation>
        label="Mitigation"
        value={params.mitigation}
        options={MITIGATION_OPTIONS}
        onChange={(mitigation) => patch<OBParams>({ mitigation })}
      />
      <NumberField
        label="Invalidate after (bars)"
        value={params.maxAgeBars}
        min={1}
        max={500}
        onChange={(maxAgeBars) => patch<OBParams>({ maxAgeBars })}
      />
      <ToggleField
        label="Require displacement out"
        hint="Only count blocks left by a strong impulse candle."
        checked={params.requireDisplacementOut}
        onChange={(requireDisplacementOut) => patch<OBParams>({ requireDisplacementOut })}
      />
      {params.requireDisplacementOut && (
        <SliderField
          label="Displacement strength (× ATR)"
          value={params.displacementBodyMult}
          min={0.5}
          max={5}
          step={0.1}
          suffix="× ATR"
          onChange={(displacementBodyMult) => patch<OBParams>({ displacementBodyMult })}
        />
      )}
    </div>
  );
}

// --- Liquidity ---

function LiquidityEditor({
  params,
  patch,
}: {
  params: LiquidityParams;
  patch: PatternParamsEditorProps['patch'];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField<LiquidityParams['mode']>
        label="Liquidity mode"
        hint="Sweep = stop-run beyond a swing; pool = equal highs/lows."
        value={params.mode}
        options={[
          { value: 'sweep', label: 'Stop-run sweep' },
          { value: 'equal-levels', label: 'Equal-levels pool' },
        ]}
        onChange={(mode) => patch<LiquidityParams>({ mode })}
      />
      <NumberField
        label="Swing lookback (bars)"
        value={params.swing.lookback}
        min={1}
        max={20}
        onChange={(lookback) => patch<LiquidityParams>({ swing: { lookback } })}
      />
      {params.mode === 'equal-levels' && (
        <>
          <SliderField
            label="Equal-level tolerance (%)"
            hint="How close levels must be to count as a pool."
            value={params.equalTolerancePct}
            min={0.01}
            max={1}
            step={0.01}
            suffix="%"
            onChange={(equalTolerancePct) => patch<LiquidityParams>({ equalTolerancePct })}
          />
          <NumberField
            label="Minimum touches"
            hint="Touches needed to qualify as a liquidity pool."
            value={params.minTouches}
            min={2}
            max={10}
            onChange={(minTouches) => patch<LiquidityParams>({ minTouches })}
          />
        </>
      )}
      <ToggleField
        label="Require reclaim"
        hint="Require price to close back inside the swept level."
        checked={params.requireReclaim}
        onChange={(requireReclaim) => patch<LiquidityParams>({ requireReclaim })}
      />
      <ToggleField
        label="Require market-structure shift"
        hint="Only count sweeps followed by a structure shift."
        checked={params.requireMSS}
        onChange={(requireMSS) => patch<LiquidityParams>({ requireMSS })}
      />
    </div>
  );
}

export default SetupBuilderForm;
