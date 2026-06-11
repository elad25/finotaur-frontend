// src/components/fino/FinoBriefingCard.tsx
// =====================================================
// FINO Morning Briefing Card — shown at the top of the FINO chat drawer.
// Fetched once per day per session; cached in sessionStorage keyed by date.
// All states (loading, locked, ready, not_ready, error) are handled internally
// — this component never throws.
// =====================================================

import { useEffect, useState, useCallback } from 'react';
import { Lock, ChevronDown, ChevronUp, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  fetchFinoBriefing,
  type FinoBriefingResult,
  type BriefMarketPulse,
  type BriefKeyEvent,
  type BriefSectorWatch,
  type BriefPersonalWatchlistItem,
  type BriefPortfolioPosition,
} from '@/services/aiCopilotApi';

// ── Helpers ────────────────────────────────────────────────────────────────

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatBriefDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function signClass(change: string | number): string {
  const n = typeof change === 'string' ? parseFloat(change) : change;
  if (isNaN(n)) return 'text-ink-secondary';
  return n > 0 ? 'text-emerald-400' : n < 0 ? 'text-red-400' : 'text-ink-secondary';
}

function formatChange(change: string | number): string {
  const n = typeof change === 'string' ? parseFloat(change) : change;
  if (isNaN(n)) return String(change);
  const prefix = n > 0 ? '+' : '';
  return `${prefix}${n.toFixed(2)}%`;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded bg-[#C9A646]/10 animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

function BriefingSkeleton() {
  return (
    <div className="p-3 space-y-2">
      <SkeletonLine className="h-3 w-2/5" />
      <SkeletonLine className="h-2.5 w-full" />
      <SkeletonLine className="h-2.5 w-4/5" />
      <div className="flex gap-2 pt-1">
        <SkeletonLine className="h-6 w-16 rounded-full" />
        <SkeletonLine className="h-6 w-16 rounded-full" />
        <SkeletonLine className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

function LockedState() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Lock className="h-4 w-4 flex-shrink-0 text-[#C9A646]/70" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-ink-primary">Morning Briefing</p>
        <p className="text-[11px] text-ink-tertiary leading-snug">
          Your daily pre-market brief is part of FINOTAUR Core.
        </p>
      </div>
      <Link
        to="/pricing"
        className="flex-shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold text-black transition-all duration-150 hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 100%)' }}
      >
        Upgrade
      </Link>
    </div>
  );
}

function MarketPulseChip({ item }: { item: BriefMarketPulse }) {
  const cls = signClass(item.change);
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#C9A646]/15 bg-[#C9A646]/5 px-2 py-0.5 text-[10px] leading-none">
      <span className="text-ink-secondary font-medium">{item.label}</span>
      <span className={`font-semibold ${cls}`}>{formatChange(item.change)}</span>
    </span>
  );
}

function KeyEventRow({ event }: { event: BriefKeyEvent }) {
  return (
    <li className="flex items-start gap-2 text-[11px] leading-snug">
      {event.importance === 'high' && (
        <span
          className="mt-[3px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#C9A646]"
          aria-label="High importance"
        />
      )}
      {event.importance !== 'high' && (
        <span className="mt-[3px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#C9A646]/25" />
      )}
      <span className="text-ink-tertiary tabular-nums">{event.time}</span>
      <span className="text-ink-secondary">{event.name}</span>
    </li>
  );
}

function WatchlistChip({ item }: { item: BriefPersonalWatchlistItem }) {
  const cls = item.changePct > 0 ? 'text-emerald-400' : item.changePct < 0 ? 'text-red-400' : 'text-ink-secondary';
  const sign = item.changePct > 0 ? '+' : '';
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#C9A646]/15 bg-[#C9A646]/5 px-2 py-0.5 text-[10px] leading-none">
      <span className="text-ink-secondary font-medium">{item.symbol}</span>
      <span className={`font-semibold ${cls}`}>{sign}{item.changePct.toFixed(2)}%</span>
    </span>
  );
}

function PortfolioPositionsRow({ positions, totalValue }: { positions: BriefPortfolioPosition[]; totalValue?: number }) {
  const displayPositions = positions.slice(0, 5);
  const positionText = displayPositions.map((p) => `${p.symbol}×${p.qty}`).join(' · ');
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] text-ink-secondary leading-snug">{positionText}</span>
      {totalValue !== undefined && (
        <span className="flex-shrink-0 text-[11px] text-ink-tertiary tabular-nums">
          ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
      )}
    </div>
  );
}

function SectorWatchColumns({ sectors }: { sectors: BriefSectorWatch[] }) {
  const sorted = [...sectors].sort((a, b) => b.changePct - a.changePct);
  const gainers = sorted.filter((s) => s.changePct >= 0).slice(0, 3);
  const losers = sorted.filter((s) => s.changePct < 0).slice(-3).reverse();

  function SectorItem({ s }: { s: BriefSectorWatch }) {
    const cls = s.changePct >= 0 ? 'text-emerald-400' : 'text-red-400';
    const sign = s.changePct >= 0 ? '+' : '';
    return (
      <div className="flex justify-between text-[10px]">
        <span className="text-ink-secondary truncate mr-1">{s.name}</span>
        <span className={`font-semibold flex-shrink-0 ${cls}`}>
          {sign}{s.changePct.toFixed(2)}%
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
      <div className="space-y-0.5">
        {gainers.map((s) => (
          <SectorItem key={s.name} s={s} />
        ))}
      </div>
      <div className="space-y-0.5">
        {losers.map((s) => (
          <SectorItem key={s.name} s={s} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

type LoadState =
  | { phase: 'loading' }
  | { phase: 'locked'; reason: string }
  | { phase: 'ready'; result: Extract<FinoBriefingResult, { status: 'ready' }> }
  | { phase: 'hidden' }; // not_ready or network error — render nothing

const COLLAPSED_KEY = 'fino_brief_collapsed';

export default function FinoBriefingCard() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(COLLAPSED_KEY, String(next));
      } catch {
        // sessionStorage unavailable — ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const today = getTodayKey();
    const cacheKey = `fino_brief_cache_${today}`;

    // Try sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed: FinoBriefingResult = JSON.parse(cached);
        if (!cancelled) applyResult(parsed);
        return;
      }
    } catch {
      // ignore parse/storage errors
    }

    fetchFinoBriefing()
      .then((result) => {
        if (cancelled) return;
        // Cache successful fetches (not errors)
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {
          // storage full or unavailable — ignore
        }
        applyResult(result);
      })
      .catch(() => {
        if (!cancelled) setState({ phase: 'hidden' });
      });

    function applyResult(result: FinoBriefingResult) {
      switch (result.status) {
        case 'locked':
          setState({ phase: 'locked', reason: result.reason });
          break;
        case 'ready':
          setState({ phase: 'ready', result });
          break;
        case 'not_ready':
          setState({ phase: 'hidden' });
          break;
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  if (state.phase === 'hidden') return null;

  return (
    <div className="mx-3 mt-2 mb-1 rounded-xl border border-[#C9A646]/20 bg-[#0D0C0A]">
      {state.phase === 'loading' && <BriefingSkeleton />}

      {state.phase === 'locked' && <LockedState />}

      {state.phase === 'ready' && (() => {
        const { brief, date } = state.result;
        return (
          <>
            {/* Card header */}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex w-full items-center justify-between px-3 pt-2.5 pb-2 text-left"
            >
              <div className="flex items-center gap-2">
                <Sun className="h-3.5 w-3.5 text-[#C9A646]" />
                <span className="text-[11px] font-bold text-ink-primary">Morning Briefing</span>
                <span className="text-[10px] text-ink-tertiary">{formatBriefDate(date)}</span>
              </div>
              {collapsed
                ? <ChevronDown className="h-3.5 w-3.5 text-ink-tertiary" />
                : <ChevronUp className="h-3.5 w-3.5 text-ink-tertiary" />}
            </button>

            {!collapsed && (
              <div className="px-3 pb-3 space-y-2.5">
                {/* Headline */}
                <p className="text-[12px] font-semibold text-ink-primary leading-snug">
                  {brief.headline}
                </p>

                {/* Summary */}
                <p className="text-[11px] text-ink-tertiary leading-relaxed">
                  {brief.summary}
                </p>

                {/* Market pulse chips */}
                {brief.market_pulse.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {brief.market_pulse.map((item) => (
                      <MarketPulseChip key={item.label} item={item} />
                    ))}
                  </div>
                )}

                {/* Key events */}
                {brief.key_events.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#C9A646]/70">
                      Key Events
                    </p>
                    <ul className="space-y-1">
                      {brief.key_events.map((ev, i) => (
                        <KeyEventRow key={i} event={ev} />
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sector watch */}
                {brief.sector_watch.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#C9A646]/70">
                      Sector Watch
                    </p>
                    <SectorWatchColumns sectors={brief.sector_watch} />
                  </div>
                )}

                {/* Your Watchlist (optional — absent for payloads without personal data) */}
                {brief.personal?.watchlist && brief.personal.watchlist.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#C9A646]/70">
                      Your Watchlist
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {brief.personal.watchlist.map((item) => (
                        <WatchlistChip key={item.symbol} item={item} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Your Positions (optional — absent for payloads without portfolio data) */}
                {brief.portfolio?.positions && brief.portfolio.positions.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#C9A646]/70">
                      Your Positions
                    </p>
                    <PortfolioPositionsRow
                      positions={brief.portfolio.positions}
                      totalValue={brief.portfolio.totalValue}
                    />
                  </div>
                )}

                {/* Deep note (finotaur tier only) */}
                {brief.deep_note && (
                  <>
                    <div className="border-t border-[#C9A646]/10" />
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#C9A646]">
                        FINO's Take
                      </p>
                      <p className="text-[11px] text-ink-tertiary leading-relaxed">
                        {brief.deep_note}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
