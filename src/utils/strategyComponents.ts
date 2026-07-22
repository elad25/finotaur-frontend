/**
 * strategyComponents.ts
 *
 * Pure helper library for the canonical "strategy components" model.
 * A component is a typed, trackable building block of a trading strategy
 * (entry conditions, confirmations, checklist items, risk rules).
 *
 * Persistence: stored in `strategies.components jsonb` (see migration
 * 20260617120000_strategy_components.sql). Falls back to deriving
 * components from legacy `checklist` / `confirmationSignals` fields so
 * the UI works before the DB backfill runs.
 *
 * No React imports — this file is pure TS and safe to use in any context.
 */

import { uuid } from './uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Four canonical component kinds that make up a strategy's rule set. */
export type ComponentType =
  | 'entry_condition'
  | 'confirmation'
  | 'checklist'
  | 'risk_rule';

/** UI metadata for each component type, ordered for display grouping. */
export interface ComponentTypeMeta {
  type: ComponentType;
  /** English label shown in the UI. */
  label: string;
}

/** Ordered array used to render component-type groups in the UI. */
export const COMPONENT_TYPES: ComponentTypeMeta[] = [
  { type: 'entry_condition', label: 'Entry Conditions' },
  { type: 'confirmation',    label: 'Confirmations'   },
  { type: 'checklist',       label: 'Checklist'        },
  { type: 'risk_rule',       label: 'Risk Rules'       },
];

/**
 * A single strategy component.
 * Compatible with the legacy `ChecklistItem` shape (`{ id, label }`) when
 * `type === 'checklist'` and `trackAdherence === true`.
 */
export interface StrategyComponent {
  /** Stable UUID (or deterministic `sig:<slug>` for legacy signals). */
  id: string;
  type: ComponentType;
  /** Human-readable description of the rule / condition. */
  label: string;
  /**
   * When true, per-trade adherence is recorded in
   * `trades.checklist_results[id]`.
   */
  trackAdherence: boolean;
}

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

/**
 * Returns a new random UUID.
 * Delegates to the shared `uuid()` helper (src/utils/uuid.ts), which falls
 * back to a Math.random()-based generator when `crypto.randomUUID` is
 * unavailable (old Safari, non-secure/http contexts).
 *
 * The codebase uses this wrapper in several places (ChecklistEditor,
 * idempotencyKey, etc.) to give callers a single import point that is
 * easy to stub in tests.
 */
export function newComponentId(): string {
  return uuid();
}

/**
 * Deterministic slug used for the legacy `confirmation_signals` id scheme:
 * `'sig:' + slugComponentId(signal)`.
 *
 * Rules (mirrors the SQL in the migration's backfill UPDATE):
 *   1. Lowercase the input.
 *   2. Replace every run of non-alphanumeric characters with a single `-`.
 *   3. Trim leading / trailing `-`.
 *
 * @example slugComponentId('RSI > 50')  // → 'rsi-50'
 * @example slugComponentId('  Volume ↑ above avg  ')  // → 'volume-above-avg'
 */
export function slugComponentId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

/**
 * Returns the canonical component list for a strategy.
 *
 * Priority:
 *   1. If `strategy.components` is a non-empty array, return it as-is
 *      (cast to `StrategyComponent[]` — the DB stores the correct shape).
 *   2. Otherwise, derive on the fly from the legacy fields so the UI works
 *      before the DB backfill has been applied:
 *      - `strategy.checklist` items  → `{ type: 'checklist', trackAdherence: true }`
 *      - `strategy.confirmationSignals` entries → `{ type: 'confirmation', trackAdherence: true }`
 *
 * Defensive: handles `undefined` / `null` gracefully for both fields.
 *
 * @param strategy - Any object that may have `components`, `checklist`, and
 *   `confirmationSignals` properties (matches the mapped Strategy shape from
 *   `useStrategies.ts`).
 */
export function getStrategyComponents(strategy: {
  components?: StrategyComponent[] | null;
  checklist?: Array<{ id: string; label: string }> | null;
  confirmationSignals?: string[] | null;
}): StrategyComponent[] {
  // 1. Prefer the stored components column when present and populated.
  if (Array.isArray(strategy.components) && strategy.components.length > 0) {
    return strategy.components as StrategyComponent[];
  }

  // 2. Derive from legacy fields.
  const derived: StrategyComponent[] = [];

  // Map legacy checklist items.
  if (Array.isArray(strategy.checklist)) {
    for (const item of strategy.checklist) {
      if (item && typeof item.id === 'string' && typeof item.label === 'string') {
        derived.push({
          id: item.id,
          type: 'checklist',
          label: item.label,
          trackAdherence: true,
        });
      }
    }
  }

  // Map legacy confirmation signals (string[]).
  if (Array.isArray(strategy.confirmationSignals)) {
    for (const signal of strategy.confirmationSignals) {
      if (typeof signal === 'string' && signal.trim().length > 0) {
        derived.push({
          id: `sig:${slugComponentId(signal)}`,
          type: 'confirmation',
          label: signal,
          trackAdherence: true,
        });
      }
    }
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

/**
 * Returns only the components that should have per-trade adherence recorded.
 * These are the items that appear in the `trades.checklist_results` keyed object.
 */
export function trackableComponents(
  components: StrategyComponent[],
): StrategyComponent[] {
  return components.filter((c) => c.trackAdherence === true);
}
