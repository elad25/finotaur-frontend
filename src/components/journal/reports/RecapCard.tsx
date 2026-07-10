import { useState } from 'react';
import { useAIRecap, type RecapPeriod, type RecapData } from '@/hooks/useAIRecap';

const PERIOD_LABELS: Record<RecapPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Current week (Mon-Sun) / month range, formatted the same way the real
 *  edge function's periodStart/periodEnd are — used only to date-label the
 *  canned demo recap, mirrors computePeriodRange() in useAIRecap.ts. */
function currentPeriodRange(period: RecapPeriod): { periodStart: string; periodEnd: string } {
  const now = new Date();
  if (period === 'monthly') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { periodStart: isoDate(first), periodEnd: isoDate(last) };
  }
  const day = now.getDay(); // 0 = Sun
  const offsetToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + offsetToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { periodStart: isoDate(monday), periodEnd: isoDate(sunday) };
}

/**
 * Canned, deterministic recaps for demo-mode journals (zero-trade users and
 * free-tier preview) — written to plausibly match the demo journal's overall
 * shape (src/utils/demoJournalData.ts: ~1-3 trades/weekday over 72 days plus
 * three scripted revenge-trading sequences). Shown instead of a real
 * generate() call so demo/free journals never hit the recap edge function.
 */
function buildDemoRecap(period: RecapPeriod): RecapData {
  const { periodStart, periodEnd } = currentPeriodRange(period);
  if (period === 'monthly') {
    return {
      period,
      periodStart,
      periodEnd,
      generatedAt: new Date().toISOString(),
      tradeCount: 45,
      narrative:
        `Over the past month you closed around 45 trades for a net P&L of roughly $2,150. Your strongest edge was ICT MSS setups in the London and NY AM sessions. ` +
        `The biggest drag was three multi-trade revenge sequences — each one starting with a normal loss and escalating into 3-4 oversized re-entries within the same session.`,
      keyMetrics: [
        { label: 'Trades', value: '45' },
        { label: 'Win rate', value: '55%' },
        { label: 'Net P&L', value: '$2,150' },
        { label: 'Avg R', value: '1.3' },
      ],
      observations: [
        'Each revenge sequence sized up trade over trade relative to the one before it.',
        'Winners and losers were held for roughly the same amount of time — no scale-out edge either way.',
        'A 30-minute cooldown after a loss would have avoided most of this month’s largest red days.',
      ],
      isMock: false,
    };
  }
  return {
    period,
    periodStart,
    periodEnd,
    generatedAt: new Date().toISOString(),
    tradeCount: 9,
    narrative:
      `This week you logged 9 trades with a net P&L of around $860. Your best pattern was FVG Sniper entries in the NY AM session. ` +
      `The costliest habit was re-entering within minutes of a loss, chasing it back — three of this week's losses came from that pattern.`,
    keyMetrics: [
      { label: 'Trades', value: '9' },
      { label: 'Win rate', value: '56%' },
      { label: 'Net P&L', value: '$860' },
      { label: 'Avg R', value: '1.4' },
    ],
    observations: [
      'Every loss inside a revenge sequence was sized larger than the trade before it.',
      'The single winning streak this week ran 3 trades in a row.',
      'Stepping away for 30 minutes after a loss would have cut this week’s biggest red trade.',
    ],
    isMock: false,
  };
}

interface RecapCardProps {
  period: RecapPeriod;
  /** Demo-mode journal (zero-trade user or free-tier preview): show a fixed
   *  sample recap on click, never call the recap edge function. */
  demo?: boolean;
}

export default function RecapCard({ period, demo = false }: RecapCardProps) {
  const { recap: liveRecap, isGenerating: liveIsGenerating, error: liveError, generate: liveGenerate, lastGenerated: liveLastGenerated } =
    useAIRecap(period);
  const [demoRecap, setDemoRecap] = useState<RecapData | null>(null);

  const recap = demo ? demoRecap : liveRecap;
  const isGenerating = demo ? false : liveIsGenerating;
  const error = demo ? null : liveError;
  const lastGenerated = demo ? demoRecap?.generatedAt ?? null : liveLastGenerated;
  const generate = demo ? () => setDemoRecap(buildDemoRecap(period)) : liveGenerate;

  return (
    <div className="rounded-2xl border border-yellow-200/15 bg-[#141414] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-base font-semibold text-yellow-100">
            {PERIOD_LABELS[period]}
          </span>
          {recap && (
            <p className="text-xs text-zinc-400 mt-0.5">
              {recap.periodStart} – {recap.periodEnd}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          {lastGenerated ? (
            <span className="text-[11px] text-zinc-500">
              Last generated: {formatRelativeTime(lastGenerated)}
            </span>
          ) : (
            <span className="text-[11px] text-zinc-500">Never</span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* No recap yet */}
      {!recap && !error && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-sm text-zinc-400">No recap generated yet.</p>
          <button
            onClick={generate}
            disabled={isGenerating}
            className="px-4 py-2 rounded-lg bg-yellow-400/10 border border-yellow-200/20 text-yellow-200 text-xs font-medium hover:bg-yellow-400/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating…' : 'Generate Recap'}
          </button>
        </div>
      )}

      {/* Recap content */}
      {recap && (
        <>
          {/* Sample caption (demo mode) or mock badge (real generation fallback) */}
          {demo ? (
            <p className="text-[11px] text-zinc-500">Sample recap — connect your trades to get yours</p>
          ) : (
            recap.isMock && (
              <span className="inline-block text-[10px] bg-yellow-500/10 text-yellow-300 px-2 py-0.5 rounded-full">
                PREVIEW · mock data
              </span>
            )
          )}

          {/* Narrative */}
          <p className="text-sm text-zinc-300 leading-relaxed">{recap.narrative}</p>

          {/* Key metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {recap.keyMetrics.map((m) => (
              <div key={m.label} className="rounded-lg bg-zinc-900/60 border border-zinc-800 px-3 py-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{m.label}</div>
                <div className="text-sm font-semibold text-yellow-100 mt-0.5">{m.value}</div>
              </div>
            ))}
          </div>

          {/* Observations */}
          <ul className="space-y-1.5">
            {recap.observations.map((obs, i) => (
              <li key={i} className="flex gap-2 text-xs text-zinc-400">
                <span className="text-yellow-500/60 flex-shrink-0">•</span>
                <span>{obs}</span>
              </li>
            ))}
          </ul>

          {/* Regenerate */}
          <div className="pt-1">
            <button
              onClick={generate}
              disabled={isGenerating}
              className="text-[11px] text-zinc-500 hover:text-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed underline underline-offset-2"
            >
              {isGenerating ? 'Generating…' : 'Regenerate'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
