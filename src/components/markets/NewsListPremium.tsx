// src/components/markets/NewsListPremium.tsx
// Magazine-Style Premium News Layout
// Inspired by Yahoo Finance, Bloomberg, and WSJ

import React, { useState } from "react";
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
  ChevronRight,
} from "lucide-react";

// ============ CATEGORY CONFIG ============
const CATEGORIES = [
  { id: "global", label: "Macro", icon: Globe, color: "blue" },
  { id: "stocks", label: "Stocks", icon: TrendingUp, color: "green" },
  { id: "crypto", label: "Crypto", icon: Bitcoin, color: "orange" },
  { id: "forex", label: "Forex", icon: DollarSign, color: "purple" },
  { id: "commodities", label: "Commodities", icon: Gem, color: "yellow" },
] as const;

type CategoryColor = "blue" | "green" | "orange" | "purple" | "yellow";

const COLOR_CLASSES: Record<CategoryColor, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  green: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
};

// ============ FALLBACK IMAGES ============
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  global: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
  stocks: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop",
  crypto: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&h=600&fit=crop",
  forex: "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=800&h=600&fit=crop",
  commodities: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&h=600&fit=crop",
};

// ============ TIME HELPERS ============
function getTimeLabel(dateString: string): { label: string; isFresh: boolean; isBreaking: boolean } {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 30) return { label: "Just now", isFresh: true, isBreaking: true };
  if (diffMins < 60) return { label: `${diffMins}m ago`, isFresh: true, isBreaking: false };
  if (diffHours < 3) return { label: `${diffHours}h ago`, isFresh: true, isBreaking: false };
  if (diffHours < 24) return { label: `${diffHours}h ago`, isFresh: false, isBreaking: false };
  if (diffDays === 1) return { label: "Yesterday", isFresh: false, isBreaking: false };
  if (diffDays < 7) return { label: `${diffDays}d ago`, isFresh: false, isBreaking: false };
  return { label: "This week", isFresh: false, isBreaking: false };
}

// ============ IMAGE WITH FALLBACK ============
interface NewsImageProps {
  src?: string;
  alt: string;
  category?: string;
  className?: string;
}

function NewsImage({ src, alt, category = "global", className }: NewsImageProps) {
  const [imgError, setImgError] = useState(false);
  const fallback = CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.global;
  
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <img
        src={imgError ? fallback : (src || fallback)}
        alt={alt}
        onError={() => setImgError(true)}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      {/* Premium gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
    </div>
  );
}

// ============ HERO CARD - Featured Story ============
interface HeroCardProps {
  news: NewsItem;
  category?: string;
  color?: CategoryColor;
}

function HeroCard({ news, category = "global", color = "yellow" }: HeroCardProps) {
  const time = getTimeLabel(news.publishedAt);
  const ticker = news.tickers?.[0];
  const colors = COLOR_CLASSES[color];

  return (
    <a
      href={news.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block relative"
    >
      <article className="relative h-[400px] rounded-2xl overflow-hidden">
        {/* Background Image */}
        <NewsImage
          src={news.imageUrl}
          alt={news.headline}
          category={category}
          className="absolute inset-0"
        />
        
        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          {/* Tags */}
          <div className="flex items-center gap-2 mb-3">
            {time.isBreaking && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold uppercase tracking-wide animate-pulse">
                <Zap className="w-3 h-3" />
                Breaking
              </span>
            )}
            {time.isFresh && !time.isBreaking && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold">
                <Clock className="w-3 h-3" />
                {time.label}
              </span>
            )}
            {ticker && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-yellow-500 text-black text-xs font-bold">
                ${ticker}
              </span>
            )}
          </div>

          {/* Headline */}
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-3 group-hover:text-yellow-300 transition-colors line-clamp-3">
            {news.headline}
          </h2>

          {/* Summary */}
          {news.summary && (
            <p className="text-white/80 text-sm md:text-base line-clamp-2 mb-4 max-w-2xl">
              {news.summary}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {news.sourceLogo && (
                <img 
                  src={news.sourceLogo} 
                  alt={news.source}
                  className="w-5 h-5 rounded"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <span className="text-white/90 text-sm font-medium">
                {news.source}
              </span>
              {!time.isFresh && (
                <>
                  <span className="text-white/40">•</span>
                  <span className="text-white/60 text-sm">{time.label}</span>
                </>
              )}
            </div>
            <span className="flex items-center gap-1 text-white/60 text-sm group-hover:text-yellow-300 transition-colors">
              Read more
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Hover border effect */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-yellow-500/50 rounded-2xl transition-colors pointer-events-none" />
      </article>
    </a>
  );
}

// ============ STANDARD CARD ============
interface NewsCardProps {
  news: NewsItem;
  category?: string;
  showImage?: boolean;
}

function NewsCard({ news, category = "global", showImage = true }: NewsCardProps) {
  const time = getTimeLabel(news.publishedAt);
  const ticker = news.tickers?.[0];

  return (
    <a
      href={news.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <article className="flex gap-4 py-4 border-b border-border/30 last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors">
        {/* Thumbnail */}
        {showImage && (
          <div className="relative w-24 h-16 sm:w-32 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
            <NewsImage
              src={news.imageUrl}
              alt={news.headline}
              category={category}
              className="w-full h-full"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Headline */}
          <h4 className="font-semibold text-foreground group-hover:text-yellow-400 transition-colors text-sm sm:text-base leading-snug line-clamp-2 mb-1.5">
            {news.headline}
          </h4>

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{news.source}</span>
            <span className="text-muted-foreground/40">•</span>
            <span className={time.isFresh ? "text-emerald-400 font-medium" : ""}>
              {time.label}
            </span>
            {ticker && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="font-bold text-yellow-500">${ticker}</span>
              </>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ExternalLink className="w-4 h-4 text-muted-foreground/20 self-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </article>
    </a>
  );
}

// ============ CATEGORY SECTION ============
interface CategorySectionProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: CategoryColor;
  news: NewsItem[];
  isLoading: boolean;
  showHero?: boolean;
}

function CategorySection({ 
  id, 
  label, 
  icon: Icon, 
  color,
  news, 
  isLoading,
  showHero = false 
}: CategorySectionProps) {
  const displayNews = news.slice(0, showHero ? 5 : 4);
  const colors = COLOR_CLASSES[color];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-muted rounded animate-pulse" />
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        </div>
        {showHero ? (
          <div className="h-[400px] bg-muted rounded-2xl animate-pulse" />
        ) : null}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 py-4 animate-pulse">
              <div className="w-32 h-20 bg-muted rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-32 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (displayNews.length === 0) return null;

  const heroNews = showHero ? displayNews[0] : null;
  const listNews = showHero ? displayNews.slice(1) : displayNews;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn("p-1.5 rounded-lg", colors.bg)}>
            <Icon className={cn("w-4 h-4", colors.text)} />
          </div>
          <h3 className="font-bold text-foreground text-lg">{label}</h3>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            colors.bg, colors.text
          )}>
            {displayNews.length}
          </span>
        </div>
      </div>

      {/* Hero Card */}
      {heroNews && (
        <HeroCard news={heroNews} category={id} color={color} />
      )}

      {/* List */}
      {listNews.length > 0 && (
        <div>
          {listNews.map((item) => (
            <NewsCard 
              key={item.id} 
              news={item} 
              category={id}
              showImage={!showHero}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MAIN COMPONENT ============
export function NewsListPremium() {
  const { categories, isLoading, error, refetch, lastUpdated } =
    useNewsByCategory({ limit: 6 });

  // Get all news for featured section
  const allNews = Object.values(categories).flatMap(cat => cat);
  const topStory = allNews.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.importance] || 2) - (order[b.importance] || 2);
  })[0];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/30">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-foreground">Market Intelligence</h2>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-400">Live</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden md:block">
              Last update: {lastUpdated.toLocaleTimeString("en-US", { 
                hour: "2-digit", 
                minute: "2-digit" 
              })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg",
              "text-sm font-medium",
              "text-muted-foreground hover:text-foreground",
              "bg-muted/50 hover:bg-muted",
              "border border-border/50",
              "transition-all duration-200",
              "disabled:opacity-50"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Unable to load market news</p>
            <p className="text-xs text-destructive/70 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Story Hero */}
      {topStory && !isLoading && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Top Story
          </h3>
          <HeroCard news={topStory} category={topStory.categories[0]} color="yellow" />
        </section>
      )}

      {/* Category Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-12">
        {CATEGORIES.map((category, index) => (
          <CategorySection
            key={category.id}
            id={category.id}
            label={category.label}
            icon={category.icon}
            color={category.color}
            news={categories[category.id] || []}
            isLoading={isLoading}
            showHero={false}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-2 pt-8 border-t border-border/30">
        <p className="text-xs text-muted-foreground/60">
          Data powered by Finnhub & Polygon • Updated in real-time
        </p>
        <p className="text-xs text-muted-foreground/40">
          © {new Date().getFullYear()} Finotaur • Institutional-grade market intelligence
        </p>
      </div>
    </div>
  );
}

export default NewsListPremium;