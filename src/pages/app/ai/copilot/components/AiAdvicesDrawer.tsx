// src/pages/app/ai/copilot/components/AiAdvicesDrawer.tsx
// =========================================================
// Right-edge slide-out drawer wrapping the AI Advices rail content.
//
// Collapsed: vertical pull-tab fixed to right viewport edge (z-40).
// Open:      panel slides in from right (z-50), full height, w-[380px].
//            Backdrop (z-40) and Esc key close it.
// State: localStorage key `copilot_ai_advices_open`.
// =========================================================

import { useEffect, useState, useCallback } from 'react';
import { X, Sparkles, ArrowRight, TrendingUp, AlertTriangle, Target, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumFrame } from '../brief/PremiumFrame';
import { useSynthesisBrief } from '../hooks/useSynthesisBrief';
import { useHoldingVerdicts } from '../hooks/useHoldingVerdicts';
import { TICKER_TO_NAME } from '../utils/opportunityMapper';
import { computePortfolioHealth, computeRiskAnalysis } from '../utils/portfolioRisk';
import type { PortfolioSnapshot } from '../hooks/usePortfolioData';
import type { VerdictType } from '@/services/copilotVerdictsApi';

// ─── Re-usable sub-components (shared with AiAdvicesRail) ────────────────────

function Divider() {
  return <div className="h-px bg-white/[0.07] my-4" />;
}

function Eyebrow({ label, color = 'gray' }: { label: string; color?: 'gold' | 'red' | 'gray' }) {
  const cls =
    color === 'gold' ? 'text-gold-primary' :
    color === 'red'  ? 'text-[#E87070]' :
    'text-ink-tertiary';
  return (
    <p className={`text-[9px] uppercase tracking-[0.13em] font-semibold mb-2 ${cls}`}>{label}</p>
  );
}

type StatusTone = 'green' | 'amber' | 'red';

function statusFromScore(overall: number): { tone: StatusTone; label: string; summary: string } {
  if (overall >= 70) {
    return { tone: 'green', label: 'Healthy', summary: 'Your portfolio is well-balanced with diversified exposure.' };
  }
  if (overall >= 40) {
    return { tone: 'amber', label: 'Stable', summary: 'Your portfolio is balanced with moderate risk exposure.' };
  }
  return { tone: 'red', label: 'At Risk', summary: 'High concentration or low diversification detected.' };
}

function StatusDot({ tone }: { tone: StatusTone }) {
  const bg =
    tone === 'green' ? 'bg-[#4F9D6B]' :
    tone === 'amber' ? 'bg-gold-primary' :
    'bg-[#C25450]';
  return <span className={`inline-block h-2 w-2 rounded-full flex-none ${bg}`} />;
}

const VERDICT_SUMMARY_LABEL: Record<VerdictType, string> = {
  BUY_MORE: 'BUY MORE',
  HOLD: 'HOLD',
  TRIM: 'TRIM',
  EXIT: 'EXIT',
  HEDGE: 'HEDGE',
};

/** Counts verdicts by type, e.g. "2 TRIM · 1 BUY MORE" — omits zero counts, highest count first. */
function summarizeVerdictCounts(counts: Partial<Record<VerdictType, number>>): string {
  const order: VerdictType[] = ['TRIM', 'EXIT', 'HEDGE', 'BUY_MORE', 'HOLD'];
  return order
    .filter((v) => (counts[v] ?? 0) > 0)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
    .map((v) => `${counts[v]} ${VERDICT_SUMMARY_LABEL[v]}`)
    .join(' · ');
}

function relativeTime(isoTs: string): string {
  try {
    const diff = Date.now() - new Date(isoTs).getTime();
    const hrs = Math.floor(diff / 3_600_000);
    if (hrs < 1) return 'just now';
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

// ─── Rail content (inner body, reusable) ─────────────────────────────────────

interface RailContentProps {
  snapshot: PortfolioSnapshot;
}

function AiAdvicesRailContent({ snapshot }: RailContentProps) {
  const { brief, loading } = useSynthesisBrief();
  const { verdicts } = useHoldingVerdicts();

  const health = computePortfolioHealth(snapshot.holdings, snapshot.totalValue);
  const risk   = computeRiskAnalysis(snapshot.holdings, snapshot.totalValue);

  const status = statusFromScore(health.overall);
  const hasPortfolio = snapshot.holdings.length > 0 && snapshot.totalValue > 0;

  const topIdea    = brief?.trade_ideas?.[0] ?? null;
  const topTicker  = topIdea?.symbol ?? null;
  const topName    = topTicker ? (TICKER_TO_NAME[topTicker] ?? topTicker) : null;
  const topThesis  = topIdea?.thesis
    ? topIdea.thesis.slice(0, 90) + (topIdea.thesis.length > 90 ? '…' : '')
    : null;

  const topDriver  = risk.drivers[0] ?? null;

  const sectorCall = brief?.sector_calls?.[0] ?? null;
  const actionLine = sectorCall
    ? `${sectorCall.sector}: ${sectorCall.stance === 'OW' ? 'Overweight' : sectorCall.stance === 'UW' ? 'Underweight' : 'Market Weight'}. ${sectorCall.rationale.slice(0, 60)}${sectorCall.rationale.length > 60 ? '…' : ''}`
    : null;

  const generatedAt = brief?.generated_at ?? null;

  const verdictCounts = verdicts.reduce<Partial<Record<VerdictType, number>>>((acc, v) => {
    acc[v.verdict] = (acc[v.verdict] ?? 0) + 1;
    return acc;
  }, {});
  const verdictSummary = summarizeVerdictCounts(verdictCounts);

  return (
    /* pb-14 reserves space for the sticky footer inside PremiumFrame */
    <PremiumFrame className="flex flex-col flex-1 overflow-hidden">
      <div className="flex flex-col flex-1 overflow-y-auto p-5 pb-14">
        {/* Card title */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-white">
            AI DAILY BRIEF
          </p>
          {generatedAt && (
            <span className="text-[9px] text-ink-tertiary flex-none">
              {relativeTime(generatedAt)}
            </span>
          )}
        </div>

        {/* a. Portfolio Status */}
        <Divider />
        <Eyebrow label="PORTFOLIO STATUS" color="gray" />
        {hasPortfolio ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <StatusDot tone={status.tone} />
              <span className="text-sm font-semibold text-white">{status.label}</span>
            </div>
            <p className="text-[11px] text-ink-tertiary leading-snug">{status.summary}</p>
          </div>
        ) : (
          <p className="text-[11px] text-ink-tertiary">Connect a broker to see portfolio status.</p>
        )}

        {/* b. Biggest Opportunity */}
        <Divider />
        <Eyebrow label="BIGGEST OPPORTUNITY" color="gold" />
        {loading ? (
          <p className="text-[11px] text-ink-tertiary">Loading…</p>
        ) : topIdea ? (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-sm font-bold text-white">{topTicker}</p>
              {topName && topName !== topTicker && (
                <p className="text-[10px] text-ink-tertiary">{topName}</p>
              )}
              {topThesis && (
                <p className="text-[11px] text-ink-tertiary leading-snug mt-1">{topThesis}</p>
              )}
            </div>
            <span className="flex-none mt-0.5">
              <TrendingUp className="h-4 w-4 text-[#4F9D6B]" />
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-ink-tertiary">No opportunities at this time.</p>
        )}

        {/* c. Biggest Risk */}
        <Divider />
        <Eyebrow label="BIGGEST RISK" color="red" />
        {hasPortfolio && topDriver ? (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-sm font-bold text-white">{topDriver.label}</p>
              <p className="text-[11px] text-ink-tertiary leading-snug">{topDriver.text}</p>
            </div>
            <span className="flex-none mt-0.5">
              <AlertTriangle className="h-4 w-4 text-[#E87070]" />
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-ink-tertiary">No significant risks detected.</p>
        )}

        {/* d. Recommended Action */}
        <Divider />
        <Eyebrow label="RECOMMENDED ACTION" color="gray" />
        {actionLine ? (
          <div className="flex items-start justify-between gap-2">
            <p className="flex-1 text-[11px] text-ink-secondary leading-snug">{actionLine}</p>
            <span className="flex-none mt-0.5">
              <Target className="h-4 w-4 text-gold-primary" />
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-ink-tertiary">No action required today.</p>
        )}

        {/* Portfolio verdicts summary — compact counts linking to holdings */}
        {verdictSummary && (
          <>
            <Divider />
            <Eyebrow label="PORTFOLIO VERDICTS" color="gray" />
            <Link
              to="/copilot/holdings"
              className="flex items-center justify-between gap-2 text-[11px] text-ink-secondary hover:text-white transition-colors"
            >
              <span className="font-mono tabular-nums">{verdictSummary}</span>
              <ArrowRight className="h-3 w-3 flex-none text-gold-primary" />
            </Link>
          </>
        )}

        {/* e. Events to Watch */}
        <Divider />
        <Eyebrow label="EVENTS TO WATCH" color="gray" />
        <div className="flex items-start gap-2">
          <Calendar className="h-3.5 w-3.5 text-ink-tertiary flex-none mt-0.5" />
          <p className="text-[11px] text-ink-tertiary">No major events tomorrow.</p>
        </div>
      </div>

      {/* Footer */}
      <Link
        to="/copilot/ai-analyst"
        className="absolute inset-x-0 bottom-0 flex h-12 items-center justify-center gap-2 border-t border-gold-primary/20 bg-gold-primary/15 text-[11px] uppercase text-gold-bright transition-colors hover:bg-gold-primary/25"
      >
        View All Advices <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </PremiumFrame>
  );
}

// ─── Drawer component ─────────────────────────────────────────────────────────

const LS_KEY = 'copilot_ai_advices_open';

interface DrawerProps {
  snapshot: PortfolioSnapshot;
}

export function AiAdvicesDrawer({ snapshot }: DrawerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const open  = useCallback(() => setIsOpen(true),  []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, String(isOpen));
    } catch {
      // storage unavailable — no-op
    }
  }, [isOpen]);

  // Esc key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  return (
    <>
      {/* ── Pull tab (hidden when panel is open) ────────────────────────── */}
      {!isOpen && (
        <button
          onClick={open}
          aria-label="Open AI Advices panel"
          className={[
            'fixed right-0 top-1/2 -translate-y-1/2 z-40',
            'flex flex-col items-center justify-center gap-1.5',
            'h-28 w-9 rounded-l-[6px]',
            'border border-r-0 border-gold-primary/40',
            'bg-[#070604]/90 backdrop-blur-sm',
            'shadow-[-6px_0_24px_rgba(0,0,0,0.55)]',
            // Gold glow pulse to invite interaction
            'animate-[ai-tab-pulse_3s_ease-in-out_infinite]',
            'transition-colors hover:bg-gold-primary/10',
          ].join(' ')}
          style={{
            // Inline fallback for the pulse animation since Tailwind arbitrary
            // @keyframes need to be in globals.css — we use a CSS var approach:
            boxShadow: '-6px 0 24px rgba(0,0,0,0.55), -2px 0 8px rgba(244,217,123,0.15)',
          }}
        >
          <Sparkles className="h-3.5 w-3.5 text-gold-primary flex-none" />
          <span
            className="text-[9px] uppercase font-semibold tracking-[0.18em] text-gold-primary"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            AI ADVICES
          </span>
          {/* BETA chip */}
          <span className="rounded-[3px] border border-gold-primary/35 bg-gold-primary/10 px-1 py-px text-[7px] uppercase font-semibold text-gold-primary leading-none">
            β
          </span>
        </button>
      )}

      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* ── Panel ───────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-label="AI Advices"
        aria-modal="true"
        className={[
          'fixed right-0 top-0 h-full w-[380px] max-w-[90vw] z-50',
          'flex flex-col',
          'bg-[#070604]/97 backdrop-blur-md',
          'border-l border-gold-primary/25',
          'shadow-[-20px_0_60px_rgba(0,0,0,0.70)]',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-none">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-primary" />
            <p className="text-base font-bold text-gold-primary tracking-wide">AI ADVICES</p>
            <span className="rounded-[4px] border border-gold-primary/30 bg-gold-primary/10 px-2 py-0.5 text-[9px] uppercase font-semibold text-gold-primary">
              BETA
            </span>
          </div>
          <button
            onClick={close}
            aria-label="Close AI Advices panel"
            className="flex items-center justify-center h-7 w-7 rounded-full border border-white/10 bg-white/5 text-ink-tertiary hover:text-white hover:border-white/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Rail content — fills remaining height */}
        <div className="flex flex-col flex-1 overflow-hidden px-5 pb-5">
          {/* Toggle: close from inside the panel */}
          <div
            role="none"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full"
          >
            <button
              onClick={toggle}
              aria-label="Toggle AI Advices panel"
              className="flex items-center justify-center h-8 w-5 rounded-l-[4px] border border-r-0 border-gold-primary/30 bg-[#070604]/90 text-gold-primary/60 hover:text-gold-primary transition-colors"
            >
              {/* chevron pointing left when open */}
              <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden="true">
                <path d="M6 2L2 6L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <AiAdvicesRailContent snapshot={snapshot} />
        </div>
      </div>
    </>
  );
}
