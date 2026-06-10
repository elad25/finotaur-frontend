// src/pages/app/etfs/News.tsx
// =====================================================
// ETF SECTION — News Feed
// =====================================================
// Route: /app/etfs/news
// Fetches from fetchETFNews, renders a DS Card list.
// Each item: title (link), publisher, date, ticker
// chips, sentiment pill.
// =====================================================

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { fetchETFNews } from '@/services/etf-analyzer.api';
import type { EtfNewsItem } from '@/types/etf.types';
import { fmtDate } from './format';

const SENTIMENT_STYLES: Record<string, string> = {
  positive: 'bg-[#4AD295]/10 text-[#4AD295] border-[#4AD295]/30',
  negative: 'bg-[#E24B4A]/10 text-[#E24B4A] border-[#E24B4A]/30',
  neutral:  'bg-surface-2 text-ink-tertiary border-border-ds-subtle',
};

function SentimentPill({ sentiment }: { sentiment: EtfNewsItem['sentiment'] }) {
  if (!sentiment) return null;
  const styles = SENTIMENT_STYLES[sentiment] ?? SENTIMENT_STYLES.neutral;
  return (
    <span
      className={`rounded-[4px] border px-1.5 py-0.5 text-[10px] font-medium capitalize ${styles}`}
    >
      {sentiment}
    </span>
  );
}

function NewsItemCard({ item }: { item: EtfNewsItem }) {
  return (
    <div className="flex flex-col gap-ds-2 border-b border-border-ds-subtle/50 pb-ds-4 last:border-0 last:pb-0">
      {/* Title */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-ds-2 text-ink-primary text-sm font-medium leading-snug hover:text-gold-bright transition-colors"
      >
        <span className="flex-1">{item.title}</span>
        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-ink-tertiary group-hover:text-gold-bright transition-colors" aria-hidden="true" />
      </a>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-ds-2">
        <span className="text-[11px] text-ink-tertiary">
          {item.publisher}
        </span>
        <span className="text-[11px] text-ink-tertiary">·</span>
        <span className="text-[11px] text-ink-tertiary font-data">
          {fmtDate(item.publishedUtc)}
        </span>
        {item.sentiment && (
          <>
            <span className="text-[11px] text-ink-tertiary">·</span>
            <SentimentPill sentiment={item.sentiment} />
          </>
        )}
      </div>

      {/* Ticker chips */}
      {item.tickers && item.tickers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tickers.slice(0, 8).map((t) => (
            <span
              key={t}
              className="rounded-[4px] border border-border-ds-subtle bg-surface-2 px-1.5 py-0.5 text-[10px] font-data font-medium text-ink-secondary"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ETFNews() {
  const [items, setItems]   = useState<EtfNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchETFNews(30)
      .then((data) => { if (!cancelled) setItems(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load news.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-[780px] py-ds-7 px-ds-4 flex flex-col gap-ds-5">
      {/* Header */}
      <div className="space-y-ds-1">
        <span className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
          ETF Research
        </span>
        <h1 className="text-h2 font-medium text-ink-primary">ETF News</h1>
        <p className="text-body text-ink-secondary">
          Latest news across the ETF universe, with sentiment signals.
        </p>
      </div>

      <Card padding="default">
        {loading && (
          <div className="flex items-center justify-center py-12 text-ink-tertiary text-sm">
            Loading…
          </div>
        )}
        {error && (
          <p className="text-sm text-[#E24B4A] py-4">{error}</p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-center text-sm text-ink-tertiary py-8">No news available.</p>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="flex flex-col gap-ds-4">
            {items.map((item, i) => (
              <NewsItemCard key={`${item.url}-${i}`} item={item} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
