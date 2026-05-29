export type InsightCategory = 'symbol' | 'day_time' | 'setup' | 'risk' | 'tag' | 'behavioral';

export interface ScoreBreakdown {
  win_rate: number;       // 0-100
  profit_factor: number;
  avg_wl: number;
  max_dd: number;
  consistency: number;
  recovery: number;
}

export interface FinotaurScore {
  schema_version: 'v1';
  score: number | null;       // null = insufficient data
  prev_score: number | null;
  delta: number | null;
  breakdown: ScoreBreakdown | null;
  window_days?: number;
  total_trades?: number;
  generated_at?: string;       // ISO
}

export interface Insight {
  id: string;
  category: InsightCategory;
  severity: 'positive' | 'neutral' | 'critical';
  title: string;
  body: string;
  metric?: string;
  related_trade_ids?: string[];
  featured?: boolean;
  eyebrow?: string;
}

/** Inner briefing content returned inside BriefingResponse.briefing */
export interface Briefing {
  insights: Insight[];
  recommendations: string[];
}

/** Outer envelope returned by GET /api/journal-ai/briefing */
export interface BriefingResponse {
  schema_version: 'v1';
  briefing: Briefing | null;
  stale: boolean;
  refreshing: boolean;
  generated_at: string | null;
  model: string | null;
}
