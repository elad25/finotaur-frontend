// SectorCallsPanel — renders sector-level positioning calls from the synthesis brief
// as compact pill chips below the Top Opportunities table.
// Stance values from the backend may be either long-form ('overweight', 'underweight',
// 'neutral') or short-form ('OW', 'UW', 'MW') — both are handled below.

import type { SynthesisBrief } from '@/services/copilotSynthesisBriefApi';

const SECTOR_TO_ETF: Record<string, string> = {
  'Energy': 'XLE',
  'Financials': 'XLF',
  'Financial Services': 'XLF',
  'Industrials': 'XLI',
  'Technology': 'XLK',
  'Information Technology': 'XLK',
  'Health Care': 'XLV',
  'Healthcare': 'XLV',
  'Consumer Discretionary': 'XLY',
  'Consumer Cyclical': 'XLY',
  'Consumer Staples': 'XLP',
  'Consumer Defensive': 'XLP',
  'Utilities': 'XLU',
  'Materials': 'XLB',
  'Basic Materials': 'XLB',
  'Real Estate': 'XLRE',
  'Communication Services': 'XLC',
};

// Stance tint classes — supports both full-word and short-code stance values
const STANCE_TINT: Record<string, string> = {
  overweight: 'bg-emerald-500/12 border-emerald-500/40 text-emerald-300',
  ow:         'bg-emerald-500/12 border-emerald-500/40 text-emerald-300',
  neutral:    'bg-slate-500/12 border-slate-500/40 text-slate-300',
  mw:         'bg-slate-500/12 border-slate-500/40 text-slate-300',
  underweight:'bg-rose-500/12 border-rose-500/40 text-rose-300',
  uw:         'bg-rose-500/12 border-rose-500/40 text-rose-300',
};

/** Normalize stance to a 2-char display label */
function stanceShort(stance: string): string {
  const s = stance.toLowerCase();
  if (s === 'overweight' || s === 'ow') return 'OW';
  if (s === 'underweight' || s === 'uw') return 'UW';
  return 'MW';
}

interface Props {
  brief: SynthesisBrief | null;
  loading?: boolean;
}

export function SectorCallsPanel({ brief, loading }: Props) {
  if (loading) {
    return (
      <div className="mt-6 rounded-lg border border-white/8 bg-black/30 p-5">
        <div className="mb-3 text-xs uppercase tracking-[0.2em] text-gold-primary/75">Sector Calls This Week</div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-md bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const calls = brief?.sector_calls ?? [];
  if (!calls.length) return null;

  return (
    <div className="mt-6 rounded-lg border border-white/8 bg-black/30 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-gold-primary/75">Sector Calls This Week</span>
        <span className="text-[10px] uppercase tracking-wider text-ink-secondary">{calls.length} sectors</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {calls.map((c, i) => {
          const etf = SECTOR_TO_ETF[c.sector] ?? null;
          const stanceKey = (c.stance ?? '').toLowerCase();
          const tint = STANCE_TINT[stanceKey] ?? STANCE_TINT.neutral;
          const label = stanceShort(c.stance ?? '');
          return (
            <div
              key={i}
              title={c.rationale}
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${tint}`}
            >
              {etf && <span className="font-mono font-semibold">{etf}</span>}
              <span className="text-xs opacity-80">{c.sector}</span>
              <span className="font-mono text-xs font-bold tracking-wide">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
