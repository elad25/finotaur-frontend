export type NewsItem = {
  id: string;
  headline: string;
  summary?: string;
  tickers: string[];
  source: string;
  url: string;
  publishedAt: string;
  importance: "high" | "medium" | "low";
  categories: ("earnings"|"macro"|"regulatory"|"mna"|"product"|"guidance"|"other")[];
  badges?: string[];
};

export type AnalystAction = {
  id: string;
  ticker: string;
  firm: string;
  action: "upgrade"|"downgrade"|"reiterate"|"initiate";
  from?: "sell"|"hold"|"buy"|"overweight"|"underweight"|"neutral";
  to?: "sell"|"hold"|"buy"|"overweight"|"underweight"|"neutral";
  oldTarget?: number;
  newTarget?: number;
  note?: string;
  publishedAt: string;
  url?: string;
};

export type Catalyst = {
  id: string;
  ticker?: string;
  title: string;
  date: string;
  window?: "today"|"this_week"|"this_month"|"upcoming";
  category: "earnings"|"product"|"mna"|"regulatory"|"guidance"|"macro"|"other";
  probability?: "low"|"medium"|"high";
  expectedImpact?: "low"|"medium"|"high";
  source?: string;
  url?: string;
  note?: string;
};

export type NewsFilters = {
  search: string;
  tickers: string[];
  sources: string[];
  timeWindow: "today" | "24h" | "7d";
  importance: "high" | "medium" | "all";
  market: "us" | "global";
  categories: string[];
  sort: "newest" | "important" | "referenced";
};
