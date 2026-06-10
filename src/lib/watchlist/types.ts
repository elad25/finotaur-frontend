export type WatchlistSource = 'portfolio' | 'manual';
export interface WatchlistItem {
  id: string;
  ticker: string;
  source: WatchlistSource;
}
