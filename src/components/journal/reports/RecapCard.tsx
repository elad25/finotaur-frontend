import { useAIRecap, type RecapPeriod } from '@/hooks/useAIRecap';

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

interface RecapCardProps {
  period: RecapPeriod;
}

export default function RecapCard({ period }: RecapCardProps) {
  const { recap, isGenerating, error, generate, lastGenerated } = useAIRecap(period);

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
          {/* Mock badge */}
          {recap.isMock && (
            <span className="inline-block text-[10px] bg-yellow-500/10 text-yellow-300 px-2 py-0.5 rounded-full">
              PREVIEW · mock data
            </span>
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
