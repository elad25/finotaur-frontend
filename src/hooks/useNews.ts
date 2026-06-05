// src/hooks/useNews.ts

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  const queryClient = useQueryClient();

  const queryKey = ["news", category, symbol ?? null, limit];

  const { data, isLoading, error, dataUpdatedAt } = useQuery<{ news: NewsItem[]; updatedAt: Date }>({
    queryKey,
    queryFn: async () => {
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
      return {
        news: (response.news || []).map(transformNewsItem),
        updatedAt: new Date(),
      };
    },
    staleTime: refreshInterval - 1000,
    refetchInterval: autoRefresh && refreshInterval > 0 ? refreshInterval : false,
    refetchIntervalInBackground: false,
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey.join(",")]);

  return {
    news: data?.news ?? [],
    isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to fetch news") : null,
    refetch,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
  };
}

// All categories at once (for tabbed view)
export function useNewsByCategory(options: { limit?: number } = {}): NewsByCategoryReturn {
  const { limit = 15 } = options;

  const queryClient = useQueryClient();
  const queryKey = ["news-by-category", limit];

  const emptyCategories: Record<NewsCategory, NewsItem[]> = {
    all: [],
    global: [],
    stocks: [],
    crypto: [],
    forex: [],
    commodities: [],
  };

  const { data, isLoading, error, dataUpdatedAt } = useQuery<{ categories: Record<NewsCategory, NewsItem[]>; updatedAt: Date }>({
    queryKey,
    queryFn: async () => {
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

      return { categories: transformed, updatedAt: new Date() };
    },
    staleTime: 5 * 60 * 1000 - 1000,
    refetchInterval: 5 * 60 * 1000, // Auto refresh every 5 min
    refetchIntervalInBackground: false,
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey.join(",")]);

  return {
    categories: data?.categories ?? emptyCategories,
    isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to fetch news") : null,
    refetch,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
  };
}

// Top/breaking news
export function useTopNews(limit = 10): UseNewsReturn {
  const queryClient = useQueryClient();
  const queryKey = ["news-top", limit];

  const { data, isLoading, error, dataUpdatedAt } = useQuery<{ news: NewsItem[]; updatedAt: Date }>({
    queryKey,
    queryFn: async () => {
      const url = `${API_BASE}${NEWS_API_PATH}/top?limit=${limit}`;
      const response = await getJSON<{ news: any[]; status: string }>(url);
      if (response.status === "ERROR") {
        throw new Error("Failed to fetch top news");
      }
      return {
        news: (response.news || []).map(transformNewsItem),
        updatedAt: new Date(),
      };
    },
    staleTime: 3 * 60 * 1000 - 1000,
    refetchInterval: 3 * 60 * 1000, // 3 min for top news
    refetchIntervalInBackground: false,
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey.join(",")]);

  return {
    news: data?.news ?? [],
    isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to fetch top news") : null,
    refetch,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
  };
}
