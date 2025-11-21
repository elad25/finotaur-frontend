// ===================================
// 🌍 TRADING SESSIONS - Single Source of Truth
// ===================================

export type TradingSession = 'asia' | 'london' | 'newyork';

export const TRADING_SESSIONS = {
  ASIA: 'asia',
  LONDON: 'london',
  NEWYORK: 'newyork'
} as const;

export const SESSION_DISPLAY_NAMES: Record<TradingSession, string> = {
  asia: 'Asia',
  london: 'London',
  newyork: 'New York'
};

export const SESSION_COLORS: Record<TradingSession, string> = {
  asia: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  london: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  newyork: 'text-green-400 bg-green-400/10 border-green-400/30'
};

export const SESSION_TIMEZONES: Record<TradingSession, string> = {
  asia: 'Asia/Tokyo',
  london: 'Europe/London',
  newyork: 'America/New_York'
};

// 🕐 Trading hours in NY timezone (EST/EDT)
export const SESSION_HOURS = {
  asia: { start: 18, end: 1 },      // 6:00 PM - 1:00 AM (7 hours)
  london: { start: 1, end: 7 },     // 1:00 AM - 7:00 AM (6 hours)
  newyork: { start: 7, end: 17 }    // 7:00 AM - 5:00 PM (10 hours)
};

/**
 * Get current trading session based on NY time
 */
export function getCurrentTradingSession(): TradingSession {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = nyTime.getHours();
  
  if (hour >= 18 || hour < 1) return 'asia';
  if (hour >= 1 && hour < 7) return 'london';
  if (hour >= 7 && hour < 17) return 'newyork';
  
  return 'asia'; // Gap hour (5PM-6PM)
}

/**
 * Validate and normalize session string
 */
export function normalizeSession(session: string | null | undefined): TradingSession | null {
  if (!session) return null;
  
  const normalized = session.toLowerCase().trim();
  
  if (normalized.includes('asia') || normalized.includes('tokyo')) return 'asia';
  if (normalized.includes('london') || normalized.includes('europe')) return 'london';
  if (normalized.includes('new york') || normalized.includes('newyork') || normalized.includes('us')) return 'newyork';
  
  return null;
}

/**
 * Format session for display
 */
export function formatSessionDisplay(session: TradingSession | string | null | undefined): string {
  if (!session) return 'Unknown';
  
  const normalized = normalizeSession(session);
  if (!normalized) return 'Unknown';
  
  return SESSION_DISPLAY_NAMES[normalized];
}

/**
 * Get session color classes
 */
export function getSessionColor(session: TradingSession | string | null | undefined): string {
  if (!session) return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30';
  
  const normalized = normalizeSession(session);
  if (!normalized) return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30';
  
  return SESSION_COLORS[normalized];
}

/**
 * Calculate session from date/time
 */
export function getSessionFromDateTime(date: Date): TradingSession {
  const nyTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = nyTime.getHours();
  
  if (hour >= 18 || hour < 1) return 'asia';
  if (hour >= 1 && hour < 7) return 'london';
  return 'newyork';
}