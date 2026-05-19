/**
 * analytics/index.ts — Consent-gated analytics orchestrator.
 *
 * Single entry point for the whole app.  Wires consent → GA4/PostHog lifecycle
 * and exposes a typed `track()` helper + `useAnalytics()` React hook.
 *
 * Privacy contract:
 *   - No network call is made before `hasConsent('analytics') === true`.
 *   - If env vars are unset, the corresponding platform is silently skipped.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { hasConsent, onConsentChange } from '@/lib/consent';
import { initGA4, destroyGA4, trackPageView as ga4PageView, trackEvent as ga4Event } from './ga4';
import { initPostHog, destroyPostHog, trackPageView as phPageView, trackEvent as phEvent } from './posthog';

// ─── Allowed event names (enforced at compile time) ──────────────────────────

export type AnalyticsEventName =
  | 'signup'
  | 'trial_start'
  | 'paid_conversion'
  | 'journal_trade_added'
  | 'glossary_view'
  | 'affiliate_click'
  | 'share_clicked'
  | 'pricing_view'
  | 'cta_clicked';

// ─── Env var helpers ──────────────────────────────────────────────────────────

function ga4MeasurementId(): string | null {
  return import.meta.env.VITE_GA4_MEASUREMENT_ID || null;
}

function posthogKey(): string | null {
  return import.meta.env.VITE_POSTHOG_KEY || null;
}

function posthogHost(): string {
  return import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
}

// ─── Lifecycle helpers ────────────────────────────────────────────────────────

function bootAnalytics(): void {
  const gid = ga4MeasurementId();
  if (gid) {
    initGA4(gid);
  }

  const phKey = posthogKey();
  if (phKey) {
    initPostHog(phKey, posthogHost());
  }
}

function teardownAnalytics(): void {
  destroyGA4();
  destroyPostHog();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fire an analytics event on both GA4 and PostHog.
 * No-ops if neither platform is initialised (e.g. before consent or no keys).
 */
export function track(
  eventName: AnalyticsEventName,
  params?: Record<string, unknown>,
): void {
  ga4Event(eventName, params);
  phEvent(eventName, params);
}

/**
 * React hook — call once inside AppContent (or equivalent root component).
 *
 * Responsibilities:
 *   1. Boot analytics immediately if consent was already granted (e.g. returning visitor).
 *   2. Subscribe to future consent changes → boot on grant, teardown on revoke.
 *   3. Send a pageview on every route change.
 */
export function useAnalytics(): void {
  const location = useLocation();

  // One-time wiring on mount.
  useEffect(() => {
    // Returning visitor: consent already recorded in the cookie.
    if (hasConsent('analytics')) {
      bootAnalytics();
    }

    // Subscribe to future changes from the banner.
    const unsubscribe = onConsentChange(({ analytics }) => {
      if (analytics) {
        bootAnalytics();
      } else {
        teardownAnalytics();
      }
    });

    return unsubscribe;
  }, []);

  // Pageview on every route change.
  useEffect(() => {
    const path = location.pathname + location.search;
    ga4PageView(path);
    phPageView(path);
  }, [location]);
}
