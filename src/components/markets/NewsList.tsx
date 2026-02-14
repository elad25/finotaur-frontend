// src/components/markets/NewsList.tsx
// Yahoo Finance Style - Premium News Experience
// Beautiful cards with images, clean typography, professional feel

import React, { useState, useMemo } from "react";
import { useNewsByCategory } from "@/hooks/useNews";
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
} from "lucide-react";

// ============ CATEGORY CONFIG ============
const CATEGORIES = [
  { id: "global", label: "Macro", icon: Globe },
  { id: "stocks", label: "Stocks", icon: TrendingUp },
  { id: "crypto", label: "Crypto", icon: Bitcoin },
  { id: "forex", label: "Forex", icon: DollarSign },
  { id: "commodities", label: "Commodities", icon: Gem },
] as const;

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
  const hash = newsId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return images[hash % images.length];
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
        src={imgError ? fallback : (src || fallback)}
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

// ============ NEWS CARD COMPONENT (Yahoo Finance Style) ============
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
                <span className="text-xs text-muted-foreground">
                  {time.label}
                </span>
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
            {news.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {news.summary}
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
                    onError={(e) => (e.currentTarget.style.display = 'none')}
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

  // Standard card - Horizontal layout (Yahoo Finance style)
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
              <span className="text-xs text-muted-foreground">
                {news.source}
              </span>
              <span className="text-muted-foreground/30">•</span>
              {time.isFresh ? (
                <span className="text-xs text-emerald-400 font-medium">
                  {time.label}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {time.label}
                </span>
              )}
              {ticker && (
                <>
                  <span className="text-muted-foreground/30">•</span>
                  <span className="text-xs font-bold text-yellow-500">
                    ${ticker}
                  </span>
                </>
              )}
            </div>
          </div>
        </article>
      </a>
    );
  }

  // Compact variant - Just headline and source
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

// ============ CATEGORY SECTION ============
interface CategorySectionProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  news: NewsItem[];
  isLoading: boolean;
}

function CategorySection({ id, label, icon: Icon, news, isLoading }: CategorySectionProps) {
  // Maximum 4 items - quality over quantity
  const displayNews = news.slice(0, 4);
  const featuredNews = displayNews[0];
  const otherNews = displayNews.slice(1);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-muted rounded animate-pulse" />
          <div className="h-5 w-20 bg-muted rounded animate-pulse" />
        </div>
        
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
        {[1, 2].map((i) => (
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
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Category Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-border/30">
        <Icon className="w-5 h-5 text-yellow-500" />
        <h3 className="font-semibold text-foreground">
          {label}
        </h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {displayNews.length} stories
        </span>
      </div>

      {/* Featured News */}
      {featuredNews && (
        <NewsCard 
          news={featuredNews} 
          variant="featured" 
          category={id}
        />
      )}

      {/* Other News - Standard cards */}
      {otherNews.length > 0 && (
        <div className="space-y-1">
          {otherNews.map((item) => (
            <NewsCard 
              key={item.id} 
              news={item} 
              variant="standard"
              category={id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MAIN COMPONENT ============
export function NewsList() {
  const { categories, isLoading, error, refetch, lastUpdated } =
    useNewsByCategory({ limit: 6 }); // Fetch slightly more, display 4

  return (
    <div className="space-y-6">
      {/* Minimal Header - Just refresh controls, no title */}
      <div className="flex items-center justify-end gap-3">
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">
            Updated {lastUpdated.toLocaleTimeString("en-US", { 
              hour: "2-digit", 
              minute: "2-digit" 
            })}
          </span>
        )}
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className={cn(
            "p-2 rounded-lg",
            "text-muted-foreground hover:text-yellow-400",
            "hover:bg-yellow-500/10",
            "transition-all duration-200",
            "disabled:opacity-50"
          )}
          title="Refresh news"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Failed to load news</p>
            <p className="text-xs text-destructive/80">{error}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="ml-auto text-xs text-destructive hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10">
        {CATEGORIES.map((category) => (
          <CategorySection
            key={category.id}
            id={category.id}
            label={category.label}
            icon={category.icon}
            news={categories[category.id] || []}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center pt-6 border-t border-border/30">
        <p className="text-xs text-muted-foreground/50">
          Powered by Polygon • Real-time market intelligence
        </p>
      </div>
    </div>
  );
}

export default NewsList;