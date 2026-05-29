// AI briefing panel — markdown text + highlighted picks + regenerate.

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import { Card, Eyebrow } from '@/components/ds/Card';
import type { SectorFlowBriefing } from '../utils/sectorFlowTypes';

interface SectorFlowAIBriefingProps {
  briefing: SectorFlowBriefing | null;
  loading: boolean;
  error: Error | null;
  onRegenerate: () => void;
}

function SkeletonBriefing() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-full bg-surface-2 rounded" />
      <div className="h-4 w-[92%] bg-surface-2 rounded" />
      <div className="h-4 w-[75%] bg-surface-2 rounded" />
    </div>
  );
}

export function SectorFlowAIBriefing({ briefing, loading, error, onRegenerate }: SectorFlowAIBriefingProps) {
  const relativeTime = briefing
    ? formatDistanceToNow(new Date(briefing.generatedAt), { addSuffix: true })
    : null;

  return (
    <Card variant="featured" className="p-ds-5">
      <div className="flex items-start justify-between mb-ds-4">
        <div className="flex items-center gap-ds-2">
          <span className="inline-block w-1 h-1 rounded-full bg-gold-primary shadow-glow-gold-resting" />
          <Eyebrow className="text-gold-primary">AI QUANT BRIEF</Eyebrow>
        </div>
        {briefing && (
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] text-ink-secondary rounded-sm border border-border-ds-subtle px-ds-2 py-0.5">
              Generated {relativeTime}
            </span>
            <span className="text-[10px] text-ink-tertiary font-mono">{briefing.modelUsed}</span>
          </div>
        )}
      </div>

      {error ? (
        <div className="flex flex-col gap-ds-3 py-ds-3">
          <div className="text-num-negative text-sm">{error.message}</div>
          <button
            type="button"
            onClick={onRegenerate}
            className="self-start rounded-[12px] border border-border-ds-default px-ds-4 py-ds-2 text-sm text-ink-primary hover:border-gold-primary transition-colors"
          >
            Retry
          </button>
        </div>
      ) : !briefing && loading ? (
        <SkeletonBriefing />
      ) : !briefing ? (
        <div className="text-ink-secondary text-sm py-ds-3">
          Quant brief not yet generated for today. Check back at 9 AM ET.
        </div>
      ) : (
        <>
          <div className="prose prose-invert max-w-none text-ink-primary text-base leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{briefing.brief}</ReactMarkdown>
          </div>
          {briefing.highlights.length > 0 && (
            <div className="mt-ds-5 pt-ds-4 border-t border-border-ds-subtle">
              <div className="text-xs uppercase tracking-[0.18em] text-ink-secondary mb-ds-3">
                Why these picks
              </div>
              <ul className="space-y-ds-2">
                {briefing.highlights.map((h) => (
                  <li key={h.etf} className="flex items-baseline gap-ds-3 text-sm">
                    <span className="font-mono text-gold-primary min-w-[3rem]">{h.etf}</span>
                    <span className="text-ink-primary">{h.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-ds-5 flex items-center justify-between">
            {loading && (
              <span className="text-[11px] text-ink-tertiary">Refreshing…</span>
            )}
            <button
              type="button"
              onClick={onRegenerate}
              disabled={loading}
              className="ml-auto rounded-[12px] border border-border-ds-subtle px-ds-4 py-ds-2 text-sm text-ink-secondary hover:border-gold-primary hover:text-ink-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Regenerate
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
