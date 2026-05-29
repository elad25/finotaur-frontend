/**
 * NewsList — up to 3 news items with source, title, and relative date.
 *
 * Opens links in a new tab. Shows a graceful empty state when no news.
 */

import type { SeoTickerNewsItem } from '@/lib/seo/types';

interface NewsListProps {
  items: SeoTickerNewsItem[];
}

// ---------------------------------------------------------------------------
// Relative date helper — pure, no Date.now() side-effects at import time
// ---------------------------------------------------------------------------

function relativeDate(isoString: string | null): string {
  if (!isoString) return '';
  const published = new Date(isoString);
  if (Number.isNaN(published.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - published.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  if (diffMin < 2880) return 'Yesterday';
  const diffDays = Math.floor(diffMin / 1440);
  if (diffDays < 30) return `${diffDays}d ago`;
  return published.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewsList({ items }: NewsListProps) {
  const validItems = items
    .filter((n) => n.title && n.url)
    .slice(0, 3);

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08]">
      <div className="border-b border-white/[0.08] px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
          Recent News
        </h2>
      </div>

      {validItems.length === 0 ? (
        <p className="px-5 py-6 text-sm text-white/40">No recent news available.</p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {validItems.map((item, idx) => {
            const dateStr = relativeDate(item.published_at);
            return (
              <li key={idx} className="px-5 py-4 hover:bg-white/[0.03] transition-colors">
                <a
                  href={item.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group space-y-1"
                >
                  {/* Source + date row */}
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    {item.source && (
                      <span className="font-medium text-white/50">{item.source}</span>
                    )}
                    {item.source && dateStr && <span>·</span>}
                    {dateStr && <span>{dateStr}</span>}
                  </div>

                  {/* Title */}
                  <p className="text-sm text-white/80 group-hover:text-[#C9A646] transition-colors leading-snug">
                    {item.title}
                  </p>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
