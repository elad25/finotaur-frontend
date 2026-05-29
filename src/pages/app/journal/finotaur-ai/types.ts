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

export interface Briefing {
  schema_version: 'v1';
  insights: Insight[];
  recommendations: string[];
  generated_at: string;
  model: string;
  stale: boolean;
  refreshing: boolean;
}
