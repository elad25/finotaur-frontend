/**
 * /blog — Public blog index page.
 * Fetches posts from GET /api/blog/feed with click-to-load pagination.
 */

import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronDown, RefreshCw } from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import { webPage, breadcrumbList } from '@/components/seo/jsonLd';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlogPostSummary {
  slug: string;
  title: string;
  excerpt: string;
  type: string;
  publishedAt: string;
  isPremiumTeaser: boolean;
  imageUrl?: string;
}

interface FeedResponse {
  posts: BlogPostSummary[];
  total: number;
}

const PAGE_SIZE = 20;

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchFeed(limit: number, offset: number): Promise<FeedResponse> {
  const res = await fetch(`/api/blog/feed?limit=${limit}&offset=${offset}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch blog feed: ${res.status}`);
  }
  return res.json() as Promise<FeedResponse>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

const TYPE_LABELS: Record<string, string> = {
  weekly: 'Weekly Report',
  daily: 'Daily Brief',
  ism: 'ISM Report',
  analysis: 'Analysis',
  education: 'Education',
};

function typeBadgeLabel(type: string): string {
  return TYPE_LABELS[type.toLowerCase()] ?? type;
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-6 animate-pulse">
      <div className="h-4 w-20 bg-white/10 rounded mb-4" />
      <div className="h-5 w-3/4 bg-white/10 rounded mb-2" />
      <div className="h-4 w-full bg-white/[0.07] rounded mb-1" />
      <div className="h-4 w-2/3 bg-white/[0.07] rounded mb-6" />
      <div className="h-3 w-24 bg-white/[0.05] rounded" />
    </div>
  );
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: BlogPostSummary }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block rounded-lg border border-white/[0.06] bg-white/[0.015]
                 hover:border-[#C9A646]/35 hover:bg-[#C9A646]/[0.03]
                 transition-all duration-200 p-6"
    >
      {/* Badges row */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="inline-block text-[10px] uppercase tracking-[0.20em] font-medium
                     px-2 py-0.5 rounded-sm
                     bg-[#C9A646]/10 text-[#C9A646] border border-[#C9A646]/20"
        >
          {typeBadgeLabel(post.type)}
        </span>
        {post.isPremiumTeaser && (
          <span
            className="inline-block text-[10px] uppercase tracking-[0.20em] font-medium
                       px-2 py-0.5 rounded-sm
                       bg-amber-500/10 text-amber-400 border border-amber-500/20"
          >
            Premium
          </span>
        )}
      </div>

      {/* Title */}
      <h2
        className="text-base md:text-lg font-semibold text-white group-hover:text-[#F4E4B8]
                   transition-colors mb-2 line-clamp-2"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {post.title}
      </h2>

      {/* Excerpt */}
      <p className="text-sm text-white/55 line-clamp-3 mb-4 group-hover:text-white/70 transition-colors">
        {post.excerpt}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-1.5 text-xs text-white/35">
        <Calendar className="w-3 h-3" />
        <span>{formatDate(post.publishedAt)}</span>
      </div>

      {/* Read more hint */}
      <div
        className="mt-4 text-[11px] text-[#C9A646]/0 group-hover:text-[#C9A646]/80
                   transition-all tracking-wide"
      >
        Read more →
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlogIndex() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFeed(PAGE_SIZE, 0);
      setPosts(data.posts);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  // Run once on mount
  useEffect(() => {
    void load();
  }, [load]);

  const hasMore = total !== null && posts.length < total;

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchFeed(PAGE_SIZE, posts.length);
      setPosts((prev) => [...prev, ...data.posts]);
      setTotal(data.total);
    } catch {
      // Silently fail for load-more — user can retry with main retry
    } finally {
      setLoadingMore(false);
    }
  };

  const pageJsonLd = [
    webPage({
      name: 'FINOTAUR Blog — Market Analysis, AI Trade Ideas, Weekly Reports',
      description:
        'In-depth market analysis, AI-powered trade ideas, weekly reports, and trading education from the FINOTAUR team.',
      path: '/blog',
    }),
    breadcrumbList([
      ['Home', '/'],
      ['Blog', '/blog'],
    ]),
  ];

  return (
    <>
      <SEO
        title="Blog — Market Analysis, AI Trade Ideas, Weekly Reports"
        description="In-depth market analysis, AI-powered trade ideas, weekly reports, and trading education from the FINOTAUR team."
        path="/blog"
        jsonLd={pageJsonLd}
        titleAsIs
      />

      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <div className="text-[10px] uppercase tracking-[0.28em] text-[#C9A646]/85 mb-3">
              FINOTAUR · Research
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Market Intelligence
            </h1>
            <p className="text-lg text-white/55 max-w-2xl">
              Weekly reports, AI trade ideas, macro analysis, and educational
              content from the FINOTAUR editorial team.
            </p>
          </div>

          {/* Gold hairline */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent mb-12" />

          {/* Content states */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-white/55 text-base mb-6">{error}</p>
              <button
                onClick={() => void load()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded
                           border border-[#C9A646]/30 text-[#C9A646] text-sm
                           hover:bg-[#C9A646]/10 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-white/40 text-base">No posts published yet. Check back soon.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={() => void handleLoadMore()}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded
                               border border-white/[0.08] text-white/60 text-sm
                               hover:border-[#C9A646]/30 hover:text-[#C9A646]
                               disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all duration-200"
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Load more
                      </>
                    )}
                  </button>
                </div>
              )}

              {total !== null && (
                <p className="text-center text-xs text-white/25 mt-6">
                  Showing {posts.length} of {total} posts
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
