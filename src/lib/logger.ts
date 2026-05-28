type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

/**
 * Lightweight structured logger. Currently writes to console; designed to
 * be a one-line swap to Sentry/Datadog/PostHog when wiring is ready.
 *
 * Use logger.error(msg, error, ctx) for everything that should bubble up
 * to a real observability tool when one is connected.
 */
class Logger {
  private baseContext: LogContext = {};

  /** Set persistent context, e.g. setContext({ userId, sessionId }) on login. */
  setContext(ctx: LogContext): void {
    this.baseContext = { ...this.baseContext, ...ctx };
  }

  /** Remove all persistent context. Call on logout. */
  clearContext(): void {
    this.baseContext = {};
  }

  private buildPayload(level: LogLevel, message: string, extra?: LogContext): LogContext {
    return {
      level,
      message,
      ts: new Date().toISOString(),
      ...this.baseContext,
      ...(extra ?? {}),
    };
  }

  debug(message: string, ctx?: LogContext): void {
    if (import.meta.env.DEV) {
      console.debug('[debug]', message, this.buildPayload('debug', message, ctx));
    }
  }

  info(message: string, ctx?: LogContext): void {
    console.info('[info]', message, this.buildPayload('info', message, ctx));
  }

  warn(message: string, ctx?: LogContext): void {
    console.warn('[warn]', message, this.buildPayload('warn', message, ctx));
  }

  error(message: string, error?: unknown, ctx?: LogContext): void {
    const errorPayload =
      error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, errorStack: error.stack }
        : error !== undefined
          ? { errorRaw: error }
          : {};
    console.error('[error]', message, this.buildPayload('error', message, { ...errorPayload, ...(ctx ?? {}) }));
    // Future: Sentry.captureException(error instanceof Error ? error : new Error(message), { extra: ctx });
  }
}

export const logger = new Logger();
