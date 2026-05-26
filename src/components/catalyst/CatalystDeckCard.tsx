// src/components/catalyst/CatalystDeckCard.tsx
// ─────────────────────────────────────────────────────────────────────────
// Catalyst Intelligence Deck card — the new (2026-05-26) UI surface.
//
// Hybrid layout: sector header + top ticker + 2 expandable additional
// tickers + mechanism + conviction badge + LONG/SHORT indicator.
// Consumed by `<CatalystDeckView>` (see /app/ai/top-5 page when the
// scanner returns `mode: 'catalyst_deck'`).
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from 'lucide-react';

const GOLD = '#C9A646';
const GOLD_LIGHT = '#F4D97B';
const GREEN = '#22C55E';
const RED = '#EF4444';

export interface CatalystDeckPick {
  sector: string | null;
  direction: 'LONG' | 'SHORT';
  top_ticker: string;
  additional_tickers: string[];
  catalyst_category: string | null;
  catalyst_summary: string;
  catalyst_date: string | null;
  catalyst_source_url: string | null;
  mechanism: string;
  conviction: number;
  rationale: string;
  risks: string | null;
}

interface Props {
  pick: CatalystDeckPick;
  rank: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  regulation: 'Regulation',
  gov_procurement: 'Gov Procurement',
  trade_policy: 'Trade Policy',
  subsidy: 'Subsidy',
  geopolitical: 'Geopolitical',
  court_ruling: 'Court Ruling',
  fda_binary: 'FDA Binary',
  state_mandate: 'State Mandate',
};

export default function CatalystDeckCard({ pick, rank }: Props) {
  const [expanded, setExpanded] = useState(false);
  const dirColor = pick.direction === 'LONG' ? GREEN : RED;
  const catLabel = pick.catalyst_category
    ? CATEGORY_LABEL[pick.catalyst_category] || pick.catalyst_category
    : 'Catalyst';

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all"
      style={{
        background: 'linear-gradient(180deg, rgba(26,26,26,0.95) 0%, rgba(15,15,15,0.95) 100%)',
        borderColor: expanded ? `${GOLD}66` : '#2a2a2a',
        boxShadow: expanded
          ? `0 0 30px ${GOLD}22, inset 0 1px 0 ${GOLD}11`
          : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-[#2a2a2a]">
        <div className="flex items-start gap-3 min-w-0">
          {/* Rank badge */}
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: `${GOLD}22`, color: GOLD }}
          >
            #{rank}
          </div>

          <div className="min-w-0">
            {/* Sector + category */}
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: GOLD_LIGHT }} className="uppercase tracking-wider font-medium">
                {pick.sector || 'Sector'}
              </span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-400">{catLabel}</span>
              {pick.catalyst_date && (
                <>
                  <span className="text-gray-600">·</span>
                  <span className="text-gray-500">{pick.catalyst_date}</span>
                </>
              )}
            </div>

            {/* Top ticker + additional */}
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-bold text-white">{pick.top_ticker}</span>
              {pick.additional_tickers.length > 0 && (
                <span className="text-sm text-gray-500">
                  + {pick.additional_tickers.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side: direction + conviction */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className="px-2 py-0.5 rounded text-xs font-bold tracking-wide"
            style={{ background: `${dirColor}22`, color: dirColor }}
          >
            {pick.direction}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold" style={{ color: GOLD }}>
              {pick.conviction}
            </span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
        </div>
      </div>

      {/* Catalyst summary (always visible) */}
      <div className="px-5 py-4">
        <p className="text-sm text-gray-200 leading-relaxed">{pick.catalyst_summary}</p>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-2.5 border-t border-[#2a2a2a] flex items-center justify-between text-xs text-gray-400 hover:text-white hover:bg-[#0a0a0a] transition-colors"
      >
        <span>{expanded ? 'Hide details' : 'Show mechanism + rationale + risks'}</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 py-4 border-t border-[#2a2a2a] space-y-4 bg-[#0a0a0a]">
          {/* Mechanism */}
          <section>
            <h4 className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
              Mechanism
            </h4>
            <p className="text-sm text-gray-200">{pick.mechanism}</p>
          </section>

          {/* Rationale */}
          {pick.rationale && (
            <section>
              <h4 className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
                Why ≥85 conviction
              </h4>
              <p className="text-sm text-gray-200">{pick.rationale}</p>
            </section>
          )}

          {/* Risks */}
          {pick.risks && (
            <section className="flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
              <div className="flex-1">
                <h4 className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
                  Primary risk
                </h4>
                <p className="text-sm text-gray-300">{pick.risks}</p>
              </div>
            </section>
          )}

          {/* Source link */}
          {pick.catalyst_source_url && (
            <a
              href={pick.catalyst_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs hover:underline pt-1"
              style={{ color: GOLD }}
            >
              View source <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
