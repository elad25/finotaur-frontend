/**
 * Type definitions for the seo-analytics edge function response.
 * Edge function slug: seo-analytics
 */

export interface AnalyticsSummary {
  totalViews7d: number;
  totalViews30d: number;
  uniqueVisitors7d: number;
  uniqueVisitors30d: number;
  avgTimeOnPageSeconds: number | null;
}

export interface TopTickerRow {
  ticker: string;
  path: string;
  views: number;
  uniqueVisitors: number;
}

export interface SourceBreakdownRow {
  source: string;
  label: string;
  views: number;
}

export interface ViewsPerDayRow {
  date: string;  // ISO date string e.g. "2026-05-01"
  views: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  topTickers: TopTickerRow[];
  sourceBreakdown: SourceBreakdownRow[];
  viewsPerDay: ViewsPerDayRow[];
}

export type AnalyticsStatus = 'live' | 'mock' | 'auth_error' | 'upstream_error';

export interface AnalyticsResponse {
  status: AnalyticsStatus;
  /** Present when status === 'mock' */
  configRequired?: string[];
  /** Present when status === 'mock' or an error status */
  message?: string;
  generatedAt?: string;
  /** Cache TTL in seconds */
  cachedFor?: number;
  data: AnalyticsData;
}
