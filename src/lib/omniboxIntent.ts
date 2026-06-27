// src/lib/omniboxIntent.ts
// =====================================================
// OMNIBOX INTENT CLASSIFIER
// Classifies raw user input into one of three intents:
//   ticker   — short alphabetic string (1-5 chars)
//   question — ends with ?, starts with question word, or is long
//   topic    — anything else (navigate to a feature)
// =====================================================

export type OmniboxIntent = 'ticker' | 'question' | 'topic';

const QUESTION_STARTERS = [
  'who', 'what', 'why', 'how', 'when', 'should', 'is', 'are', 'can',
  'will', 'would', 'does', 'do', 'has', 'have', 'could', 'which', 'where',
];

/** Classify the intent of an omnibox input string. */
export function classifyIntent(input: string): OmniboxIntent {
  const trimmed = input.trim();
  if (!trimmed) return 'topic';

  // Ticker: 1-5 alpha chars only
  if (/^[A-Za-z]{1,5}$/.test(trimmed)) return 'ticker';

  // Question: ends with ?, or starts with a question word, or >5 words
  if (trimmed.endsWith('?')) return 'question';
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
  if (QUESTION_STARTERS.includes(firstWord)) return 'question';
  if (trimmed.split(/\s+/).length > 5) return 'question';

  return 'topic';
}

// ---------------------------------------------------------------------------
// Static route catalogue for topic matching
// ---------------------------------------------------------------------------

export interface RouteTarget {
  label: string;
  path: string;
  group: string;
  keywords: string[];
}

export const ROUTE_CATALOGUE: RouteTarget[] = [
  // Markets
  { label: 'Stocks Overview',    path: '/app/stocks/overview',        group: 'Markets',      keywords: ['stocks', 'overview', 'equities'] },
  { label: 'Stocks Screener',    path: '/app/stocks/screener',        group: 'Markets',      keywords: ['screener', 'filter', 'scan', 'stocks'] },
  { label: 'Stocks News',        path: '/app/stocks/news',            group: 'Markets',      keywords: ['news', 'headlines', 'stocks'] },
  { label: 'Macro Overview',     path: '/app/macro/overview',         group: 'Markets',      keywords: ['macro', 'rates', 'liquidity', 'bonds'] },
  { label: 'Crypto Overview',    path: '/app/crypto/overview',        group: 'Markets',      keywords: ['crypto', 'bitcoin', 'eth', 'defi'] },
  // AI Arena
  { label: 'Stock Analyzer',     path: '/app/ai/stock-analyzer',      group: 'AI Arena',     keywords: ['stock', 'analyze', 'ai', 'analysis', 'analyzer'] },
  { label: 'Sector Analyzer',    path: '/app/ai/sector-analyzer',     group: 'AI Arena',     keywords: ['sector', 'industries', 'ai', 'analyze'] },
  { label: 'Macro Analyzer',     path: '/app/ai/macro-analyzer',      group: 'AI Arena',     keywords: ['macro', 'ai', 'analyze', 'economy'] },
  { label: 'Intelligence Desk',  path: '/app/ai/top-5',               group: 'AI Arena',     keywords: ['top 5', 'intelligence', 'picks', 'ideas', 'recommendations'] },
  { label: 'Upcoming Events',    path: '/app/ai/upcoming-events',     group: 'AI Arena',     keywords: ['events', 'earnings', 'upcoming', 'calendar', 'ai'] },
  // Journal
  { label: 'Journal Dashboard',  path: '/app/journal/overview',       group: 'Journal',      keywords: ['journal', 'dashboard', 'overview', 'trading'] },
  { label: 'My Trades',          path: '/app/journal/my-trades',      group: 'Journal',      keywords: ['trades', 'my trades', 'journal', 'history'] },
  { label: 'Add Trade',          path: '/app/journal/new',            group: 'Journal',      keywords: ['add trade', 'new trade', 'log', 'entry'] },
  { label: 'My Strategies',      path: '/app/journal/strategies',     group: 'Journal',      keywords: ['strategies', 'playbook', 'setup', 'plan'] },
  { label: 'Reports & Stats',    path: '/app/journal/reports',        group: 'Journal',      keywords: ['reports', 'stats', 'performance', 'analytics', 'pnl'] },
  { label: 'Backtest',           path: '/app/journal/backtest/overview', group: 'Journal',  keywords: ['backtest', 'test', 'simulate'] },
  // War Zone
  { label: 'War Zone',           path: '/app/all-markets/warzone',    group: 'War Zone',     keywords: ['war zone', 'warzone', 'alerts', 'breaking', 'urgent'] },
  // Top Secret
  { label: 'Top Secret Reports', path: '/app/top-secret',             group: 'Top Secret',   keywords: ['top secret', 'reports', 'confidential', 'exclusive'] },
  // Settings / Account
  { label: 'Settings',           path: '/app/settings',               group: 'Account',      keywords: ['settings', 'account', 'profile', 'billing', 'plan'] },
  { label: 'Pricing & Plans',    path: '/app/upgrade',                group: 'Account',      keywords: ['pricing', 'upgrade', 'plans', 'subscription', 'pro'] },
];

/** Return routes whose keywords contain the query string (case-insensitive). */
export function matchRoutes(input: string): RouteTarget[] {
  const q = input.toLowerCase().trim();
  if (!q) return [];
  return ROUTE_CATALOGUE.filter(
    (r) =>
      r.label.toLowerCase().includes(q) ||
      r.keywords.some((k) => k.includes(q) || q.includes(k)),
  );
}
