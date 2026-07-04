// src/components/ai-summary/AiSummaryCard.tsx
// Shared AI summary card — fetches a live Hebrew AI summary from the backend.
// Used across all 6 macro/crypto report pages.

import { memo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ds/Card';

type Feature = 'defi-tvl' | 'liquidity' | 'stablecoins' | 'real-yields' | 'credit-spreads' | 'heatmap';

interface AiSummaryResponse {
  summary: string;
  generatedAt: string;
  model: string;
}

async function fetchAiSummary(feature: Feature, force = false): Promise<AiSummaryResponse> {
  const url = `/api/ai-reports/${feature}${force ? '?force=true' : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) {
    if (res.status === 503) throw new Error('ai_disabled');
    throw new Error(`ai_summary_failed: ${res.status}`);
  }
  return res.json();
}

interface Props {
  feature: Feature;
  className?: string;
}

export const AiSummaryCard = memo(function AiSummaryCard({ feature, className }: Props) {
  const qc = useQueryClient();
  const queryKey = ['ai-summary', feature];

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchAiSummary(feature, false),
    staleTime: 60 * 60 * 1000,  // 1h — match server cache hot window
    gcTime: 2 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const regenerate = useMutation({
    mutationFn: () => fetchAiSummary(feature, true),
    onSuccess: (fresh) => qc.setQueryData(queryKey, fresh),
  });

  const isPending = isLoading || regenerate.isPending;
  const errMsg = isError
    ? (error instanceof Error && error.message === 'ai_disabled' ? 'AI disabled for this tier' : 'Failed to load AI summary')
    : null;

  return (
    <Card variant="featured" className={`w-full mb-6 ${className ?? ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] uppercase tracking-widest text-gold-muted font-medium">
              AI Summary
            </p>
            <button
              type="button"
              onClick={() => regenerate.mutate()}
              disabled={isPending}
              className="text-[11px] text-ink-tertiary hover:text-gold-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              aria-label="Regenerate AI summary"
            >
              <span className={regenerate.isPending ? 'animate-spin inline-block' : 'inline-block'}>↻</span>
              <span>Regenerate</span>
            </button>
          </div>

          {isPending && (
            <div className="space-y-2 animate-pulse" aria-label="Loading AI summary">
              <div className="h-3 w-full bg-white/10 rounded" />
              <div className="h-3 w-5/6 bg-white/10 rounded" />
              <div className="h-3 w-3/4 bg-white/10 rounded" />
            </div>
          )}

          {!isPending && errMsg && (
            <p className="text-sm text-red-400 leading-relaxed">{errMsg}</p>
          )}

          {!isPending && !errMsg && data?.summary && (
            <p className="text-sm text-ink-primary leading-relaxed whitespace-pre-line">
              {data.summary}
            </p>
          )}

          {!isPending && data?.generatedAt && (
            <p className="text-[10px] text-ink-tertiary mt-2">
              {data.model} · {new Date(data.generatedAt).toLocaleString('en-US')}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
});
