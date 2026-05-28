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
    integrations: [],
    beforeSend(event) {
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
