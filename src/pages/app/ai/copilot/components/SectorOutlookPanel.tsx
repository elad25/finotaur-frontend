// src/pages/app/ai/copilot/components/SectorOutlookPanel.tsx
// Sector Outlook section — replaces the flat SectorCallsPanel chips.
// Fetches /api/sectors/outlook, renders ranked sector cards with pillar bars,
// expandable drivers, and a rotation-story strip.

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

interface SectorPillars {
  momentum: number | null;
  ism: number | null;
  rates: number | null;
  news: number | null;
  labor: number | null;
}

type Verdict = 'Rising' | 'Watch' | 'Avoid';

interface SectorItem {
  sector_id: string;
  sector_name: string;
  score: number;
  rank: number;
  rank_delta_5d: number | null;
  verdict: Verdict;
  pillars: SectorPillars;
  drivers: string[];
  invalidation: string;
}

interface SectorOutlookPayload {
  generated_at: string;
  trigger: string;
  rotation_story: string;
  sectors: SectorItem[];
  missing?: string[];
}

interface SectorOutlookResponse {
  outlook: SectorOutlookPayload | null;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchSectorOutlook(): Promise<SectorOutlookResponse> {
  const r = await fetch('/api/sectors/outlook');
  if (!r.ok) throw new Error(`sectors/outlook ${r.status}`);
  return r.json() as Promise<SectorOutlookResponse>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeDate(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diff / 60_000);
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Verdict badge
// ---------------------------------------------------------------------------

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (verdict === 'Rising') {
    return (
      <span className="rounded-[4px] bg-[#16a34a]/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[#22c55e]">
        Rising
      </span>
    );
  }
  if (verdict === 'Watch') {
    return (
      <span className="rounded-[4px] bg-[#f59e0b]/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[#f59e0b]">
        Watch
      </span>
    );
  }
  return (
    <span className="rounded-[4px] bg-red-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-red-400">
      Avoid
    </span>
  );
}

// ---------------------------------------------------------------------------
// Rank delta arrow
// ---------------------------------------------------------------------------

function RankDelta({ delta }: { delta: number | null }) {
  if (delta == null || delta === 0) {
    return <span className="font-mono text-[10px] text-ink-tertiary">—</span>;
  }
  if (delta < 0) {
    // rank decreased numerically = moved up (rank 3→1 means stronger)
    return (
      <span className="font-mono text-[10px] font-semibold text-[#22c55e]">
        ▲{Math.abs(delta)}
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] font-semibold text-red-400">
      ▼{delta}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Score bar (horizontal gold bar 0-100)
// ---------------------------------------------------------------------------

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-gold-primary/70"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-[#d4d4d8]">{score}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pillar bar row
// ---------------------------------------------------------------------------

const PILLAR_LABELS: { key: keyof SectorPillars; label: string }[] = [
  { key: 'momentum', label: 'Momentum' },
  { key: 'ism', label: 'ISM' },
  { key: 'rates', label: 'Rates' },
  { key: 'news', label: 'News' },
  { key: 'labor', label: 'Jobs' },
];

function PillarBars({ pillars }: { pillars: SectorPillars }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {PILLAR_LABELS.map(({ key, label }) => {
        const val = pillars[key];
        const hasData = val != null;
        const pct = hasData ? Math.max(0, Math.min(100, val as number)) : 0;
        return (
          <div key={key} className="flex min-w-[90px] flex-col gap-1">
            <span className="text-[9px] uppercase tracking-[0.08em] text-ink-tertiary">
              {label}
            </span>
            <div className="flex items-center gap-1.5">
              <div className="h-1 w-14 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={`h-full rounded-full ${hasData ? 'bg-gold-primary/60' : 'bg-white/[0.04]'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {hasData ? (
                <span className="font-mono text-[10px] text-ink-secondary">
                  {Math.round(val as number)}
                </span>
              ) : (
                <span className="text-[9px] text-ink-tertiary">(no data yet)</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single sector row card
// ---------------------------------------------------------------------------

function SectorRowCard({
  item,
  defaultExpanded,
}: {
  item: SectorItem;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="overflow-hidden rounded-[8px] border border-gold-primary/14 bg-[#080808]">
      {/* ── Header row ── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={expanded}
      >
        {/* Rank */}
        <span className="w-5 flex-none font-mono text-[11px] text-ink-tertiary">
          {item.rank}
        </span>

        {/* Symbol + name */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-mono text-[13px] font-semibold text-[#d4d4d8]">
            {item.sector_id}
          </span>
          <span className="text-[11px] text-ink-secondary">{item.sector_name}</span>
        </div>

        {/* Verdict badge */}
        <VerdictBadge verdict={item.verdict} />

        {/* Score bar */}
        <div className="hidden sm:block">
          <ScoreBar score={item.score} />
        </div>

        {/* Rank delta */}
        <div className="w-8 text-center">
          <RankDelta delta={item.rank_delta_5d} />
        </div>

        {/* Chevron */}
        <span className="flex-none text-ink-tertiary">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      {/* ── Score bar (mobile, below header) ── */}
      <div className="block px-4 pb-2 sm:hidden">
        <ScoreBar score={item.score} />
      </div>

      {/* ── Expandable body ── */}
      {expanded && (
        <div className="border-t border-gold-primary/[0.08] px-4 pb-4 pt-3 space-y-3">
          {/* Pillar bars */}
          <PillarBars pillars={item.pillars} />

          {/* Drivers */}
          {item.drivers.length > 0 && (
            <ul className="space-y-1.5">
              {item.drivers.map((driver, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] leading-[1.5] text-ink-secondary">
                  <span className="mt-[5px] h-[5px] w-[5px] shrink-0 rounded-full bg-gold-primary/70" />
                  <span>{driver}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Invalidation */}
          {item.invalidation && (
            <p className="text-[11px] italic leading-[1.5] text-ink-tertiary">
              <span className="not-italic font-medium text-ink-tertiary">What flips it:</span>{' '}
              {item.invalidation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SectorOutlookSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-3 w-36 rounded bg-white/[0.08]" />
        <div className="h-3 w-48 rounded bg-white/[0.05]" />
      </div>
      {/* Rotation strip */}
      <div className="h-14 rounded-[8px] border border-gold-primary/14 bg-[#080808]" />
      {/* Sector rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded-[8px] border border-gold-primary/14 bg-[#080808]" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function SectorOutlookPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['sector-outlook'],
    queryFn: fetchSectorOutlook,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) return <SectorOutlookSkeleton />;

  const outlook = data?.outlook ?? null;

  // Quiet placeholder when data not yet generated
  if (!outlook) {
    return (
      <div className="rounded-[8px] border border-gold-primary/14 bg-[#080808] p-5 text-center">
        <p className="text-[12px] text-ink-secondary">
          Sector outlook is being prepared — first edition lands after the next market close.
        </p>
      </div>
    );
  }

  const sortedSectors = [...outlook.sectors].sort((a, b) => a.rank - b.rank);
  const missingNews = (outlook.missing ?? []).includes('news');

  return (
    <div className="space-y-3">
      {/* ── Section header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-primary">
          Sector Outlook
        </span>
        <span className="text-[10px] text-ink-tertiary">
          Updated {relativeDate(outlook.generated_at)} · ISM + rates + jobs + news flow
        </span>
      </div>

      {/* ── Rotation Radar strip ── */}
      <div className="flex items-start gap-2.5 rounded-[8px] border border-gold-primary/14 bg-[#080808] px-4 py-3">
        <Activity className="mt-0.5 h-3.5 w-3.5 flex-none text-gold-primary/70" />
        <p className="text-[12px] leading-[1.6] text-ink-secondary">{outlook.rotation_story}</p>
      </div>

      {/* ── Ranked sector list ── */}
      <div className="space-y-2">
        {sortedSectors.map((item, i) => (
          <SectorRowCard
            key={item.sector_id}
            item={item}
            defaultExpanded={i === 0}
          />
        ))}
      </div>

      {/* ── Missing news signal note ── */}
      {missingNews && (
        <p className="rounded-[6px] border border-[#f59e0b]/20 bg-[#f59e0b]/[0.04] px-3 py-2 text-[11px] text-[#f59e0b]">
          News-flow signal is still accumulating (live in ~2 weeks) — weights rebalanced until then.
        </p>
      )}

      {/* ── Footer disclaimer ── */}
      <p className="text-center text-[10px] italic text-ink-tertiary">
        Conviction scoring from live data — not financial advice.
      </p>
    </div>
  );
}
