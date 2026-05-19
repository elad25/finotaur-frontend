/**
 * CookieConsentBanner.tsx
 *
 * Mounts vanilla-cookieconsent v3 on first render.
 * The library injects its own DOM; this component returns null.
 * Dispatches `finotaur:consent-change` on every consent update.
 */
import { useEffect } from 'react';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import * as CookieConsent from 'vanilla-cookieconsent';

// Custom event type declared here so it propagates across the app.
declare global {
  interface WindowEventMap {
    'finotaur:consent-change': CustomEvent<{ analytics: boolean; marketing: boolean }>;
  }
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function dispatchConsentChange(): void {
  const payload = {
    analytics: CookieConsent.acceptedCategory('analytics'),
    marketing: CookieConsent.acceptedCategory('marketing'),
  };
  window.dispatchEvent(
    new CustomEvent('finotaur:consent-change', { detail: payload }),
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CookieConsentBanner(): null {
  useEffect(() => {
    CookieConsent.run({
      // GDPR-strict: nothing runs until user actively accepts.
      mode: 'opt-in',

      // Remember choice for 365 days.
      cookie: {
        name: 'finotaur_cc',
        expiresAfterDays: 365,
        sameSite: 'Lax',
      },

      // Categories
      categories: {
        essential: {
          // Always enabled — user cannot toggle it.
          readOnly: true,
        },
        analytics: {
          // Off by default — user must opt in.
          enabled: false,
        },
        marketing: {
          // Off by default — user must opt in.
          enabled: false,
        },
      },

      // Lifecycle callbacks — all dispatch the custom event so
      // future analytics scripts can gate themselves.
      onFirstConsent: () => {
        dispatchConsentChange();
      },
      onConsent: () => {
        dispatchConsentChange();
      },
      onChange: () => {
        dispatchConsentChange();
      },

      // UI config
      guiOptions: {
        consentModal: {
          // Non-intrusive bottom bar — never blocks the page.
          layout: 'bar',
          position: 'bottom',
          equalWeightButtons: true,
          flipButtons: false,
        },
        preferencesModal: {
          layout: 'box',
          position: 'right',
          equalWeightButtons: true,
          flipButtons: false,
        },
      },

      language: {
        default: 'en',
        autoDetect: 'browser',
        translations: {
          en: {
            consentModal: {
              title: 'We use cookies',
              description:
                'Finotaur uses essential cookies to keep the platform running, and optional analytics/marketing cookies to improve your experience. See our <a href="/legal/cookies">Cookie Policy</a> for details.',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Reject all',
              showPreferencesBtn: 'Manage preferences',
              footer:
                '<a href="/legal/privacy">Privacy Policy</a> · <a href="/legal/cookies">Cookie Policy</a>',
            },
            preferencesModal: {
              title: 'Cookie preferences',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Reject all',
              savePreferencesBtn: 'Save preferences',
              closeIconLabel: 'Close',
              serviceCounterLabel: 'Service|Services',
              sections: [
                {
                  title: 'Cookie usage',
                  description:
                    'We use cookies to ensure the platform works correctly and, with your consent, to understand how it is used. You can change your preferences at any time from the <a href="/legal/cookies">Cookie Policy</a> page.',
                },
                {
                  title: 'Essential cookies <span class="pm__badge">Always active</span>',
                  description:
                    'Required for authentication, session management, and core platform features. Cannot be disabled.',
                  linkedCategory: 'essential',
                },
                {
                  title: 'Analytics cookies',
                  description:
                    'Help us understand how traders use Finotaur so we can improve features and performance. Disabled by default.',
                  linkedCategory: 'analytics',
                },
                {
                  title: 'Marketing cookies',
                  description:
                    'Used to measure the effectiveness of our campaigns and deliver relevant content. Disabled by default.',
                  linkedCategory: 'marketing',
                },
              ],
            },
          },
        },
      },
    });
  // Run once on mount only.
  }, []);

  return null;
}

export default CookieConsentBanner;
