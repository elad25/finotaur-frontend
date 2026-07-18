// src/pages/app/ai/copilot/components/AiAdvicesRail.tsx
// =====================================================
// AI ADVICES right-rail — tall card spanning all main rows.
// Sections: Portfolio Status, Biggest Opportunity, Biggest Risk,
//           Recommended Action, Events to Watch.
// Data: useSynthesisBrief (opportunities, actions), computePortfolioHealth
//       + computeRiskAnalysis (health/risk from snapshot).
// =====================================================

import { TrendingUp, AlertTriangle, Target, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumFrame } from '../brief/PremiumFrame';
import { useSynthesisBrief } from '../hooks/useSynthesisBrief';
import { TICKER_TO_NAME } from '../utils/opportunityMapper';
import { computePortfolioHealth, computeRiskAnalysis } from '../utils/portfolioRisk';
import { relativeTime } from '../utils/relativeTime';
import type { PortfolioSnapshot } from '../hooks/usePortfolioData';

// ─── Section divider ──────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-white/[0.07] my-4" />;
}

// ─── Eyebrow label ────────────────────────────────────────────────────────────

function Eyebrow({ label, color = 'gray' }: { label: string; color?: 'gold' | 'red' | 'gray' }) {
  const cls =
    color === 'gold' ? 'text-gold-primary' :
    color === 'red'  ? 'text-[#E87070]' :
    'text-ink-tertiary';
  return (
    <p className={`text-[9px] uppercase tracking-[0.13em] font-semibold mb-2 ${cls}`}>{label}</p>
  );
}

// ─── Portfolio status dot ─────────────────────────────────────────────────────

type StatusTone = 'green' | 'amber' | 'red';

function statusFromScore(overall: number): { tone: StatusTone; label: string; summary: string } {
  if (overall >= 70) {
    return {
      tone: 'green',
      label: 'Healthy',
      summary: 'Your portfolio is well-balanced with diversified exposure.',
    };
  }
  if (overall >= 40) {
    return {
      tone: 'amber',
      label: 'Stable',
      summary: 'Your portfolio is balanced with moderate risk exposure.',
    };
  }
  return {
    tone: 'red',
    label: 'At Risk',
    summary: 'High concentration or low diversification detected.',
  };
}

function StatusDot({ tone }: { tone: StatusTone }) {
  const bg =
    tone === 'green' ? 'bg-[#4F9D6B]' :
    tone === 'amber' ? 'bg-gold-primary' :
    'bg-[#C25450]';
  return <span className={`inline-block h-2 w-2 rounded-full flex-none ${bg}`} />;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  snapshot: PortfolioSnapshot;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AiAdvicesRail({ snapshot, className }: Props) {
  const { brief, loading } = useSynthesisBrief();

  // Health + Risk derived from snapshot.
  const health = computePortfolioHealth(snapshot.holdings, snapshot.totalValue);
  const risk   = computeRiskAnalysis(snapshot.holdings, snapshot.totalValue);

  const status = statusFromScore(health.overall);
  const hasPortfolio = snapshot.holdings.length > 0 && snapshot.totalValue > 0;

  // Top opportunity (first trade idea).
  const topIdea = brief?.trade_ideas?.[0] ?? null;
  const topTicker = topIdea?.symbol ?? null;
  const topName = topTicker ? (TICKER_TO_NAME[topTicker] ?? topTicker) : null;
  const topThesis = topIdea?.thesis
    ? topIdea.thesis.slice(0, 90) + (topIdea.thesis.length > 90 ? '…' : '')
    : null;

  // Biggest risk driver.
  const topDriver = risk.drivers[0] ?? null;

  // Recommended action — use first sector_call stance as action summary.
  const sectorCall = brief?.sector_calls?.[0] ?? null;
  const actionLine = sectorCall
    ? `${sectorCall.sector}: ${sectorCall.stance === 'OW' ? 'Overweight' : sectorCall.stance === 'UW' ? 'Underweight' : 'Market Weight'}. ${sectorCall.rationale.slice(0, 60)}${sectorCall.rationale.length > 60 ? '…' : ''}`
    : null;

  const generatedAt = brief?.generated_at ?? null;

  return (
    <div className={`flex flex-col h-full ${className ?? ''}`}>
      {/* Rail header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-gold-primary tracking-wide">AI ADVICES</p>
        <span className="rounded-[4px] border border-gold-primary/30 bg-gold-primary/10 px-2 py-0.5 text-[9px] uppercase font-semibold text-gold-primary">
          BETA
        </span>
      </div>

      {/* Main tall card */}
      <PremiumFrame className="flex flex-col flex-1">
        {/* pb-14 reserves space for the footer button */}
        <div className="flex flex-col flex-1 p-5 pb-14">
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

          {/* ── a. Portfolio Status ─────────────────────────────────────────── */}
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

          {/* ── b. Biggest Opportunity ─────────────────────────────────────── */}
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

          {/* ── c. Biggest Risk ─────────────────────────────────────────────── */}
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

          {/* ── d. Recommended Action ───────────────────────────────────────── */}
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

          {/* ── e. Events to Watch ──────────────────────────────────────────── */}
          <Divider />
          <Eyebrow label="EVENTS TO WATCH" color="gray" />
          {/* SynthesisBrief has no events list; daily brief has event_radar but
              we don't call useDailyBrief here to avoid extra auth requests.
              Show graceful empty state. */}
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
    </div>
  );
}
