/**
 * TradingView feature flags for FINOTAUR.
 *
 * These are tunable — adjust as the integration matures.
 * Full reference: https://github.com/tradingview/charting_library/wiki/Featuresets
 * (accessible once library access is granted).
 */

/**
 * Features explicitly disabled for FINOTAUR:
 * - use_localstorage_for_settings: disabled so we use our own save_load_adapter (Supabase)
 * - header_symbol_search: we manage symbol routing ourselves via GlobalOmnibox
 * - header_compare: compare panel not needed in journal / backtest view
 * - symbol_search_hot_key: avoids accidental search overlay on keyboard shortcuts
 * - popup_hints: reduces visual clutter in the trading environment
 */
export const FINOTAUR_DISABLED_FEATURES: string[] = [
  'use_localstorage_for_settings',
  'header_symbol_search',
  'header_compare',
  'symbol_search_hot_key',
  'popup_hints',
];

/**
 * Features explicitly enabled for FINOTAUR:
 * - side_toolbar_in_fullscreen_mode: keep drawing tools accessible in fullscreen
 * - hide_left_toolbar_by_default: start clean; user can expand the toolbar
 * - chart_crosshair_menu: handy context menu at crosshair position
 * - display_market_status: show session open/closed indicator
 * - header_saveload: expose save/load UI (wired to SupabaseSaveLoadAdapter)
 * - header_undo_redo: allow undoing drawing actions
 * - header_screenshot: screenshot button for sharing
 */
export const FINOTAUR_ENABLED_FEATURES: string[] = [
  'side_toolbar_in_fullscreen_mode',
  'hide_left_toolbar_by_default',
  'chart_crosshair_menu',
  'display_market_status',
  'header_saveload',
  'header_undo_redo',
  'header_screenshot',
];
