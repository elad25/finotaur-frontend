import * as Sentry from '@sentry/react';

let sentryReady = false;

const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const OAUTH_PARAM_PATTERN = /\b(access_token|refresh_token|provider_token|provider_refresh_token|id_token)=[^&\s'"`)]+/g;

function scrubTokens(input: string): string {
  return input.replace(JWT_PATTERN, '[REDACTED_JWT]').replace(OAUTH_PARAM_PATTERN, '$1=[REDACTED]');
}

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Keep Sentry's default integrations — GlobalHandlers (window.onerror +
    // unhandledrejection), Breadcrumbs, Dedupe, LinkedErrors, etc. An empty
    // array here previously DISABLED all of them, so ONLY explicit
    // captureException calls reached Sentry and uncaught errors were silently
    // dropped. tracesSampleRate:0 keeps us on the free tier regardless (no
    // performance spans are sent), so restoring defaults adds no quota cost.
    integrations: (defaults) => defaults,
    // Noise from Android in-app browsers (Instagram/Facebook WebView): the host
    // app injects a Java bridge into our page; when the WebView navigates, the
    // bridge is destroyed and THEIR injected script throws. Not our code, not
    // actionable (Sentry issues MZ-3W "enableButtonsClickedMetaDataLogging" and
    // MZ-3Y "postMessage" — both "Java object is gone", 2026-07-04).
    ignoreErrors: [
      /Java object is gone/i,
      /Java bridge method invocation error/i,
      // iOS sibling of the above (Sentry issue MZ-3Z, 2026-07-05): scripts
      // injected by iOS in-app browsers reference window.webkit.messageHandlers,
      // which does not exist outside their own WebView. Not our code (rebuild bump).
      /window\.webkit\.messageHandlers/,
    ],
    beforeSend(event) {
      // Injected-script DOM serialization (extensions/webview): a browser
      // extension or in-app-browser walks our DOM and JSON.stringify()s a
      // node, which throws on React's circular __reactFiber$ back-pointer.
      // Not our code (we never serialize DOM nodes) and not actionable, but
      // we only drop it when BOTH signatures are present so a genuine
      // first-party circular-JSON bug (which won't mention __reactFiber)
      // still reaches Sentry. Mirrors isNonActionableInjectedError in
      // src/components/ErrorBoundary.tsx.
      const exceptionText = (event.exception?.values ?? [])
        .map((exc) => `${exc.type ?? ''} ${exc.value ?? ''}`)
        .join(' ');
      const fullText = `${event.message ?? ''} ${exceptionText}`;
      if (
        fullText.includes('Converting circular structure to JSON') &&
        fullText.includes('__reactFiber')
      ) {
        return null;
      }

      if (event.user) {
        event.user.email = undefined;
      }
      if (event.tags) {
        delete (event.tags as Record<string, unknown>).token;
      }
      if (event.extra) {
        const extra = event.extra as Record<string, unknown>;
        delete extra.token;
        for (const key of Object.keys(extra)) {
          if (typeof extra[key] === 'string' && /eyJ[A-Za-z0-9_-]+/.test(extra[key] as string)) {
            extra[key] = '[REDACTED]';
          }
        }
      }
      // Scrub tokens that may appear inside exception messages themselves —
      // e.g. `SyntaxError: Unexpected token '#', "#access_token=eyJ..."` from
      // a JSON.parse on an OAuth callback fragment. Without this, user JWTs
      // land in Sentry issue titles. Covers exception values + breadcrumb
      // messages + the top-level event.message.
      event.exception?.values?.forEach((exc) => {
        if (typeof exc.value === 'string') exc.value = scrubTokens(exc.value);
      });
      event.breadcrumbs?.forEach((bc) => {
        if (typeof bc.message === 'string') bc.message = scrubTokens(bc.message);
      });
      if (typeof event.message === 'string') event.message = scrubTokens(event.message);
      return event;
    },
  });

  sentryReady = true;
}

type CaptureOptions = {
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
};

export function captureException(
  error: unknown,
  optsOrExtra?: CaptureOptions | Record<string, unknown>,
): void {
  if (!sentryReady) return;

  const isStructured =
    !!optsOrExtra &&
    typeof optsOrExtra === 'object' &&
    ('extra' in optsOrExtra || 'tags' in optsOrExtra);

  if (isStructured) {
    const { extra, tags } = optsOrExtra as CaptureOptions;
    Sentry.captureException(error, { extra, tags });
  } else {
    Sentry.captureException(error, { extra: optsOrExtra as Record<string, unknown> | undefined });
  }
}

/**
 * Set the active user on Sentry for breadcrumb/issue attribution.
 * Passing null clears the user (call on signOut).
 *
 * Only `id` is persisted — never email or other PII — to keep the
 * Sentry payload minimal. Email scrubbing in beforeSend is a second
 * layer of defence; this is the first.
 */
export function setSentryUser(user: { id: string } | null): void {
  if (!sentryReady) return;
  if (user === null) {
    Sentry.setUser(null);
  } else {
    Sentry.setUser({ id: user.id });
  }
}

/**
 * Forward an error to Sentry. No-op if Sentry isn't initialized
 * (DSN not configured — local dev). Always safe to call.
 *
 * Internally delegates to captureException so the same beforeSend
 * scrub applies (JWT/OAuth token redaction in extras + messages).
 */
export function reportError(error: unknown, extra?: Record<string, unknown>): void {
  if (!sentryReady) return;
  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
  captureException(err, extra);
}
