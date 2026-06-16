// src/components/markets/NewsList.tsx
// Tabbed, breaking-news-first layout — asset-class tabs + live breaking band

import React, { useState, useMemo } from "react";
import { useNewsByCategory, useTopNews } from "@/hooks/useNews";
import type { NewsItem } from "@/types/news";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  AlertCircle,
  Clock,
  Zap,
  ExternalLink,
  TrendingUp,
  Globe,
  Bitcoin,
  DollarSign,
  Gem,
  Newspaper,
} from "lucide-react";

// ============ TAB CONFIG ============
type TabId = "all" | "stocks" | "crypto" | "forex" | "commodities" | "global";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "all",         label: "All News",    icon: Newspaper  },
  { id: "stocks",      label: "Stocks",      icon: TrendingUp },
  { id: "crypto",      label: "Crypto",      icon: Bitcoin    },
  { id: "forex",       label: "Forex",       icon: DollarSign },
  { id: "commodities", label: "Commodities", icon: Gem        },
  { id: "global",      label: "Macro",       icon: Globe      },
];

// ============ FALLBACK IMAGES - Multiple per category for variety ============
const CATEGORY_FALLBACK_IMAGES: Record<string, string[]> = {
  global: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1462899006636-339e08d1844e?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=400&h=300&fit=crop",
  ],
  stocks: [
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1560221328-12fe60f83ab8?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=400&h=300&fit=crop",
  ],
  crypto: [
    "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1516245834210-c4c142787335?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1617396900799-f4ec2b43c7ae?w=400&h=300&fit=crop",
  ],
  forex: [
    "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1565514020179-026b92b2d5b6?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=400&h=300&fit=crop",
  ],
  commodities: [
    "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1589787168422-0c0021d20df3?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1513828583688-c52646db42da?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1504973960431-1c467e159aa4?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1624365168968-f283d506c6b6?w=400&h=300&fit=crop",
  ],
};

// Get a consistent but varied image based on news ID
function getFallbackImage(category: string, newsId: string): string {
  const images = CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.global;
  // Use hash of ID to get consistent image for same article
  const hash = newsId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return images[hash % images.length];
}

// ============ TEXT HELPERS ============
// Some news providers return HTML markup in the summary/description field
// (e.g. Forexlive sends "<ul><li>CPI +3.2% ...</li></ul>"). Strip tags and
// decode the common entities so the card shows clean plain text.
function stripHtml(raw: string): string {
  if (!raw) return "";
  const noTags = raw.replace(/<[^>]*>/g, " ");
  const decoded = noTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
  return decoded.replace(/\s+/g, " ").trim();
}

// ============ TIME HELPERS ============
function getTimeLabel(dateString: string): { label: string; isFresh: boolean; isBreaking: boolean } {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 30) {
    return { label: "Just now", isFresh: true, isBreaking: true };
  }
  if (diffMins < 60) {
    return { label: `${diffMins}m ago`, isFresh: true, isBreaking: false };
  }
  if (diffHours < 3) {
    return { label: `${diffHours}h ago`, isFresh: true, isBreaking: false };
  }
  if (diffHours < 24) {
    return { label: `${diffHours}h ago`, isFresh: false, isBreaking: false };
  }
  if (diffDays === 1) {
    return { label: "Yesterday", isFresh: false, isBreaking: false };
  }
  if (diffDays < 7) {
    return { label: `${diffDays}d ago`, isFresh: false, isBreaking: false };
  }
  return { label: "This week", isFresh: false, isBreaking: false };
}

// ============ IMAGE COMPONENT WITH FALLBACK ============
interface NewsImageProps {
  src?: string;
  alt: string;
  category?: string;
  newsId: string;
  className?: string;
}

function NewsImage({ src, alt, category = "global", newsId, className }: NewsImageProps) {
  const [imgError, setImgError] = useState(false);
  const fallback = useMemo(() => getFallbackImage(category, newsId), [category, newsId]);

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <img
        src={imgError ? fallback : src || fallback}
        alt={alt}
        onError={() => setImgError(true)}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// ============ NEWS CARD COMPONENT ============
interface NewsCardProps {
  news: NewsItem;
  variant?: "featured" | "standard" | "compact";
  category?: string;
}

function NewsCard({ news, variant = "standard", category = "global" }: NewsCardProps) {
  const time = getTimeLabel(news.publishedAt);
  const ticker = news.tickers?.[0];

  // Featured card - Large image on top
  if (variant === "featured") {
    return (
      <a
        href={news.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <article className="bg-card rounded-xl overflow-hidden border border-border/50 hover:border-yellow-500/30 hover:shadow-lg hover:shadow-yellow-500/5 transition-all duration-300">
          {/* Large Image */}
          <NewsImage
            src={news.imageUrl}
            alt={news.headline}
            category={category}
            newsId={news.id}
            className="aspect-[16/9] w-full"
          />

          {/* Content */}
          <div className="p-4">
            {/* Meta row */}
            <div className="flex items-center gap-2 mb-2">
              {time.isBreaking ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold animate-pulse">
                  <Zap className="w-3 h-3" />
                  Breaking
                </span>
              ) : time.isFresh ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium">
                  <Clock className="w-3 h-3" />
                  {time.label}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{time.label}</span>
              )}

              {ticker && (
                <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                  ${ticker}
                </span>
              )}
            </div>

            {/* Headline */}
            <h3 className="font-semibold text-foreground group-hover:text-yellow-400 transition-colors leading-snug text-base mb-2 line-clamp-2">
              {news.headline}
            </h3>

            {/* Summary */}
            {stripHtml(news.summary) && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {stripHtml(news.summary)}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div className="flex items-center gap-2">
                {news.sourceLogo && (
                  <img
                    src={news.sourceLogo}
                    alt={news.source}
                    className="w-4 h-4 rounded-sm"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
                <span className="text-xs font-medium text-muted-foreground">
                  {news.source}
                </span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </article>
      </a>
    );
  }

  // Standard card - Horizontal layout
  if (variant === "standard") {
    return (
      <a
        href={news.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <article className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
          {/* Thumbnail */}
          <NewsImage
            src={news.imageUrl}
            alt={news.headline}
            category={category}
            newsId={news.id}
            className="w-28 h-20 sm:w-36 sm:h-24 rounded-lg flex-shrink-0"
          />

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            {/* Headline */}
            <h4 className="font-medium text-foreground group-hover:text-yellow-400 transition-colors leading-snug text-sm sm:text-base line-clamp-2 mb-1">
              {news.headline}
            </h4>

            {/* Meta */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{news.source}</span>
              <span className="text-muted-foreground/30">•</span>
              {time.isBreaking ? (
                <span className="inline-flex items-center gap-1 text-xs text-red-400 font-semibold animate-pulse">
                  <Zap className="w-2.5 h-2.5" />
                  Breaking
                </span>
              ) : time.isFresh ? (
                <span className="text-xs text-emerald-400 font-medium">{time.label}</span>
              ) : (
                <span className="text-xs text-muted-foreground">{time.label}</span>
              )}
              {ticker && (
                <>
                  <span className="text-muted-foreground/30">•</span>
                  <span className="text-xs font-bold text-yellow-500">${ticker}</span>
                </>
              )}
            </div>
          </div>
        </article>
      </a>
    );
  }

  // Compact variant — just headline and source (used in breaking band)
  return (
    <a
      href={news.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block py-3 border-b border-border/30 last:border-0"
    >
      <h4 className="font-medium text-foreground group-hover:text-yellow-400 transition-colors text-sm leading-snug line-clamp-2 mb-1">
        {news.headline}
      </h4>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{news.source}</span>
        <span className="text-muted-foreground/30">•</span>
        <span className={time.isFresh ? "text-emerald-400" : ""}>{time.label}</span>
      </div>
    </a>
  );
}

// ============ BREAKING NEWS BAND ============
interface BreakingNewsBandProps {
  news: NewsItem[];
  isLoading: boolean;
}

function BreakingNewsBand({ news, isLoading }: BreakingNewsBandProps) {
  // Dedupe by id, then sort by publishedAt DESC (newest first)
  const sorted = useMemo(() => {
    const seen = new Set<string>();
    const unique = news.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return unique.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }, [news]);

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="bg-white/[0.03] border border-red-500/20 rounded-xl p-4 space-y-3">
        {/* Header skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
        {/* Card row skeleton */}
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-64 h-24 bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Hide entirely when empty
  if (sorted.length === 0) return null;

  return (
    <div className="bg-white/[0.03] border border-red-500/20 rounded-xl p-4">
      {/* Band header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold animate-pulse">
          <Zap className="w-3 h-3" />
          BREAKING
        </span>
        <span className="text-sm font-semibold text-foreground">Breaking News</span>
      </div>

      {/* Horizontally scrollable compact cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {sorted.map((item) => {
          const time = getTimeLabel(item.publishedAt);
          const ticker = item.tickers?.[0];
          return (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-shrink-0 w-64 bg-card border border-border/50 hover:border-red-500/30 rounded-lg p-3 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:shadow-red-500/5"
            >
              <p className="text-xs font-medium text-foreground group-hover:text-yellow-400 transition-colors leading-snug line-clamp-3 mb-2">
                {item.headline}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">{item.source}</span>
                <span className="text-muted-foreground/30 text-xs">•</span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    time.isBreaking ? "text-red-400" : time.isFresh ? "text-emerald-400" : "text-muted-foreground"
                  )}
                >
                  {time.label}
                </span>
                {ticker && (
                  <span className="text-xs font-bold text-yellow-500 ml-auto">
                    ${ticker}
                  </span>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ============ TAB CONTENT ============
interface TabContentProps {
  tabId: TabId;
  news: NewsItem[];
  isLoading: boolean;
}

function TabContent({ tabId, news, isLoading }: TabContentProps) {
  // Dedupe by id (the "all" tab concatenates categories, so the same article
  // can appear under more than one category → duplicate React keys), then
  // sort by recency DESC.
  const sorted = useMemo(() => {
    const seen = new Set<string>();
    const unique = news.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return unique.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }, [news]);

  // Cap at 24 items
  const displayNews = sorted.slice(0, 24);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Featured skeleton */}
        <div className="bg-card rounded-xl overflow-hidden border border-border/50 animate-pulse">
          <div className="aspect-[16/9] w-full bg-muted" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-16 bg-muted rounded" />
            <div className="h-5 w-full bg-muted rounded" />
            <div className="h-5 w-3/4 bg-muted rounded" />
          </div>
        </div>
        {/* List skeletons */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 p-3 animate-pulse">
            <div className="w-28 h-20 bg-muted rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-2/3 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayNews.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">No recent news in this category.</p>
      </div>
    );
  }

  const featuredItem = displayNews[0];
  const restItems = displayNews.slice(1);

  // For the "all" tab, infer the category from the item's first category field for fallback images;
  // for specific tabs, use the tabId directly.
  function resolveCategory(item: NewsItem): string {
    if (tabId !== "all") return tabId;
    // Map the item's categories array to our CATEGORY_FALLBACK_IMAGES keys
    const categoryMap: Record<string, string> = {
      earnings: "stocks",
      macro: "global",
      regulatory: "global",
      mna: "stocks",
      product: "stocks",
      guidance: "stocks",
      other: "global",
    };
    const firstCat = item.categories?.[0];
    return (firstCat && categoryMap[firstCat]) || "global";
  }

  return (
    <div className="space-y-4">
      {/* "Latest" caption */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Latest
        </span>
        <span className="text-xs text-muted-foreground">
          {displayNews.length} stories
        </span>
      </div>

      {/* Featured item — big card */}
      <NewsCard
        news={featuredItem}
        variant="featured"
        category={resolveCategory(featuredItem)}
      />

      {/* Rest — standard horizontal cards */}
      {restItems.length > 0 && (
        <div className="space-y-1">
          {restItems.map((item) => (
            <NewsCard
              key={item.id}
              news={item}
              variant="standard"
              category={resolveCategory(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MAIN COMPONENT ============
export function NewsList() {
  const [activeTab, setActiveTab] = useState<TabId>("all");

  const {
    categories,
    isLoading: catLoading,
    error: catError,
    refetch,
    lastUpdated,
  } = useNewsByCategory({ limit: 20 });

  const {
    news: breakingNews,
    isLoading: breakingLoading,
  } = useTopNews(12);

  const activeItems = categories[activeTab] ?? [];

  return (
    <div className="space-y-6">
      {/* Top bar: refresh controls */}
      <div className="flex items-center justify-end gap-3">
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">
            Updated{" "}
            {lastUpdated.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        <button
          onClick={() => refetch()}
          disabled={catLoading}
          className={cn(
            "p-2 rounded-lg",
            "text-muted-foreground hover:text-yellow-400",
            "hover:bg-yellow-500/10",
            "transition-all duration-200",
            "disabled:opacity-50"
          )}
          title="Refresh news"
        >
          <RefreshCw className={cn("w-4 h-4", catLoading && "animate-spin")} />
        </button>
      </div>

      {/* Error banner */}
      {catError && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Failed to load news</p>
            <p className="text-xs text-destructive/80">{catError}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="ml-auto text-xs text-destructive hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Breaking News band — always visible, above tabs */}
      <BreakingNewsBand news={breakingNews} isLoading={breakingLoading} />

      {/* Tab bar — horizontally scrollable on mobile */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max border-b border-border/30 pb-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "text-yellow-400 bg-yellow-500/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive && "text-yellow-400")} />
                {tab.label}
                {/* Gold underline for active tab */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tab content */}
      <TabContent
        tabId={activeTab}
        news={activeItems}
        isLoading={catLoading}
      />

      {/* Footer */}
      <div className="flex items-center justify-center pt-6 border-t border-border/30">
        <p className="text-xs text-muted-foreground/50">
          Real-time market intelligence
        </p>
      </div>
    </div>
  );
}

export default NewsList;
