import * as Sentry from '@sentry/react';

let sentryReady = false;

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    integrations: [Sentry.browserTracingIntegration()],
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
