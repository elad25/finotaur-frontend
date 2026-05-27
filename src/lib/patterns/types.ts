// src/lib/patterns/types.ts
// TypeScript mirror of finotaur-server/src/ai/lib/pattern-types.js
// SSoT lives on the server; this file MUST stay in sync.
// Phase 0 — Foundation (ADL-039). 9 patterns + 'other' fallback.

export const PATTERN_TYPES = {
  BEAT_RAISE_AI: 'beat_raise_ai',
  MEGA_CONTRACT: 'mega_contract',
  TRIPLE_PT: 'triple_pt',
  FUNDING_SHORT_SQUEEZE: 'funding_short_squeeze',
  CAPEX_DOWNSTREAM: 'capex_downstream',
  ENERGY_HEDGE: 'energy_hedge',
  CROWDED_LONG_HEDGE: 'crowded_long_hedge',
  CONSUMER_WARNING: 'consumer_warning',
  SOFTWARE_WEAKNESS: 'software_weakness',
  OTHER: 'other',
} as const;

export type PatternType = typeof PATTERN_TYPES[keyof typeof PATTERN_TYPES];

export const PATTERN_TYPE_VALUES: readonly PatternType[] = Object.values(PATTERN_TYPES);

export const PATTERN_LABELS: { he: Record<PatternType, string>; en: Record<PatternType, string> } = {
  he: {
    beat_raise_ai: 'Beat + Raise + AI',
    mega_contract: 'חוזה ענק $1B+',
    triple_pt: 'PT משולש',
    funding_short_squeeze: 'Funding Squeeze',
    capex_downstream: 'Capex Downstream',
    energy_hedge: 'גידור אנרגיה',
    crowded_long_hedge: 'גידור Long צפוף',
    consumer_warning: 'אזהרת צרכן',
    software_weakness: 'חולשת SaaS',
    other: 'אחר',
  },
  en: {
    beat_raise_ai: 'Beat + Raise + AI',
    mega_contract: 'Mega Contract',
    triple_pt: 'Triple PT',
    funding_short_squeeze: 'Funding Squeeze',
    capex_downstream: 'Capex Downstream',
    energy_hedge: 'Energy Hedge',
    crowded_long_hedge: 'Crowded Long Hedge',
    consumer_warning: 'Consumer Warning',
    software_weakness: 'Software Weakness',
    other: 'Other',
  },
};

export function isPatternType(value: unknown): value is PatternType {
  return typeof value === 'string' && (PATTERN_TYPE_VALUES as readonly string[]).includes(value);
}

export function toPatternType(value: unknown): PatternType {
  return isPatternType(value) ? value : PATTERN_TYPES.OTHER;
}
