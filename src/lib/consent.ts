/**
 * consent.ts — typed wrapper around vanilla-cookieconsent v3.
 *
 * The rest of the app NEVER imports vanilla-cookieconsent directly.
 * If we swap consent libraries in the future, only this file changes.
 */
import * as CookieConsent from 'vanilla-cookieconsent';

// ─── Public types ──────────────────────────────────────────────────────────────

export type ConsentCategory = 'essential' | 'analytics' | 'marketing';

export interface ConsentChangePayload {
  analytics: boolean;
  marketing: boolean;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns true if the user has accepted the given category.
 * `essential` always returns true (it is readOnly/always-on).
 */
export function hasConsent(category: ConsentCategory): boolean {
  if (category === 'essential') return true;
  return CookieConsent.acceptedCategory(category);
}

/**
 * Subscribe to consent changes.
 * The callback receives the current analytics + marketing booleans.
 * Returns an unsubscribe function.
 */
export function onConsentChange(
  callback: (payload: ConsentChangePayload) => void,
): () => void {
  function handler(event: Event) {
    const e = event as CustomEvent<ConsentChangePayload>;
    callback(e.detail);
  }
  window.addEventListener('finotaur:consent-change', handler);
  return () => window.removeEventListener('finotaur:consent-change', handler);
}

/**
 * Programmatically open the preferences modal.
 * Safe to call from any page (e.g., the Cookie Policy page).
 */
export function openPreferencesModal(): void {
  CookieConsent.showPreferences();
}
