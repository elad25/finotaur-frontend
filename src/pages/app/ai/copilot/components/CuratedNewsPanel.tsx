// src/pages/app/ai/copilot/components/CuratedNewsPanel.tsx
// =====================================================
// AI CURATED NEWS — top 3 items from the existing news endpoint.
// Reuses useNews (same service as NewsList/NewsListPremium).
// No new backend required.
// =====================================================

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import { PremiumFrame } from '../brief/PremiumFrame';
import { useNews } from '@/hooks/useNews';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  } catch {
    return '';
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CuratedNewsPanel({ className }: Props) {
  const { news, isLoading } = useNews({ category: 'all', limit: 5, autoRefresh: true });

  const items = useMemo(() => news.slice(0, 3), [news]);

  return (
    <PremiumFrame className={`min-h-[210px] ${className ?? ''}`}>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] uppercase text-gold-primary">AI CURATED NEWS</p>
          <Link
            to="/app/all-markets/news"
            className="rounded-[5px] border border-gold-primary/22 bg-black/30 px-3 py-1 text-[9px] uppercase text-gold-primary hover:bg-gold-primary/10"
          >
            VIEW ALL
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading && items.length === 0 ? (
            // Skeleton rows while loading
            [0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-8 w-8 flex-none rounded-[4px] bg-white/8" />
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 w-full rounded bg-white/8" />
                  <div className="h-2 w-2/3 rounded bg-white/6" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-ink-tertiary">
              No curated news right now.
            </p>
          ) : (
            items.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 rounded-[6px] p-1.5 transition hover:bg-gold-primary/[0.04]"
              >
                {/* Icon box */}
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-[4px] border border-gold-primary/18 bg-gold-primary/[0.06]">
                  <Newspaper className="h-3.5 w-3.5 text-gold-primary" />
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[11px] leading-snug text-ink-primary">
                    {item.headline}
                  </p>
                  <p className="mt-1 text-[10px] text-ink-tertiary">
                    {relativeTime(item.publishedAt)}
                    {item.source ? ` · ${item.source}` : ''}
                  </p>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </PremiumFrame>
  );
}
