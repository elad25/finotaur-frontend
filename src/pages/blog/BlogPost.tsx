/**
 * /blog/:slug — Individual blog post page.
 * Fetches full post from GET /api/blog/post/:slug.
 */

import { useState, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, ArrowLeft, Lock } from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import { article, breadcrumbList } from '@/components/seo/jsonLd';
import { ShareButtons } from '@/components/share/ShareButtons';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

const SITE_URL = 'https://www.finotaur.com';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlogPostData {
  slug: string;
  title: string;
  excerpt: string;
  body: string; // HTML from backend
  type: string;
  publishedAt: string;
  isPremiumTeaser: boolean;
  imageUrl?: string;
  relatedPosts?: RelatedPost[];
}

interface RelatedPost {
  slug: string;
  title: string;
  excerpt: string;
  type: string;
  publishedAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchPost(slug: string): Promise<BlogPostData> {
  const res = await fetch(`/api/blog/post/${encodeURIComponent(slug)}`);
  if (res.status === 404) {
    throw new NotFoundError();
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch post: ${res.status}`);
  }
  return res.json() as Promise<BlogPostData>;
}

class NotFoundError extends Error {
  constructor() {
    super('Post not found');
    this.name = 'NotFoundError';
  }
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className="inline-block text-[10px] uppercase tracking-[0.20em] font-medium
                 px-2 py-0.5 rounded-sm
                 bg-[#C9A646]/10 text-[#C9A646] border border-[#C9A646]/20"
    >
      {typeBadgeLabel(type)}
    </span>
  );
}

function PaywallBlock() {
  return (
    <div
      className="mt-10 rounded-lg border border-[#C9A646]/25 bg-[#C9A646]/[0.04]
                 p-8 text-center"
    >
      <div className="flex justify-center mb-4">
        <div className="w-10 h-10 rounded-full bg-[#C9A646]/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-[#C9A646]" />
        </div>
      </div>
      <h3
        className="text-xl font-semibold text-white mb-2"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        Continue reading with Top Secret
      </h3>
      <p className="text-white/55 text-sm mb-6 max-w-sm mx-auto">
        Get full access to weekly deep-dives, AI trade ideas, and institutional-grade
        research. Upgrade your membership to read the complete analysis.
      </p>
      <Link
        to="/pricing"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded
                   bg-[#C9A646] text-black text-sm font-semibold
                   hover:bg-[#D4B25A] transition-colors"
      >
        Unlock with Top Secret
      </Link>
    </div>
  );
}

function RelatedPostCard({ post }: { post: RelatedPost }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col gap-2 rounded-lg border border-white/[0.06]
                 bg-white/[0.015] hover:border-[#C9A646]/35 hover:bg-[#C9A646]/[0.03]
                 transition-all duration-200 p-5"
    >
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] uppercase tracking-[0.18em]
                     text-[#C9A646]/70"
        >
          {typeBadgeLabel(post.type)}
        </span>
      </div>
      <h3
        className="text-base font-medium text-white group-hover:text-[#F4E4B8]
                   transition-colors line-clamp-2"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {post.title}
      </h3>
      <p className="text-xs text-white/45 line-clamp-2">{post.excerpt}</p>
      <span className="text-xs text-white/30 mt-auto">{formatDate(post.publishedAt)}</span>
    </Link>
  );
}

function NotFound404() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-5xl font-bold text-[#C9A646] mb-4">404</div>
        <h1 className="text-2xl font-semibold text-white mb-3">Post not found</h1>
        <p className="text-white/55 mb-8">
          This post may have been moved or doesn&apos;t exist.
        </p>
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded
                     border border-[#C9A646]/30 text-[#C9A646] text-sm
                     hover:bg-[#C9A646]/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await fetchPost(slug);
      setPost(data);
    } catch (err) {
      if (err instanceof NotFoundError) {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load post');
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // Run on mount / slug change
  useEffect(() => {
    void load();
  }, [load]);

  if (notFound) {
    return <NotFound404 />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 px-4">
        <div className="max-w-3xl mx-auto animate-pulse">
          <div className="h-3 w-16 bg-white/10 rounded mb-6" />
          <div className="h-4 w-20 bg-white/10 rounded mb-5" />
          <div className="h-8 w-3/4 bg-white/10 rounded mb-3" />
          <div className="h-8 w-1/2 bg-white/10 rounded mb-6" />
          <div className="h-3 w-32 bg-white/[0.07] rounded mb-12" />
          <div className="space-y-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`h-4 bg-white/[0.07] rounded ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-white/55 mb-6">{error}</p>
          <button
            onClick={() => void load()}
            className="px-5 py-2.5 rounded border border-[#C9A646]/30
                       text-[#C9A646] text-sm hover:bg-[#C9A646]/10 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!post) return null;

  const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;
  // OG image: use imageUrl if available, else fall back to edge-generated SVG
  const ogImage = post.imageUrl ?? `${SITE_URL}/og/blog/${post.slug}`;

  const articleJsonLd = article({
    headline: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    datePublished: post.publishedAt,
  });

  const breadcrumbs = breadcrumbList([
    ['Home', '/'],
    ['Blog', '/blog'],
    [post.title, `/blog/${post.slug}`],
  ]);

  return (
    <>
      <SEO
        title={`${post.title} — FINOTAUR`}
        description={post.excerpt}
        path={`/blog/${post.slug}`}
        ogImage={ogImage}
        jsonLd={[articleJsonLd, breadcrumbs]}
        titleAsIs
      />

      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs text-white/40
                       hover:text-[#C9A646] transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Blog
          </Link>

          {/* Header */}
          <header className="mb-8">
            <TypeBadge type={post.type} />

            <h1
              className="text-3xl md:text-4xl font-bold text-white mt-4 mb-4 leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-white/40 mb-6">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(post.publishedAt)}
              </span>
              <span>FINOTAUR Editorial</span>
            </div>

            {/* Share buttons directly under the header */}
            <ShareButtons
              url={canonicalUrl}
              title={post.title}
              description={post.excerpt}
              className="mb-6"
            />

            {/* Gold hairline */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#C9A646]/35 to-transparent" />
          </header>

          {/* Body */}
          <article
            className="prose prose-invert prose-sm md:prose-base max-w-none
                       prose-headings:font-serif prose-headings:text-white
                       prose-p:text-white/75 prose-p:leading-relaxed
                       prose-a:text-[#C9A646] prose-a:no-underline hover:prose-a:underline
                       prose-strong:text-white prose-code:text-[#C9A646]
                       prose-blockquote:border-l-[#C9A646] prose-blockquote:text-white/60"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.body) }}
          />

          {/* Paywall block for premium teasers */}
          {post.isPremiumTeaser && <PaywallBlock />}

          {/* Disclaimer */}
          <div className="mt-12 pt-8 border-t border-white/[0.06]">
            <p className="text-xs text-white/30 leading-relaxed">
              <strong className="text-white/50">Disclaimer:</strong> This content is for
              educational and informational purposes only. It does not constitute financial,
              investment, or trading advice. Past performance is not indicative of future
              results. Always conduct your own research before making any investment decisions.
            </p>
          </div>

          {/* Related posts */}
          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <section className="mt-14">
              <div className="text-[10px] uppercase tracking-[0.28em] text-[#C9A646]/85 mb-6">
                Related Articles
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {post.relatedPosts.map((rp) => (
                  <RelatedPostCard key={rp.slug} post={rp} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
