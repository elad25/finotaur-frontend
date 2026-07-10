/**
 * AISummary — the lead tab for Journal Reports.
 *
 * Runs the Leak Detector engine (buildLeakReport) over the SAME trade set
 * the other report tabs see (useTrades() — no filters, matches Overview.tsx),
 * and surfaces a single ranked verdict: the user's most expensive trading
 * pattern, with real evidence linking back to individual trades.
 *
 * Gating: the route itself is wrapped in <JournalFeatureGate feature="ai-summary">
 * in App.tsx (same pattern as Shadow / Revenge Radar) — this component only
 * renders for paid/trial/admin users.
 *
 * NOTE: <ReportsTabsNav> is mounted ABOVE this component by the route parent.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useTrades } from '@/hooks/useTradesData';
import type { Trade } from '@/hooks/useTradesData';
import { Card } from '@/components/ds/Card';
import { Change } from '@/components/ds/NumberDisplay';
import { buildLeakReport } from '@/lib/journal/leakDetector';
import type { Leak, LeakEvidence } from '@/lib/journal/leakDetector';
import CreditsBanner from '@/components/journal/reports/CreditsBanner';
import RecapCard from '@/components/journal/reports/RecapCard';
import LeakCounterfactualChart from '@/components/journal/reports/LeakCounterfactualChart';
import LeakActionPlan, { AddRuleButton } from '@/components/journal/reports/LeakActionPlan';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtCurrencyWhole(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const EVIDENCE_VISIBLE_CAP = 10;

const CONFIDENCE_STYLE: Record<Leak['confidence'], string> = {
  high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  medium: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  low: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
};

const CONFIDENCE_LABEL: Record<Leak['confidence'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

function ConfidenceChip({ confidence }: { confidence: Leak['confidence'] }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${CONFIDENCE_STYLE[confidence]}`}
    >
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Evidence row — links to the resolved trade, or renders the note as text
// ---------------------------------------------------------------------------

interface EvidenceRowProps {
  evidence: LeakEvidence;
  trade: Trade | undefined;
}

function EvidenceRow({ evidence, trade }: EvidenceRowProps) {
  const navigate = useNavigate();

  if (!trade) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-ink-tertiary border-b border-white/[0.04] last:border-b-0">
        <span>{evidence.note ?? 'Trade no longer in your current data set.'}</span>
      </div>
    );
  }

  const pnl = trade.pnl ?? 0;
  const hasPositiveDelta = typeof evidence.deltaUsd === 'number' && evidence.deltaUsd > 0;

  return (
    <button
      type="button"
      onClick={() => navigate(`/app/journal/${trade.id}`)}
      className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-medium text-ink-primary shrink-0">{trade.symbol}</span>
        <span className="text-ink-tertiary shrink-0">{fmtDate(trade.open_at)}</span>
        {evidence.note && (
          <span className="text-ink-tertiary truncate">{evidence.note}</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {hasPositiveDelta && (
          <span className="text-[11px] shrink-0" style={{ color: '#34D399' }}>
            +{fmtCurrencyWhole(evidence.deltaUsd as number)} if followed
          </span>
        )}
        <Change value={pnl} format="currency" decimals={2} className="shrink-0" />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Other-leak card — smaller ranked card for leaks beyond the #1 verdict
// ---------------------------------------------------------------------------

function OtherLeakCard({ leak }: { leak: Leak }) {
  return (
    <Card padding="compact" className="flex flex-col gap-2">
      <p className="text-sm font-medium text-ink-primary leading-snug">{leak.title}</p>
      <div className="flex items-center justify-between gap-2">
        <Change value={-leak.costUsd} format="currency" decimals={0} showSign={false} />
        <ConfidenceChip confidence={leak.confidence} />
      </div>
      <p className="text-[11px] text-ink-tertiary">{leak.sampleSize} trades analyzed</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AI Recaps section — reused as-is from AIRecaps.tsx (weekly + monthly only)
// ---------------------------------------------------------------------------

function AIRecapsSection() {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-primary">
          AI Recaps
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          Weekly and monthly summaries powered by FINOTAUR AI.
        </p>
      </div>
      <CreditsBanner />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecapCard period="weekly" />
        <RecapCard period="monthly" />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonState() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div>
        <div className="h-7 w-40 rounded bg-white/10 animate-pulse" />
        <div className="h-4 w-64 rounded bg-white/10 animate-pulse mt-2" />
      </div>
      <div className="rounded-[12px] bg-surface-1 border-[0.5px] border-border-ds-subtle p-6 h-48 animate-pulse" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AISummary() {
  const { data: trades = [], isLoading } = useTrades();
  const [showAllEvidence, setShowAllEvidence] = useState(false);

  const report = useMemo(() => buildLeakReport(trades), [trades]);

  const tradesById = useMemo(() => {
    const map = new Map<string, Trade>();
    for (const t of trades) map.set(t.id, t);
    return map;
  }, [trades]);

  if (isLoading) {
    return <SkeletonState />;
  }

  // ---------------------------------------------------------------------------
  // State A — collecting (fewer than minTradesRequired closed trades)
  // ---------------------------------------------------------------------------

  if (report.status === 'collecting') {
    const pct = Math.min(100, (report.tradesAnalyzed / report.minTradesRequired) * 100);
    return (
      <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-yellow-100">AI Summary</h2>
          <p className="text-sm text-zinc-400 mt-1">Your most expensive trading pattern, diagnosed by FINOTAUR AI.</p>
        </div>
        <Card padding="spacious" className="flex flex-col items-center text-center gap-4 py-16">
          <Search className="w-8 h-8 text-gold-primary" />
          <p className="text-lg font-semibold text-ink-primary">
            Analyzing your trading… {report.tradesAnalyzed} of {report.minTradesRequired} trades logged
          </p>
          <div className="w-full max-w-xs h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gold-primary transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-sm text-ink-tertiary max-w-sm">
            Log {report.minTradesRequired} trades and FINOTAUR will identify your most expensive losing pattern.
          </p>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // State B — verdict
  // ---------------------------------------------------------------------------

  if (report.verdict) {
    const verdict = report.verdict;
    const otherLeaks = report.leaks.slice(1);
    const visibleEvidence = showAllEvidence
      ? verdict.evidence
      : verdict.evidence.slice(0, EVIDENCE_VISIBLE_CAP);

    return (
      <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-yellow-100">AI Summary</h2>
          <p className="text-sm text-zinc-400 mt-1">Your most expensive trading pattern, diagnosed by FINOTAUR AI.</p>
        </div>

        {/* Hero — the #1 leak */}
        <Card variant="featured" padding="spacious" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gold-primary" />
            <span className="text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-primary">
              Your #1 Leak
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-ink-primary leading-tight">{verdict.title}</h3>
          <Change
            value={-verdict.costUsd}
            format="currency"
            decimals={0}
            showSign={false}
            className="!text-2xl md:!text-3xl font-bold"
          />
          <p className="text-sm text-ink-secondary">
            {verdict.shareOfLosses !== null && (
              <>{(verdict.shareOfLosses * 100).toFixed(0)}% of your total losses · </>
            )}
            based on {verdict.sampleSize} trades
          </p>
          <p className="text-sm text-ink-secondary leading-relaxed">{verdict.detail}</p>
        </Card>

        {/* Your rule */}
        <div className="rounded-[12px] border-[0.5px] border-gold-border bg-surface-1 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-primary mb-1.5">
              Your rule
            </p>
            <AddRuleButton rule={verdict.rule} />
          </div>
          <p className="text-sm text-ink-primary leading-relaxed">{verdict.rule}</p>
        </div>

        {/* Counterfactual chart */}
        <LeakCounterfactualChart trades={trades} verdict={verdict} />

        {/* AI action plan */}
        <LeakActionPlan verdict={verdict} />

        {/* Evidence */}
        <section>
          <h3 className="text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-primary mb-3">
            The evidence ({verdict.evidence.length} trades)
          </h3>
          <Card padding="compact" className="overflow-hidden !p-0">
            {visibleEvidence.map((ev, i) => (
              <EvidenceRow key={`${ev.tradeId}-${i}`} evidence={ev} trade={tradesById.get(ev.tradeId)} />
            ))}
          </Card>
          {verdict.evidence.length > EVIDENCE_VISIBLE_CAP && (
            <button
              type="button"
              onClick={() => setShowAllEvidence((v) => !v)}
              className="mt-2 flex items-center gap-1 text-xs text-ink-tertiary hover:text-gold-primary transition-colors"
            >
              {showAllEvidence ? (
                <>Show fewer <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Show all {verdict.evidence.length} <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}
        </section>

        {/* Other leaks */}
        {otherLeaks.length > 0 && (
          <section>
            <h3 className="text-[11px] font-semibold tracking-[1.2px] uppercase text-gold-primary mb-3">
              Other leaks
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherLeaks.map((leak) => (
                <OtherLeakCard key={leak.id} leak={leak} />
              ))}
            </div>
          </section>
        )}

        <AIRecapsSection />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // State C — clean bill
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-yellow-100">AI Summary</h2>
        <p className="text-sm text-zinc-400 mt-1">Your most expensive trading pattern, diagnosed by FINOTAUR AI.</p>
      </div>

      <Card padding="spacious" className="flex flex-col items-center text-center gap-4 py-16">
        <ShieldCheck className="w-8 h-8 text-emerald-400" />
        <p className="text-lg font-semibold text-ink-primary">
          No significant leak detected across your last {report.tradesAnalyzed} trades.
        </p>
        <p className="text-sm text-ink-tertiary max-w-sm">
          Keep doing what you're doing — we re-run this diagnosis on every new trade.
        </p>
      </Card>

      <AIRecapsSection />
    </div>
  );
}
