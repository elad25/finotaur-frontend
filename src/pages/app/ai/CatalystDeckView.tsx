// src/pages/app/ai/CatalystDeckView.tsx
// ─────────────────────────────────────────────────────────────────────────
// Catalyst Intelligence Deck — view shell rendered when the /api/top5/latest
// response carries `mode: 'catalyst_deck'` (feature-flagged on server).
//
// Layout: page header + 3 CatalystDeckCard list (or empty state) + meta
// footer with scan timestamp and source coverage.
//
// Mounted via early-return inside Top5.tsx so the existing route
// `/app/ai/top-5` serves both legacy LITE and the new Catalyst Deck
// without route changes.
// ─────────────────────────────────────────────────────────────────────────

import { Sparkles, AlertCircle, Info } from 'lucide-react';
import CatalystDeckCard, { type CatalystDeckPick } from '../../../components/catalyst/CatalystDeckCard';

const GOLD = '#C9A646';

export interface CatalystDeckResponse {
  mode: 'catalyst_deck';
  picks: CatalystDeckPick[];
  skipReason: string | null;
  meta: {
    fetchedAt: string;
    eventCount: number;
    sourceErrors?: Array<{ source: string; message: string }>;
    fewShotCount: number;
    modelDurationMs?: number;
    rawCandidateCount?: number;
  };
}

interface Props {
  data: CatalystDeckResponse;
}

const SKIP_REASON_HEBREW: Record<string, string> = {
  no_catalyst_events_in_window: 'אין catalysts ב-24 השעות האחרונות',
  no_high_conviction_picks: 'נמצאו catalysts, אבל אף אחד לא עבר את סף ה-conviction (85)',
};

export default function CatalystDeckView({ data }: Props) {
  const isEmpty = !data.picks || data.picks.length === 0;
  const skipMsg = data.skipReason
    ? SKIP_REASON_HEBREW[data.skipReason] || data.skipReason
    : null;
  const fetchedDate = new Date(data.meta.fetchedAt);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
          <h1 className="text-2xl font-bold text-white">Catalyst Intelligence Deck</h1>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          Top 3 high-conviction trades (≥85) tied to catalyst events from the
          last 24 hours. Sources: Federal Register · SAM.gov · openFDA · curated
          news (regulation, gov procurement, trade policy, subsidy,
          geopolitical, court rulings, FDA binaries, state mandates). LONG +
          SHORT symmetric.
        </p>
      </header>

      {/* Empty state */}
      {isEmpty && (
        <div
          className="rounded-xl border border-[#2a2a2a] p-8 text-center space-y-3"
          style={{ background: 'rgba(26,26,26,0.6)' }}
        >
          <AlertCircle className="w-8 h-8 mx-auto" style={{ color: GOLD }} />
          <h2 className="text-lg font-semibold text-white">
            No high-conviction picks today
          </h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            {skipMsg ||
              'Quality over coverage — the deck stays empty when no catalyst clears the conviction bar.'}
          </p>
          <p className="text-xs text-gray-500 pt-2">
            Scanned {data.meta.eventCount} catalyst events
            {data.meta.fewShotCount > 0
              ? ` against ${data.meta.fewShotCount} curated patterns`
              : ''}
            .
          </p>
        </div>
      )}

      {/* Picks */}
      {!isEmpty && (
        <div className="space-y-4">
          {data.picks.map((pick, idx) => (
            <CatalystDeckCard key={`${pick.top_ticker}-${idx}`} pick={pick} rank={idx + 1} />
          ))}
        </div>
      )}

      {/* Footer meta */}
      <footer className="pt-2 border-t border-[#2a2a2a] flex items-start gap-2 text-[11px] text-gray-500">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <div className="space-y-0.5">
          <div>
            Scan: {fetchedDate.toLocaleString()} · {data.meta.eventCount} events ·
            {data.meta.fewShotCount > 0
              ? ` ${data.meta.fewShotCount} few-shot patterns`
              : ' no calibration patterns yet'}
            {typeof data.meta.modelDurationMs === 'number' &&
              ` · ${(data.meta.modelDurationMs / 1000).toFixed(1)}s model time`}
          </div>
          {data.meta.sourceErrors && data.meta.sourceErrors.length > 0 && (
            <div className="text-yellow-500/80">
              {data.meta.sourceErrors.length} source(s) failed:{' '}
              {data.meta.sourceErrors.map((e) => e.source).join(', ')}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
