/**
 * Shared, design-system-aligned form primitives for the Auto Backtest setup
 * builder. Plain, controlled inputs styled to the FINOTAUR gold-on-black DS.
 *
 * These intentionally live next to the auto-backtest components (not in ds/)
 * because they are form-builder-specific compositions, not canonical DS atoms.
 * They reuse DS tokens (surface, border-ds, gold, ink) directly.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Field — label + optional helper text wrapper
// ---------------------------------------------------------------------------

interface FieldProps {
  label: string;
  /** Short English helper sentence shown under the control. */
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-medium uppercase tracking-[1px] text-ink-tertiary"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-ink-muted">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared input class
// ---------------------------------------------------------------------------

const inputBase =
  'w-full rounded-lg border-[0.5px] border-border-ds-default bg-surface-1 px-3 py-2 ' +
  'text-sm text-ink-primary placeholder:text-ink-muted ' +
  'transition-colors focus:border-gold-primary focus:outline-none';

// ---------------------------------------------------------------------------
// NumberField
// ---------------------------------------------------------------------------

interface NumberFieldProps {
  label: string;
  hint?: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
}: NumberFieldProps) {
  return (
    <Field label={label} hint={hint} className={className}>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isNaN(n)) return;
          onChange(n);
        }}
        className={inputBase}
      />
    </Field>
  );
}

// ---------------------------------------------------------------------------
// SelectField
// ---------------------------------------------------------------------------

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  label: string;
  hint?: string;
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (next: T) => void;
  className?: string;
}

export function SelectField<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
  className,
}: SelectFieldProps<T>) {
  return (
    <Field label={label} hint={hint} className={className}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(inputBase, 'appearance-none')}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface-base text-ink-primary">
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// ToggleField — a labeled on/off switch
// ---------------------------------------------------------------------------

interface ToggleFieldProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}

export function ToggleField({ label, hint, checked, onChange, className }: ToggleFieldProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-medium uppercase tracking-[1px] text-ink-tertiary">
          {label}
        </span>
        {hint && <p className="text-[11px] leading-snug text-ink-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-gold-primary' : 'bg-surface-2 border-[0.5px] border-border-ds-default',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-ink-primary transition-transform duration-200',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SliderField — range slider with a numeric readout
// ---------------------------------------------------------------------------

interface SliderFieldProps {
  label: string;
  hint?: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Suffix shown after the readout, e.g. "%", "R", "bars". */
  suffix?: string;
  className?: string;
}

export function SliderField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  className,
}: SliderFieldProps) {
  return (
    <Field label={label} hint={hint} className={className}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-2 accent-gold-primary"
        />
        <span className="min-w-[3.5rem] text-right text-sm font-medium tabular-nums text-gold-primary">
          {value}
          {suffix ? ` ${suffix}` : ''}
        </span>
      </div>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// SectionTitle — small heading inside a builder section card
// ---------------------------------------------------------------------------

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold tracking-wide text-ink-primary">{title}</h3>
      {subtitle && <p className="mt-0.5 text-[12px] text-ink-tertiary">{subtitle}</p>}
    </div>
  );
}
