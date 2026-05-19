/**
 * posthog.ts — PostHog integration.
 *
 * Zero network calls on import.  All side effects are gated behind
 * initPostHog() which must only be called after the user grants analytics consent.
 *
 * posthog-js is imported ONLY in this file.  No other module may import it
 * directly — go through the analytics orchestrator (index.ts) instead.
 */
import posthog from 'posthog-js';

// ─── Internal state ───────────────────────────────────────────────────────────

let _initialized = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialises PostHog with privacy-safe defaults.
 * Idempotent — calling twice is a no-op.
 */
export function initPostHog(apiKey: string, host: string): void {
  if (_initialized) return;

  posthog.init(apiKey, {
    api_host: host,
    person_profiles: 'identified_only',
    // We send pageviews manually via the analytics orchestrator.
    capture_pageview: false,
    // Session recording is off by default; enable via the PostHog feature flag
    // "session-recording-enabled" without a code deploy.
    disable_session_recording: true,
    loaded: () => {
      if (import.meta.env.DEV) console.debug('[posthog] loaded');
    },
  });

  _initialized = true;

  if (import.meta.env.DEV) console.debug('[posthog] initialized', host);
}

/**
 * Opts the user out of tracking, resets the identity, and marks the library as
 * uninitialised so it can be re-initialised if consent is re-granted.
 *
 * PostHog does not expose a true "unload"; reset + opt-out is the recommended
 * privacy-safe pattern.
 */
export function destroyPostHog(): void {
  if (!_initialized) return;

  posthog.reset();
  posthog.opt_out_capturing();

  _initialized = false;

  if (import.meta.env.DEV) console.debug('[posthog] destroyed');
}

/**
 * Sends a $pageview event.
 * @param path  e.g. "/app/journal/overview"
 */
export function trackPageView(path: string): void {
  if (!_initialized) return;
  posthog.capture('$pageview', { $current_url: window.location.origin + path });
}

/**
 * Sends a named custom event with optional properties.
 */
export function trackEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (!_initialized) return;
  posthog.capture(name, params);
}
