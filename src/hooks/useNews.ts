// src/hooks/useNews.ts

import { useState, useEffect, useCallback } from "react";
import { getJSON } from "@/lib/api";
import type { NewsItem, NewsFilters } from "@/types/news";

const API_BASE = import.meta.env.VITE_API_URL || "";

// Update this path based on how your routes are mounted
// If mounted as: app.use("/api/all-markets", newsRoutes) → use "/api/all-markets/news"
const NEWS_API_PATH = "/api/all-markets/news";

export type NewsCategory = "all" | "stocks" | "crypto" | "forex" | "commodities" | "global";

interface UseNewsOptions {
  category?: NewsCategory;
  symbol?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
}

interface UseNewsReturn {
  news: NewsItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

interface NewsByCategoryReturn {
  categories: Record<NewsCategory, NewsItem[]>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

// Transform API response to match existing NewsItem type
function transformNewsItem(item: any): NewsItem {
  return {
    id: item.id || `news-${Date.now()}-${Math.random()}`,
    headline: item.headline || item.title || "",
    summary: item.summary || item.description || "",
    tickers: item.tickers || [],
    source: item.source || "Unknown",
    url: item.url || "#",
    publishedAt: item.publishedAt || new Date().toISOString(),
    importance: item.importance || "low",
    categories: item.categories || ["other"],
    badges: item.badges || [],
  };
}

// Single category or all news
export function useNews(options: UseNewsOptions = {}): UseNewsReturn {
  const {
    category = "all",
    symbol,
    limit = 30,
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000, // 5 min
  } = options;

  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let url = `${API_BASE}${NEWS_API_PATH}?limit=${limit}`;
      
      if (symbol) {
        url += `&symbol=${symbol}`;
      } else if (category && category !== "all") {
        url += `&category=${category}`;
      }

      const response = await getJSON<{ news: any[]; status: string }>(url);
      
      if (response.status === "ERROR") {
        throw new Error("Failed to fetch news");
      }

      const transformed = (response.news || []).map(transformNewsItem);
      setNews(transformed);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch news";
      setError(message);
      console.error("News fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [category, symbol, limit]);

  // Initial fetch
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(fetchNews, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchNews]);

  return {
    news,
    isLoading,
    error,
    refetch: fetchNews,
    lastUpdated,
  };
}

// All categories at once (for tabbed view)
export function useNewsByCategory(options: { limit?: number } = {}): NewsByCategoryReturn {
  const { limit = 15 } = options;

  const [categories, setCategories] = useState<Record<NewsCategory, NewsItem[]>>({
    all: [],
    global: [],
    stocks: [],
    crypto: [],
    forex: [],
    commodities: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}${NEWS_API_PATH}/categories?limit=${limit}`;
      const response = await getJSON<{
        status: string;
        categories: Record<string, { news: any[] }>;
      }>(url);

      if (response.status === "ERROR") {
        throw new Error("Failed to fetch news categories");
      }

      const transformed: Record<NewsCategory, NewsItem[]> = {
        all: [],
        global: (response.categories.global?.news || []).map(transformNewsItem),
        stocks: (response.categories.stocks?.news || []).map(transformNewsItem),
        crypto: (response.categories.crypto?.news || []).map(transformNewsItem),
        forex: (response.categories.forex?.news || []).map(transformNewsItem),
        commodities: (response.categories.commodities?.news || []).map(transformNewsItem),
      };

      // Combine all for "all" category
      transformed.all = [
        ...transformed.global,
        ...transformed.stocks,
        ...transformed.crypto,
        ...transformed.forex,
        ...transformed.commodities,
      ]
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, limit * 2);

      setCategories(transformed);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch news";
      setError(message);
      console.error("News categories fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto refresh every 5 min
  useEffect(() => {
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return {
    categories,
    isLoading,
    error,
    refetch: fetchAll,
    lastUpdated,
  };
}

// Top/breaking news
export function useTopNews(limit = 10): UseNewsReturn {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTopNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}${NEWS_API_PATH}/top?limit=${limit}`;
      const response = await getJSON<{ news: any[]; status: string }>(url);

      if (response.status === "ERROR") {
        throw new Error("Failed to fetch top news");
      }

      setNews((response.news || []).map(transformNewsItem));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch top news");
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTopNews();
    const interval = setInterval(fetchTopNews, 3 * 60 * 1000); // 3 min for top news
    return () => clearInterval(interval);
  }, [fetchTopNews]);

  return {
    news,
    isLoading,
    error,
    refetch: fetchTopNews,
    lastUpdated,
  };
}